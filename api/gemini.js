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

// Limite par IP. La mémoire est propre à chaque instance serverless : c'est un
// garde-fou, pas une garantie. Pour une limite stricte, ajouter une règle
// « Rate limit » sur /api/gemini dans le pare-feu Vercel.
const LIMITE_REQUETES = Number(process.env.RATE_LIMIT_MAX || 5);
const FENETRE_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const compteurs = new Map();

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

function depasseLimite(ip) {
    const maintenant = Date.now();
    for (const [cle, entree] of compteurs) {
        if (maintenant - entree.debut > FENETRE_MS) compteurs.delete(cle);
    }
    const entree = compteurs.get(ip) || { debut: maintenant, nombre: 0 };
    entree.nombre += 1;
    compteurs.set(ip, entree);
    return entree.nombre > LIMITE_REQUETES;
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

    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'inconnue').split(',')[0].trim();
    if (depasseLimite(ip)) {
        res.setHeader('Retry-After', Math.ceil(FENETRE_MS / 1000));
        return res.status(429).json({ error: 'Trop de générations rapprochées. Réessayez dans quelques minutes.' });
    }

    const prompt = construirePrompt(req.body || {});
    if (!prompt) {
        return res.status(400).json({ error: 'Sélectionnez au moins un type de manœuvre' });
    }

    // Clé API Claude stockée dans les variables d'environnement Vercel
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
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
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Erreur interne du serveur' });
        }
        res.write(`data: ${JSON.stringify({ error: 'Erreur interne du serveur' })}\n\n`);
        res.end();
    }
}
