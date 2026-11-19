/**
 * Style de lecture des chapitres (GTO, GDO, fiches).
 *
 * Règle d'or : le contenu ne change jamais. Ce module ajoute seulement des classes, des étiquettes
 * data-label (lues par la feuille de style) et une barre de navigation par sections, marquée
 * data-lecture-ajout. Aucun élément du chapitre n'est déplacé, copié, retiré ni réécrit : le texte,
 * les photos, les schémas, les boutons et les liens restent exactement ceux de index.html.
 * tests/lecture.spec.js le vérifie sur chaque chapitre concerné.
 *
 * Interrupteur : localStorage « vulcain-lecture » = « off » rétablit l'ancien aspect.
 */
const Lecture = (function () {
    // Pages interactives (formulaires, calculs, cartes) et menus à groupes SAL : ils gardent leur aspect
    const INTERACTIF = 'input, select, textarea, canvas, .calc-ui, .sal-saisie, .distance-section';
    const A_PART = '.sal-groupe';
    // Anciennes boîtes de contenu, très colorées en ligne : elles reçoivent le bandeau et la navigation seulement
    const ANCIEN = '.result-box, .result-card, .info-card, .warning-box, .alert-box, .sal-res-info';
    const BLOCS = '.rd-section, .result-box, .result-card, .info-card';
    const ROMAIN = /^\s*[IVXL]+\s*[.)]\s/;

    function actif() {
        try { return localStorage.getItem('vulcain-lecture') !== 'off'; } catch (e) { return true; }
    }

    // « complet » : style de lecture entier ; « bandeau » : bandeau photo et navigation ; null : page inchangée
    function niveau(module) {
        if (!module || module.querySelector(INTERACTIF) || module.querySelector(A_PART)) return null;
        if (module.querySelector(ANCIEN)) return 'bandeau';
        return module.querySelector('.rd-section, .rd-tampon, .rd-alerte, .jsp-cours, .rd-tuiles') ? 'complet' : null;
    }

    function eligible(module) {
        return niveau(module) !== null;
    }

    function domaineDe(id) {
        if (typeof Navigation === 'undefined' || !Navigation.pages) return '';
        const page = Navigation.pages().find(p => p.id === id);
        return page ? page.domaine : '';
    }

    // Liste dont chaque point commence par un terme en gras : cartes de définition
    // Bloc au texte clair sur fond foncé posé en style direct : la liste y garde son aspect d'origine
    const TEXTE_CLAIR = /gradient|[^-]color\s*:\s*(#fff\b|#ffffff|white|rgb\(\s*255)/i;
    function surFondFonce(l, module) {
        for (let a = l.parentElement; a && a !== module; a = a.parentElement) {
            if (TEXTE_CLAIR.test(a.getAttribute('style') || '')) return true;
        }
        return false;
    }
    function listes(module) {
        const bandeau = module.classList.contains('lecture-bandeau');
        module.querySelectorAll('ul, ol').forEach(l => {
            if (l.closest('.nav-crumbs, .lec-nav')) return;
            if (bandeau && surFondFonce(l, module)) return;
            const points = Array.from(l.children).filter(li => li.tagName === 'LI');
            if (!points.length) return;
            if (l.tagName === 'OL') { l.classList.add('lec-steps'); return; }
            const defs = points.every(li => {
                const premier = Array.from(li.childNodes).find(n => n.nodeType !== 3 || n.textContent.trim());
                return premier && premier.nodeType === 1 && premier.tagName === 'STRONG';
            });
            l.classList.add(defs ? 'lec-defs' : 'lec-bl');
        });
    }

    // Tableau simple : une carte par ligne, l'intitulé de chaque colonne devient une étiquette (attribut, pas du texte)
    function tableaux(module) {
        module.querySelectorAll('table.rd-table').forEach(t => {
            if (t.querySelector('[colspan], [rowspan]')) { t.classList.add('lec-table'); return; }
            const lignes = Array.from(t.rows);
            const entete = lignes.find(r => r.querySelector('th'));
            const th = entete ? Array.from(entete.cells).map(c => c.textContent.trim()) : [];
            const corps = lignes.filter(r => !r.querySelector('th'));
            const n = corps.length ? corps[0].cells.length : 0;
            if (!n || corps.some(r => r.cells.length !== n) || (th.length && th.length !== n)) { t.classList.add('lec-table'); return; }
            t.classList.add('lec-cards');
            if (n === 2) { t.classList.add('lec-deux'); deuxColonnes(t, corps); }
            else if (n >= 3) plusieursColonnes(t, corps, th, n);
            corps.forEach(r => Array.from(r.cells).forEach((c, i) => { if (i > 0 && th[i]) c.setAttribute('data-label', th[i]); }));
        });
    }

    // Tableau à deux colonnes : trois mises en page selon le contenu (longueur moyenne du texte des cellules)
    //  - paire    : les deux colonnes sont du contenu (1re colonne longue) → vrai tableau, largeurs selon le contenu ;
    //  - c1       : titre court + texte long → un bloc par ligne, gros titre, texte pleine largeur ;
    //  - compact  : titre court + valeur courte → libellé et valeur sur une ligne.
    const SEUIL_LONG = 60, SEUIL_TITRE = 45, SEUIL_TITRE_MAX = 70, SEUIL_COURT = 14;
    const longueur = c => c.textContent.trim().length;
    function deuxColonnes(t, corps) {
        t.classList.remove('lec-paire', 'lec-c1', 'lec-compact');
        const l1 = corps.map(r => longueur(r.cells[0])), l2 = corps.map(r => longueur(r.cells[1]));
        const moy = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
        if (moy(l1) > SEUIL_TITRE || Math.max(0, ...l1) > SEUIL_TITRE_MAX) {
            t.classList.remove('lec-cards', 'lec-deux');
            t.classList.add('lec-paire');
            corps.forEach(r => Array.from(r.cells).forEach(c => c.classList.toggle('lec-court', longueur(c) <= SEUIL_COURT)));
        } else if (moy(l2) >= SEUIL_LONG) {
            t.classList.add('lec-c1');
            corps.forEach(r => actions(r.cells[1]));
        } else {
            t.classList.add('lec-compact');
        }
    }
    // Tableau de trois colonnes et plus : quatre mises en page selon le contenu (longueur moyenne du texte de chaque colonne)
    //  - e : six colonnes ou plus → vrai tableau, plus petit ;
    //  - v : « libellé | A | B » aux valeurs longues et de longueur voisine → en-tête écrit une fois, deux panneaux côte à côte ;
    //  - t : lignes courtes (chiffres, sigles) → vrai tableau, en-tête écrit une fois ;
    //  - f : texte long, colonnes inégales → un bloc par ligne (titre + champs étiquetés l'un sous l'autre).
    const SEUIL_LIGNE_COURTE = 80, SEUIL_VALEUR = 29, RAPPORT_VOISIN = 0.45;
    function plusieursColonnes(t, corps, th, n) {
        t.classList.remove('lec-t', 'lec-e', 'lec-v', 'lec-f');
        const moy = i => corps.reduce((s, r) => s + longueur(r.cells[i]), 0) / (corps.length || 1);
        const m = Array.from({ length: n }, (_, i) => moy(i));
        const lignes = m.reduce((a, b) => a + b, 0);
        let type;
        if (n >= 6) type = 'e';
        else if (n === 3 && th.length && th[0] === '' && m[1] >= SEUIL_VALEUR && m[2] >= SEUIL_VALEUR) type = 'v';
        else if (lignes <= SEUIL_LIGNE_COURTE) type = 't';
        else if (n === 3 && Math.min(m[1], m[2]) >= RAPPORT_VOISIN * Math.max(m[1], m[2])) type = 'v';
        else type = 'f';
        t.classList.add('lec-' + type);
        if (type === 't' || type === 'e') {
            t.classList.remove('lec-cards');
            corps.forEach(r => Array.from(r.cells).forEach(c => c.classList.toggle('lec-court', longueur(c) <= SEUIL_COURT)));
        }
    }
    // Liste d'actions dans une cellule : au moins deux mots en gras qui ouvrent une phrase (« Identifier : … Inspecter : … ») ;
    // chacun passe à la ligne et prend la couleur d'accent. Un gras isolé reste une simple mise en avant.
    function actions(cellule) {
        const debuts = Array.from(cellule.querySelectorAll('strong')).filter(s => {
            const avant = s.previousSibling;
            if (!avant) return true;
            return avant.nodeType === 3 && /[.;]$/.test(avant.textContent.trim());
        });
        if (debuts.length < 2) return;
        debuts.forEach(s => {
            s.classList.add('lec-act');
            const avant = s.previousSibling;
            if (avant && !(avant.nodeType === 1 && avant.classList.contains('lec-saut'))) {
                const saut = document.createElement('span');
                saut.className = 'lec-saut';
                saut.setAttribute('data-lecture-ajout', '');
                saut.setAttribute('aria-hidden', 'true');
                s.parentNode.insertBefore(saut, s);
            }
        });
    }

    // Rubriques : le premier titre de chaque bloc est un titre de section (numéroté par la feuille de style en mode complet)
    function rubriques(module, mode) {
        const entetes = [];
        // Pages sans rubriques (cours JSP) : chaque cours repliable est une section de la navigation
        const sections = module.querySelectorAll('.rd-section');
        const blocs = Array.from(mode === 'complet' ? (sections.length ? sections : module.querySelectorAll('details.jsp-cours')) : module.querySelectorAll(BLOCS))
            .filter(b => !b.parentElement.closest(BLOCS));
        blocs.forEach(s => {
            const cours = s.tagName === 'DETAILS';
            const h = Array.from(s.children).find(c => (cours ? c.tagName === 'SUMMARY' : /^H[2-4]$/.test(c.tagName)));
            if (!h) return;
            s.classList.add(mode === 'complet' && !cours ? 'lec-section' : 'lec-ancre');
            if (mode === 'complet' && !cours && ROMAIN.test(h.textContent)) h.classList.add('lec-romain');
            const titre = h.textContent.replace(/\s*\(.*$/, '').replace(ROMAIN, '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
            entetes.push({ section: s, titre: titre || h.textContent.trim() });
        });
        return entetes;
    }

    // Anciennes boîtes de contenu : seule la boîte extérieure est restylée ; les blocs colorés à l'intérieur ne changent pas
    const RACINES = '.result-box, .info-card, .result-card, .warning-box, .alert-box, .rd-section';
    function boites(module) {
        Array.from(module.querySelectorAll(RACINES)).filter(e => !e.parentElement.closest(RACINES)).forEach(e => {
            if (e.matches('.warning-box, .alert-box')) { e.classList.add('lec-alerte'); return; }
            if (e.matches('.info-card, .result-card')) { e.classList.add('lec-carte'); return; }
            e.classList.add('lec-boite');
            const h = Array.from(e.children).find(c => /^H[2-4]$/.test(c.tagName));
            if (h) h.classList.add('lec-bt');
        });
    }

    function barre(module, entetes) {
        if (entetes.length < 3) return;
        const nav = document.createElement('nav');
        nav.className = 'lec-nav';
        nav.setAttribute('data-lecture-ajout', '');
        nav.setAttribute('aria-label', 'Sections du chapitre');
        const boutons = entetes.map(e => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = e.titre;
            b.addEventListener('click', () => {
                if (e.section.tagName === 'DETAILS') e.section.open = true;
                e.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            nav.appendChild(b);
            return b;
        });
        const premiere = entetes[0].section;
        premiere.parentNode.insertBefore(nav, premiere);
        // Section en cours de lecture
        const suivre = () => {
            if (!module.classList.contains('active')) return;
            let courant = 0;
            entetes.forEach((e, i) => { if (e.section.getBoundingClientRect().top <= 90) courant = i; });
            boutons.forEach((b, i) => {
                if (i === courant) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
            });
            const b = boutons[courant];
            if (b && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = b.offsetLeft - nav.clientWidth / 2 + b.clientWidth / 2;
        };
        window.addEventListener('scroll', () => window.requestAnimationFrame(suivre), { passive: true });
        suivre();
    }

    function appliquer(module, force) {
        if (!module || module.dataset.lecture) return;
        if (!force && !actif()) return;
        const mode = niveau(module);
        if (!mode) { module.dataset.lecture = 'non'; return; }
        module.dataset.lecture = 'oui';
        module.classList.add('lecture');
        if (mode === 'bandeau') module.classList.add('lecture-bandeau');
        const d = domaineDe(module.id);
        if (d) module.setAttribute('data-lec-domaine', d);
        if (mode === 'complet') { listes(module); tableaux(module); } else { boites(module); listes(module); tableaux(module); }
        barre(module, rubriques(module, mode));
    }

    return {
        appliquer,
        eligible,
        niveau,
        // Pour les tests : applique sans tenir compte de l'interrupteur
        forcer: module => appliquer(module, true)
    };
})();
