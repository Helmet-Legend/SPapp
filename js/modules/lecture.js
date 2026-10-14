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
    // Pages interactives (formulaires, calculs, cartes) et familles à identité propre : elles gardent leur aspect
    const INTERACTIF = 'input, select, textarea, canvas, .calc-ui, .sal-saisie, .distance-section';
    const A_PART = '.jsp-bandeau, .sal-groupe';
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
    function listes(module) {
        module.querySelectorAll('ul, ol').forEach(l => {
            if (l.closest('.nav-crumbs, .lec-nav')) return;
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
            if (n === 2) t.classList.add('lec-deux');
            corps.forEach(r => Array.from(r.cells).forEach((c, i) => { if (i > 0 && th[i]) c.setAttribute('data-label', th[i]); }));
        });
    }

    // Rubriques : le premier titre de chaque bloc est un titre de section (numéroté par la feuille de style en mode complet)
    function rubriques(module, mode) {
        const entetes = [];
        const blocs = Array.from(module.querySelectorAll(mode === 'complet' ? '.rd-section' : BLOCS))
            .filter(b => !b.parentElement.closest(BLOCS));
        blocs.forEach(s => {
            const h = Array.from(s.children).find(c => /^H[2-4]$/.test(c.tagName));
            if (!h) return;
            s.classList.add(mode === 'complet' ? 'lec-section' : 'lec-ancre');
            if (mode === 'complet' && ROMAIN.test(h.textContent)) h.classList.add('lec-romain');
            const titre = h.textContent.replace(/\s*\(.*$/, '').replace(ROMAIN, '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
            entetes.push({ section: s, titre: titre || h.textContent.trim() });
        });
        return entetes;
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
            b.addEventListener('click', () => e.section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
        if (mode === 'complet') { listes(module); tableaux(module); }
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
