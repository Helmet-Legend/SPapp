/**
 * Vulcain - Service worker et installation PWA
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('🚒 Vulcain: Service Worker enregistré avec succès');
            })
            .catch(error => {
                console.log('🚒 Vulcain: Erreur Service Worker:', error);
            });
    });
}

// Installation PWA : bouton « Installer Vulcain » sur l'accueil.
// Une vraie installation évite le simple raccourci Chrome (petit logo Chrome sur l'icône).
let deferredPrompt;
function afficherBanniereInstall(visible) {
    const banniere = document.getElementById('installBanniere');
    if (banniere) banniere.hidden = !visible;
}
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    afficherBanniereInstall(true);
});
window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    afficherBanniereInstall(false);
});
async function installerVulcain() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    afficherBanniereInstall(false);
}

// Thème clair / sombre : voir js/theme.js (Réglages)
