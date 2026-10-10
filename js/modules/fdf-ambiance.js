// Message d'ambiance FDF : formulaire « Je suis / Je vois / Je demande »
// Génère le message radio à transmettre au CODIS. Aucune donnée n'est envoyée ni enregistrée.
(function () {
    var RAD = Math.PI / 180;
    // Clarke 1880 IGN (NTF) et paramètres du Lambert II étendu
    var A_C = 6378249.2, B_C = 6356515.0, E2_C = (A_C * A_C - B_C * B_C) / (A_C * A_C), E_C = Math.sqrt(E2_C);
    var LAT0 = 52 * Math.PI / 200, LON0 = (2 + 20 / 60 + 14.025 / 3600) * RAD, K0 = 0.99987742;
    var M = function (ph) { return Math.cos(ph) / Math.sqrt(1 - E2_C * Math.sin(ph) * Math.sin(ph)); };
    var T = function (ph) { return Math.tan(Math.PI / 4 - ph / 2) / Math.pow((1 - E_C * Math.sin(ph)) / (1 + E_C * Math.sin(ph)), E_C / 2); };
    var N_L = Math.sin(LAT0), F_L = M(LAT0) / (N_L * Math.pow(T(LAT0), N_L));
    var R0 = A_C * K0 * F_L * Math.pow(T(LAT0), N_L);
    var LETTRES_100 = 'ABCDEFGHKLMN', LETTRES_2 = 'ABCDEFGHKL';

    // WGS84 -> Lambert II étendu (translation NTF -> WGS84 : -168, -60, +320 m)
    function wgs84VersLambert2e(latDeg, lonDeg) {
        var a1 = 6378137, f1 = 1 / 298.257223563, e1 = 2 * f1 - f1 * f1;
        var phi = latDeg * RAD, lam = lonDeg * RAD;
        var N = a1 / Math.sqrt(1 - e1 * Math.sin(phi) * Math.sin(phi));
        var X = N * Math.cos(phi) * Math.cos(lam) + 168, Y = N * Math.cos(phi) * Math.sin(lam) + 60, Z = N * (1 - e1) * Math.sin(phi) - 320;
        var p = Math.sqrt(X * X + Y * Y), lon = Math.atan2(Y, X), lat = Math.atan2(Z, p * (1 - E2_C));
        for (var i = 0; i < 8; i++) {
            var Nn = A_C / Math.sqrt(1 - E2_C * Math.sin(lat) * Math.sin(lat));
            lat = Math.atan2(Z + E2_C * Nn * Math.sin(lat), p);
        }
        var r = A_C * K0 * F_L * Math.pow(T(lat), N_L), th = N_L * (lon - LON0);
        return { x: 600000 + r * Math.sin(th), y: 2400000 + R0 - r * Math.cos(th) };
    }

    // Lambert II étendu -> WGS84
    function lambert2eVersWgs84(x, y) {
        var dx = x - 600000, dy = R0 - (y - 2400000);
        var r = Math.sqrt(dx * dx + dy * dy), th = Math.atan2(dx, dy);
        var lon = th / N_L + LON0, t = Math.pow(r / (A_C * K0 * F_L), 1 / N_L), lat = Math.PI / 2 - 2 * Math.atan(t);
        for (var i = 0; i < 10; i++) {
            lat = Math.PI / 2 - 2 * Math.atan(t * Math.pow((1 - E_C * Math.sin(lat)) / (1 + E_C * Math.sin(lat)), E_C / 2));
        }
        var N = A_C / Math.sqrt(1 - E2_C * Math.sin(lat) * Math.sin(lat));
        var X = N * Math.cos(lat) * Math.cos(lon) - 168, Y = N * Math.cos(lat) * Math.sin(lon) - 60, Z = N * (1 - E2_C) * Math.sin(lat) + 320;
        var a1 = 6378137, f1 = 1 / 298.257223563, e1 = 2 * f1 - f1 * f1;
        var p = Math.sqrt(X * X + Y * Y), lo = Math.atan2(Y, X), la = Math.atan2(Z, p * (1 - e1));
        for (var j = 0; j < 8; j++) {
            var Nn = a1 / Math.sqrt(1 - e1 * Math.sin(la) * Math.sin(la));
            la = Math.atan2(Z + e1 * Nn * Math.sin(la), p);
        }
        return { lat: la / RAD, lon: lo / RAD };
    }

    // GPS -> carreau DFCI (ex. GD82E1.4)
    function carreauDFCI(lat, lon) {
        var c = wgs84VersLambert2e(lat, lon);
        var cx = Math.floor(c.x / 100000), cy = Math.floor((c.y - 1700000) / 100000);
        if (cx < 0 || cx >= LETTRES_100.length || cy < 0 || cy >= LETTRES_100.length) return null;
        var ox = c.x - cx * 100000, oy = c.y - 1700000 - cy * 100000;
        var x20 = Math.floor(ox / 20000), y20 = Math.floor(oy / 20000);
        var rx = ox - x20 * 20000, ry = oy - y20 * 20000;
        var l2 = Math.floor(rx / 2000), n2 = Math.floor(ry / 2000);
        var u = rx - l2 * 2000, v = ry - n2 * 2000;
        var zone = (u >= 500 && u < 1500 && v >= 500 && v < 1500) ? 5 : (v >= 1000 ? (u < 1000 ? 1 : 2) : (u >= 1000 ? 3 : 4));
        return { code: LETTRES_100[cx] + LETTRES_100[cy] + (x20 * 2) + (y20 * 2) + LETTRES_2[l2] + n2 + '.' + zone, x: c.x, y: c.y };
    }

    // Saisie libre d'un carreau DFCI : « GD82E1.4 », « gd 82 e1 4 », « GD82E1 »…
    function lireDFCI(texte) {
        var m = String(texte).toUpperCase().replace(/[\s\-]/g, '').match(/^([A-HK-N])([A-HK-N])([02468])([02468])([A-HKL])([0-9])(?:[.,]?([1-5]))?$/);
        if (!m) return null;
        return { l1: m[1], l2: m[2], x20: +m[3], y20: +m[4], lc: m[5], nc: +m[6], zone: m[7] ? +m[7] : 0 };
    }
    function formatDFCI(d) { return d.l1 + d.l2 + d.x20 + d.y20 + d.lc + d.nc + (d.zone ? '.' + d.zone : ''); }

    // Carreau DFCI -> GPS (centre de la zone, ou du carreau de 2 km si la zone n'est pas précisée)
    function dfciVersGPS(d) {
        var cx = LETTRES_100.indexOf(d.l1), cy = LETTRES_100.indexOf(d.l2);
        var pos = { 0: [1000, 1000], 1: [300, 1700], 2: [1700, 1700], 3: [1700, 300], 4: [300, 300], 5: [1000, 1000] }[d.zone];
        var x = cx * 100000 + d.x20 * 10000 + LETTRES_2.indexOf(d.lc) * 2000 + pos[0];
        var y = 1700000 + cy * 100000 + d.y20 * 10000 + d.nc * 2000 + pos[1];
        return lambert2eVersWgs84(x, y);
    }

    // Saisie libre d'un point GPS en degrés décimaux : « 43.3948 N, 3.4265 E », « 43.3948 3.4265 »
    function lireGPS(texte) {
        var t = String(texte);
        if (t.indexOf('.') < 0) t = t.replace(/(\d),(\d)/g, '$1.$2');
        var nombres = t.match(/-?\d+(?:\.\d+)?/g);
        if (!nombres || nombres.length < 2) return null;
        var lat = parseFloat(nombres[0]), lon = parseFloat(nombres[1]);
        if (/\bS\b/i.test(texte)) lat = -Math.abs(lat);
        if (/\b[WO]\b/i.test(texte)) lon = -Math.abs(lon);
        if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
        return { lat: lat, lon: lon };
    }
    function formatGPS(lat, lon) {
        return Math.abs(lat).toFixed(5) + (lat < 0 ? ' S, ' : ' N, ') + Math.abs(lon).toFixed(5) + (lon < 0 ? ' O' : ' E');
    }

    window.carreauDFCI = carreauDFCI;
    window.dfciVersGPS = dfciVersGPS;
    window.lireDFCI = lireDFCI;

    var $ = function (id) { return document.getElementById('amb-' + id); };
    var val = function (id) { var e = $(id); return e ? e.value.trim() : ''; };
    var coche = function (nom) {
        return Array.prototype.map.call(document.querySelectorAll('#fdf-ambiance input[name="amb-' + nom + '"]:checked'), function (e) { return e.value; });
    };
    var liste = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1]; };
    var maj = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };
    var DIRECTIONS = { N: 'Nord', NE: 'Nord-Est', E: 'Est', SE: 'Sud-Est', S: 'Sud', SO: 'Sud-Ouest', O: 'Ouest', NO: 'Nord-Ouest' };
    var surface = function (id, libelle) {
        return val(id) ? libelle + ' ' + val(id) + ' ' + (val(id + '-u') || 'm²') + '.' : '';
    };

    function messageAmbiance() {
        var je = [], vois = [], demande = [], p;
        var d = lireDFCI(val('dfci'));
        if (d) je.push('Carreau DFCI ' + formatDFCI(d) + '.');
        if (val('gps')) je.push('Coordonnées GPS ' + val('gps') + '.');
        if (val('commune')) je.push('Commune de ' + val('commune') + '.');
        if (val('lieudit')) je.push('Lieu-dit ' + val('lieudit') + '.');
        if (val('repere')) je.push(maj(val('repere')) + '.');

        if (val('feu')) vois.push(maj(val('feu')) + '.');
        if (val('vegetation')) vois.push('Végétation : ' + val('vegetation').toLowerCase() + '.');
        if (val('propagation')) vois.push('Propagation ' + val('propagation') + '.');
        if (val('vent-dir') || val('vent-force')) {
            var vent = 'Vent' + (val('vent-dir') ? ' de ' + DIRECTIONS[val('vent-dir')] : '') + (val('vent-force') ? ', force ' + val('vent-force') : '');
            vois.push(vent + '.');
        }
        if (val('relief')) vois.push('Relief ' + val('relief') + '.');
        if (val('acces')) vois.push(val('acces') + (val('piste') ? ', ' + val('piste') : '') + '.');
        else if (val('piste')) vois.push('Accès : ' + val('piste') + '.');
        if ((p = surface('surf-brulee', 'Surface brûlée'))) vois.push(p);
        if ((p = surface('surf-menacee', 'Surface menacée'))) vois.push(p);
        if (val('front')) vois.push('Longueur du front de feu ' + val('front') + ' ' + (val('front-u') || 'm') + '.');
        var sens = coche('sensible');
        if (val('sensible-autre')) sens.push(val('sensible-autre'));
        if (sens.length) vois.push('Point sensible : ' + liste(sens) + (val('sensible-dist') ? ', à ' + val('sensible-dist') + ' mètres' : '') + '.');

        ['terrestre', 'aerien', 'cmdt'].forEach(function (id) { if (val(id)) demande.push(val(id)); });
        var lignes = ['De ' + (val('indicatif') || 'CCF …') + ' pour CODIS ' + (val('codis') || '…') + ', pour un premier message d\'ambiance.', ''];
        lignes.push('Je suis : ' + (je.join(' ') || '…'));
        lignes.push('Je vois : ' + (vois.join(' ') || '…'));
        var dem = demande.length ? 'Je demande : ' + maj(liste(demande)) + '.' : 'Je demande : …';
        if (val('demande-autre')) dem += ' Autre : ' + val('demande-autre') + '.';
        lignes.push(dem);
        lignes.push('Je poursuis la reconnaissance.');
        lignes.push('Je prends l\'appellation COS ' + (val('commune') || '…') + '.');
        return lignes.join('\n');
    }

    window.majAmbianceFDF = function () {
        var s = $('apercu'); if (s) s.textContent = messageAmbiance();
    };

    function etat(texte) { var e = $('geo-etat'); if (e) e.textContent = texte; }

    // DFCI saisi à la main -> GPS
    function depuisDFCI() {
        var d = lireDFCI(val('dfci'));
        if (!d) { etat(val('dfci') ? 'Carreau DFCI incomplet ou invalide (exemple : GD82E1.4).' : ''); return; }
        var g = dfciVersGPS(d);
        $('gps').value = formatGPS(g.lat, g.lon);
        etat('GPS déduit du carreau ' + formatDFCI(d) + ' (' + (d.zone ? 'centre de la zone ' + d.zone : 'centre du carreau de 2 km') + ').');
    }

    // GPS saisi à la main -> DFCI
    function depuisGPS() {
        var g = lireGPS(val('gps'));
        if (!g) { etat(val('gps') ? 'Coordonnées GPS non reconnues (exemple : 43.39480 N, 3.42654 E).' : ''); return; }
        var c = carreauDFCI(g.lat, g.lon);
        if (!c) { etat('Point hors du carroyage DFCI métropolitain.'); return; }
        $('dfci').value = c.code;
        etat('Carreau DFCI calculé : ' + c.code + ' (à contrôler sur la carte).');
    }

    window.localiserAmbianceFDF = function () {
        if (!navigator.geolocation) { etat('Géolocalisation indisponible sur cet appareil.'); return; }
        etat('Localisation en cours…');
        navigator.geolocation.getCurrentPosition(function (p) {
            $('gps').value = formatGPS(p.coords.latitude, p.coords.longitude);
            var c = carreauDFCI(p.coords.latitude, p.coords.longitude);
            if (c) $('dfci').value = c.code;
            etat('Position relevée (précision ± ' + Math.round(p.coords.accuracy) + ' m).' + (c ? ' Carreau DFCI calculé : ' + c.code + ' (à contrôler sur la carte).' : ''));
            majAmbianceFDF();
        }, function (e) {
            etat(e.code === 1 ? 'Localisation refusée : autorisez-la dans le navigateur.' : 'Position introuvable (pas de signal GPS).');
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    };

    window.copierAmbianceFDF = function () {
        var t = messageAmbiance();
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { if (window.showNotification) showNotification('Message copié !'); });
    };

    window.effacerAmbianceFDF = function () {
        document.querySelectorAll('#fdf-ambiance input, #fdf-ambiance select, #fdf-ambiance textarea').forEach(function (e) {
            if (e.type === 'checkbox') e.checked = false; else e.value = '';
        });
        etat('');
        majAmbianceFDF();
    };

    document.addEventListener('DOMContentLoaded', function () {
        var m = document.getElementById('fdf-ambiance');
        if (!m) return;
        $('dfci').addEventListener('input', depuisDFCI);
        $('gps').addEventListener('input', depuisGPS);
        m.addEventListener('input', majAmbianceFDF);
        m.addEventListener('change', majAmbianceFDF);
        majAmbianceFDF();
    });
})();
