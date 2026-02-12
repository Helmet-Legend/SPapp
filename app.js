/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS v1.9.3 - Fix Bouton GMU Injection Directe
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
    console.log('🚒 DECIOPS v1.9.3 - Initialisation...');
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
    } catch (e) {}

    updateDarkModeIcon();
    if (typeof restoreSectionsState === "function") restoreSectionsState();

    setupEventListeners();
    showModule('home');
    console.log('🚒 DECIOPS prêt!');
}

function setupEventListeners() {
    if (document.getElementById('gazPresentsGrid')) initExplosimetrie?.();
    if (document.getElementById('listeVehiculesEquipages')) afficherVehiculesEquipages?.();
}

// ==================== NAVIGATION ====================
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
        homeButton && (homeButton.style.display = 'none');
        globalSearch && (globalSearch.style.display = 'block');
    } else {
        homeButton && (homeButton.style.display = 'block');
        globalSearch && (globalSearch.style.display = 'none');
    }
}

// ==================== MODULE TMD ====================
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

    document.getElementById('tmdTotal') && (document.getElementById('tmdTotal').textContent = tmdDatabase.length);
    document.getElementById('tmdFound') && (document.getElementById('tmdFound').textContent = results.length);

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="alert-box">Aucun résultat trouvé</div>';
        return;
    }

    resultsContainer.innerHTML = '';

    results.slice(0, 30).forEach(item => {

        const borderColor = (item.classe == 3) ? '#ff0000' : '#FF9800';
        const dangerDisplay = item.classe == 1 ? 'Pas de code' : (item.danger || '--');

        const resultCard = document.createElement('div');
        resultCard.style.cssText = `
            border-left: 10px solid ${borderColor};
            margin-bottom: 20px;
            padding: 20px;
            background: #ffffff;
            color: #000000;
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        `;

        resultCard.innerHTML = `
            <div style="display:flex; gap:20px; align-items:flex-start;">
                <div style="text-align:center; min-width:90px;">
                    <div style="font-size:3.5em; margin-bottom:5px;">${item.picto || '⚠️'}</div>
                    <div style="background:#FF9800; color:black; padding:10px; border-radius:5px; font-weight:900; border:2px solid black;">
                        <div style="font-size:1.1em; border-bottom:2px solid black; margin-bottom:5px; padding-bottom:5px;">${dangerDisplay}</div>
                        <div style="font-size:2em;">${item.onu}</div>
                    </div>
                </div>
                <div class="tmd-content" style="flex:1; display:flex; flex-direction:column;">
                    <h3 style="color:#FF9800; margin:0 0 10px 0; font-size:1.6em; text-transform:uppercase;">
                        ${item.nom}
                    </h3>
                    <div style="font-size:1.1em; margin-bottom:5px;">
                        <strong>Classe :</strong> ${item.classe}
                    </div>
                    <div style="font-size:1.1em; margin-bottom:20px;">
                        <strong>⚠️ Risques :</strong> ${item.risques || 'Non renseignés'}
                    </div>
                </div>
            </div>
        `;

        // === Injection directe du bouton (SANS anchor ID) ===
        const gmuBtn = document.createElement('button');
        gmuBtn.textContent = '📖 VOIR LA FICHE GMU';
        gmuBtn.style.cssText = `
            width:100%;
            background:linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%);
            color:white;
            border:3px solid #e65100;
            padding:15px;
            border-radius:10px;
            font-weight:bold;
            font-size:1.1em;
            cursor:pointer;
            margin-top:20px;
        `;

        gmuBtn.onclick = () => preparerFicheGMU(item.onu);

        const contentColumn = resultCard.querySelector('.tmd-content');
        contentColumn && contentColumn.appendChild(gmuBtn);

        resultsContainer.appendChild(resultCard);
    });
}

// ==================== FICHE GMU ====================
function preparerFicheGMU(onu) {
    const matiere = tmdDatabase.find(p => p.onu?.toString() === onu?.toString());
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
            window.scrollTo(0,0);
        }
    } else {
        alert("ERREUR : Module affichage GMU non détecté.");
    }
}

// ==================== MODULES CALCUL ====================
function selectFireSource(type) {
    fireSelection[type]++;
    const counter = document.getElementById(type + '-count');
    counter && (counter.textContent = fireSelection[type]);
    calculateFirePower();
}

function calculateFirePower() {
    let totalPower = 0;
    for (let type in fireSelection) {
        totalPower += fireSelection[type] * firePowers[type];
    }

    const flow = (totalPower / 1.4) * 100;

    document.getElementById('totalPower') &&
        (document.getElementById('totalPower').textContent = `${totalPower.toFixed(1)} MW`);

    document.getElementById('flowRate') &&
        (document.getElementById('flowRate').textContent = `${flow.toFixed(0)} L/min`);
}

function calculerAutonomieARI() {
    const p = parseFloat(document.getElementById('pressionARI')?.value || 300);
    const v = parseFloat(document.getElementById('volumeARI')?.value || 9);
    const c = parseFloat(document.getElementById('consoARI')?.value || 100);

    if (isNaN(p) || isNaN(v) || isNaN(c)) return;

    const autonomie = (p * v) / c;
    const sifflet = ((p - 55) * v) / c;

    document.getElementById('autonomieTotale') &&
        (document.getElementById('autonomieTotale').textContent = Math.floor(autonomie) + ' min');

    document.getElementById('tempsSifflet') &&
        (document.getElementById('tempsSifflet').textContent = Math.floor(sifflet) + ' min');
}

// ==================== UI ====================
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
