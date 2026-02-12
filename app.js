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

let tmdDatabase = [];
let densityData = [];
let gazDatabase = {};
let modulesData = [];
let conversionData = {};
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
        appConfig = data.config || {};
        
        if (appConfig.firePowers) firePowers = appConfig.firePowers;
        
        initializeApp();
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        initializeApp(); // Tentative de démarrage dégradé
    }
}

function initializeApp() {
    // Gestion Mode Sombre
    try {
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
        }
    } catch (e) { console.log("LocalStorage non disponible"); }
    
    updateDarkModeIcon();
    setupEventListeners();
    showModule('home');
    console.log('🚒 DECIOPS prêt!');
}

function setupEventListeners() {
    // Recherche globale
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => searchModules(e.target.value));
    }

    // Explosimétrie
    const gazEtalon = document.getElementById('gazEtalon');
    if (gazEtalon) {
        gazEtalon.addEventListener('change', () => {
            if (gazSelectionne) calculerCorrectionGaz();
        });
    }
}

// ========== NAVIGATION ==========
function showModule(moduleName) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const module = document.getElementById(moduleName);
    if (module) {
        module.classList.add('active');
        window.scrollTo(0, 0);
    }
    
    // Interface
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

// ========== MODULE TMD & GMU (RÉPARÉ) ==========
function searchTMD() {
    const onuInput = document.getElementById('searchONU').value.trim();
    const nameInput = document.getElementById('searchName').value.trim().toLowerCase();
    
    let results = tmdDatabase.filter(item => {
        const matchONU = !onuInput || item.onu.toString().includes(onuInput);
        const matchName = !nameInput || item.nom.toLowerCase().includes(nameInput);
        return matchONU && matchName;
    });

    const container = document.getElementById('tmdResults');
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = '<div class="alert-box">Aucun produit trouvé</div>';
        return;
    }

    container.innerHTML = results.slice(0, 20).map(item => `
        <div class="result-box" style="border-left: 8px solid ${item.classe == 3 ? '#ff0000' : '#FF9800'};">
            <div style="display: flex; gap: 15px;">
                <div style="text-align: center; min-width: 80px;">
                    <div style="font-size: 2em;">${item.picto || '⚠️'}</div>
                    <div style="background: #FF9800; font-weight: bold; padding: 5px; border-radius: 5px; margin-top: 5px;">
                        ${item.onu}
                    </div>
                </div>
                <div style="flex: 1;">
                    <h3 style="margin: 0;">${item.nom}</h3>
                    <p style="margin: 5px 0;">Classe: ${item.classe}</p>
                    <button onclick="preparerFicheGMU('${item.onu}')" class="btn-gmu" 
                            style="background: #FF6B00; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; width: 100%; font-weight: bold;">
                        📖 FICHE D'INTERVENTION (GMU)
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function preparerFicheGMU(onu) {
    const matiere = tmdDatabase.find(p => p.onu.toString() === onu.toString());
    if (!matiere) return;

    if (typeof afficherFicheGMU === 'function') {
        // On récupère le HTML de la fiche depuis affichage-gmu.js
        const htmlFiche = afficherFicheGMU(matiere.onu, matiere.nom, matiere.classe);
        const container = document.getElementById('tmdResults');
        
        container.innerHTML = `
            <button onclick="searchTMD()" style="margin-bottom: 15px; padding: 10px; cursor: pointer;">← Retour</button>
            ${htmlFiche}
        `;
        container.scrollIntoView({ behavior: 'smooth' });
    } else {
        alert("Erreur: Le module d'affichage GMU est manquant.");
    }
}

// ========== MODULE PUISSANCE FEU ==========
function selectFireSource(type) {
    fireSelection[type]++;
    const el = document.getElementById(type + '-count');
    if (el) el.textContent = fireSelection[type];
    calculateFirePower();
}

function calculateFirePower() {
    let totalPower = 0;
    for (let type in fireSelection) {
        totalPower += fireSelection[type] * firePowers[type];
    }
    const flow = (totalPower / 1.4) * 100;
    
    document.getElementById('totalPower').textContent = totalPower.toFixed(1) + " MW";
    const flowEl = document.getElementById('flowRate');
    flowEl.textContent = Math.round(flow) + " L/min";
    flowEl.style.color = flow > 1000 ? '#f44336' : '#4CAF50';
}

function resetFire() {
    fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
    document.querySelectorAll('[id$="-count"]').forEach(el => el.textContent = '0');
    calculateFirePower();
}

// ========== MODULE PERTES DE CHARGE ==========
function setDiametreTroncon(value) {
    const input = document.getElementById('diametreTroncon');
    if (input) input.value = value;
    document.querySelectorAll('.diam-btn').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');
}

function calculerPertes() {
    const L = parseFloat(document.getElementById('longueurTuyau').value || 0);
    const Q = parseFloat(document.getElementById('debitTuyau').value || 0);
    const D = parseInt(document.getElementById('diametreTroncon').value || 70);
    
    let J = 0;
    if (D === 45) J = 1.2 * Math.pow(Q/500, 2) * (L/20);
    else if (D === 70) J = 0.11 * Math.pow(Q/500, 2) * (L/20);
    else if (D === 110) J = 0.056 * Math.pow(Q/1000, 2) * (L/20);

    const res = document.getElementById('perteResult');
    if (res) res.textContent = J.toFixed(2) + " bar";
}

// ========== MODULE ARI ==========
function calculerAutonomieARI() {
    const P = parseFloat(document.getElementById('pressionARI')?.value || 300);
    const V = parseFloat(document.getElementById('volumeARI')?.value || 9);
    const C = parseFloat(document.getElementById('consoARI')?.value || 100);
    const S = 55; // Réserve sécurité fixe
    
    const autonomie = (P * V) / C;
    const securite = ((P - S) * V) / C;

    document.getElementById('autonomieTotale').textContent = Math.floor(autonomie) + " min";
    document.getElementById('tempsSifflet').textContent = Math.floor(securite) + " min";
}

// ========== MODULE ÉMULSEUR ==========
function calculateEmulseur() {
    const S = parseFloat(document.getElementById('emul-surface').value || 0);
    const C = parseFloat(document.getElementById('emul-concentration').value || 3);
    const T = 10; // Taux d'application moyen
    
    const debitSol = S * T;
    const debitEmul = debitSol * (C / 100);
    const total10min = debitEmul * 10;

    const res = document.getElementById('emul-result');
    res.innerHTML = `
        <div class="result-box">
            <p>Débit émulseur: <strong>${debitEmul.toFixed(1)} L/min</strong></p>
            <p>Besoin (10 min): <strong>${Math.ceil(total10min / 20)} bidons</strong> de 20L</p>
        </div>
    `;
}

// ========== UTILS & UI ==========
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const icon = document.getElementById('dark-mode-icon');
    if (icon) icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

function searchModules(query) {
    const resultsContainer = document.getElementById('searchResults');
    if (!query || query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    const filtered = searchIndex.filter(m => 
        m.name.toLowerCase().includes(query.toLowerCase()) || 
        m.keywords.some(k => k.includes(query.toLowerCase()))
    );
    
    resultsContainer.innerHTML = filtered.map(m => `
        <div onclick="showModule('${m.id}')" class="search-item">
            <strong>${m.name}</strong>
        </div>
    `).join('');
    resultsContainer.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initApp);
