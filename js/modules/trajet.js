/**
 * DECIOPS - Calculateur de temps de trajet
 */
// Restauré depuis js/app.js (version antérieure au commit 4c28be7 du 17/02/2026).

let vitesseSelectionnee = 50;

function selectVitesse(vitesse) {
    vitesseSelectionnee = vitesse;
    
    // Mettre à jour l'affichage des boutons
    const buttons = document.querySelectorAll('.vitesse-btn');
    buttons.forEach(btn => {
        // Retirer l'effet de sélection
        btn.style.boxShadow = btn.style.boxShadow.replace('0 0 0 4px rgba(229, 57, 53, 0.3), ', '');
        btn.style.transform = 'scale(1)';
    });
    
    // Ajouter l'effet de sélection au bouton cliqué
    const selectedBtn = document.querySelector(`.vitesse-btn[data-vitesse="${vitesse}"]`);
    if (selectedBtn) {
        selectedBtn.style.boxShadow = '0 0 0 4px rgba(229, 57, 53, 0.3), ' + selectedBtn.style.boxShadow;
        selectedBtn.style.transform = 'scale(1.05)';
    }
    
    // Recalculer le trajet
    calculateTrajet();
}

function calculateTrajet() {
    const distance = parseFloat(document.getElementById('trajet-distance')?.value || 0);
    
    if (distance <= 0) {
        return;
    }
    
    // Calcul du temps en heures
    const tempsHeures = distance / vitesseSelectionnee;
    
    // Conversion en heures et minutes
    const heures = Math.floor(tempsHeures);
    const minutes = Math.round((tempsHeures - heures) * 60);
    
    // Affichage du temps
    let tempsTexte = '';
    if (heures > 0) {
        tempsTexte = `${heures}h ${minutes}min`;
    } else {
        tempsTexte = `${minutes}min`;
    }
    
    // Si moins d'une minute
    if (heures === 0 && minutes === 0) {
        const secondes = Math.round(tempsHeures * 3600);
        tempsTexte = `${secondes}s`;
    }
    
    // Mise à jour de l'affichage
    const tempsDisplay = document.getElementById('trajet-temps');
    const distDisplay = document.getElementById('trajet-dist-display');
    const vitesseDisplay = document.getElementById('trajet-vitesse-display');
    
    if (tempsDisplay) tempsDisplay.textContent = tempsTexte;
    if (distDisplay) distDisplay.textContent = `${distance.toFixed(1)} km`;
    if (vitesseDisplay) vitesseDisplay.textContent = `${vitesseSelectionnee} km/h`;
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('trajet-distance')) {
        calculateTrajet();
    }
});
