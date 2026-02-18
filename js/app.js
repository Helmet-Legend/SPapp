/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS v1.9.8 - Outil d'aide à la décision opérationnelle
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
    console.log('🚒 DECIOPS v1.9.8 - Initialisation...');
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
        initializeApp();
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        initializeApp();
    }
}

function initializeApp() {
    try {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'enabled') document.body.classList.add('dark-mode');
    } catch (e) { console.log("Mode sombre indisponible"); }
    
    setTimeout(updateDarkModeIcon, 100);
    setTimeout(() => { if (typeof restoreSectionsState === "function") restoreSectionsState(); }, 100);
    
    setupEventListeners();
    showModule('home');
    console.log('✅ Version: 1.9.8 prête');
}

function setupEventListeners() {
    if (document.getElementById('gazPresentsGrid') && typeof initExplosimetrie === 'function') initExplosimetrie();
    if (document.getElementById('listeVehiculesEquipages') && typeof afficherVehiculesEquipages === 'function') afficherVehiculesEquipages();
}

document.addEventListener('DOMContentLoaded', initApp);

// ==================== NAVIGATION ====================
function showModule(moduleName) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const module = document.getElementById(moduleName);
    if (module) {
        module.classList.add('active');
        window.scrollTo(0, 0);
    }
    const homeBtn = document.getElementById('homeButton');
    const searchBar = document.getElementById('globalSearch');
    if (moduleName === 'home') {
        if (homeBtn) homeBtn.style.display = 'none';
        if (searchBar) searchBar.style.display = 'block';
    } else {
        if (homeBtn) homeBtn.style.display = 'block';
        if (searchBar) searchBar.style.display = 'none';
    }
}

// ==================== MODULE TMD ENRICHI ====================
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
    
    resultsContainer.innerHTML = results.length === 0 ? '<div class="alert-box">Aucun résultat trouvé</div>' : '';
    
    results.slice(0, 30).forEach(item => {
        const classColors = {'1': '#FF9800', '2': '#00aaff', '3': '#ff0000', '4': '#ff6600', '5': '#00ccff', '6.1': '#cc00ff', '7': '#ffaa00', '8': '#ffff00'};
        let borderColor = classColors[item.classe] || '#FF9800';
        
        const resultCard = document.createElement('div');
        resultCard.className = 'result-box';
        resultCard.style.borderLeft = `10px solid ${borderColor}`;
        
        resultCard.innerHTML = `
            <div style="display: flex; gap: 20px; align-items: start;">
                <div style="text-align: center; min-width: 90px;">
                    <div style="font-size: 3.5em; margin-bottom: 5px;">${item.picto || '⚠️'}</div>
                    <div style="background: #FF9800; color: #000; padding: 10px; border-radius: 5px; font-weight: bold; border: 2px solid #000;">
                        <div style="font-size: 1.2em; border-bottom: 2px solid #000; margin-bottom: 5px; padding-bottom: 5px;">${item.danger || '--'}</div>
                        <div style="font-size: 2em;">${item.onu}</div>
                    </div>
                </div>
                <div class="tmd-info-content" style="flex: 1;">
                    <h3 style="color: var(--warning); margin: 0 0 10px 0; font-size: 1.6em;">${item.nom}</h3>
                    <div class="result-item"><span>Classe :</span> <span>${item.classe}</span></div>
                    <div class="danger-box" style="margin-top: 10px;">
                        <strong>⚠️ Risques :</strong> ${item.risques || 'Non renseignés'}
                    </div>
                    ${buildCaracteristiquesHTML(item)}
                </div>
            </div>
        `;

        const gmuButton = document.createElement('button');
        gmuButton.textContent = '📖 Voir la Fiche GMU';
        gmuButton.className = 'gmu-button-style'; // Style géré par CSS de préférence
        gmuButton.onclick = () => afficherFicheTMD(item.onu, item.nom, item.classe, item.risques, item.picto, item.danger);
        
        resultCard.querySelector('.tmd-info-content').appendChild(gmuButton);
        resultsContainer.appendChild(resultCard);
    });
}

// --- Nouvelles fonctions v1.9.8 ---
function buildCaracteristiquesHTML(item) {
    if (!item.caracteristiques) return '';
    // Structure de base si des caractéristiques spécifiques existent dans votre DB
    return `<div class="tmd-specs" style="font-size: 0.9em; margin-top: 5px; opacity: 0.9;">
                ℹ️ ${item.caracteristiques}
            </div>`;
}

function afficherFicheTMD(onu, nom, classe, risques, picto, danger) {
    const matiere = { onu, nom, classe, risques: risques || '', picto: picto || '⚠️', danger: danger || '00' };
    if (typeof afficherFicheGMU === 'function') {
        afficherFicheGMU(matiere);
    } else {
        alert('Module GMU indisponible');
    }
}

// ==================== MODULE PUISSANCE FEU ====================
function selectFireSource(type) {
    const max = {fenetre: 10, porte: 5, baie: 3, garage: 2, entrepot: 1};
    fireSelection[type] = fireSelection[type] < max[type] ? fireSelection[type] + 1 : 0;
    
    const counter = document.getElementById(`count-${type}`);
    if (counter) {
        counter.textContent = fireSelection[type];
        counter.style.display = fireSelection[type] > 0 ? 'block' : 'none';
    }
    calculateFirePower();
}

function calculateFirePower() {
    let totalPower = 0;
    for (let type in fireSelection) totalPower += fireSelection[type] * firePowers[type];
    const debit = (totalPower / 1.4) * 100;
    
    const powerEl = document.getElementById('totalPower');
    const flowEl = document.getElementById('flowRate');
    if (powerEl) powerEl.textContent = `${totalPower.toFixed(1)} MW`;
    if (flowEl) {
        flowEl.textContent = `${debit.toFixed(0)} L/min`;
        flowEl.style.color = debit > 1000 ? '#F44336' : (debit > 500 ? '#FF9800' : '#4CAF50');
    }
}

function resetFire() {
    fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
    document.querySelectorAll('.fire-counter').forEach(c => { c.textContent = '0'; c.style.display = 'none'; });
    calculateFirePower();
}

// ==================== MODULE ARI ====================
function calculerAutonomieARI() {
    const pression = parseFloat(document.getElementById('pressionARI')?.value || 300);
    const volume = parseFloat(document.getElementById('volumeARI')?.value || 9);
    const conso = parseFloat(document.getElementById('consoARI')?.value || 100);
    const securite = parseFloat(document.getElementById('securiteARI')?.value || 55);
    
    const autonomieTotale = (pression * volume) / conso;
    const tempsSifflet = ((pression - securite) * volume) / conso;
    
    const resultsDiv = document.getElementById('resultatsARI');
    if (resultsDiv) {
        resultsDiv.style.display = 'block';
        document.getElementById('autonomieTotale').textContent = Math.floor(autonomieTotale) + ' min';
        document.getElementById('tempsSifflet').textContent = Math.floor(tempsSifflet) + ' min';
    }
}

function setBouteilleARI(volume) {
    const input = document.getElementById('volumeARI');
    if (input) input.value = volume;
    calculerAutonomieARI();
}

// ==================== UI & UTILS ====================
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const icon = document.getElementById('dark-mode-icon');
    if (icon) icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) section.classList.toggle('collapsed');
}

console.log('🚒 DECIOPS v1.9.8 chargé avec succès');
