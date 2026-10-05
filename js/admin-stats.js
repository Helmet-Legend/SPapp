/**
 * Vulcain - Tableau de bord administrateur (ouvertures, générations IA, PDF)
 * Serveur : api/admin-stats.js (lecture, clé admin).
 * Réutilise la clé administrateur déjà mémorisée pour les notifications push.
 */
var AdminStats = (function () {
    var CLE_ADMIN = 'vulcain-push-admin';
    var CARTES = [
        { type: 'ouverture', titre: "Ouvertures de l'app", icone: '📲', couleur: 'bleu' },
        { type: 'generation', titre: 'Générations IA réussies', icone: '🤖', couleur: 'orange' },
        { type: 'pdf', titre: 'Téléchargements PDF', icone: '📥', couleur: 'aqua' }
    ];

    function lire(cle, defaut) {
        try { var v = localStorage.getItem(cle); return v === null ? defaut : JSON.parse(v); } catch (e) { return defaut; }
    }

    function preparerAffichage() {
        var cle = document.getElementById('statsCleAdmin');
        if (cle && !cle.value) cle.value = lire(CLE_ADMIN, '');
    }

    function jourCourt(iso) {
        var d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }

    function carteHTML(def, donnees) {
        var serie = (donnees && donnees.serie) || [];
        var total = (donnees && donnees.total) || 0;
        var max = Math.max(1, ...serie.map(function (p) { return p.total; }));
        var largeurBarre = 100 / Math.max(1, serie.length);

        var barres = serie.map(function (p, i) {
            var hauteur = Math.max(2, Math.round((p.total / max) * 60));
            return '<rect class="ia-dash-barre ia-dash-' + def.couleur + '" ' +
                'x="' + (i * largeurBarre).toFixed(2) + '%" width="' + (largeurBarre * 0.7).toFixed(2) + '%" ' +
                'y="' + (64 - hauteur) + '" height="' + hauteur + '" rx="2">' +
                '<title>' + jourCourt(p.jour) + ' : ' + p.total + '</title>' +
                '</rect>';
        }).join('');

        return '<div class="ia-dash-carte">' +
            '<div class="ia-dash-tete"><span class="ia-dash-icone">' + def.icone + '</span><span>' + def.titre + '</span></div>' +
            '<div class="ia-dash-total">' + total + '<small> sur 30 jours</small></div>' +
            '<svg class="ia-dash-graphe" viewBox="0 0 100 64" preserveAspectRatio="none" role="img" aria-label="' + def.titre + ', 30 derniers jours">' + barres + '</svg>' +
            '</div>';
    }

    async function charger() {
        var cle = document.getElementById('statsCleAdmin').value.trim();
        var retour = document.getElementById('statsRetour');
        var cartes = document.getElementById('statsCartes');
        if (!cle) { retour.textContent = 'Clé administrateur obligatoire.'; return; }
        retour.textContent = 'Chargement…';
        cartes.innerHTML = '';
        try {
            var r = await fetch('/api/admin-stats', { headers: { Authorization: 'Bearer ' + cle } });
            var b = await r.json().catch(function () { return {}; });
            if (!r.ok) { retour.textContent = b.erreur || ('Erreur ' + r.status); return; }
            if (document.getElementById('statsMemoriser').checked) { try { localStorage.setItem(CLE_ADMIN, JSON.stringify(cle)); } catch (e) {} }
            retour.textContent = '';
            cartes.innerHTML = CARTES.map(function (def) { return carteHTML(def, b.stats[def.type]); }).join('');
        } catch (e) {
            retour.textContent = 'Réseau indisponible.';
        }
    }

    return { preparerAffichage: preparerAffichage, charger: charger };
})();

function ouvrirTableauDeBord() {
    if (typeof fermerReglages === 'function') fermerReglages();
    showModule('admin-dashboard');
    AdminStats.preparerAffichage();
}
function chargerTableauDeBord() { AdminStats.charger(); }
