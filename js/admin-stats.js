/**
 * Vulcain - Tableau de bord administrateur
 * Usage (ouvertures, IA, PDF), profil des utilisateurs, contenu consulté, recherches, notifications.
 * Serveur : api/admin-stats.js (lecture, clé admin). Aucune donnée personnelle : que des totaux.
 * Réutilise la clé administrateur déjà mémorisée pour les notifications push.
 */
var AdminStats = (function () {
    var CLE_ADMIN = 'vulcain-push-admin';
    var CARTES = [
        { type: 'ouverture', titre: "Ouvertures de l'app", icone: '📲', couleur: 'bleu' },
        { type: 'generation', titre: 'Générations IA réussies', icone: '🤖', couleur: 'orange' },
        { type: 'pdf', titre: 'Téléchargements PDF', icone: '📥', couleur: 'aqua' }
    ];

    function lire(cle, defaut) {
        try { var v = localStorage.getItem(cle); return v === null ? defaut : JSON.parse(v); } catch (e) { return defaut; }
    }

    function preparerAffichage() {
        var cle = document.getElementById('statsCleAdmin');
        if (cle && !cle.value) cle.value = lire(CLE_ADMIN, '');
    }

    function echapper(s) {
        var d = document.createElement('div');
        d.textContent = String(s === undefined || s === null ? '' : s);
        return d.innerHTML;
    }
    function nombre(n) { return Number(n || 0).toLocaleString('fr-FR'); }
    function pourcent(a, total) { return total ? Math.round((a / total) * 100) + ' %' : '–'; }
    function somme(serie, de, a) { return serie.slice(de, a).reduce(function (s, p) { return s + p.total; }, 0); }

    function jourCourt(iso) {
        var d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
    function jourLong(iso) {
        var d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // ---------- Briques d'affichage ----------
    function carteHTML(def, donnees) {
        var serie = (donnees && donnees.serie) || [];
        var total = (donnees && donnees.total) || 0;
        var max = Math.max(1, Math.max.apply(null, serie.map(function (p) { return p.total; }).concat([1])));
        var largeurBarre = 100 / Math.max(1, serie.length);
        var barres = serie.map(function (p, i) {
            var hauteur = Math.max(2, Math.round((p.total / max) * 60));
            return '<rect class="ia-dash-barre ia-dash-' + def.couleur + '" ' +
                'x="' + (i * largeurBarre).toFixed(2) + '%" width="' + (largeurBarre * 0.7).toFixed(2) + '%" ' +
                'y="' + (64 - hauteur) + '" height="' + hauteur + '" rx="2">' +
                '<title>' + jourCourt(p.jour) + ' : ' + p.total + '</title></rect>';
        }).join('');
        return '<div class="ia-dash-carte">' +
            '<div class="ia-dash-tete"><span class="ia-dash-icone">' + def.icone + '</span><span>' + def.titre + '</span></div>' +
            '<div class="ia-dash-total">' + nombre(total) + '<small> sur 30 jours</small></div>' +
            '<svg class="ia-dash-graphe" viewBox="0 0 100 64" preserveAspectRatio="none" role="img" aria-label="' + def.titre + ', 30 derniers jours">' + barres + '</svg>' +
            '</div>';
    }

    function section(titre, icone, contenu, large) {
        return '<div class="ia-dash-carte' + (large ? ' ia-dash-carte-large' : '') + '">' +
            '<div class="ia-dash-tete"><span class="ia-dash-icone">' + icone + '</span><span>' + titre + '</span></div>' + contenu + '</div>';
    }

    function tuile(valeur, libelle, detail) {
        return '<div class="adm-tuile"><b>' + valeur + '</b><span>' + libelle + '</span>' + (detail ? '<small>' + detail + '</small>' : '') + '</div>';
    }

    // Liste de barres horizontales : [{ libelle, valeur }]
    function barresHTML(items, total, vide) {
        if (!items.length) return '<p class="adm-vide">' + (vide || 'Pas encore de donnée.') + '</p>';
        var max = Math.max.apply(null, items.map(function (i) { return i.valeur; }).concat([1]));
        return '<div class="adm-barres">' + items.map(function (i) {
            return '<div class="adm-barre-ligne"><span class="adm-barre-lib">' + echapper(i.libelle) + '</span>' +
                '<span class="adm-barre-piste"><i style="width:' + Math.max(3, Math.round(i.valeur / max * 100)) + '%"></i></span>' +
                '<span class="adm-barre-val">' + nombre(i.valeur) + (total ? ' <small>' + pourcent(i.valeur, total) + '</small>' : '') + '</span></div>';
        }).join('') + '</div>';
    }

    function repartition(dict, ordre, noms) {
        var total = 0;
        var items = Object.keys(dict || {}).map(function (k) { total += dict[k]; return { cle: k, libelle: (noms && noms[k]) || k, valeur: dict[k] }; });
        items.sort(function (a, b) { return ordre ? ordre.indexOf(a.cle) - ordre.indexOf(b.cle) : b.valeur - a.valeur; });
        return { items: items, total: total };
    }

    // ---------- Contenu : titres et domaines depuis le registre ----------
    function titreFiche(id) {
        var module = document.getElementById(id);
        var titre = module && module.querySelector('h2');
        return titre ? titre.textContent.trim() : id;
    }
    function pages() { return (typeof Navigation !== 'undefined' && Navigation.pages) ? Navigation.pages() : []; }
    function domaines() { return (typeof Navigation !== 'undefined' && Navigation.domaines) ? Navigation.domaines() : []; }
    function nomDomaine(id) {
        var d = domaines().filter(function (x) { return x.id === id; })[0];
        return d ? d.titre : id;
    }

    function tuilesUsage(b) {
        var ouv = (b.stats.ouverture && b.stats.ouverture.serie) || [];
        var n = ouv.length;
        var aujourdhui = n ? ouv[n - 1].total : 0;
        var s7 = somme(ouv, n - 7, n), s7p = somme(ouv, n - 14, n - 7);
        var tendance = s7p ? Math.round((s7 - s7p) / s7p * 100) : null;
        var flecheT = tendance === null ? '' : (tendance >= 0 ? '▲ +' : '▼ ') + tendance + ' % vs 7 j précédents';
        var total = (b.stats.ouverture && b.stats.ouverture.total) || 0;
        var actifs = ouv.filter(function (p) { return p.total > 0; }).length;
        var meilleur = ouv.reduce(function (m, p) { return p.total > m.total ? p : m; }, { total: 0, jour: '' });
        var pdf = (b.stats.pdf && b.stats.pdf.total) || 0, ia = (b.stats.generation && b.stats.generation.total) || 0;
        var vis = (b.profil && b.profil.visiteur) || {};
        var tuiles = [
            tuile(nombre(aujourdhui), "Aujourd'hui", 'ouvertures de l\u2019app'),
            tuile(nombre(s7), '7 derniers jours', flecheT),
            tuile(nombre(Math.round(total / Math.max(1, n) * 10) / 10), 'Moyenne par jour', 'sur ' + n + ' jours'),
            tuile(meilleur.total ? nombre(meilleur.total) : '–', 'Meilleur jour', meilleur.jour ? jourLong(meilleur.jour) : ''),
            tuile(actifs + '/' + n, "Jours d'activité"),
            tuile(nombre(vis.nouveau || 0), 'Nouveaux visiteurs', (vis.retour || 0) + ' déjà venus'),
            tuile(total ? (Math.round(pdf / total * 1000) / 10).toLocaleString('fr-FR') : '–', 'PDF pour 100 ouvertures'),
            tuile(total ? (Math.round(ia / total * 1000) / 10).toLocaleString('fr-FR') : '–', 'Générations IA pour 100 ouvertures')
        ];
        return '<div class="adm-tuiles">' + tuiles.join('') + '</div>';
    }

    function blocProfil(b) {
        var p = b.profil || {};
        var mode = repartition(p.mode, ['application', 'navigateur'], { application: 'App installée', navigateur: 'Navigateur' });
        var theme = repartition(p.theme, ['sombre', 'clair'], { sombre: 'Thème sombre', clair: 'Thème clair' });
        var versions = repartition(p.version).items.sort(function (a, c) { return c.valeur - a.valeur; }).slice(0, 6);
        var versionsTotal = versions.reduce(function (s, i) { return s + i.valeur; }, 0);
        var heures = (p.heure || []).map(function (v, h) { return { libelle: (h < 10 ? '0' : '') + h + ' h', valeur: v }; });
        var maxH = Math.max.apply(null, heures.map(function (h) { return h.valeur; }).concat([1]));
        var colonnes = heures.map(function (h, i) {
            var haut = Math.max(2, Math.round(h.valeur / maxH * 60));
            return '<rect class="ia-dash-barre ia-dash-bleu" x="' + (i * 4.1667).toFixed(2) + '%" width="3.1%" y="' + (64 - haut) + '" height="' + haut + '" rx="2"><title>' + h.libelle + ' : ' + h.valeur + '</title></rect>';
        }).join('');
        var pic = heures.reduce(function (m, h) { return h.valeur > m.valeur ? h : m; }, { valeur: 0, libelle: '–' });
        return section('Mode d’utilisation', '📱', barresHTML(mode.items, mode.total)) +
            section('Thème choisi', '🌗', barresHTML(theme.items, theme.total)) +
            section('Versions utilisées', '🏷️', barresHTML(versions, versionsTotal)) +
            section('Heures d’ouverture (heure de Paris)', '🕒',
                '<div class="ia-dash-total">' + (pic.valeur ? pic.libelle : '–') + '<small> heure la plus active</small></div>' +
                '<svg class="ia-dash-graphe" viewBox="0 0 100 64" preserveAspectRatio="none" role="img" aria-label="Ouvertures par heure">' + colonnes + '</svg>' +
                '<div class="adm-axe"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div>', true);
    }

    function blocContenu(b) {
        var vues = b.vues || {};
        var liste = pages().filter(function (p) { return p.type !== 'menu'; });
        var totalVues = Object.keys(vues).reduce(function (s, k) { return s + vues[k]; }, 0);
        var top = (b.topFiches || []).slice(0, 20).map(function (f, i) {
            return '<div class="ia-dash-fiche-ligne"><span class="ia-dash-fiche-rang">' + (i + 1) + '</span>' +
                '<span class="ia-dash-fiche-titre">' + echapper(titreFiche(f.fiche)) + '</span>' +
                '<span class="ia-dash-fiche-vues">' + nombre(f.vues) + '</span></div>';
        }).join('');
        var parDomaine = {};
        liste.forEach(function (p) { if (vues[p.id]) parDomaine[p.domaine] = (parDomaine[p.domaine] || 0) + vues[p.id]; });
        var dom = Object.keys(parDomaine).map(function (k) { return { libelle: nomDomaine(k), valeur: parDomaine[k] }; })
            .sort(function (a, c) { return c.valeur - a.valeur; });
        var jamais = liste.filter(function (p) { return !vues[p.id]; });
        var jamaisHTML = jamais.length
            ? '<details class="adm-details"><summary>' + jamais.length + ' fiche' + (jamais.length > 1 ? 's' : '') + ' sur ' + liste.length + ' jamais consultée' + (jamais.length > 1 ? 's' : '') + '</summary>' +
              '<ul class="adm-liste">' + jamais.map(function (p) { return '<li>' + echapper(p.titre || p.theme || p.id) + ' <small>· ' + echapper(nomDomaine(p.domaine)) + '</small></li>'; }).join('') + '</ul></details>'
            : '<p class="adm-vide">Toutes les fiches ont été consultées au moins une fois.</p>';
        return section('Fiches les plus consultées', '⭐', top ? '<div class="ia-dash-fiches-liste">' + top + '</div>' : '<p class="adm-vide">Pas encore de donnée.</p>', true) +
            section('Vues par domaine', '🗂️', '<div class="ia-dash-total">' + nombre(totalVues) + '<small> vues de fiches (cumul)</small></div>' + barresHTML(dom, totalVues), true) +
            section('Fiches jamais consultées', '💤', jamaisHTML, true);
    }

    function blocRecherches(b) {
        var f = (b.recherches || []).slice(0, 15).map(function (r) { return { libelle: r.terme, valeur: r.n }; });
        var v = (b.recherchesVides || []).slice(0, 15).map(function (r) { return { libelle: r.terme, valeur: r.n }; });
        return section('Recherches les plus fréquentes', '🔎', barresHTML(f, 0, 'Aucune recherche enregistrée pour le moment.'), true) +
            section('Recherches sans résultat · idées de contenu', '💡', barresHTML(v, 0, 'Aucune recherche sans résultat : tout ce qui est cherché est trouvé.'), true);
    }

    function blocCommunication(b) {
        var ab = b.abonnes;
        var abHTML = ab
            ? '<div class="ia-dash-total">' + nombre(ab.total) + '<small> appareil' + (ab.total > 1 ? 's' : '') + ' abonné' + (ab.total > 1 ? 's' : '') + '</small></div>' +
              barresHTML([{ libelle: 'Nouveautés de l’app', valeur: ab.nouveautes }, { libelle: 'Messages du service', valeur: ab.messages }, { libelle: 'Alertes contact (admin)', valeur: ab.contact }], ab.total)
            : '<p class="adm-vide">Notifications non configurées sur le serveur.</p>';
        var msg = (typeof b.messages === 'number')
            ? '<div class="ia-dash-total">' + nombre(b.messages) + '<small> message' + (b.messages > 1 ? 's' : '') + ' reçu' + (b.messages > 1 ? 's' : '') + ' (bugs, idées)</small></div>' +
              '<button class="adm-lien" onclick="ouvrirMessagesRecus()">Lire les messages</button>'
            : '<p class="adm-vide">Indisponible.</p>';
        return section('Notifications', '🔔', abHTML) + section('Messages des utilisateurs', '✉️', msg);
    }

    function rendre(b) {
        var maj = b.genere ? new Date(b.genere).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '';
        return (maj ? '<p class="adm-maj">Mis à jour le ' + echapper(maj) + ' · données anonymes, ' + b.jours + ' derniers jours</p>' : '') +
            tuilesUsage(b) +
            CARTES.map(function (def) { return carteHTML(def, b.stats[def.type]); }).join('') +
            blocProfil(b) + blocContenu(b) + blocRecherches(b) + blocCommunication(b);
    }

    async function charger() {
        var cle = document.getElementById('statsCleAdmin').value.trim();
        var retour = document.getElementById('statsRetour');
        var cartes = document.getElementById('statsCartes');
        if (!cle) { retour.textContent = 'Clé administrateur obligatoire.'; return; }
        retour.textContent = 'Chargement…';
        cartes.innerHTML = '';
        try {
            var r = await fetch('/api/admin-stats', { headers: { Authorization: 'Bearer ' + cle } });
            var b = await r.json().catch(function () { return {}; });
            if (!r.ok) { retour.textContent = b.erreur || ('Erreur ' + r.status); return; }
            if (document.getElementById('statsMemoriser').checked) { try { localStorage.setItem(CLE_ADMIN, JSON.stringify(cle)); } catch (e) {} }
            retour.textContent = '';
            cartes.innerHTML = rendre(b);
        } catch (e) {
            retour.textContent = 'Réseau indisponible.';
        }
    }

    return { preparerAffichage: preparerAffichage, charger: charger, rendre: rendre };
})();

function ouvrirTableauDeBord() {
    if (typeof fermerReglages === 'function') fermerReglages();
    showModule('admin-dashboard');
    AdminStats.preparerAffichage();
}
function chargerTableauDeBord() { AdminStats.charger(); }
