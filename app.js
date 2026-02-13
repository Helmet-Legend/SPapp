/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS v1.9.4 - Version Intégrale Certifiée
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
    console.log('🚒 DECIOPS v1.9.4 - Initialisation complète...');
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
    
    // SÉCURITÉ : Délégation d'événement pour le bouton GMU
    const resultsContainer = document.getElementById('tmdResults');
    if (resultsContainer) {
        resultsContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.btn-gmu-action');
            if (btn) {
                const onu = btn.getAttribute('data-onu');
                preparerFicheGMU(onu);
            }
        });
    }

    showModule('home');
    console.log('🚒 DECIOPS prêt !');
}

function setupEventListeners() {
    // TMD
    ['searchONU', 'searchName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', searchTMD);
    });

    // Explosimétrie
    const gazEtalon = document.getElementById('gazEtalon');
    if (gazEtalon) {
        gazEtalon.addEventListener('change', () => {
            updateTableauCorrections();
            if (gazSelectionne) calculerCorrectionGaz();
        });
    }

    // Perte de charge (Init boutons)
    if (document.getElementById('diametreTroncon')) setDiametreTroncon(70);
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

// ========== MODULE TMD & GMU (VERSION INTEGRALE + FIX) ==========
function searchTMD() {
    const onuInput = document.getElementById('searchONU').value.trim();
    const nameInput = document.getElementById('searchName').value.trim().toLowerCase();
    const classeFilter = document.getElementById('filterClasse')?.value || "";
    
    let results = tmdDatabase.filter(item => {
        const matchONU = !onuInput || item.onu.toString().includes(onuInput);
        const matchName = !nameInput || item.nom.toLowerCase().includes(nameInput);
        const matchClasse = !classeFilter || item.classe.toString() === classeFilter;
        return matchONU && matchName && matchClasse;
    });

    const resultsContainer = document.getElementById('tmdResults');
    if (!resultsContainer) return;

    if (document.getElementById('tmdFound')) document.getElementById('tmdFound').textContent = results.length;

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="alert-box">Aucun résultat</div>';
        return;
    }

    resultsContainer.innerHTML = results.slice(0, 25).map(item => {
        let borderColor = (item.classe == 3) ? '#ff0000' : '#FF9800';
        const dangerDisplay = item.classe == 1 ? 'Pas de code' : (item.danger || '--');

        return `
            <div class="result-box" style="border-left: 10px solid ${borderColor} !important; margin-bottom: 20px; padding: 20px; background: white !important; color: black !important; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <div style="display: flex; gap: 20px; align-items: flex-start;">
                    <div style="text-align: center; min-width: 90px;">
                        <div style="font-size: 3.5em; margin-bottom: 5px;">${item.picto || '⚠️'}</div>
                        <div style="background: #FF9800; color: black; padding: 10px; border-radius: 5px; font-weight: 900; border: 2px solid black;">
                            <div style="font-size: 1.1em; border-bottom: 2px solid black; margin-bottom: 5px;">${dangerDisplay}</div>
                            <div style="font-size: 2.2em;">${item.onu}</div>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <h3 style="color: #FF9800; margin: 0 0 10px 0; font-size: 1.6em; text-transform: uppercase;">${item.nom}</h3>
                        <div style="margin-bottom: 5px;"><strong>Classe :</strong> ${item.classe}</div>
                        <div style="margin-bottom: 15px;"><strong>⚠️ Risques :</strong> ${item.risques || 'Non renseignés'}</div>
                        <button type="button" class="btn-gmu-action" data-onu="${item.onu}" style="width: 100%; background: #FF6B00; color: white; border: none; padding: 15px; border-radius: 10px; font-weight: bold; font-size: 1.1em; cursor: pointer; display: block;">
                            📖 VOIR LA FICHE GMU
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function preparerFicheGMU(onu) {
    const matiere = tmdDatabase.find(p => p.onu.toString() === onu.toString());
    if (matiere && typeof afficherFicheGMU === 'function') {
        const ficheHTML = afficherFicheGMU(matiere.onu, matiere.nom, matiere.classe);
        const container = document.getElementById('tmdResults');
        container.innerHTML = `<button onclick="searchTMD()" style="margin-bottom:20px; padding:10px 20px; cursor:pointer; background:#444; color:white; border:none; border-radius:8px; font-weight:bold;">← Retour</button>${ficheHTML}`;
        window.scrollTo(0,0);
    }
}

// ========== MODULE PUISSANCE FEU (INTEGRAL) ==========
function selectFireSource(type) {
    fireSelection[type]++;
    if(document.getElementById(type + '-count')) document.getElementById(type + '-count').textContent = fireSelection[type];
    calculateFirePower();
}

function calculateFirePower() {
    let totalPower = 0;
    for (let type in fireSelection) totalPower += fireSelection[type] * firePowers[type];
    const debit = (totalPower / 1.4) * 100;
    if (document.getElementById('totalPower')) document.getElementById('totalPower').textContent = `${totalPower.toFixed(1)} MW`;
    if (document.getElementById('flowRate')) document.getElementById('flowRate').textContent = `${debit.toFixed(0)} L/min`;
}

function resetFire() {
    fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
    document.querySelectorAll('[id$="-count"]').forEach(el => el.textContent = '0');
    calculateFirePower();
}

// ========== MODULE PERTES DE CHARGE (INTEGRAL) ==========
function setDiametreTroncon(value) {
    const input = document.getElementById('diametreTroncon');
    if (input) input.value = value;
    document.querySelectorAll('[id^="btnDiam"]').forEach(btn => {
        btn.style.border = (parseInt(btn.id.replace('btnDiam', '')) === value) ? '5px solid #FFD700' : '2px solid transparent';
    });
}

function calculerPerteTroncon(troncon) {
    let K = 0.11, debitRef = 500;
    if (troncon.diametre === 45) { K = 1.2; debitRef = 500; }
    else if (troncon.diametre === 110) { K = 0.056; debitRef = 1000; }
    return K * Math.pow(troncon.debit / debitRef, 2) * (troncon.longueur / 20);
}

// ========== MODULE ARI (INTEGRAL) ==========
function calculerAutonomieARI() {
    const p = parseFloat(document.getElementById('pressionARI')?.value || 300);
    const v = parseFloat(document.getElementById('volumeARI')?.value || 9);
    const c = parseFloat(document.getElementById('consoARI')?.value || 100);
    const autonomie = (p * v) / c;
    const sifflet = ((p - 55) * v) / c;
    if (document.getElementById('autonomieTotale')) document.getElementById('autonomieTotale').textContent = Math.floor(autonomie) + ' min';
    if (document.getElementById('tempsSifflet')) document.getElementById('tempsSifflet').textContent = Math.floor(sifflet) + ' min';
}

// ========== PATRAC DR & CA (INTEGRAL) ==========
let vehiculesPatrac = [];
function afficherVehiculesEquipages() {
    const liste = document.getElementById('listeVehiculesEquipages');
    if (!liste) return;
    liste.innerHTML = vehiculesPatrac.map((v, i) => `<div>${v.type} ${v.numero}</div>`).join('') || 'Aucun véhicule';
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
    const res = document.getElementById('searchResults');
    if (!query || query.length < 2) { if(res) res.style.display = 'none'; return; }
    const filtered = searchIndex.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.keywords.some(k => k.includes(query.toLowerCase())));
    if (res) {
        res.innerHTML = filtered.map(m => `<div onclick="showModule('${m.id}')" style="padding:15px; background:var(--bg-card); margin:5px 0; cursor:pointer; border-left:4px solid red;"><strong>${m.name}</strong></div>`).join('');
        res.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', initApp);
