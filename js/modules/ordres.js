// Habillage des 5 fiches d'ordres (PATRAC DR, DPIF, SMES, SOIEC, SAOIECL) :
// rappel « À retenir » et barre de lettres collante qui mène à chaque section.
// Les champs, les boutons, les fonctions d'impression et le PDF ne sont pas touchés : on ajoute seulement deux blocs avant la première section.
(function () {
    const FICHES = ['patrac-dr', 'dpif', 'smes', 'soiec', 'saoiecl'];
    const TITRE = /^(\S+)\s+([A-Z])\s-\s(.+)$/;

    const texte = e => e.textContent.replace(/\s+/g, ' ').trim();
    const reduit = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function sections(module) {
        return Array.from(module.querySelectorAll('.form-group')).map(s => {
            const h = Array.from(s.children).find(c => c.tagName === 'H3');
            if (!h) return null;
            const m = texte(h).match(TITRE);
            return { el: s, h3: h, lettre: m ? m[2] : null, emoji: m ? m[1] : texte(h).split(' ')[0], mot: m ? m[3].split(' ')[0] : null };
        }).filter(Boolean);
    }

    function rempli(s) {
        const champs = Array.from(s.el.querySelectorAll('input, textarea, select')).filter(c => !c.closest('#modalEquipage'));
        if (champs.some(c => c.value && c.value.trim())) return true;
        // Armement : les véhicules ajoutés s'affichent dans une liste, pas dans un champ
        return !!s.el.querySelector('#listeVehiculesEquipages button[onclick^="retirerVehiculeEquipage"]');
    }

    function habiller(module) {
        if (module.dataset.ordres) return;
        const secs = sections(module);
        if (secs.length < 2) return;
        module.dataset.ordres = '1';

        secs.forEach(s => {
            s.el.classList.add('ord-sec');
        });

        // Rappel « À retenir » : un mot par lettre, l'initiale en couleur
        const lettres = secs.filter(s => s.lettre);
        const premiere = secs[0].el;
        if (lettres.length) {
            const box = document.createElement('div');
            box.className = 'ord-retenir';
            box.setAttribute('data-ordres-ajout', '');
            const t = document.createElement('b');
            t.textContent = '🧠 À retenir';
            const p = document.createElement('p');
            lettres.forEach((s, i) => {
                const mot = document.createElement('span');
                const ini = document.createElement('em');
                ini.textContent = s.mot[0];
                mot.appendChild(ini);
                mot.appendChild(document.createTextNode(s.mot.slice(1)));
                if (i) p.appendChild(document.createTextNode(' · '));
                p.appendChild(mot);
            });
            box.appendChild(t);
            box.appendChild(p);
            premiere.parentNode.insertBefore(box, premiere);
        }

        // Barre de lettres
        const nav = document.createElement('nav');
        nav.className = 'ord-nav';
        nav.setAttribute('data-ordres-ajout', '');
        nav.setAttribute('aria-label', 'Aller à une section');
        const boutons = secs.map(s => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = s.lettre || s.emoji;
            b.setAttribute('aria-label', texte(s.h3));
            b.addEventListener('click', () => {
                s.el.scrollIntoView({ behavior: reduit() ? 'auto' : 'smooth', block: 'start' });
                verrou = Date.now() + 900;
                marquer(secs.indexOf(s));
            });
            nav.appendChild(b);
            return b;
        });
        premiere.parentNode.insertBefore(nav, premiere);

        let verrou = 0;
        function marquer(cur) {
            boutons.forEach((b, i) => {
                if (i === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
            });
            const b = boutons[cur];
            if (b && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = b.offsetLeft - nav.clientWidth / 2 + b.offsetWidth / 2;
        }
        function faits() {
            boutons.forEach((b, i) => {
                const f = rempli(secs[i]);
                b.classList.toggle('ord-fait', f);
                const nom = texte(secs[i].h3);
                b.setAttribute('aria-label', f ? nom + ' (remplie)' : nom);
            });
        }
        function suivre() {
            if (!module.classList.contains('active')) return;
            faits();
            if (Date.now() < verrou) return;
            const seuil = nav.offsetHeight + 40;
            let cur = 0;
            secs.forEach((s, i) => { if (s.el.getBoundingClientRect().top <= seuil) cur = i; });
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = secs.length - 1;
            marquer(cur);
        }
        const planifier = () => window.requestAnimationFrame(suivre);
        window.addEventListener('scroll', planifier, { passive: true });
        module.addEventListener('input', planifier);
        module.addEventListener('change', planifier);
        // Effacer, ajouter ou retirer un véhicule ou un chef d'agrès : la liste change sans événement de saisie
        module.addEventListener('click', () => setTimeout(planifier, 0));
        ['listeVehiculesEquipages', 'listeCA'].forEach(id => {
            const l = document.getElementById(id);
            if (l && module.contains(l)) new MutationObserver(planifier).observe(l, { childList: true });
        });
        marquer(0);
        faits();
    }

    function init() { FICHES.forEach(id => { const m = document.getElementById(id); if (m) habiller(m); }); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
