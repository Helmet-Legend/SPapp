/**
 * Vulcain - Météo au point (vent, rafales, température, humidité, pluie) à partir de la position.
 * Service : Open-Meteo (prévisions modélisées, sans clé, usage non commercial, attribution CC BY 4.0).
 * Réseau nécessaire, appel uniquement sur action de l'utilisateur. Donnée de PRÉVISION : à confirmer par l'observation.
 */
var Meteo = (function () {
    var URL_API = 'https://api.open-meteo.com/v1/forecast';
    var memoire = {};
    var NOMS = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
    var CODES = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

    // Direction DONT souffle le vent (convention météo), comme dans le message d'ambiance
    function direction(deg) {
        var i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
        return { code: CODES[i], nom: NOMS[i] };
    }
    // Force du vent en km/h -> libellé du message d'ambiance
    function force(kmh) {
        if (kmh < 6) return 'nulle';
        if (kmh < 20) return 'faible';
        if (kmh < 39) return 'soutenue';
        return 'forte';
    }
    function arrondi(v) { return Math.round(v); }

    async function lire(lat, lon) {
        var cle = lat.toFixed(2) + ',' + lon.toFixed(2), maintenant = Date.now();
        if (memoire[cle] && maintenant - memoire[cle].t < 10 * 60 * 1000) return memoire[cle].d;
        var ctrl = new AbortController(), minuterie = setTimeout(function () { ctrl.abort(); }, 8000);
        var url = URL_API + '?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) +
            '&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
            '&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
            '&forecast_hours=7&wind_speed_unit=kmh&timezone=Europe%2FParis';
        try {
            var r = await fetch(url, { signal: ctrl.signal });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            var b = await r.json();
            if (!b.current) throw new Error('réponse inattendue');
            var h = b.hourly || {}, heures = (h.time || []).map(function (t, i) {
                return { heure: t.slice(11, 16), vent: arrondi(h.wind_speed_10m[i]), rafales: arrondi(h.wind_gusts_10m[i]), dir: direction(h.wind_direction_10m[i]).code, hum: arrondi(h.relative_humidity_2m[i]) };
            });
            var d = { vent: arrondi(b.current.wind_speed_10m), rafales: arrondi(b.current.wind_gusts_10m), dir: direction(b.current.wind_direction_10m),
                degres: arrondi(b.current.wind_direction_10m), temp: Math.round(b.current.temperature_2m * 10) / 10, hum: arrondi(b.current.relative_humidity_2m),
                pluie: b.current.precipitation, heure: (b.current.time || '').slice(11, 16), prochaines: heures.slice(1) };
            d.force = force(d.vent);
            memoire[cle] = { t: maintenant, d: d };
            return d;
        } finally { clearTimeout(minuterie); }
    }

    function fleche(deg) { return '<span class="met-fleche" style="transform:rotate(' + (deg + 180) + 'deg)" aria-hidden="true">↑</span>'; }

    function html(d) {
        var lignes = d.prochaines.map(function (h) {
            return '<tr><td>' + h.heure + '</td><td>' + h.dir + '</td><td>' + h.vent + ' km/h</td><td>' + h.rafales + '</td><td>' + h.hum + ' %</td></tr>';
        }).join('');
        return '<div class="met-vent">' + fleche(d.degres) + '<div><b>' + d.vent + ' km/h</b> de <b>' + d.dir.nom + '</b><br><small>rafales ' + d.rafales + ' km/h · force « ' + d.force + ' »</small></div></div>' +
            '<div class="met-grille"><div><b>' + d.temp + ' °C</b><small>température</small></div><div><b>' + d.hum + ' %</b><small>humidité</small></div><div><b>' + d.pluie + ' mm</b><small>pluie (h)</small></div></div>' +
            (lignes ? '<table class="met-table"><thead><tr><th>Heure</th><th>Vent de</th><th>Vitesse</th><th>Rafales</th><th>Hum.</th></tr></thead><tbody>' + lignes + '</tbody></table>' : '') +
            '<small class="met-note">Prévision modélisée à ' + d.heure + ' (Open-Meteo, modèles Météo-France), pas une mesure : à confirmer par l\'observation sur place.</small>';
    }

    // Version compacte pour « Se localiser » : une ligne lisible + pastilles, détail (prévision) en dessous
    var SEUIL_RAFALES = 40;
    function resume(d) {
        return '<div class="met-vent">' + fleche(d.degres) + '<div><b>Vent de ' + d.dir.nom + ' · ' + d.vent + ' km/h</b><br><small>rafales ' + d.rafales + ' km/h · force « ' + d.force + ' »</small></div></div>' +
            '<div class="met-pastilles"><span>' + d.temp + ' °C</span><span>HR ' + d.hum + ' %</span><span>' + d.pluie + ' mm</span></div>';
    }
    function detail(d) {
        var lignes = d.prochaines.map(function (h) {
            var fort = h.rafales > SEUIL_RAFALES;
            return '<tr><td>' + h.heure + '</td><td>' + h.dir + ' ' + h.vent + '</td><td' + (fort ? ' class="met-fort"' : '') + '>' + h.rafales + (fort ? ' ⚠' : '') + '</td><td>' + h.hum + ' %</td></tr>';
        }).join('');
        var alerte = d.prochaines.some(function (h) { return h.rafales > SEUIL_RAFALES; });
        return (lignes ? '<table class="met-table"><thead><tr><th>Heure</th><th>Vent (km/h)</th><th>Rafales</th><th>Hum.</th></tr></thead><tbody>' + lignes + '</tbody></table>' : '') +
            (alerte ? '<small class="met-note met-note-alerte">⚠ Rafales supérieures à ' + SEUIL_RAFALES + ' km/h prévues : risque de propagation.</small>' : '') +
            '<small class="met-note">Prévision modélisée à ' + d.heure + ' (Open-Meteo, modèles Météo-France), pas une mesure : à confirmer par l\'observation sur place.</small>';
    }

    return { lire: lire, direction: direction, force: force, html: html, resume: resume, detail: detail };
})();
