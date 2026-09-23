/**
 * DECIOPS - Service worker, installation PWA et thème clair/sombre
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

// ========== GESTION MODE SOMBRE / CLAIR ==========

// Fonction pour basculer le thème
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');

    // Animation du bouton
    themeToggle.classList.add('switching');
    setTimeout(() => {
        themeToggle.classList.remove('switching');
    }, 500);

    // Basculer la classe
    body.classList.toggle('dark-mode');

    // Mettre à jour l'icône et sauvegarder
    if (body.classList.contains('dark-mode')) {
        themeToggle.textContent = '☀️'; // Soleil en mode sombre
        localStorage.setItem('theme', 'dark');
        console.log('🌙 Mode sombre activé');
    } else {
        themeToggle.textContent = '🌙'; // Lune en mode clair
        localStorage.setItem('theme', 'light');
        console.log('☀️ Mode clair activé');
    }
}

// Charger le thème sauvegardé au démarrage
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
        console.log('🌙 Mode sombre: activé (sauvegardé)');
    } else {
        themeToggle.textContent = '🌙';
        console.log('☀️ Mode clair: activé (par défaut)');
    }
});
