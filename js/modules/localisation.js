/**
 * Vulcain - Outil « Se localiser » : position, carreau DFCI, coordonnées GPS (DD / DMS / DMD) et adresse.
 * Hors ligne : GPS <-> DFCI <-> formats (js/modules/geo-dfci.js).
 * En ligne uniquement, et seulement quand on appuie sur le bouton : recherche d'adresse et adresse la plus proche
 * (géocodage de l'IGN, Géoplateforme ; secours : Base Adresse Nationale). Rien n'est enregistré.
 */
var Localisation = (function () {
    var SERVICES = [
        { recherche: 'https://data.geopf.fr/geocodage/search', inverse: 'https://data.geopf.fr/geocodage/reverse' },
        { recherche: 'https://api-adresse.data.gouv.fr/search/', inverse: 'https://api-adresse.data.gouv.fr/reverse/' }
    ];
    var point = null; // { lat, lon, precision, adresse, commune }
    var $ = function (id) { return document.getElementById('loc-' + id); };
    var valeur = function (id) { var e = $(id); return e ? e.value.trim() : ''; };
    var echapper = function (t) { var d = document.createElement('div'); d.textContent = String(t == null ? '' : t); return d.innerHTML; };

    function etat(texte) { var e = $('etat'); if (e) e.textContent = texte || ''; }

    // ---------- Affichage ----------
    function afficher(sauf) {
        var res = $('resultat');
        if (!point) { res.hidden = true; return; }
        var f = Geo.formats(point.lat, point.lon), c = Geo.carreauDFCI(point.lat, point.lon);
        if (sauf !== 'dfci') $('dfci').value = c ? c.code : '';
        if (sauf !== 'gps') $('gps').value = Geo.formatGPS(point.lat, point.lon);
        res.hidden = false;
        $('r-dfci').textContent = c ? c.code : 'Hors carroyage DFCI';
        $('r-formats').innerHTML = ['dd', 'dms', 'dmd'].map(function (k) { return '<div><b>' + k.toUpperCase() + '</b> ' + f[k] + '</div>'; }).join('');
        $('r-adresse').innerHTML = point.adresse ? '<div><b>Adresse</b> ' + echapper(point.adresse) + '</div>' : '';
        $('r-precision').textContent = point.precision ? 'Précision GPS ± ' + Math.round(point.precision) + ' m' : '';
    }

    function definir(lat, lon, extra, sauf) {
        point = Object.assign({ lat: lat, lon: lon, precision: null, adresse: '', commune: '' }, extra || {});
        afficher(sauf);
    }

    function texteCopie() {
        if (!point) return '';
        var f = Geo.formats(point.lat, point.lon), c = Geo.carreauDFCI(point.lat, point.lon);
        return ['Localisation (Vulcain)', c ? 'DFCI : ' + c.code : '', 'DD : ' + f.dd, 'DMS : ' + f.dms, 'DMD : ' + f.dmd, point.adresse ? 'Adresse : ' + point.adresse : '',
            'https://www.google.com/maps?q=' + point.lat.toFixed(6) + ',' + point.lon.toFixed(6)].filter(Boolean).join('\n');
    }

    // ---------- Saisies (hors ligne) ----------
    function depuisDFCI() {
        var d = Geo.lireDFCI(valeur('dfci'));
        if (!d) { etat(valeur('dfci') ? 'Carreau DFCI incomplet ou invalide (exemple : GD82E1.4).' : ''); return; }
        var g = Geo.dfciVersGPS(d);
        definir(g.lat, g.lon, null, 'dfci');
        etat('Position déduite du carreau ' + Geo.formatDFCI(d) + ' (' + (d.zone ? 'centre de la zone ' + d.zone : 'centre du carreau de 2 km') + ').');
    }

    function depuisGPS() {
        var g = Geo.lireGPS(valeur('gps'));
        if (!g) { etat(valeur('gps') ? 'Coordonnées non reconnues (exemples : 43.39480 N, 3.42654 E ou 43°23\'41" N 3°25\'36" E).' : ''); return; }
        definir(g.lat, g.lon, null, 'gps');
        etat('');
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
        var q = valeur('adresse');
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
                return '<button type="button" class="loc-adresse" data-i="' + i + '">' + echapper(x.properties.label) + '</button>';
            }).join('');
            liste.onclick = function (e) {
                var bt = e.target.closest('.loc-adresse');
                if (!bt) return;
                var x = f[Number(bt.dataset.i)];
                definir(x.geometry.coordinates[1], x.geometry.coordinates[0], { adresse: x.properties.label, commune: x.properties.city || '' });
                liste.innerHTML = '';
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
            afficher();
            etat('Adresse la plus proche trouvée.');
        } catch (e) {
            etat('Adresse indisponible (réseau ou service).');
        }
    }

    // ---------- Actions ----------
    function ouvrirCarte() {
        if (point) window.open('https://www.google.com/maps?q=' + point.lat.toFixed(6) + ',' + point.lon.toFixed(6), '_blank', 'noopener');
    }
    function voirCarteDFCI() { if (point && typeof CarteDFCI !== 'undefined') CarteDFCI.voir(point.lat, point.lon); }
    function copier() {
        if (point && navigator.clipboard) navigator.clipboard.writeText(texteCopie()).then(function () { if (window.showNotification) showNotification('Position copiée !'); });
    }
    function partager() {
        if (!point) return;
        if (navigator.share) navigator.share({ title: 'Ma position', text: texteCopie() }).catch(function () {});
        else copier();
    }
    function versAmbiance() {
        if (!point) return;
        var c = Geo.carreauDFCI(point.lat, point.lon);
        showModule('fdf-ambiance');
        var set = function (id, v) { var e = document.getElementById('amb-' + id); if (e && v) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
        set('gps', Geo.formatGPS(point.lat, point.lon));
        set('dfci', c ? c.code : '');
        var commune = document.getElementById('amb-commune');
        if (commune && !commune.value && point.commune) set('commune', point.commune);
    }
    function effacer() {
        point = null;
        ['dfci', 'gps', 'adresse'].forEach(function (id) { $(id).value = ''; });
        $('adresses').innerHTML = '';
        etat('');
        afficher();
    }

    document.addEventListener('DOMContentLoaded', function () {
        var m = document.getElementById('localisation');
        if (!m) return;
        $('dfci').addEventListener('input', depuisDFCI);
        $('gps').addEventListener('input', depuisGPS);
        $('adresse').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); chercherAdresse(); } });
    });

    return { maPosition: maPosition, chercherAdresse: chercherAdresse, adresseProche: adresseProche, ouvrirCarte: ouvrirCarte, voirCarteDFCI: voirCarteDFCI,
        copier: copier, partager: partager, versAmbiance: versAmbiance, effacer: effacer };
})();
