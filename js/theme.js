/**
 * DECIOPS - Thème (Réglages › Apparence)
 *
 * Deux habillages : « clair » (Clair épuré) et « sombre » (Nuit opérationnelle).
 * Préférence enregistrée sur l'appareil : "auto" (suit le téléphone), "clair" ou "sombre".
 * Sans préférence enregistrée : "clair".
 * Chargé dans <head> pour appliquer le thème avant l'affichage (pas de clignotement).
 */
const Theme = (function() {
    const CLE = 'deciops.theme';
    const PAR_DEFAUT = 'clair';
    const COULEUR_BARRE = { clair: '#F3F4F6', sombre: '#0D0E10' };
    const sombreSysteme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function lirePreference() {
        try {
            const pref = localStorage.getItem(CLE);
            if (pref === 'auto' || pref === 'clair' || pref === 'sombre') return pref;
            // Reprise des anciens réglages (bouton 🌙 des versions précédentes)
            if (localStorage.getItem('theme') === 'dark' || localStorage.getItem('darkMode') === 'enabled') return 'sombre';
        } catch (e) { /* stockage indisponible */ }
        // « Clair » par défaut tant que toutes les fiches ne sont pas adaptées au thème sombre
        // (étape 2 de la refonte) ; « Automatique » reste proposé dans Réglages.
        return PAR_DEFAUT;
    }

    function themeEffectif(pref) {
        if (pref === 'clair' || pref === 'sombre') return pref;
        return sombreSysteme && sombreSysteme.matches ? 'sombre' : 'clair';
    }

    function appliquer() {
        const pref = lirePreference();
        const theme = themeEffectif(pref);
        const racine = document.documentElement;
        racine.dataset.theme = theme;
        racine.dataset.themePreference = pref;
        racine.style.colorScheme = theme === 'sombre' ? 'dark' : 'light';
        // Les anciennes fiches s'appuient sur body.dark-mode pour leurs variantes sombres
        if (document.body) document.body.classList.toggle('dark-mode', theme === 'sombre');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', COULEUR_BARRE[theme]);
        document.querySelectorAll('[data-theme-choix]').forEach(b => {
            b.setAttribute('aria-checked', b.dataset.themeChoix === pref ? 'true' : 'false');
        });
        return theme;
    }

    function choisir(pref) {
        try { localStorage.setItem(CLE, pref); } catch (e) { /* stockage indisponible */ }
        return appliquer();
    }

    appliquer();
    document.addEventListener('DOMContentLoaded', appliquer);
    if (sombreSysteme) {
        const suivre = () => { if (lirePreference() === 'auto') appliquer(); };
        if (sombreSysteme.addEventListener) sombreSysteme.addEventListener('change', suivre);
        else if (sombreSysteme.addListener) sombreSysteme.addListener(suivre);
    }

    return { choisir, appliquer, preference: lirePreference, actuel: () => themeEffectif(lirePreference()) };
})();

// ---------- Fenêtre Réglages ----------
function ouvrirReglages() {
    const fenetre = document.getElementById('reglagesModal');
    if (!fenetre) return;
    Theme.appliquer();
    fenetre.hidden = false;
    fenetre.querySelector('[aria-checked="true"]')?.focus();
}

function fermerReglages() {
    const fenetre = document.getElementById('reglagesModal');
    if (fenetre) fenetre.hidden = true;
}

document.addEventListener('click', function(e) {
    const choix = e.target.closest('[data-theme-choix]');
    if (choix) Theme.choisir(choix.dataset.themeChoix);
    if (e.target.id === 'reglagesModal') fermerReglages();
});

document.addEventListener('keydown', function(e) {
    const fenetre = document.getElementById('reglagesModal');
    if (e.key === 'Escape' && fenetre && !fenetre.hidden) fermerReglages();
});
