/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS v1.9.8 - Outil d'aide à la décision opérationnelle
 * ═══════════════════════════════════════════════════════════════════════
 * Copyright (c) 2025 - RESCUEAPP
 * Version COMPLÈTE avec tous les modules fonctionnels
 * ═══════════════════════════════════════════════════════════════════════
 */

// ==================== VARIABLES GLOBALES ====================
let fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
let firePowers = {fenetre: 2, porte: 4, baie: 8.4, garage: 11, entrepot: 36};
let tronconsPerte = [];
let currentConversionType = null;
let gazSelectionne = null;
let ventSelectionne = 0;
let currentShape = 'rectangle';
let quantites = { mat15: 0, mat30: 0, mat60: 0, mat90: 0 };

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
        
        if (appConfig.firePowers) firePowers = appConfig.firePowers;
        
        console.log('✅ TMD: ' + tmdDatabase.length + ' produits chargés');
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
    setTimeout(function() {
        try { if (typeof restoreSectionsState === "function") restoreSectionsState(); } catch(e) {}
    }, 100);
    
    setupEventListeners();
    initConversionData();
    console.log('✅ DECIOPS v1.9.8 prêt !');
}

function setupEventListeners() {
    // Explosimétrie
    var gazEtalonSelect = document.getElementById('gazEtalon');
    if (gazEtalonSelect) {
        gazEtalonSelect.addEventListener('change', function() {
            updateTableauCorrections();
            if (gazSelectionne) calculerCorrectionGaz();
        });
    }
    
    var valeurExploInput = document.getElementById('valeurExplo');
    if (valeurExploInput) {
        valeurExploInput.addEventListener('input', function() {
            if (gazSelectionne) calculerCorrectionGaz();
        });
    }
    
    if (document.getElementById('gazPresentsGrid')) initExplosimetrie();
    if (document.getElementById('listeVehiculesEquipages')) afficherVehiculesEquipages();
    if (document.getElementById('listeCA')) afficherCA();
}

document.addEventListener('DOMContentLoaded', initApp);

// ==================== NAVIGATION ====================
function showModule(moduleName) {
    document.querySelectorAll('.module').forEach(function(m) { m.classList.remove('active'); });
    var module = document.getElementById(moduleName);
    if (module) {
        module.classList.add('active');
        window.scrollTo(0, 0);
        
        if (moduleName === 'distance-calc') calculateDistanceCalc();
        if (moduleName === 'abaque') calculateAbaqueAll();
        if (moduleName === 'ari') calculerAutonomieARI();
    }
    
    var homeBtn = document.getElementById('homeButton');
    var searchBar = document.getElementById('globalSearch');
    if (moduleName === 'home') {
        if (homeBtn) homeBtn.style.display = 'none';
        if (searchBar) searchBar.style.display = 'block';
    } else {
        if (homeBtn) homeBtn.style.display = 'block';
        if (searchBar) searchBar.style.display = 'none';
    }
}

// ==================== RECHERCHE GLOBALE ====================
function searchModules(query) {
    var searchResults = document.getElementById('searchResults');
    if (!query || query.length < 2) {
        if (searchResults) searchResults.style.display = 'none';
        return;
    }
    
    var searchIndex = [
        {id: 'fire', name: 'Puissance Feu/Extinction', keywords: ['feu', 'puissance', 'fenêtre', 'incendie']},
        {id: 'emulseur', name: 'Taux application additif', keywords: ['émulseur', 'mousse', 'additif']},
        {id: 'pertes', name: 'Pertes de Charge', keywords: ['pertes', 'charge', 'pression', 'tuyau']},
        {id: 'tmd', name: 'TMD', keywords: ['tmd', 'matières', 'dangereuses', 'onu']},
        {id: 'ari', name: 'Calcul ARI', keywords: ['ari', 'respiratoire', 'autonomie', 'bouteille']},
        {id: 'distances', name: 'Distances Sécurité', keywords: ['distance', 'sécurité', 'gaz', 'électrique']}
    ];
    
    query = query.toLowerCase();
    var results = searchIndex.filter(function(m) {
        return m.name.toLowerCase().includes(query) || m.keywords.some(function(k) { return k.includes(query); });
    });
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="alert-box">Aucun outil trouvé</div>';
    } else {
        searchResults.innerHTML = results.map(function(m) {
            return '<div onclick="showModule(\'' + m.id + '\')" style="background:var(--bg-card);padding:15px;margin:5px 0;border-radius:10px;border-left:4px solid var(--primary-red);cursor:pointer;">' +
                '<strong style="color:var(--primary-red);">' + m.name + '</strong></div>';
        }).join('');
    }
    searchResults.style.display = 'block';
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE TMD ENRICHI - CARACTÉRISTIQUES TECHNIQUES
// ═══════════════════════════════════════════════════════════════════════

function searchTMD() {
    var onuInput = (document.getElementById('searchONU')?.value || '').trim().toLowerCase();
    var nameInput = (document.getElementById('searchName')?.value || '').trim().toLowerCase();
    var classeFilter = document.getElementById('filterClasse')?.value || '';
    
    var results = tmdDatabase.filter(function(item) {
        var matchONU = !onuInput || (item.onu && item.onu.toString().includes(onuInput));
        var matchName = !nameInput || (item.nom && item.nom.toLowerCase().includes(nameInput));
        var matchClasse = !classeFilter || (item.classe && item.classe.toString() === classeFilter);
        return matchONU && matchName && matchClasse;
    });
    
    var totalEl = document.getElementById('tmdTotal');
    var foundEl = document.getElementById('tmdFound');
    if (totalEl) totalEl.textContent = tmdDatabase.length;
    if (foundEl) foundEl.textContent = results.length;
    
    var resultsContainer = document.getElementById('tmdResults');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="alert-box">Aucun résultat trouvé</div>';
        return;
    }
    
    if (results.length > 30) results = results.slice(0, 30);
    
    resultsContainer.innerHTML = results.map(function(item) {
        var borderColor = '#FF9800';
        if (item.classe == 2) borderColor = '#00aaff';
        else if (item.classe == 3) borderColor = '#ff0000';
        else if (item.classe == 8) borderColor = '#ffffff';
        
        var dangerDisplay = item.classe == 1 ? 
            '<div style="font-size:1.2em;color:#888;font-style:italic;">Pas de code</div>' :
            '<div style="font-size:1.5em;">' + (item.danger || '--') + '</div>';
        
        var caracteristiquesHTML = buildCaracteristiquesHTML(item);
        
        return '<div class="result-box" style="border-left:8px solid ' + borderColor + ';margin-bottom:15px;padding:15px;background:var(--bg-card);border-radius:10px;">' +
            '<div style="display:flex;gap:20px;align-items:start;">' +
            '<div style="text-align:center;min-width:100px;">' +
            '<div style="font-size:3em;">' + (item.picto || '⚠️') + '</div>' +
            '<div style="background:#FF9800;color:#000;padding:8px;border-radius:5px;font-weight:bold;margin-top:10px;">' +
            dangerDisplay +
            '<div style="font-size:2em;border-top:2px solid #000;margin-top:5px;padding-top:5px;">' + item.onu + '</div></div></div>' +
            '<div style="flex:1;">' +
            '<h3 style="color:var(--warning);margin-top:0;">' + item.nom + '</h3>' +
            '<div class="result-item"><span><strong>Classe :</strong></span><span>' + item.classe + '</span></div>' +
            '<div class="danger-box" style="margin-top:10px;"><strong>⚠️ Risques :</strong> ' + (item.risques || 'Non renseignés') + '</div>' +
            caracteristiquesHTML +
            '<button onclick="preparerFicheGMU(\'' + item.onu + '\')" ' +
            'style="margin-top:15px;background:linear-gradient(135deg,#FF6B00 0%,#FF8C00 100%);' +
            'border:none;padding:12px 25px;border-radius:10px;color:white;' +
            'font-weight:bold;font-size:1.1em;cursor:pointer;width:100%;">' +
            '📖 Consulter la Fiche GMU</button></div></div></div>';
    }).join('');
}

function buildCaracteristiquesHTML(item) {
    var hasData = item.pointEclair || item.tempAutoInflammation || item.lii || item.lsi || 
                  item.densiteVapeur || item.vle || item.idlh || item.tempEbullition || 
                  item.solubiliteEau || item.seuilOlfactif;
    
    if (!hasData) return '';
    
    var rows = [];
    
    if (item.pointEclair) {
        var peColor = getPointEclairColor(item.pointEclair);
        rows.push('<div style="display:flex;justify-content:space-between;padding:8px 12px;background:' + peColor.bg + ';border-radius:6px;margin-bottom:4px;">' +
            '<span style="font-weight:600;color:#333;">🌡️ Point éclair</span>' +
            '<span style="font-weight:bold;color:' + peColor.text + ';">' + item.pointEclair + '</span></div>');
    }
    
    if (item.tempAutoInflammation) {
        rows.push('<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#fff3e0;border-radius:6px;margin-bottom:4px;">' +
            '<span style="font-weight:600;color:#333;">🔥 Auto-inflammation</span>' +
            '<span style="font-weight:bold;color:#e65100;">' + item.tempAutoInflammation + '</span></div>');
    }
    
    if (item.lii || item.lsi) {
        var lii = item.lii || '?';
        var lsi = item.lsi || '?';
        rows.push('<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#ffebee;border-radius:6px;margin-bottom:4px;">' +
            '<span style="font-weight:600;color:#333;">💨 LII / LSI</span>' +
            '<span style="font-weight:bold;color:#c62828;">' + lii + ' - ' + lsi + '</span></div>');
    }
    
    if (item.densiteVapeur) {
        var densiteVal = parseFloat(item.densiteVapeur);
        var densiteInfo = densiteVal > 1 ? '(+ lourd que air ⬇️)' : '(+ léger que air ⬆️)';
        rows.push('<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#e3f2fd;border-radius:6px;margin-bottom:4px;">' +
            '<span style="font-weight:600;color:#333;">⚖️ Densité vapeur</span>' +
            '<span style="font-weight:bold;color:#1565c0;">' + item.densiteVapeur + ' ' + densiteInfo + '</span></div>');
    }
    
    if (item.tempEbullition) {
        rows.push('<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#e8f5e9;border-radius:6px;margin-bottom:4px;">' +
            '<span style="font-weight:600;color:#333;">🧊 Ébullition</span>' +
            '<span style="font-weight:bold;color:#2e7d32;">' + item.tempEbullition + '</span></div>');
    }
    
    if (item.vle) {
        rows.push('<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f3e5f5;border-radius:6px;margin-bottom:4px;">' +
            '<span style="font-weight:600;color:#333;">🛡️ VLE</span>' +
            '<span style="font-weight:bold;color:#7b1fa2;">' + item.vle + '</span></div>');
    }
    
    if (item.idlh) {
        rows.push('<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#ffcdd2;border-radius:6px;margin-bottom:4px;">' +
            '<span style="font-weight:600;color:#333;">☠️ IDLH</span>' +
            '<span style="font-weight:bold;color:#b71c1c;">' + item.idlh + '</span></div>');
    }
    
    if (item.solubiliteEau) {
        rows.push('<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#e0f7fa;border-radius:6px;margin-bottom:4px;">' +
            '<span style="font-weight:600;color:#333;">💧 Solubilité eau</span>' +
            '<span style="font-weight:bold;color:#00838f;">' + item.solubiliteEau + '</span></div>');
    }
    
    if (item.seuilOlfactif) {
        rows.push('<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#fff8e1;border-radius:6px;margin-bottom:4px;">' +
            '<span style="font-weight:600;color:#333;">👃 Seuil olfactif</span>' +
            '<span style="font-weight:bold;color:#ff8f00;">' + item.seuilOlfactif + '</span></div>');
    }
    
    if (rows.length === 0) return '';
    
    return '<div style="background:#f5f5f5;border-radius:10px;padding:12px;margin:15px 0;border:1px solid #ddd;">' +
        '<div style="font-weight:bold;color:#333;margin-bottom:10px;font-size:1.1em;border-bottom:2px solid #FF9800;padding-bottom:5px;">' +
        '📊 CARACTÉRISTIQUES TECHNIQUES</div>' +
        rows.join('') + '</div>';
}

function getPointEclairColor(pointEclair) {
    var match = pointEclair.match(/-?\d+/);
    if (!match) return { bg: '#fff3e0', text: '#e65100' };
    
    var temp = parseInt(match[0]);
    
    if (temp < 0) return { bg: '#ffcdd2', text: '#b71c1c' };
    else if (temp < 23) return { bg: '#ffe0b2', text: '#e65100' };
    else if (temp < 60) return { bg: '#fff9c4', text: '#f57f17' };
    else return { bg: '#e8f5e9', text: '#2e7d32' };
}

function preparerFicheGMU(onu) {
    var matiere = tmdDatabase.find(function(p) { return p.onu.toString() === onu.toString(); });
    
    if (!matiere) {
        alert("⚠️ Erreur : Impossible de retrouver les données pour l'ONU " + onu);
        return;
    }

    if (typeof afficherFicheGMU === 'function') {
        afficherFicheGMU(matiere);
    } else {
        alert('❌ Erreur : Le module GMU (affichage-gmu.js) n\'est pas chargé.');
    }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE PUISSANCE FEU
// ═══════════════════════════════════════════════════════════════════════

function selectFireSource(type) {
    var maxSelections = {fenetre: 10, porte: 5, baie: 3, garage: 2, entrepot: 1};
    fireSelection[type] = fireSelection[type] < maxSelections[type] ? fireSelection[type] + 1 : 0;
    
    var counter = document.getElementById('count-' + type);
    if (counter) {
        counter.textContent = fireSelection[type];
        counter.style.display = fireSelection[type] > 0 ? 'block' : 'none';
    }
    calculateFirePower();
}

function addFire(type) {
    fireSelection[type] = (fireSelection[type] || 0) + 1;
    var counter = document.getElementById('count-' + type);
    if (counter) {
        counter.textContent = fireSelection[type];
        counter.style.display = fireSelection[type] > 0 ? 'block' : 'none';
    }
    calculateFirePower();
}

function calculateFirePower() {
    var totalPower = 0;
    for (var type in fireSelection) {
        totalPower += fireSelection[type] * firePowers[type];
    }
    
    var debitNecessaire = (totalPower / 1.4) * 100;
    
    var debitColor, debitBgColor, borderColor;
    if (debitNecessaire <= 500) {
        debitColor = '#4CAF50'; debitBgColor = 'rgba(76, 175, 80, 0.25)'; borderColor = '#4CAF50';
    } else if (debitNecessaire <= 1000) {
        debitColor = '#FF9800'; debitBgColor = 'rgba(255, 152, 0, 0.25)'; borderColor = '#FF9800';
    } else {
        debitColor = '#F44336'; debitBgColor = 'rgba(244, 67, 54, 0.25)'; borderColor = '#F44336';
    }
    
    var totalPowerElement = document.getElementById('totalPower');
    var flowRateElement = document.getElementById('flowRate');
    var flowRateItemElement = document.getElementById('flowRateItem');
    
    if (totalPowerElement) totalPowerElement.textContent = totalPower.toFixed(1) + ' MW';
    if (flowRateElement) {
        flowRateElement.textContent = debitNecessaire.toFixed(0) + ' L/min';
        flowRateElement.style.color = debitColor;
    }
    if (flowRateItemElement) {
        flowRateItemElement.style.background = debitBgColor;
        flowRateItemElement.style.borderColor = borderColor;
        flowRateItemElement.style.borderWidth = '5px';
        flowRateItemElement.style.borderStyle = 'solid';
    }
}

function resetFire() {
    fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
    for (var type in fireSelection) {
        var counter = document.getElementById('count-' + type);
        if (counter) { counter.textContent = '0'; counter.style.display = 'none'; }
    }
    var totalPowerElement = document.getElementById('totalPower');
    var flowRateElement = document.getElementById('flowRate');
    if (totalPowerElement) totalPowerElement.textContent = '0 MW';
    if (flowRateElement) { flowRateElement.textContent = '0 L/min'; flowRateElement.style.color = 'var(--text-primary)'; }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE ÉMULSEUR
// ═══════════════════════════════════════════════════════════════════════

function calculateEmulseur() {
    var surface = parseFloat(document.getElementById('emul-surface')?.value || 0);
    var type = document.getElementById('emul-type')?.value || 'hydrocarbure';
    var concentration = parseFloat(document.getElementById('emul-concentration')?.value || 3);
    
    var debitEau = type === 'hydrocarbure' ? surface * 6 : type === 'polaire' ? surface * 8 : surface * 10;
    var debitEmulseur = (debitEau * concentration) / (100 - concentration);
    var volumeEmulseur10min = debitEmulseur * 10;
    var bidons20L = Math.ceil(volumeEmulseur10min / 20);
    
    var resultDiv = document.getElementById('emul-result');
    if (resultDiv) {
        resultDiv.innerHTML = '<div class="result-box"><h3>Besoins en émulseur :</h3>' +
            '<div class="result-item"><span>Débit eau :</span><span class="result-value">' + debitEau.toFixed(0) + ' L/min</span></div>' +
            '<div class="result-item"><span>Débit émulseur :</span><span class="result-value">' + debitEmulseur.toFixed(1) + ' L/min</span></div>' +
            '<div class="result-item"><span>Volume pour 10 min :</span><span class="result-value">' + volumeEmulseur10min.toFixed(0) + ' L</span></div>' +
            '<div class="result-item"><span>Bidons 20L nécessaires :</span><span class="result-value">' + bidons20L + '</span></div></div>';
    }
}

function setEmulseurMode(mode) {
    var directDiv = document.getElementById('emulseurDirect');
    var inverseDiv = document.getElementById('emulseurInverse');
    var btnDirect = document.getElementById('btnModeDirect');
    var btnInverse = document.getElementById('btnModeInverse');
    
    if (mode === 'direct') {
        if (directDiv) directDiv.style.display = 'block';
        if (inverseDiv) inverseDiv.style.display = 'none';
        if (btnDirect) btnDirect.style.background = 'linear-gradient(135deg, var(--primary-red) 0%, var(--primary-red-dark) 100%)';
        if (btnInverse) btnInverse.style.background = '#666';
        updateEmulseur();
    } else {
        if (directDiv) directDiv.style.display = 'none';
        if (inverseDiv) inverseDiv.style.display = 'block';
        if (btnDirect) btnDirect.style.background = '#666';
        if (btnInverse) btnInverse.style.background = 'linear-gradient(135deg, var(--primary-red) 0%, var(--primary-red-dark) 100%)';
        updateEmulseurInverse();
    }
}

function setTauxApplication(value) {
    var tauxInput = document.getElementById('liquidType');
    if (tauxInput) tauxInput.value = value;
    highlightButton(['btnTaux10', 'btnTaux20'], 'btnTaux' + value);
    updateEmulseur();
}

function setConcentration(value) {
    var concInput = document.getElementById('concentration');
    if (concInput) concInput.value = value;
    highlightButton(['btnConc1', 'btnConc3', 'btnConc6'], 'btnConc' + value);
    updateEmulseur();
}

function setTauxApplicationInv(value) {
    var tauxInput = document.getElementById('liquidTypeInv');
    if (tauxInput) tauxInput.value = value;
    updateEmulseurInverse();
}

function setConcentrationInv(value) {
    var concInput = document.getElementById('concentrationInv');
    if (concInput) concInput.value = value;
    updateEmulseurInverse();
}

function adjustDuree(delta) {
    var dureeInput = document.getElementById('duree');
    if (dureeInput) {
        var newValue = Math.max(5, Math.min(60, parseInt(dureeInput.value) + delta));
        dureeInput.value = newValue;
        updateEmulseur();
    }
}

function adjustDureeInv(delta) {
    var dureeInput = document.getElementById('dureeInv');
    if (dureeInput) {
        var newValue = Math.max(5, Math.min(60, parseInt(dureeInput.value) + delta));
        dureeInput.value = newValue;
        updateEmulseurInverse();
    }
}

function adjustEmulseurStock(delta) {
    var stockInput = document.getElementById('stockEmulseur');
    if (stockInput) {
        var newValue = Math.max(0, parseInt(stockInput.value) + delta);
        stockInput.value = newValue;
        updateEmulseurInverse();
    }
}

function updateEmulseur() {
    var surface = parseFloat(document.getElementById('surface')?.value || 0);
    var duree = parseInt(document.getElementById('duree')?.value || 20);
    var tauxApplication = parseFloat(document.getElementById('liquidType')?.value || 10);
    var concentration = parseFloat(document.getElementById('concentration')?.value || 3);
    
    var debitSolution = surface * tauxApplication;
    var volumeSolution = debitSolution * duree;
    var volumeEmulseur = volumeSolution * (concentration / 100);
    var volumeEau = volumeSolution - volumeEmulseur;
    var bidons20L = Math.ceil(volumeEmulseur / 20);
    
    var volumesDiv = document.getElementById('emulseurVolumes');
    if (volumesDiv) {
        volumesDiv.innerHTML = '<div class="result-item"><span>Volume solution :</span><span class="result-value">' + volumeSolution.toFixed(0) + ' L</span></div>' +
            '<div class="result-item"><span>Eau nécessaire :</span><span class="result-value">' + volumeEau.toFixed(0) + ' L</span></div>';
    }
    
    var debitsDiv = document.getElementById('emulseurDebits');
    if (debitsDiv) {
        debitsDiv.innerHTML = '<div class="result-item"><span>Débit solution :</span><span class="result-value">' + debitSolution.toFixed(0) + ' L/min</span></div>';
    }
    
    var quantiteDiv = document.getElementById('emulseurQuantite');
    if (quantiteDiv) {
        quantiteDiv.innerHTML = '<div class="info-card" style="background:rgba(255,255,255,0.3);border:2px solid #F57C00;">' +
            '<div class="label" style="color:#000;">Volume émulseur à ' + concentration + '%</div>' +
            '<div class="value" style="font-size:1.8em;color:#000;font-weight:900;">' + volumeEmulseur.toFixed(0) + ' L</div></div>' +
            '<div class="result-item" style="margin-top:10px;"><span>Bidons 20L :</span><span class="result-value">' + bidons20L + ' bidons</span></div>';
    }
}

function updateEmulseurInverse() {
    var stockEmulseur = parseFloat(document.getElementById('stockEmulseur')?.value || 100);
    var duree = parseInt(document.getElementById('dureeInv')?.value || 20);
    var tauxApplication = parseFloat(document.getElementById('liquidTypeInv')?.value || 10);
    var concentration = parseFloat(document.getElementById('concentrationInv')?.value || 3);
    
    var volumeSolution = stockEmulseur / (concentration / 100);
    var debitSolution = volumeSolution / duree;
    var surface = debitSolution / tauxApplication;
    var volumeEau = volumeSolution - stockEmulseur;
    
    var resultsDiv = document.getElementById('emulseurInverseResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<div class="info-card" style="background:rgba(255,255,255,0.3);border:2px solid #F57C00;">' +
            '<div class="label" style="color:#000;">Surface couverte</div>' +
            '<div class="value" style="font-size:1.8em;color:#000;font-weight:900;">' + surface.toFixed(1) + ' m²</div></div>';
    }
    
    var detailsDiv = document.getElementById('emulseurInverseDetails');
    if (detailsDiv) {
        detailsDiv.innerHTML = '<div class="result-item"><span>Eau nécessaire :</span><span class="result-value">' + volumeEau.toFixed(0) + ' L</span></div>' +
            '<div class="result-item"><span>Volume solution :</span><span class="result-value">' + volumeSolution.toFixed(0) + ' L</span></div>' +
            '<div class="result-item"><span>Débit solution :</span><span class="result-value">' + debitSolution.toFixed(0) + ' L/min</span></div>';
    }
}

function toggleCustomTaux() { toggleCustomField('customRateDiv', 'customRate'); }
function toggleCustomTauxInv() { toggleCustomField('customRateDivInv', 'customRateInv'); }
function toggleCustomConc() { toggleCustomField('customConcDiv', 'customConcValue'); }
function toggleCustomConcInv() { toggleCustomField('customConcDivInv', 'customConcValueInv'); }

function toggleCustomField(divId, inputId) {
    var div = document.getElementById(divId);
    var input = document.getElementById(inputId);
    if (div) {
        div.style.display = div.style.display === 'none' ? 'block' : 'none';
        if (input && div.style.display === 'block') { input.focus(); input.select(); }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE PERTES DE CHARGE
// ═══════════════════════════════════════════════════════════════════════

function adjustJonctions(delta) { adjustInputValue('jonctionsPerte', delta, 0, 50); }
function adjustNbTuyaux(delta) { adjustInputValue('nbTuyaux20', delta, 0, 100); }
function adjustDeniveleTroncon(delta) { adjustInputValue('deniveleTroncon', delta, -100, 100); }
function adjustDebit(delta) { adjustInputValue('debitTroncon', delta, 0, 5000); }

function adjustInputValue(inputId, delta, min, max) {
    var input = document.getElementById(inputId);
    if (input) {
        var newValue = parseInt(input.value) + delta;
        if (min !== undefined) newValue = Math.max(min, newValue);
        if (max !== undefined) newValue = Math.min(max, newValue);
        input.value = newValue;
    }
}

function setDiametreTroncon(value) {
    var diamInput = document.getElementById('diametreTroncon');
    if (diamInput) diamInput.value = value;
    highlightButton(['btnDiam45', 'btnDiam70', 'btnDiam110'], 'btnDiam' + value);
}

function setPressionLance(value) {
    var pressInput = document.getElementById('pressionLanceTroncon');
    if (pressInput) pressInput.value = value;
    highlightButton(['btnPress6', 'btnPress8', 'btnPress12', 'btnPress16'], 'btnPress' + value);
}

function setDebitLance(value) {
    var debitInput = document.getElementById('debitTroncon');
    if (debitInput) debitInput.value = value;
    highlightButton(['btnDebit250', 'btnDebit500', 'btnDebit1000', 'btnDebit2000'], 'btnDebit' + value);
}

function toggleCustomPression() { toggleCustomField('customPressionDiv', 'customPressionValue'); }

function toggleDebitPressionFields() {
    var typeEtablissement = document.getElementById('commentaireTroncon')?.value;
    var debitGroup = document.getElementById('debitGroup');
    var pressionGroup = document.getElementById('pressionGroup');
    
    if (typeEtablissement === 'Alimentation') {
        if (debitGroup) debitGroup.style.display = 'none';
        if (pressionGroup) pressionGroup.style.display = 'none';
    } else {
        if (debitGroup) debitGroup.style.display = 'block';
        if (pressionGroup) pressionGroup.style.display = 'block';
    }
}

function ajouterTroncon() {
    var diametre = parseInt(document.getElementById('diametreTroncon')?.value || 70);
    var nbTuyaux = parseInt(document.getElementById('nbTuyaux20')?.value || 1);
    var longueur = nbTuyaux * 20;
    var denivele = parseInt(document.getElementById('deniveleTroncon')?.value || 0);
    var commentaire = document.getElementById('commentaireTroncon')?.value || '';
    
    if (!commentaire) { alert('⚠️ Veuillez sélectionner un type d\'établissement'); return; }
    
    if (commentaire === 'Alimentation') {
        tronconsPerte.push({ diametre: diametre, nbTuyaux: nbTuyaux, longueur: longueur, denivele: denivele, debit: 0, pressionLance: 0, commentaire: commentaire, isAlimentation: true });
    } else {
        var debit = parseInt(document.getElementById('debitTroncon')?.value || 0);
        var pressionLance = parseFloat(document.getElementById('pressionLanceTroncon')?.value || 6);
        if (debit <= 0) { alert('⚠️ Veuillez saisir un débit supérieur à 0'); return; }
        tronconsPerte.push({ diametre: diametre, nbTuyaux: nbTuyaux, longueur: longueur, denivele: denivele, debit: debit, pressionLance: pressionLance, commentaire: commentaire, isAlimentation: false });
    }
    
    afficherTroncons();
    document.getElementById('nbTuyaux20').value = '1';
    document.getElementById('deniveleTroncon').value = '0';
    document.getElementById('commentaireTroncon').value = '';
    toggleDebitPressionFields();
}

function afficherTroncons() {
    var tableBody = document.getElementById('tableTroncons');
    var container = document.getElementById('tableTronconsContainer');
    if (!tableBody) return;
    
    if (tronconsPerte.length === 0) { if (container) container.style.display = 'none'; return; }
    if (container) container.style.display = 'block';
    
    tableBody.innerHTML = tronconsPerte.map(function(t, i) {
        var perteReseau = calculerPerteTroncon(t);
        var perteDenivele = t.denivele / 10;
        var pressionTotale = t.isAlimentation ? (perteReseau + perteDenivele) : (t.pressionLance + perteReseau + perteDenivele);
        var typeIcon = t.isAlimentation ? '🔵' : '🔴';
        var typeColor = t.isAlimentation ? '#2196F3' : '#F44336';
        
        return '<tr style="background:' + (t.isAlimentation ? 'rgba(33,150,243,0.1)' : 'rgba(244,67,54,0.1)') + ';">' +
            '<td style="font-weight:bold;">' + (i + 1) + '</td>' +
            '<td style="font-weight:bold;color:' + typeColor + ';">' + typeIcon + ' ' + t.commentaire + '</td>' +
            '<td>' + t.diametre + '</td>' +
            '<td>' + t.nbTuyaux + ' × 20m (' + t.longueur + 'm)</td>' +
            '<td>' + (t.isAlimentation ? '-' : t.debit) + '</td>' +
            '<td>' + (t.denivele > 0 ? '+' : '') + t.denivele + 'm</td>' +
            '<td>' + (t.isAlimentation ? '-' : t.pressionLance + ' bar') + '</td>' +
            '<td style="color:#FF9800;font-weight:bold;">' + perteReseau.toFixed(2) + ' bar</td>' +
            '<td style="font-weight:bold;color:#FFD700;background:rgba(255,215,0,0.15);">' + pressionTotale.toFixed(2) + ' bar</td>' +
            '<td><button onclick="supprimerTroncon(' + i + ')" style="padding:8px 12px;background:#F44336;border:none;border-radius:8px;color:white;cursor:pointer;">❌</button></td></tr>';
    }).join('');
}

function calculerPerteTroncon(troncon) {
    var K, debitRef;
    if (troncon.diametre === 45) { K = 1.2; debitRef = 500; }
    else if (troncon.diametre === 70) { K = 0.11; debitRef = 500; }
    else if (troncon.diametre === 110) { K = 0.056; debitRef = 1000; }
    else { K = 0.11; debitRef = 500; }
    return K * Math.pow(troncon.debit / debitRef, 2) * (troncon.longueur / 20);
}

function supprimerTroncon(index) { tronconsPerte.splice(index, 1); afficherTroncons(); }

function calculerPertes() {
    if (tronconsPerte.length === 0) { alert('⚠️ Veuillez ajouter au moins un établissement'); return; }
    
    var jonctions = parseInt(document.getElementById('jonctionsPerte')?.value || 0);
    var pertJonctions = jonctions * 1;
    
    var alimentations = tronconsPerte.filter(function(t) { return t.isAlimentation; });
    var lances = tronconsPerte.filter(function(t) { return !t.isAlimentation; });
    
    if (lances.length === 0) { alert('⚠️ Veuillez ajouter au moins une lance'); return; }
    
    var debitTotal = lances.reduce(function(sum, t) { return sum + t.debit; }, 0);
    
    var pressionMaxLance = 0;
    lances.forEach(function(t) {
        var pressionTotale = t.pressionLance + calculerPerteTroncon(t) + (t.denivele / 10);
        if (pressionTotale > pressionMaxLance) pressionMaxLance = pressionTotale;
    });
    
    var pressionAlimentation = 0;
    alimentations.forEach(function(t) {
        var tWithDebit = Object.assign({}, t, { debit: debitTotal });
        pressionAlimentation += calculerPerteTroncon(tWithDebit) + (t.denivele / 10);
    });
    
    var pressionPompe = pressionAlimentation + pressionMaxLance + pertJonctions;
    
    var resultatDiv = document.getElementById('resultatPertes');
    var pressionValue = document.getElementById('pressionPompeValue');
    if (resultatDiv) resultatDiv.style.display = 'block';
    if (pressionValue) pressionValue.textContent = pressionPompe.toFixed(1) + ' bar';
    
    var detailCalc = document.getElementById('detailCalculPertes');
    if (detailCalc) {
        detailCalc.innerHTML = '<div style="background:linear-gradient(135deg,#4CAF50,#388E3C);padding:25px;border-radius:12px;text-align:center;">' +
            '<div style="color:#FFF;font-size:1.3em;font-weight:bold;">💡 CALCUL</div>' +
            '<div style="color:#FFF;font-size:1.5em;margin-top:10px;background:rgba(0,0,0,0.2);padding:15px;border-radius:8px;">' +
            pressionAlimentation.toFixed(2) + ' + ' + pressionMaxLance.toFixed(2) + ' + ' + pertJonctions.toFixed(1) + ' = <span style="color:#FFD700;">' + pressionPompe.toFixed(1) + ' bar</span></div></div>';
    }
}

function resetPertes() {
    tronconsPerte = [];
    var fields = ['jonctionsPerte', 'nbTuyaux20', 'deniveleTroncon', 'debitTroncon', 'pressionLanceTroncon', 'commentaireTroncon'];
    var defaults = ['0', '1', '0', '500', '6', ''];
    fields.forEach(function(id, i) { var el = document.getElementById(id); if (el) el.value = defaults[i]; });
    afficherTroncons();
    var resultatDiv = document.getElementById('resultatPertes');
    if (resultatDiv) resultatDiv.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE ARI
// ═══════════════════════════════════════════════════════════════════════

function calculerAutonomieARI() {
    var pression = parseFloat(document.getElementById('pressionARI')?.value || 300);
    var volume = parseFloat(document.getElementById('volumeARI')?.value || 9);
    var conso = parseFloat(document.getElementById('consoARI')?.value || 100);
    var securite = parseFloat(document.getElementById('securiteARI')?.value || 55);
    
    var volumeAirTotal = pression * volume;
    var autonomieTotale = volumeAirTotal / conso;
    var miTemps = autonomieTotale / 2;
    var pressionUtilisable = pression - securite;
    var tempsSifflet = (pressionUtilisable * volume) / conso;
    
    var alertePressioBasse = document.getElementById('alertePressioBasse');
    if (alertePressioBasse) alertePressioBasse.style.display = pression < 270 ? 'block' : 'none';
    
    var resultDiv = document.getElementById('resultatsARI');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        setTextContent('pressionUtilisable', pressionUtilisable.toFixed(0) + ' bar');
        setTextContent('volumeAir', volumeAirTotal.toFixed(0) + ' L');
        setTextContent('autonomieTotale', autonomieTotale.toFixed(0) + ' min');
        setTextContent('miTemps', miTemps.toFixed(0) + ' min');
        setTextContent('tempsSifflet', tempsSifflet.toFixed(0) + ' min');
        setTextContent('autonomieExacte', '(Exact: ' + autonomieTotale.toFixed(2) + ' min)');
        setTextContent('miTempsExact', '(Exact: ' + miTemps.toFixed(2) + ' min)');
        setTextContent('tempsSiffletExact', '(Exact: ' + tempsSifflet.toFixed(2) + ' min)');
    }
}

function setBouteilleARI(volume) {
    var input = document.getElementById('volumeARI');
    if (input) input.value = volume;
    highlightButton(['btnBout6', 'btnBout7', 'btnBout9'], volume === 6 ? 'btnBout6' : volume === 7.2 ? 'btnBout7' : 'btnBout9');
    calculerAutonomieARI();
}

function adjustPressionARI(delta) { adjustInputValue('pressionARI', delta, 0, 300); calculerAutonomieARI(); }
function adjustConsoARI(delta) { adjustInputValue('consoARI', delta, 40, 150); calculerAutonomieARI(); }
function adjustSecuriteARI(delta) { adjustInputValue('securiteARI', delta, 40, 100); calculerAutonomieARI(); }

// ═══════════════════════════════════════════════════════════════════════
// MODULE DISTANCES SÉCURITÉ
// ═══════════════════════════════════════════════════════════════════════

function showDistanceCategory(category) {
    var menu = document.getElementById('distancesMenu');
    if (menu) menu.style.display = 'none';
    
    document.querySelectorAll('.distance-section').forEach(function(s) { s.style.display = 'none'; });
    
    var sectionId = 'distance' + category.charAt(0).toUpperCase() + category.slice(1);
    var section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        if (category === 'gaz') showGazType('transport');
        if (category === 'electricite') showElecType('generalites');
    }
}

function backToDistancesMenu() {
    document.querySelectorAll('.distance-section').forEach(function(s) { s.style.display = 'none'; });
    var menu = document.getElementById('distancesMenu');
    if (menu) menu.style.display = 'grid';
}

function showGazType(type) {
    type = type || 'transport';
    var allCards = ['gaz-transport', 'gaz-distribution', 'gaz-mpc', 'gaz-gpl', 'gaz-bouteilles', 'gaz-acetylene', 'gaz-methanisation'];
    allCards.forEach(function(id) { var card = document.getElementById(id); if (card) card.style.display = 'none'; });
    
    var allButtons = ['btnGazTransport', 'btnGazDistribution', 'btnGazMpc', 'btnGazGpl', 'btnGazBouteilles', 'btnGazAcetylene', 'btnGazMethanisation'];
    allButtons.forEach(function(id) { var btn = document.getElementById(id); if (btn) { btn.style.opacity = '0.6'; btn.style.transform = 'scale(1)'; } });
    
    var buttonMap = { 'transport': 'btnGazTransport', 'distribution': 'btnGazDistribution', 'mpc': 'btnGazMpc', 'gpl': 'btnGazGpl', 'bouteilles': 'btnGazBouteilles', 'acetylene': 'btnGazAcetylene', 'methanisation': 'btnGazMethanisation' };
    var activeBtn = document.getElementById(buttonMap[type]);
    if (activeBtn) { activeBtn.style.opacity = '1'; activeBtn.style.transform = 'scale(1.05)'; }
    
    var selectedCard = document.getElementById('gaz-' + type);
    if (selectedCard) {
        selectedCard.style.display = 'block';
        if (type === 'transport') calculateTransport();
    }
}

function showElecType(type) {
    type = type || 'generalites';
    var allCards = ['elec-generalites', 'elec-voisinage', 'elec-zonage', 'elec-cable', 'elec-eolienne', 'elec-ppv'];
    allCards.forEach(function(id) { var card = document.getElementById(id); if (card) card.style.display = 'none'; });
    
    var allButtons = ['btnElecGeneralites', 'btnElecVoisinage', 'btnElecZonage', 'btnElecCable', 'btnElecEolienne', 'btnElecPpv'];
    allButtons.forEach(function(id) { var btn = document.getElementById(id); if (btn) { btn.style.opacity = '0.6'; btn.style.transform = 'scale(1)'; } });
    
    var buttonMap = { 'generalites': 'btnElecGeneralites', 'voisinage': 'btnElecVoisinage', 'zonage': 'btnElecZonage', 'cable': 'btnElecCable', 'eolienne': 'btnElecEolienne', 'ppv': 'btnElecPpv' };
    var activeBtn = document.getElementById(buttonMap[type]);
    if (activeBtn) { activeBtn.style.opacity = '1'; activeBtn.style.transform = 'scale(1.05)'; }
    
    var selectedCard = document.getElementById('elec-' + type);
    if (selectedCard) {
        selectedCard.style.display = 'block';
        if (type === 'eolienne') calculateEolienne();
    }
}

function calculateTransport() {
    var diametre = parseFloat(document.getElementById('diametreTransport')?.value || 0);
    setTextContent('perimetreTransport', diametre + ' m');
}

function adjustDiametreTransport(delta) { adjustInputValue('diametreTransport', delta, 50, 500); calculateTransport(); }

function calculateEolienne() {
    var hauteur = parseFloat(document.getElementById('hauteurEolienne')?.value || 100);
    setTextContent('perimetreEolienne', (hauteur * 1.2).toFixed(0) + ' m');
}

function adjustHauteurEolienne(delta) { adjustInputValue('hauteurEolienne', delta, 50, 250); calculateEolienne(); }

function calculateSiloReflechi() { var h = parseFloat(document.getElementById('hauteurSilo')?.value || 30); setTextContent('perimatreSiloReflechi', (h * 1.5).toFixed(0) + ' m'); }
function calculateArbre() { var h = parseFloat(document.getElementById('hauteurArbre')?.value || 20); setTextContent('perimetreArbre', (h * 1.5).toFixed(0) + ' m'); }
function calculateMur() { var h = parseFloat(document.getElementById('hauteurMur')?.value || 3); setTextContent('perimatreMur', (h * 1.5).toFixed(0) + ' m'); }

// ═══════════════════════════════════════════════════════════════════════
// MODULE CONVERTISSEUR
// ═══════════════════════════════════════════════════════════════════════

function initConversionData() {
    conversionData = {
        pression: { name: '🔧 PRESSION', units: { 'bar': 1, 'Pa': 100000, 'kPa': 100, 'psi': 14.5038, 'atm': 0.986923 }, quickValues: [1, 2, 5, 10, 20, 50], defaultUnit1: 'bar', defaultUnit2: 'psi' },
        debit: { name: '💧 DÉBIT', units: { 'L/min': 1, 'L/s': 1/60, 'm³/h': 0.06, 'L/h': 60 }, quickValues: [100, 250, 500, 1000, 2000], defaultUnit1: 'L/min', defaultUnit2: 'm³/h' },
        volume: { name: '🪣 VOLUME', units: { 'L': 1, 'm³': 0.001, 'mL': 1000 }, quickValues: [100, 500, 1000, 5000, 10000], defaultUnit1: 'L', defaultUnit2: 'm³' },
        distance: { name: '📏 DISTANCE', units: { 'm': 1, 'km': 0.001, 'cm': 100, 'mm': 1000 }, quickValues: [10, 50, 100, 500, 1000], defaultUnit1: 'm', defaultUnit2: 'km' },
        vitesse: { name: '🚒 VITESSE', units: { 'km/h': 1, 'm/s': 0.277778, 'mph': 0.621371 }, quickValues: [30, 50, 90, 130], defaultUnit1: 'km/h', defaultUnit2: 'm/s' },
        temperature: { name: '🌡️ TEMPÉRATURE', units: ['°C', '°F', 'K'], quickValues: [0, 20, 37, 100], defaultUnit1: '°C', defaultUnit2: '°F',
            convert: function(value, from, to) {
                var celsius = from === '°F' ? (value - 32) * 5/9 : from === 'K' ? value - 273.15 : value;
                if (to === '°C') return celsius;
                if (to === '°F') return (celsius * 9/5) + 32;
                if (to === 'K') return celsius + 273.15;
                return value;
            }
        }
    };
}

function selectQuickConvert(type) {
    currentConversionType = type;
    var data = conversionData[type];
    if (!data) return;
    
    var zoneDiv = document.getElementById('conversionZone');
    if (zoneDiv) zoneDiv.style.display = 'block';
    setTextContent('conversionTitle', data.name);
    
    var unit1 = document.getElementById('unit1');
    var unit2 = document.getElementById('unit2');
    
    if (type === 'temperature') {
        unit1.innerHTML = data.units.map(function(u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');
        unit2.innerHTML = data.units.map(function(u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');
    } else {
        var unitNames = Object.keys(data.units);
        unit1.innerHTML = unitNames.map(function(u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');
        unit2.innerHTML = unitNames.map(function(u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');
    }
    
    unit1.value = data.defaultUnit1;
    unit2.value = data.defaultUnit2;
    
    var container = document.getElementById('quickValuesButtons');
    if (container) {
        container.innerHTML = data.quickValues.map(function(val) {
            return '<button onclick="setQuickValue(' + val + ')" style="padding:10px 20px;background:var(--primary-red);border:none;border-radius:8px;color:white;font-weight:bold;cursor:pointer;margin:5px;">' + val + '</button>';
        }).join('');
    }
    
    document.getElementById('value1').value = '';
    setTextContent('value2', '--');
}

function setQuickValue(value) { document.getElementById('value1').value = value; convertValue(); }

function convertValue() {
    var value = parseFloat(document.getElementById('value1').value);
    var value2Div = document.getElementById('value2');
    
    if (isNaN(value)) { if (value2Div) value2Div.textContent = '--'; return; }
    
    var from = document.getElementById('unit1').value;
    var to = document.getElementById('unit2').value;
    var result;
    
    if (currentConversionType === 'temperature') {
        result = conversionData.temperature.convert(value, from, to);
    } else {
        var data = conversionData[currentConversionType];
        var baseValue = value / data.units[from];
        result = baseValue * data.units[to];
    }
    
    var precision = Math.abs(result) < 1 ? 6 : Math.abs(result) < 100 ? 4 : 2;
    if (value2Div) value2Div.textContent = result.toFixed(precision);
}

function swapUnits() {
    var unit1 = document.getElementById('unit1');
    var unit2 = document.getElementById('unit2');
    var value2Text = document.getElementById('value2').textContent;
    var temp = unit1.value; unit1.value = unit2.value; unit2.value = temp;
    if (value2Text !== '--') { document.getElementById('value1').value = value2Text; convertValue(); }
}

function closeConverter() { var zoneDiv = document.getElementById('conversionZone'); if (zoneDiv) zoneDiv.style.display = 'none'; }
function updateConversionTable() {}

// ═══════════════════════════════════════════════════════════════════════
// MODULE ÉPUISEMENT
// ═══════════════════════════════════════════════════════════════════════

function selectShape(shape) {
    currentShape = shape;
    ['dimensions-rectangle', 'dimensions-carre', 'dimensions-cercle'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.shape-card').forEach(function(btn) { btn.classList.remove('active'); });
    
    var dimDiv = document.getElementById('dimensions-' + shape);
    if (dimDiv) dimDiv.style.display = 'block';
    var shapeCard = document.getElementById('shape-' + shape);
    if (shapeCard) shapeCard.classList.add('active');
    calculateEpuisement();
}

function modifierQuantite(materiel, delta) {
    quantites[materiel] = Math.max(0, quantites[materiel] + delta);
    setTextContent('qty-' + materiel, quantites[materiel]);
    calculateEpuisement();
}

function calculateEpuisement() {
    var surface = 0;
    if (currentShape === 'rectangle') {
        var l = parseFloat(document.getElementById('longueur')?.value || 10);
        var w = parseFloat(document.getElementById('largeur')?.value || 5);
        surface = l * w;
    } else if (currentShape === 'carre') {
        var c = parseFloat(document.getElementById('cote')?.value || 5);
        surface = c * c;
    } else if (currentShape === 'cercle') {
        var d = parseFloat(document.getElementById('diametre')?.value || 5);
        surface = Math.PI * Math.pow(d / 2, 2);
    }
    
    var hauteurValue = parseFloat(document.getElementById('hauteur')?.value || 50);
    var uniteHauteur = document.getElementById('uniteHauteur')?.value || 'cm';
    var hauteur = uniteHauteur === 'cm' ? hauteurValue / 100 : hauteurValue;
    
    var volume = surface * hauteur;
    var volumeLitres = volume * 1000;
    
    setTextContent('surfaceEpuis', surface.toFixed(2) + ' m²');
    setTextContent('volumeEau', volumeLitres.toFixed(0) + ' L (' + volume.toFixed(2) + ' m³)');
    
    var debitTotal = quantites.mat15 * 250 + quantites.mat30 * 500 + quantites.mat60 * 1000 + quantites.mat90 * 1500;
    
    var resultatDiv = document.getElementById('resultatMateriel');
    var mesuresDiv = document.getElementById('mesuresSecurite');
    
    if (debitTotal > 0) {
        var tempsMinutes = volumeLitres / debitTotal;
        var heures = Math.floor(tempsMinutes / 60);
        var minutes = Math.ceil(tempsMinutes % 60);
        
        setTextContent('tempsTotalEpuis', heures > 0 ? heures + 'h ' + minutes + 'min' : minutes + ' min');
        
        var detailDiv = document.getElementById('detailMateriel');
        if (detailDiv) {
            detailDiv.innerHTML = '<div style="background:var(--bg-main);padding:15px;border-radius:10px;">' +
                '<h4 style="color:#FF9800;">Débit total : <span style="color:#4CAF50;">' + debitTotal + ' L/min</span></h4></div>';
        }
        
        if (resultatDiv) resultatDiv.style.display = 'block';
        if (mesuresDiv) mesuresDiv.style.display = 'block';
    } else {
        if (resultatDiv) resultatDiv.style.display = 'none';
        if (mesuresDiv) mesuresDiv.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE ABAQUE DENSITÉS
// ═══════════════════════════════════════════════════════════════════════

function calculateAbaqueAll() {
    var longueur = parseFloat(document.getElementById('abaque-longueur')?.value || 0);
    var largeur = parseFloat(document.getElementById('abaque-largeur')?.value || 0);
    var hauteur = parseFloat(document.getElementById('abaque-hauteur')?.value || 0);
    
    var volume = longueur * largeur * hauteur;
    var volumeLitres = volume * 1000;
    
    setTextContent('abaque-volume-display', volume.toFixed(3) + ' m³');
    setTextContent('abaque-volume-litres', volumeLitres.toFixed(0) + ' litres');
    
    if (densityData.length === 0) return;
    
    var categories = [];
    densityData.forEach(function(item) {
        if (categories.indexOf(item.categorie) === -1) categories.push(item.categorie);
    });
    
    var html = '';
    categories.forEach(function(cat) {
        var items = densityData.filter(function(item) { return item.categorie === cat; });
        
        html += '<div style="background:var(--bg-card);padding:15px;border-radius:12px;border:2px solid var(--border-medium);margin-bottom:15px;">' +
            '<h3 style="color:var(--primary-red);margin-bottom:12px;border-bottom:2px solid var(--primary-red);padding-bottom:8px;">' + getCategoryIcon(cat) + ' ' + cat + '</h3>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">';
        
        items.forEach(function(item) {
            var poids = volume * item.densite;
            var tonnes = poids / 1000;
            var color = getWeightColor(poids);
            html += '<div style="background:var(--bg-main);padding:12px;border-radius:8px;border-left:4px solid ' + color + ';">' +
                '<div style="font-weight:bold;margin-bottom:6px;">' + item.nom + '</div>' +
                '<div style="font-size:0.9em;color:var(--text-secondary);">Densité: ' + item.densite + ' kg/m³</div>' +
                '<div style="background:#FFF;padding:12px;border-radius:8px;text-align:center;margin-top:8px;border:2px solid ' + color + ';">' +
                '<div style="font-size:2em;font-weight:bold;color:#000;">' + (poids >= 1000 ? tonnes.toFixed(2) : poids.toFixed(0)) + '</div>' +
                '<div style="font-size:1em;color:#000;font-weight:600;">' + (poids >= 1000 ? 'tonnes' : 'kg') + '</div></div></div>';
        });
        html += '</div></div>';
    });
    
    var resultsDiv = document.getElementById('abaque-results');
    if (resultsDiv) resultsDiv.innerHTML = html;
}

function getCategoryIcon(cat) {
    var icons = { 'Référence': '📏', 'Hydrocarbure': '⛽', 'Alcool': '🧪', 'Construction': '🏗️', 'Métal': '🔩', 'Bois': '🌲' };
    return icons[cat] || '📦';
}

function getWeightColor(poids) {
    if (poids < 100) return '#4CAF50';
    if (poids < 500) return '#88ff00';
    if (poids < 1000) return '#FF9800';
    if (poids < 5000) return '#ff6600';
    return '#ff0000';
}

function updateAbaqueForm() { calculateAbaqueAll(); }
function calculateAbaque() { calculateAbaqueAll(); }

// ═══════════════════════════════════════════════════════════════════════
// MODULE FEU DE FORÊT
// ═══════════════════════════════════════════════════════════════════════

function selectVentRapide(vitesse) {
    ventSelectionne = vitesse;
    document.querySelectorAll('.vent-btn').forEach(function(btn) { btn.style.transform = 'scale(1)'; btn.style.boxShadow = ''; });
    if (event && event.target) {
        event.target.style.boxShadow = '0 0 0 4px rgba(229, 57, 53, 0.3)';
        event.target.style.transform = 'scale(1.05)';
    }
    calculateFeuForetRegle3pct();
}

function selectAngleCone(angle) {
    var input = document.getElementById('angle-cone');
    if (input) input.value = angle;
    document.querySelectorAll('.angle-btn').forEach(function(btn) { btn.classList.remove('angle-selected'); });
    var selectedBtn = document.getElementById('angle-btn-' + angle);
    if (selectedBtn) selectedBtn.classList.add('angle-selected');
    if (ventSelectionne > 0) calculateFeuForetRegle3pct();
}

function calculateFeuForetRegle3pct() {
    var resultDiv = document.getElementById('feu-foret-result');
    if (!resultDiv) return;
    
    if (ventSelectionne === 0) {
        resultDiv.innerHTML = '<div class="alert-box" style="text-align:center;padding:30px;"><div style="font-size:2em;margin-bottom:15px;">💨</div><p>Sélectionnez une vitesse de vent</p></div>';
        return;
    }
    
    var vent = ventSelectionne;
    var angleCone = parseFloat(document.getElementById('angle-cone')?.value || 40);
    var vitessePropagation = vent * 0.03;
    var vitessePropagationMMin = vitessePropagation * (1000/60);
    
    var temps = [15, 30, 45, 60, 120];
    var distances = temps.map(function(t) { return vitessePropagationMMin * t; });
    var surfaces = distances.map(function(d) { return (angleCone / 360) * Math.PI * Math.pow(d, 2); });
    
    var niveauRisque, emoji, couleur;
    if (vitessePropagationMMin < 10) { niveauRisque = 'FAIBLE'; emoji = '✅'; couleur = '#4CAF50'; }
    else if (vitessePropagationMMin < 20) { niveauRisque = 'MODÉRÉ'; emoji = '⚠️'; couleur = '#ffaa00'; }
    else if (vitessePropagationMMin < 35) { niveauRisque = 'ÉLEVÉ'; emoji = '🚨'; couleur = '#ff6600'; }
    else { niveauRisque = 'CRITIQUE'; emoji = '❌'; couleur = '#ff0000'; }
    
    function formatDistance(d) { return d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(2) + ' km'; }
    function formatSurface(s) { return s < 10000 ? Math.round(s) + ' m²' : (s / 10000).toFixed(2) + ' ha'; }
    
    var html = '<div style="background:' + couleur + ';padding:25px;border-radius:15px;text-align:center;margin-bottom:25px;">' +
        '<div style="font-size:3em;margin-bottom:10px;">' + emoji + '</div>' +
        '<div style="font-size:1.8em;font-weight:bold;">RISQUE ' + niveauRisque + '</div>' +
        '<div style="background:rgba(0,0,0,0.3);padding:15px;border-radius:10px;margin-top:15px;">' +
        '<div style="font-size:0.9em;opacity:0.9;">Vent: ' + vent + ' km/h</div>' +
        '<div style="font-size:2.5em;font-weight:bold;">' + vitessePropagationMMin.toFixed(1) + ' m/min</div></div></div>';
    
    html += '<div class="result-box"><h3>📏 Distances parcourues</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:15px;">';
    var colors = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#FF5722'];
    temps.forEach(function(t, i) {
        html += '<div style="background:var(--bg-elevated);padding:15px;border-radius:10px;text-align:center;border-left:4px solid ' + colors[i] + ';">' +
            '<div style="font-size:0.9em;opacity:0.9;">⏱️ ' + (t >= 60 ? (t/60) + 'h' : t + ' min') + '</div>' +
            '<div style="font-size:1.8em;font-weight:bold;color:' + colors[i] + ';">' + formatDistance(distances[i]) + '</div></div>';
    });
    html += '</div></div>';
    
    resultDiv.innerHTML = html;
}

function calculateFeuForet() { calculateFeuForetRegle3pct(); }

// ═══════════════════════════════════════════════════════════════════════
// MODULE EXPLOSIMÉTRIE
// ═══════════════════════════════════════════════════════════════════════

function initExplosimetrie() {
    if (Object.keys(gazDatabase).length === 0) return;
    
    var gazEtalon = document.getElementById('gazEtalon');
    if (gazEtalon && gazEtalon.options.length <= 1) {
        ['Méthane', 'Propane', 'Pentane'].forEach(function(nom) {
            if (gazDatabase[nom]) {
                var option = document.createElement('option');
                option.value = nom; option.textContent = nom;
                gazEtalon.appendChild(option);
            }
        });
    }
    afficherGazPresents();
    updateTableauCorrections();
}

function afficherGazPresents() {
    var grid = document.getElementById('gazPresentsGrid');
    if (!grid) return;
    
    var gazPresents = Object.keys(gazDatabase).filter(function(nom) {
        return gazDatabase[nom] && gazDatabase[nom].lii !== undefined;
    });
    
    grid.innerHTML = gazPresents.map(function(nom) {
        var gaz = gazDatabase[nom];
        var cardId = 'gaz-card-' + nom.replace(/[^a-zA-Z0-9]/g, '_');
        return '<div class="gaz-card" onclick="selectionnerGaz(\'' + nom + '\')" id="' + cardId + '">' +
            '<div class="gaz-nom">' + nom + '</div><div class="gaz-lii">LII: ' + gaz.lii + '%</div></div>';
    }).join('');
}

function selectionnerGaz(nom) {
    gazSelectionne = nom;
    document.querySelectorAll('.gaz-card').forEach(function(card) { card.classList.remove('selected'); });
    var cardId = 'gaz-card-' + nom.replace(/[^a-zA-Z0-9]/g, '_');
    var card = document.getElementById(cardId);
    if (card) card.classList.add('selected');
    calculerCorrectionGaz();
}

function calculerCorrectionGaz() {
    if (!gazSelectionne) return;
    var valeurLue = parseFloat(document.getElementById('valeurExplo')?.value || 0);
    var gazEtalonNom = document.getElementById('gazEtalon')?.value;
    if (!gazEtalonNom || !gazDatabase[gazEtalonNom] || !gazDatabase[gazSelectionne]) return;
    
    var gazEtalon = gazDatabase[gazEtalonNom];
    var gazCible = gazDatabase[gazSelectionne];
    var coeffCorrection = gazEtalon.lii / gazCible.lii;
    var valeurCorrigee = valeurLue * coeffCorrection;
    
    var resultDiv = document.getElementById('resultatExplo');
    if (resultDiv) {
        var alerteMessage = valeurCorrigee >= 100 ? '<div class="danger-box" style="margin-top:15px;">⚠️ DANGER - Zone explosive!</div>' :
            valeurCorrigee >= 60 ? '<div class="alert-box" style="margin-top:15px;">⚠️ ATTENTION - Approche LII</div>' : '';
        
        resultDiv.innerHTML = '<div class="result-box"><h3>Résultat correction</h3>' +
            '<div class="result-item"><span>Gaz étalon :</span><span class="result-value">' + gazEtalonNom + ' (LII: ' + gazEtalon.lii + '%)</span></div>' +
            '<div class="result-item"><span>Gaz détecté :</span><span class="result-value">' + gazSelectionne + ' (LII: ' + gazCible.lii + '%)</span></div>' +
            '<div class="result-item"><span>Coefficient :</span><span class="result-value">' + coeffCorrection.toFixed(3) + '</span></div>' +
            '<div class="info-card" style="margin-top:15px;"><div class="label">Valeur corrigée</div>' +
            '<div class="value" style="font-size:2.5em;color:' + (valeurCorrigee >= 60 ? '#ff0000' : '#4CAF50') + ';">' + valeurCorrigee.toFixed(1) + '% LII</div></div>' +
            alerteMessage + '</div>';
    }
}

function updateTableauCorrections() {
    var gazEtalonNom = document.getElementById('gazEtalon')?.value;
    var tableBody = document.getElementById('tableCorrections');
    if (!tableBody || !gazEtalonNom || !gazDatabase[gazEtalonNom]) return;
    
    var gazEtalon = gazDatabase[gazEtalonNom];
    var gazList = Object.keys(gazDatabase).filter(function(nom) { return gazDatabase[nom] && gazDatabase[nom].lii !== undefined; });
    
    tableBody.innerHTML = gazList.map(function(nom) {
        var gaz = gazDatabase[nom];
        var coeff = gazEtalon.lii / gaz.lii;
        var isEtalon = nom === gazEtalonNom;
        return '<tr style="' + (isEtalon ? 'background:rgba(76,175,80,0.2);' : '') + '">' +
            '<td style="font-weight:' + (isEtalon ? 'bold' : 'normal') + ';">' + nom + '</td>' +
            '<td>' + gaz.lii + '%</td>' +
            '<td style="font-weight:bold;color:' + (coeff > 1 ? '#ff9900' : coeff < 1 ? '#4CAF50' : '#fff') + ';">' + coeff.toFixed(3) + '</td></tr>';
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE CALCUL DISTANCES
// ═══════════════════════════════════════════════════════════════════════

function switchDistanceTab(tabName) {
    document.querySelectorAll('#distance-calc .tab-content').forEach(function(t) { t.style.display = 'none'; });
    document.querySelectorAll('#distance-calc .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    var selectedTab = document.getElementById('dist-tab-' + tabName);
    if (selectedTab) selectedTab.style.display = 'block';
    if (event && event.target) event.target.classList.add('active');
    if (tabName === 'distance') calculateDistanceCalc();
    else if (tabName === 'perimetre') calculatePerimetreCalc();
    else if (tabName === 'surface') calculateSurfaceCalc();
}

function calculateDistanceCalc() {
    var horizontal = parseFloat(document.getElementById('dist-horizontal')?.value || 0);
    var vertical = parseFloat(document.getElementById('dist-vertical')?.value || 0);
    var distance = Math.sqrt(horizontal * horizontal + vertical * vertical);
    
    var result = document.getElementById('dist-result');
    if (result) {
        result.innerHTML = '<div class="result-box"><h3 style="color:#c41e3a;">Résultat :</h3>' +
            '<div class="info-card"><div class="label">Distance en ligne droite</div>' +
            '<div class="value" style="font-size:2.2em;color:#FF9800;">' + distance.toFixed(1) + ' m</div></div></div>';
    }
}

function calculatePerimetreCalc() {
    var rayon = parseFloat(document.getElementById('perim-rayon')?.value || 0);
    var perimetre = 2 * Math.PI * rayon;
    var surface = Math.PI * rayon * rayon;
    
    var result = document.getElementById('perim-result');
    if (result) {
        result.innerHTML = '<div class="result-box"><h3 style="color:#c41e3a;">Résultat :</h3>' +
            '<div class="info-card"><div class="label">Périmètre</div>' +
            '<div class="value" style="font-size:2.2em;color:#FF9800;">' + perimetre.toFixed(2) + ' m</div></div>' +
            '<div class="result-item"><span>Surface :</span><span class="result-value">' + surface.toFixed(2) + ' m²</span></div></div>';
    }
}

function calculateSurfaceCalc() {
    var longueur = parseFloat(document.getElementById('surf-longueur')?.value || 0);
    var largeur = parseFloat(document.getElementById('surf-largeur')?.value || 0);
    var surface = longueur * largeur;
    var diagonale = Math.sqrt(longueur * longueur + largeur * largeur);
    
    var result = document.getElementById('surf-result');
    if (result) {
        result.innerHTML = '<div class="result-box"><h3 style="color:#c41e3a;">Résultat :</h3>' +
            '<div class="info-card"><div class="label">Surface</div>' +
            '<div class="value" style="font-size:2.2em;color:#FF9800;">' + surface.toFixed(2) + ' m²</div></div>' +
            '<div class="result-item"><span>Diagonale :</span><span class="result-value">' + diagonale.toFixed(2) + ' m</span></div></div>';
    }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE LSPCC
// ═══════════════════════════════════════════════════════════════════════

function calculateFacteurChute() {
    var hauteurChute = parseFloat(document.getElementById('hauteurChute')?.value || 0);
    var longueurCorde = parseFloat(document.getElementById('longueurCorde')?.value || 1);
    if (longueurCorde <= 0) { alert('La longueur de corde doit être supérieure à 0'); return; }
    
    var facteur = hauteurChute / longueurCorde;
    var tirantAir = hauteurChute + (longueurCorde * 0.3);
    
    var niveau, couleur;
    if (facteur <= 0.3) { niveau = 'FAIBLE'; couleur = '#4CAF50'; }
    else if (facteur <= 1) { niveau = 'MODÉRÉ'; couleur = '#FF9800'; }
    else if (facteur <= 2) { niveau = 'ÉLEVÉ'; couleur = '#ff6600'; }
    else { niveau = 'CRITIQUE'; couleur = '#ff0000'; }
    
    var resultDiv = document.getElementById('facteurChuteResult');
    if (resultDiv) {
        resultDiv.innerHTML = '<div class="result-box"><div class="info-card" style="border-color:' + couleur + ';">' +
            '<div class="label">Facteur de chute</div><div class="value" style="color:' + couleur + ';font-size:3em;">' + facteur.toFixed(2) + '</div>' +
            '<div style="margin-top:10px;padding:8px;background:' + couleur + ';border-radius:8px;color:white;font-weight:bold;">Risque ' + niveau + '</div></div>' +
            '<div class="result-item" style="margin-top:15px;"><span>Tirant d\'air :</span><span class="result-value">' + tirantAir.toFixed(1) + ' m</span></div></div>';
    }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE SAL - PALIERS
// ═══════════════════════════════════════════════════════════════════════

function calculatePaliers() {
    var profondeur = parseInt(document.getElementById('salProfondeur')?.value || 20);
    var duree = parseInt(document.getElementById('salDuree')?.value || 20);
    
    var resultDiv = document.getElementById('palierResult');
    if (resultDiv) {
        if (profondeur <= 12 && duree <= 30) {
            resultDiv.innerHTML = '<div class="info-card" style="background:#4CAF50;"><div class="label">Résultat</div><div class="value">Pas de palier requis</div></div>' +
                '<div class="alert-box" style="margin-top:15px;">Remontée directe à 15m/min avec palier de sécurité (3 min à 3m)</div>';
        } else {
            var dtr = Math.ceil(profondeur / 15) + Math.max(0, (duree - 20) * 2);
            resultDiv.innerHTML = '<div class="info-card" style="background:#FF9800;"><div class="label">DTR estimée</div><div class="value">' + dtr + ' min</div></div>' +
                '<div class="alert-box" style="margin-top:15px;">⚠️ Consulter les tables MT2012 pour paliers exacts</div>';
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE PATRAC
// ═══════════════════════════════════════════════════════════════════════

var vehiculesEquipages = [
    { nom: "VSAV", personnels: ["1 conducteur", "1 chef d'agrès", "1 équipier"] },
    { nom: "FPT/FPTSR", personnels: ["1 conducteur", "1 chef d'agrès", "4 équipiers"] },
    { nom: "CCGC", personnels: ["1 conducteur", "1 chef d'agrès", "2 équipiers"] },
    { nom: "CCF", personnels: ["1 conducteur", "1 chef d'agrès", "2 équipiers"] }
];

var conseillersTechniques = [
    { sigle: "CA", titre: "Conseiller Animalier" },
    { sigle: "COB", titre: "Conseiller Opérationnel Bateau" },
    { sigle: "COSAL", titre: "Conseiller Opérationnel SAL" },
    { sigle: "CRNRBC", titre: "Conseiller Risques NRBC" }
];

function afficherVehiculesEquipages() {
    var container = document.getElementById('listeVehiculesEquipages');
    if (!container) return;
    container.innerHTML = vehiculesEquipages.map(function(v) {
        return '<div style="background:var(--bg-card);padding:15px;border-radius:12px;border-left:4px solid var(--primary-red);margin-bottom:10px;">' +
            '<div style="font-weight:bold;font-size:1.2em;color:var(--primary-red);margin-bottom:8px;">🚒 ' + v.nom + '</div>' +
            '<ul style="margin:0;padding-left:20px;">' + v.personnels.map(function(p) { return '<li style="margin:5px 0;">' + p + '</li>'; }).join('') + '</ul></div>';
    }).join('');
}

function afficherCA() {
    var container = document.getElementById('listeCA');
    if (!container) return;
    container.innerHTML = conseillersTechniques.map(function(ca) {
        return '<div style="background:var(--bg-card);padding:15px;border-radius:12px;border-left:4px solid #FF9800;margin-bottom:10px;">' +
            '<span style="font-weight:bold;font-size:1.3em;color:#FF9800;">' + ca.sigle + '</span>' +
            '<div style="font-weight:600;margin-top:5px;">' + ca.titre + '</div></div>';
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITAIRES & MODE SOMBRE
// ═══════════════════════════════════════════════════════════════════════

function toggleDarkMode() {
    var isDark = document.body.classList.toggle('dark-mode');
    try { localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled'); } catch(e) {}
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    var btn = document.getElementById('darkModeToggle');
    if (btn) btn.innerHTML = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

function toggleSection(sectionId) {
    var section = document.getElementById(sectionId);
    var header = section ? section.previousElementSibling : null;
    var arrow = header ? header.querySelector('.section-arrow') : null;
    
    if (section) {
        var isHidden = section.style.display === 'none';
        section.style.display = isHidden ? 'block' : 'none';
        if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        saveSectionsState();
    }
}

function saveSectionsState() {
    try {
        var sections = document.querySelectorAll('.collapsible-section');
        var states = {};
        sections.forEach(function(s) { states[s.id] = s.style.display !== 'none'; });
        localStorage.setItem('sectionsState', JSON.stringify(states));
    } catch(e) {}
}

function restoreSectionsState() {
    try {
        var savedStates = localStorage.getItem('sectionsState');
        if (savedStates) {
            var states = JSON.parse(savedStates);
            Object.keys(states).forEach(function(sectionId) {
                var section = document.getElementById(sectionId);
                var header = section ? section.previousElementSibling : null;
                var arrow = header ? header.querySelector('.section-arrow') : null;
                if (section) {
                    section.style.display = states[sectionId] ? 'block' : 'none';
                    if (arrow) arrow.style.transform = states[sectionId] ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            });
        }
    } catch(e) {}
}

function setTextContent(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
}

function highlightButton(allIds, activeId) {
    allIds.forEach(function(id) {
        var btn = document.getElementById(id);
        if (btn) {
            if (id === activeId) {
                btn.style.border = '5px solid #FFD700';
                btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.border = '2px solid';
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        }
    });
}

function showNotification(message, type) {
    type = type || 'success';
    var notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = 'position:fixed;bottom:20px;right:20px;background:' + (type === 'success' ? '#4CAF50' : '#F44336') + ';color:white;padding:15px 25px;border-radius:10px;z-index:10000;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
    document.body.appendChild(notification);
    setTimeout(function() { notification.remove(); }, 3000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() { showNotification('Copié !'); }).catch(function() {});
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE BOUTEILLES DE GAZ
// ═══════════════════════════════════════════════════════════════════════

function showBouteille(type) {
    document.querySelectorAll('.bouteille-content').forEach(function(el) { el.style.display = 'none'; });
    document.querySelectorAll('.bouteille-btn').forEach(function(btn) { btn.style.opacity = '0.7'; btn.style.transform = 'scale(1)'; });
    
    var content = document.getElementById('bouteille-' + type);
    if (content) content.style.display = 'block';
    var btn = document.getElementById('btn-bouteille-' + type);
    if (btn) { btn.style.opacity = '1'; btn.style.transform = 'scale(1.05)'; }
}

function calculateRefroidissement() {
    var nbBouteilles = parseInt(document.getElementById('nbBouteilles')?.value || 1);
    var typeBouteille = document.getElementById('typeBouteille')?.value || '13kg';
    
    var debitRecommande = 0, dureeMin = 0;
    if (typeBouteille === '6kg') { debitRecommande = 150 * nbBouteilles; dureeMin = 15; }
    else if (typeBouteille === '13kg') { debitRecommande = 250 * nbBouteilles; dureeMin = 20; }
    else if (typeBouteille === '35kg') { debitRecommande = 500 * nbBouteilles; dureeMin = 30; }
    else { debitRecommande = 250 * nbBouteilles; dureeMin = 20; }
    
    var volumeEau = debitRecommande * dureeMin;
    
    var resultDiv = document.getElementById('refroidissementResult');
    if (resultDiv) {
        resultDiv.innerHTML = '<div class="result-box"><h3>Besoins en refroidissement</h3>' +
            '<div class="result-item"><span>Nombre de bouteilles :</span><span class="result-value">' + nbBouteilles + '</span></div>' +
            '<div class="result-item"><span>Type :</span><span class="result-value">' + typeBouteille + '</span></div>' +
            '<div class="info-card" style="margin-top:15px;"><div class="label">Débit recommandé</div><div class="value">' + debitRecommande + ' L/min</div></div>' +
            '<div class="result-item" style="margin-top:10px;"><span>Durée minimale :</span><span class="result-value">' + dureeMin + ' min</span></div>' +
            '<div class="result-item"><span>Volume d\'eau nécessaire :</span><span class="result-value">' + volumeEau + ' L</span></div></div>';
    }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE EXTINCTEURS
// ═══════════════════════════════════════════════════════════════════════

function calculateExtincteurs() {
    var surface = parseFloat(document.getElementById('ext-surface')?.value || 0);
    var risque = document.getElementById('ext-risque')?.value || 'normal';
    
    var surfaceParExtincteur = 200, distanceMax = 25;
    if (risque === 'faible') { surfaceParExtincteur = 300; distanceMax = 30; }
    else if (risque === 'important') { surfaceParExtincteur = 150; distanceMax = 20; }
    
    var nbExtincteurs = Math.ceil(surface / surfaceParExtincteur);
    
    var resultDiv = document.getElementById('ext-result');
    if (resultDiv) {
        resultDiv.innerHTML = '<div class="result-box"><h3>Besoins en extincteurs</h3>' +
            '<div class="result-item"><span>Surface à protéger :</span><span class="result-value">' + surface + ' m²</span></div>' +
            '<div class="result-item"><span>Niveau de risque :</span><span class="result-value">' + risque + '</span></div>' +
            '<div class="info-card" style="margin-top:15px;"><div class="label">Nombre d\'extincteurs</div><div class="value">' + nbExtincteurs + '</div></div>' +
            '<div class="result-item" style="margin-top:10px;"><span>Distance max entre extincteurs :</span><span class="result-value">' + distanceMax + ' m</span></div></div>';
    }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE DISTANCES SIMPLES
// ═══════════════════════════════════════════════════════════════════════

function calculateDistances() {
    var type = document.getElementById('dist-type')?.value || 'gpl';
    var quantite = parseFloat(document.getElementById('dist-quantite')?.value || 0);
    
    var distance = 0, message = '';
    if (type === 'gpl') {
        if (quantite < 6) distance = 25;
        else if (quantite < 50) distance = 50;
        else distance = 100;
        message = 'Distance pour citerne GPL';
    } else if (type === 'hydrocarbure') {
        distance = Math.max(50, quantite * 0.5);
        message = 'Distance pour hydrocarbures';
    } else if (type === 'chlore') {
        distance = Math.max(100, quantite * 2);
        message = 'Distance pour chlore (gaz toxique)';
    } else if (type === 'ammoniac') {
        distance = Math.max(100, quantite * 1.5);
        message = 'Distance pour ammoniac';
    }
    
    var resultDiv = document.getElementById('dist-result');
    if (resultDiv) {
        resultDiv.innerHTML = '<div class="result-box"><h3>' + message + '</h3>' +
            '<div class="info-card"><div class="label">Périmètre de sécurité</div><div class="value">' + distance.toFixed(0) + ' m</div></div>' +
            '<div class="danger-box" style="margin-top:20px;"><strong>⚠️ Consignes :</strong>' +
            '<ul style="margin-left:20px;margin-top:10px;"><li>Établir le périmètre immédiatement</li>' +
            '<li>Évacuer la zone</li><li>ARI obligatoire pour approche</li></ul></div></div>';
    }
}

function calculateElectricLine() {
    var tension = document.getElementById('tensionLine')?.value || 'bt';
    var resultElement = document.getElementById('electricLineResult');
    
    var distance = 5, description = '';
    if (tension === 'bt') { distance = 5; description = 'Basse Tension'; }
    else if (tension === 'hta') { distance = 5; description = 'Haute Tension A'; }
    else if (tension === 'htb') { distance = 5; description = 'Haute Tension B'; }
    
    if (resultElement) {
        resultElement.innerHTML = '<div class="result-item"><span>' + description + '</span><span class="result-value">' + distance + ' m</span></div>';
    }
}

// ═══════════════════════════════════════════════════════════════════════
// MODULE PLEIN ÉCRAN
// ═══════════════════════════════════════════════════════════════════════

function toggleFullscreen(resultId) {
    var resultElement = document.getElementById(resultId);
    if (!resultElement) return;
    
    var modal = document.createElement('div');
    modal.id = 'fullscreenModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--bg-main);z-index:10000;display:flex;flex-direction:column;padding:20px;';
    
    modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
        '<h2 style="color:var(--primary-red);margin:0;">📺 Mode Plein Écran</h2>' +
        '<button onclick="closeFullscreen()" style="background:var(--primary-red);border:none;padding:15px 25px;border-radius:10px;color:white;font-size:1.1em;font-weight:bold;cursor:pointer;">✕ Fermer</button></div>' +
        '<div style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;">' +
        '<div style="transform:scale(1.5);transform-origin:center;width:66%;">' + resultElement.innerHTML + '</div></div>';
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeFullscreen() {
    var modal = document.getElementById('fullscreenModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function addFullscreenButton(resultId) {
    return '<button class="fullscreen-btn" onclick="toggleFullscreen(\'' + resultId + '\')" title="Plein écran">📺</button>';
}

// Fermer plein écran avec Échap
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeFullscreen();
});

// ═══════════════════════════════════════════════════════════════════════
// MODULE SECOURS ROUTIER
// ═══════════════════════════════════════════════════════════════════════

function showSecoursType(type) {
    document.querySelectorAll('.secours-content').forEach(function(el) { el.style.display = 'none'; });
    document.querySelectorAll('.secours-btn').forEach(function(btn) { btn.style.opacity = '0.7'; });
    
    var content = document.getElementById('secours-' + type);
    if (content) content.style.display = 'block';
    var btn = document.getElementById('btn-secours-' + type);
    if (btn) btn.style.opacity = '1';
}

// Fonctions RDMI
function showFamilleHab(famille) {
    document.querySelectorAll('.famille-content').forEach(function(el) { el.style.display = 'none'; });
    var familleMap = { 'f1': 'familleF1', 'f2': 'familleF2', 'f3': 'familleF3', 'f4': 'familleF4', 'igh': 'familleIGH' };
    var target = document.getElementById(familleMap[famille]);
    if (target) target.style.display = 'block';
}

// ═══════════════════════════════════════════════════════════════════════
// FIN DU FICHIER - DECIOPS v1.9.8 COMPLET
// ═══════════════════════════════════════════════════════════════════════
console.log('🚒 DECIOPS v1.9.8 - Tous les modules chargés avec succès');

// ═══════════════════════════════════════════════════════════════════════
// MODULE EXTINCTEURS - CLASSES DE FEU
// ═══════════════════════════════════════════════════════════════════════

function selectionnerClasseFeu(classe) {
    var infos = {
        'A': {
            titre: 'Classe A - Feux secs',
            emoji: '🪵',
            description: 'Feux de matériaux solides (bois, papier, tissu, carton, plastique)',
            extincteurs: ['Eau', 'Eau + additif', 'Mousse', 'Poudre ABC'],
            couleur: '#8B4513',
            conseils: [
                'Refroidir les braises',
                'Arroser abondamment',
                'Surveiller les reprises de feu'
            ]
        },
        'B': {
            titre: 'Classe B - Feux gras',
            emoji: '🛢️',
            description: 'Feux de liquides ou solides liquéfiables (essence, huile, alcool, solvants)',
            extincteurs: ['Mousse', 'Poudre ABC/BC', 'CO2'],
            couleur: '#FF4500',
            conseils: [
                'NE PAS utiliser d\'eau (risque de projection)',
                'Étouffer le feu',
                'Couper l\'alimentation si possible'
            ]
        },
        'C': {
            titre: 'Classe C - Feux de gaz',
            emoji: '💨',
            description: 'Feux de gaz (butane, propane, méthane, GPL)',
            extincteurs: ['Poudre BC/ABC', 'CO2'],
            couleur: '#1E90FF',
            conseils: [
                'Couper l\'arrivée de gaz EN PRIORITÉ',
                'Ne pas éteindre sans couper la source',
                'Risque d\'explosion si le gaz continue'
            ]
        },
        'D': {
            titre: 'Classe D - Feux de métaux',
            emoji: '⚙️',
            description: 'Feux de métaux (magnésium, sodium, aluminium en poudre, titane)',
            extincteurs: ['Poudre spéciale D', 'Sable sec', 'Ciment'],
            couleur: '#808080',
            conseils: [
                'NE JAMAIS utiliser d\'eau (réaction explosive)',
                'Étouffer avec sable ou poudre spéciale',
                'Intervention spécialisée requise'
            ]
        },
        'F': {
            titre: 'Classe F - Feux d\'huiles de cuisson',
            emoji: '🍳',
            description: 'Feux d\'auxiliaires de cuisson (huiles et graisses végétales ou animales)',
            extincteurs: ['Extincteur spécial F', 'Couverture anti-feu'],
            couleur: '#FF8C00',
            conseils: [
                'NE JAMAIS utiliser d\'eau (projection violente)',
                'Couvrir avec un couvercle ou couverture',
                'Couper la source de chaleur'
            ]
        },
        'elect': {
            titre: 'Feux d\'origine électrique',
            emoji: '⚡',
            description: 'Équipements électriques sous tension',
            extincteurs: ['CO2', 'Poudre ABC (distance min 1m)'],
            couleur: '#FFD700',
            conseils: [
                'COUPER LE COURANT en priorité',
                'NE PAS utiliser d\'eau sur équipement sous tension',
                'Distance de sécurité avec poudre',
                'CO2 = extincteur privilégié'
            ]
        }
    };
    
    var info = infos[classe];
    if (!info) {
        console.error('Classe de feu non trouvée:', classe);
        return;
    }
    
    // Créer ou trouver le conteneur de résultat
    var resultContainer = document.getElementById('extincteur-result');
    if (!resultContainer) {
        // Créer le conteneur s'il n'existe pas
        var module = document.getElementById('extincteurs');
        if (module) {
            resultContainer = document.createElement('div');
            resultContainer.id = 'extincteur-result';
            resultContainer.style.marginTop = '20px';
            module.appendChild(resultContainer);
        }
    }
    
    if (resultContainer) {
        resultContainer.innerHTML = 
            '<div class="result-box" style="border-left: 5px solid ' + info.couleur + '; animation: slideIn 0.3s ease;">' +
            '<h3 style="color: ' + info.couleur + '; margin-bottom: 15px;">' + info.emoji + ' ' + info.titre + '</h3>' +
            '<p style="margin-bottom: 20px; opacity: 0.9;">' + info.description + '</p>' +
            
            '<div class="info-card" style="margin-bottom: 15px; border-color: ' + info.couleur + ';">' +
            '<div class="label">✅ Extincteurs adaptés</div>' +
            '<div style="margin-top: 10px;">' + 
            info.extincteurs.map(function(e) { 
                return '<span style="display: inline-block; background: ' + info.couleur + '33; padding: 8px 15px; border-radius: 20px; margin: 5px; font-weight: 600;">' + e + '</span>'; 
            }).join('') +
            '</div></div>' +
            
            '<div class="alert-box" style="background: ' + info.couleur + '22; border-color: ' + info.couleur + ';">' +
            '<strong>📋 Conseils d\'intervention :</strong>' +
            '<ul style="margin: 10px 0 0 20px;">' +
            info.conseils.map(function(c) { return '<li style="margin: 8px 0;">' + c + '</li>'; }).join('') +
            '</ul></div>' +
            
            '</div>';
        
        // Scroll vers le résultat
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Mettre en surbrillance la carte sélectionnée
    document.querySelectorAll('.fire-class-card').forEach(function(card) {
        card.style.transform = 'scale(1)';
        card.style.boxShadow = '';
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.style.transform = 'scale(1.05)';
        event.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
    }
}

console.log('✅ Module Extincteurs (selectionnerClasseFeu) chargé');

// ═══════════════════════════════════════════════════════════════════════
// MODULE SECOURS ROUTIER - NAVIGATION SECTIONS
// ═══════════════════════════════════════════════════════════════════════

function showSRSection(section) {
    console.log('showSRSection appelé avec:', section);
    
    // Masquer toutes les sections
    document.querySelectorAll('.sr-section').forEach(function(el) {
        el.style.display = 'none';
    });
    
    // Réinitialiser tous les boutons
    var allBtns = ['btnMGO', 'btnAirbag', 'btnCharte'];
    allBtns.forEach(function(btnId) {
        var btn = document.getElementById(btnId);
        if (btn) {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '';
        }
    });
    
    // Mapping des sections (HTML IDs)
    var sectionMapping = {
        'mgo': 'sectionMGO',
        'airbag': 'sectionAirbag',
        'charte': 'sectionCharte'
    };
    
    var btnMapping = {
        'mgo': 'btnMGO',
        'airbag': 'btnAirbag',
        'charte': 'btnCharte'
    };
    
    var sectionId = sectionMapping[section];
    var sectionElement = document.getElementById(sectionId);
    
    if (sectionElement) {
        sectionElement.style.display = 'block';
        console.log('✅ Section affichée:', sectionId);
    } else {
        console.error('❌ Section non trouvée:', sectionId);
    }
    
    // Activer le bouton correspondant
    var btnId = btnMapping[section];
    var btn = document.getElementById(btnId);
    
    if (btn) {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    }
    
    // Scroll vers le haut de la section
    if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

console.log('✅ Module Secours Routier (showSRSection) chargé');
