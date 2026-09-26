/**
 * Vulcain - Notifications push
 *
 * Réglages › Notifications : deux abonnements indépendants, activés par défaut
 *  - « nouveautes » : annonce automatique de chaque nouvelle version (data/nouveautes.json) ;
 *  - « messages »   : messages libres envoyés depuis l'écran « Envoyer une notification ».
 * Activés par défaut, mais le navigateur exige un geste utilisateur pour demander
 * la permission : elle est donc demandée dès le premier geste dans l'app (sauf
 * si l'utilisateur a explicitement désactivé un des deux types).
 * Serveur : api/push.js (abonnement), api/push-nouveautes.js, api/push-envoyer.js.
 */
var Push = (function () {
    var CLE_TYPES = 'vulcain-push-types';
    var CLE_ANNONCE = 'vulcain-push-annonce';
    var CLE_ADMIN = 'vulcain-push-admin';
    var CLE_DEMANDE = 'vulcain-push-demande';
    var TYPES_PAR_DEFAUT = ['nouveautes', 'messages'];
    var PROD = location.hostname === 's-papp.vercel.app';

    function lire(cle, defaut) {
        try { var v = localStorage.getItem(cle); return v === null ? defaut : JSON.parse(v); } catch (e) { return defaut; }
    }
    function ecrire(cle, valeur) {
        try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) { /* stockage bloqué */ }
    }

    function supporte() {
        return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    }
    function iosNonInstalle() {
        var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        var installe = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
        return ios && !installe;
    }

    function base64EnOctets(b64) {
        var pad = '='.repeat((4 - b64.length % 4) % 4);
        var brut = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
        var sortie = new Uint8Array(brut.length);
        for (var i = 0; i < brut.length; i++) sortie[i] = brut.charCodeAt(i);
        return sortie;
    }

    function statut(texte) {
        var el = document.getElementById('pushStatut');
        if (el) el.textContent = texte;
    }

    function afficher() {
        var types = lire(CLE_TYPES, TYPES_PAR_DEFAUT);
        document.querySelectorAll('[data-push-type]').forEach(function (b) {
            b.setAttribute('aria-checked', types.indexOf(b.dataset.pushType) >= 0 ? 'true' : 'false');
        });
        if (!supporte()) {
            statut(iosNonInstalle()
                ? 'Sur iPhone et iPad : installe d\'abord Vulcain (Partager › « Sur l\'écran d\'accueil »), ouvre-le depuis l\'icône, puis active les notifications ici.'
                : 'Ce navigateur ne gère pas les notifications.');
        } else if (Notification.permission === 'denied') {
            statut('Notifications bloquées : autorise-les pour Vulcain dans les réglages du téléphone.');
        } else if (iosNonInstalle()) {
            statut('Sur iPhone et iPad : installe d\'abord Vulcain sur l\'écran d\'accueil pour recevoir les notifications.');
        } else if (!types.length) {
            statut('Notifications désactivées.');
        } else if (Notification.permission !== 'granted') {
            statut('Notifications activées par défaut : elles seront confirmées à ta prochaine action dans l\'app (autorisation du téléphone).');
        } else {
            statut('Notifications activées sur cet appareil.');
        }
    }

    async function abonnement(creer) {
        var reg = await navigator.serviceWorker.ready;
        var abo = await reg.pushManager.getSubscription();
        if (abo || !creer) return abo;
        var conf = await (await fetch('/api/push')).json();
        if (!conf.configure) throw new Error('Le serveur de notifications n\'est pas encore configuré.');
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64EnOctets(conf.clePublique) });
    }

    async function basculer(type) {
        if (!supporte() || iosNonInstalle()) { afficher(); return; }
        ecrire(CLE_DEMANDE, true); // un geste explicite sur l'interrupteur n'a plus besoin de la tentative automatique
        var types = lire(CLE_TYPES, TYPES_PAR_DEFAUT);
        var actif = types.indexOf(type) >= 0;
        var nouveaux = actif ? types.filter(function (t) { return t !== type; }) : types.concat([type]);
        try {
            if (!actif && Notification.permission !== 'granted') {
                var reponse = await Notification.requestPermission();
                if (reponse !== 'granted') { afficher(); return; }
            }
            statut('Enregistrement…');
            var abo = await abonnement(nouveaux.length > 0);
            if (abo) {
                var r = await fetch('/api/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'abonner', abonnement: abo.toJSON(), types: nouveaux })
                });
                if (!r.ok) throw new Error((await r.json().catch(function () { return {}; })).erreur || 'Erreur serveur');
                if (!nouveaux.length) await abo.unsubscribe();
            }
            ecrire(CLE_TYPES, nouveaux);
            afficher();
        } catch (e) {
            afficher();
            statut('Impossible de modifier l\'abonnement : ' + (e.message || 'réseau indisponible') + '.');
        }
    }

    // Activation par défaut : les notifications sont proposées activées d'emblée
    // (Réglages), mais le navigateur exige un geste de l'utilisateur pour demander
    // la permission (obligatoire sur iOS/Safari, recommandé partout ailleurs). On
    // saisit donc le tout premier geste dans l'app pour la demander une seule fois.
    async function activerSilencieusement(types) {
        try {
            var abo = await abonnement(true);
            if (abo) {
                await fetch('/api/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'abonner', abonnement: abo.toJSON(), types: types })
                });
            }
        } catch (e) { /* on retentera au prochain lancement */ }
        afficher();
    }

    function demanderPermissionApresGeste() {
        if (lire(CLE_DEMANDE, false)) return;
        ecrire(CLE_DEMANDE, true);
        Notification.requestPermission().then(function (reponse) {
            if (reponse === 'granted') activerSilencieusement(lire(CLE_TYPES, TYPES_PAR_DEFAUT));
            else afficher();
        }).catch(function () { afficher(); });
    }

    function tenterActivationParDefaut() {
        if (!supporte() || iosNonInstalle()) return;
        var types = lire(CLE_TYPES, TYPES_PAR_DEFAUT);
        if (!types.length) return; // désactivé explicitement
        if (Notification.permission === 'denied') return;
        if (Notification.permission === 'granted') { activerSilencieusement(types); return; }
        if (lire(CLE_DEMANDE, false)) return; // déjà proposé une fois (accepté, refusé ou fermé)
        document.addEventListener('click', demanderPermissionApresGeste, { once: true });
        document.addEventListener('touchend', demanderPermissionApresGeste, { once: true });
    }

    // Annonce de version : le premier appareil qui charge une nouvelle version
    // déclenche l'envoi (le serveur n'envoie qu'une fois par version).
    function annoncerVersion() {
        if (!PROD || typeof APP_VERSION === 'undefined' || !navigator.onLine) return;
        if (lire(CLE_ANNONCE, '') === APP_VERSION) return;
        fetch('/api/push-nouveautes', { method: 'POST' })
            .then(function (r) { if (r.ok) ecrire(CLE_ANNONCE, APP_VERSION); })
            .catch(function () { /* réessai au prochain lancement */ });
    }

    // Lien d'une notification : /?fiche=<id> ouvre directement la fiche
    function ouvrirFicheDemandee() {
        var id = new URLSearchParams(location.search).get('fiche');
        if (!id || !/^[a-z0-9-]{1,60}$/.test(id) || !document.getElementById(id)) return;
        if (typeof showModule === 'function') showModule(id);
        history.replaceState(history.state, '', location.pathname);
    }

    // ---- Écran « Envoyer une notification » ----
    function preparerEnvoi() {
        var cle = document.getElementById('pushCleAdmin');
        if (cle && !cle.value) cle.value = lire(CLE_ADMIN, '');
    }

    async function envoyer() {
        var cle = document.getElementById('pushCleAdmin').value.trim();
        var titre = document.getElementById('pushTitre').value.trim();
        var texte = document.getElementById('pushTexte').value.trim();
        var fiche = document.getElementById('pushFiche').value.trim();
        var retour = document.getElementById('pushRetour');
        if (!cle || !titre || !texte) { retour.textContent = 'Clé, titre et message sont obligatoires.'; return; }
        if (fiche && !document.getElementById(fiche)) { retour.textContent = 'Fiche « ' + fiche + ' » introuvable : laisse vide ou corrige l\'identifiant.'; return; }
        if (!confirm('Envoyer « ' + titre + ' » à tous les abonnés ?')) return;
        retour.textContent = 'Envoi…';
        try {
            var r = await fetch('/api/push-envoyer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cle },
                body: JSON.stringify({ titre: titre, texte: texte, fiche: fiche })
            });
            var b = await r.json().catch(function () { return {}; });
            if (!r.ok) { retour.textContent = b.erreur || ('Erreur ' + r.status); return; }
            if (document.getElementById('pushMemoriser').checked) ecrire(CLE_ADMIN, cle);
            retour.textContent = 'Envoyé à ' + b.envoyes + ' appareil' + (b.envoyes > 1 ? 's' : '') + (b.retires ? ' (' + b.retires + ' abonnement' + (b.retires > 1 ? 's' : '') + ' expiré' + (b.retires > 1 ? 's' : '') + ' retiré' + (b.retires > 1 ? 's' : '') + ')' : '') + '.';
        } catch (e) {
            retour.textContent = 'Réseau indisponible.';
        }
    }

    document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-push-type]');
        if (b) basculer(b.dataset.pushType);
    });
    window.addEventListener('load', function () {
        afficher();
        ouvrirFicheDemandee();
        tenterActivationParDefaut();
        setTimeout(annoncerVersion, 3000);
    });

    return { afficher: afficher, preparerEnvoi: preparerEnvoi, envoyer: envoyer };
})();

function ouvrirEnvoiNotification() {
    if (typeof fermerReglages === 'function') fermerReglages();
    showModule('notif-envoi');
    Push.preparerEnvoi();
}
function envoyerNotification() { Push.envoyer(); }
