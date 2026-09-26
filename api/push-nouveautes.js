// api/push-nouveautes.js - Annonce automatique d'une nouvelle version
//
// Appelé par l'application au chargement (sans clé) : le serveur lit
// data/nouveautes.json sur le site déployé et n'envoie la notification
// qu'une seule fois par version (verrou Redis SET NX). Appels répétés sans effet.

import { redis, origineAutorisee, pushConfigure, envoyerATous } from './_push-commun.js';

const CLE_VERROU = 'vulcain:push:version-annoncee:';

export default async function handler(req, res) {
    const origine = req.headers.origin;
    if (origine && origineAutorisee(origine)) {
        res.setHeader('Access-Control-Allow-Origin', origine);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });
    if (!origineAutorisee(origine)) return res.status(403).json({ erreur: 'Origine non autorisée' });
    if (!pushConfigure()) return res.status(200).json({ ok: false, raison: 'non configuré' });

    // Seul le site de production annonce les versions (pas les prévisualisations)
    const hote = process.env.VERCEL_ENV === 'production'
        ? 'https://s-papp.vercel.app'
        : null;
    if (!hote) return res.status(200).json({ ok: false, raison: 'hors production' });

    try {
        const r = await fetch(`${hote}/data/nouveautes.json`, { cache: 'no-store' });
        if (!r.ok) return res.status(200).json({ ok: false, raison: 'nouveautes.json absent' });
        const n = await r.json();
        const version = String(n.version || '').slice(0, 20);
        if (!/^\d+\.\d+\.\d+$/.test(version)) return res.status(200).json({ ok: false, raison: 'version invalide' });

        const [pris] = await redis([['SET', CLE_VERROU + version, new Date().toISOString(), 'NX']]);
        if (pris !== 'OK') return res.status(200).json({ ok: true, deja: true });

        const bilan = await envoyerATous('nouveautes', {
            titre: String(n.titre || `Vulcain ${version}`).slice(0, 80),
            texte: String(n.texte || 'Nouvelle version disponible.').slice(0, 300),
            url: /^[a-z0-9-]{1,60}$/.test(n.fiche || '') ? `/?fiche=${n.fiche}` : '/',
            tag: 'vulcain-version-' + version
        });
        return res.status(200).json({ ok: true, version, ...bilan });
    } catch (e) {
        return res.status(200).json({ ok: false, raison: 'erreur' });
    }
}
