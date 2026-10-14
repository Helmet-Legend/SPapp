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
    // Éléments d'autres familles de pages (calculateurs, cartes, formulaires…) : ces pages gardent leur aspect
    const ETRANGERS = '.result-box, .result-card, .info-card, .warning-box, .alert-box, .distance-section, .jsp-bandeau, '
        + '.rd-tuiles, .sal-saisie, .sal-res-info, .sal-groupe, .calc-ui, input, select, textarea, canvas';
    const ROMAIN = /^\s*[IVXL]+\s*[.)]\s/;

    function actif() {
        try { return localStorage.getItem('vulcain-lecture') !== 'off'; } catch (e) { return true; }
    }

    function eligible(module) {
        return !!module && !!module.querySelector('.rd-section, .rd-tampon') && !module.querySelector(ETRANGERS);
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

    // Rubriques : le premier h3 de chaque bloc est un titre de section (numéroté par la feuille de style)
    function rubriques(module) {
        const entetes = [];
        module.querySelectorAll('.rd-section').forEach(s => {
            const h = s.querySelector(':scope > h3');
            if (!h) return;
            s.classList.add('lec-section');
            if (ROMAIN.test(h.textContent)) h.classList.add('lec-romain');
            entetes.push({ section: s, titre: h.textContent.replace(/\s*\(.*$/, '').replace(ROMAIN, '').trim() || h.textContent.trim() });
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
        if (!eligible(module)) { module.dataset.lecture = 'non'; return; }
        module.dataset.lecture = 'oui';
        module.classList.add('lecture');
        const d = domaineDe(module.id);
        if (d) module.setAttribute('data-lec-domaine', d);
        listes(module);
        tableaux(module);
        barre(module, rubriques(module));
    }

    return {
        appliquer,
        eligible,
        // Pour les tests : applique sans tenir compte de l'interrupteur
        forcer: module => appliquer(module, true)
    };
})();
