/**
 * ═══════════════════════════════════════════════════════════════════════
 * DECIOPS v1.9.7 - Version avec donnees TMD enrichies
 * ═══════════════════════════════════════════════════════════════════════
 */

// ==================== VARIABLES GLOBALES ====================
window.fireSelection = {fenetre: 0, porte: 0, baie: 0, garage: 0, entrepot: 0};
window.firePowers = {fenetre: 2, porte: 4, baie: 8.4, garage: 11, entrepot: 36};
window.tronconsPerte = [];
window.tmdDatabase = [];
window.gazDatabase = {};
window.densityData = [];
window.appConfig = {};

// ==================== INITIALISATION ====================
async function initApp() {
    console.log('🚒 DECIOPS v1.9.7 - Initialisation...');
    try {
        const data = await DataLoader.loadAll();
        window.tmdDatabase = data.tmd || [];
        window.densityData = data.densites || [];
        window.gazDatabase = data.gaz || {};
        window.appConfig = data.config || {};
        
        console.log('✅ Donnees chargees:');
        console.log('   - TMD:', window.tmdDatabase.length, 'produits');
        
        if (window.appConfig.firePowers) window.firePowers = window.appConfig.firePowers;
        
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
    } catch (e) { console.warn("LocalStorage indisponible"); }
    
    setTimeout(updateDarkModeIcon, 100);
    setTimeout(function() { if (typeof restoreSectionsState === "function") restoreSectionsState(); }, 150);
    
    setupEventListeners();
    
    // Delegation d'evenement pour le bouton GMU
    var resultsContainer = document.getElementById('tmdResults');
    if (resultsContainer) {
        resultsContainer.addEventListener('click', function(e) {
            var btn = e.target.closest('.btn-gmu-action');
            if (btn) {
                var onu = btn.getAttribute('data-onu');
                preparerFicheGMU(onu);
            }
        });
    }

    showModule('home');
    console.log('🚒 DECIOPS v1.9.7 pret!');
}

function setupEventListeners() {
    // Recherche TMD
    var sOnu = document.getElementById('searchONU');
    var sName = document.getElementById('searchName');
    if (sOnu) sOnu.addEventListener('input', searchTMD);
    if (sName) sName.addEventListener('input', searchTMD);

    // Explosimetrie
    var gazEtalon = document.getElementById('gazEtalon');
    if (gazEtalon) {
        gazEtalon.addEventListener('change', function() {
            if (typeof updateTableauCorrections === "function") updateTableauCorrections();
            if (typeof calculerCorrectionGaz === "function") calculerCorrectionGaz();
        });
    }

    // Perte de charge
    if (document.getElementById('diametreTroncon')) setDiametreTroncon(70);
}

// ========== NAVIGATION ==========
function showModule(moduleName) {
    document.querySelectorAll('.module').forEach(function(m) { m.classList.remove('active'); });
    var target = document.getElementById(moduleName);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
        if (moduleName === 'ari') calculerAutonomieARI();
    }
    
    var homeBtn = document.getElementById('homeButton');
    var globalSearch = document.getElementById('globalSearch');
    if (moduleName === 'home') {
        if (homeBtn) homeBtn.style.display = 'none';
        if (globalSearch) globalSearch.style.display = 'block';
    } else {
        if (homeBtn) homeBtn.style.display = 'block';
        if (globalSearch) globalSearch.style.display = 'none';
    }
}

// ========== MODULE TMD & GMU ==========
function searchTMD() {
    var onuInput = document.getElementById('searchONU').value.trim();
    var nameInput = document.getElementById('searchName').value.trim().toLowerCase();
    
    var results = window.tmdDatabase.filter(function(item) {
        var matchONU = !onuInput || item.onu.toString().includes(onuInput);
        var matchName = !nameInput || item.nom.toLowerCase().includes(nameInput);
        return matchONU && matchName;
    });

    var resultsContainer = document.getElementById('tmdResults');
    if (!resultsContainer) return;

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="alert-box">Aucun resultat trouve</div>';
        return;
    }

    resultsContainer.innerHTML = results.slice(0, 20).map(function(item) {
        var borderColor = (item.classe == 3) ? '#ff0000' : '#FF9800';
        
        // Construction de la section caracteristiques techniques
        var caracteristiquesHTML = buildCaracteristiquesHTML(item);
        
        return '<div class="result-box" style="border-left: 10px solid ' + borderColor + ' !important; margin-bottom: 20px; padding: 20px; background: white; color: black; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">' +
            '<div style="display: flex; gap: 20px; align-items: flex-start;">' +
                '<div style="text-align: center; min-width: 90px;">' +
                    '<div style="font-size: 3em; margin-bottom: 5px;">' + (item.picto || '⚠️') + '</div>' +
                    '<div style="background: #FF9800; color: black; padding: 10px; border-radius: 5px; font-weight: 900; border: 2px solid black;">' +
                        '<div style="font-size: 1.1em; border-bottom: 2px solid black; margin-bottom: 5px;">' + (item.danger || '--') + '</div>' +
                        '<div style="font-size: 2em;">' + item.onu + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="flex: 1;">' +
                    '<h3 style="color: #FF9800; margin: 0 0 10px 0; font-size: 1.6em;">' + item.nom + '</h3>' +
                    '<div style="margin-bottom: 5px;"><strong>Classe :</strong> ' + item.classe + '</div>' +
                    '<div style="margin-bottom: 10px;"><strong>⚠️ Risques :</strong> ' + (item.risques || 'Non renseignes') + '</div>' +
                    caracteristiquesHTML +
                    '<button type="button" class="btn-gmu-action" data-onu="' + item.onu + '" style="width: 100%; background: #FF6B00; color: white; border: none; padding: 15px; border-radius: 10px; font-weight: bold; font-size: 1.1em; cursor: pointer; display: block; margin-top: 15px;">' +
                        '📖 Voir la Fiche GMU' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

/**
 * Construit le HTML des caracteristiques techniques d'un produit TMD
 */
function buildCaracteristiquesHTML(item) {
    // Verifier s'il y a des donnees enrichies a afficher
    var hasData = item.pointEclair || item.tempAutoInflammation || item.lii || item.lsi || 
                  item.densiteVapeur || item.vle || item.idlh || item.tempEbullition || item.solubiliteEau;
    
    if (!hasData) return '';
    
    var rows = [];
    
    // Point d'eclair (le plus important pour classe 3)
    if (item.pointEclair) {
        var peColor = getPointEclairColor(item.pointEclair);
        rows.push(
            '<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: ' + peColor.bg + '; border-radius: 6px; margin-bottom: 4px;">' +
                '<span style="font-weight: 600;">🌡️ Point eclair</span>' +
                '<span style="font-weight: bold; color: ' + peColor.text + ';">' + item.pointEclair + '</span>' +
            '</div>'
        );
    }
    
    // Temperature d'auto-inflammation
    if (item.tempAutoInflammation) {
        rows.push(
            '<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fff3e0; border-radius: 6px; margin-bottom: 4px;">' +
                '<span style="font-weight: 600;">🔥 Auto-inflammation</span>' +
                '<span style="font-weight: bold; color: #e65100;">' + item.tempAutoInflammation + '</span>' +
            '</div>'
        );
    }
    
    // LII / LSI (Limites d'inflammabilite)
    if (item.lii || item.lsi) {
        var lii = item.lii || '?';
        var lsi = item.lsi || '?';
        rows.push(
            '<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #ffebee; border-radius: 6px; margin-bottom: 4px;">' +
                '<span style="font-weight: 600;">💨 LII / LSI</span>' +
                '<span style="font-weight: bold; color: #c62828;">' + lii + ' - ' + lsi + '</span>' +
            '</div>'
        );
    }
    
    // Densite vapeur
    if (item.densiteVapeur) {
        var densiteVal = parseFloat(item.densiteVapeur);
        var densiteInfo = densiteVal > 1 ? '(+ lourd que air ⬇️)' : '(+ leger que air ⬆️)';
        rows.push(
            '<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; margin-bottom: 4px;">' +
                '<span style="font-weight: 600;">⚖️ Densite vapeur</span>' +
                '<span style="font-weight: bold; color: #1565c0;">' + item.densiteVapeur + ' ' + densiteInfo + '</span>' +
            '</div>'
        );
    }
    
    // Point d'ebullition (pour gaz liquefies)
    if (item.tempEbullition) {
        rows.push(
            '<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #e8f5e9; border-radius: 6px; margin-bottom: 4px;">' +
                '<span style="font-weight: 600;">🧊 Ebullition</span>' +
                '<span style="font-weight: bold; color: #2e7d32;">' + item.tempEbullition + '</span>' +
            '</div>'
        );
    }
    
    // VLE (Valeur Limite d'Exposition)
    if (item.vle) {
        rows.push(
            '<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f3e5f5; border-radius: 6px; margin-bottom: 4px;">' +
                '<span style="font-weight: 600;">🛡️ VLE</span>' +
                '<span style="font-weight: bold; color: #7b1fa2;">' + item.vle + '</span>' +
            '</div>'
        );
    }
    
    // IDLH (Danger immediat)
    if (item.idlh) {
        rows.push(
            '<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #ffcdd2; border-radius: 6px; margin-bottom: 4px;">' +
                '<span style="font-weight: 600;">☠️ IDLH</span>' +
                '<span style="font-weight: bold; color: #b71c1c;">' + item.idlh + '</span>' +
            '</div>'
        );
    }
    
    // Solubilite dans l'eau
    if (item.solubiliteEau) {
        rows.push(
            '<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #e0f7fa; border-radius: 6px; margin-bottom: 4px;">' +
                '<span style="font-weight: 600;">💧 Solubilite eau</span>' +
                '<span style="font-weight: bold; color: #00838f;">' + item.solubiliteEau + '</span>' +
            '</div>'
        );
    }
    
    // Seuil olfactif
    if (item.seuilOlfactif) {
        rows.push(
            '<div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fff8e1; border-radius: 6px; margin-bottom: 4px;">' +
                '<span style="font-weight: 600;">👃 Seuil olfactif</span>' +
                '<span style="font-weight: bold; color: #ff8f00;">' + item.seuilOlfactif + '</span>' +
            '</div>'
        );
    }
    
    if (rows.length === 0) return '';
    
    return '<div style="background: #f5f5f5; border-radius: 10px; padding: 12px; margin: 15px 0; border: 1px solid #ddd;">' +
        '<div style="font-weight: bold; color: #333; margin-bottom: 10px; font-size: 1.1em; border-bottom: 2px solid #FF9800; padding-bottom: 5px;">' +
            '📊 CARACTERISTIQUES TECHNIQUES' +
        '</div>' +
        rows.join('') +
    '</div>';
}

/**
 * Retourne les couleurs selon le point d'eclair
 */
function getPointEclairColor(pointEclair) {
    // Extraire la valeur numerique
    var match = pointEclair.match(/-?\d+/);
    if (!match) return { bg: '#fff3e0', text: '#e65100' };
    
    var temp = parseInt(match[0]);
    
    if (temp < 0) {
        // Tres inflammable (point eclair negatif)
        return { bg: '#ffcdd2', text: '#b71c1c' };
    } else if (temp < 23) {
        // Inflammable (point eclair < 23C)
        return { bg: '#ffe0b2', text: '#e65100' };
    } else if (temp < 60) {
        // Combustible (point eclair 23-60C)
        return { bg: '#fff9c4', text: '#f57f17' };
    } else {
        // Peu inflammable (point eclair > 60C)
        return { bg: '#e8f5e9', text: '#2e7d32' };
    }
}

function preparerFicheGMU(onu) {
    var matiere = window.tmdDatabase.find(function(p) { return p.onu.toString() === onu.toString(); });
    if (matiere && typeof afficherFicheGMU === 'function') {
        var ficheHTML = afficherFicheGMU(matiere.onu, matiere.nom, matiere.classe);
        var container = document.getElementById('tmdResults');
        container.innerHTML = '<button onclick="searchTMD()" style="margin-bottom:20px; padding:12px; background:#444; color:white; border:none; border-radius:8px; cursor:pointer;">← Retour</button>' + ficheHTML;
        window.scrollTo(0, 0);
    }
}

// ========== MODULES DE CALCULS ==========
function calculateFirePower() {
    var totalPower = 0;
    for (var type in window.fireSelection) {
        totalPower += window.fireSelection[type] * window.firePowers[type];
    }
    var debit = (totalPower / 1.4) * 100;
    var elPower = document.getElementById('totalPower');
    var elFlow = document.getElementById('flowRate');
    if (elPower) elPower.textContent = totalPower.toFixed(1) + ' MW';
    if (elFlow) elFlow.textContent = debit.toFixed(0) + ' L/min';
}

function calculerAutonomieARI() {
    var elP = document.getElementById('pressionARI');
    var elV = document.getElementById('volumeARI');
    var elC = document.getElementById('consoARI');
    var p = parseFloat(elP ? elP.value : 300);
    var v = parseFloat(elV ? elV.value : 9);
    var c = parseFloat(elC ? elC.value : 100);
    var sifflet = ((p - 55) * v) / c;
    var elTot = document.getElementById('autonomieTotale');
    var elSif = document.getElementById('tempsSifflet');
    if (elTot) elTot.textContent = Math.floor((p * v) / c) + ' min';
    if (elSif) elSif.textContent = Math.floor(sifflet) + ' min';
}

function setDiametreTroncon(value) {
    var input = document.getElementById('diametreTroncon');
    if (input) input.value = value;
    document.querySelectorAll('[id^="btnDiam"]').forEach(function(btn) {
        var btnVal = parseInt(btn.id.replace('btnDiam', ''));
        btn.style.border = (btnVal === value) ? '5px solid #FFD700' : '2px solid transparent';
    });
}

// ========== UTILS UI ==========
function updateDarkModeIcon() {
    var icon = document.getElementById('dark-mode-icon');
    if (icon) icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', initApp);
