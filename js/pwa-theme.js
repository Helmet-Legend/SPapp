/**
 * DECIOPS - Service worker et installation PWA
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('🚒 DECIOPS: Service Worker enregistré avec succès');
            })
            .catch(error => {
                console.log('🚒 DECIOPS: Erreur Service Worker:', error);
            });
    });
}

// Gestion de l'installation PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Afficher un bouton d'installation si souhaité
    console.log('🚒 DECIOPS: Application installable');
});

// Thème clair / sombre : voir js/theme.js (Réglages)
