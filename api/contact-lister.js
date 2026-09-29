// api/contact-lister.js - Lecture des messages du formulaire de contact
// GET, Authorization: Bearer <PUSH_ADMIN_KEY> — réservé à l'administrateur
// (même clé que les notifications push, pour ne pas multiplier les secrets).

import crypto from 'crypto';
import { origineAutorisee, redis } from './_push-commun.js';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const CLE_ADMIN = process.env.PUSH_ADMIN_KEY || '';
const CLE_MESSAGES = 'vulcain:contact:messages';

function cleValide(fournie) {
    if (!CLE_ADMIN || typeof fournie !== 'string') return false;
    const a = crypto.createHash('sha256').update(fournie).digest();
    const b = crypto.createHash('sha256').update(CLE_ADMIN).digest();
    return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
    const origine = req.headers.origin;
    if (origine && origineAutorisee(origine)) {
        res.setHeader('Access-Control-Allow-Origin', origine);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') return res.status(405).json({ erreur: 'Méthode non autorisée' });
    // Une requête GET même origine n'envoie pas toujours l'en-tête Origin :
    // on ne bloque que si un Origin est fourni et qu'il n'est pas autorisé.
    if (origine && !origineAutorisee(origine)) return res.status(403).json({ erreur: 'Origine non autorisée' });
    if (!REDIS_URL || !REDIS_TOKEN || !CLE_ADMIN) return res.status(503).json({ erreur: 'Formulaire pas encore configuré sur le serveur' });

    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!cleValide(auth)) return res.status(401).json({ erreur: 'Clé administrateur incorrecte' });

    try {
        const [brut] = await redis([['LRANGE', CLE_MESSAGES, '0', '99']]);
        const messages = (brut || []).map(v => { try { return JSON.parse(v); } catch (e) { return null; } }).filter(Boolean);
        return res.status(200).json({ ok: true, messages });
    } catch (e) {
        return res.status(502).json({ erreur: 'Lecture impossible' });
    }
}
