/**
 * ═══════════════════════════════════════════════════════════════════════
 * Vulcain - Intégration GMU
 * Fichier ADDITIONNEL qui ajoute les boutons GMU sans modifier app.js
 * ═══════════════════════════════════════════════════════════════════════
 */

console.log('🔧 Module GMU Integration chargé');

// ==================== INJECTION DES BOUTONS GMU ====================

function injecterBoutonsGMU() {
    const resultsContainer = document.getElementById('tmdResults');
    
    if (!resultsContainer) {
        console.log('⚠️ Container tmdResults non trouvé');
        return;
    }
    
    const resultCards = resultsContainer.querySelectorAll('.result-box');
    
    resultCards.forEach(card => {
        if (card.querySelector('.btn-gmu')) {
            return;
        }
        
        const onuElement = card.querySelector('[style*="font-size: 2em"]');
        if (!onuElement) return;
        
        const onu = onuElement.textContent.trim();
        const nomElement = card.querySelector('h3');
        if (!nomElement) return;
        
        const nom = nomElement.textContent.trim();
        
        // Récupérer la classe depuis le texte
        const classeText = card.textContent.match(/Classe\s*:\s*(\d+\.?\d*)/);
        const classe = classeText ? classeText[1] : '0';
        
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
        
        gmuButton.onmouseover = function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 6px 20px rgba(255, 107, 0, 0.6)';
        };
        gmuButton.onmouseout = function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 15px rgba(255, 107, 0, 0.4)';
        };
        
        gmuButton.onclick = function() {
            afficherFicheGMUDepuisInjection(onu, nom, classe);
        };
        
        const dangerBox = card.querySelector('.danger-box');
        if (dangerBox && dangerBox.parentElement) {
            dangerBox.parentElement.appendChild(gmuButton);
            console.log(`✅ Bouton GMU ajouté pour ONU ${onu}`);
        }
    });
}

// ==================== FONCTION D'AFFICHAGE GMU ====================

function afficherFicheGMUDepuisInjection(onu, nom, classe) {
    console.log(`🔍 Affichage fiche GMU pour ONU ${onu}`);
    
    if (typeof afficherFicheGMU === 'function') {
        console.log('✅ Fonction afficherFicheGMU disponible');
        
        // ✅ CORRECTION: Récupérer le HTML et l'injecter dans la page
        const ficheHTML = afficherFicheGMU(onu, nom, classe);
        const container = document.getElementById('tmdResults');
        
        if (container && ficheHTML) {
            container.innerHTML = `
                <button onclick="searchTMD()" style="margin-bottom:20px; padding:12px; background:#444; color:white; border:none; border-radius:8px; cursor:pointer;">← Retour aux résultats</button>
                ${ficheHTML}
            `;
            window.scrollTo(0, 0);
            console.log('✅ Fiche GMU affichée');
        } else {
            console.error('❌ Container non trouvé ou HTML vide');
        }
    } else {
        console.error('❌ Fonction afficherFicheGMU non disponible');
        alert('⚠️ Le module GMU n\'est pas chargé.');
    }
}

// ==================== SURVEILLANCE DES RÉSULTATS ====================

const observerConfig = { childList: true, subtree: true };

const observer = new MutationObserver(function(mutations) {
    setTimeout(injecterBoutonsGMU, 100);
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚒 GMU Integration: DOM Ready');
    
    setTimeout(injecterBoutonsGMU, 500);
    
    const resultsContainer = document.getElementById('tmdResults');
    if (resultsContainer) {
        observer.observe(resultsContainer, observerConfig);
        console.log('✅ Observation des résultats TMD activée');
    } else {
        setTimeout(function() {
            const container = document.getElementById('tmdResults');
            if (container) {
                observer.observe(container, observerConfig);
                console.log('✅ Observation des résultats TMD activée (2ème tentative)');
            }
        }, 2000);
    }
});

window.forceInjectGMU = injecterBoutonsGMU;

console.log('✅ Module GMU Integration prêt');
