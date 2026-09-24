// api/gemini.js - Fonction serverless Vercel : générateur de manœuvre (API Claude, streaming)
//
// Protections :
//  - seules les origines Vulcain connues sont acceptées (ALLOWED_ORIGINS pour en ajouter) ;
//  - limite de requêtes par adresse IP ;
//  - le prompt est construit ICI à partir des paramètres du formulaire, avec des
//    tailles plafonnées : l'endpoint ne peut pas servir d'accès libre à l'IA.

const ORIGINES_AUTORISEES = [
    'https://s-papp.vercel.app',
    'https://s-papp-helmet-legends-projects.vercel.app',
    ...(process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
];
// Déploiements de prévisualisation Vercel du projet
const ORIGINE_PREVIEW = /^https:\/\/s-papp-[a-z0-9-]+-helmet-legends-projects\.vercel\.app$/;
const ORIGINE_LOCALE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Limites : 2 générations par 24 h et par adresse IP, et un plafond global par jour
// pour protéger le budget de l'API. Si une base Upstash Redis est reliée au projet
// Vercel (variables KV_REST_API_URL / KV_REST_API_TOKEN ou UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN), les compteurs y sont stockés et la limite est fiable.
// Sinon, ils restent en mémoire de l'instance serverless : c'est alors un garde-fou.
const LIMITE_REQUETES = Number(process.env.RATE_LIMIT_MAX || 2);
const FENETRE_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 24 * 60 * 60 * 1000);
const LIMITE_JOUR = Number(process.env.DAILY_GLOBAL_MAX || 50);
const compteurs = new Map();
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Modèle Claude utilisé. Claude Sonnet 4 a été retiré par Anthropic (erreur 404) :
// en cas de nouveau retrait, définir CLAUDE_MODEL dans les variables Vercel.
const MODELE_CLAUDE = process.env.CLAUDE_MODEL || 'claude-sonnet-5';

const MAX_ELEMENTS = 20;
const MAX_LONGUEUR_ELEMENT = 100;
const MAX_LONGUEUR_CONSIGNES = 1000;

function origineAutorisee(origine) {
    if (!origine) return false;
    return ORIGINES_AUTORISEES.includes(origine) || ORIGINE_PREVIEW.test(origine) || ORIGINE_LOCALE.test(origine);
}

// Compteurs en mémoire : { debut, nombre } par clé
function incrementerMemoire(cle, dureeMs) {
    const maintenant = Date.now();
    for (const [c, e] of compteurs) {
        if (maintenant - e.debut > e.duree) compteurs.delete(c);
    }
    const entree = compteurs.get(cle) || { debut: maintenant, nombre: 0, duree: dureeMs };
    entree.nombre += 1;
    compteurs.set(cle, entree);
    return { nombre: entree.nombre, resteMs: entree.debut + dureeMs - maintenant };
}

async function redis(commandes) {
    const reponse = await fetch(`${REDIS_URL}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commandes)
    });
    if (!reponse.ok) throw new Error('Redis ' + reponse.status);
    return (await reponse.json()).map(r => r.result);
}

async function incrementer(cle, dureeMs) {
    if (REDIS_URL && REDIS_TOKEN) {
        try {
            const [nombre, , ttl] = await redis([
                ['INCR', cle],
                ['PEXPIRE', cle, String(dureeMs), 'NX'],
                ['PTTL', cle]
            ]);
            return { nombre: Number(nombre), resteMs: Number(ttl) > 0 ? Number(ttl) : dureeMs };
        } catch (e) {
            console.error('Compteur Redis indisponible, repli en mémoire :', e.message);
        }
    }
    return incrementerMemoire(cle, dureeMs);
}

async function decrementer(cle) {
    if (REDIS_URL && REDIS_TOKEN) {
        try { await redis([['DECR', cle]]); return; } catch (e) { /* repli en mémoire */ }
    }
    const entree = compteurs.get(cle);
    if (entree && entree.nombre > 0) entree.nombre -= 1;
}

function dureeLisible(ms) {
    const minutes = Math.max(1, Math.ceil(ms / 60000));
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

function texte(valeur, max) {
    if (valeur === undefined || valeur === null) return '';
    return String(valeur).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function liste(valeur) {
    if (!Array.isArray(valeur)) return [];
    return valeur.slice(0, MAX_ELEMENTS).map(v => texte(v, MAX_LONGUEUR_ELEMENT)).filter(Boolean);
}

function construirePrompt(body) {
    const types = liste(body.types);
    if (types.length === 0) return null;

    const vehicules = liste(body.vehicules);
    const lieux = liste(body.lieux);
    const materiels = liste(body.materiels);
    const grades = liste(body.grades);
    const medical = liste(body.medical);
    const nbPersonnel = Math.min(Math.max(parseInt(body.nbPersonnel, 10) || 0, 1), 200);
    const duree = texte(body.duree, MAX_LONGUEUR_ELEMENT);
    const niveau = texte(body.niveau, MAX_LONGUEUR_ELEMENT);
    const consignes = texte(body.consignes, MAX_LONGUEUR_CONSIGNES);

    return `Tu es un formateur sapeur-pompier expérimenté. Génère un scénario de manœuvre d'entraînement COMPLET et RÉALISTE avec les paramètres suivants :

**TYPE DE MANŒUVRE :** ${types.join(', ')}
**VÉHICULES DISPONIBLES :** ${vehicules.length > 0 ? vehicules.join(', ') : 'Non spécifié'}
**LIEU :** ${lieux.length > 0 ? lieux.join(', ') : 'Non spécifié'}
**MATÉRIEL DE SIMULATION :** ${materiels.length > 0 ? materiels.join(', ') : 'Basique'}
**EFFECTIF :** ${nbPersonnel} sapeurs-pompiers
**GRADES :** ${grades.join(', ')}
**PERSONNEL MÉDICAL :** ${medical.length > 0 ? medical.join(', ') : 'Aucun'}
**DURÉE :** ${duree}
**NIVEAU :** ${niveau}
${consignes ? `**CONSIGNES PARTICULIÈRES :** ${consignes}` : ''}

Génère un scénario structuré avec :

📋 **TITRE DE LA MANŒUVRE**
(Titre accrocheur et descriptif)

🎯 **OBJECTIFS PÉDAGOGIQUES**
(3-5 objectifs clairs et mesurables)

📖 **CONTEXTE / MISE EN SITUATION**
(Scénario réaliste avec lieu, heure, circonstances, appel initial type message CTA)

👥 **RÉPARTITION DES RÔLES**
(Attribution des rôles selon l'effectif et les grades disponibles)

⏱️ **DÉROULEMENT CHRONOLOGIQUE**
(Étapes détaillées avec timing indicatif)

🔄 **ÉVOLUTIONS POSSIBLES / ALÉAS**
(2-3 rebondissements réalistes à introduire pendant la manœuvre)

✅ **CRITÈRES D'ÉVALUATION**
(Points clés à observer pour l'évaluation)

⚠️ **POINTS DE VIGILANCE SÉCURITÉ**
(Mesures de sécurité pour la manœuvre)

📦 **MATÉRIEL À PRÉPARER**
(Liste du matériel nécessaire)

Utilise un langage professionnel sapeur-pompier avec les termes techniques appropriés (MGO, COS, CA, etc.). Le scénario doit être directement utilisable.`;
}

export default async function handler(req, res) {
    const origine = req.headers.origin;
    if (origineAutorisee(origine)) {
        res.setHeader('Access-Control-Allow-Origin', origine);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
        return res.status(origineAutorisee(origine) ? 204 : 403).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    // Les navigateurs envoient toujours Origin sur un POST fetch : un appel sans
    // origine autorisée ne vient pas de l'application.
    if (!origineAutorisee(origine)) {
        return res.status(403).json({ error: 'Origine non autorisée' });
    }

    const prompt = construirePrompt(req.body || {});
    if (!prompt) {
        return res.status(400).json({ error: 'Sélectionnez au moins un type de manœuvre' });
    }

    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'inconnue').split(',')[0].trim();
    const cleIp = `vulcain:ia:ip:${ip}`;
    const cleJour = `vulcain:ia:jour:${new Date().toISOString().slice(0, 10)}`;
    const parIp = await incrementer(cleIp, FENETRE_MS);
    if (parIp.nombre > LIMITE_REQUETES) {
        await decrementer(cleIp);
        res.setHeader('Retry-After', Math.ceil(parIp.resteMs / 1000));
        return res.status(429).json({
            error: `Limite atteinte : ${LIMITE_REQUETES} générations par 24 h. Prochaine génération possible dans ${dureeLisible(parIp.resteMs)}.`
        });
    }
    const global = await incrementer(cleJour, 24 * 60 * 60 * 1000);
    if (global.nombre > LIMITE_JOUR) {
        await decrementer(cleJour);
        await decrementer(cleIp);
        return res.status(429).json({ error: 'Le nombre maximal de générations pour aujourd\'hui est atteint. Réessayez demain.' });
    }
    // Une génération qui échoue ne doit pas être décomptée
    const rendre = async () => { await decrementer(cleIp); await decrementer(cleJour); };

    // Clé API Claude stockée dans les variables d'environnement Vercel
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
        await rendre();
        return res.status(500).json({ error: 'Clé API Claude non configurée sur le serveur' });
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: MODELE_CLAUDE,
                // Le tokenizer de Claude Sonnet 5 compte ~30 % de tokens de plus :
                // marge pour ne pas couper un scénario complet.
                max_tokens: 8000,
                // Pas de réflexion préalable : le texte s'affiche dès le début, comme avant.
                thinking: { type: 'disabled' },
                stream: true,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            console.error('Erreur Claude API:', MODELE_CLAUDE, response.status, await response.text());
            await rendre();
            return res.status(502).json({ error: 'Le service IA est indisponible, réessayez plus tard.' });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let tampon = '';

        while (true) {
            const { done, value } = await reader.read();
            tampon += decoder.decode(value || new Uint8Array(), { stream: !done });

            // Une ligne SSE peut être coupée entre deux morceaux : on garde la fin incomplète
            const lines = tampon.split('\n');
            tampon = done ? '' : lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                let parsed;
                try {
                    parsed = JSON.parse(line.slice(6));
                } catch (e) {
                    continue;
                }

                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
                } else if (parsed.type === 'error') {
                    console.error('Erreur Claude (stream):', parsed.error);
                    res.write(`data: ${JSON.stringify({ error: 'Génération interrompue, réessayez.' })}\n\n`);
                    return res.end();
                } else if (parsed.type === 'message_stop') {
                    res.write('data: [DONE]\n\n');
                    return res.end();
                }
            }

            if (done) {
                res.write('data: [DONE]\n\n');
                return res.end();
            }
        }
    } catch (error) {
        console.error('Erreur serveur:', error);
        await rendre();
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Erreur interne du serveur' });
        }
        res.write(`data: ${JSON.stringify({ error: 'Erreur interne du serveur' })}\n\n`);
        res.end();
    }
}
