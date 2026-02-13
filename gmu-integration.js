/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS - Intégration GMU
 * Fichier ADDITIONNEL qui ajoute les boutons GMU sans modifier app.js
 * ═══════════════════════════════════════════════════════════════════════
 */

console.log('🔧 Module GMU Integration chargé');

// ==================== INJECTION DES BOUTONS GMU ====================

// Fonction qui surveille les résultats TMD et ajoute les boutons
function injecterBoutonsGMU() {
    const resultsContainer = document.getElementById('tmdResults');
    
    if (!resultsContainer) {
        console.log('⚠️ Container tmdResults non trouvé');
        return;
    }
    
    // Chercher toutes les cartes de résultats qui n'ont pas déjà un bouton GMU
    const resultCards = resultsContainer.querySelectorAll('.result-box');
    
    resultCards.forEach(card => {
        // Vérifier si le bouton existe déjà
        if (card.querySelector('.btn-gmu')) {
            return; // Déjà ajouté
        }
        
        // Chercher le numéro ONU dans la carte
        const onuElement = card.querySelector('[style*="font-size: 2em"]');
        if (!onuElement) return;
        
        const onu = onuElement.textContent.trim();
        
        // Chercher les autres infos
        const nomElement = card.querySelector('h3');
        const classeElement = card.querySelector('.result-item span:last-child');
        const risquesElement = card.querySelector('.danger-box');
        
        if (!nomElement) return;
        
        const nom = nomElement.textContent.trim();
        const classe = classeElement ? classeElement.textContent.trim() : '';
        const risques = risquesElement ? risquesElement.textContent.replace('⚠️ Risques :', '').trim() : '';
        
        // Chercher le picto
        const pictoElement = card.querySelector('[style*="font-size: 3"]');
        const picto = pictoElement ? pictoElement.textContent.trim() : '⚠️';
        
        // Chercher le code danger
        const dangerElement = card.querySelector('[style*="font-size: 1.2em"]') || 
                              card.querySelector('[style*="font-size: 1.5em"]');
        const danger = dangerElement ? dangerElement.textContent.trim() : '';
        
        // Créer le bouton GMU
        const gmuButton = document.createElement('button');
        gmuButton.className = 'btn-gmu';
        gmuButton.textContent = '📖 Voir la Fiche GMU';
        gmuButton.style.cssText = `
            width: 100%;
            background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%);
            border: none;
            padding: 15px 25px;
            border-radius: 10px;
            color: white;
            font-weight: bold;
            font-size: 1.1em;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(255, 107, 0, 0.4);
            transition: all 0.3s;
            margin-top: 15px;
        `;
        
        // Effets hover
        gmuButton.onmouseover = function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 6px 20px rgba(255, 107, 0, 0.6)';
        };
        gmuButton.onmouseout = function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 15px rgba(255, 107, 0, 0.4)';
        };
        
        // Event click
        gmuButton.onclick = function() {
            afficherFicheGMUDepuisInjection(onu, nom, classe, risques, picto, danger);
        };
        
        // Trouver où insérer le bouton
        const dangerBox = card.querySelector('.danger-box');
        if (dangerBox && dangerBox.parentElement) {
            dangerBox.parentElement.appendChild(gmuButton);
            console.log(`✅ Bouton GMU ajouté pour ONU ${onu}`);
        }
    });
}

// ==================== FONCTION D'AFFICHAGE GMU ====================

function afficherFicheGMUDepuisInjection(onu, nom, classe, risques, picto, danger) {
    console.log(`🔍 Affichage fiche GMU pour ONU ${onu}`);
    
    // Créer l'objet matière
    const matiere = {
        onu: onu,
        nom: nom,
        classe: parseFloat(classe) || 0,
        risques: risques || '',
        picto: picto || '⚠️',
        danger: danger || '00'
    };
    
    // Vérifier que la fonction GMU existe
    if (typeof afficherFicheGMU === 'function') {
        console.log('✅ Fonction afficherFicheGMU disponible');
        afficherFicheGMU(matiere);
    } else {
        console.error('❌ Fonction afficherFicheGMU non disponible');
        alert('⚠️ Le module GMU n\'est pas chargé.\n\nVérifiez que guides-gmu.js et affichage-gmu.js sont bien chargés.');
    }
}

// ==================== SURVEILLANCE DES RÉSULTATS ====================

// Observer quand les résultats TMD changent
const observerConfig = { childList: true, subtree: true };

const observer = new MutationObserver(function(mutations) {
    // Attendre un peu que le DOM se stabilise
    setTimeout(injecterBoutonsGMU, 100);
});

// Démarrer l'observation quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚒 GMU Integration: DOM Ready');
    
    // Injecter immédiatement si des résultats existent déjà
    setTimeout(injecterBoutonsGMU, 500);
    
    // Observer les changements futurs
    const resultsContainer = document.getElementById('tmdResults');
    if (resultsContainer) {
        observer.observe(resultsContainer, observerConfig);
        console.log('✅ Observation des résultats TMD activée');
    } else {
        console.log('⚠️ Container tmdResults non trouvé au chargement');
        // Réessayer après 2 secondes
        setTimeout(function() {
            const container = document.getElementById('tmdResults');
            if (container) {
                observer.observe(container, observerConfig);
                console.log('✅ Observation des résultats TMD activée (2ème tentative)');
            }
        }, 2000);
    }
});

// Fonction manuelle pour forcer l'injection (pour debug)
window.forceInjectGMU = injecterBoutonsGMU;

console.log('✅ Module GMU Integration prêt');
console.log('💡 Pour forcer l\'injection manuellement, tapez: forceInjectGMU()');
