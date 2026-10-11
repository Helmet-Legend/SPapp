// Message d'ambiance FDF : formulaire « Je suis / Je vois / Je demande »
// Génère le message radio à transmettre au CODIS. Aucune donnée n'est envoyée ni enregistrée.
(function () {
    var carreauDFCI = Geo.carreauDFCI, dfciVersGPS = Geo.dfciVersGPS, lireDFCI = Geo.lireDFCI, formatDFCI = Geo.formatDFCI;
    var lireGPS = Geo.lireGPS, formatGPS = Geo.formatGPS, formats = Geo.formats;

    var $ = function (id) { return document.getElementById('amb-' + id); };
    var val = function (id) {
        var p = $(id + '-p'), e = $(id);
        if (p && p.value !== '__autre') return p.value;
        return e ? e.value.trim() : '';
    };
    var coche = function (nom) {
        return Array.prototype.map.call(document.querySelectorAll('#fdf-ambiance input[name="amb-' + nom + '"]:checked'), function (e) { return e.value; });
    };
    var liste = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1]; };
    var maj = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };
    var DIRECTIONS = { N: 'Nord', NE: 'Nord-Est', E: 'Est', SE: 'Sud-Est', S: 'Sud', SO: 'Sud-Ouest', O: 'Ouest', NO: 'Nord-Ouest' };
    var VEGETATION = { 'Broussailles': 'dans des broussailles', 'Feuillus': 'dans des feuillus', 'Résineux': 'dans des résineux', 'Pinède': 'en pinède',
        'Garrigue': 'en garrigue', 'Chaumes': 'dans des chaumes', 'Végétation mixte': 'en végétation mixte' };
    var PROPAGATION = { 'stationnaire': 'Le feu est stationnaire.', 'lente': 'La propagation est lente.', 'rapide': 'La propagation est rapide.',
        'très rapide, feu virulent': 'Le feu est virulent, avec une propagation très rapide.' };
    var RELIEF = { 'plat': 'Le relief est plat.', 'montant': 'Le relief est montant.', 'descendant': 'Le relief est descendant.',
        'en versant': 'Le feu est en versant.', 'en fond de vallon': 'Le feu est en fond de vallon.' };

    function messageAmbiance() {
        var je = [], vois = [], demande = [], p;
        var d = lireDFCI(val('dfci'));
        var pos = [];
        if (d) pos.push('au carreau DFCI ' + formatDFCI(d));
        var gMsg = lireGPS(val('gps'));
        if (val('gps')) pos.push('aux coordonnées GPS ' + (gMsg ? formatGPS(gMsg.lat, gMsg.lon) : val('gps')));
        if (val('commune')) pos.push('sur la commune de ' + val('commune'));
        if (val('lieudit')) pos.push('au lieu-dit ' + val('lieudit'));
        if (pos.length) je.push('Je suis ' + pos.join(', ') + '.');
        if (val('repere')) je.push(maj(val('repere')) + '.');

        var feu = val('feu'), veg = VEGETATION[val('vegetation')] || '';
        if (feu || veg) {
            var nom = feu ? (/^(un |une )?feu\b/i.test(feu) ? feu.replace(/^(un |une )/i, '') : 'feu ' + feu) : 'feu';
            vois.push('Je vois un ' + nom.charAt(0).toLowerCase() + nom.slice(1) + (veg ? ' ' + veg : '') + '.');
        }
        if (val('surf-brulee')) vois.push('La surface brûlée est estimée à ' + val('surf-brulee') + '.');
        if (PROPAGATION[val('propagation')]) vois.push(PROPAGATION[val('propagation')]);
        var dir = val('vent-dir') ? DIRECTIONS[val('vent-dir')] : '', fv = val('vent-force');
        if (fv === 'nulle') vois.push('Le vent est nul.');
        else if (fv === 'tourbillonnante') vois.push('Le vent est tourbillonnant' + (dir ? ', dominante ' + dir : '') + '.');
        else if (dir || fv) vois.push('Le vent est ' + (dir ? 'de ' + dir : '') + (dir && fv ? ', ' : '') + (fv ? 'de force ' + fv : '') + '.');
        if (RELIEF[val('relief')]) vois.push(RELIEF[val('relief')]);
        if (val('acces')) {
            var pi = val('piste');
            vois.push(val('acces') + (pi ? ' par ' + (/^(la|le|les|l'|une?)\s/i.test(pi) ? pi : (/^piste/i.test(pi) ? 'la ' + pi : 'la piste ' + pi)) : '') + '.');
        } else if (val('piste')) vois.push('Accès par ' + val('piste') + '.');
        if (val('surf-menacee')) vois.push('La surface menacée est estimée à ' + val('surf-menacee') + '.');
        if (val('front')) vois.push('Le front de feu mesure ' + val('front') + '.');
        var sens = coche('sensible');
        if (val('sensible-autre')) sens.push(val('sensible-autre'));
        if (sens.length) vois.push('Point sensible : ' + liste(sens) + (val('sensible-dist') ? ', à ' + val('sensible-dist') : '') + '.');

        var NOMS = { 'terrestre': 'des renforts terrestres', 'aérien': 'des moyens aériens', 'commandement': 'un commandement' };
        demande = coche('demande').map(function (c) { return NOMS[c]; });
        var lignes = ['CODIS ' + (val('codis') || '…') + ' de ' + (val('indicatif') || 'CCF …') + ', pour un premier message d\'ambiance.', ''];
        lignes.push(je.join(' ') || 'Je suis …');
        lignes.push(vois.join(' ') || 'Je vois …');
        var dem = demande.length ? 'Je demande ' + liste(demande) + '.' : 'Je demande …';
        if (val('demande-autre')) dem += ' Autre : ' + val('demande-autre') + '.';
        lignes.push(dem);
        lignes.push('Je poursuis la reconnaissance.');
        lignes.push('Je prends l\'appellation COS ' + (val('commune') || '…') + '.');
        lignes.push('Fin de message.');
        return lignes.join('\n');
    }

    window.majAmbianceFDF = function () {
        var s = $('apercu'); if (s) s.textContent = messageAmbiance();
    };

    // Affiche les trois écritures du point courant et active « Ouvrir sur la carte »
    function majFormats() {
        var zone = $('formats'), carte = $('carte'), g = lireGPS(val('gps'));
        if (zone) zone.innerHTML = g ? ['dd', 'dms', 'dmd'].map(function (k) { return '<div><b>' + k.toUpperCase() + '</b> ' + formats(g.lat, g.lon)[k] + '</div>'; }).join('') : '';
        if (zone) zone.hidden = !g;
        if (carte) carte.hidden = !g;
    }

    window.voirCarteDFCIAmbiance = function () {
        var g = lireGPS(val('gps'));
        if (g && typeof CarteDFCI !== 'undefined') CarteDFCI.voir(g.lat, g.lon);
    };

    window.ouvrirCarteAmbianceFDF = function () {
        var g = lireGPS(val('gps'));
        if (!g) return;
        window.open('https://www.google.com/maps?q=' + g.lat.toFixed(6) + ',' + g.lon.toFixed(6), '_blank', 'noopener');
    };

    function etat(texte) { var e = $('geo-etat'); if (e) e.textContent = texte; }

    // DFCI saisi à la main -> GPS
    function depuisDFCI() {
        var d = lireDFCI(val('dfci'));
        if (!d) { etat(val('dfci') ? 'Carreau DFCI incomplet ou invalide (exemple : GD82E1.4).' : ''); return; }
        var g = dfciVersGPS(d);
        $('gps').value = formatGPS(g.lat, g.lon);
        majFormats();
        etat('GPS déduit du carreau ' + formatDFCI(d) + ' (' + (d.zone ? 'centre de la zone ' + d.zone : 'centre du carreau de 2 km') + ').');
    }

    // GPS saisi à la main -> DFCI
    function depuisGPS() {
        var g = lireGPS(val('gps'));
        if (!g) { etat(val('gps') ? 'Coordonnées GPS non reconnues (exemples : 43.39480 N, 3.42654 E ou 43°23\'41" N 3°25\'36" E).' : ''); majFormats(); return; }
        majFormats();
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
            majFormats();
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
            if (e.hasAttribute && e.hasAttribute('data-preset')) $(e.getAttribute('data-preset')).hidden = true;
        });
        etat('');
        majFormats();
        majAmbianceFDF();
    };

    document.addEventListener('DOMContentLoaded', function () {
        var m = document.getElementById('fdf-ambiance');
        if (!m) return;
        $('dfci').addEventListener('input', depuisDFCI);
        $('gps').addEventListener('input', depuisGPS);
        m.addEventListener('input', majAmbianceFDF);
        m.addEventListener('change', function (e) {
            var id = e.target.getAttribute && e.target.getAttribute('data-preset');
            if (id) { var champ = $(id); champ.hidden = e.target.value !== '__autre'; if (champ.hidden) champ.value = ''; }
            majAmbianceFDF();
        });
        majAmbianceFDF();
    });
})();
