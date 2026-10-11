// api/admin-stats.js - Lecture des statistiques d'usage (admin)
// GET, Authorization: Bearer <PUSH_ADMIN_KEY> — réservé à l'administrateur
// (même clé que les notifications push, pour ne pas multiplier les secrets).
//
// Renvoie : pour chaque type d'événement, les 30 derniers jours { jour, total } ; les vues par fiche ;
// le profil d'ouverture (mode, thème, versions, nouveaux/retours, heures) ; les recherches (fréquentes
// et sans résultat) ; le nombre d'abonnés aux notifications et de messages reçus. Aucune donnée personnelle.

import crypto from 'crypto';
import { origineAutorisee, redis } from './_push-commun.js';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const CLE_ADMIN = process.env.PUSH_ADMIN_KEY || '';
const TYPES = ['ouverture', 'generation', 'pdf'];
const JOURS = 30;
const CLE_VUES = 'vulcain:stats:vues';
const TOP_FICHES = 40;
const CLE_RECHERCHES = 'vulcain:stats:recherches';
const CLE_RECHERCHES_VIDES = 'vulcain:stats:recherches-vides';
const CLE_ABONNEMENTS = 'vulcain:push:abonnements';
const CLE_MESSAGES = 'vulcain:contact:messages';
const TOP_RECHERCHES = 25;

function paires(brut) {
    const r = [];
    for (let i = 0; brut && i < brut.length; i += 2) r.push([brut[i], Number(brut[i + 1]) || 0]);
    return r;
}

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

        let topFiches = [], vues = {};
        try {
            const [brutVues] = await redis([['HGETALL', CLE_VUES]]);
            const liste = paires(brutVues).map(([fiche, n]) => ({ fiche, vues: n }));
            liste.forEach(f => { vues[f.fiche] = f.vues; });
            topFiches = liste.sort((a, b) => b.vues - a.vues).slice(0, TOP_FICHES);
        } catch (e) { /* popularité indisponible : on renvoie quand même le reste */ }

        // Profil d'ouverture sur 30 jours, recherches, abonnés, messages : chaque bloc est facultatif
        const profil = { mode: {}, theme: {}, version: {}, visiteur: {}, heure: Array(24).fill(0) };
        let recherches = [], recherchesVides = [], abonnes = null, messages = null;
        try {
            const resultats = await redis([
                ...jours.map(jour => ['HGETALL', `vulcain:stats:profil:${jour}`]),
                ['HGETALL', CLE_RECHERCHES], ['HGETALL', CLE_RECHERCHES_VIDES],
                ['HGETALL', CLE_ABONNEMENTS], ['LLEN', CLE_MESSAGES]
            ]);
            jours.forEach((jour, i) => paires(resultats[i]).forEach(([champ, n]) => {
                const [genre, valeur] = champ.split(':');
                if (genre === 'heure') profil.heure[Number(valeur)] = (profil.heure[Number(valeur)] || 0) + n;
                else if (profil[genre]) profil[genre][valeur] = (profil[genre][valeur] || 0) + n;
            }));
            const top = brut => paires(brut).sort((a, b) => b[1] - a[1]).slice(0, TOP_RECHERCHES).map(([terme, n]) => ({ terme, n }));
            recherches = top(resultats[jours.length]);
            recherchesVides = top(resultats[jours.length + 1]);
            const ab = { total: 0, nouveautes: 0, messages: 0, contact: 0 };
            paires(resultats[jours.length + 2]).forEach(([, valeur]) => {
                ab.total++;
                try { (JSON.parse(valeur).types || []).forEach(t => { if (t in ab) ab[t]++; }); } catch (e) { /* ignoré */ }
            });
            abonnes = ab;
            messages = Number(resultats[jours.length + 3]) || 0;
        } catch (e) { /* le reste des statistiques reste disponible */ }

        return res.status(200).json({ ok: true, jours: JOURS, genere: new Date().toISOString(), stats: resultat, topFiches, vues, profil, recherches, recherchesVides, abonnes, messages });
    } catch (e) {
        return res.status(502).json({ erreur: 'Lecture impossible' });
    }
}
