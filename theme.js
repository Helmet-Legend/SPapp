// ========== GESTION MODE SOMBRE / CLAIR ==========

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
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
        console.log('🌙 Mode sombre activé');
    } else {
        themeToggle.textContent = '🌙';
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
        if (themeToggle) {
            themeToggle.textContent = '☀️';
        }
        console.log('🌙 Mode sombre: activé (sauvegardé)');
    } else {
        if (themeToggle) {
            themeToggle.textContent = '🌙';
        }
        console.log('☀️ Mode clair: activé (par défaut)');
    }
});
