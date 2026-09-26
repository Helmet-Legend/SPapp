// api/_push-commun.js - Outils partagés par les fonctions de notifications push
// (le préfixe « _ » empêche Vercel d'en faire une route).
//
// Variables Vercel nécessaires :
//  - VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY : clés de signature des notifications ;
//  - VAPID_SUBJECT (facultatif) : contact déclaré aux services push ;
//  - PUSH_ADMIN_KEY : clé à saisir dans l'écran « Envoyer une notification » ;
//  - base Upstash Redis reliée au projet (KV_REST_API_URL / KV_REST_API_TOKEN
//    ou UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) : stocke les abonnements.

import webpush from 'web-push';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://s-papp.vercel.app';

const CLE_ABONNEMENTS = 'vulcain:push:abonnements';
const TYPES = ['nouveautes', 'messages'];

const ORIGINES_AUTORISEES = [
    'https://s-papp.vercel.app',
    'https://s-papp-helmet-legends-projects.vercel.app',
    ...(process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
];
const ORIGINE_PREVIEW = /^https:\/\/s-papp-[a-z0-9-]+-helmet-legends-projects\.vercel\.app$/;
const ORIGINE_LOCALE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Services push des navigateurs : on refuse tout autre point de terminaison,
// pour que le serveur ne puisse pas être utilisé pour appeler une adresse arbitraire.
const SERVICES_PUSH = [
    /^fcm\.googleapis\.com$/,
    /^updates\.push\.services\.mozilla\.com$/,
    /^web\.push\.apple\.com$/,
    /\.notify\.windows\.com$/,
    /^push\.services\.mozilla\.com$/
];

function origineAutorisee(origine) {
    if (!origine) return false;
    return ORIGINES_AUTORISEES.includes(origine) || ORIGINE_PREVIEW.test(origine) || ORIGINE_LOCALE.test(origine);
}

function pushConfigure() {
    return Boolean(REDIS_URL && REDIS_TOKEN && VAPID_PUBLIC && VAPID_PRIVATE);
}

async function redis(commandes) {
    const reponse = await fetch(`${REDIS_URL}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commandes)
    });
    if (!reponse.ok) throw new Error('Redis ' + reponse.status);
    return (await reponse.json()).map(r => r.result);
}

function abonnementValide(abo) {
    if (!abo || typeof abo !== 'object' || typeof abo.endpoint !== 'string') return false;
    if (abo.endpoint.length > 1000) return false;
    let url;
    try { url = new URL(abo.endpoint); } catch (e) { return false; }
    if (url.protocol !== 'https:') return false;
    if (!SERVICES_PUSH.some(re => re.test(url.hostname))) return false;
    const k = abo.keys || {};
    return typeof k.p256dh === 'string' && typeof k.auth === 'string'
        && k.p256dh.length < 200 && k.auth.length < 100;
}

// Envoie une notification à tous les abonnés d'un type ; retire les abonnements expirés.
async function envoyerATous(type, contenu) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    const [brut] = await redis([['HGETALL', CLE_ABONNEMENTS]]);
    const entrees = [];
    for (let i = 0; brut && i < brut.length; i += 2) entrees.push([brut[i], brut[i + 1]]);
    const charge = JSON.stringify(contenu);
    let envoyes = 0;
    const expires = [];
    await Promise.all(entrees.map(async ([cle, valeur]) => {
        let donnees;
        try { donnees = JSON.parse(valeur); } catch (e) { expires.push(cle); return; }
        if (!Array.isArray(donnees.types) || !donnees.types.includes(type)) return;
        try {
            await webpush.sendNotification(donnees.abonnement, charge, { TTL: 24 * 3600, urgency: 'normal' });
            envoyes++;
        } catch (e) {
            if (e.statusCode === 404 || e.statusCode === 410) expires.push(cle);
        }
    }));
    if (expires.length) await redis([['HDEL', CLE_ABONNEMENTS, ...expires]]);
    return { envoyes, retires: expires.length, total: entrees.length };
}

export {
    webpush, redis, origineAutorisee, pushConfigure, abonnementValide, envoyerATous,
    CLE_ABONNEMENTS, TYPES, VAPID_PUBLIC
};
