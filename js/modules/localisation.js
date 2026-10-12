/**
 * Vulcain - Outil « Se localiser » : un seul champ (carreau DFCI, coordonnées GPS DD / DMS / DMD ou adresse, détecté automatiquement),
 * ma position, mini-carte, météo au point, adresse la plus proche, derniers points.
 * Hors ligne : GPS <-> DFCI <-> formats (js/modules/geo-dfci.js).
 * En ligne : adresse (sur demande), météo Open-Meteo (dès qu'un point est affiché), fond de la mini-carte IGN.
 * Seuls les 5 derniers points sont gardés, sur l'appareil.
 */
var Localisation = (function () {
    var SERVICES = [
        { recherche: 'https://data.geopf.fr/geocodage/search', inverse: 'https://data.geopf.fr/geocodage/reverse' },
        { recherche: 'https://api-adresse.data.gouv.fr/search/', inverse: 'https://api-adresse.data.gouv.fr/reverse/' }
    ];
    var CLE_RECENTS = 'vulcain-loc-recents', CLE_FOND = 'vulcain-carte-fond';
    var FONDS = {
        plan: { nom: 'Plan IGN', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png' },
        photo: { nom: 'Photo aérienne', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg' },
        aucun: { nom: 'Sans fond', url: null }
    };
    var point = null; // { lat, lon, precision, adresse, commune }
    var mini = null, miniCouche = null, miniMarqueur = null;
    var jetonMeteo = 0, minuterieMeteo = null, minuterieRecent = null;
    var $ = function (id) { return document.getElementById('loc-' + id); };
    var echapper = function (t) { var d = document.createElement('div'); d.textContent = String(t == null ? '' : t); return d.innerHTML; };

    function etat(texte) { var e = $('etat'); if (e) e.textContent = texte || ''; }
    function erreur(on) { $('saisie').classList.toggle('loc-erreur', !!on); }
    function notifier(t) { if (window.showNotification) showNotification(t); }

    // ---------- Stockage local (facultatif) ----------
    function lireRecents() { try { var r = JSON.parse(localStorage.getItem(CLE_RECENTS) || '[]'); return Array.isArray(r) ? r.slice(0, 5) : []; } catch (e) { return []; } }
    function ecrireRecents(r) { try { localStorage.setItem(CLE_RECENTS, JSON.stringify(r)); } catch (e) { /* stockage indisponible */ } }
    function lireFond() { try { var f = localStorage.getItem(CLE_FOND); return FONDS[f] ? f : 'plan'; } catch (e) { return 'plan'; } }
    function noterRecent() {
        if (!point) return;
        var c = Geo.carreauDFCI(point.lat, point.lon);
        if (!c) return;
        var liste = lireRecents().filter(function (r) { return r.code !== c.code; });
        liste.unshift({ code: c.code, lat: point.lat, lon: point.lon, commune: point.commune || '' });
        ecrireRecents(liste.slice(0, 5));
        afficherRecents();
    }
    function afficherRecents() {
        var z = $('recents'), liste = lireRecents();
        z.hidden = !liste.length;
        z.innerHTML = liste.length ? '<small class="loc-titre">Récents</small>' + liste.map(function (r, i) {
            return '<button type="button" data-recent="' + i + '"><b>' + echapper(r.code) + '</b><span>' + echapper(r.commune || '') + '</span></button>';
        }).join('') : '';
    }

    // ---------- Mini-carte (fond IGN facultatif, sans interaction) ----------
    function majMini() {
        if (typeof L === 'undefined' || !point) return;
        var conteneur = $('mini-carte');
        if (!mini) {
            mini = L.map(conteneur, { zoomControl: false, attributionControl: false, dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false });
            appliquerFondMini();
        }
        mini.invalidateSize();
        mini.setView([point.lat, point.lon], 14);
        if (miniMarqueur) miniMarqueur.setLatLng([point.lat, point.lon]);
        else miniMarqueur = L.circleMarker([point.lat, point.lon], { radius: 9, color: '#fff', weight: 3, fillColor: '#D7263D', fillOpacity: 1, interactive: false }).addTo(mini);
    }
    function appliquerFondMini() {
        if (!mini) return;
        if (miniCouche) { mini.removeLayer(miniCouche); miniCouche = null; }
        var f = FONDS[lireFond()];
        if (f.url) { miniCouche = L.tileLayer(f.url, { maxZoom: 18, crossOrigin: true }); miniCouche.addTo(mini); }
    }
    function majLibelleFond() { var e = $('fond'); if (e) e.textContent = '🌐 Fond de la mini-carte : ' + FONDS[lireFond()].nom; }
    function changerFond() {
        var ordre = ['plan', 'photo', 'aucun'], suivant = ordre[(ordre.indexOf(lireFond()) + 1) % ordre.length];
        try { localStorage.setItem(CLE_FOND, suivant); } catch (e) { /* stockage indisponible */ }
        majLibelleFond();
        appliquerFondMini();
    }

    // ---------- Affichage ----------
    function afficher(sauf) {
        var res = $('resultat');
        $('vide').hidden = !!point;
        res.hidden = !point;
        $('barre').hidden = !point;
        if (!point) return;
        var f = Geo.formats(point.lat, point.lon), c = Geo.carreauDFCI(point.lat, point.lon);
        if (sauf !== 'saisie') $('saisie').value = c ? c.code : Geo.formatGPS(point.lat, point.lon);
        var dmd = f.dmd.split(', ');
        $('r-titre').textContent = c ? 'Carreau DFCI' : 'Position';
        $('r-dfci').classList.toggle('loc-dfci-mer', !c);
        if (c) $('r-dfci').textContent = c.code;
        else $('r-dfci').innerHTML = dmd.map(function (v) { return '<span>' + v + '</span>'; }).join('');
        $('r-sous').textContent = c ? 'Zone ' + c.code.slice(-1) + ' du carreau de 2 km' + (point.commune ? ' · ' + point.commune : '') : '🌊 Hors carroyage DFCI : en mer ou hors de France, le carreau DFCI ne s\'applique pas.';
        var amb = $('btn-ambiance'); if (amb) amb.hidden = !c;
        $('barre').classList.toggle('loc-barre-2', !c);
        majNbPoints();
        $('r-formats').innerHTML = [['dd', 'DD', 'Degrés décimaux'], ['dms', 'DMS', 'Degrés, minutes, secondes'], ['dmd', 'DMD', 'Degrés, minutes décimales']].map(function (k) {
            var v = f[k[0]].split(', ');
            return '<div class="loc-format"><div class="loc-format-texte"><small>' + k[2] + ' · ' + k[1] + '</small><code><i>LAT</i>' + v[0] + '<br><i>LON</i>' + v[1] + '</code></div>' +
                '<button type="button" data-copie="' + k[0] + '" aria-label="Copier le format ' + k[1] + '"><span aria-hidden="true">⧉</span> Copier</button></div>';
        }).join('');
        $('r-adresse').innerHTML = point.adresse ? echapper(point.adresse) : '<small>Ouvrez pour la chercher (la position est envoyée à l\'IGN).</small>';
        $('r-precision').textContent = point.precision ? 'Précision GPS ± ' + Math.round(point.precision) + ' m' : '';
        majMini();
    }

    function definir(lat, lon, extra, sauf) {
        point = Object.assign({ lat: lat, lon: lon, precision: null, adresse: '', commune: '' }, extra || {});
        erreur(false);
        afficher(sauf);
        clearTimeout(minuterieMeteo);
        minuterieMeteo = setTimeout(chargerMeteo, 600);
        clearTimeout(minuterieRecent);
        minuterieRecent = setTimeout(noterRecent, 2000);
    }

    function texteCopie() {
        if (!point) return '';
        var f = Geo.formats(point.lat, point.lon), c = Geo.carreauDFCI(point.lat, point.lon);
        return ['Localisation (Vulcain)', c ? 'DFCI : ' + c.code : '', 'DD : ' + f.dd, 'DMS : ' + f.dms, 'DMD : ' + f.dmd, point.adresse ? 'Adresse : ' + point.adresse : '',
            'https://www.google.com/maps?q=' + point.lat.toFixed(6) + ',' + point.lon.toFixed(6)].filter(Boolean).join('\n');
    }

    // ---------- Mes points ----------
    function majNbPoints() {
        var b = $('nb-points'), n = (typeof MesPoints !== 'undefined') ? MesPoints.nombre() : 0;
        if (!b) return;
        b.hidden = !n;
        b.textContent = n + ' enregistré' + (n > 1 ? 's' : '') + ' ›';
    }
    function enregistrer() {
        if (point) MesPoints.demander(point.lat, point.lon, point.adresse);
    }

    // ---------- Saisie unique : DFCI, GPS ou adresse ----------
    function nature(t) {
        if (/^[A-Za-z]{2}\d/.test(t)) return 'dfci';
        if (/\d/.test(t) && !/[^\d\s.,°'′’"″”\-+NSEWOnsewo]/.test(t)) return 'gps';
        return 'adresse';
    }

    function saisir() {
        var t = $('saisie').value.trim();
        $('chercher').hidden = true;
        $('adresses').innerHTML = '';
        if (!t) { erreur(false); etat(''); point = null; afficher(); return; }
        var n = nature(t);
        if (n === 'dfci') {
            var d = Geo.lireDFCI(t);
            if (!d) { erreur(true); etat('Carreau non reconnu : 2 lettres (A–N), 2 chiffres pairs, une lettre, un chiffre. Exemple : GD82E1.4'); return; }
            var g = Geo.dfciVersGPS(d);
            definir(g.lat, g.lon, null, 'saisie');
            etat('Position déduite du carreau ' + Geo.formatDFCI(d) + ' (' + (d.zone ? 'centre de la zone ' + d.zone : 'centre du carreau de 2 km') + ').');
        } else if (n === 'gps') {
            var p = Geo.lireGPS(t);
            if (!p) { erreur(t.length > 5); etat(t.length > 5 ? 'Coordonnées non reconnues. Exemples : 43.39480 N, 3.42654 E ou 43°23\'41" N 3°25\'36" E' : ''); return; }
            definir(p.lat, p.lon, null, 'saisie');
            etat('');
        } else {
            erreur(false);
            if (t.length >= 3) { $('chercher').hidden = false; etat('Adresse : appuyez sur Entrée ou sur « Chercher cette adresse ».'); }
            else etat('');
        }
    }

    function maPosition() {
        if (!navigator.geolocation) { etat('Géolocalisation indisponible sur cet appareil.'); return; }
        etat('Localisation en cours…');
        navigator.geolocation.getCurrentPosition(function (p) {
            definir(p.coords.latitude, p.coords.longitude, { precision: p.coords.accuracy });
            etat('Position relevée.');
        }, function (e) {
            etat(e.code === 1 ? 'Localisation refusée : autorisez-la dans le navigateur.' : 'Position introuvable (pas de signal GPS).');
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    }

    // ---------- Adresses (en ligne, sur demande) ----------
    async function appeler(type, params) {
        var derniere = null;
        for (var i = 0; i < SERVICES.length; i++) {
            try {
                var ctrl = new AbortController(), minuterie = setTimeout(function () { ctrl.abort(); }, 8000);
                var url = SERVICES[i][type] + '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
                var r = await fetch(url, { signal: ctrl.signal });
                clearTimeout(minuterie);
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return await r.json();
            } catch (e) { derniere = e; }
        }
        throw derniere;
    }

    async function chercherAdresse() {
        var q = $('saisie').value.trim();
        var liste = $('adresses');
        if (q.length < 3) { etat('Saisissez au moins 3 caractères.'); return; }
        liste.innerHTML = '';
        etat('Recherche…');
        try {
            var b = await appeler('recherche', { q: q, limit: 5 });
            var f = (b && b.features) || [];
            if (!f.length) { etat('Aucune adresse trouvée.'); return; }
            etat(f.length + ' adresse' + (f.length > 1 ? 's' : '') + ' : choisissez la bonne.');
            liste.innerHTML = f.map(function (x, i) {
                var p = x.properties || {};
                return '<button type="button" class="loc-adresse" data-i="' + i + '">' + echapper(p.name || p.label) + '<small>' + echapper((p.postcode ? p.postcode + ' ' : '') + (p.city || '')) + '</small></button>';
            }).join('');
            liste.onclick = function (e) {
                var bt = e.target.closest('.loc-adresse');
                if (!bt) return;
                var x = f[Number(bt.dataset.i)];
                $('chercher').hidden = true;
                liste.innerHTML = '';
                definir(x.geometry.coordinates[1], x.geometry.coordinates[0], { adresse: x.properties.label, commune: x.properties.city || '' }, 'saisie');
                etat('Adresse placée sur la carte DFCI.');
            };
        } catch (e) {
            etat('Recherche d\'adresse indisponible (réseau ou service). Le GPS et le DFCI restent utilisables.');
        }
    }

    async function adresseProche() {
        if (!point) return;
        etat('Recherche de l\'adresse la plus proche…');
        try {
            var b = await appeler('inverse', { lon: point.lon.toFixed(6), lat: point.lat.toFixed(6), limit: 1 });
            var x = b && b.features && b.features[0];
            if (!x) { etat('Aucune adresse proche de ce point.'); return; }
            point.adresse = x.properties.label; point.commune = x.properties.city || '';
            afficher('saisie');
            etat('Adresse la plus proche trouvée.');
        } catch (e) {
            etat('Adresse indisponible (réseau ou service).');
        }
    }

    // ---------- Météo (automatique, dès qu'un point est affiché) ----------
    async function chargerMeteo() {
        if (!point) return;
        var zone = $('meteo'), tag = $('meteo-etat'), jeton = ++jetonMeteo, p = point;
        if (navigator.onLine === false) { zone.innerHTML = '<small>Hors ligne : météo indisponible.</small>'; tag.textContent = 'hors ligne'; return; }
        tag.textContent = 'chargement…';
        zone.innerHTML = '<small>Chargement de la météo…</small>';
        try {
            var d = await Meteo.lire(p.lat, p.lon);
            if (jeton !== jetonMeteo) return;
            zone.innerHTML = Meteo.resume(d) + '<details class="loc-prevision"><summary>Prévision des heures suivantes</summary>' + Meteo.detail(d) + '</details>';
            tag.textContent = 'modèle, ' + d.heure;
        } catch (e) {
            if (jeton !== jetonMeteo) return;
            zone.innerHTML = '<small>Météo indisponible (réseau ou service). Le reste de l\'outil fonctionne sans.</small>';
            tag.textContent = 'indisponible';
        }
    }

    // ---------- Actions ----------
    function ouvrirCarte() {
        fermerMenu();
        if (point) window.open('https://www.google.com/maps?q=' + point.lat.toFixed(6) + ',' + point.lon.toFixed(6), '_blank', 'noopener');
    }
    function voirCarteDFCI() { if (point && typeof CarteDFCI !== 'undefined') CarteDFCI.voir(point.lat, point.lon); }
    function copier() {
        if (point && navigator.clipboard) navigator.clipboard.writeText(texteCopie()).then(function () { notifier('Position copiée !'); });
    }
    function copierFormat(k, bouton) {
        if (!point || !navigator.clipboard) return;
        var f = Geo.formats(point.lat, point.lon);
        navigator.clipboard.writeText(f[k]).then(function () {
            notifier('Copié : ' + f[k]);
            if (!bouton) return;
            bouton.classList.add('loc-copie-ok'); bouton.textContent = '✓ Copié';
            setTimeout(function () { bouton.classList.remove('loc-copie-ok'); bouton.innerHTML = '<span aria-hidden="true">⧉</span> Copier'; }, 1500);
        });
    }
    function partager() {
        fermerMenu();
        if (!point) return;
        if (navigator.share) navigator.share({ title: 'Ma position', text: texteCopie() }).catch(function () {});
        else copier();
    }
    function versAmbiance() {
        if (!point) return;
        var c = Geo.carreauDFCI(point.lat, point.lon);
        noterRecent();
        showModule('fdf-ambiance');
        var set = function (id, v) { var e = document.getElementById('amb-' + id); if (e && v) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
        set('gps', Geo.formatGPS(point.lat, point.lon));
        set('dfci', c ? c.code : '');
        var commune = document.getElementById('amb-commune');
        if (commune && !commune.value && point.commune) set('commune', point.commune);
    }
    function effacer() {
        fermerMenu();
        point = null;
        jetonMeteo++;
        $('saisie').value = '';
        $('adresses').innerHTML = '';
        $('chercher').hidden = true;
        erreur(false);
        etat('');
        afficher();
    }

    // ---------- Menu ⋯ ----------
    function fermerMenu() { var m = $('menu'); if (m) { m.hidden = true; $('menu-btn').setAttribute('aria-expanded', 'false'); } }
    function menu() { var m = $('menu'), ouvert = m.hidden; m.hidden = !ouvert; $('menu-btn').setAttribute('aria-expanded', ouvert ? 'true' : 'false'); }

    function majHorsLigne() { var b = $('hors-ligne'); if (b) b.hidden = navigator.onLine !== false; }

    document.addEventListener('DOMContentLoaded', function () {
        var m = document.getElementById('localisation');
        if (!m) return;
        $('saisie').addEventListener('input', saisir);
        document.addEventListener('mes-points-change', majNbPoints);
        majNbPoints();
        $('saisie').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (nature($('saisie').value.trim()) === 'adresse') chercherAdresse(); } });
        m.addEventListener('click', function (e) {
            var ex = e.target.closest('[data-exemple]');
            if (ex) { $('saisie').value = ex.dataset.exemple; saisir(); return; }
            var cp = e.target.closest('[data-copie]');
            if (cp) { copierFormat(cp.dataset.copie, cp); return; }
            var rc = e.target.closest('[data-recent]');
            if (rc) { var r = lireRecents()[Number(rc.dataset.recent)]; if (r) definir(r.lat, r.lon, { commune: r.commune || '' }); return; }
            if (!e.target.closest('.loc-entete')) fermerMenu();
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerMenu(); });
        $('adresse-bloc').addEventListener('toggle', function () { if (this.open && point && !point.adresse) adresseProche(); });
        window.addEventListener('online', majHorsLigne);
        window.addEventListener('offline', majHorsLigne);
        majHorsLigne();
        majLibelleFond();
        afficherRecents();
    });

    return { maPosition: maPosition, chercherAdresse: chercherAdresse, adresseProche: adresseProche, ouvrirCarte: ouvrirCarte, voirCarteDFCI: voirCarteDFCI,
        meteo: chargerMeteo, copier: copier, partager: partager, versAmbiance: versAmbiance, effacer: effacer, menu: menu, changerFond: changerFond,
        enregistrer: enregistrer };
})();
