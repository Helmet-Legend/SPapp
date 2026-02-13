/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS v1.9.4 - Version Corrigée avec GMU Fonctionnel
 * ═══════════════════════════════════════════════════════════════════════
 */

// ==================== VARIABLES GLOBALES ====================
let fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
let firePowers = {fenetre: 2, porte: 4, baie: 8.4, garage: 11, entrepot: 36};
let tronconsPerte = [];
let currentConversionType = null;
let gazSelectionne = null;

let tmdDatabase = [];
let densityData = [];
let gazDatabase = {};
let modulesData = [];
let conversionData = {};
let gazBouteillesData = {};
let appConfig = {};

// ==================== INITIALISATION ====================
async function initApp() {
    console.log('🚒 DECIOPS v1.9.4 - Initialisation...');
    
    try {
        const data = await DataLoader.loadAll();
        
        tmdDatabase = data.tmd || [];
        densityData = data.densites || [];
        gazDatabase = data.gaz || {};
        modulesData = data.modules || [];
        conversionData = data.conversions || {};
        gazBouteillesData = data.gaz_bouteilles || {};
        appConfig = data.config || {};
        
        if (appConfig.firePowers) {
            firePowers = appConfig.firePowers;
        }
        
        console.log(`✅ TMD chargés: ${tmdDatabase.length} produits`);
        console.log(`✅ Densités: ${densityData.length} matériaux`);
        
        initializeApp();
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        initializeApp();
    }
}

function initializeApp() {
    // Mode sombre
    try {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'enabled') {
            document.body.classList.add('dark-mode');
        }
    } catch (e) {
        console.log("Mode sombre : localStorage non disponible");
    }
    
    // Mise à jour de l'icône (avec protection)
    setTimeout(updateDarkModeIcon, 100);
    
    // Restaurer sections
    setTimeout(function() {
        try {
            if (typeof restoreSectionsState === "function") {
                restoreSectionsState();
            }
        } catch (e) {
            console.log("Sections : Mémoire non disponible");
        }
    }, 100);
    
    setupEventListeners();
    showModule('home');
    
    console.log('🚒 DECIOPS prêt!');
    console.log('✅ Version: 1.9.4');
}

function setupEventListeners() {
    // Initialiser l'explosimétrie si présente
    if (document.getElementById('gazPresentsGrid')) {
        if (typeof initExplosimetrie === 'function') {
            initExplosimetrie();
        }
    }
    
    // Initialiser les listes PATRAC DR
    if (document.getElementById('listeVehiculesEquipages')) {
        if (typeof afficherVehiculesEquipages === 'function') {
            afficherVehiculesEquipages();
        }
    }
    if (document.getElementById('listeCA')) {
        if (typeof afficherCA === 'function') {
            afficherCA();
        }
    }
}

document.addEventListener('DOMContentLoaded', initApp);

// ==================== NAVIGATION ====================
function showModule(moduleName) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const module = document.getElementById(moduleName);
    if (module) {
        module.classList.add('active');
        window.scrollTo(0, 0);
        
        // Initialiser certains calculs si nécessaire
        if (moduleName === 'distance-calc' && typeof calculateDistanceCalc === 'function') {
            calculateDistanceCalc();
        }
        if (moduleName === 'ari' && typeof calculerAutonomieARI === 'function') {
            calculerAutonomieARI();
        }
    }
    
    const homeButton = document.getElementById('homeButton');
    const globalSearch = document.getElementById('globalSearch');
    
    if (moduleName === 'home') {
        if (homeButton) homeButton.style.display = 'none';
        if (globalSearch) globalSearch.style.display = 'block';
    } else {
        if (homeButton) homeButton.style.display = 'block';
        if (globalSearch) globalSearch.style.display = 'none';
    }
}

// ==================== MODULE TMD - VERSION CORRIGÉE ====================
function searchTMD() {
    const onuInput = document.getElementById('searchONU')?.value.trim().toLowerCase() || '';
    const nameInput = document.getElementById('searchName')?.value.trim().toLowerCase() || '';
    const classeFilter = document.getElementById('filterClasse')?.value || '';
    
    let results = tmdDatabase.filter(item => {
        const matchONU = !onuInput || item.onu?.toString().includes(onuInput);
        const matchName = !nameInput || item.nom?.toLowerCase().includes(nameInput);
        const matchClasse = !classeFilter || item.classe?.toString() === classeFilter;
        return matchONU && matchName && matchClasse;
    });
    
    const resultsContainer = document.getElementById('tmdResults');
    if (!resultsContainer) return;
    
    // Mise à jour des compteurs
    const totalElement = document.getElementById('tmdTotal');
    const foundElement = document.getElementById('tmdFound');
    if (totalElement) totalElement.textContent = tmdDatabase.length;
    if (foundElement) foundElement.textContent = results.length;
    
    // Aucun résultat
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="alert-box">Aucun résultat trouvé</div>';
        return;
    }
    
    // Limiter à 30 résultats
    if (results.length > 30) {
        results = results.slice(0, 30);
    }
    
    // Vider le conteneur
    resultsContainer.innerHTML = '';
    
    // Créer les cartes de résultats
    results.forEach(item => {
        // Couleur de bordure selon la classe
        let borderColor = '#FF9800';
        if (item.classe === 1) borderColor = '#FF9800';
        else if (item.classe === 2) borderColor = '#00aaff';
        else if (item.classe === 3) borderColor = '#ff0000';
        else if (item.classe >= 4 && item.classe < 5) borderColor = '#ff6600';
        else if (item.classe >= 5 && item.classe < 6) borderColor = '#00ccff';
        else if (item.classe === 6.1) borderColor = '#cc00ff';
        else if (item.classe === 7) borderColor = '#ffaa00';
        else if (item.classe === 8) borderColor = '#ffff00';
        
        // Affichage du code danger
        const dangerDisplay = item.classe === 1 ? 'Pas de code' : (item.danger || '--');
        
        // Créer la carte
        const resultCard = document.createElement('div');
        resultCard.className = 'result-box';
        resultCard.style.borderLeft = `10px solid ${borderColor}`;
        
        resultCard.innerHTML = `
            <div style="display: flex; gap: 20px; align-items: start;">
                <div style="text-align: center; min-width: 90px;">
                    <div style="font-size: 3.5em; margin-bottom: 5px;">${item.picto || '⚠️'}</div>
                    <div style="background: #FF9800; color: #000; padding: 10px; border-radius: 5px; font-weight: bold; border: 2px solid #000;">
                        <div style="font-size: 1.2em; border-bottom: 2px solid #000; margin-bottom: 5px; padding-bottom: 5px;">
                            ${dangerDisplay}
                        </div>
                        <div style="font-size: 2em;">${item.onu}</div>
                    </div>
                </div>
                <div class="tmd-info-content" style="flex: 1;">
                    <h3 style="color: var(--warning); margin: 0 0 10px 0; font-size: 1.6em;">
                        ${item.nom}
                    </h3>
                    <div class="result-item">
                        <span>Classe :</span>
                        <span>${item.classe}</span>
                    </div>
                    <div class="danger-box" style="margin-top: 10px;">
                        <strong>⚠️ Risques :</strong> ${item.risques || 'Non renseignés'}
                    </div>
                </div>
            </div>
        `;
        
        // ✅ INJECTION DU BOUTON GMU
        const gmuButton = document.createElement('button');
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
        
        // ✅ EVENT HANDLER CORRECT
        gmuButton.onclick = function() {
            afficherFicheTMD(item.onu, item.nom, item.classe, item.risques, item.picto, item.danger);
        };
        
        // Ajouter le bouton à la carte
        const infoContent = resultCard.querySelector('.tmd-info-content');
        if (infoContent) {
            infoContent.appendChild(gmuButton);
        }
        
        // Ajouter la carte au conteneur
        resultsContainer.appendChild(resultCard);
    });
}

// ✅ FONCTION WRAPPER POUR AFFICHER LA FICHE GMU
function afficherFicheTMD(onu, nom, classe, risques, picto, danger) {
    // Créer l'objet matière
    const matiere = {
        onu: onu,
        nom: nom,
        classe: classe,
        risques: risques || '',
        picto: picto || '⚠️',
        danger: danger || '00'
    };
    
    // Vérifier que la fonction GMU existe
    if (typeof afficherFicheGMU === 'function') {
        afficherFicheGMU(matiere);
    } else {
        alert('⚠️ Le module GMU n\'est pas chargé.\n\nVérifiez que guides-gmu.js et affichage-gmu.js sont bien présents dans le dossier et chargés dans index.html');
        console.error('❌ afficherFicheGMU non disponible');
    }
}

// ==================== MODULE PUISSANCE FEU ====================
function selectFireSource(type) {
    const maxSelections = {fenetre: 10, porte: 5, baie: 3, garage: 2, entrepot: 1};
    
    if (fireSelection[type] < maxSelections[type]) {
        fireSelection[type]++;
    } else {
        fireSelection[type] = 0;
    }
    
    const counter = document.getElementById(`count-${type}`);
    if (counter) {
        counter.textContent = fireSelection[type];
        counter.style.display = fireSelection[type] > 0 ? 'block' : 'none';
    }
    
    calculateFirePower();
}

function calculateFirePower() {
    let totalPower = 0;
    for (let type in fireSelection) {
        totalPower += fireSelection[type] * firePowers[type];
    }
    
    // Calcul : 1.4 MW = 100 L/min
    const debitNecessaire = (totalPower / 1.4) * 100;
    
    // Colorisation
    let debitColor = '';
    let debitBgColor = '';
    let borderColor = '';
    
    if (debitNecessaire <= 500) {
        debitColor = '#4CAF50';
        debitBgColor = 'rgba(76, 175, 80, 0.25)';
        borderColor = '#4CAF50';
    } else if (debitNecessaire <= 1000) {
        debitColor = '#FF9800';
        debitBgColor = 'rgba(255, 152, 0, 0.25)';
        borderColor = '#FF9800';
    } else {
        debitColor = '#F44336';
        debitBgColor = 'rgba(244, 67, 54, 0.25)';
        borderColor = '#F44336';
    }
    
    // Mise à jour affichage
    const totalPowerElement = document.getElementById('totalPower');
    const flowRateElement = document.getElementById('flowRate');
    const flowRateItemElement = document.getElementById('flowRateItem');
    
    if (totalPowerElement) {
        totalPowerElement.textContent = `${totalPower.toFixed(1)} MW`;
    }
    
    if (flowRateElement) {
        flowRateElement.textContent = `${debitNecessaire.toFixed(0)} L/min`;
        flowRateElement.style.color = debitColor;
    }
    
    if (flowRateItemElement) {
        flowRateItemElement.style.background = debitBgColor;
        flowRateItemElement.style.borderColor = borderColor;
        flowRateItemElement.style.borderWidth = '5px';
        flowRateItemElement.style.borderStyle = 'solid';
        flowRateItemElement.style.boxShadow = `0 0 25px ${borderColor}40`;
    }
}

function resetFire() {
    fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
    
    for (let type in fireSelection) {
        const counter = document.getElementById(`count-${type}`);
        if (counter) {
            counter.textContent = '0';
            counter.style.display = 'none';
        }
    }
    
    const totalPowerElement = document.getElementById('totalPower');
    const flowRateElement = document.getElementById('flowRate');
    const flowRateItemElement = document.getElementById('flowRateItem');
    
    if (totalPowerElement) totalPowerElement.textContent = '0 MW';
    
    if (flowRateElement) {
        flowRateElement.textContent = '0 L/min';
        flowRateElement.style.color = 'var(--text-primary)';
    }
    
    if (flowRateItemElement) {
        flowRateItemElement.style.background = 'var(--bg-elevated)';
        flowRateItemElement.style.borderColor = 'var(--border-medium)';
        flowRateItemElement.style.borderWidth = '4px';
        flowRateItemElement.style.boxShadow = 'var(--shadow-lg)';
    }
}

// ==================== MODULE ARI ====================
function calculerAutonomieARI() {
    const pression = parseFloat(document.getElementById('pressionARI')?.value || 300);
    const volume = parseFloat(document.getElementById('volumeARI')?.value || 9);
    const conso = parseFloat(document.getElementById('consoARI')?.value || 100);
    const securite = parseFloat(document.getElementById('securiteARI')?.value || 55);
    
    // Calculs
    const volumeAirTotal = pression * volume;
    const autonomieTotale = volumeAirTotal / conso;
    const miTemps = autonomieTotale / 2;
    const pressionUtilisable = pression - securite;
    const volumeAirUtilisable = pressionUtilisable * volume;
    const tempsSifflet = volumeAirUtilisable / conso;
    
    // Affichage
    const resultsDiv = document.getElementById('resultatsARI');
    if (resultsDiv) {
        resultsDiv.style.display = 'block';
        
        const elem = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        
        elem('pressionUtilisable', pressionUtilisable.toFixed(0) + ' bar');
        elem('volumeAir', volumeAirTotal.toFixed(0) + ' L');
        elem('autonomieTotale', autonomieTotale.toFixed(0) + ' min');
        elem('miTemps', miTemps.toFixed(0) + ' min');
        elem('tempsSifflet', tempsSifflet.toFixed(0) + ' min');
        
        elem('autonomieExacte', '(Exact: ' + autonomieTotale.toFixed(2) + ' min)');
        elem('miTempsExact', '(Exact: ' + miTemps.toFixed(2) + ' min)');
        elem('tempsSiffletExact', '(Exact: ' + tempsSifflet.toFixed(2) + ' min)');
    }
    
    // Alerte pression basse
    const alerteDiv = document.getElementById('alertePressioBasse');
    if (alerteDiv) {
        alerteDiv.style.display = pression < 270 ? 'block' : 'none';
    }
}

function setBouteilleARI(volume) {
    const volumeInput = document.getElementById('volumeARI');
    if (volumeInput) {
        volumeInput.value = volume;
    }
    
    // Mise à jour visuelle des boutons
    const buttons = {
        6: 'btnBout6',
        7.2: 'btnBout7',
        9: 'btnBout9'
    };
    
    for (const [vol, btnId] of Object.entries(buttons)) {
        const btn = document.getElementById(btnId);
        if (btn) {
            if (parseFloat(vol) === volume) {
                btn.style.background = 'linear-gradient(135deg, #A5D6A7 0%, #81C784 100%)';
                btn.style.borderWidth = '4px';
                btn.style.boxShadow = '0 0 25px rgba(129, 199, 132, 0.8)';
                btn.style.transform = 'scale(1.08)';
            } else {
                btn.style.background = 'linear-gradient(135deg, #81C784 0%, #66BB6A 100%)';
                btn.style.borderWidth = '3px';
                btn.style.boxShadow = '0 4px 12px rgba(102, 187, 106, 0.3)';
                btn.style.transform = 'scale(1)';
            }
        }
    }
    
    calculerAutonomieARI();
}

function adjustPressionARI(delta) {
    const input = document.getElementById('pressionARI');
    if (input) {
        let value = parseFloat(input.value) + delta;
        value = Math.max(0, Math.min(300, value));
        input.value = value;
        calculerAutonomieARI();
    }
}

function adjustConsoARI(delta) {
    const input = document.getElementById('consoARI');
    if (input) {
        let value = parseFloat(input.value) + delta;
        value = Math.max(40, Math.min(150, value));
        input.value = value;
        calculerAutonomieARI();
    }
}

function adjustSecuriteARI(delta) {
    const input = document.getElementById('securiteARI');
    if (input) {
        let value = parseFloat(input.value) + delta;
        value = Math.max(40, Math.min(100, value));
        input.value = value;
        calculerAutonomieARI();
    }
}

// ==================== UI - MODE SOMBRE ====================
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    
    try {
        localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    } catch (e) {
        console.log('localStorage non disponible');
    }
    
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const icon = document.getElementById('dark-mode-icon');
    if (!icon) {
        console.log('⚠️ Élément dark-mode-icon non trouvé dans le HTML');
        return;
    }
    icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

// ==================== UI - SECTIONS PLIABLES ====================
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const arrow = document.getElementById('arrow-' + sectionId);
    
    if (!section) return;
    
    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        if (arrow) arrow.classList.remove('rotated');
    } else {
        section.classList.add('collapsed');
        if (arrow) arrow.classList.add('rotated');
    }
    
    // Sauvegarder l'état
    try {
        const collapsedSections = JSON.parse(localStorage.getItem('collapsedSections') || '[]');
        if (section.classList.contains('collapsed')) {
            if (!collapsedSections.includes(sectionId)) {
                collapsedSections.push(sectionId);
            }
        } else {
            const index = collapsedSections.indexOf(sectionId);
            if (index > -1) {
                collapsedSections.splice(index, 1);
            }
        }
        localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
    } catch (e) {
        console.log('localStorage non disponible');
    }
}

function restoreSectionsState() {
    try {
        const collapsedSections = JSON.parse(localStorage.getItem('collapsedSections') || '[]');
        collapsedSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            const arrow = document.getElementById('arrow-' + sectionId);
            if (section && arrow) {
                section.classList.add('collapsed');
                arrow.classList.add('rotated');
            }
        });
    } catch (e) {
        console.log('localStorage non disponible');
    }
}

// ==================== UI - MODALES ====================
function toggleAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.classList.toggle('active');
    }
}

function closeAboutIfOutside(event) {
    if (event.target.id === 'aboutModal') {
        toggleAbout();
    }
}

// Fermer avec Échap
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('aboutModal');
        if (modal && modal.classList.contains('active')) {
            toggleAbout();
        }
    }
});

console.log('✅ app.js v1.9.4 chargé avec succès');
