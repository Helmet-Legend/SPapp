/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS v1.9.2 - Correction d'affichage Forcée (Boutons Objets)
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
    } catch (e) { console.log("Mémoire non disponible"); }
    
    setTimeout(updateDarkModeIcon, 100);
    setTimeout(() => { if (typeof restoreSectionsState === "function") restoreSectionsState(); }, 100);
    
    setupEventListeners();
    showModule('home');
    console.log('🚒 DECIOPS prêt!');
}

function setupEventListeners() {
    if (document.getElementById('gazPresentsGrid')) initExplosimetrie();
    if (document.getElementById('listeVehiculesEquipages')) afficherVehiculesEquipages();
}

// ========== NAVIGATION ==========
function showModule(moduleName) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const module = document.getElementById(moduleName);
    if (module) {
        module.classList.add('active');
        window.scrollTo(0, 0);
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

// ========== MODULE TMD & GMU (VERSION SÉCURISÉE PAR OBJETS) ==========
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
    
    const resultsContainer = document.getElementById('tmdResults');
    if (!resultsContainer) return;

    document.getElementById('tmdTotal').textContent = tmdDatabase.length;
    document.getElementById('tmdFound').textContent = results.length;

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="alert-box">Aucun résultat trouvé</div>';
        return;
    }
    
    // On vide le conteneur pour reconstruire proprement
    resultsContainer.innerHTML = '';

    results.slice(0, 30).forEach(item => {
        let borderColor = (item.classe == 3) ? '#ff0000' : '#FF9800';
        const dangerDisplay = item.classe == 1 ? 'Pas de code' : (item.danger || '--');
        
        // Création de la carte parente
        const resultCard = document.createElement('div');
        resultCard.style.cssText = `
            border-left: 10px solid ${borderColor} !important; 
            margin-bottom: 20px; 
            padding: 20px; 
            background: #ffffff !important; 
            color: #000000 !important; 
            border-radius: 12px; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            display: block !important;
            visibility: visible !important;
        `;

        // Contenu de la carte
        resultCard.innerHTML = `
            <div style="display: flex; gap: 20px; align-items: flex-start;">
                <div style="text-align: center; min-width: 90px;">
                    <div style="font-size: 3.5em; margin-bottom: 5px;">${item.picto || '⚠️'}</div>
                    <div style="background: #FF9800; color: black; padding: 10px; border-radius: 5px; font-weight: 900; border: 2px solid black;">
                        <div style="font-size: 1.1em; border-bottom: 2px solid black; margin-bottom: 5px; padding-bottom: 5px;">${dangerDisplay}</div>
                        <div style="font-size: 2em;">${item.onu}</div>
                    </div>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; min-height: 150px;">
                    <h3 style="color: #FF9800; margin: 0 0 10px 0; font-size: 1.6em; text-transform: uppercase;">${item.nom}</h3>
                    <div style="font-size: 1.1em; margin-bottom: 5px;"><strong>Classe :</strong> ${item.classe}</div>
                    <div style="font-size: 1.1em; margin-bottom: 20px;"><strong>⚠️ Risques :</strong> ${item.risques || 'Non renseignés'}</div>
                    <div id="btn-anchor-${item.onu}"></div>
                </div>
            </div>
        `;

        resultsContainer.appendChild(resultCard);

        // Création isolée du bouton pour éviter les bugs de caractères
        const anchor = document.getElementById(`btn-anchor-${item.onu}`);
        const gmuBtn = document.createElement('button');
        gmuBtn.textContent = '📖 VOIR LA FICHE GMU';
        gmuBtn.style.cssText = `
            width: 100% !important; 
            background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%) !important; 
            color: white !important; 
            border: 3px solid #e65100 !important; 
            padding: 15px !important; 
            border-radius: 10px !important; 
            font-weight: bold !important; 
            font-size: 1.1em !important; 
            cursor: pointer !important; 
            display: block !important;
            margin-top: auto;
        `;
        
        // Attachement de l'événement clic sans injecter de texte
        gmuBtn.onclick = function() {
            preparerFicheGMU(item.onu);
        };
        
        anchor.appendChild(gmuBtn);
    });
}

function preparerFicheGMU(onu) {
    const matiere = tmdDatabase.find(p => p.onu.toString() === onu.toString());
    if (!matiere) return;

    if (typeof afficherFicheGMU === 'function') {
        const htmlFiche = afficherFicheGMU(matiere.onu, matiere.nom, matiere.classe);
        const container = document.getElementById('tmdResults');
        if (container) {
            container.innerHTML = `
                <div style="margin-bottom:20px;">
                    <button onclick="searchTMD()" style="background:#444; color:white; border:none; padding:12px 25px; border-radius:8px; font-weight:bold; cursor:pointer;">
                        ← Retour à la recherche
                    </button>
                </div>
                ${htmlFiche}
            `;
            window.scrollTo(0, 0);
        }
    } else {
        alert("ERREUR : Module d'affichage (affichage-gmu.js) non détecté.");
    }
}

// ========== MODULES DE CALCULS (ARI, FEU, PERTES) ==========
function selectFireSource(type) {
    fireSelection[type]++;
    const counter = document.getElementById(type + '-count');
    if(counter) counter.textContent = fireSelection[type];
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
    const autonomie = (p * v) / c;
    const sifflet = ((p - 55) * v) / c;
    if (document.getElementById('autonomieTotale')) document.getElementById('autonomieTotale').textContent = Math.floor(autonomie) + ' min';
    if (document.getElementById('tempsSifflet')) document.getElementById('tempsSifflet').textContent = Math.floor(sifflet) + ' min';
}

// ========== UTILS ET UI ==========
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const icon = document.getElementById('dark-mode-icon');
    if (icon) icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', initApp);
