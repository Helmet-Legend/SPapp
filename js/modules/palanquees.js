/**
 * Vulcain - Plusieurs palanquées dans le calculateur de paliers (SAL).
 * Chaque palanquée garde ses propres réglages ; le calcul des paliers (sal.js) n'est ni modifié ni dupliqué :
 * la palanquée affichée utilise les champs du calculateur, les autres sont rejouées avec le même calcul.
 * Réglages conservés sur l'appareil seulement (localStorage), rien n'est envoyé.
 */
const Palanquees = (function () {
    const MAX = 8;
    const CLE = 'vulcain-palanquees';
    const CHAMPS = { prof: 'calc-profondeur', temps: 'calc-temps', methode: 'calc-methode', melange: 'calc-melange',
        altitude: 'calc-altitude', intervalle: 'calc-intervalle', immersion: 'sal-immersion' };
    const COULEURS = ['#E01B36', '#0277BD', '#2E7D32', '#B86E00', '#8E24AA', '#00838F', '#6D4C41', '#546E7A'];
    let liste = [];
    let actif = 0;
    let instantanes = [];   // résultat des paliers de chaque palanquée (même objet que derniereDecompression)
    let pret = false;
    let enRejeu = false;

    const $ = id => document.getElementById(id);
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function nomLibre() {
        for (let n = 1; n <= MAX + 1; n++) if (!liste.some(p => p.nom === 'P' + n)) return 'P' + n;
        return 'P' + (liste.length + 1);
    }
    function vide() {
        return { nom: nomLibre(), prof: '', temps: '', methode: 'air', melange: '', altitude: '', intervalle: '', immersion: '' };
    }
    function lireChamps() {
        const p = liste[actif];
        if (!p) return;
        Object.keys(CHAMPS).forEach(k => { const e = $(CHAMPS[k]); if (e) p[k] = e.value; });
    }
    function ecrireChamps(p) {
        Object.keys(CHAMPS).forEach(k => { const e = $(CHAMPS[k]); if (e) e.value = p[k] || ''; });
        const nom = $('pal-nom');
        if (nom) nom.value = p.nom;
    }
    function sauver() {
        try { localStorage.setItem(CLE, JSON.stringify({ v: 1, actif, liste })); } catch (e) { /* stockage indisponible : sans conséquence */ }
    }
    function charger() {
        try {
            const d = JSON.parse(localStorage.getItem(CLE) || 'null');
            if (d && d.v === 1 && Array.isArray(d.liste) && d.liste.length && d.liste.length <= MAX) {
                liste = d.liste.map((p, i) => Object.assign({ nom: 'P' + (i + 1), prof: '', temps: '', methode: 'air', melange: '', altitude: '', intervalle: '', immersion: '' }, p));
                actif = Math.min(Math.max(parseInt(d.actif) || 0, 0), liste.length - 1);
                return true;
            }
        } catch (e) { /* données illisibles : on repart d'une palanquée vide */ }
        return false;
    }

    // Profil, paliers et heure de sortie d'une palanquée, déduits du résultat des paliers (mêmes formules que la vision globale)
    function resume(i) {
        const p = liste[i], d = instantanes[i];
        if (!d || !p.prof || !p.temps) return null;
        const h0 = hhmmEnMinutes(p.immersion);
        return {
            profil: String(p.prof).replace('.', ',') + ' m · ' + p.temps + ' min',
            paliers: (d.partiel || d.sans) ? 'sans palier' : d.paliers.map(([n, m]) => n + ' ' + m + ' min').join(' · '),
            immersion: h0 === null ? '' : p.immersion,
            sortie: (h0 !== null && !d.partiel) ? h0 + d.temps + d.total : null,
            partiel: !!d.partiel
        };
    }

    function rendreOnglets() {
        const z = $('pal-onglets');
        if (!z) return;
        z.innerHTML = liste.map((p, i) => {
            const r = resume(i);
            let petit = 'à saisir';
            if (r) petit = (i !== actif && r.sortie !== null) ? 'sortie ' + heureTexte(r.sortie, true) : r.profil;
            return `<button type="button" role="tab" class="pal-onglet${i === actif ? ' actif' : ''}" aria-selected="${i === actif}" data-i="${i}" style="--pc:${COULEURS[i % COULEURS.length]}"><b>${esc(p.nom)}</b><small>${esc(petit)}</small></button>`;
        }).join('') + `<button type="button" class="pal-onglet pal-plus" id="pal-ajouter" ${liste.length >= MAX ? 'disabled title="8 palanquées au maximum"' : ''}>＋ Palanquée</button>`;
        const act = z.querySelector('.pal-onglet.actif');
        if (act) z.scrollLeft = Math.max(0, act.offsetLeft - (z.clientWidth - act.offsetWidth) / 2);
        const sup = $('pal-supprimer'), dup = $('pal-dupliquer');
        if (sup) { sup.disabled = liste.length <= 1; sup.textContent = 'Supprimer ' + liste[actif].nom; }
        if (dup) { dup.disabled = liste.length >= MAX; dup.textContent = 'Dupliquer ' + liste[actif].nom; }
        const titre = $('pal-titre');
        if (titre) titre.textContent = 'Palanquée ' + liste[actif].nom;
    }

    function rendreSynthese() {
        const bloc = $('pal-synthese');
        if (!bloc) return;
        bloc.hidden = liste.length < 2;
        if (liste.length < 2) return;
        const lignes = liste.map((p, i) => ({ i, p, r: resume(i) }));
        lignes.sort((a, b) => {
            const sa = a.r && a.r.sortie !== null ? a.r.sortie : Infinity, sb = b.r && b.r.sortie !== null ? b.r.sortie : Infinity;
            return sa === sb ? a.i - b.i : sa - sb;
        });
        const premiere = lignes.findIndex(l => l.r && l.r.sortie !== null);
        $('pal-lignes').innerHTML = lignes.map((l, k) => {
            const c = COULEURS[l.i % COULEURS.length];
            if (!l.r) return `<button type="button" class="pal-ligne" data-i="${l.i}"><span class="pal-pastille" style="background:${c}">${l.i + 1}</span><span class="pal-texte"><b>${esc(l.p.nom)}</b><small>Profondeur et temps à saisir</small></span><span class="pal-sortie"><b>—</b></span></button>`;
            const detail = (l.r.immersion ? 'Immersion ' + l.r.immersion + ' · ' : 'Heure d\'immersion à saisir · ') + l.r.paliers;
            const sortie = l.r.sortie !== null ? heureTexte(l.r.sortie, true) : '—';
            const note = l.r.sortie !== null ? 'sortie au plus tôt' : (l.r.partiel ? 'sans palier · sécurité 3 min à 3 m' : 'sortie : saisir l\'immersion');
            return `<button type="button" class="pal-ligne${k === premiere ? ' prochaine' : ''}" data-i="${l.i}"><span class="pal-pastille" style="background:${c}">${l.i + 1}</span><span class="pal-texte"><span class="pal-t1"><b>${esc(l.p.nom)}</b> · ${esc(l.r.profil)}</span><small>${esc(detail)}</small>${k === premiere ? '<em class="pal-badge">Prochaine à sortir</em>' : ''}</span><span class="pal-sortie"><b>${sortie}</b><small>${note}</small></span></button>`;
        }).join('');
    }

    function rendre() { rendreOnglets(); rendreSynthese(); }

    // Appelé après chaque mise à jour de la vision globale : le résultat de la palanquée affichée est à jour
    function apres() {
        if (!pret || enRejeu) return;
        lireChamps();
        instantanes[actif] = (typeof derniereDecompression !== 'undefined' && derniereDecompression) ? Object.assign({}, derniereDecompression) : null;
        sauver();
        rendre();
    }

    async function recalculer() { await calculerPaliers(); }

    async function changer(i) {
        if (i === actif || !liste[i]) return;
        lireChamps();
        actif = i;
        ecrireChamps(liste[i]);
        rendre();
        await recalculer();
    }
    async function ajouter(copie) {
        if (liste.length >= MAX) return;
        lireChamps();
        const base = liste[actif];
        const p = vide();
        if (copie) ['prof', 'temps', 'methode', 'melange', 'altitude', 'intervalle'].forEach(k => { p[k] = base[k]; });
        liste.push(p);
        instantanes.push(null);
        actif = liste.length - 1;
        ecrireChamps(p);
        rendre();
        await recalculer();
    }
    async function supprimer() {
        if (liste.length <= 1) return;
        if (!window.confirm('Supprimer la palanquée ' + liste[actif].nom + ' ?')) return;
        liste.splice(actif, 1);
        instantanes.splice(actif, 1);
        actif = Math.min(actif, liste.length - 1);
        ecrireChamps(liste[actif]);
        rendre();
        await recalculer();
    }
    async function toutEffacer() {
        if (!window.confirm('Effacer toutes les palanquées et repartir de zéro ?')) return;
        liste = [];
        liste = [vide()];
        instantanes = [null];
        actif = 0;
        ecrireChamps(liste[0]);
        rendre();
        await recalculer();
    }

    // Rejoue le calcul de chaque palanquée (mêmes tables, même fonction) pour retrouver tous les résultats
    async function rejouer() {
        enRejeu = true;
        try {
            for (let i = 0; i < liste.length; i++) {
                ecrireChamps(liste[i]);
                derniereDecompression = null;
                try { await calculerPaliersTable(); } catch (e) { /* palanquée non calculable : reste « à saisir » */ }
                instantanes[i] = derniereDecompression ? Object.assign({}, derniereDecompression) : null;
            }
        } finally { enRejeu = false; }
        ecrireChamps(liste[actif]);
        await recalculer();
    }

    async function ouvrir() {
        if (pret) { rendre(); return; }
        if (!$('pal-onglets')) return;
        const memorise = charger();
        if (!memorise) { liste = [vide()]; actif = 0; lireChamps(); }
        instantanes = liste.map(() => null);
        pret = true;
        if (memorise) await rejouer();
        else { instantanes[0] = (typeof derniereDecompression !== 'undefined' && derniereDecompression) ? Object.assign({}, derniereDecompression) : null; rendre(); }
    }

    function brancher() {
        const onglets = $('pal-onglets');
        if (!onglets) return;
        onglets.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b || b.disabled) return;
            if (b.id === 'pal-ajouter') ajouter(false);
            else if (b.dataset.i !== undefined) changer(parseInt(b.dataset.i));
        });
        $('pal-lignes').addEventListener('click', e => {
            const b = e.target.closest('button[data-i]');
            if (b) { changer(parseInt(b.dataset.i)); const h = $('pal-barre'); if (h) h.scrollIntoView({ block: 'start' }); }
        });
        $('pal-dupliquer').addEventListener('click', () => ajouter(true));
        $('pal-supprimer').addEventListener('click', supprimer);
        $('pal-effacer').addEventListener('click', toutEffacer);
        $('pal-nom').addEventListener('input', e => {
            if (!pret) return;
            liste[actif].nom = e.target.value.trim().slice(0, 24) || 'P' + (actif + 1);
            sauver();
            rendre();
        });
    }
    document.addEventListener('DOMContentLoaded', brancher);

    // La vision globale se met à jour après chaque saisie : la palanquée affichée est alors enregistrée et la synthèse rafraîchie
    const origine = window.majVisionGlobale;
    if (typeof origine === 'function') {
        window.majVisionGlobale = function () { const r = origine.apply(this, arguments); apres(); return r; };
    }

    return { ouvrir, MAX };
})();
window.Palanquees = Palanquees;
