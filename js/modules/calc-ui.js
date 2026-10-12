/**
 * Vulcain - Habillage commun des calculateurs (refonte graphique).
 * Ajoute la classe « calc-refonte » aux calculateurs concernés (le CSS fait le reste) et affiche une barre
 * fixe avec le résultat principal pendant la saisie. Ne touche ni aux calculs, ni aux champs, ni aux images.
 */
var CalcUI = (function () {
    // id du calculateur -> résultats possibles (le premier visible et renseigné est affiché)
    var CALCULS = {
        ari: [['Autonomie totale', 'autonomieTotale']],
        pertes: [['Pression à la pompe', 'pressionPompeValue']],
        fire: [['Puissance totale', 'totalPower']],
        emulseur: [['Émulseur', 'emuResultatPrincipal'], ['Émulseur', 'emuInverseResultatPrincipal']],
        'feu-foret': [['Résultat', 'feu-foret-result']],
        explosimetrie: [['Valeur corrigée', 'valeurCorrigee']],
        'suap-wallace-calc': [['Surface cutanée brûlée', 'wallaceTotalPct']],
        'sal-calculateur': [['Paliers MT 2012', 'calc-resultat']],
        'lspcc-calculateur': [['Facteur de chute', 'lspcc-resultat']],
        convertisseur: [['Conversion', conversion]],
        abaque: [['Volume', 'abaque-volume-display']],
        'distance-calc': [['Temps de trajet', 'trajet-temps']],
        epuisement: [['Volume d\'eau', 'volumeEau']]
    };
    // Habillage seul (formulaires sans résultat unique à rappeler)
    var HABILLAGE_SEUL = ['fdf-ambiance', 'ia-manoeuvre'];
    // Conversion : « 10 bar = 145.04 psi » (value2 est un texte, value1 un champ)
    function conversion() {
        var v1 = document.getElementById('value1'), v2 = document.getElementById('value2'), u1 = document.getElementById('unit1'), u2 = document.getElementById('unit2');
        if (!v1 || !v2 || !u1 || !u2 || !v1.getClientRects().length || v1.value === '') return '';
        var r = (v2.textContent || '').trim();
        if (!r || r === '--') return '';
        var nom = function (u) { return u.options && u.selectedIndex >= 0 ? u.options[u.selectedIndex].text : u.value; };
        return v1.value + ' ' + nom(u1) + ' = ' + r + ' ' + nom(u2);
    }
    var barre = null, actif = null, observateur = null;

    function texteDe(el) {
        if (!el || !el.getClientRects().length) return '';
        var t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        return /^([–—-]|0\s*%)?$/.test(t) ? '' : t;
    }
    function creerBarre() {
        barre = document.createElement('div');
        barre.className = 'calc-dock';
        barre.hidden = true;
        barre.setAttribute('role', 'status');
        barre.innerHTML = '<div class="calc-dock-texte"><small></small><b></b></div><button type="button" class="calc-dock-copier">Copier</button>';
        barre.querySelector('button').addEventListener('click', copier);
        document.body.appendChild(barre);
    }
    function copier() {
        if (!barre) return;
        var t = barre.querySelector('small').textContent + ' : ' + barre.querySelector('b').textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { if (window.showNotification) showNotification('Résultat copié'); }, function () { if (window.showNotification) showNotification(t); });
        else if (window.showNotification) showNotification(t);
    }
    function majBarre() {
        if (!barre) return;
        var valeur = '', libelle = '';
        if (actif) {
            var liste = CALCULS[actif];
            for (var i = 0; i < liste.length && !valeur; i++) {
                var t = typeof liste[i][1] === 'function' ? liste[i][1]() : texteDe(document.getElementById(liste[i][1]));
                if (t) { valeur = t; libelle = liste[i][0]; }
            }
        }
        barre.hidden = !valeur;
        document.body.classList.toggle('calc-dock-actif', !!valeur);
        if (valeur) {
            barre.classList.toggle('long', valeur.length > 22);
            barre.querySelector('small').textContent = libelle;
            barre.querySelector('b').textContent = valeur.length > 60 ? valeur.slice(0, 58) + '…' : valeur;
        }
    }
    function surChangementEcran() {
        var m = document.querySelector('.module.active');
        actif = m && CALCULS[m.id] ? m.id : null;
        majBarre();
    }

    // Surveille seulement les six calculateurs (jamais la barre elle-même) et regroupe les mises à jour
    var planifie = false;
    function planifier() {
        if (planifie) return;
        planifie = true;
        requestAnimationFrame(function () { planifie = false; surChangementEcran(); });
    }
    document.addEventListener('DOMContentLoaded', function () {
        creerBarre();
        observateur = new MutationObserver(planifier);
        Object.keys(CALCULS).concat(HABILLAGE_SEUL).forEach(function (id) {
            var m = document.getElementById(id);
            if (!m) return;
            m.classList.add('calc-refonte');
            if (!CALCULS[id]) return;
            // Les valeurs saisies ou calculées dans un champ ne sont pas des mutations du DOM : on écoute aussi la saisie
            m.addEventListener('input', planifier, true);
            m.addEventListener('change', planifier, true);
            observateur.observe(m, { attributes: true, attributeFilter: ['class', 'style'], childList: true, characterData: true, subtree: true });
        });
        surChangementEcran();
    });
    return { majBarre: majBarre };
})();
