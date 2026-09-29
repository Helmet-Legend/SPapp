// api/contact.js - Réception des messages du formulaire de contact (À propos)
// POST { message, contact? } — public, pas de clé requise pour écrire.
// Les messages sont stockés dans Redis et lus depuis l'écran administrateur
// « Messages reçus » (Réglages), avec la même clé que les notifications push.

import { origineAutorisee, redis } from './_push-commun.js';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const CLE_MESSAGES = 'vulcain:contact:messages';
const MAX_CONSERVES = 500;

export default async function handler(req, res) {
    const origine = req.headers.origin;
    if (origine && origineAutorisee(origine)) {
        res.setHeader('Access-Control-Allow-Origin', origine);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
    if (!origineAutorisee(origine)) return res.status(403).json({ erreur: 'Origine non autorisée' });
    if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ erreur: 'Formulaire pas encore configuré sur le serveur' });

    let corps = req.body || {};
    if (typeof corps === 'string') { try { corps = JSON.parse(corps); } catch (e) { corps = {}; } }
    const message = String(corps.message || '').trim().slice(0, 1000);
    const contact = String(corps.contact || '').trim().slice(0, 200);
    if (!message) return res.status(400).json({ erreur: 'Le message est obligatoire' });

    const entree = { message, contact, date: new Date().toISOString(), page: String(corps.page || '').trim().slice(0, 80) };
    try {
        await redis([
            ['LPUSH', CLE_MESSAGES, JSON.stringify(entree)],
            ['LTRIM', CLE_MESSAGES, '0', String(MAX_CONSERVES - 1)]
        ]);
        return res.status(200).json({ ok: true });
    } catch (e) {
        return res.status(502).json({ erreur: 'Envoi impossible, réessaie plus tard' });
    }
}
