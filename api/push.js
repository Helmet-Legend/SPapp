// api/push.js - Abonnement aux notifications push
//  GET  : { configure, clePublique } (la clé publique VAPID sert à s'abonner)
//  POST : { action: 'abonner', abonnement, types: ['nouveautes', 'messages'] }
//         { action: 'desabonner', abonnement }

import crypto from 'crypto';
import { redis, origineAutorisee, pushConfigure, abonnementValide, CLE_ABONNEMENTS, TYPES, VAPID_PUBLIC } from './_push-commun.js';

export default async function handler(req, res) {
    const origine = req.headers.origin;
    if (origine && origineAutorisee(origine)) {
        res.setHeader('Access-Control-Allow-Origin', origine);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
        return res.status(200).json({ configure: pushConfigure(), clePublique: pushConfigure() ? VAPID_PUBLIC : null });
    }
    if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
    if (!origineAutorisee(origine)) return res.status(403).json({ erreur: 'Origine non autorisée' });
    if (!pushConfigure()) return res.status(503).json({ erreur: 'Notifications pas encore configurées sur le serveur' });

    const corps = typeof req.body === 'string' ? safeJSON(req.body) : (req.body || {});
    const abonnement = corps.abonnement;
    if (!abonnementValide(abonnement)) return res.status(400).json({ erreur: 'Abonnement invalide' });
    const id = crypto.createHash('sha256').update(abonnement.endpoint).digest('hex').slice(0, 32);

    try {
        if (corps.action === 'desabonner') {
            await redis([['HDEL', CLE_ABONNEMENTS, id]]);
            return res.status(200).json({ ok: true });
        }
        if (corps.action === 'abonner') {
            const types = (Array.isArray(corps.types) ? corps.types : []).filter(t => TYPES.includes(t));
            if (!types.length) {
                await redis([['HDEL', CLE_ABONNEMENTS, id]]);
                return res.status(200).json({ ok: true, types: [] });
            }
            const valeur = JSON.stringify({
                abonnement: { endpoint: abonnement.endpoint, keys: { p256dh: abonnement.keys.p256dh, auth: abonnement.keys.auth } },
                types,
                depuis: new Date().toISOString()
            });
            await redis([['HSET', CLE_ABONNEMENTS, id, valeur]]);
            return res.status(200).json({ ok: true, types });
        }
        return res.status(400).json({ erreur: 'Action inconnue' });
    } catch (e) {
        return res.status(502).json({ erreur: 'Stockage indisponible' });
    }
}

function safeJSON(texte) {
    try { return JSON.parse(texte); } catch (e) { return {}; }
}
