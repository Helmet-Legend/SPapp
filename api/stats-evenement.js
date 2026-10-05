// api/stats-evenement.js - Compte un événement d'usage (ouverture app, génération IA, PDF)
// POST { type: 'ouverture' | 'generation' | 'pdf' }
//
// Compteurs journaliers dans Redis, 31 jours de rétention (expiration automatique) :
//  vulcain:stats:<type>:<AAAA-MM-JJ>
//
// Pas de donnée personnelle stockée : juste un total par jour et par type d'événement.

import { origineAutorisee, redis } from './_push-commun.js';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TYPES = ['ouverture', 'generation', 'pdf'];
const RETENTION_S = 31 * 24 * 60 * 60;

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

    const jour = new Date().toISOString().slice(0, 10);
    const cle = `vulcain:stats:${type}:${jour}`;
    try {
        await redis([['INCR', cle], ['EXPIRE', cle, String(RETENTION_S)]]);
    } catch (e) {
        // Un compteur raté n'est pas critique : on ne fait pas échouer l'appel client pour ça
    }
    return res.status(204).end();
}
