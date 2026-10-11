/**
 * Vulcain - Accès administrateur discret
 * Appuyer 7 fois de suite sur le numéro de version (À propos) fait apparaître un champ « clé ».
 * La clé est vérifiée par le serveur (GET /api/admin-stats) avant d'être mémorisée sur l'appareil ;
 * l'onglet Admin et les liens d'administration des Réglages n'apparaissent qu'ensuite.
 * Aucune protection côté navigateur : la sécurité reste la clé contrôlée à chaque appel serveur.
 */
var AdminAcces = (function () {
    var CLE_ADMIN = 'vulcain-push-admin';
    var NB_APPUIS = 7;
    var DELAI_MS = 4000;
    var appuis = 0, minuterie = null;

    function cleMemorisee() {
        try { var v = localStorage.getItem(CLE_ADMIN); return !!v && JSON.parse(v) !== ''; } catch (e) { return false; }
    }

    // Les liens d'administration des Réglages ne sont visibles que si la clé est mémorisée
    function majLiensReglages() {
        var visible = cleMemorisee();
        document.querySelectorAll('.reglages-admin').forEach(function (el) { el.hidden = !visible; });
    }

    function blocSaisie() { return document.getElementById('adminDeverrouillage'); }

    function appui() {
        clearTimeout(minuterie);
        appuis++;
        if (appuis >= NB_APPUIS) {
            appuis = 0;
            var bloc = blocSaisie();
            if (bloc) { bloc.hidden = false; var champ = document.getElementById('adminCleSaisie'); if (champ) champ.focus(); }
            return;
        }
        minuterie = setTimeout(function () { appuis = 0; }, DELAI_MS);
    }

    async function deverrouiller() {
        var champ = document.getElementById('adminCleSaisie');
        var retour = document.getElementById('adminRetour');
        var cle = champ ? champ.value.trim() : '';
        if (!cle) { retour.textContent = 'Saisissez la clé.'; return; }
        retour.textContent = 'Vérification…';
        try {
            var r = await fetch('/api/admin-stats', { headers: { Authorization: 'Bearer ' + cle } });
            if (r.status === 401) { retour.textContent = 'Clé refusée.'; return; }
            if (!r.ok) { retour.textContent = 'Vérification impossible (erreur ' + r.status + ').'; return; }
            try { localStorage.setItem(CLE_ADMIN, JSON.stringify(cle)); } catch (e) { retour.textContent = 'Stockage bloqué sur cet appareil.'; return; }
            champ.value = '';
            retour.textContent = 'Mode administrateur activé sur cet appareil.';
            majLiensReglages();
            if (typeof Navigation !== 'undefined' && Navigation.majOngletAdmin) Navigation.majOngletAdmin();
            setTimeout(function () { var b = blocSaisie(); if (b) b.hidden = true; retour.textContent = ''; }, 1800);
        } catch (e) {
            retour.textContent = 'Réseau indisponible.';
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        majLiensReglages();
        document.querySelectorAll('#aboutModal .app-version').forEach(function (el) { el.addEventListener('click', appui); });
    });

    return { majLiensReglages: majLiensReglages, deverrouiller: deverrouiller, appui: appui };
})();
