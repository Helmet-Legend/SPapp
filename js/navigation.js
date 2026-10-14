/**
 * Vulcain - Navigation (design A : onglets + menus déroulants)
 *
 * Tout est généré à partir de data/navigation.json :
 *  - accueil : un menu déroulant par domaine, un sous-menu par thème ;
 *  - onglets du bas : Accueil, Calculs, Chercher, Favoris ;
 *  - fil d'Ariane et bouton favori en haut de chaque écran.
 * Pour ajouter une fiche : créer son écran dans index.html (div.module) et
 * ajouter une entrée dans data/navigation.json.
 */
const Navigation = (function() {
    const TYPES = {
        calculateur: { court: 'CALC', classe: 'calc' },
        fiche: { court: 'FICHE', classe: '' },
        ordre: { court: 'ORDRE', classe: 'ordre' },
        presentation: { court: 'INFO', classe: 'info' },
        menu: { court: 'MENU', classe: '' }
    };
    // Clés gardées de l'ancien nom (DECIOPS) : favoris et historique restent après le renommage
    const CLE_FAVORIS = 'deciops.favoris';
    const CLE_RECENTS = 'deciops.recents';
    const CLE_OUVERTS = 'deciops.menusOuverts';

    let registre = { domaines: [], pages: [] };
    let parId = {};
    let texteDesPages = {};   // contenu de chaque écran, pour chercher aussi dans le texte des fiches
    let ongletActif = 'accueil';
    let ongletOrigine = 'accueil';
    let recherche = '';
    // Les menus ouverts survivent à un changement d'appli, mais pas à la fermeture
    // de l'app : sessionStorage est vidé quand la PWA est fermée, donc l'accueil
    // repart avec tous les volets fermés au lancement suivant.
    let ouverts = {};
    try { localStorage.removeItem(CLE_OUVERTS); } catch (e) { /* ignoré */ }
    try { ouverts = JSON.parse(sessionStorage.getItem(CLE_OUVERTS) || '{}') || {}; } catch (e) { ouverts = {}; }

    // ---------- Stockage local (peut être indisponible : navigation privée…) ----------
    function lire(cle, defaut) {
        try {
            const v = localStorage.getItem(cle);
            return v ? JSON.parse(v) : defaut;
        } catch (e) { return defaut; }
    }
    function ecrire(cle, valeur) {
        try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) { /* ignoré */ }
    }
    function favoris() { return lire(CLE_FAVORIS, ['fire', 'tmd', 'ari', 'ia-manoeuvre']).filter(id => parId[id]); }
    function recents() { return lire(CLE_RECENTS, []).filter(id => parId[id]); }

    // ---------- Utilitaires ----------
    function esc(texte) {
        return String(texte).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function normaliser(texte) {
        return String(texte).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    // Normalisation propre à la recherche : sans accents ni majuscules, ligatures œ/æ dépliées,
    // apostrophes, tirets et ponctuation remplacés par des espaces. Appliquée de la même façon
    // à l'index et à la requête ; le contenu affiché des fiches n'est jamais modifié.
    function normaliserRecherche(texte) {
        return normaliser(texte).replace(/œ/g, 'oe').replace(/æ/g, 'ae')
            .replace(/[^a-z0-9]+/g, ' ').trim();
    }
    // Mots très courants ignorés quand la requête contient d'autres mots (« feu de forêt » = « feu forêt »)
    const MOTS_VIDES = new Set(['de', 'du', 'des', 'd', 'la', 'le', 'les', 'l', 'un', 'une', 'et', 'en', 'au', 'aux', 'a',
        'ou', 'sur', 'dans', 'par', 'pour', 'avec', 'sans', 'est', 'qui', 'que', 'qu', 'se', 's', 'ce', 'ces']);
    function motsDeLaRecherche(q) {
        const mots = normaliserRecherche(q).split(' ').filter(Boolean);
        return { mots, utiles: mots.filter(m => !MOTS_VIDES.has(m)) };
    }
    // Un mot court (acronyme : ARI, GPS, TMD…) doit commencer un mot ; un mot plus long peut être n'importe où
    // (« mousse » trouve « mousses »), sinon « ARI » trouverait « particulier ».
    function contientMot(texte, mot) {
        return mot.length <= 3 ? (' ' + texte).includes(' ' + mot) : texte.includes(mot);
    }
    function domaine(id) { return registre.domaines.find(d => d.id === id); }
    function icone(nom, classe) {
        return `<svg class="ico${classe ? ' ' + classe : ''}" aria-hidden="true"><use href="#i-${nom}"/></svg>`;
    }
    function pictoDomaine(d, picto) {
        return `<span class="nav-picto" style="--c:${d.couleur}">${icone(picto || d.picto || 'info')}</span>`;
    }
    // Pastille de couleur d'un sous-menu (ex. couleur de l'année de JSP)
    function pastilleTheme(d, theme) {
        const c = d.couleursThemes && d.couleursThemes[theme];
        return c ? `<span class="nav-sub-pastille" style="--jsp:${c}" aria-hidden="true"></span>` : '';
    }
    function pagesDuTheme(d, theme) {
        return registre.pages.filter(p => p.domaine === d.id && p.theme === theme && p.type !== 'menu');
    }
    // Un type absent de TYPES est affiché comme une fiche : on le signale une fois en console
    const typesSignales = new Set();
    function signalerType(type) {
        if (TYPES[type] || typesSignales.has(type)) return;
        typesSignales.add(type);
        console.warn('Navigation : type de page inconnu « ' + type + ' », affiché comme une fiche.');
    }
    // Icône « kit » d'un calcul : repli sur l'icône générique si le symbole n'existe pas
    function iconeKit(p) {
        const nom = 'k-' + (p.kit || 'calc');
        return icone(document.getElementById('i-' + nom) ? nom : 'info');
    }
    function badge(type) {
        signalerType(type);
        const t = TYPES[type] || TYPES.fiche;
        return `<span class="nav-type ${t.classe}">${t.court}</span>`;
    }
    // Pastille de type affichée à droite des lignes de recherche, de favoris et de récents
    const LIBELLE_TYPE = { calculateur: 'CALCUL', fiche: 'FICHE', ordre: 'ORDRE', presentation: 'INFO' };
    function ligne(page, surligner) {
        signalerType(page.type);
        const d = domaine(page.domaine);
        const titre = page.type === 'presentation' ? `Présentation : ${page.theme}` : page.titre;
        return `<button class="nav-row" data-page="${page.id}" style="--c:${d.couleur}">
            ${pictoDomaine(d, page.picto)}
            <span class="nav-row-text"><b>${surligner ? surligne(titre, surligner) : esc(titre)}</b>
            <small>${esc(d.titre)}${page.theme ? ' › ' + esc(page.theme) : ''}</small></span>
            <span class="nav-tag">${LIBELLE_TYPE[page.type] || 'FICHE'}</span></button>`;
    }
    function surligne(texte, q) {
        const { mots, utiles } = motsDeLaRecherche(q);
        const cherches = utiles.length ? utiles : mots;
        const nt = normaliser(texte);   // même longueur que le texte affiché
        const plages = [];
        cherches.forEach(m => {
            for (let i = nt.indexOf(m); i >= 0 && m; i = nt.indexOf(m, i + m.length)) plages.push([i, i + m.length]);
        });
        if (!plages.length) return esc(texte);
        plages.sort((x, y) => x[0] - y[0]);
        const fusion = [plages[0].slice()];
        plages.slice(1).forEach(([d, f]) => { const dern = fusion[fusion.length - 1]; if (d <= dern[1]) dern[1] = Math.max(dern[1], f); else fusion.push([d, f]); });
        let html = '', pos = 0;
        fusion.forEach(([d, f]) => { html += esc(texte.slice(pos, d)) + '<mark>' + esc(texte.slice(d, f)) + '</mark>'; pos = f; });
        return html + esc(texte.slice(pos));
    }

    // ---------- Vues de l'écran d'accueil ----------
    function vueAccueil() {
        const rapide = `<div class="acces-rapide"><div class="calc-titre"><i></i><h3>Accès rapide</h3><span>Terrain</span></div><div class="acces-rapide-liste">`
            + ['localisation', 'mes-points', 'carte-dfci'].filter(id => parId[id]).map(id => {
                const p = parId[id], f = familleDe(p);
                return `<button type="button" class="acces-btn fam-${f.id}" data-page="${id}"><span class="calc-ic">${iconeKit(p)}</span>${esc(p.court)}</button>`;
            }).join('') + '</div></div>';
        const titreDomaines = `<div class="calc-titre acc-titre"><i></i><h3>Domaines opérationnels</h3><span>${registre.domaines.length}</span></div>`;
        return rapide + titreDomaines + registre.domaines.map(d => {
            const ouvert = !!ouverts[d.id];
            const nb = registre.pages.filter(p => p.domaine === d.id && p.type !== 'menu' && p.type !== 'presentation').length;
            let html = `<div class="nav-acc" style="--c:${d.couleur}">
                <button class="nav-acc-head" data-domaine="${d.id}" aria-expanded="${ouvert}">
                    <span class="nav-acc-photo" style="background-image:url('images/accueil/dom-${esc(d.id)}.jpeg')" aria-hidden="true"></span>
                    ${pictoDomaine(d)}
                    <span class="nav-acc-title">${esc(d.titre)}</span>
                    <span class="nav-count">${nb}</span>
                    ${icone('chev', 'nav-chev')}
                </button>`;
            if (ouvert) {
                html += '<div class="nav-acc-body">' + d.themes.map(theme => {
                    const pages = pagesDuTheme(d, theme);
                    const cle = d.id + '|' + theme;
                    const themeOuvert = d.themes.length === 1 || !!ouverts[cle];
                    let sous = `<div class="nav-sub">
                        <button class="nav-sub-head" data-theme="${esc(cle)}" aria-expanded="${themeOuvert}">
                            ${pastilleTheme(d, theme)}<span class="nav-sub-title">${esc(theme)}</span><span class="nav-count">${pages.filter(p => p.type !== 'presentation').length}</span>
                            ${icone('chev', 'nav-chev')}
                        </button>`;
                    if (themeOuvert) {
                        sous += '<div class="nav-leaves">' + pages.map(p =>
                            `<button class="nav-leaf" data-page="${p.id}">${badge(p.type)}<span class="nav-leaf-title">${esc(p.titre)}</span></button>`
                        ).join('') + '</div>';
                    }
                    return sous + '</div>';
                }).join('') + '</div>';
            }
            return html + '</div>';
        }).join('');
    }

    // ---------- Onglet Calculs : Terrain en tête, puis les calculs par famille (palette du kit UI) ----------
    const FAMILLES = {
        incendie: { id: 'inc', court: 'Incendie' }, fdf: { id: 'fdf', court: 'FDF' }, risques: { id: 'risk', court: 'Risques' },
        sap: { id: 'suap', court: 'SUAP' }, specialites: { id: 'spe', court: 'Spécialités' }, outils: { id: 'out', court: 'Outils' }
    };
    const ORDRE_FAMILLES = ['inc', 'fdf', 'risk', 'suap', 'spe', 'out'];
    let filtreFamille = 'tout';
    let rechercheCalculs = '';

    function familleDe(p) { return FAMILLES[p.domaine] || FAMILLES.outils; }
    function calculateurs() { return registre.pages.filter(p => p.type === 'calculateur'); }
    function imageCalcul(p) {
        return p.photo ? `<span class="calc-photo" style="background-image:url('${esc(p.photo)}')" aria-hidden="true"></span>` : '';
    }
    function carteCalcul(p) {
        const f = familleDe(p), d = domaine(p.domaine);
        return `<button type="button" class="calc-carte fam-${f.id}" data-page="${p.id}">${imageCalcul(p)}
            <span class="calc-ic">${iconeKit(p)}</span>
            <span class="calc-tx"><b>${esc(p.titre)}</b><small><em>${esc(d.titre)}</em> · ${esc(p.theme || '')}</small></span>
            <span class="calc-ch">${icone('chev')}</span></button>`;
    }
    function tuileCalcul(p) {
        const f = familleDe(p);
        let nb = '';
        if (p.id === 'mes-points' && typeof MesPoints !== 'undefined' && MesPoints.nombre()) nb = `<span class="calc-nb" aria-label="${MesPoints.nombre()} enregistrés">${MesPoints.nombre()}</span>`;
        return `<button type="button" class="calc-tuile fam-${f.id}${p.grande ? ' grande' : ''}" data-page="${p.id}">${imageCalcul(p)}
            <span class="calc-ic">${iconeKit(p)}</span>
            <span class="calc-tx"><b>${esc(p.court || p.titre)}</b><small>${esc(p.sous || '')}</small></span>${nb}</button>`;
    }
    function correspondCalcul(p, q) {
        if (!q) return true;
        const d = domaine(p.domaine);
        const { mots, utiles } = motsDeLaRecherche(q);
        const foin = normaliserRecherche([p.titre, p.court, p.sous, p.theme, d.titre].concat(p.motsCles || []).join(' '));
        return (utiles.length ? utiles : mots).every(m => contientMot(foin, m));
    }
    function vueCalculs() {
        const tous = calculateurs();
        const q = normaliser(rechercheCalculs.trim());
        const recents7 = recents().filter(id => parId[id] && parId[id].type === 'calculateur').slice(0, 3);
        let html = `<div class="calc-vue">
            <div class="calc-titre"><i></i><h3>Calculateurs</h3><span>${tous.length} outils</span></div>
            <label class="calc-rech">${icone('search')}<input id="calcRecherche" type="search" value="${esc(rechercheCalculs)}" placeholder="Rechercher un calcul" autocomplete="off" aria-label="Rechercher un calcul"></label>`;
        if (!q && filtreFamille === 'tout') {
            if (recents7.length) {
                html += '<span class="calc-label">Récents</span><div class="calc-recents">'
                    + recents7.map(id => `<button type="button" data-page="${id}">${icone('hist')}${esc(parId[id].court || parId[id].titre)}</button>`).join('') + '</div>';
            }
            const terrain = tous.filter(p => p.terrain).sort((a, b) => a.terrain - b.terrain);
            html += `<div class="calc-sec"><span>Terrain</span><i></i><b>${terrain.length}</b></div><div class="calc-tuiles">${terrain.map(tuileCalcul).join('')}</div>`;
        }
        const liste = tous.filter(p => (filtreFamille === 'tout' || familleDe(p).id === filtreFamille) && correspondCalcul(p, q)
            && (q || filtreFamille !== 'tout' || !p.terrain));
        html += `<div class="calc-sec"><span>${q || filtreFamille !== 'tout' ? 'Résultats' : 'Toutes les familles'}</span><i></i><b>${liste.length}</b></div>
            <div class="calc-filtres" role="group" aria-label="Filtrer par famille">`
            + [['tout', 'Tous']].concat(ORDRE_FAMILLES.map(id => [id, Object.values(FAMILLES).find(f => f.id === id).court]))
                .map(([id, nom]) => `<button type="button" class="calc-filtre fam-${id}" data-fam="${id}" aria-pressed="${filtreFamille === id}">${id === 'tout' ? '' : '<i></i>'}${nom}</button>`).join('')
            + '</div><div id="calcListe">' + (liste.length ? liste.map(carteCalcul).join('')
                : `<div class="calc-vide"><b>Aucun calcul ne correspond</b>Aucun résultat pour « ${esc(rechercheCalculs.trim())} ». Essayez « feu », « GPS » ou « plongée ».</div>`) + '</div></div>';
        return html;
    }

    // Index de recherche : titre, mots-clés, thème et domaine normalisés une fois pour toutes
    let indexRecherche = {};
    function indexerRecherche() {
        indexRecherche = {};
        registre.pages.forEach(p => {
            if (p.type === 'menu') return;
            indexRecherche[p.id] = {
                titre: normaliserRecherche(p.type === 'presentation' ? p.theme : p.titre),
                motsCles: normaliserRecherche((p.motsCles || []).join(' ')),
                contexte: normaliserRecherche([p.theme, domaine(p.domaine).titre].join(' '))
            };
        });
    }
    // Recherche : tous les mots utiles de la requête doivent être trouvés, dans le titre, les mots-clés,
    // le thème ou le domaine, ou le texte de la fiche. Poids par mot : titre 60, mots-clés 30, thème/domaine 20, texte 5.
    // Bonus si la requête commence le titre (+100) ou apparaît telle quelle dans le titre (+40) ; +25 pour une expression
    // de plusieurs mots présente telle quelle dans les mots-clés ou le thème. À score égal, l'ordre du registre est conservé.
    function resultats(q) {
        const phrase = normaliserRecherche(q);
        if (phrase.length < 2) return [];
        const { utiles } = motsDeLaRecherche(q);
        if (!utiles.length) return [];   // uniquement des mots très courants : rien de précis à chercher
        const scores = [];
        registre.pages.forEach(p => {
            const ix = indexRecherche[p.id];
            if (!ix) return;
            const texte = texteDesPages[p.id] || '';
            let score = 0;
            for (const m of utiles) {
                if (contientMot(ix.titre, m)) score += 60;
                else if (contientMot(ix.motsCles, m)) score += 30;
                else if (contientMot(ix.contexte, m)) score += 20;
                else if (contientMot(texte, m)) score += 5;
                else { score = 0; break; }   // un mot absent partout : la page ne correspond pas
            }
            if (!score) return;
            const sansMotsVides = utiles.join(' ');
            if (ix.titre.startsWith(phrase) || ix.titre.startsWith(sansMotsVides)) score += 100;
            else if (ix.titre.includes(phrase) || ix.titre.includes(sansMotsVides)) score += 40;
            // Expression de plusieurs mots déclarée telle quelle dans les mots-clés ou le thème : pertinence en plus
            if (utiles.length > 1 && (ix.motsCles.includes(phrase) || ix.motsCles.includes(sansMotsVides) || ix.contexte.includes(phrase))) score += 25;
            scores.push([score, p]);
        });
        return scores.sort((a, b) => b[0] - a[0]).map(s => s[1]);
    }

    // Mots cherchés (anonymes, agrégés côté serveur) : permet de repérer les contenus qui manquent.
    // Envoyé quand la saisie s'arrête, une seule fois par mot et par session.
    let minuterieRecherche = null;
    const recherchesEnvoyees = new Set();
    function noterRecherche(texte) {
        clearTimeout(minuterieRecherche);
        const t = normaliser(texte.trim());
        if (t.length < 3 || recherchesEnvoyees.has(t)) return;
        minuterieRecherche = setTimeout(() => {
            recherchesEnvoyees.add(t);
            if (typeof statsEvenement === 'function') statsEvenement('recherche', { terme: t, resultats: resultats(texte).length });
        }, 1500);
    }

    const SUGGESTIONS = ['TMD', 'GPS', 'ARI', 'Plongée', 'Mousse', 'Gaz', 'Échelle'];
    function vueChercher() {
        return `<div class="vue-titre"><h3>Rechercher</h3></div><label class="nav-search" for="navSearchInput">${icone('search')}
            <input id="navSearchInput" type="search" value="${esc(recherche)}" placeholder="Fiche, matériel, produit, n° ONU…" autocomplete="off" enterkeyhint="search"></label>
            <div id="navSearchResults">${resultatsChercher()}</div>`;
    }

    function resultatsChercher() {
        const q = recherche.trim();
        if (q.length < 2) {
            const rec = recents();
            return '<div class="nav-label nav-sect"><i></i>Suggestions</div><div class="nav-suggest">'
                + SUGGESTIONS.map(t => `<button type="button" data-suggest="${esc(t)}">${esc(t)}</button>`).join('') + '</div>'
                + '<div class="nav-aide">Tapez au moins deux lettres : nom de fiche, matériel, produit ou numéro ONU.</div>'
                + (rec.length ? '<div class="nav-label nav-sect"><i></i>Consultés récemment<span>' + rec.length + '</span></div>' + rec.map(id => ligne(parId[id])).join('') : '');
        }
        const res = resultats(q);
        const risques = domaine('risques');
        let html = `<button class="nav-row nav-row-tmd" data-tmd="${esc(q)}" style="--c:${risques.couleur}">
            <span class="nav-picto" style="--c:${risques.couleur}">${icone('search')}</span>
            <span class="nav-row-text"><b>Chercher « ${esc(q)} » dans la base TMD</b><small>Matières dangereuses : nom ou numéro ONU</small></span>${icone('chev', 'nav-chev')}</button>`;
        html += res.length ? res.map(p => ligne(p, q)).join('') : `<div class="nav-empty">Aucune fiche ne correspond à « ${esc(q)} ».</div>`;
        return html;
    }

    function vueFavoris() {
        const fav = favoris();
        if (!fav.length) {
            return `<div class="vue-titre"><h3>Favoris</h3></div><div class="nav-vide"><div class="nav-vide-etoile">${icone('star')}</div>
                <b>Aucun favori</b><p>Ouvrez une fiche ou un calcul et touchez l'étoile en haut de l'écran : il apparaîtra ici.</p>
                <button type="button" class="nav-vide-btn" data-onglet="calculs">Voir les calculs</button></div>`;
        }
        return `<div class="vue-titre"><h3>Favoris</h3><span class="nav-nb">${fav.length}</span></div>` + fav.map(id => ligne(parId[id])).join('');
    }

    // ---------- Onglet Admin : visible seulement si la clé administrateur est mémorisée sur cet appareil ----------
    // La vraie protection reste côté serveur : chaque écran admin envoie la clé, qui est contrôlée à chaque appel.
    const CLE_ADMIN = 'vulcain-push-admin';
    function cleAdminMemorisee() {
        try { const v = localStorage.getItem(CLE_ADMIN); return !!v && JSON.parse(v) !== ''; } catch (e) { return false; }
    }
    function majOngletAdmin() {
        const b = document.getElementById('navOngletAdmin');
        if (b) b.hidden = !cleAdminMemorisee();
    }
    function vueAdmin() {
        const rang = (action, picto, titre, detail) => `<button class="nav-row" data-admin="${action}">
            <span class="nav-picto" style="--c:#6D28D9">${icone(picto)}</span>
            <span class="nav-row-text"><b>${titre}</b><small>${detail}</small></span>${icone('chev', 'nav-chev')}</button>`;
        return '<div class="nav-label">Administration · clé mémorisée sur cet appareil</div>'
            + rang('dashboard', 'sigma', 'Tableau de bord', 'Ouvertures, générations IA, PDF (30 jours)')
            + rang('messages', 'message', 'Messages reçus', 'Bugs et idées envoyés par les utilisateurs')
            + rang('notification', 'bell', 'Envoyer une notification', 'Message à tous les appareils abonnés')
            + '<button class="nav-row nav-admin-verrou" data-admin="verrouiller"><span class="nav-picto" style="--c:#B91C1C">' + icone('close') + '</span>'
            + '<span class="nav-row-text"><b>Verrouiller</b><small>Efface la clé de cet appareil et masque l\'onglet</small></span></button>';
    }

    const VUES = { accueil: vueAccueil, calculs: vueCalculs, chercher: vueChercher, favoris: vueFavoris, admin: vueAdmin };

    function rendreAccueil(garderFocus) {
        const conteneur = document.getElementById('navHome');
        if (!conteneur) return;
        conteneur.innerHTML = VUES[ongletActif]();
        conteneur.dataset.vue = ongletActif;
        if (garderFocus) {
            const input = document.getElementById('navSearchInput');
            if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
        }
    }

    function rendreOnglets() {
        majOngletAdmin();
        const surAccueil = !!document.getElementById('home')?.classList.contains('active');
        const actif = surAccueil ? ongletActif : ongletOrigine;
        // Fond photo seulement sur l'onglet Accueil de l'écran d'accueil
        document.body.classList.toggle('accueil-photo', surAccueil && ongletActif === 'accueil');
        document.querySelectorAll('#navTabbar button').forEach(b => {
            b.setAttribute('aria-current', b.dataset.onglet === actif ? 'page' : 'false');
        });
    }

    // ---------- Fil d'Ariane + favori en haut de chaque écran ----------
    function filAriane(id) {
        const module = document.getElementById(id);
        if (!module) return;
        module.querySelectorAll(':scope > .nav-crumbs').forEach(el => el.remove());
        const page = parId[id];
        if (!page) return;
        const d = domaine(page.domaine);
        const favorisable = page.type !== 'menu';
        const estFavori = favoris().includes(id);
        const barre = document.createElement('div');
        barre.className = 'nav-crumbs';
        barre.innerHTML = `<nav aria-label="Vous êtes ici"><button data-onglet-retour="accueil" data-domaine-ouvrir="${d.id}">Accueil</button>
            <span aria-hidden="true">›</span><button data-onglet-retour="accueil" data-domaine-ouvrir="${d.id}">${esc(d.titre)}</button>
            ${page.theme ? `<span aria-hidden="true">›</span><span>${esc(page.theme)}</span>` : ''}</nav>
            ${favorisable ? `<button class="nav-fav" data-favori="${id}" aria-pressed="${estFavori}" title="${estFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}" aria-label="${estFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${icone('star')}</button>` : ''}`;
        const retour = module.querySelector(':scope > .back-btn');
        if (retour) retour.after(barre); else module.prepend(barre);
    }

    // ---------- Actions ----------
    function ouvrirPage(id) {
        if (!document.getElementById(id)) return;
        showModule(id);
    }

    function allerOnglet(onglet) {
        ongletActif = onglet;
        ongletOrigine = onglet;
        if (!document.getElementById('home').classList.contains('active')) showModule('home');
        rendreAccueil(onglet === 'chercher');
        rendreOnglets();
        window.scrollTo(0, 0);
        memoriserDansHistorique();
    }

    // ---------- Historique du navigateur (geste « retour » mobile) ----------
    // Comme dans Helmet Legends : chaque écran (et chaque onglet de l'accueil)
    // devient une entrée d'historique. Le balayage retour d'Android, le bouton
    // retour du téléphone ou du navigateur reviennent ainsi à l'écran précédent
    // au lieu de fermer l'application.
    let restaurationEnCours = false;

    function etatCourant() {
        const actif = document.querySelector('.module.active');
        return { module: actif ? actif.id : 'home', onglet: ongletActif };
    }

    function memoriserDansHistorique() {
        if (restaurationEnCours) return;
        const etat = etatCourant();
        const precedent = history.state;
        if (precedent && precedent.module === etat.module && (etat.module !== 'home' || precedent.onglet === etat.onglet)) return;
        history.pushState(etat, '');
    }

    function surRetourHistorique(event) {
        const etat = event.state || { module: 'home', onglet: 'accueil' };
        restaurationEnCours = true;
        try {
            // L'onglet d'origine est restauré aussi pour une fiche (onglet en surbrillance)
            ongletOrigine = etat.onglet || 'accueil';
            ongletActif = ongletOrigine;
            showModule(document.getElementById(etat.module) ? etat.module : 'home');
        } finally {
            restaurationEnCours = false;
        }
    }

    function chercherTMD(q) {
        showModule('tmd');
        const onu = document.getElementById('searchONU');
        const nom = document.getElementById('searchName');
        if (onu && nom) {
            const numero = /^\d+$/.test(q);
            onu.value = numero ? q : '';
            nom.value = numero ? '' : q;
            if (typeof searchTMD === 'function') searchTMD();
        }
    }

    function basculerFavori(id) {
        const fav = favoris();
        ecrire(CLE_FAVORIS, fav.includes(id) ? fav.filter(x => x !== id) : fav.concat(id));
        filAriane(id);
    }

    function noterRecent(id) {
        const page = parId[id];
        if (!page || page.type === 'menu') return;
        ecrire(CLE_RECENTS, [id].concat(recents().filter(x => x !== id)).slice(0, 8));
    }

    function surClic(e) {
        const b = e.target.closest('button');
        if (!b) return;
        const d = b.dataset;
        if (d.suggest) {
            recherche = d.suggest;
            const champ = document.getElementById('navSearchInput');
            const zone = document.getElementById('navSearchResults');
            if (champ) { champ.value = recherche; champ.focus(); }
            if (zone) zone.innerHTML = resultatsChercher();
            noterRecherche(recherche);
        }
        else if (d.fam) { filtreFamille = d.fam; rendreAccueil(); }
        else if (d.page) { ouvrirPage(d.page); }
        else if (d.tmd) { chercherTMD(d.tmd); }
        else if (d.domaine) {
            basculer(d.domaine, cle => !cle.includes('|'));
            rendreAccueil();
            garderVisible(`[data-domaine="${d.domaine}"]`);
        } else if (d.theme) {
            const dom = d.theme.split('|')[0] + '|';
            basculer(d.theme, cle => cle.startsWith(dom));
            rendreAccueil();
            garderVisible(`[data-theme="${CSS.escape(d.theme)}"]`);
        }
    }

    // Un seul menu ouvert à la fois : ouvrir une catégorie ferme les autres,
    // ouvrir un dossier ferme les autres dossiers de la même catégorie.
    function basculer(cle, memeNiveau) {
        const ouvrir = !ouverts[cle];
        if (ouvrir) Object.keys(ouverts).forEach(k => { if (k !== cle && memeNiveau(k)) delete ouverts[k]; });
        ouverts[cle] = ouvrir;
        try { sessionStorage.setItem(CLE_OUVERTS, JSON.stringify(ouverts)); } catch (e) { /* ignoré */ }
    }

    // Les menus fermés au-dessus décalent la page : on ramène le titre ouvert à l'écran
    function garderVisible(selecteur) {
        const el = document.querySelector('#navHome ' + selecteur);
        if (!el) return;
        const haut = el.getBoundingClientRect().top;
        if (haut < 70 || haut > window.innerHeight - 140) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function surClicGlobal(e) {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.onglet) { allerOnglet(b.dataset.onglet); }
        else if (b.dataset.favori) { basculerFavori(b.dataset.favori); }
        else if (b.dataset.admin) {
            const a = b.dataset.admin;
            if (a === 'dashboard') ouvrirTableauDeBord();
            else if (a === 'messages') ouvrirMessagesRecus();
            else if (a === 'notification') ouvrirEnvoiNotification();
            else if (a === 'verrouiller') {
                try { localStorage.removeItem(CLE_ADMIN); } catch (err) { /* stockage indisponible */ }
                allerOnglet('accueil');
            }
        }
        else if (b.dataset.ongletRetour) {
            if (b.dataset.domaineOuvrir && !ouverts[b.dataset.domaineOuvrir]) basculer(b.dataset.domaineOuvrir, cle => !cle.includes('|'));
            allerOnglet(b.dataset.ongletRetour);
        }
    }

    // showModule (js/app.js) reste le point d'entrée : on s'y greffe
    function brancherShowModule() {
        const original = window.showModule;
        window.showModule = function(nom) {
            original(nom);
            majOngletAdmin();
            if (nom === 'home') {
                ongletActif = ongletOrigine;
                rendreAccueil();
            } else {
                filAriane(nom);
                noterRecent(nom);
            }
            rendreOnglets();
            memoriserDansHistorique();
        };
    }

    // Un appui sur le logo Vulcain ramène à l'accueil
    function brancherLogo() {
        const logo = document.getElementById('appBrand');
        if (!logo) return;
        const retour = () => {
            const reglages = document.getElementById('reglagesModal');
            if (typeof fermerReglages === 'function' && reglages && !reglages.hidden) fermerReglages();
            const apropos = document.getElementById('aboutModal');
            if (apropos && apropos.classList.contains('active') && typeof toggleAbout === 'function') toggleAbout();
            allerOnglet('accueil');
        };
        logo.addEventListener('click', retour);
        logo.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); retour(); }
        });
    }

    // ---------- Chargement et validation du registre ----------
    const MESSAGES_ERREUR = {
        reseau: 'Impossible de charger le menu : vérifiez votre connexion, puis réessayez.',
        http: 'Le menu est momentanément indisponible. Réessayez dans un instant.',
        json: 'Le menu n\'a pas pu être lu. Réessayez ; si le problème continue, signalez-le depuis « À propos ».',
        structure: 'Le menu est incomplet et ne peut pas s\'afficher. Réessayez ; si le problème continue, signalez-le depuis « À propos ».'
    };
    function erreurChargement(genre, cause) {
        const e = new Error('Registre de navigation : ' + genre + (cause ? ' (' + cause.message + ')' : ''));
        e.genre = genre;
        return e;
    }
    async function chargerRegistre() {
        let reponse;
        try { reponse = await fetch('data/navigation.json'); }
        catch (e) { throw erreurChargement('reseau', e); }
        if (!reponse.ok) throw erreurChargement('http', new Error('HTTP ' + reponse.status));
        try { return await reponse.json(); }
        catch (e) { throw erreurChargement('json', e); }
    }
    // Vérifie la structure et écarte les entrées inutilisables au lieu de bloquer toute l'appli.
    // Rien n'est corrigé en silence : chaque écart est signalé en console. Le script
    // scripts/valider-navigation.js est le contrôle strict à lancer avant de publier.
    function validerRegistre(brut) {
        if (!brut || typeof brut !== 'object' || !Array.isArray(brut.domaines) || !Array.isArray(brut.pages)) {
            throw erreurChargement('structure', new Error('« domaines » et « pages » doivent être des tableaux'));
        }
        const alertes = [], erreurs = [];
        const texte = v => typeof v === 'string' && v.trim() !== '';
        const domaines = [], idsDomaines = new Set();
        brut.domaines.forEach((d, i) => {
            if (!d || !texte(d.id) || !texte(d.titre)) { alertes.push('domaine #' + (i + 1) + ' ignoré : « id » ou « titre » absent'); return; }
            if (idsDomaines.has(d.id)) { erreurs.push('domaine en double « ' + d.id + ' » : la seconde entrée est ignorée'); return; }
            idsDomaines.add(d.id);
            domaines.push(Object.assign({}, d, { themes: Array.isArray(d.themes) ? d.themes : [], couleur: texte(d.couleur) ? d.couleur : '#6B7280' }));
        });
        const pages = [], ids = new Set();
        brut.pages.forEach((p, i) => {
            if (!p || !texte(p.id) || !texte(p.titre)) { alertes.push('page #' + (i + 1) + ' ignorée : « id » ou « titre » absent'); return; }
            if (ids.has(p.id)) { erreurs.push('identifiant de page en double « ' + p.id + ' » : la seconde entrée est ignorée'); return; }
            if (!idsDomaines.has(p.domaine)) { alertes.push('page « ' + p.id + ' » ignorée : domaine inconnu « ' + p.domaine + ' »'); return; }
            ids.add(p.id);
            const page = (p.motsCles === undefined || Array.isArray(p.motsCles)) ? p : Object.assign({}, p, { motsCles: [] });
            if (page !== p) alertes.push('page « ' + p.id + ' » : « motsCles » n\'est pas un tableau, ignoré');
            pages.push(page);
        });
        erreurs.forEach(m => console.error('Navigation : ' + m));
        alertes.forEach(m => console.warn('Navigation : ' + m));
        return Object.assign({}, brut, { domaines, pages });
    }
    function afficherErreur(conteneur, genre) {
        conteneur.innerHTML = '<div class="nav-empty"><p>' + (MESSAGES_ERREUR[genre] || MESSAGES_ERREUR.http)
            + '</p><button type="button" class="nav-vide-btn" data-reessayer>Réessayer</button></div>';
        const bouton = conteneur.querySelector('[data-reessayer]');
        if (bouton) bouton.addEventListener('click', () => {
            conteneur.innerHTML = '<div class="nav-empty">Chargement du menu…</div>';
            init();
        });
    }

    let demarre = false;
    async function init() {
        const conteneur = document.getElementById('navHome');
        if (!conteneur || demarre) return;
        try {
            registre = validerRegistre(await chargerRegistre());
        } catch (e) {
            console.error('Navigation : registre indisponible', e);
            registre = { domaines: [], pages: [] };
            afficherErreur(conteneur, e && e.genre ? e.genre : 'structure');
            return;
        }
        demarre = true;
        parId = {};
        registre.pages.forEach(p => {
            parId[p.id] = p;
            const module = document.getElementById(p.id);
            if (module) texteDesPages[p.id] = normaliserRecherche(module.textContent);
        });
        indexerRecherche();
        // Bilan de diagnostic : pages du registre sans écran HTML (introuvables dans le DOM, donc non indexées dans la recherche)
        const sansEcran = registre.pages.filter(p => !document.getElementById(p.id)).map(p => p.id);
        if (sansEcran.length) console.warn('Navigation : ' + sansEcran.length + ' page(s) du registre sans écran HTML : ' + sansEcran.join(', '));
        conteneur.addEventListener('click', surClic);
        conteneur.addEventListener('input', e => {
            if (e.target.id === 'calcRecherche') {
                rechercheCalculs = e.target.value;
                const pos = e.target.selectionStart;
                rendreAccueil(false);
                const champ = document.getElementById('calcRecherche');
                if (champ) { champ.focus(); champ.setSelectionRange(pos, pos); }
                return;
            }
            if (e.target.id !== 'navSearchInput') return;
            recherche = e.target.value;
            const zone = document.getElementById('navSearchResults');
            if (zone) zone.innerHTML = resultatsChercher();
            noterRecherche(recherche);
        });
        document.addEventListener('click', surClicGlobal);
        brancherLogo();
        brancherShowModule();
        history.replaceState({ module: 'home', onglet: 'accueil' }, '');
        window.addEventListener('popstate', surRetourHistorique);
        rendreAccueil();
        rendreOnglets();
    }

    document.addEventListener('DOMContentLoaded', init);
    return {
        allerOnglet, ouvrirPage, majOngletAdmin,
        pages: () => registre.pages,
        domaines: () => registre.domaines,
        nombrePages: () => registre.pages.length
    };
})();
