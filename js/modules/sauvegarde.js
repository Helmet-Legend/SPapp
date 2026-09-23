/**
 * DECIOPS - Fenêtre « Enregistrer le calcul »
 */
// Restauré depuis js/app.js (version antérieure au commit 4c28be7 du 17/02/2026).

function openSaveModal() {
    const modal = document.getElementById('saveModal');
    if (modal) modal.style.display = 'flex';
}

function closeSaveModal() {
    const modal = document.getElementById('saveModal');
    if (modal) modal.style.display = 'none';
}

function saveAsPDF() {
    alert('🔧 Fonction d\'export PDF en cours de développement');
    closeSaveModal();
}

function saveAsText() {
    alert('🔧 Fonction d\'export texte en cours de développement');
    closeSaveModal();
}

function saveAsImage() {
    alert('🔧 Fonction d\'export image en cours de développement');
    closeSaveModal();
}
