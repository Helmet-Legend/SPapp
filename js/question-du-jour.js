/**
 * Vulcain - Question du jour
 *
 * Une carte en haut de l'accueil : une question à 4 choix par jour, tirée de
 * data/questions.json. Rien n'est bloquant et tout reste sur l'appareil.
 *
 *  - rotation sans doublon : chaque question sort une fois par cycle, puis l'ordre est remélangé ;
 *  - une question ratée revient 3 à 7 jours plus tard, et sort de la file après 2 bonnes réponses de suite ;
 *  - série de jours consécutifs ; bouton « Encore une » pour réviser à la demande ;
 *  - seules les questions dont la fiche existe dans l'appli sont posées (la version sans les
 *    pages SDIS 34 n'a donc pas besoin d'un fichier de questions à part) ;
 *  - désactivable dans Réglages, masquable jusqu'à la prochaine ouverture de l'appli.
 *
 * Pour ajouter une question : une entrée dans data/questions.json (id unique, fiche = id d'un module).
 */
const QuestionDuJour = (function () {
    'use strict';

    const CLE = 'vulcain.qdj';
    const CLE_MASQUE = 'vulcain.qdj.masque';
    const JOURS_RAPPEL = [3, 5, 7];      // délai avant de reposer une question ratée (selon le nombre d'échecs)

    let eligibles = [];
    let parId = {};
    let etat = null;
    let vue = null;                      // { q, ordre, repondu, choisi } : la question affichée (du jour ou « encore une »)
    let vueEstDuJour = true;
    let detail = false;                  // réponse et explication visibles (sinon version compacte)
    let jourAffiche = '';
    let astuceMontree = false;           // la première carte de l'utilisateur rappelle qu'on peut désactiver les questions

    /* ---------- Utilitaires ---------- */
    function formater(d) {
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const j = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + m + '-' + j;
    }
    function aujourdhui() { return formater(new Date()); }
    function decaler(jour, n) {
        const p = jour.split('-').map(Number);
        const d = new Date(p[0], p[1] - 1, p[2] + n, 12);
        return formater(d);
    }
    function melanger(tab) {
        const t = tab.slice();
        for (let i = t.length - 1; i > 0; i--) {
            const k = Math.floor(Math.random() * (i + 1));
            const x = t[i]; t[i] = t[k]; t[k] = x;
        }
        return t;
    }
    function ordreDesChoix(q) {
        const ordre = q.choix.map(function (_, i) { return i; });
        return q.fixe ? ordre : melanger(ordre);
    }
    function lireEtat() {
        let e = null;
        try { e = JSON.parse(localStorage.getItem(CLE)); } catch (err) { e = null; }
        if (!e || typeof e !== 'object') e = {};
        return {
            off: !!e.off,
            astuceVue: !!e.astuceVue,
            jour: e.jour || '',
            id: e.id || '',
            ordre: Array.isArray(e.ordre) ? e.ordre : [],
            repondu: !!e.repondu,
            choisi: typeof e.choisi === 'number' ? e.choisi : -1,
            serie: e.serie || 0,
            derniere: e.derniere || '',
            file: Array.isArray(e.file) ? e.file : [],
            erreurs: (e.erreurs && typeof e.erreurs === 'object') ? e.erreurs : {}
        };
    }
    function ecrireEtat() {
        try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (err) { /* stockage indisponible : la série ne sera pas conservée */ }
    }
    function masqueSession() {
        try { return sessionStorage.getItem(CLE_MASQUE) === '1'; } catch (err) { return false; }
    }

    /* ---------- Choix de la question du jour ---------- */
    function choisirDuJour(jour) {
        // 1. une question ratée dont l'échéance est passée
        const dues = eligibles.filter(function (q) {
            return etat.erreurs[q.id] && etat.erreurs[q.id].due <= jour;
        }).sort(function (a, b) { return etat.erreurs[a.id].due < etat.erreurs[b.id].due ? -1 : 1; });
        if (dues.length) return dues[0];
        // 2. la suite du cycle en cours, sans doublon
        etat.file = etat.file.filter(function (id) { return parId[id]; });
        if (!etat.file.length) {
            let nouvelle = melanger(eligibles.map(function (q) { return q.id; }));
            // une question qui vient de sortir ne rouvre pas le cycle suivant
            if (nouvelle.length > 1 && nouvelle[0] === etat.id) nouvelle.push(nouvelle.shift());
            etat.file = nouvelle;
        }
        return parId[etat.file.shift()];
    }

    function preparerLeJour() {
        const jour = aujourdhui();
        jourAffiche = jour;
        if (etat.jour !== jour || !parId[etat.id]) {
            const q = choisirDuJour(jour);
            etat.jour = jour;
            etat.id = q.id;
            etat.ordre = ordreDesChoix(q);
            etat.repondu = false;
            etat.choisi = -1;
            ecrireEtat();
        }
        const q = parId[etat.id];
        vue = { q: q, ordre: etat.ordre.length === q.choix.length ? etat.ordre : ordreDesChoix(q), repondu: etat.repondu, choisi: etat.choisi };
        vueEstDuJour = true;
        detail = false;
    }

    function serieAffichee() {
        const jour = aujourdhui();
        return (etat.derniere === jour || etat.derniere === decaler(jour, -1)) ? etat.serie : 0;
    }

    /* ---------- Réponses ---------- */
    function noterErreurs(q, juste, jour) {
        const e = etat.erreurs[q.id];
        if (!juste) {
            const echecs = e ? (e.echecs || 1) : 0;
            etat.erreurs[q.id] = {
                echecs: echecs + 1,
                bons: 0,
                due: decaler(jour, JOURS_RAPPEL[Math.min(echecs, JOURS_RAPPEL.length - 1)])
            };
        } else if (e) {
            e.bons = (e.bons || 0) + 1;
            if (e.bons >= 2) delete etat.erreurs[q.id];
            else e.due = decaler(jour, 7);
        }
    }

    function repondre(indexOriginal) {
        if (!vue || vue.repondu) return;
        const q = vue.q;
        const juste = indexOriginal === q.bonne;
        const jour = aujourdhui();
        vue.repondu = true;
        vue.choisi = indexOriginal;
        if (vueEstDuJour) {
            etat.repondu = true;
            etat.choisi = indexOriginal;
            if (etat.derniere !== jour) {
                etat.serie = (etat.derniere === decaler(jour, -1)) ? etat.serie + 1 : 1;
                etat.derniere = jour;
            }
        }
        noterErreurs(q, juste, jour);
        astuceMontree = !etat.astuceVue;   // l'astuce reste affichée sur cette première carte, puis disparaît
        etat.astuceVue = true;
        ecrireEtat();
        detail = true;
        afficher();
        const verdict = document.querySelector('#qdj .qdj-verdict');
        if (verdict && verdict.focus) verdict.focus();
    }

    function encoreUne() {
        const autres = eligibles.filter(function (q) { return q.id !== (vue && vue.q.id) && q.id !== etat.id; });
        const pool = autres.length ? autres : eligibles;
        const q = pool[Math.floor(Math.random() * pool.length)];
        vue = { q: q, ordre: ordreDesChoix(q), repondu: false, choisi: -1 };
        vueEstDuJour = false;
        detail = false;
        afficher();
    }

    function ouvrirFiche() {
        const id = vue && vue.q.fiche;
        if (!id) return;
        if (typeof Navigation !== 'undefined' && Navigation.ouvrirPage) Navigation.ouvrirPage(id);
        else if (typeof showModule === 'function') showModule(id);
    }

    function masquer() {
        try { sessionStorage.setItem(CLE_MASQUE, '1'); } catch (err) { /* sans stockage, la carte reste jusqu'au rechargement */ }
        afficher();
    }

    /* ---------- Affichage ---------- */
    function el(tag, classe, texte) {
        const n = document.createElement(tag);
        if (classe) n.className = classe;
        if (texte !== undefined) n.textContent = texte;
        return n;
    }
    function bouton(texte, classe, action) {
        const b = el('button', classe, texte);
        b.type = 'button';
        b.addEventListener('click', action);
        return b;
    }

    function afficher() {
        const conteneur = document.getElementById('qdj');
        if (!conteneur) return;
        conteneur.textContent = '';
        if (etat.off || masqueSession() || !vue) { conteneur.hidden = true; return; }
        conteneur.hidden = false;

        const q = vue.q;
        const carte = el('section', 'qdj');
        carte.setAttribute('aria-labelledby', 'qdjTitre');

        const tete = el('div', 'qdj-tete');
        tete.appendChild(el('h2', 'qdj-titre', vueEstDuJour ? 'Question du jour' : 'Encore une question'));
        tete.lastChild.id = 'qdjTitre';
        const s = serieAffichee();
        if (s > 0) tete.appendChild(el('span', 'qdj-serie', '🔥 ' + s + (s > 1 ? ' jours' : ' jour')));
        const fermer = bouton('✕', 'qdj-fermer', masquer);
        fermer.setAttribute('aria-label', 'Masquer la question jusqu\'à la prochaine ouverture');
        tete.appendChild(fermer);
        carte.appendChild(tete);

        // Version compacte : la question du jour est déjà faite et on n'est pas en train de la relire
        if (vue.repondu && !detail && vueEstDuJour) {
            const juste = vue.choisi === q.bonne;
            carte.appendChild(el('p', 'qdj-compact', (juste ? '✅ ' : '❌ ') + 'Question du jour faite. Revenez demain.'));
            const actions = el('div', 'qdj-actions');
            actions.appendChild(bouton('Revoir la réponse', 'qdj-btn', function () { detail = true; afficher(); }));
            actions.appendChild(bouton('Encore une', 'qdj-btn', encoreUne));
            carte.appendChild(actions);
            conteneur.appendChild(carte);
            return;
        }

        carte.appendChild(el('p', 'qdj-theme', q.theme));
        carte.appendChild(el('p', 'qdj-q', q.q));

        const liste = el('div', 'qdj-choix');
        liste.setAttribute('role', 'group');
        liste.setAttribute('aria-labelledby', 'qdjTitre');
        vue.ordre.forEach(function (i) {
            const b = bouton(q.choix[i], 'qdj-choix-btn', function () { repondre(i); });
            if (vue.repondu) {
                b.disabled = true;
                if (i === q.bonne) { b.classList.add('qdj-bon'); b.insertBefore(document.createTextNode('✓ '), b.firstChild); }
                else if (i === vue.choisi) { b.classList.add('qdj-faux'); b.insertBefore(document.createTextNode('✗ '), b.firstChild); }
            }
            liste.appendChild(b);
        });
        carte.appendChild(liste);

        if (vue.repondu) {
            const juste = vue.choisi === q.bonne;
            const retour = el('div', 'qdj-retour');
            retour.setAttribute('aria-live', 'polite');
            const verdict = el('p', 'qdj-verdict ' + (juste ? 'qdj-verdict-bon' : 'qdj-verdict-faux'), juste ? 'Bonne réponse !' : 'Pas tout à fait.');
            verdict.tabIndex = -1;
            retour.appendChild(verdict);
            retour.appendChild(el('p', 'qdj-expl', q.explication));
            if (!juste) retour.appendChild(el('p', 'qdj-rappel', 'Cette question reviendra dans quelques jours.'));
            const actions = el('div', 'qdj-actions');
            actions.appendChild(bouton('Voir la fiche', 'qdj-btn qdj-btn-fiche', ouvrirFiche));
            actions.appendChild(bouton('Encore une', 'qdj-btn', encoreUne));
            if (!vueEstDuJour) actions.appendChild(bouton('Question du jour', 'qdj-btn', function () { preparerLeJour(); detail = true; afficher(); }));
            retour.appendChild(actions);
            carte.appendChild(retour);
        }
        if (vueEstDuJour && (!etat.astuceVue || astuceMontree)) {
            const astuce = el('div', 'qdj-astuce');
            astuce.appendChild(el('p', 'qdj-astuce-texte', '💡 Les questions ne vous intéressent pas ? Vous pouvez les désactiver à tout moment dans Réglages.'));
            astuce.appendChild(bouton('Désactiver les questions', 'qdj-btn qdj-btn-desactiver', basculer));
            carte.appendChild(astuce);
        }
        conteneur.appendChild(carte);
    }

    /* ---------- Réglage ---------- */
    function majInterrupteur() {
        const b = document.getElementById('qdjSwitch');
        if (b) b.setAttribute('aria-checked', etat && !etat.off ? 'true' : 'false');
    }
    function basculer() {
        etat.off = !etat.off;
        astuceMontree = false;
        ecrireEtat();
        try { sessionStorage.removeItem(CLE_MASQUE); } catch (err) { /* ignoré */ }
        majInterrupteur();
        afficher();
    }

    /* ---------- Démarrage ---------- */
    function installer(donnees) {
        const liste = donnees && Array.isArray(donnees.questions) ? donnees.questions : [];
        // On ne pose que les questions dont la fiche existe dans cette version de l'appli
        eligibles = liste.filter(function (q) {
            return q && q.id && q.q && Array.isArray(q.choix) && q.choix.length >= 2
                && typeof q.bonne === 'number' && q.choix[q.bonne] !== undefined
                && q.fiche && document.getElementById(q.fiche);
        });
        parId = {};
        eligibles.forEach(function (q) { parId[q.id] = q; });
        etat = lireEtat();
        const b = document.getElementById('qdjSwitch');
        if (b) b.addEventListener('click', basculer);
        majInterrupteur();
        if (!eligibles.length) return;
        preparerLeJour();
        afficher();
        // Appli restée ouverte plusieurs jours : nouvelle question au retour
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible' && jourAffiche !== aujourdhui() && eligibles.length) {
                preparerLeJour();
                afficher();
            }
        });
    }

    function demarrer() {
        fetch('data/questions.json')
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(installer)
            .catch(function () { /* hors réseau sans cache ou fichier absent : la carte n'apparaît pas */ });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
    else demarrer();

    return { basculer: basculer, etat: function () { return etat; } };
})();
