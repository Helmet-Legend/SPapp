/**
 * Vulcain - Boussole : cap en degrés, nord vrai (par défaut) ou magnétique, hors ligne.
 * Capteurs : iOS = deviceorientation (webkitCompassHeading, autorisation demandée par un appui) ;
 *            Android = deviceorientationabsolute (alpha/beta/gamma, compensé de l'inclinaison).
 * Fiabilité affichée en permanence : inclinaison, perturbation magnétique (si le magnétomètre est lisible),
 * précision du capteur (iOS) ou stabilité du cap (Android). Déclinaison : js/modules/declinaison.js (WMM 2025).
 */
var Boussole = (function () {
    var CLE_NORD = 'vulcain-boussole-nord', CLE_POS = 'vulcain-boussole-pos';
    var DIRECTIONS = ['NORD', 'NORD-NORD-EST', 'NORD-EST', 'EST-NORD-EST', 'EST', 'EST-SUD-EST', 'SUD-EST', 'SUD-SUD-EST',
        'SUD', 'SUD-SUD-OUEST', 'SUD-OUEST', 'OUEST-SUD-OUEST', 'OUEST', 'OUEST-NORD-OUEST', 'NORD-OUEST', 'NORD-NORD-OUEST'];
    var $ = function (id) { return document.getElementById('bou-' + id); };

    var actif = false, source = null, nordVrai = true, position = null, decl = null;
    var cap = null;            // cap lissé, nord magnétique (0-360)
    var recents = [];          // derniers caps bruts, pour juger la stabilité
    var inclin = null;         // inclinaison max (°)
    var precisionIOS = null;   // webkitCompassAccuracy (°)
    var champ = null;          // intensité du champ magnétique (µT), si mesurable
    var fige = null, rotation = 0, magneto = null, verrou = null, derniereMaj = 0;

    function norm(a) { return ((a % 360) + 360) % 360; }
    function ecart(a, b) { return ((a - b + 540) % 360) - 180; }
    function notifier(t) { if (window.showNotification) showNotification(t); }
    function nomDirection(c) { return DIRECTIONS[Math.round(norm(c) / 22.5) % 16]; }

    // ---------- Stockage (facultatif) ----------
    function lireNord() { try { return localStorage.getItem(CLE_NORD) !== 'magnetique'; } catch (e) { return true; } }
    function ecrireNord(v) { try { localStorage.setItem(CLE_NORD, v ? 'vrai' : 'magnetique'); } catch (e) { /* ignoré */ } }
    function lirePosition() { try { var p = JSON.parse(localStorage.getItem(CLE_POS)); return p && isFinite(p.lat) && isFinite(p.lon) ? p : null; } catch (e) { return null; } }
    function ecrirePosition(p) { try { localStorage.setItem(CLE_POS, JSON.stringify(p)); } catch (e) { /* ignoré */ } }

    // ---------- Cap lissé (moyenne circulaire) ----------
    function lisser(brut) {
        if (cap === null) { cap = brut; } else {
            var k = 0.25, a = norm(cap) * Math.PI / 180, b = brut * Math.PI / 180;
            cap = norm(Math.atan2((1 - k) * Math.sin(a) + k * Math.sin(b), (1 - k) * Math.cos(a) + k * Math.cos(b)) * 180 / Math.PI);
        }
        recents.push(brut); if (recents.length > 20) recents.shift();
    }
    function instabilite() {
        if (recents.length < 8 || cap === null) return null;
        var s = 0; recents.forEach(function (r) { var e = ecart(r, cap); s += e * e; });
        return Math.sqrt(s / recents.length);
    }

    // ---------- Mesure : point d'entrée unique (capteurs et tests) ----------
    // { cap: nord magnétique en °, inclinaison: °, precision: ° (iOS), champ: µT }
    function mesure(m) {
        if (!m || typeof m.cap !== 'number' || !isFinite(m.cap)) return;
        if (source === null) source = 'capteur';
        lisser(norm(m.cap));
        if (typeof m.inclinaison === 'number') inclin = m.inclinaison;
        if (typeof m.precision === 'number') precisionIOS = m.precision;
        if (typeof m.champ === 'number') champ = m.champ;
        afficher();
    }
    function capAffiche() {
        if (cap === null) return null;
        return norm(cap + (nordVrai && decl !== null ? decl : 0));
    }

    // ---------- Capteurs ----------
    // Cap du téléphone à partir des angles W3C (alpha = rotation autour de la verticale, beta = avant/arrière, gamma = gauche/droite).
    // À plat on suit le haut du téléphone ; tenu debout, la direction visée par le dos (comme avec l'appareil photo).
    function capDepuisAngles(alpha, beta, gamma) {
        var x = beta * Math.PI / 180, y = gamma * Math.PI / 180, z = alpha * Math.PI / 180;
        var cY = Math.cos(y), sY = Math.sin(y), cZ = Math.cos(z), sZ = Math.sin(z), sX = Math.sin(x), cX = Math.cos(x);
        var hx = -sZ * cX, hy = cZ * cX;                       // haut du téléphone (est, nord)
        var dx = -cZ * sY - sZ * sX * cY, dy = -sZ * sY + cZ * sX * cY; // dos du téléphone
        var v = Math.hypot(hx, hy) >= Math.hypot(dx, dy) ? [hx, hy] : [dx, dy];
        return norm(Math.atan2(v[0], v[1]) * 180 / Math.PI);
    }
    function surOrientation(e) {
        var maintenant = Date.now();
        if (maintenant - derniereMaj < 60) return; // ~16 mesures par seconde suffisent
        derniereMaj = maintenant;
        var inc = (typeof e.beta === 'number' && typeof e.gamma === 'number') ? Math.max(Math.abs(e.beta), Math.abs(e.gamma)) : undefined;
        if (typeof e.webkitCompassHeading === 'number') {
            source = 'ios';
            mesure({ cap: e.webkitCompassHeading, inclinaison: inc, precision: e.webkitCompassAccuracy < 0 ? 999 : e.webkitCompassAccuracy });
        } else if (e.type === 'deviceorientationabsolute' || e.absolute === true) {
            if (typeof e.alpha !== 'number') return;
            source = 'android';
            mesure({ cap: capDepuisAngles(e.alpha, e.beta || 0, e.gamma || 0), inclinaison: inc });
        }
    }
    function demanderAutorisation() {
        var D = window.DeviceOrientationEvent;
        if (D && typeof D.requestPermission === 'function') {
            return D.requestPermission().then(function (r) { return r === 'granted'; }, function () { return false; });
        }
        return Promise.resolve(true);
    }
    function demarrerMagneto() {
        try {
            if (typeof window.Magnetometer !== 'function' || magneto) return;
            magneto = new window.Magnetometer({ frequency: 5 });
            magneto.addEventListener('reading', function () {
                champ = Math.sqrt(magneto.x * magneto.x + magneto.y * magneto.y + magneto.z * magneto.z);
            });
            magneto.addEventListener('error', function () { try { magneto.stop(); } catch (e) { /* ignoré */ } magneto = null; });
            magneto.start();
        } catch (e) { magneto = null; }
    }
    function arreterMagneto() { try { if (magneto) magneto.stop(); } catch (e) { /* ignoré */ } magneto = null; champ = null; }
    function garderEcranAllume() {
        try { if (navigator.wakeLock && !verrou) navigator.wakeLock.request('screen').then(function (v) { verrou = v; v.addEventListener('release', function () { verrou = null; }); }, function () { /* refusé */ }); } catch (e) { /* ignoré */ }
    }
    function libererEcran() { try { if (verrou) verrou.release(); } catch (e) { /* ignoré */ } verrou = null; }

    function demarrer() {
        if (actif) return;
        actif = true;
        window.addEventListener('deviceorientationabsolute', surOrientation, true);
        window.addEventListener('deviceorientation', surOrientation, true);
        demarrerMagneto();
        garderEcranAllume();
        chercherPosition();
        afficher();
    }
    function arreter() {
        if (!actif) return;
        actif = false;
        window.removeEventListener('deviceorientationabsolute', surOrientation, true);
        window.removeEventListener('deviceorientation', surOrientation, true);
        arreterMagneto();
        libererEcran();
    }
    function activer() {
        demanderAutorisation().then(function (ok) {
            if (!ok) { afficher('refus'); return; }
            demarrer();
        });
    }

    // ---------- Position et déclinaison ----------
    function majDeclinaison() {
        decl = position && typeof Declinaison !== 'undefined' ? Declinaison.calculer(position.lat, position.lon, new Date()) : null;
        afficher();
    }
    function chercherPosition() {
        position = lirePosition();
        majDeclinaison();
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(function (p) {
            position = { lat: p.coords.latitude, lon: p.coords.longitude };
            ecrirePosition(position);
            majDeclinaison();
        }, function () { /* position mémorisée ou nord magnétique */ }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    }

    // ---------- Fiabilité ----------
    function indicateurs() {
        var r = [];
        if (source === null) {
            r.push(['neutre', 'En attente du capteur', 'Si rien ne bouge, le téléphone n\'a pas de capteur de cap lisible ici.']);
            return r;
        }
        if (inclin !== null && inclin > 30) r.push(['mauvais', 'Tenez le téléphone à plat', 'Incliné de ' + Math.round(inclin) + '°, le cap peut dériver.']);
        else r.push(['bon', 'Téléphone à plat', 'Position correcte pour une lecture fiable.']);
        if (champ === null) r.push(['neutre', 'Champ magnétique non mesurable', 'Éloignez-vous des véhicules, du métal et des câbles.']);
        else if (champ < 20 || champ > 70) r.push(['mauvais', 'Perturbation magnétique', 'Champ de ' + Math.round(champ) + ' µT (normal : 25 à 65). Éloignez-vous du métal.']);
        else r.push(['bon', 'Champ magnétique normal', Math.round(champ) + ' µT : aucune perturbation détectée.']);
        var inst = instabilite();
        if (source === 'ios' && precisionIOS !== null) {
            if (precisionIOS > 25) r.push(['mauvais', 'Précision faible (± ' + (precisionIOS > 180 ? '?' : Math.round(precisionIOS)) + '°)', 'Étalonnez : dessinez un 8 avec le téléphone.']);
            else if (precisionIOS > 10) r.push(['moyen', 'Précision moyenne (± ' + Math.round(precisionIOS) + '°)', 'Dessinez un 8 avec le téléphone pour étalonner.']);
            else r.push(['bon', 'Précision bonne (± ' + Math.round(Math.max(precisionIOS, 1)) + '°)', 'Capteur étalonné.']);
        } else if (inst !== null) {
            if (inst > 8) r.push(['mauvais', 'Cap instable (± ' + Math.round(inst) + '°)', 'Étalonnez : dessinez un 8 avec le téléphone.']);
            else if (inst > 3) r.push(['moyen', 'Cap un peu instable (± ' + Math.round(inst) + '°)', 'Tenez le téléphone immobile.']);
            else r.push(['bon', 'Cap stable', 'Mesure régulière.']);
        }
        if (nordVrai && decl === null) r.push(['moyen', 'Position inconnue : nord magnétique affiché', 'Activez la localisation pour obtenir le nord vrai.']);
        return r;
    }
    function niveau() {
        var i = indicateurs().map(function (x) { return x[0]; });
        return i.indexOf('mauvais') >= 0 ? 'mauvais' : i.indexOf('moyen') >= 0 ? 'moyen' : 'bon';
    }

    // ---------- Affichage ----------
    function echapper(t) { var d = document.createElement('div'); d.textContent = String(t); return d.innerHTML; }
    function afficher(erreur) {
        var racine = document.getElementById('boussole');
        if (!racine) return;
        var c = capAffiche(), aff = fige !== null ? fige : c;
        var nordReel = nordVrai && decl !== null;
        $('nord-vrai').setAttribute('aria-pressed', nordVrai ? 'true' : 'false');
        $('nord-mag').setAttribute('aria-pressed', nordVrai ? 'false' : 'true');
        $('cap').innerHTML = (aff === null ? '--' : Math.round(aff) % 360) + '<small>°</small>';
        $('dir').textContent = aff === null ? '' : nomDirection(aff);
        $('ref').textContent = nordReel ? 'Nord vrai (carte)' : 'Nord magnétique';
        if (aff !== null) {
            var d = ecart(-aff, rotation); rotation += d;
            $('cadran').style.transform = 'rotate(' + rotation + 'deg)';
        }
        $('decl').textContent = decl === null
            ? (position ? 'Déclinaison indisponible pour cette position.' : 'Déclinaison inconnue : position non disponible.')
            : 'Déclinaison à votre position : ' + (decl >= 0 ? '+' : '−') + Math.abs(decl).toFixed(1).replace('.', ',') + '° (modèle WMM 2025, calculé hors ligne). Nord vrai = nord magnétique ' + (decl >= 0 ? '+ ' : '− ') + Math.abs(decl).toFixed(1).replace('.', ',') + '°.'
              + (typeof Declinaison !== 'undefined' && Declinaison.perime(new Date()) ? ' Modèle à renouveler.' : '');
        var ind = indicateurs();
        $('indicateurs').innerHTML = ind.map(function (x) {
            return '<div class="bou-ind bou-' + x[0] + '"><i aria-hidden="true"></i><div><b>' + echapper(x[1]) + '</b><span>' + echapper(x[2]) + '</span></div></div>';
        }).join('');
        racine.dataset.niveau = source === null ? 'attente' : niveau();
        $('activer').hidden = actif && !erreur;
        $('refus').hidden = erreur !== 'refus';
        $('figer').textContent = fige !== null ? 'Reprendre' : 'Figer le cap';
        $('figer').disabled = capAffiche() === null && fige === null;
        $('releve').hidden = fige === null;
        if (fige !== null) {
            $('releve-cap').textContent = Math.round(fige) % 360 + '° ' + nomDirection(fige).toLowerCase();
            $('releve-retour').textContent = Math.round(norm(fige + 180)) % 360 + '°';
            $('releve-ref').textContent = $('ref').textContent.toLowerCase();
            $('releve-point').hidden = !position;
        }
        $('etalon').hidden = !etalonnageOuvert;
    }
    var etalonnageOuvert = false;

    // ---------- Actions ----------
    function choisirNord(vrai) { nordVrai = vrai; ecrireNord(vrai); if (fige !== null) fige = null; afficher(); }
    function figer() {
        if (fige !== null) { fige = null; afficher(); return; }
        var c = capAffiche(); if (c === null) return;
        fige = c; afficher();
    }
    function texteReleve() {
        return 'Cap ' + Math.round(fige) % 360 + '° (' + (nordVrai && decl !== null ? 'nord vrai' : 'nord magnétique') + '), contre-azimut ' + Math.round(norm(fige + 180)) % 360 + '°';
    }
    function copier() {
        if (fige === null) return;
        var t = texteReleve();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { notifier('Cap copié'); }, function () { notifier(t); });
        else notifier(t);
    }
    function enregistrerPoint() {
        if (fige === null || !position || typeof MesPoints === 'undefined') return;
        var p = MesPoints.ajouter({ nom: '', note: texteReleve(), lat: position.lat, lon: position.lon });
        if (p) notifier('Position enregistrée : ' + p.nom);
    }
    function etalonner() { etalonnageOuvert = !etalonnageOuvert; afficher(); }
    function ouvrir() { showModule('boussole'); }

    document.addEventListener('DOMContentLoaded', function () {
        var m = document.getElementById('boussole');
        if (!m) return;
        nordVrai = lireNord();
        var g = '';
        for (var a = 0; a < 360; a += 5) {
            var l = a % 90 === 0 ? 0 : a % 30 === 0 ? 14 : 7;
            g += '<line x1="0" y1="-144" x2="0" y2="' + (-136 + l) + '" transform="rotate(' + a + ')" class="bou-grad' + (a % 30 === 0 ? ' bou-grad-m' : '') + '"/>';
        }
        $('graduations').innerHTML = g;
        var besoinAppui = function () { var D = window.DeviceOrientationEvent; return !!(D && typeof D.requestPermission === 'function'); };
        new MutationObserver(function () {
            if (m.classList.contains('active')) { if (!besoinAppui()) demarrer(); afficher(); }
            else arreter();
        }).observe(m, { attributes: true, attributeFilter: ['class'] });
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) { libererEcran(); } else if (actif) { garderEcranAllume(); }
        });
        afficher();
    });

    return { activer: activer, choisirNord: choisirNord, figer: figer, copier: copier, enregistrerPoint: enregistrerPoint, etalonner: etalonner,
        ouvrir: ouvrir, mesure: mesure, definirPosition: function (p) { position = p; majDeclinaison(); }, capAffiche: capAffiche, capDepuisAngles: capDepuisAngles,
        declinaison: function () { return decl; }, demarrer: demarrer, arreter: arreter };
})();
