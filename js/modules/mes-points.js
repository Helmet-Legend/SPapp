/**
 * Vulcain - « Mes points » : positions enregistrées (nom libre, note, coordonnées GPS, carreau DFCI s'il existe).
 * Tout reste sur l'appareil (localStorage) : rien n'est envoyé. Fonctionne sans réseau, y compris en mer :
 * distance (milles nautiques et km) et cap vrai depuis la position de l'appareil, calculés sur le téléphone.
 * Export / import GPX (format standard des points de passage, lisible par la plupart des applications de navigation).
 */
var MesPoints = (function () {
    var CLE = 'vulcain-mes-points', MAX = 500;
    var R_NM = 3440.065, R_KM = 6371.0088;
    var points = null, position = null, enModif = false, ouvertId = null, minuterieSuppr = null;
    var $ = function (id) { return document.getElementById('mp-' + id); };
    var echapper = function (t) { var d = document.createElement('div'); d.textContent = String(t == null ? '' : t); return d.innerHTML; };
    var normaliser = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var rad = function (d) { return d * Math.PI / 180; };
    function notifier(t) { if (window.showNotification) showNotification(t); }

    // ---------- Stockage ----------
    function charger() {
        if (points) return points;
        try {
            var r = JSON.parse(localStorage.getItem(CLE) || '[]');
            points = Array.isArray(r) ? r.filter(function (p) { return p && isFinite(p.lat) && isFinite(p.lon); }) : [];
        } catch (e) { points = []; }
        return points;
    }
    function sauver() {
        try { localStorage.setItem(CLE, JSON.stringify(points)); } catch (e) { notifier('Enregistrement impossible : stockage de l\'appareil plein ou bloqué.'); }
        document.dispatchEvent(new CustomEvent('mes-points-change'));
    }
    function liste() { return charger().slice(); }
    function nombre() { return charger().length; }
    function nouvelId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function ajouter(p) {
        charger();
        if (points.length >= MAX) { notifier('Limite de ' + MAX + ' points atteinte : supprimez-en avant d\'en ajouter.'); return null; }
        var nouveau = { id: nouvelId(), nom: String(p.nom || '').trim().slice(0, 120) || nomParDefaut(), note: String(p.note || '').trim().slice(0, 500),
            lat: p.lat, lon: p.lon, t: p.t || Date.now() };
        points.unshift(nouveau);
        sauver();
        return nouveau;
    }
    function modifier(id, nom, note) {
        var p = charger().find(function (x) { return x.id === id; });
        if (!p) return;
        p.nom = String(nom || '').trim().slice(0, 120) || p.nom;
        p.note = String(note || '').trim().slice(0, 500);
        sauver();
    }
    function supprimer(id) { charger(); points = points.filter(function (x) { return x.id !== id; }); sauver(); }
    function nomParDefaut() {
        var d = new Date(), z = function (n) { return String(n).padStart(2, '0'); };
        return 'Point ' + z(d.getDate()) + '/' + z(d.getMonth() + 1) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
    }
    function dateCourte(t) {
        var d = new Date(t), z = function (n) { return String(n).padStart(2, '0'); };
        return z(d.getDate()) + '/' + z(d.getMonth() + 1) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
    }

    // ---------- Distance et cap (hors ligne) ----------
    // Distance orthodromique et cap vrai initial (par rapport au nord géographique) de a vers b
    function distanceCap(a, b) {
        var p1 = rad(a.lat), p2 = rad(b.lat), dp = p2 - p1, dl = rad(b.lon - a.lon);
        var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        var c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
        var y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
        return { nm: c * R_NM, km: c * R_KM, cap: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360 };
    }
    function texteDistance(d) {
        var nm = d.nm < 10 ? d.nm.toFixed(1).replace('.', ',') : String(Math.round(d.nm));
        var km = d.km < 1 ? Math.round(d.km * 1000) + ' m' : (d.km < 10 ? d.km.toFixed(1).replace('.', ',') : String(Math.round(d.km))) + ' km';
        var cap = String(Math.round(d.cap) % 360).padStart(3, '0') + '°';
        return { nm: d.nm < 0.05 ? '< 0,1 NM' : nm + ' NM', km: km, cap: 'cap ' + cap };
    }

    // ---------- GPX ----------
    function xml(t) { return String(t == null ? '' : t).replace(/[<>&"']/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]; }); }
    function gpx(liste) {
        var wpt = liste.map(function (p) {
            var d = (typeof Geo !== 'undefined') ? Geo.carreauDFCI(p.lat, p.lon) : null;
            var desc = [p.note, d ? 'DFCI ' + d.code : ''].filter(Boolean).join(' · ');
            return '  <wpt lat="' + p.lat.toFixed(6) + '" lon="' + p.lon.toFixed(6) + '"><time>' + new Date(p.t).toISOString() + '</time><name>' + xml(p.nom) + '</name>' + (desc ? '<desc>' + xml(desc) + '</desc>' : '') + '</wpt>';
        }).join('\n');
        return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Vulcain" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>Vulcain - Mes points</name><time>' + new Date().toISOString() + '</time></metadata>\n' + wpt + '\n</gpx>\n';
    }
    function lireGPX(texte) {
        var doc = new DOMParser().parseFromString(String(texte), 'application/xml');
        if (doc.querySelector('parsererror')) return null;
        return Array.prototype.map.call(doc.getElementsByTagName('wpt'), function (w) {
            var lat = parseFloat(w.getAttribute('lat')), lon = parseFloat(w.getAttribute('lon'));
            var sous = function (n) { var e = w.getElementsByTagName(n)[0]; return e ? e.textContent.trim() : ''; };
            var t = Date.parse(sous('time'));
            return { lat: lat, lon: lon, nom: sous('name'), note: sous('desc'), t: isFinite(t) ? t : Date.now() };
        }).filter(function (p) { return isFinite(p.lat) && isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180; });
    }
    function importer(texte) {
        var lus = lireGPX(texte);
        if (lus === null) return { ajoutes: 0, doublons: 0, erreur: 'Fichier GPX illisible.' };
        charger();
        var cle = function (p) { return p.lat.toFixed(6) + ',' + p.lon.toFixed(6) + ',' + p.nom; };
        var connus = {}; points.forEach(function (p) { connus[cle(p)] = true; });
        var ajoutes = 0, doublons = 0;
        lus.forEach(function (p) {
            if (connus[cle(p)]) { doublons++; return; }
            if (points.length >= MAX) return;
            points.push({ id: nouvelId(), nom: (p.nom || 'Point importé').slice(0, 120), note: p.note.slice(0, 500), lat: p.lat, lon: p.lon, t: p.t });
            connus[cle(p)] = true; ajoutes++;
        });
        points.sort(function (a, b) { return b.t - a.t; });
        sauver();
        return { ajoutes: ajoutes, doublons: doublons };
    }
    function exporter() {
        fermerMenu();
        var l = liste();
        if (!l.length) { etat('Aucun point à exporter.'); return; }
        var d = new Date(), z = function (n) { return String(n).padStart(2, '0'); };
        var nom = 'vulcain-mes-points-' + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '.gpx';
        var fichier = new File([gpx(l)], nom, { type: 'application/gpx+xml' });
        if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
            navigator.share({ files: [fichier], title: 'Mes points Vulcain' }).catch(function () {});
            return;
        }
        var url = URL.createObjectURL(fichier), a = document.createElement('a');
        a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        etat(l.length + ' point' + (l.length > 1 ? 's' : '') + ' exporté' + (l.length > 1 ? 's' : '') + ' (fichier ' + nom + ').');
    }
    function choisirFichier() { fermerMenu(); $('import').click(); }
    function lireFichier(f) {
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
            var b = importer(r.result);
            etat(b.erreur || (b.ajoutes + ' point' + (b.ajoutes > 1 ? 's' : '') + ' importé' + (b.ajoutes > 1 ? 's' : '') + (b.doublons ? ' · ' + b.doublons + ' déjà présent' + (b.doublons > 1 ? 's' : '') : '') + '.'));
            afficher();
        };
        r.readAsText(f);
        $('import').value = '';
    }

    // ---------- Position de l'appareil (sur demande) ----------
    function maPosition() {
        if (!navigator.geolocation) { etat('Géolocalisation indisponible sur cet appareil.'); return; }
        etat('Localisation en cours…');
        navigator.geolocation.getCurrentPosition(function (p) {
            position = { lat: p.coords.latitude, lon: p.coords.longitude };
            etat('Distances calculées depuis votre position.');
            afficher();
        }, function (e) {
            etat(e.code === 1 ? 'Localisation refusée : autorisez-la dans le navigateur.' : 'Position introuvable (pas de signal GPS).');
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    }

    // ---------- Affichage ----------
    function etat(t) { var e = $('etat'); if (e) e.textContent = t || ''; }
    function badge(p) {
        var d = Geo.carreauDFCI(p.lat, p.lon);
        return d ? '<span class="mp-pastille">DFCI ' + d.code + '</span>' : '<span class="mp-pastille mp-mer">🌊 Hors carroyage</span>';
    }
    function dist(p) { if (!position) return null; return texteDistance(distanceCap(position, p)); }

    function afficher() {
        var vide = $('vide'), zone = $('liste');
        var q = normaliser($('recherche').value.trim());
        var l = charger().filter(function (p) { return !q || normaliser(p.nom + ' ' + p.note + ' ' + ((Geo.carreauDFCI(p.lat, p.lon) || {}).code || '')).indexOf(q) >= 0; });
        if (position) l.sort(function (a, b) { return distanceCap(position, a).km - distanceCap(position, b).km; });
        $('compteur').textContent = String(nombre());
        vide.hidden = nombre() > 0;
        $('outils').hidden = nombre() === 0;
        zone.innerHTML = l.map(function (p) {
            var f = Geo.formats(p.lat, p.lon), d = dist(p);
            return '<button type="button" class="mp-ligne" data-id="' + p.id + '"><span class="mp-texte"><b>' + echapper(p.nom) + '</b><small>' + f.dmd + '</small><small>' + badge(p) + ' ' + dateCourte(p.t) + '</small></span>' +
                (d ? '<span class="mp-dist"><b>' + d.nm + '</b><small>' + d.cap + '</small></span>' : '<span class="mp-chev" aria-hidden="true">›</span>') + '</button>';
        }).join('') || (nombre() ? '<p class="mp-aucun">Aucun point ne correspond à « ' + echapper($('recherche').value.trim()) + ' ».</p>' : '');
        majFiche();
    }

    function majFiche() {
        var vueListe = $('vue-liste'), vueFiche = $('vue-fiche');
        var p = ouvertId && charger().find(function (x) { return x.id === ouvertId; });
        if (!p) { ouvertId = null; enModif = false; vueListe.hidden = false; vueFiche.hidden = true; return; }
        vueListe.hidden = true; vueFiche.hidden = false;
        var f = Geo.formats(p.lat, p.lon), c = Geo.carreauDFCI(p.lat, p.lon), d = dist(p);
        $('f-nom').textContent = p.nom;
        $('f-pastille').innerHTML = badge(p) + ' <small>enregistré le ' + dateCourte(p.t) + '</small>';
        $('f-dist').innerHTML = d ? '<small>Depuis votre position</small><b>' + d.nm + ' · ' + d.cap + '</b><small>' + d.km + ' · cap vrai (nord géographique)</small>'
            : '<button type="button" class="mp-secondaire" onclick="MesPoints.maPosition()">📍 Distance et cap depuis ma position</button>';
        $('f-note').textContent = p.note; $('f-note').hidden = !p.note;
        $('f-dfci').hidden = !c; if (c) $('f-dfci').textContent = c.code;
        $('f-formats').innerHTML = [['dmd', 'Degrés, minutes décimales · DMD'], ['dd', 'Degrés décimaux · DD'], ['dms', 'Degrés, minutes, secondes · DMS']].map(function (k) {
            var v = f[k[0]].split(', ');
            return '<div class="mp-format"><div><small>' + k[1] + '</small><code><i>LAT</i>' + v[0] + '<br><i>LON</i>' + v[1] + '</code></div><button type="button" data-copie="' + k[0] + '" aria-label="Copier ' + k[0].toUpperCase() + '"><span aria-hidden="true">⧉</span> Copier</button></div>';
        }).join('');
        $('modif').hidden = !enModif;
        if (enModif) { $('m-nom').value = p.nom; $('m-note').value = p.note; }
        $('btn-suppr').textContent = '🗑️ Supprimer';
        $('btn-suppr').classList.remove('mp-danger');
    }

    function ouvrirFiche(id) { ouvertId = id; enModif = false; majFiche(); window.scrollTo(0, 0); }
    function retourListe() { ouvertId = null; enModif = false; afficher(); }
    function texteCopie(p) {
        var f = Geo.formats(p.lat, p.lon), c = Geo.carreauDFCI(p.lat, p.lon);
        return [p.nom, p.note, c ? 'DFCI : ' + c.code : '', 'DMD : ' + f.dmd, 'DD : ' + f.dd, 'DMS : ' + f.dms, 'https://www.google.com/maps?q=' + p.lat.toFixed(6) + ',' + p.lon.toFixed(6)].filter(Boolean).join('\n');
    }
    function courant() { return charger().find(function (x) { return x.id === ouvertId; }); }
    function copierTout() { var p = courant(); if (p && navigator.clipboard) navigator.clipboard.writeText(texteCopie(p)).then(function () { notifier('Point copié !'); }); }
    function copierFormat(k) {
        var p = courant(); if (!p || !navigator.clipboard) return;
        var v = Geo.formats(p.lat, p.lon)[k];
        navigator.clipboard.writeText(v).then(function () { notifier('Copié : ' + v); });
    }
    function voirCarte() { var p = courant(); if (p && typeof CarteDFCI !== 'undefined') CarteDFCI.voir(p.lat, p.lon); }
    function ouvrirMaps() { var p = courant(); if (p) window.open('https://www.google.com/maps?q=' + p.lat.toFixed(6) + ',' + p.lon.toFixed(6), '_blank', 'noopener'); }
    function versLocalisation() {
        var p = courant(); if (!p) return;
        showModule('localisation');
        var g = document.getElementById('loc-saisie');
        if (g) { g.value = Geo.formatGPS(p.lat, p.lon); g.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    function modifierOuvrir() { enModif = true; majFiche(); }
    function modifierAnnuler() { enModif = false; majFiche(); }
    function modifierValider() {
        modifier(ouvertId, $('m-nom').value, $('m-note').value);
        enModif = false; afficher();
        notifier('Point modifié');
    }
    function supprimerCourant() {
        var b = $('btn-suppr');
        if (!b.classList.contains('mp-danger')) {
            b.classList.add('mp-danger'); b.textContent = '⚠ Appuyer pour confirmer';
            clearTimeout(minuterieSuppr);
            minuterieSuppr = setTimeout(function () { if (b.classList.contains('mp-danger')) { b.classList.remove('mp-danger'); b.textContent = '🗑️ Supprimer'; } }, 4000);
            return;
        }
        supprimer(ouvertId); ouvertId = null; afficher();
        notifier('Point supprimé');
    }

    // ---------- Feuille d'enregistrement (partagée : Se localiser, Carte DFCI) ----------
    var aEnregistrer = null;
    function demander(lat, lon, nomSuggere) {
        var f = document.getElementById('loc-feuille');
        if (!f) return;
        var c = Geo.carreauDFCI(lat, lon), fm = Geo.formats(lat, lon);
        aEnregistrer = { lat: lat, lon: lon };
        document.getElementById('loc-nom').value = nomSuggere || nomParDefaut();
        document.getElementById('loc-note').value = '';
        document.getElementById('loc-feuille-resume').textContent = fm.dmd + (c ? ' · ' + c.code : ' · hors carroyage DFCI');
        f.hidden = false;
        var n = document.getElementById('loc-nom'); n.focus(); n.select();
    }
    function fermerFeuille() { var f = document.getElementById('loc-feuille'); if (f) f.hidden = true; aEnregistrer = null; }
    function validerFeuille() {
        if (!aEnregistrer) return;
        var p = ajouter({ nom: document.getElementById('loc-nom').value, note: document.getElementById('loc-note').value, lat: aEnregistrer.lat, lon: aEnregistrer.lon });
        fermerFeuille();
        if (p) notifier('Point enregistré : ' + p.nom);
    }
    function ouvrirFicheDepuis(id) { ouvertId = id; enModif = false; showModule('mes-points'); }

    // ---------- Menu ⋯ et ouverture ----------
    function fermerMenu() { var m = $('menu'); if (m) { m.hidden = true; $('menu-btn').setAttribute('aria-expanded', 'false'); } }
    function menu() { var m = $('menu'), ouvert = m.hidden; m.hidden = !ouvert; $('menu-btn').setAttribute('aria-expanded', ouvert ? 'true' : 'false'); }
    function ouvrir() { ouvertId = null; enModif = false; showModule('mes-points'); }

    document.addEventListener('DOMContentLoaded', function () {
        var m = document.getElementById('mes-points');
        if (!m) return;
        new MutationObserver(function () { if (m.classList.contains('active')) { afficher(); } }).observe(m, { attributes: true, attributeFilter: ['class'] });
        $('recherche').addEventListener('input', afficher);
        $('import').addEventListener('change', function () { lireFichier(this.files && this.files[0]); });
        m.addEventListener('click', function (e) {
            var l = e.target.closest('.mp-ligne');
            if (l) { ouvrirFiche(l.dataset.id); return; }
            var cp = e.target.closest('[data-copie]');
            if (cp) { copierFormat(cp.dataset.copie); return; }
            if (!e.target.closest('.mp-entete')) fermerMenu();
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { fermerMenu(); fermerFeuille(); } });
        afficher();
    });

    return { liste: liste, nombre: nombre, ajouter: ajouter, supprimer: supprimer, modifier: modifier, distanceCap: distanceCap, texteDistance: texteDistance,
        gpx: gpx, lireGPX: lireGPX, importer: importer, exporter: exporter, choisirFichier: choisirFichier, maPosition: maPosition, ouvrir: ouvrir, menu: menu,
        retourListe: retourListe, copierTout: copierTout, voirCarte: voirCarte, ouvrirMaps: ouvrirMaps, versLocalisation: versLocalisation,
        demander: demander, fermerFeuille: fermerFeuille, validerFeuille: validerFeuille, ouvrirFiche: ouvrirFicheDepuis, texteCopie: texteCopie, modifierOuvrir: modifierOuvrir, modifierAnnuler: modifierAnnuler, modifierValider: modifierValider, supprimerCourant: supprimerCourant, nomParDefaut: nomParDefaut };
})();
