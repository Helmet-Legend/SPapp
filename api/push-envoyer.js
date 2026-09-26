// api/push-envoyer.js - Envoi d'un message libre à tous les abonnés « messages »
// POST { titre, texte, fiche? } avec l'en-tête Authorization: Bearer <PUSH_ADMIN_KEY>

import crypto from 'crypto';
import { origineAutorisee, pushConfigure, envoyerATous } from './_push-commun.js';

const CLE_ADMIN = process.env.PUSH_ADMIN_KEY || '';

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
    if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
    if (!origineAutorisee(origine)) return res.status(403).json({ erreur: 'Origine non autorisée' });
    if (!pushConfigure() || !CLE_ADMIN) return res.status(503).json({ erreur: 'Notifications pas encore configurées sur le serveur' });

    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!cleValide(auth)) return res.status(401).json({ erreur: 'Clé administrateur incorrecte' });

    let corps = req.body || {};
    if (typeof corps === 'string') { try { corps = JSON.parse(corps); } catch (e) { corps = {}; } }
    const titre = String(corps.titre || '').trim().slice(0, 80);
    const texte = String(corps.texte || '').trim().slice(0, 300);
    const fiche = /^[a-z0-9-]{1,60}$/.test(corps.fiche || '') ? corps.fiche : '';
    if (!titre || !texte) return res.status(400).json({ erreur: 'Titre et texte obligatoires' });

    try {
        const bilan = await envoyerATous('messages', {
            titre, texte, url: fiche ? `/?fiche=${fiche}` : '/', tag: 'vulcain-message-' + Date.now()
        });
        return res.status(200).json({ ok: true, ...bilan });
    } catch (e) {
        return res.status(502).json({ erreur: 'Envoi impossible' });
    }
}
