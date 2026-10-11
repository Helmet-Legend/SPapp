// api/stats-evenement.js - Compte un événement d'usage (ouverture app, génération IA, PDF, vue de fiche)
// POST { type: 'ouverture' | 'generation' | 'pdf' } (ouverture : + mode, theme, version, visiteur)
//      ou { type: 'vue', fiche: '<id>' } ou { type: 'recherche', terme: '<mot>', resultats: <n> }
//
// Compteurs journaliers dans Redis, 31 jours de rétention (expiration automatique) :
//  vulcain:stats:<type>:<AAAA-MM-JJ>
// Popularité des fiches (hash cumulatif, sans expiration — utile pour prioriser le contenu) :
//  vulcain:stats:vues (champ = id de fiche, valeur = nombre de vues)
//
// Profil d'ouverture (hash par jour, 31 jours) : vulcain:stats:profil:<jour>, champs « mode:… »,
//  « theme:… », « version:… », « visiteur:… », « heure:HH » (heure de Paris).
// Recherches (hash cumulatifs) : vulcain:stats:recherches, vulcain:stats:recherches-vides (sans résultat).
//
// Pas de donnée personnelle stockée : juste des totaux par jour/type, par fiche et par mot cherché
// (aucun identifiant, aucune adresse IP, aucun lien entre les événements).

import { origineAutorisee, redis } from './_push-commun.js';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TYPES = ['ouverture', 'generation', 'pdf', 'vue', 'recherche'];
const RETENTION_S = 31 * 24 * 60 * 60;
const CLE_VUES = 'vulcain:stats:vues';
const FICHE_VALIDE = /^[a-z0-9-]{1,60}$/;
const CLE_RECHERCHES = 'vulcain:stats:recherches';
const CLE_RECHERCHES_VIDES = 'vulcain:stats:recherches-vides';
const MODES = ['application', 'navigateur'];
const THEMES = ['clair', 'sombre'];
const VERSION_VALIDE = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const VISITEURS = ['nouveau', 'retour'];
const TERME_VALIDE = /^[\p{L}\p{N} '’.\-]{3,40}$/u;

// Un mot cherché : minuscules, espaces simplifiés ; on écarte les longues suites de chiffres (numéros de téléphone…)
function termeNormalise(brut) {
    const t = String(brut || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!TERME_VALIDE.test(t) || /\d{5,}/.test(t)) return null;
    return t;
}

function heureParis() {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Paris' }).format(new Date()).slice(0, 2);
}

export default async function handler(req, res) {
    const origine = req.headers.origin;
    if (origine && origineAutorisee(origine)) {
        res.setHeader('Access-Control-Allow-Origin', origine);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.status(origineAutorisee(origine) ? 204 : 403).end();
    if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
    if (!origineAutorisee(origine)) return res.status(403).json({ erreur: 'Origine non autorisée' });
    // Pas de base Redis configurée : on ignore silencieusement, pas d'erreur côté client
    if (!REDIS_URL || !REDIS_TOKEN) return res.status(204).end();

    let corps = req.body || {};
    if (typeof corps === 'string') { try { corps = JSON.parse(corps); } catch (e) { corps = {}; } }
    const type = TYPES.includes(corps.type) ? corps.type : null;
    if (!type) return res.status(400).json({ erreur: 'Type d\'événement invalide' });

    try {
        if (type === 'vue') {
            const fiche = FICHE_VALIDE.test(corps.fiche || '') ? corps.fiche : null;
            if (!fiche) return res.status(400).json({ erreur: 'Identifiant de fiche invalide' });
            await redis([['HINCRBY', CLE_VUES, fiche, '1']]);
        } else if (type === 'recherche') {
            const terme = termeNormalise(corps.terme);
            if (!terme) return res.status(400).json({ erreur: 'Terme invalide' });
            const commandes = [['HINCRBY', CLE_RECHERCHES, terme, '1']];
            if (Number(corps.resultats) === 0) commandes.push(['HINCRBY', CLE_RECHERCHES_VIDES, terme, '1']);
            await redis(commandes);
        } else {
            const jour = new Date().toISOString().slice(0, 10);
            const cle = `vulcain:stats:${type}:${jour}`;
            const commandes = [['INCR', cle], ['EXPIRE', cle, String(RETENTION_S)]];
            if (type === 'ouverture') {
                const cleProfil = `vulcain:stats:profil:${jour}`;
                const champs = [`heure:${heureParis()}`];
                if (MODES.includes(corps.mode)) champs.push(`mode:${corps.mode}`);
                if (THEMES.includes(corps.theme)) champs.push(`theme:${corps.theme}`);
                if (VERSION_VALIDE.test(corps.version || '')) champs.push(`version:${corps.version}`);
                if (VISITEURS.includes(corps.visiteur)) champs.push(`visiteur:${corps.visiteur}`);
                champs.forEach(c => commandes.push(['HINCRBY', cleProfil, c, '1']));
                commandes.push(['EXPIRE', cleProfil, String(RETENTION_S)]);
            }
            await redis(commandes);
        }
    } catch (e) {
        // Un compteur raté n'est pas critique : on ne fait pas échouer l'appel client pour ça
    }
    return res.status(204).end();
}
