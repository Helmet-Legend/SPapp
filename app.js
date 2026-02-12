/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS v1.9 - Outil d'aide à la décision opérationnelle
 * ═══════════════════════════════════════════════════════════════════════
 * Copyright (c) 2025 - RESCUEAPP
 * ═══════════════════════════════════════════════════════════════════════
 */

// ==================== VARIABLES GLOBALES ====================
let fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
let firePowers = {fenetre: 2, porte: 4, baie: 8.4, garage: 11, entrepot: 36};
let tronconsPerte = [];
let currentConversionType = null;
let gazSelectionne = null;

// Données chargées depuis JSON
let tmdDatabase = [];
let densityData = [];
let gazDatabase = {};
let modulesData = [];
let conversionData = {};
let gazBouteillesData = {};
let appConfig = {};

// ==================== INITIALISATION ====================
async function initApp() {
    console.log('🚒 DECIOPS v1.9 - Initialisation...');
    try {
        const data = await DataLoader.loadAll();
        tmdDatabase = data.tmd || [];
        densityData = data.densites || [];
        gazDatabase = data.gaz || {};
        modulesData = data.modules || [];
        conversionData = data.conversions || {};
        gazBouteillesData = data.gaz_bouteilles || {};
        appConfig = data.config || {};
        
        if (appConfig.firePowers) firePowers = appConfig.firePowers;
        
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
    } catch (e) { console.log("Mode sombre : Mémoire non disponible"); }
    
    setTimeout(updateDarkModeIcon, 100);
    setTimeout(() => { if (typeof restoreSectionsState === "function") restoreSectionsState(); }, 100);
    
    setupEventListeners();
    showModule('home');
    console.log('🚒 DECIOPS prêt!');
}

function setupEventListeners() {
    const gazEtalonSelect = document.getElementById('gazEtalon');
    if (gazEtalonSelect) {
        gazEtalonSelect.addEventListener('change', () => {
            updateTableauCorrections();
            if (gazSelectionne) calculerCorrectionGaz();
        });
    }
    const valeurExploInput = document.getElementById('valeurExplo');
    if (valeurExploInput) {
        valeurExploInput.addEventListener('input', () => { if (gazSelectionne) calculerCorrectionGaz(); });
    }
    if (document.getElementById('gazPresentsGrid')) initExplosimetrie();
    if (document.getElementById('listeVehiculesEquipages')) afficherVehiculesEquipages();
    if (document.getElementById('diametreTroncon')) setDiametreTroncon(parseInt(document.getElementById('diametreTroncon')?.value || 70));
}

// ========== NAVIGATION ==========
function showModule(moduleName) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const module = document.getElementById(moduleName);
    if (module) {
        module.classList.add('active');
        window.scrollTo(0, 0);
        if (moduleName === 'distance-calc') calculateDistanceCalc();
        if (moduleName === 'abaque') calculateAbaqueAll();
        if (moduleName === 'ari') calculerAutonomieARI();
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

// ========== MODULE TMD & GMU (CORRIGÉ ET TESTÉ) ==========
function searchTMD() {
    const onuInput = document.getElementById('searchONU').value.trim().toLowerCase();
    const nameInput = document.getElementById('searchName').value.trim().toLowerCase();
    const classeFilter = document.getElementById('filterClasse').value;
    
    let results = tmdDatabase.filter(item => {
        const matchONU = !onuInput || item.onu.toString().includes(onuInput);
        const matchName = !nameInput || (item.nom && item.nom.toLowerCase().includes(nameInput));
        const matchClasse = !classeFilter || (item.classe && item.classe.toString() === classeFilter);
        return matchONU && matchName && matchClasse;
    });
    
    document.getElementById('tmdTotal').textContent = tmdDatabase.length;
    document.getElementById('tmdFound').textContent = results.length;
    
    const resultsContainer = document.getElementById('tmdResults');
    if (!resultsContainer) return;

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="alert-box">Aucun résultat trouvé</div>';
        return;
    }
    
    resultsContainer.innerHTML = results.slice(0, 30).map(item => {
        let borderColor = (item.classe == 3) ? '#ff0000' : '#FF9800';
        const dangerDisplay = item.classe == 1 ? '<div style="font-size:1.2em;color:#888;">Pas de code</div>' : `<div style="font-size:1.5em;">${item.danger || '--'}</div>`;
        
        return `
            <div class="result-box" style="border-left: 8px solid ${borderColor}; margin-bottom: 15px; padding: 15px; background: white; border-radius: 10px; color: black;">
                <div style="display: flex; gap: 20px; align-items: start;">
                    <div style="text-align: center; min-width: 100px;">
                        <div style="font-size: 3em;">${item.picto || '⚠️'}</div>
                        <div style="background: #FF9800; color: #000; padding: 8px; border-radius: 5px; font-weight: bold; margin-top: 10px;">
                            ${dangerDisplay}
                            <div style="font-size: 2em; border-top: 2px solid #000; margin-top: 5px; padding-top: 5px;">${item.onu}</div>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <h3 style="color: #FF9800; margin: 0;">${item.nom}</h3>
                        <div style="margin: 10px 0;"><strong>Classe :</strong> ${item.classe}</div>
                        <div style="margin: 10px 0;"><strong>⚠️ Risques :</strong> ${item.risques || 'Non renseignés'}</div>
                        <button onclick="preparerFicheGMU('${item.onu}')" 
                                style="margin-top: 15px; background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%); border: none; padding: 12px 25px; border-radius: 10px; color: white; font-weight: bold; font-size: 1.1em; cursor: pointer; width: 100%; display: block !important;">
                            📖 Consulter la Fiche GMU
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function preparerFicheGMU(onu) {
    const matiere = tmdDatabase.find(p => p.onu.toString() === onu.toString());
    if (!matiere) return;

    if (typeof afficherFicheGMU === 'function') {
        const htmlFiche = afficherFicheGMU(matiere.onu, matiere.nom, matiere.classe);
        const container = document.getElementById('tmdResults');
        if (container) {
            container.innerHTML = `<button onclick="searchTMD()" style="margin-bottom:20px; padding:10px 20px; cursor:pointer;">← Retour</button>${htmlFiche}`;
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } else {
        alert("Erreur : Le fichier affichage-gmu.js n'est pas chargé.");
    }
}

// ========== MODULES DE CALCUL (ARI, FEU, PERTES) ==========
function selectFireSource(type) {
    fireSelection[type]++;
    document.getElementById(type + '-count').textContent = fireSelection[type];
    calculateFirePower();
}

function calculateFirePower() {
    let totalPower = 0;
    for (let type in fireSelection) totalPower += fireSelection[type] * firePowers[type];
    const flow = (totalPower / 1.4) * 100;
    if (document.getElementById('totalPower')) document.getElementById('totalPower').textContent = `${totalPower.toFixed(1)} MW`;
    if (document.getElementById('flowRate')) document.getElementById('flowRate').textContent = `${flow.toFixed(0)} L/min`;
}

function calculerAutonomieARI() {
    const p = parseFloat(document.getElementById('pressionARI')?.value || 300);
    const v = parseFloat(document.getElementById('volumeARI')?.value || 9);
    const c = parseFloat(document.getElementById('consoARI')?.value || 100);
    const s = 55;
    const autonomie = (p * v) / c;
    const sifflet = ((p - s) * v) / c;
    if (document.getElementById('autonomieTotale')) document.getElementById('autonomieTotale').textContent = Math.floor(autonomie) + ' min';
    if (document.getElementById('tempsSifflet')) document.getElementById('tempsSifflet').textContent = Math.floor(sifflet) + ' min';
}

function setDiametreTroncon(value) {
    const input = document.getElementById('diametreTroncon');
    if (input) input.value = value;
}

// ========== RECHERCHE & UTILS ==========
function searchModules(query) {
    const res = document.getElementById('searchResults');
    if (!query || query.length < 2) { if(res) res.style.display = 'none'; return; }
    const filtered = searchIndex.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
    if (res) {
        res.innerHTML = filtered.map(m => `<div onclick="showModule('${m.id}')" style="padding:15px; background:var(--bg-card); margin:5px 0; cursor:pointer; border-left:4px solid red;"><strong>${m.name}</strong></div>`).join('');
        res.style.display = 'block';
    }
}

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

document.addEventListener('DOMContentLoaded', initApp);
