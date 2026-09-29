/**
 * Vulcain - Formulaire de contact (À propos) et écran administrateur « Messages reçus »
 * Serveur : api/contact.js (réception), api/contact-lister.js (lecture, clé admin).
 * Réutilise la clé administrateur déjà mémorisée pour les notifications push.
 */
var Contact = (function () {
    var CLE_ADMIN = 'vulcain-push-admin';

    function lire(cle, defaut) {
        try { var v = localStorage.getItem(cle); return v === null ? defaut : JSON.parse(v); } catch (e) { return defaut; }
    }

    async function envoyer() {
        var champMessage = document.getElementById('contactMessage');
        var champEmail = document.getElementById('contactEmail');
        var retour = document.getElementById('contactRetour');
        var message = champMessage.value.trim();
        if (!message) { retour.textContent = 'Le message est vide.'; return; }
        retour.textContent = 'Envoi…';
        try {
            var r = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, contact: champEmail.value.trim(), page: location.pathname })
            });
            var b = await r.json().catch(function () { return {}; });
            if (!r.ok) { retour.textContent = b.erreur || ('Erreur ' + r.status); return; }
            champMessage.value = '';
            champEmail.value = '';
            retour.textContent = 'Message envoyé, merci !';
        } catch (e) {
            retour.textContent = 'Réseau indisponible.';
        }
    }

    // ---- Écran « Messages reçus » (administrateur) ----
    function preparerListe() {
        var cle = document.getElementById('contactCleAdmin');
        if (cle && !cle.value) cle.value = lire(CLE_ADMIN, '');
    }

    async function charger() {
        var cle = document.getElementById('contactCleAdmin').value.trim();
        var retour = document.getElementById('contactListeRetour');
        var liste = document.getElementById('contactListe');
        if (!cle) { retour.textContent = 'Clé administrateur obligatoire.'; return; }
        retour.textContent = 'Chargement…';
        liste.innerHTML = '';
        try {
            var r = await fetch('/api/contact-lister', { headers: { Authorization: 'Bearer ' + cle } });
            var b = await r.json().catch(function () { return {}; });
            if (!r.ok) { retour.textContent = b.erreur || ('Erreur ' + r.status); return; }
            if (document.getElementById('contactMemoriser').checked) { try { localStorage.setItem(CLE_ADMIN, JSON.stringify(cle)); } catch (e) {} }
            var alerteBox = document.getElementById('contactAlerteBox');
            if (alerteBox) { alerteBox.hidden = false; if (typeof Push !== 'undefined') Push.afficher(); }
            if (!b.messages.length) { retour.textContent = 'Aucun message pour le moment.'; return; }
            retour.textContent = b.messages.length + ' message' + (b.messages.length > 1 ? 's' : '') + '.';
            b.messages.forEach(function (m) {
                var el = document.createElement('div');
                el.className = 'contact-message';
                var date = new Date(m.date);
                var dateTxt = isNaN(date) ? '' : date.toLocaleString('fr-FR');
                el.innerHTML =
                    '<p class="contact-message-meta">' + dateTxt + (m.contact ? ' · ' + echapper(m.contact) : '') + (m.page ? ' · ' + echapper(m.page) : '') + '</p>' +
                    '<p class="contact-message-texte">' + echapper(m.message) + '</p>';
                liste.appendChild(el);
            });
        } catch (e) {
            retour.textContent = 'Réseau indisponible.';
        }
    }

    function echapper(s) {
        var d = document.createElement('div');
        d.textContent = String(s || '');
        return d.innerHTML;
    }

    return { envoyer: envoyer, preparerListe: preparerListe, charger: charger };
})();

function envoyerContact() { Contact.envoyer(); }
function ouvrirMessagesRecus() {
    if (typeof fermerReglages === 'function') fermerReglages();
    showModule('contact-lister');
    Contact.preparerListe();
}
function chargerMessagesRecus() { Contact.charger(); }
