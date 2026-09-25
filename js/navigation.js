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
    let ouverts = lire(CLE_OUVERTS, {});

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
    function domaine(id) { return registre.domaines.find(d => d.id === id); }
    function icone(nom, classe) {
        return `<svg class="ico${classe ? ' ' + classe : ''}" aria-hidden="true"><use href="#i-${nom}"/></svg>`;
    }
    function pictoDomaine(d) {
        return `<span class="nav-picto" style="--c:${d.couleur}">${icone(d.picto || 'info')}</span>`;
    }
    // Pastille de couleur d'un sous-menu (ex. couleur de l'année de JSP)
    function pastilleTheme(d, theme) {
        const c = d.couleursThemes && d.couleursThemes[theme];
        return c ? `<span class="nav-sub-pastille" style="--jsp:${c}" aria-hidden="true"></span>` : '';
    }
    function pagesDuTheme(d, theme) {
        return registre.pages.filter(p => p.domaine === d.id && p.theme === theme && p.type !== 'menu');
    }
    function badge(type) {
        const t = TYPES[type] || TYPES.fiche;
        return `<span class="nav-type ${t.classe}">${t.court}</span>`;
    }
    function ligne(page, surligner) {
        const d = domaine(page.domaine);
        const titre = page.type === 'presentation' ? `Présentation : ${page.theme}` : page.titre;
        return `<button class="nav-row" data-page="${page.id}" style="--c:${d.couleur}">
            ${pictoDomaine(d)}
            <span class="nav-row-text"><b>${surligner ? surligne(titre, surligner) : esc(titre)}</b>
            <small>${esc(d.titre)}${page.theme ? ' › ' + esc(page.theme) : ''}</small></span>
            ${icone('chev', 'nav-chev')}</button>`;
    }
    function surligne(texte, q) {
        const i = normaliser(texte).indexOf(normaliser(q.trim()));
        if (i < 0 || !q.trim()) return esc(texte);
        const n = q.trim().length;
        return esc(texte.slice(0, i)) + '<mark>' + esc(texte.slice(i, i + n)) + '</mark>' + esc(texte.slice(i + n));
    }

    // ---------- Vues de l'écran d'accueil ----------
    function vueAccueil() {
        return registre.domaines.map(d => {
            const ouvert = !!ouverts[d.id];
            const nb = registre.pages.filter(p => p.domaine === d.id && p.type !== 'menu' && p.type !== 'presentation').length;
            let html = `<div class="nav-acc" style="--c:${d.couleur}">
                <button class="nav-acc-head" data-domaine="${d.id}" aria-expanded="${ouvert}">
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

    function vueCalculs() {
        const calcs = registre.pages.filter(p => p.type === 'calculateur');
        return `<div class="nav-label">${calcs.length} calculateurs</div>` + calcs.map(p => ligne(p)).join('');
    }

    function resultats(q) {
        const nq = normaliser(q.trim());
        if (nq.length < 2) return [];
        const scores = [];
        registre.pages.forEach(p => {
            if (p.type === 'menu') return;
            const titre = normaliser(p.type === 'presentation' ? p.theme : p.titre);
            const autres = normaliser([p.theme, domaine(p.domaine).titre].concat(p.motsCles || []).join(' '));
            let score = 0;
            if (titre.startsWith(nq)) score = 4;
            else if (titre.includes(nq)) score = 3;
            else if (autres.includes(nq)) score = 2;
            else if ((texteDesPages[p.id] || '').includes(nq)) score = 1;
            if (score) scores.push([score, p]);
        });
        return scores.sort((a, b) => b[0] - a[0]).map(s => s[1]);
    }

    function vueChercher() {
        return `<label class="nav-search" for="navSearchInput">${icone('search')}
            <input id="navSearchInput" type="search" value="${esc(recherche)}" placeholder="Fiche, matériel, produit, n° ONU…" autocomplete="off" enterkeyhint="search"></label>
            <div id="navSearchResults">${resultatsChercher()}</div>`;
    }

    function resultatsChercher() {
        const q = recherche.trim();
        if (q.length < 2) {
            const rec = recents();
            return rec.length
                ? '<div class="nav-label">Consultés récemment</div>' + rec.map(id => ligne(parId[id])).join('')
                : '<div class="nav-empty">Tapez au moins deux lettres : nom de fiche, matériel, produit ou numéro ONU.</div>';
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
        return fav.length
            ? '<div class="nav-label">Vos favoris</div>' + fav.map(id => ligne(parId[id])).join('')
            : '<div class="nav-empty">Aucun favori. Ouvrez une fiche et touchez ☆ en haut de l\'écran.</div>';
    }

    const VUES = { accueil: vueAccueil, calculs: vueCalculs, chercher: vueChercher, favoris: vueFavoris };

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
        const actif = document.getElementById('home')?.classList.contains('active') ? ongletActif : ongletOrigine;
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
        if (d.page) { ouvrirPage(d.page); }
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
        ecrire(CLE_OUVERTS, ouverts);
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

    async function init() {
        const conteneur = document.getElementById('navHome');
        if (!conteneur) return;
        try {
            const reponse = await fetch('data/navigation.json');
            if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
            registre = await reponse.json();
        } catch (e) {
            console.error('Navigation : registre indisponible', e);
            conteneur.innerHTML = '<div class="nav-empty">Menu indisponible : rechargez la page une fois connecté.</div>';
            return;
        }
        parId = {};
        registre.pages.forEach(p => {
            parId[p.id] = p;
            const module = document.getElementById(p.id);
            if (module) texteDesPages[p.id] = normaliser(module.textContent.replace(/\s+/g, ' '));
        });
        conteneur.addEventListener('click', surClic);
        conteneur.addEventListener('input', e => {
            if (e.target.id !== 'navSearchInput') return;
            recherche = e.target.value;
            const zone = document.getElementById('navSearchResults');
            if (zone) zone.innerHTML = resultatsChercher();
        });
        document.addEventListener('click', surClicGlobal);
        brancherShowModule();
        history.replaceState({ module: 'home', onglet: 'accueil' }, '');
        window.addEventListener('popstate', surRetourHistorique);
        rendreAccueil();
        rendreOnglets();
    }

    document.addEventListener('DOMContentLoaded', init);
    return { allerOnglet, ouvrirPage };
})();
