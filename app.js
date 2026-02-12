/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS v1.9 - Outil d'aide à la décision opérationnelle
 * ═══════════════════════════════════════════════════════════════════════
 * * Copyright (c) 2025 - RESCUEAPP
 * Solution professionnelle pour services d'incendie et de secours
 * * ARCHITECTURE MODULAIRE - Données JSON externes
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
        // Charger toutes les données via le DataLoader
        const data = await DataLoader.loadAll();
        
        // Assigner aux variables globales
        tmdDatabase = data.tmd || [];
        densityData = data.densites || [];
        gazDatabase = data.gaz || {};
        modulesData = data.modules || [];
        conversionData = data.conversions || {};
        gazBouteillesData = data.gaz_bouteilles || {};
        appConfig = data.config || {};
        
        // Mettre à jour les puissances de feu depuis config
        if (appConfig.firePowers) {
            firePowers = appConfig.firePowers;
        }
        
        console.log(`✅ Données chargées:`);
        console.log(`   - TMD: ${tmdDatabase.length} produits`);
        console.log(`   - Gaz: ${Object.keys(gazDatabase).length} gaz`);
        
        // Initialiser l'application
        initializeApp();
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        // Fallback: essayer de fonctionner avec des données par défaut
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
        console.log("Mode sombre : Mémoire non disponible sur cet appareil");
    }
    
    setTimeout(updateDarkModeIcon, 100);
    
    // Restaurer l'état des sections
    setTimeout(function() {
        try {
            if (typeof restoreSectionsState === "function") {
                restoreSectionsState();
            }
        } catch (e) {
            console.log("Sections : Mémoire non disponible");
        }
    }, 100);
    
    // Initialiser les modules spécifiques
    setupEventListeners();
    
    // Afficher le module d'accueil par défaut
    showModule('home');
    
    console.log('🚒 DECIOPS prêt!');
}

function setupEventListeners() {
    // Événements pour explosimétrie
    const gazEtalonSelect = document.getElementById('gazEtalon');
    if (gazEtalonSelect) {
        gazEtalonSelect.addEventListener('change', function() {
            updateTableauCorrections();
            if (gazSelectionne) {
                calculerCorrectionGaz();
            }
        });
    }
    
    const valeurExploInput = document.getElementById('valeurExplo');
    if (valeurExploInput) {
        valeurExploInput.addEventListener('input', function() {
            if (gazSelectionne) {
                calculerCorrectionGaz();
            }
        });
    }
    
    // Initialiser l'explosimétrie si présente
    if (document.getElementById('gazPresentsGrid')) {
        initExplosimetrie();
    }
    
    // Initialiser les listes pour PATRAC DR
    if (document.getElementById('listeVehiculesEquipages')) {
        afficherVehiculesEquipages();
    }
    
    // Initialiser les boutons de pertes de charge
    if (document.getElementById('diametreTroncon')) {
        const diamValue = parseInt(document.getElementById('diametreTroncon')?.value || 70);
        setDiametreTroncon(diamValue);
    }
    
    // Initialiser les sections GAZ et ELEC
    if (document.getElementById('btnGazTransport')) {
        showGazType('transport');
    }
}

// Lancer l'initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', initApp);

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

// ========== MODULE TMD & GMU (CORRIGÉ) ==========
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
    
    if (results.length > 30) results = results.slice(0, 30);
    
    resultsContainer.innerHTML = results.map(item => {
        let borderColor = '#FF9800';
        if (item.classe == 2) borderColor = '#00aaff';
        else if (item.classe == 3) borderColor = '#ff0000';
        else if (item.classe == 8) borderColor = '#ffffff';
        
        const dangerDisplay = item.classe == 1 ? 
            '<div style="font-size: 1.2em; color: #888; font-style: italic;">Pas de code</div>' :
            `<div style="font-size: 1.5em;">${item.danger || '--'}</div>`;
        
        return `
            <div class="result-box" style="border-left: 8px solid ${borderColor}; margin-bottom: 15px; padding: 15px; background: var(--bg-card); border-radius: 10px;">
                <div style="display: flex; gap: 20px; align-items: start;">
                    <div style="text-align: center; min-width: 100px;">
                        <div style="font-size: 3em;">${item.picto || '⚠️'}</div>
                        <div style="background: #FF9800; color: #000; padding: 8px; border-radius: 5px; font-weight: bold; margin-top: 10px;">
                            ${dangerDisplay}
                            <div style="font-size: 2em; border-top: 2px solid #000; margin-top: 5px; padding-top: 5px;">${item.onu}</div>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <h3 style="color: var(--warning); margin-top: 0;">${item.nom}</h3>
                        <div class="result-item">
                            <span><strong>Classe :</strong></span>
                            <span>${item.classe}</span>
                        </div>
                        <div class="danger-box" style="margin-top: 10px;">
                            <strong>⚠️ Risques :</strong> ${item.risques || 'Non renseignés'}
                        </div>
                        
                        <button onclick="preparerFicheGMU('${item.onu}')" 
                                style="margin-top: 15px; background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%); 
                                       border: none; padding: 12px 25px; border-radius: 10px; color: white; 
                                       font-weight: bold; font-size: 1.1em; cursor: pointer; width: 100%;">
                            📖 Consulter la Fiche GMU
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Fonction de passerelle corrigée pour envoyer les bons arguments
 * à affichage-gmu.js qui attend (numeroONU, nomMatiere, classe)
 */
function preparerFicheGMU(onu) {
    const matiere = tmdDatabase.find(p => p.onu.toString() === onu.toString());
    
    if (!matiere) {
        alert("⚠️ Produit introuvable dans la base de données.");
        return;
    }

    if (typeof afficherFicheGMU === 'function') {
        // ON EXTRAIT LES INFOS POUR LES ENVOYER SÉPARÉMENT COMME ATTENDU PAR LE SCRIPT
        const htmlFiche = afficherFicheGMU(matiere.onu, matiere.nom, matiere.classe);
        
        const resultsDiv = document.getElementById('tmdResults');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <button class="back-btn" onclick="searchTMD()" style="margin-bottom: 20px; padding: 10px 20px; cursor: pointer; background: var(--primary-red); color: white; border: none; border-radius: 5px;">
                    ← Retour à la recherche
                </button>
                ${htmlFiche}
            `;
            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } else {
        alert("❌ Erreur : Le fichier 'affichage-gmu.js' n'est pas détecté.");
    }
}

// ========== MODULE PUISSANCE FEU ==========
function selectFireSource(type) {
    fireSelection[type] = (fireSelection[type] || 0) + 1;
    const counter = document.getElementById(type + '-count');
    if(counter) counter.textContent = fireSelection[type];
    calculateFirePower();
}

function calculateFirePower() {
    let totalPower = 0;
    for (let type in fireSelection) {
        totalPower += fireSelection[type] * firePowers[type];
    }
    const debitNecessaire = (totalPower / 1.4) * 100;
    
    const totalPowerElement = document.getElementById('totalPower');
    const flowRateElement = document.getElementById('flowRate');
    
    if (totalPowerElement) totalPowerElement.textContent = `${totalPower.toFixed(1)} MW`;
    if (flowRateElement) flowRateElement.textContent = `${debitNecessaire.toFixed(0)} L/min`;
}

function resetFire() {
    fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
    document.querySelectorAll('[id$="-count"]').forEach(el => el.textContent = '0');
    calculateFirePower();
}

// ========== MODULE PERTES DE CHARGE ==========
function setDiametreTroncon(value) {
    const diamInput = document.getElementById('diametreTroncon');
    if (diamInput) diamInput.value = value;
    
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

// ========== MODULE ARI ==========
function calculerAutonomieARI() {
    const pression = parseFloat(document.getElementById('pressionARI')?.value || 300);
    const volume = parseFloat(document.getElementById('volumeARI')?.value || 9);
    const conso = parseFloat(document.getElementById('consoARI')?.value || 100);
    const securite = parseFloat(document.getElementById('securiteARI')?.value || 55);
    
    const autonomieTotale = (pression * volume) / conso;
    const miTemps = autonomieTotale / 2;
    const tempsSifflet = ((pression - securite) * volume) / conso;
    
    const results = document.getElementById('resultatsARI');
    if (results) {
        document.getElementById('autonomieTotale').textContent = Math.floor(autonomieTotale) + ' min';
        document.getElementById('miTemps').textContent = Math.floor(miTemps) + ' min';
        document.getElementById('tempsSifflet').textContent = Math.floor(tempsSifflet) + ' min';
    }
}

// ========== RECHERCHE GLOBALE ==========
function searchModules(query) {
    const searchResults = document.getElementById('searchResults');
    if (!query || query.length < 2) {
        if(searchResults) searchResults.style.display = 'none';
        return;
    }
    
    query = query.toLowerCase();
    const results = searchIndex.filter(m => m.name.toLowerCase().includes(query) || m.keywords.some(k => k.includes(query)));
    
    if (searchResults) {
        searchResults.innerHTML = results.map(m => `
            <div onclick="showModule('${m.id}')" class="search-result-item" style="padding:15px; background:var(--bg-card); margin:5px 0; cursor:pointer; border-left:4px solid red;">
                <strong>${m.name}</strong>
            </div>
        `).join('');
        searchResults.style.display = 'block';
    }
}

// ========== MODE SOMBRE & UTILS ==========
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
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

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', initApp);
