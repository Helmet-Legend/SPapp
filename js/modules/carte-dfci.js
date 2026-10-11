/**
 * Vulcain - Carte DFCI : grille du carroyage DFCI (100 km, 20 km, 2 km, zones 1 à 5) dessinée sur le téléphone,
 * avec fond de carte IGN facultatif (en ligne). La grille et les codes fonctionnent hors ligne.
 * Calcul : js/modules/geo-dfci.js (WGS84 <-> Lambert II étendu). Carte : Leaflet (vendor/leaflet, BSD-2).
 */
var CarteDFCI = (function () {
    var CLE_FOND = 'vulcain-carte-fond';
    var FONDS = {
        plan: { nom: 'Plan IGN', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png', max: 18 },
        photo: { nom: 'Photo aérienne', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg', max: 19 },
        aucun: { nom: 'Sans fond', url: null, max: 19 }
    };
    var NIVEAUX = [
        { id: '100km', pas: 100000, couleur: '#E0313F', epaisseur: 2.6, longueur: 2 },
        { id: '20km', pas: 20000, couleur: '#F59E0B', epaisseur: 2, longueur: 4 },
        { id: '2km', pas: 2000, couleur: '#22A6F2', epaisseur: 1.6, longueur: 6 }
    ];
    var Y0 = 1700000;

    var carte = null, groupeGrille = null, groupeEtiquettes = null, couche = null, marqueur = null, cercle = null, repere = null;
    var fondActif = 'plan', erreursTuiles = 0, tuilesChargees = 0, derniereEtat = { niveau: '', lignes: 0, etiquettes: 0 };
    var $ = function (id) { return document.getElementById('cd-' + id); };

    function lireFond() { try { var f = localStorage.getItem(CLE_FOND); return FONDS[f] ? f : 'plan'; } catch (e) { return 'plan'; } }
    function ecrireFond(f) { try { localStorage.setItem(CLE_FOND, f); } catch (e) { /* stockage indisponible */ } }

    // ---------- Fond de carte ----------
    function appliquerFond(id) {
        fondActif = id; ecrireFond(id);
        if (couche) { carte.removeLayer(couche); couche = null; }
        erreursTuiles = 0; tuilesChargees = 0;
        $('alerte-fond').hidden = true;
        var f = FONDS[id];
        if (f.url) {
            couche = L.tileLayer(f.url, { maxZoom: f.max, maxNativeZoom: f.max, attribution: '© IGN', crossOrigin: true });
            couche.on('tileload', function () { tuilesChargees++; $('alerte-fond').hidden = true; });
            couche.on('tileerror', function () {
                erreursTuiles++;
                if (erreursTuiles >= 3 && !tuilesChargees) $('alerte-fond').hidden = false;
            });
            couche.addTo(carte);
            couche.bringToBack();
        }
        document.querySelectorAll('#carte-dfci [data-fond]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.fond === id ? 'true' : 'false'); });
    }

    // ---------- Grille ----------
    // Emprise visible exprimée en Lambert II étendu (la grille y est un quadrillage régulier)
    function empriseLambert() {
        var b = carte.getBounds(), pts = [[b.getSouth(), b.getWest()], [b.getSouth(), b.getEast()], [b.getNorth(), b.getWest()], [b.getNorth(), b.getEast()]]
            .map(function (p) { return Geo.wgs84VersLambert2e(p[0], p[1]); });
        return { x0: Math.min.apply(null, pts.map(function (p) { return p.x; })), x1: Math.max.apply(null, pts.map(function (p) { return p.x; })),
            y0: Math.min.apply(null, pts.map(function (p) { return p.y; })), y1: Math.max.apply(null, pts.map(function (p) { return p.y; })) };
    }

    function versLatLng(x, y) { var g = Geo.lambert2eVersWgs84(x, y); return [g.lat, g.lon]; }

    function ligne(points, niveau, tirets) {
        return L.polyline(points, { color: niveau.couleur, weight: niveau.epaisseur, opacity: .9, interactive: false, dashArray: tirets ? '4 5' : null, renderer: rendu });
    }

    var rendu = null;

    function dessiner() {
        if (!carte) return;
        groupeGrille.clearLayers(); groupeEtiquettes.clearLayers();
        var e = empriseLambert(), span = Math.max(e.x1 - e.x0, e.y1 - e.y0);
        var niveau = NIVEAUX[0];
        for (var i = NIVEAUX.length - 1; i >= 0; i--) { if (span / NIVEAUX[i].pas <= 24) { niveau = NIVEAUX[i]; break; } }
        var pas = niveau.pas, marge = pas;
        var ix0 = Math.floor((e.x0 - marge) / pas), ix1 = Math.ceil((e.x1 + marge) / pas);
        var iy0 = Math.floor((e.y0 - Y0 - marge) / pas), iy1 = Math.ceil((e.y1 - Y0 + marge) / pas);
        var xa = ix0 * pas, xb = ix1 * pas, ya = Y0 + iy0 * pas, yb = Y0 + iy1 * pas;
        var echant = Math.max(1, Math.ceil((yb - ya) / (pas * niveau.longueur)));
        var nbLignes = 0;
        for (var a = ix0; a <= ix1; a++) {
            var pts = []; for (var k = 0; k <= echant; k++) pts.push(versLatLng(a * pas, ya + (yb - ya) * k / echant));
            groupeGrille.addLayer(ligne(pts, niveau)); nbLignes++;
        }
        var echantX = Math.max(1, Math.ceil((xb - xa) / (pas * niveau.longueur)));
        for (var c = iy0; c <= iy1; c++) {
            var pts2 = []; for (var k2 = 0; k2 <= echantX; k2++) pts2.push(versLatLng(xa + (xb - xa) * k2 / echantX, Y0 + c * pas));
            groupeGrille.addLayer(ligne(pts2, niveau)); nbLignes++;
        }

        // Zones 1 à 5 d'un carreau de 2 km : médianes et carré central, quand on est assez près
        var zones = pas === 2000 && span <= 8000;
        if (zones) {
            for (var a2 = ix0; a2 < ix1; a2++) for (var c2 = iy0; c2 < iy1; c2++) {
                var cx = a2 * pas, cy = Y0 + c2 * pas;
                groupeGrille.addLayer(ligne([versLatLng(cx + 1000, cy), versLatLng(cx + 1000, cy + 2000)], niveau, true));
                groupeGrille.addLayer(ligne([versLatLng(cx, cy + 1000), versLatLng(cx + 2000, cy + 1000)], niveau, true));
                groupeGrille.addLayer(ligne([versLatLng(cx + 500, cy + 500), versLatLng(cx + 1500, cy + 500), versLatLng(cx + 1500, cy + 1500), versLatLng(cx + 500, cy + 1500), versLatLng(cx + 500, cy + 500)], niveau, true));
                nbLignes += 3;
            }
        }

        // Étiquettes au centre des cases visibles (ou des zones), plafonnées
        var nbEt = 0, MAX = 130;
        var cible = carte.getBounds().pad(0.05);
        for (var a3 = ix0; a3 < ix1 && nbEt < MAX; a3++) for (var c3 = iy0; c3 < iy1 && nbEt < MAX; c3++) {
            var cases = [];
            if (zones) cases = [[500, 1500, 1], [1500, 1500, 2], [1500, 500, 3], [500, 500, 4], [1000, 1000, 5]].map(function (z) { return { dx: z[0], dy: z[1], suffixe: '.' + z[2] }; });
            else cases = [{ dx: pas / 2, dy: pas / 2, suffixe: '' }];
            cases.forEach(function (z) {
                var ll = versLatLng(a3 * pas + z.dx, Y0 + c3 * pas + z.dy);
                if (!cible.contains(ll) || nbEt >= MAX) return;
                var d = Geo.carreauDFCI(ll[0], ll[1]);
                if (!d) return;
                var code = d.code, texte = niveau.id === '100km' ? code.slice(0, 2) : niveau.id === '20km' ? code.slice(0, 4) : code.slice(0, 6) + z.suffixe;
                if (zones) texte = code.slice(0, 6) + z.suffixe;
                groupeEtiquettes.addLayer(L.marker(ll, { interactive: false, keyboard: false, icon: L.divIcon({ className: 'cd-etiquette cd-n-' + niveau.id + (zones ? ' cd-zone' : ''), html: '<span>' + texte + '</span>', iconSize: [0, 0] }) }));
                nbEt++;
            });
        }
        derniereEtat = { niveau: niveau.id + (zones ? '+zones' : ''), lignes: nbLignes, etiquettes: nbEt };
        var ind = $('niveau'); if (ind) ind.textContent = { '100km': 'Carrés de 100 km', '20km': 'Carrés de 20 km', '2km': 'Carreaux de 2 km' }[niveau.id] + (zones ? ' · zones 1 à 5' : '');
    }

    // ---------- Point choisi ----------
    function placer(lat, lon, options) {
        options = options || {};
        if (marqueur) carte.removeLayer(marqueur);
        marqueur = L.circleMarker([lat, lon], { radius: 9, color: '#fff', weight: 3, fillColor: '#E0313F', fillOpacity: 1, interactive: false }).addTo(carte);
        if (cercle) { carte.removeLayer(cercle); cercle = null; }
        if (options.precision) cercle = L.circle([lat, lon], { radius: options.precision, color: '#22A6F2', weight: 1, fillOpacity: .12, interactive: false }).addTo(carte);
        repere = { lat: lat, lon: lon };
        var d = Geo.carreauDFCI(lat, lon), f = Geo.formats(lat, lon);
        $('info').hidden = false;
        $('i-dfci').textContent = d ? d.code : 'Hors carroyage DFCI';
        $('i-dd').textContent = f.dd;
        $('i-formats').innerHTML = ['dd', 'dms', 'dmd'].map(function (k) { return '<div><b>' + k.toUpperCase() + '</b> ' + f[k] + '</div>'; }).join('');
        $('i-precision').textContent = options.precision ? 'Précision GPS ± ' + Math.round(options.precision) + ' m' : 'Point touché sur la carte';
    }

    function aller(lat, lon, zoom, options) {
        carte.setView([lat, lon], zoom || Math.max(carte.getZoom(), 13), { animate: false });
        placer(lat, lon, options);
        dessiner();
    }

    function chercher() {
        var t = $('recherche').value.trim();
        if (!t) return;
        var d = Geo.lireDFCI(t);
        if (d) { var g = Geo.dfciVersGPS(d); aller(g.lat, g.lon, d.zone ? 15 : 14); $('etat').textContent = ''; return; }
        var p = Geo.lireGPS(t);
        if (p) { aller(p.lat, p.lon, 15); $('etat').textContent = ''; return; }
        $('etat').textContent = 'Carreau DFCI ou coordonnées non reconnus (exemples : GD82E1.4 ; 43.3951, 3.4263).';
    }

    function maPosition() {
        if (!navigator.geolocation) { $('etat').textContent = 'Géolocalisation indisponible sur cet appareil.'; return; }
        $('etat').textContent = 'Localisation en cours…';
        navigator.geolocation.getCurrentPosition(function (p) {
            $('etat').textContent = '';
            aller(p.coords.latitude, p.coords.longitude, 15, { precision: p.coords.accuracy });
        }, function (e) {
            $('etat').textContent = e.code === 1 ? 'Localisation refusée : autorisez-la dans le navigateur.' : 'Position introuvable (pas de signal GPS).';
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    }

    // ---------- Actions du point ----------
    function texteCopie() {
        var d = Geo.carreauDFCI(repere.lat, repere.lon), f = Geo.formats(repere.lat, repere.lon);
        return ['Position (carte DFCI Vulcain)', d ? 'DFCI : ' + d.code : '', 'DD : ' + f.dd, 'DMS : ' + f.dms, 'DMD : ' + f.dmd].filter(Boolean).join('\n');
    }
    function copier() { if (repere && navigator.clipboard) navigator.clipboard.writeText(texteCopie()).then(function () { if (window.showNotification) showNotification('Position copiée !'); }); }
    function versAmbiance() {
        if (!repere) return;
        var d = Geo.carreauDFCI(repere.lat, repere.lon);
        showModule('fdf-ambiance');
        var set = function (id, v) { var e = document.getElementById('amb-' + id); if (e && v) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
        set('gps', Geo.formatGPS(repere.lat, repere.lon)); set('dfci', d ? d.code : '');
    }
    function versLocalisation() {
        if (!repere) return;
        showModule('localisation');
        var g = document.getElementById('loc-gps');
        if (g) { g.value = Geo.formatGPS(repere.lat, repere.lon); g.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    function ouvrirMaps() { if (repere) window.open('https://www.google.com/maps?q=' + repere.lat.toFixed(6) + ',' + repere.lon.toFixed(6), '_blank', 'noopener'); }
    // Plein écran : la carte occupe tout l'écran (barre de recherche et fonds conservés)
    function pleinEcran() {
        var m = document.getElementById('carte-dfci');
        m.classList.toggle('cd-plein');
        var plein = m.classList.contains('cd-plein');
        document.body.classList.toggle('cd-plein-actif', plein);
        $('plein').textContent = plein ? '✕' : '⤢';
        setTimeout(function () { if (carte) { carte.invalidateSize(); dessiner(); } }, 60);
    }
    function fermerInfo() { $('info').hidden = true; if (marqueur) { carte.removeLayer(marqueur); marqueur = null; } if (cercle) { carte.removeLayer(cercle); cercle = null; } }

    // ---------- Initialisation (au premier affichage) ----------
    function initCarte() {
        if (carte) { carte.invalidateSize(); dessiner(); return; }
        if (typeof L === 'undefined') { $('etat').textContent = 'Bibliothèque de carte indisponible.'; return; }
        carte = L.map($('carte'), { zoomControl: true, attributionControl: true, zoomSnap: 0.5, minZoom: 4, maxZoom: 19, preferCanvas: true });
        carte.attributionControl.setPrefix(false);
        rendu = L.canvas({ padding: 0.5 });
        groupeGrille = L.layerGroup().addTo(carte);
        groupeEtiquettes = L.layerGroup().addTo(carte);
        carte.setView([43.5, 3.5], 8);
        carte.on('moveend zoomend', dessiner);
        carte.on('click', function (e) { placer(e.latlng.lat, e.latlng.lng); });
        appliquerFond(lireFond());
        dessiner();
    }

    function voir(lat, lon, zoom) {
        showModule('carte-dfci');
        initCarte();
        aller(lat, lon, zoom || 15);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var m = document.getElementById('carte-dfci');
        if (!m) return;
        new MutationObserver(function () { if (m.classList.contains('active')) setTimeout(initCarte, 30); }).observe(m, { attributes: true, attributeFilter: ['class'] });
        $('recherche').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); chercher(); } });
        m.querySelectorAll('[data-fond]').forEach(function (b) { b.addEventListener('click', function () { if (carte) appliquerFond(b.dataset.fond); }); });
    });

    return { chercher: chercher, maPosition: maPosition, copier: copier, versAmbiance: versAmbiance, versLocalisation: versLocalisation,
        ouvrirMaps: ouvrirMaps, fermerInfo: fermerInfo, pleinEcran: pleinEcran, voir: voir, etat: function () { return derniereEtat; }, carte: function () { return carte; } };
})();
