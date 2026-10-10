// Message d'ambiance FDF : formulaire « Je suis / Je vois / Je fais / Je demande »
// Génère le message radio à transmettre au CODIS. Aucune donnée n'est envoyée ni enregistrée.
(function () {
    // Conversion WGS84 -> Lambert II étendu -> carreau DFCI
    function wgs84VersLambert2e(latDeg, lonDeg) {
        var rad = Math.PI / 180;
        // WGS84 -> géocentrique
        var a1 = 6378137, f1 = 1 / 298.257223563, e1 = 2 * f1 - f1 * f1;
        var phi = latDeg * rad, lam = lonDeg * rad;
        var N = a1 / Math.sqrt(1 - e1 * Math.sin(phi) * Math.sin(phi));
        var X = N * Math.cos(phi) * Math.cos(lam), Y = N * Math.cos(phi) * Math.sin(lam), Z = N * (1 - e1) * Math.sin(phi);
        // WGS84 -> NTF (translation inverse de (-168, -60, +320))
        X += 168; Y += 60; Z -= 320;
        // géocentrique -> géodésique Clarke 1880 IGN
        var a = 6378249.2, b = 6356515.0, e2 = (a * a - b * b) / (a * a), e = Math.sqrt(e2);
        var p = Math.sqrt(X * X + Y * Y), lon = Math.atan2(Y, X), lat = Math.atan2(Z, p * (1 - e2));
        for (var i = 0; i < 8; i++) {
            var Nn = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
            lat = Math.atan2(Z + e2 * Nn * Math.sin(lat), p);
        }
        // Lambert conique conforme zone II (parallèle 52 gr = 46,8°), méridien de Paris
        var lat0 = 52 * Math.PI / 200, lon0 = (2 + 20 / 60 + 14.025 / 3600) * rad, k0 = 0.99987742;
        var m = function (ph) { return Math.cos(ph) / Math.sqrt(1 - e2 * Math.sin(ph) * Math.sin(ph)); };
        var t = function (ph) { return Math.tan(Math.PI / 4 - ph / 2) / Math.pow((1 - e * Math.sin(ph)) / (1 + e * Math.sin(ph)), e / 2); };
        var n = Math.sin(lat0);
        var F = m(lat0) / (n * Math.pow(t(lat0), n));
        var r = a * k0 * F * Math.pow(t(lat), n), r0 = a * k0 * F * Math.pow(t(lat0), n);
        var th = n * (lon - lon0);
        return { x: 600000 + r * Math.sin(th), y: 2400000 + r0 - r * Math.cos(th) };
    }
    function carreauDFCI(lat, lon) {
        var L = 'ABCDEFGHKLMN';
        var c = wgs84VersLambert2e(lat, lon);
        var cx = Math.floor(c.x / 100000), cy = Math.floor((c.y - 1700000) / 100000);
        if (cx < 0 || cx >= L.length || cy < 0 || cy >= L.length) return null;
        var ox = c.x - cx * 100000, oy = c.y - 1700000 - cy * 100000;
        var x20 = Math.floor(ox / 20000), y20 = Math.floor(oy / 20000);
        var rx = ox - x20 * 20000, ry = oy - y20 * 20000;
        var l2 = Math.floor(rx / 2000), n2 = Math.floor(ry / 2000);
        var u = rx - l2 * 2000, v = ry - n2 * 2000;
        var zone = (u >= 500 && u < 1500 && v >= 500 && v < 1500) ? 5 : (v >= 1000 ? (u < 1000 ? 1 : 2) : (u >= 1000 ? 3 : 4));
        return { code: L[cx] + L[cy] + (x20 * 2) + (y20 * 2) + 'ABCDEFGHKL'[l2] + n2 + '.' + zone, x: c.x, y: c.y };
    }

    var $ = function (id) { return document.getElementById('amb-' + id); };
    var val = function (id) { var e = $(id); return e ? e.value.trim() : ''; };
    var coche = function (nom) {
        return Array.prototype.map.call(document.querySelectorAll('#fdf-ambiance input[name="amb-' + nom + '"]:checked'), function (e) { return e.value; });
    };
    var liste = function (a) {
        if (a.length < 2) return a.join('');
        return a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
    };
    var maj = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };
    var DIRECTIONS = { N: 'Nord', NE: 'Nord-Est', E: 'Est', SE: 'Sud-Est', S: 'Sud', SO: 'Sud-Ouest', O: 'Ouest', NO: 'Nord-Ouest' };

    window.carreauDFCI = carreauDFCI;
    function codeDFCI() {
        var c100 = val('dfci-100').toUpperCase().replace(/[^A-Z]/g, '');
        if (c100.length !== 2) return '';
        var x = val('dfci-x'), y = val('dfci-y'), l = val('dfci-l'), n = val('dfci-n');
        if (x === '' || y === '' || !l || n === '') return c100;
        return c100 + x + y + l + n + (val('dfci-z') ? '.' + val('dfci-z') : '');
    }

    function messageAmbiance() {
        var je = [], vois = [], fais = [], demande = [];
        var lieu = [];
        if (val('commune')) lieu.push('sur la commune de ' + val('commune'));
        if (val('lieudit')) lieu.push('lieu-dit ' + val('lieudit'));
        if (val('repere')) lieu.push(val('repere'));
        if (lieu.length) je.push(lieu.join(', ') + '.');
        var dfci = codeDFCI();
        if (dfci) je.push('Carreau DFCI ' + dfci + '.');
        var gps = val('gps');
        if (gps) je.push('Coordonnées GPS ' + gps + '.');
        var acces = val('acces');
        if (acces) je.push(acces + (val('piste') ? ' par ' + val('piste') : '') + '.');
        else if (val('piste')) je.push('Accès par ' + val('piste') + '.');

        var feu = ['Un feu'];
        if (val('feu')) feu = ['Un ' + val('feu').toLowerCase()];
        if (val('vegetation')) feu.push('de ' + val('vegetation').toLowerCase());
        if (coche('sousbois').length) feu.push('avec sous-bois dense');
        vois.push(feu.join(' ') + '.');
        var surf = val('surface');
        if (surf) vois.push('Surface brûlée estimée à ' + surf + (val('surface-u') ? ' ' + val('surface-u') : '') + '.');
        var prop = [];
        if (val('propagation')) prop.push('Propagation ' + val('propagation').toLowerCase());
        if (val('vent-dir') || val('vent-force')) {
            var vent = 'vent ' + (val('vent-dir') ? 'de ' + DIRECTIONS[val('vent-dir')] : '') + (val('vent-force') ? ' à environ ' + val('vent-force') + ' km/h' : '');
            prop.push('poussée par un ' + vent.trim());
        }
        if (prop.length) vois.push(prop.join(', ') + '.');
        if (val('relief')) vois.push('Relief ' + val('relief').toLowerCase() + '.');
        var enj = coche('enjeux');
        if (enj.length) {
            var d = val('enjeu-dist');
            vois.push('Je crains pour : ' + liste(enj) + (d ? ', à ' + d + ' mètres dans l\'axe de propagation' : '') + '.');
        } else vois.push('Pas d\'enjeu identifié pour le moment.');

        var act = val('action');
        if (act) fais.push(act + (val('action-detail') ? ' : ' + val('action-detail') : '') + '.');
        else if (val('action-detail')) fais.push(val('action-detail') + '.');

        var dem = [];
        if (coche('giff').length) {
            var n = val('giff-nb');
            dem.push(n && n !== '1' ? n + ' GIFF' : 'un GIFF complet');
        }
        coche('autres-moyens').forEach(function (m) { dem.push(m); });
        if (val('hbe-avion')) dem.push(val('hbe-avion'));
        if (val('cmdt')) dem.push(val('cmdt'));
        coche('appuis').forEach(function (m) { dem.push(m); });
        if (val('demande-autre')) dem.push(val('demande-autre'));
        if (dem.length) demande.push(maj(liste(dem)) + '.');

        var appel = 'De ' + (val('indicatif') || 'CCF …') + ' pour CODIS ' + (val('codis') || '…') + ', pour un premier message d\'ambiance.';
        var out = [appel, ''];
        out.push('Je suis : ' + maj(je.join(' ') || '…'));
        out.push('Je vois : ' + vois.join(' '));
        out.push('Je fais : ' + (fais.join(' ') || '…'));
        out.push('Je demande : ' + (demande.join(' ') || '…'));
        return out.join('\n');
    }

    window.majAmbianceFDF = function () {
        var s = $('apercu'); if (s) s.textContent = messageAmbiance();
    };

    window.localiserAmbianceFDF = function () {
        var etat = $('gps-etat');
        if (!navigator.geolocation) { etat.textContent = 'Géolocalisation indisponible sur cet appareil.'; return; }
        etat.textContent = 'Localisation en cours…';
        navigator.geolocation.getCurrentPosition(function (p) {
            var la = p.coords.latitude, lo = p.coords.longitude;
            $('gps').value = la.toFixed(5) + ' N, ' + lo.toFixed(5) + ' E';
            var d = carreauDFCI(la, lo), info = '';
            if (d) {
                var m = d.code.match(/^([A-Z]{2})(\d)(\d)([A-Z])(\d)\.(\d)$/);
                $('dfci-100').value = m[1]; $('dfci-x').value = m[2]; $('dfci-y').value = m[3];
                $('dfci-l').value = m[4]; $('dfci-n').value = m[5]; $('dfci-z').value = m[6];
                info = ' Carreau DFCI calculé : ' + d.code + ' (à contrôler sur la carte).';
            }
            etat.textContent = 'Position relevée (précision ± ' + Math.round(p.coords.accuracy) + ' m).' + info;
            majAmbianceFDF();
        }, function (e) {
            etat.textContent = e.code === 1 ? 'Localisation refusée : autorisez-la dans le navigateur.' : 'Position introuvable (pas de signal GPS).';
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
        var g = $('gps-etat'); if (g) g.textContent = '';
        majAmbianceFDF();
    };

    document.addEventListener('DOMContentLoaded', function () {
        var m = document.getElementById('fdf-ambiance');
        if (!m) return;
        m.addEventListener('input', majAmbianceFDF);
        m.addEventListener('change', majAmbianceFDF);
        majAmbianceFDF();
    });
})();
