// api/admin-stats.js - Lecture des statistiques d'usage (admin)
// GET, Authorization: Bearer <PUSH_ADMIN_KEY> — réservé à l'administrateur
// (même clé que les notifications push, pour ne pas multiplier les secrets).
//
// Renvoie, pour chaque type d'événement, les 30 derniers jours { jour, total }.

import crypto from 'crypto';
import { origineAutorisee, redis } from './_push-commun.js';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const CLE_ADMIN = process.env.PUSH_ADMIN_KEY || '';
const TYPES = ['ouverture', 'generation', 'pdf'];
const JOURS = 30;
const CLE_VUES = 'vulcain:stats:vues';
const TOP_FICHES = 10;

function cleValide(fournie) {
    if (!CLE_ADMIN || typeof fournie !== 'string') return false;
    const a = crypto.createHash('sha256').update(fournie).digest();
    const b = crypto.createHash('sha256').update(CLE_ADMIN).digest();
    return crypto.timingSafeEqual(a, b);
}

function derniersJours(n) {
    const jours = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        jours.push(d.toISOString().slice(0, 10));
    }
    return jours;
}

export default async function handler(req, res) {
    const origine = req.headers.origin;
    if (origine && origineAutorisee(origine)) {
        res.setHeader('Access-Control-Allow-Origin', origine);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') return res.status(405).json({ erreur: 'Méthode non autorisée' });
    if (origine && !origineAutorisee(origine)) return res.status(403).json({ erreur: 'Origine non autorisée' });
    if (!REDIS_URL || !REDIS_TOKEN || !CLE_ADMIN) return res.status(503).json({ erreur: 'Statistiques pas encore configurées sur le serveur' });

    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!cleValide(auth)) return res.status(401).json({ erreur: 'Clé administrateur incorrecte' });

    const jours = derniersJours(JOURS);
    try {
        const cles = TYPES.flatMap(type => jours.map(jour => `vulcain:stats:${type}:${jour}`));
        const valeurs = await redis([['MGET', ...cles]]);
        const brut = valeurs[0] || [];

        const resultat = {};
        TYPES.forEach((type, i) => {
            const decalage = i * jours.length;
            const serie = jours.map((jour, j) => ({ jour, total: Number(brut[decalage + j]) || 0 }));
            resultat[type] = { serie, total: serie.reduce((s, p) => s + p.total, 0) };
        });

        let topFiches = [];
        try {
            const [brutVues] = await redis([['HGETALL', CLE_VUES]]);
            const paires = [];
            for (let i = 0; brutVues && i < brutVues.length; i += 2) paires.push({ fiche: brutVues[i], vues: Number(brutVues[i + 1]) || 0 });
            topFiches = paires.sort((a, b) => b.vues - a.vues).slice(0, TOP_FICHES);
        } catch (e) { /* popularité indisponible : on renvoie quand même le reste */ }

        return res.status(200).json({ ok: true, jours: JOURS, stats: resultat, topFiches });
    } catch (e) {
        return res.status(502).json({ erreur: 'Lecture impossible' });
    }
}
