/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS v1.9 - Outil d'aide à la décision opérationnelle
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Copyright (c) 2025 - RESCUEAPP
 * Solution professionnelle pour services d'incendie et de secours
 * 
 * ARCHITECTURE MODULAIRE - Données JSON externes
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
        // Charger toutes les données
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
        console.log(`   - Densités: ${densityData.length} matériaux`);
        console.log(`   - Modules: ${modulesData.length} modules`);
        
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
    if (document.getElementById('listeCA')) {
        afficherCA();
    }
    
    // Initialiser les boutons de pertes de charge
    if (document.getElementById('diametreTroncon')) {
        const diamValue = parseInt(document.getElementById('diametreTroncon')?.value || 70);
        setDiametreTroncon(diamValue);
    }
    if (document.getElementById('pressionLanceTroncon')) {
        const pressValue = parseFloat(document.getElementById('pressionLanceTroncon')?.value || 6);
        setPressionLance(pressValue);
    }
    if (document.getElementById('debitTroncon')) {
        const debitValue = parseInt(document.getElementById('debitTroncon')?.value || 500);
        setDebitLance(debitValue);
    }
    
    // Initialiser les sections GAZ et ELEC
    if (document.getElementById('btnGazTransport')) {
        showGazType('transport');
    }
    if (document.getElementById('btnElecGeneralites')) {
        showElecType('generalites');
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
        
        // Initialiser les calculs de distance si nécessaire
        if (moduleName === 'distance-calc') {
            calculateDistanceCalc();
        }
        
        // Initialiser l'abaque si nécessaire
        if (moduleName === 'abaque') {
            calculateAbaqueAll();
        }
        
        // Initialiser le calcul ARI si nécessaire
        if (moduleName === 'ari') {
            calculerAutonomieARI();
        }
    }
    
    // Gérer l'affichage du bouton Accueil et de la barre de recherche
    const homeButton = document.getElementById('homeButton');
    const globalSearch = document.getElementById('globalSearch');
    
    if (moduleName === 'home') {
        // Sur l'accueil : masquer le bouton, afficher la recherche
        if (homeButton) homeButton.style.display = 'none';
        if (globalSearch) globalSearch.style.display = 'block';
    } else {
        // Sur un module : afficher le bouton, masquer la recherche
        if (homeButton) homeButton.style.display = 'block';
        if (globalSearch) globalSearch.style.display = 'none';
    }
}

// ========== FONCTIONS RDMI ==========
function showFamilleHab(famille) {
    // Masquer tous les contenus de famille
    document.querySelectorAll('.famille-content').forEach(el => el.style.display = 'none');
    
    // Réinitialiser les styles des boutons
    document.querySelectorAll('.famille-btn, [id^="btnFam"]').forEach(btn => {
        btn.style.opacity = '0.7';
        btn.style.transform = 'scale(1)';
    });
    
    // Afficher la famille sélectionnée
    const familleMap = {
        'f1': 'familleF1',
        'f2': 'familleF2',
        'f3': 'familleF3',
        'f4': 'familleF4',
        'igh': 'familleIGH'
    };
    
    const targetId = familleMap[famille];
    if (targetId) {
        const target = document.getElementById(targetId);
        if (target) target.style.display = 'block';
    }
    
    // Activer le bouton sélectionné
    const btnMap = {
        'f1': 'btnFamF1',
        'f2': 'btnFamF2',
        'f3': 'btnFamF3',
        'f4': 'btnFamF4',
        'igh': 'btnFamIGH'
    };
    
    const activeBtn = document.getElementById(btnMap[famille]);
    if (activeBtn) {
        activeBtn.style.opacity = '1';
        activeBtn.style.transform = 'scale(1.05)';
    }
}

// ========== RECHERCHE GLOBALE ==========
const searchIndex = [
    {id: 'fire', name: 'Puissance Feu/Extinction', keywords: ['feu', 'puissance', 'fenêtre', 'porte', 'incendie', 'débit', 'extinction']},
    {id: 'emulseur', name: 'Taux d\'application additif', keywords: ['émulseur', 'mousse', 'LAS', 'feu', 'liquide', 'additif', 'taux', 'application']},
    {id: 'pertes', name: 'Pertes de Charge', keywords: ['pertes', 'charge', 'pression', 'tuyau', 'débit']},
    {id: 'tmd', name: 'TMD', keywords: ['tmd', 'matières dangereuses', 'onu', 'transport', 'chimique']},
    {id: 'ari', name: 'Calcul ARI', keywords: ['ari', 'appareil respiratoire', 'autonomie', 'calcul', 'temps', 'bouteille', 'pression', 'consommation']},
    {id: 'distances', name: 'Distances Sécurité', keywords: ['distance', 'sécurité', 'gaz', 'électrique', 'bleve', 'périmètre']},
    {id: 'rdmi-menu', name: 'RDMI - Référentiel Manœuvres', keywords: ['rdmi', 'référentiel', 'manœuvres', 'incendie', 'habitation', 'famille', 'pei', 'binôme', 'smes', 'établissement', 'mgo', 'hydraulique', 'colonne', 'sèche']},
    {id: 'rdmi-habitations', name: 'RDMI - Familles Habitation', keywords: ['famille', 'habitation', 'igh', 'immeuble', 'colonne', 'sèche', '1ère', '2ème', '3ème', '4ème']},
    {id: 'rdmi-pei', name: 'RDMI - Points d\'Eau Incendie', keywords: ['pei', 'poteau', 'bouche', 'incendie', 'rouge', 'bleu', 'jaune', 'débit', 'deci']},
    {id: 'rdmi-hydraulique', name: 'RDMI - Hydraulique', keywords: ['hydraulique', 'pertes', 'charge', 'pression', 'dénivelé', 'tuyau']},
    {id: 'rdmi-binomes', name: 'RDMI - Binômes & Armement', keywords: ['binôme', 'armement', 'epi', 'conducteur', 'chef', 'équipe', 'protection']},
    {id: 'rdmi-smes', name: 'RDMI - SMES', keywords: ['smes', 'situation', 'mission', 'exécution', 'sécurité', 'tactique', 'raisonnement']},
    {id: 'rdmi-etablissements', name: 'RDMI - Établissements', keywords: ['établissement', 'etb', 'ldv', 'ldt', 'lance', 'tuyau', 'alimentation']},
    {id: 'rdmi-mgo', name: 'RDMI - MGO', keywords: ['mgo', 'marche', 'générale', 'opérations', 'sauvetage', 'reconnaissance', 'attaque']},
    {id: 'rdmi-zones', name: 'RDMI - Zones', keywords: ['zone', 'exclusion', 'contrôlée', 'soutien', 'façade', 'pca']},
    {id: 'suap-menu', name: 'RT SUAP - Référentiel Secours', keywords: ['suap', 'secours', 'personne', 'victime', 'bilan', 'rcp', 'brûlure', 'hémorragie', 'trauma']},
    {id: 'suap-ages', name: 'SUAP - Âges & Définitions', keywords: ['age', 'juste-né', 'nouveau-né', 'nourrisson', 'enfant', 'adulte', 'définition']},
    {id: 'suap-rcp', name: 'SUAP - RCP', keywords: ['rcp', 'réanimation', 'massage', 'cardiaque', 'insufflation', 'dsa', 'acr', 'pouls']},
    {id: 'suap-hemorragies', name: 'SUAP - Hémorragies', keywords: ['hémorragie', 'garrot', 'pcu', 'pansement', 'compression', 'saignement']},
    {id: 'suap-brulures', name: 'SUAP - Brûlures', keywords: ['brûlure', 'wallace', 'refroidissement', 'thermique', 'chimique', 'grave']},
    {id: 'suap-bilan', name: 'SUAP - Bilan', keywords: ['bilan', 'evda', 'douleur', 'evs', 'vigilance', 'surveillance']},
    {id: 'suap-oxygene', name: 'SUAP - Oxygène', keywords: ['oxygène', 'o2', 'débit', 'mhc', 'lunettes', 'inhalation', 'bavu']},
    {id: 'suap-trauma', name: 'SUAP - Traumatismes', keywords: ['trauma', 'bassin', 'pelvienne', 'contention', 'pouls', 'pédieux', 'membre']},
    {id: 'suap-accouchement', name: 'SUAP - Accouchement', keywords: ['accouchement', 'juste-né', 'transport', 'enceinte', 'naissance']},
    {id: 'sal-menu', name: 'SAL/SAV - Milieu Aquatique', keywords: ['sal', 'sav', 'plongée', 'aquatique', 'hyperbare', 'scaphandrier', 'nautique']},
    {id: 'sal-niveaux', name: 'SAL - Niveaux & Emplois', keywords: ['sal1', 'sal2', 'sal3', 'niveau', 'emploi', 'chef unité', 'conseiller technique']},
    {id: 'sal-profondeurs', name: 'SAL - Profondeurs', keywords: ['profondeur', 'habilitation', 'qualification', 'classe', '30m', '50m', '60m']},
    {id: 'sal-missions', name: 'SAL - Missions', keywords: ['mission', 'sauvetage', 'prompt secours', 'recherche', 'noyade', 'travaux']},
    {id: 'sal-organisation', name: 'SAL - Organisation', keywords: ['organisation', 'binôme', 'équipe', 'directeur plongée', 'unité']},
    {id: 'sal-methodes', name: 'SAL - Méthodes', keywords: ['méthode', 'air', 'nitrox', 'trimix', 'narguilé', 'surface non libre']},
    {id: 'sal-tables', name: 'SAL - Tables MT2012', keywords: ['table', 'mt2012', 'palier', 'décompression', 'vitesse', 'remontée']},
    {id: 'sal-securite', name: 'SAL - Sécurité', keywords: ['sécurité', 'durée', 'température', 'refus', 'nuisance']},
    {id: 'sal-accidents', name: 'SAL - Accidents', keywords: ['accident', 'add', 'barotraumatisme', 'narcose', 'décompression', 'hyperoxie']},
    {id: 'sal-calculateur', name: 'SAL - Calculateur Paliers', keywords: ['calculateur', 'palier', 'table', 'mt2012', 'décompression', 'dtr', 'gps']},
    {id: 'ia-manoeuvre', name: 'Générateur IA Manœuvre', keywords: ['ia', 'intelligence', 'artificielle', 'manoeuvre', 'scenario', 'entrainement', 'générateur']},
    {id: 'secours', name: 'Secours Routier', keywords: ['secours', 'routier', 'désincarcération', 'accident', 'véhicule']},
    {id: 'epuisement', name: 'Épuisement', keywords: ['épuisement', 'pompage', 'eau', 'débit', 'volume', 'temps']},
    {id: 'electrique', name: 'Lignes Électriques', keywords: ['électrique', 'ligne', 'haute tension', 'BT', 'HTA']},
    {id: 'risques-gaz-menu', name: 'Risques GAZ', keywords: ['gaz', 'explosimètre', 'bouteille', 'explosif', 'atmosphère', 'ogive', 'risque']},
    {id: 'explosimetrie', name: 'Explosimétrie', keywords: ['explosimètre', 'LII', 'gaz', 'explosif', 'atmosphère']},
    {id: 'bouteilles', name: 'Bouteilles de Gaz', keywords: ['bouteille', 'gaz', 'ogive', 'couleur', 'refroidissement']},
    {id: 'extincteurs', name: 'Extincteurs', keywords: ['extincteur', 'surface', 'protection']},
    {id: 'distance-calc', name: 'Calcul Distances', keywords: ['distance', 'calcul', 'périmètre', 'surface', 'pythagore']},
    {id: 'lspcc-menu', name: 'LSPCC - Sauvetage & Protection Chutes', keywords: ['lspcc', 'sauvetage', 'chute', 'corde', 'harnais', 'triangle', 'descendeur', 'ancrage', 'amarrage', 'évacuation', 'rappel']},
    {id: 'lspcc-materiels', name: 'LSPCC - Matériels & Équipements', keywords: ['matériel', 'équipement', 'lot engin', 'lot échelle', 'corde', 'harnais', 'triangle', 'sangle', 'connecteur', 'descendeur', 'poulie', 'antichute']},
    {id: 'lspcc-emploi', name: 'LSPCC - Emploi & Principes', keywords: ['emploi', 'principe', 'ancrage', 'amarrage', 'facteur chute', 'tirant air', 'point fixe', 'ordres', 'commandes']},
    {id: 'lspcc-techniques', name: 'LSPCC - Techniques Générales', keywords: ['technique', 'abordage', 'sauvetage', 'extérieur', 'excavation', 'reconnaissance', 'appartement', 'évolution', 'victime']},
    {id: 'lspcc-securisation', name: 'LSPCC - Sécurisation Échelles & MEA', keywords: ['sécurisation', 'échelle', 'crochets', 'coulisse', 'mea', 'formation', 'opération']},
    {id: 'lspcc-noeuds', name: 'LSPCC - Nœuds & Annexes', keywords: ['noeud', 'huit', 'français', 'clé arrêt', 'répartition', 'entretien', 'réforme']},
    {id: 'lspcc-calculateur', name: 'LSPCC - Calculateur Facteur Chute', keywords: ['calculateur', 'facteur', 'chute', 'tirant', 'air', 'hauteur', 'longueur']},
    {id: 'lspcc-fmo', name: 'LSPCC - Fiches Matériel Opérationnel', keywords: ['fmo', 'fiche', 'matériel', 'opérationnel', 'antichute', 'longe', 'porte-outils', 'epi', 'mea', 'panier secours']}
];

function searchModules(query) {
    const searchResults = document.getElementById('searchResults');
    
    if (!query || query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    
    query = query.toLowerCase();
    const results = searchIndex.filter(module => 
        module.name.toLowerCase().includes(query) || 
        module.keywords.some(keyword => keyword.includes(query))
    );
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="alert-box">Aucun outil trouvé</div>';
        searchResults.style.display = 'block';
        return;
    }
    
    searchResults.innerHTML = results.map(module => `
        <div onclick="showModule('${module.id}')" style="
            background: var(--bg-card);
            padding: 15px;
            margin: 5px 0;
            border-radius: 10px;
            border-left: 4px solid var(--primary-red);
            cursor: pointer;
            transition: all 0.3s ease;
        " onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='var(--bg-card)'">
            <strong style="color: var(--primary-red);">${module.name}</strong>
            <div style="font-size: 0.9em; opacity: 0.7; margin-top: 5px;">
                ${module.keywords.slice(0, 3).join(' • ')}
            </div>
        </div>
    `).join('');
    
    searchResults.style.display = 'block';
}

// ========== MODE PLEIN ÉCRAN POUR RÉSULTATS ==========
function toggleFullscreen(resultId) {
    const resultElement = document.getElementById(resultId);
    if (!resultElement) return;
    
    // Créer la modal plein écran
    const modal = document.createElement('div');
    modal.id = 'fullscreenModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--bg-main);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: var(--primary-red); margin: 0;">📺 Mode Plein Écran</h2>
            <button onclick="closeFullscreen()" style="
                background: var(--primary-red);
                border: none;
                padding: 15px 25px;
                border-radius: 10px;
                color: white;
                font-size: 1.1em;
                font-weight: bold;
                cursor: pointer;
            ">✕ Fermer</button>
        </div>
        <div style="
            flex: 1;
            overflow: auto;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                transform: scale(1.5);
                transform-origin: center;
                width: 66%;
            ">
                ${resultElement.innerHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeFullscreen() {
    const modal = document.getElementById('fullscreenModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Fermer avec la touche Échap
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeFullscreen();
    }
});

// ========== HELPER POUR BOUTON PLEIN ÉCRAN ==========
function addFullscreenButton(resultId) {
    return `<button class="fullscreen-btn" onclick="toggleFullscreen('${resultId}')" title="Afficher en plein écran">📺</button>`;
}

// ========== MODULE PUISSANCE FEU ==========
function selectFireSource(type) {
    const maxSelections = {fenetre: 10, porte: 5, baie: 3, garage: 2, entrepot: 1};
    
    if (fireSelection[type] < maxSelections[type]) {
        fireSelection[type]++;
    } else {
        fireSelection[type] = 0;
    }
    
    document.getElementById(type + '-count').textContent = fireSelection[type];
    calculateFirePower();
}

function calculateFirePower() {
    let totalPower = 0;
    for (let type in fireSelection) {
        totalPower += fireSelection[type] * firePowers[type];
    }
    
    // Calcul correct : 1.4 MW = 100 L/min
    // Donc : débit = (puissance / 1.4) × 100
    const debitNecessaire = (totalPower / 1.4) * 100;
    
    // Colorisation en fonction du débit - COULEURS TRÈS VISIBLES
    let debitColor = '';
    let debitBgColor = '';
    let borderColor = '';
    if (debitNecessaire <= 500) {
        debitColor = '#4CAF50'; // Vert foncé
        debitBgColor = 'rgba(76, 175, 80, 0.25)'; // Fond vert plus visible
        borderColor = '#4CAF50';
    } else if (debitNecessaire <= 1000) {
        debitColor = '#FF9800'; // Orange vif
        debitBgColor = 'rgba(255, 152, 0, 0.25)'; // Fond orange plus visible
        borderColor = '#FF9800';
    } else {
        debitColor = '#F44336'; // Rouge vif
        debitBgColor = 'rgba(244, 67, 54, 0.25)'; // Fond rouge plus visible
        borderColor = '#F44336';
    }
    
    // Mise à jour des éléments HTML avec colorisation
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
    
    // Coloriser le GRAND bouton "Débit conseillé" - TRÈS VISIBLE
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
    
    // Réinitialiser les compteurs
    for (let type in fireSelection) {
        const counter = document.getElementById(`count-${type}`);
        if (counter) {
            counter.textContent = '0';
            counter.style.display = 'none';
        }
    }
    
    // Réinitialiser les résultats
    const totalPowerElement = document.getElementById('totalPower');
    const flowRateElement = document.getElementById('flowRate');
    const flowRateItemElement = document.getElementById('flowRateItem');
    
    if (totalPowerElement) totalPowerElement.textContent = '0 MW';
    
    if (flowRateElement) {
        flowRateElement.textContent = '0 L/min';
        flowRateElement.style.color = 'var(--text-primary)';
    }
    
    // Réinitialiser le style du grand bouton débit
    if (flowRateItemElement) {
        flowRateItemElement.style.background = 'var(--bg-elevated)';
        flowRateItemElement.style.borderColor = 'var(--border-medium)';
        flowRateItemElement.style.borderWidth = '4px';
        flowRateItemElement.style.boxShadow = 'var(--shadow-lg)';
    }
}

// ========== MODULE ÉMULSEUR ==========
function calculateEmulseur() {
    const surface = parseFloat(document.getElementById('emul-surface').value);
    const type = document.getElementById('emul-type').value;
    const concentration = parseFloat(document.getElementById('emul-concentration').value);
    
    let debitEau = 0;
    if (type === 'hydrocarbure') {
        debitEau = surface * 6;
    } else if (type === 'polaire') {
        debitEau = surface * 8;
    } else {
        debitEau = surface * 10;
    }
    
    const debitEmulseur = (debitEau * concentration) / (100 - concentration);
    const volumeEmulseur10min = debitEmulseur * 10;
    const bidons20L = Math.ceil(volumeEmulseur10min / 20);
    
    document.getElementById('emul-result').innerHTML = `
        <div class="result-box" id="emul-result-box">
            ${addFullscreenButton('emul-result-box')}
            <h3>Besoins en émulseur :</h3>
            <div class="result-item">
                <span>Débit eau :</span>
                <span class="result-value">${debitEau.toFixed(0)} L/min</span>
            </div>
            <div class="result-item">
                <span>Débit émulseur :</span>
                <span class="result-value">${debitEmulseur.toFixed(1)} L/min</span>
            </div>
            <div class="result-item">
                <span>Volume pour 10 min :</span>
                <span class="result-value">${volumeEmulseur10min.toFixed(0)} L</span>
            </div>
            <div class="result-item">
                <span>Bidons 20L nécessaires :</span>
                <span class="result-value">${bidons20L}</span>
            </div>
        </div>
    `;
}

// ========== MODULE PERTES DE CHARGE ==========
// ========== MODULE PERTES DE CHARGE ==========
function adjustJonctions(delta) {
    const input = document.getElementById('jonctionsPerte');
    if (!input) return;
    let newValue = parseInt(input.value) + delta;
    newValue = Math.max(0, newValue);
    input.value = newValue;
}

function adjustNbTuyaux(delta) {
    const input = document.getElementById('nbTuyaux20');
    if (!input) return;
    let newValue = parseInt(input.value) + delta;
    newValue = Math.max(0, newValue);
    input.value = newValue;
}

function adjustDeniveleTroncon(delta) {
    const input = document.getElementById('deniveleTroncon');
    if (!input) return;
    let newValue = parseInt(input.value) + delta;
    input.value = newValue;
}

function adjustDebit(delta) {
    const input = document.getElementById('debitTroncon');
    if (!input) return;
    let newValue = parseInt(input.value) + delta;
    newValue = Math.max(0, newValue);
    input.value = newValue;
}

// ========== FONCTIONS DIAMÈTRE TRONÇON ==========
function setDiametreTroncon(value) {
    const diamInput = document.getElementById('diametreTroncon');
    if (diamInput) {
        diamInput.value = value;
    }
    
    // Définir les couleurs originales de chaque bouton
    const btnColors = {
        'btnDiam45': { bg: '#4CAF50', border: '#4CAF50' },
        'btnDiam70': { bg: '#FF9800', border: '#FF9800' },
        'btnDiam110': { bg: '#F44336', border: '#F44336' }
    };
    
    // Mettre à jour l'apparence des boutons
    ['btnDiam45', 'btnDiam70', 'btnDiam110'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const btnValue = parseInt(btnId.replace('btnDiam', ''));
            const colors = btnColors[btnId];
            if (btnValue === value) {
                btn.style.background = colors.bg;
                btn.style.border = '5px solid #FFD700';
                btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.background = colors.bg;
                btn.style.border = '2px solid ' + colors.border;
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        }
    });
}

// ========== FONCTIONS PRESSION LANCE ==========
function setPressionLance(value) {
    const pressInput = document.getElementById('pressionLanceTroncon');
    if (pressInput) {
        pressInput.value = value;
    }
    
    // Mettre à jour le champ personnalisé si visible
    const customInput = document.getElementById('customPressionValue');
    if (customInput) {
        customInput.value = value;
    }
    
    // Définir les couleurs originales de chaque bouton
    const btnColors = {
        'btnPress6': { bg: '#4CAF50', border: '#4CAF50' },
        'btnPress8': { bg: '#8BC34A', border: '#8BC34A' },
        'btnPress12': { bg: '#FF9800', border: '#FF9800' },
        'btnPress16': { bg: '#F44336', border: '#F44336' },
        'btnPressCustom': { bg: '#2196F3', border: '#2196F3' }
    };
    
    // Mettre à jour l'apparence des boutons
    const standardValues = [6, 8, 12, 16];
    ['btnPress6', 'btnPress8', 'btnPress12', 'btnPress16'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const btnValue = parseInt(btnId.replace('btnPress', ''));
            const colors = btnColors[btnId];
            if (btnValue === value) {
                btn.style.background = colors.bg;
                btn.style.border = '5px solid #FFD700';
                btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.background = colors.bg;
                btn.style.border = '2px solid ' + colors.border;
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        }
    });
    
    // Gérer le bouton "Autre"
    const btnCustom = document.getElementById('btnPressCustom');
    if (btnCustom) {
        const colors = btnColors['btnPressCustom'];
        if (!standardValues.includes(value)) {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '5px solid #FFD700';
            btnCustom.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            btnCustom.style.transform = 'scale(1.05)';
        } else {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '2px solid ' + colors.border;
            btnCustom.style.boxShadow = 'none';
            btnCustom.style.transform = 'scale(1)';
        }
    }
}

function toggleCustomPression() {
    const customDiv = document.getElementById('customPressionDiv');
    const customInput = document.getElementById('customPressionValue');
    
    if (customDiv.style.display === 'none') {
        customDiv.style.display = 'block';
        if (customInput) {
            customInput.focus();
            customInput.select();
        }
    } else {
        customDiv.style.display = 'none';
    }
}

// ========== FONCTION DÉBIT LANCE ==========
function setDebitLance(value) {
    const debitInput = document.getElementById('debitTroncon');
    if (debitInput) {
        debitInput.value = value;
    }
    
    // Définir les couleurs originales de chaque bouton
    const btnColors = {
        'btnDebit250': { bg: '#4CAF50', border: '#4CAF50' },
        'btnDebit500': { bg: '#8BC34A', border: '#8BC34A' },
        'btnDebit1000': { bg: '#FF9800', border: '#FF9800' },
        'btnDebit2000': { bg: '#F44336', border: '#F44336' }
    };
    
    // Mettre à jour l'apparence des boutons
    const standardValues = [250, 500, 1000, 2000];
    ['btnDebit250', 'btnDebit500', 'btnDebit1000', 'btnDebit2000'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const btnValue = parseInt(btnId.replace('btnDebit', ''));
            const colors = btnColors[btnId];
            if (btnValue === value) {
                btn.style.background = colors.bg;
                btn.style.border = '5px solid #FFD700';
                btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.background = colors.bg;
                btn.style.border = '2px solid ' + colors.border;
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        }
    });
}

// ========== MASQUER/AFFICHER DÉBIT ET PRESSION SELON TYPE ==========
function toggleDebitPressionFields() {
    const typeEtablissement = document.getElementById('commentaireTroncon')?.value;
    const debitGroup = document.getElementById('debitGroup');
    const pressionGroup = document.getElementById('pressionGroup');
    
    if (typeEtablissement === 'Alimentation') {
        // Masquer pour alimentation
        if (debitGroup) debitGroup.style.display = 'none';
        if (pressionGroup) pressionGroup.style.display = 'none';
    } else {
        // Afficher pour lances
        if (debitGroup) debitGroup.style.display = 'block';
        if (pressionGroup) pressionGroup.style.display = 'block';
    }
}

function ajouterTroncon() {
    const diametre = parseInt(document.getElementById('diametreTroncon')?.value || 70);
    const nbTuyaux = parseInt(document.getElementById('nbTuyaux20')?.value || 1);
    const longueur = nbTuyaux * 20; // Longueur totale en mètres
    const denivele = parseInt(document.getElementById('deniveleTroncon')?.value || 0);
    const commentaire = document.getElementById('commentaireTroncon')?.value || '';
    
    if (!commentaire) {
        alert('⚠️ Veuillez sélectionner un type d\'établissement');
        return;
    }
    
    // Pour une alimentation, pas de débit ni pression
    if (commentaire === 'Alimentation') {
        if (nbTuyaux > 0) {
            tronconsPerte.push({
                diametre,
                nbTuyaux,
                longueur,
                denivele,
                debit: 0,
                pressionLance: 0,
                commentaire,
                isAlimentation: true
            });
            
            afficherTroncons();
            
            // Réinitialiser le formulaire
            document.getElementById('nbTuyaux20').value = '1';
            document.getElementById('deniveleTroncon').value = '0';
            document.getElementById('commentaireTroncon').value = '';
            toggleDebitPressionFields();
        }
    } else {
        // Pour les lances, débit et pression obligatoires
        const debit = parseInt(document.getElementById('debitTroncon')?.value || 0);
        const pressionLance = parseFloat(document.getElementById('pressionLanceTroncon')?.value || 6);
        
        if (nbTuyaux > 0 && debit > 0) {
            tronconsPerte.push({
                diametre,
                nbTuyaux,
                longueur,
                denivele,
                debit,
                pressionLance,
                commentaire,
                isAlimentation: false
            });
            
            afficherTroncons();
            
            // Réinitialiser le formulaire
            document.getElementById('nbTuyaux20').value = '1';
            document.getElementById('deniveleTroncon').value = '0';
            document.getElementById('commentaireTroncon').value = '';
        } else {
            alert('⚠️ Veuillez saisir un débit supérieur à 0 pour une lance');
        }
    }
}

function afficherTroncons() {
    const tableBody = document.getElementById('tableTroncons');
    const container = document.getElementById('tableTronconsContainer');
    
    if (!tableBody) return;
    
    if (tronconsPerte.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    tableBody.innerHTML = tronconsPerte.map((t, i) => {
        // Calcul de la perte pour ce tronçon
        const perteReseau = calculerPerteTroncon(t);
        const perteDenivele = t.denivele / 10; // ±10m = ±1 bar
        
        // Si c'est une alimentation, pas de pression lance
        const pressionTotale = t.isAlimentation ? (perteReseau + perteDenivele) : (t.pressionLance + perteReseau + perteDenivele);
        
        // Affichage différent selon le type
        const debitDisplay = t.isAlimentation ? '<span style="color: #000000;">-</span>' : t.debit;
        const pressionLanceDisplay = t.isAlimentation ? '<span style="color: #000000;">-</span>' : t.pressionLance + ' bar';
        const rowBg = t.isAlimentation ? 'rgba(33, 150, 243, 0.1)' : 'rgba(244, 67, 54, 0.1)';
        const typeColor = t.isAlimentation ? '#2196F3' : '#F44336';
        const typeIcon = t.isAlimentation ? '🔵' : '🔴';
        
        return `
            <tr style="background: ${rowBg};">
                <td style="font-weight: bold;">${i + 1}</td>
                <td style="font-weight: bold; color: ${typeColor};">${typeIcon} ${t.commentaire}</td>
                <td style="font-weight: 600;">${t.diametre}</td>
                <td>${t.nbTuyaux} × 20m<br><span style="font-size: 0.9em; color: #000000;">(${t.longueur}m)</span></td>
                <td style="font-weight: 600;">${debitDisplay}</td>
                <td>${t.denivele > 0 ? '+' : ''}${t.denivele}m<br><span style="font-size: 0.9em; color: #000000;">(${perteDenivele > 0 ? '+' : ''}${perteDenivele.toFixed(1)} bar)</span></td>
                <td style="font-weight: 600;">${pressionLanceDisplay}</td>
                <td style="color: #FF9800; font-weight: bold;">${perteReseau.toFixed(2)} bar</td>
                <td style="font-weight: bold; font-size: 1.1em; color: #FFD700; background: rgba(255, 215, 0, 0.15);">${pressionTotale.toFixed(2)} bar</td>
                <td>
                    <button onclick="supprimerTroncon(${i})" style="padding: 8px 12px; background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%); border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 1.1em; transition: all 0.3s;">❌</button>
                </td>
            </tr>
        `;
    }).join('');
}

function calculerPerteTroncon(troncon) {
    // Formule basée sur les valeurs de référence réelles
    // Perte proportionnelle au carré du débit et linéaire à la longueur
    // Valeurs de référence pour 20m au débit de référence :
    // - 45mm : 1.2 bars à 500 L/min
    // - 70mm : 0.11 bars à 500 L/min  
    // - 110mm : 0.056 bars à 1000 L/min (0.28 bars pour 100m)
    
    let K; // Coefficient de perte pour 20m au débit de référence
    let debitRef; // Débit de référence
    
    if (troncon.diametre === 45) {
        K = 1.2;
        debitRef = 500;
    } else if (troncon.diametre === 70) {
        K = 0.11;
        debitRef = 500;
    } else if (troncon.diametre === 110) {
        K = 0.056;
        debitRef = 1000;
    } else {
        // Valeur par défaut (ne devrait pas arriver)
        K = 0.11;
        debitRef = 500;
    }
    
    // Perte = K × (Q/Qref)² × (L/20)
    const perte = K * Math.pow(troncon.debit / debitRef, 2) * (troncon.longueur / 20);
    return perte;
}

function supprimerTroncon(index) {
    tronconsPerte.splice(index, 1);
    afficherTroncons();
}

function calculerPertes() {
    if (tronconsPerte.length === 0) {
        alert('⚠️ Veuillez ajouter au moins un établissement');
        return;
    }
    
    const jonctions = parseInt(document.getElementById('jonctionsPerte')?.value || 0);
    const pertJonctions = jonctions * 1; // 1 bar par pièce de jonction
    
    // Séparer alimentations et lances
    const alimentations = tronconsPerte.filter(t => t.isAlimentation);
    const lances = tronconsPerte.filter(t => !t.isAlimentation);
    
    if (lances.length === 0) {
        alert('⚠️ Veuillez ajouter au moins un établissement d\'extinction (lance)');
        return;
    }
    
    // Calculer le débit total des lances
    const debitTotal = lances.reduce((sum, t) => sum + t.debit, 0);
    
    // Trouver l'établissement d'extinction le plus défavorable
    let lanceDefavorable = null;
    let pressionMaxLance = 0;
    let detailsLancesHTML = '';
    
    lances.forEach((t, i) => {
        const perteReseau = calculerPerteTroncon(t);
        const perteDenivele = t.denivele / 10;
        const pressionTotale = t.pressionLance + perteReseau + perteDenivele;
        
        if (pressionTotale > pressionMaxLance) {
            pressionMaxLance = pressionTotale;
            lanceDefavorable = t;
        }
        
        detailsLancesHTML += `
            <div class="result-item" style="background: rgba(244, 67, 54, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #F44336; margin-bottom: 8px;">
                <span style="color: #000000; font-weight: 600;">🔴 ${t.commentaire} <span style="color: #000000; font-size: 0.9em;">(Ø${t.diametre}mm × ${t.longueur}m, ${t.debit}L/min)</span></span>
                <span class="result-value" style="color: #FF9800; font-weight: bold; font-size: 1.1em;">${pressionTotale.toFixed(2)} bar</span>
            </div>
        `;
    });
    
    // Calculer les pertes d'alimentation avec le débit total
    let pressionAlimentation = 0;
    let detailsAlimHTML = '';
    
    alimentations.forEach((t) => {
        // Recalculer avec le débit total
        const tWithDebit = {...t, debit: debitTotal};
        const perteReseau = calculerPerteTroncon(tWithDebit);
        const perteDenivele = t.denivele / 10;
        const pressionTotale = perteReseau + perteDenivele;
        
        pressionAlimentation += pressionTotale;
        
        detailsAlimHTML += `
            <div class="result-item" style="background: rgba(33, 150, 243, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin-bottom: 8px;">
                <span style="color: #000000; font-weight: 600;">🔵 ${t.commentaire} <span style="color: #000000; font-size: 0.9em;">(Ø${t.diametre}mm × ${t.longueur}m, débit: ${debitTotal}L/min)</span></span>
                <span class="result-value" style="color: #2196F3; font-weight: bold; font-size: 1.1em;">${pressionTotale.toFixed(2)} bar</span>
            </div>
        `;
    });
    
    // Pression pompe = Alimentation + Lance la plus défavorable + Jonctions
    const pressionPompe = pressionAlimentation + pressionMaxLance + pertJonctions;
    
    // Affichage des résultats
    const resultatDiv = document.getElementById('resultatPertes');
    const pressionValue = document.getElementById('pressionPompeValue');
    const detailCalc = document.getElementById('detailCalculPertes');
    
    if (resultatDiv) resultatDiv.style.display = 'block';
    if (pressionValue) pressionValue.textContent = `${pressionPompe.toFixed(1)} bar`;
    
    if (detailCalc) {
        detailCalc.innerHTML = `
            <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: var(--shadow-lg);">
                <h4 style="color: #FFFFFF; margin: 0; font-size: 1.4em; text-align: center;">📊 DÉBIT TOTAL : ${debitTotal} L/min</h4>
            </div>
            
            ${alimentations.length > 0 ? `
                <div style="margin-bottom: 20px; background: var(--bg-card); padding: 20px; border-radius: 12px; border: 2px solid #2196F3; box-shadow: var(--shadow-md);">
                    <h4 style="color: #2196F3; margin-bottom: 15px; font-size: 1.3em; border-bottom: 2px solid #2196F3; padding-bottom: 10px;">🔵 ALIMENTATIONS</h4>
                    ${detailsAlimHTML}
                    <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); border-radius: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #FFFFFF; font-weight: bold; font-size: 1.2em;">Total alimentation :</span>
                            <span style="color: #FFD700; font-weight: bold; font-size: 1.4em;">${pressionAlimentation.toFixed(2)} bar</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 20px; background: var(--bg-card); padding: 20px; border-radius: 12px; border: 2px solid #F44336; box-shadow: var(--shadow-md);">
                <h4 style="color: #F44336; margin-bottom: 15px; font-size: 1.3em; border-bottom: 2px solid #F44336; padding-bottom: 10px;">🔴 ÉTABLISSEMENTS D'EXTINCTION</h4>
                ${detailsLancesHTML}
                <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%); border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #FFFFFF; font-weight: bold; font-size: 1.2em;">⚠️ Établissement le plus défavorable :</span>
                        <span style="color: #FFD700; font-weight: bold; font-size: 1.4em;">${pressionMaxLance.toFixed(2)} bar</span>
                    </div>
                </div>
            </div>
            
            ${jonctions > 0 ? `
                <div style="background: var(--bg-card); padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 2px solid #FF9800;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #000000; font-weight: 600; font-size: 1.1em;">⚙️ Perte jonctions (${jonctions} pièces) :</span>
                        <span style="color: #FF9800; font-weight: bold; font-size: 1.3em;">${pertJonctions.toFixed(1)} bar</span>
                    </div>
                </div>
            ` : ''}
            
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%); padding: 25px; border-radius: 12px; box-shadow: var(--shadow-xl); border: 3px solid #4CAF50;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <div style="color: #FFFFFF; font-size: 1.3em; font-weight: bold; margin-bottom: 10px;">💡 DÉTAIL DU CALCUL</div>
                    <div style="color: #FFFFFF; font-size: 1.5em; font-weight: 600; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                        ${pressionAlimentation.toFixed(2)} <span style="color: #FFD700;">+</span> ${pressionMaxLance.toFixed(2)} <span style="color: #FFD700;">+</span> ${pertJonctions.toFixed(1)} <span style="color: #FFD700;">=</span> <span style="color: #FFD700; font-size: 1.3em;">${pressionPompe.toFixed(1)} bar</span>
                    </div>
                </div>
            </div>
        `;
    }
}

function resetPertes() {
    tronconsPerte = [];
    document.getElementById('jonctionsPerte').value = '0';
    document.getElementById('nbTuyaux20').value = '1';
    document.getElementById('deniveleTroncon').value = '0';
    document.getElementById('debitTroncon').value = '500';
    document.getElementById('pressionLanceTroncon').value = '6';
    document.getElementById('commentaireTroncon').value = '';
    afficherTroncons();
    
    const resultatDiv = document.getElementById('resultatPertes');
    if (resultatDiv) resultatDiv.style.display = 'none';
}

// ========== MODULE TMD & GMU (VERSION SÉCURISÉE) ==========
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

// Fonction passerelle indispensable pour charger la fiche
function preparerFicheGMU(onu) {
    const matiere = tmdDatabase.find(p => p.onu.toString() === onu.toString());
    
    if (!matiere) {
        alert("⚠️ Erreur : Impossible de retrouver les données pour l'ONU " + onu);
        return;
    }

    if (typeof afficherFicheGMU === 'function') {
        afficherFicheGMU(matiere);
    } else {
        alert('❌ Erreur : Le module d\'affichage (affichage-gmu.js) n\'est pas chargé.');
    }
}

// ========== MODULE TABLEAU ARI ==========
// ========== MODULE DISTANCES SÉCURITÉ ==========
function calculateDistances() {
    const type = document.getElementById('dist-type').value;
    const quantite = parseFloat(document.getElementById('dist-quantite').value);
    
    let distance = 0;
    let message = '';
    
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
    
    document.getElementById('dist-result').innerHTML = `
        <div class="result-box">
            <h3>${message}</h3>
            <div class="info-card">
                <div class="label">Périmètre de sécurité</div>
                <div class="value">${distance.toFixed(0)} m</div>
            </div>
            <div class="danger-box" style="margin-top: 20px;">
                <strong>⚠️ Consignes :</strong>
                <ul style="margin-left: 20px; margin-top: 10px;">
                    <li>Établir le périmètre immédiatement</li>
                    <li>Évacuer la zone</li>
                    <li>ARI obligatoire pour approche</li>
                    <li>Prévoir moyen de détection (explosimètre, détecteur gaz)</li>
                </ul>
            </div>
        </div>
    `;
}

// ========== MODULE VENTILATION ==========
// ========== MODULE FEU DE FORÊT - RÈGLE DES 3% ==========
let ventSelectionne = 0;

function selectVentRapide(vitesse) {
    ventSelectionne = vitesse;
    
    // Mise à jour visuelle des boutons - retirer l'effet de sélection de tous
    document.querySelectorAll('.vent-btn').forEach(btn => {
        btn.style.boxShadow = btn.style.boxShadow.replace('0 0 0 4px rgba(229, 57, 53, 0.3), ', '');
        btn.style.transform = 'scale(1)';
    });
    
    // Ajouter l'effet de sélection au bouton cliqué
    event.target.style.boxShadow = '0 0 0 4px rgba(229, 57, 53, 0.3), ' + event.target.style.boxShadow;
    event.target.style.transform = 'scale(1.05)';
    
    // Calcul immédiat
    calculateFeuForetRegle3pct();
}

function selectAngleCone(angle) {
    document.getElementById('angle-cone').value = angle;
    
    // Retirer la surbrillance de tous les boutons
    document.querySelectorAll('.angle-btn').forEach(btn => {
        btn.classList.remove('angle-selected');
        btn.style.border = btn.id === 'angle-btn-30' ? '3px solid #2196F3' : '3px solid #9C27B0';
        btn.style.boxShadow = btn.id === 'angle-btn-30' ? '0 4px 10px rgba(33, 150, 243, 0.3)' : '0 4px 10px rgba(156, 39, 176, 0.3)';
    });
    
    // Ajouter la surbrillance au bouton sélectionné
    const selectedBtn = document.getElementById(`angle-btn-${angle}`);
    if (selectedBtn) {
        selectedBtn.classList.add('angle-selected');
        selectedBtn.style.border = '4px solid #4CAF50';
        selectedBtn.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.6)';
    }
    
    // Recalcul si une vitesse est déjà sélectionnée
    if (ventSelectionne > 0) {
        calculateFeuForetRegle3pct();
    }
}

function calculateFeuForetRegle3pct() {
    if (ventSelectionne === 0) {
        document.getElementById('feu-foret-result').innerHTML = `
            <div class="alert-box" style="text-align: center; padding: 30px;">
                <div style="font-size: 2em; margin-bottom: 15px;">💨</div>
                <p style="font-size: 1.1em;">Sélectionnez une vitesse de vent pour calculer la propagation</p>
            </div>
        `;
        return;
    }
    
    const vent = ventSelectionne;
    const angleCone = parseFloat(document.getElementById('angle-cone').value) || 40;
    
    // ========== RÈGLE DES 3% ==========
    // Vitesse propagation = 3% de la vitesse du vent
    const vitessePropagation = vent * 0.03; // en km/h
    const vitessePropagationMMin = vitessePropagation * (1000/60); // en m/min
    
    // ========== CALCUL DES DISTANCES ==========
    const temps = [15, 30, 45, 60, 120]; // en minutes
    const distances = temps.map(t => vitessePropagationMMin * t); // en mètres
    
    // ========== CALCUL DES SURFACES BRÛLÉES (CÔNE DE PROPAGATION) ==========
    // Surface d'un secteur circulaire : S = (θ/360) × π × r²
    // Avec θ = angle du cône en degrés, r = distance parcourue
    const surfaces = distances.map(d => {
        const rayon = d; // rayon = distance parcourue
        const surface = (angleCone / 360) * Math.PI * Math.pow(rayon, 2); // en m²
        return surface;
    });
    
    // ========== DÉTERMINATION DU NIVEAU DE RISQUE ==========
    let niveauRisque = 'FAIBLE';
    let emoji = '✅';
    let couleur = '#4CAF50';
    
    if (vitessePropagationMMin < 10) {
        niveauRisque = 'FAIBLE';
        emoji = '✅';
        couleur = '#4CAF50';
    } else if (vitessePropagationMMin < 20) {
        niveauRisque = 'MODÉRÉ';
        emoji = '⚠️';
        couleur = '#ffaa00';
    } else if (vitessePropagationMMin < 35) {
        niveauRisque = 'ÉLEVÉ';
        emoji = '🚨';
        couleur = '#ff6600';
    } else {
        niveauRisque = 'CRITIQUE';
        emoji = '❌';
        couleur = '#ff0000';
    }
    
    // ========== FORMATAGE DES VALEURS ==========
    function formatDistance(distanceM) {
        if (distanceM < 1000) {
            return `${Math.round(distanceM)} m`;
        } else {
            return `${(distanceM / 1000).toFixed(2)} km`;
        }
    }
    
    function formatSurface(surfaceM2) {
        if (surfaceM2 < 10000) {
            return `${Math.round(surfaceM2)} m²`;
        } else {
            return `${(surfaceM2 / 10000).toFixed(2)} ha`;
        }
    }
    
    // ========== AFFICHAGE DES RÉSULTATS ==========
    document.getElementById('feu-foret-result').innerHTML = `
        <!-- INDICATEUR RISQUE -->
        <div style="background: linear-gradient(135deg, ${couleur} 0%, ${couleur} 100%); padding: 25px; border-radius: 15px; text-align: center; margin-bottom: 25px; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
            <div style="font-size: 3.5em; margin-bottom: 10px;">${emoji}</div>
            <div style="font-size: 1.8em; font-weight: bold; margin-bottom: 15px;">RISQUE ${niveauRisque}</div>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-top: 15px;">
                <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 8px;">Vent : ${vent} km/h</div>
                <div style="font-size: 2.5em; font-weight: bold;">${vitessePropagationMMin.toFixed(1)} m/min</div>
                <div style="font-size: 1.1em; opacity: 0.9; margin-top: 5px;">${vitessePropagation.toFixed(2)} km/h</div>
            </div>
        </div>
        
        <!-- DISTANCES PARCOURUES -->
        <div class="result-box">
            <h3>📏 Distances parcourues (axe de propagation)</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #4CAF50;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 15 min</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #4CAF50;">${formatDistance(distances[0])}</div>
                </div>
                
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #8BC34A;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 30 min</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #8BC34A;">${formatDistance(distances[1])}</div>
                </div>
                
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #FFC107;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 45 min</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #FFC107;">${formatDistance(distances[2])}</div>
                </div>
                
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #FF9800;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 1h</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #FF9800;">${formatDistance(distances[3])}</div>
                </div>
                
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #FF5722;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 2h</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #FF5722;">${formatDistance(distances[4])}</div>
                </div>
            </div>
        </div>
        
        <!-- SURFACES BRÛLÉES -->
        <div class="result-box">
            <h3>🔥 Surfaces approximatives brûlées (cône ${angleCone}°)</h3>
            <p style="opacity: 0.8; font-size: 0.9em; margin-bottom: 15px;">
                Estimation basée sur un cône de propagation de ${angleCone}° dans l'axe du vent
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #4CAF50;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 15 min</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #4CAF50;">${formatSurface(surfaces[0])}</div>
                </div>
                
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #8BC34A;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 30 min</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #8BC34A;">${formatSurface(surfaces[1])}</div>
                </div>
                
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #FFC107;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 45 min</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #FFC107;">${formatSurface(surfaces[2])}</div>
                </div>
                
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #FF9800;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 1h</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #FF9800;">${formatSurface(surfaces[3])}</div>
                </div>
                
                <div style="background: var(--bg-elevated); padding: 20px; border-radius: 12px; text-align: center; border-left: 5px solid #FF5722;">
                    <div style="font-size: 0.95em; opacity: 0.9; margin-bottom: 10px;">⏱️ 2h</div>
                    <div style="font-size: 2.2em; font-weight: bold; color: #FF5722;">${formatSurface(surfaces[4])}</div>
                </div>
            </div>
        </div>
        
        <!-- NOTES OPÉRATIONNELLES -->
        <div class="alert-box" style="background: rgba(0,170,255,0.15); border-left-color: #00aaff;">
            <strong>📋 Notes opérationnelles :</strong><br>
            • Les surfaces sont calculées avec un cône de propagation de ${angleCone}° dans l'axe du vent<br>
            • Valeurs approximatives basées sur la règle des 3% (terrain plat, végétation moyenne)<br>
            • En terrain pentu ou végétation dense, multiplier les estimations par 1.5 à 2<br>
            • Ces calculs ne remplacent pas l'évaluation terrain et l'expérience opérationnelle
        </div>
        
        ${vent >= 60 ? `
        <div class="danger-box">
            <strong>⚠️ VENT VIOLENT (${vent} km/h)</strong><br>
            Conditions extrêmes - Propagation très rapide et imprévisible<br>
            Prévoir zones de repli sécurisées et moyens aériens renforcés
        </div>
        ` : ''}
    `;
}

// Fonction de compatibilité pour l'ancien nom
function calculateFeuForet() {
    calculateFeuForetRegle3pct();
}

// ========== MODULE CONVERTISSEUR ==========
// ========== MODULE CONVERTISSEUR AMÉLIORÉ ==========

// Données de conversion (fallback si JSON non chargé)
conversionData = {
    pression: {
        name: '🔧 PRESSION',
        units: {
            'bar': 1,
            'Pa': 100000,
            'kPa': 100,
            'psi': 14.5038,
            'atm': 0.986923,
            'mmHg': 750.062
        },
        quickValues: [1, 2, 3, 5, 10, 20, 50, 100],
        defaultUnit1: 'bar',
        defaultUnit2: 'psi'
    },
    debit: {
        name: '💧 DÉBIT',
        units: {
            'L/min': 1,
            'L/s': 1/60,
            'm³/h': 0.06,
            'L/h': 60,
            'gal/min': 0.264172
        },
        quickValues: [100, 250, 500, 1000, 1500, 2000, 2500, 3000],
        defaultUnit1: 'L/min',
        defaultUnit2: 'm³/h'
    },
    volume: {
        name: '🪣 VOLUME',
        units: {
            'L': 1,
            'm³': 0.001,
            'mL': 1000,
            'gal (US)': 0.264172,
            'gal (UK)': 0.219969
        },
        quickValues: [100, 500, 1000, 2000, 5000, 10000, 15000, 20000],
        defaultUnit1: 'L',
        defaultUnit2: 'm³'
    },
    distance: {
        name: '📏 DISTANCE',
        units: {
            'm': 1,
            'km': 0.001,
            'cm': 100,
            'mm': 1000,
            'mi': 0.000621371,
            'ft': 3.28084
        },
        quickValues: [10, 25, 50, 100, 200, 500, 1000, 5000],
        defaultUnit1: 'm',
        defaultUnit2: 'km'
    },
    vitesse: {
        name: '🚒 VITESSE',
        units: {
            'km/h': 1,
            'm/s': 0.277778,
            'mph': 0.621371,
            'kt': 0.539957
        },
        quickValues: [30, 50, 70, 90, 110, 130, 150, 200],
        defaultUnit1: 'km/h',
        defaultUnit2: 'm/s'
    },
    temperature: {
        name: '🌡️ TEMPÉRATURE',
        units: ['°C', '°F', 'K'],
        quickValues: [0, 20, 37, 50, 100, 200, 500, 1000],
        defaultUnit1: '°C',
        defaultUnit2: '°F',
        convert: function(value, from, to) {
            // Convertir d'abord en Celsius
            let celsius = value;
            if (from === '°F') celsius = (value - 32) * 5/9;
            else if (from === 'K') celsius = value - 273.15;
            
            // Puis convertir vers l'unité cible
            if (to === '°C') return celsius;
            else if (to === '°F') return (celsius * 9/5) + 32;
            else if (to === 'K') return celsius + 273.15;
            return value;
        }
    }
};

function selectQuickConvert(type) {
    currentConversionType = type;
    const data = conversionData[type];
    
    document.getElementById('conversionZone').style.display = 'block';
    document.getElementById('conversionTitle').textContent = data.name;
    
    // Remplir les sélecteurs d'unités
    const unit1 = document.getElementById('unit1');
    const unit2 = document.getElementById('unit2');
    
    if (type === 'temperature') {
        unit1.innerHTML = data.units.map(u => `<option value="${u}">${u}</option>`).join('');
        unit2.innerHTML = data.units.map(u => `<option value="${u}">${u}</option>`).join('');
    } else {
        const unitNames = Object.keys(data.units);
        unit1.innerHTML = unitNames.map(u => `<option value="${u}">${u}</option>`).join('');
        unit2.innerHTML = unitNames.map(u => `<option value="${u}">${u}</option>`).join('');
    }
    
    // Définir les unités par défaut
    unit1.value = data.defaultUnit1;
    unit2.value = data.defaultUnit2;
    
    // Afficher les valeurs rapides
    displayQuickValues(type);
    
    // Réinitialiser
    document.getElementById('value1').value = '';
    document.getElementById('value2').textContent = '--';
    
    // Scroll vers la zone de conversion
    document.getElementById('conversionZone').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayQuickValues(type) {
    const data = conversionData[type];
    const container = document.getElementById('quickValuesButtons');
    
    container.innerHTML = data.quickValues.map(val => `
        <button onclick="setQuickValue(${val})" style="padding: 10px 20px; background: linear-gradient(135deg, var(--primary-red) 0%, var(--primary-red-dark) 100%); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer; transition: transform 0.2s;"
                onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${val}
        </button>
    `).join('');
}

function setQuickValue(value) {
    document.getElementById('value1').value = value;
    convertValue();
}

function convertValue() {
    const value1Input = document.getElementById('value1');
    const unit1Select = document.getElementById('unit1');
    const unit2Select = document.getElementById('unit2');
    const value2Div = document.getElementById('value2');
    
    const value = parseFloat(value1Input.value);
    
    if (isNaN(value) || value1Input.value === '') {
        value2Div.textContent = '--';
        updateConversionTable();
        return;
    }
    
    const from = unit1Select.value;
    const to = unit2Select.value;
    
    let result;
    
    if (currentConversionType === 'temperature') {
        result = conversionData.temperature.convert(value, from, to);
    } else {
        const data = conversionData[currentConversionType];
        // Convertir en unité de base puis vers l'unité cible
        const baseValue = value / data.units[from];
        result = baseValue * data.units[to];
    }
    
    // Afficher avec précision adaptée
    const precision = Math.abs(result) < 1 ? 6 : Math.abs(result) < 100 ? 4 : 2;
    value2Div.textContent = result.toFixed(precision);
    
    // Mettre à jour la table de conversion
    updateConversionTable(value, from);
}

function updateConversionTable(value, fromUnit) {
    const tableDiv = document.getElementById('conversionTable');
    
    if (!value || !fromUnit) {
        tableDiv.innerHTML = '';
        return;
    }
    
    const data = conversionData[currentConversionType];
    let conversions = [];
    
    if (currentConversionType === 'temperature') {
        conversions = data.units.map(unit => {
            const result = data.convert(value, fromUnit, unit);
            return {unit, result};
        });
    } else {
        const baseValue = value / data.units[fromUnit];
        conversions = Object.keys(data.units).map(unit => {
            const result = baseValue * data.units[unit];
            return {unit, result};
        });
    }
    
    tableDiv.innerHTML = `
        <div style="background: var(--bg-main); padding: 15px; border-radius: 10px; margin-top: 15px;">
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 10px; text-align: center;">📊 Table de conversion complète</div>
            <div style="display: grid; gap: 8px;">
                ${conversions.map(c => {
                    const isCurrentFrom = c.unit === fromUnit;
                    const isCurrentTo = c.unit === document.getElementById('unit2').value;
                    const highlight = isCurrentFrom ? 'border-left: 4px solid var(--primary-red);' : isCurrentTo ? 'border-left: 4px solid #4CAF50;' : '';
                    return `
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--bg-card); border-radius: 6px; ${highlight}">
                            <span style="font-weight: ${isCurrentFrom || isCurrentTo ? 'bold' : 'normal'}; color: ${isCurrentFrom ? 'var(--primary-red)' : isCurrentTo ? '#4CAF50' : 'var(--text-light)'};">${c.unit}</span>
                            <span style="font-family: monospace; color: ${isCurrentTo ? '#4CAF50' : 'var(--text-light)'};">${c.result.toFixed(c.result < 1 ? 6 : c.result < 100 ? 4 : 2)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function swapUnits() {
    const unit1 = document.getElementById('unit1');
    const unit2 = document.getElementById('unit2');
    const value1 = document.getElementById('value1');
    const value2Text = document.getElementById('value2').textContent;
    
    // Échanger les unités
    const temp = unit1.value;
    unit1.value = unit2.value;
    unit2.value = temp;
    
    // Si on a un résultat, le mettre dans value1
    if (value2Text !== '--') {
        value1.value = value2Text;
        convertValue();
    }
}

function closeConverter() {
    document.getElementById('conversionZone').style.display = 'none';
    currentConversionType = '';
}

function updateConverterUnits() {
    // Ancienne fonction - conservée pour compatibilité
    const type = document.getElementById('convert-type')?.value;
}

// ========== MODULE DISTANCES SÉCURITÉ ==========
function showDistanceCategory(category) {
    // Masquer le menu principal
    document.getElementById('distancesMenu').style.display = 'none';
    
    // Masquer toutes les sections
    document.querySelectorAll('.distance-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Afficher la section demandée
    const sectionId = 'distance' + category.charAt(0).toUpperCase() + category.slice(1);
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Initialiser l'affichage GAZ si c'est la section GAZ
        if (category === 'gaz') {
            showGazType();
        }
        
        // Initialiser l'affichage ÉLECTRICITÉ si c'est la section ÉLECTRICITÉ
        if (category === 'electricite') {
            showElecType();
        }
    }
}

function backToDistancesMenu() {
    // Masquer toutes les sections
    document.querySelectorAll('.distance-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Afficher le menu principal
    document.getElementById('distancesMenu').style.display = 'grid';
}

function calculateTransport() {
    const diametre = parseFloat(document.getElementById('diametreTransport')?.value || 0);
    const perimetreElement = document.getElementById('perimetreTransport');
    if (perimetreElement) {
        perimetreElement.textContent = diametre + ' m';
    }
}

// Fonction pour afficher uniquement la carte sélectionnée dans la section GAZ
function showGazType(type) {
    // Si pas de type fourni, prendre le premier (transport)
    if (!type) type = 'transport';
    
    // Masquer toutes les cartes GAZ
    const allCards = [
        'gaz-transport', 
        'gaz-distribution', 
        'gaz-mpc', 
        'gaz-gpl', 
        'gaz-bouteilles', 
        'gaz-acetylene', 
        'gaz-methanisation'
    ];
    
    allCards.forEach(id => {
        const card = document.getElementById(id);
        if (card) card.style.display = 'none';
    });
    
    // Configuration des couleurs par bouton
    const buttonColors = {
        'btnGazTransport': { bg: 'linear-gradient(135deg, #FF6B35 0%, #F44336 100%)', border: '#F44336', color: '#fff' },
        'btnGazDistribution': { bg: 'linear-gradient(135deg, #FFD60A 0%, #FFC107 100%)', border: '#FFC107', color: '#000' },
        'btnGazMpc': { bg: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', border: '#F57C00', color: '#fff' },
        'btnGazGpl': { bg: 'linear-gradient(135deg, #AB47BC 0%, #9C27B0 100%)', border: '#9C27B0', color: '#fff' },
        'btnGazBouteilles': { bg: 'linear-gradient(135deg, #42A5F5 0%, #2196F3 100%)', border: '#2196F3', color: '#fff' },
        'btnGazAcetylene': { bg: 'linear-gradient(135deg, #EF5350 0%, #C62828 100%)', border: '#C62828', color: '#fff' },
        'btnGazMethanisation': { bg: 'linear-gradient(135deg, #8BC34A 0%, #4CAF50 100%)', border: '#4CAF50', color: '#fff' }
    };
    
    // Réinitialiser tous les boutons avec leurs couleurs d'origine
    const allButtons = Object.keys(buttonColors);
    
    allButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const colors = buttonColors[id];
            btn.style.background = colors.bg;
            btn.style.borderColor = colors.border;
            btn.style.borderWidth = '2px';
            btn.style.opacity = '0.6';
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
            btn.style.color = colors.color;
        }
    });
    
    // Activer le bouton sélectionné
    const buttonMap = {
        'transport': 'btnGazTransport',
        'distribution': 'btnGazDistribution',
        'mpc': 'btnGazMpc',
        'gpl': 'btnGazGpl',
        'bouteilles': 'btnGazBouteilles',
        'acetylene': 'btnGazAcetylene',
        'methanisation': 'btnGazMethanisation'
    };
    
    const activeBtn = document.getElementById(buttonMap[type]);
    if (activeBtn) {
        activeBtn.style.borderWidth = '4px';
        activeBtn.style.opacity = '1';
        activeBtn.style.transform = 'scale(1.05)';
        activeBtn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    }
    
    // Afficher uniquement la carte sélectionnée
    const selectedCard = document.getElementById('gaz-' + type);
    if (selectedCard) {
        selectedCard.style.display = 'block';
        // Si c'est le transport, recalculer pour afficher la valeur
        if (type === 'transport') {
            calculateTransport();
        }
        // Scroller directement vers la carte après un court délai pour laisser le temps au rendu
        setTimeout(() => {
            selectedCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function showElecType(type) {
    // Si pas de type fourni, prendre le premier (generalites)
    if (!type) type = 'generalites';
    
    // Masquer toutes les cartes ÉLECTRICITÉ
    const allCards = [
        'elec-generalites', 
        'elec-voisinage', 
        'elec-zonage', 
        'elec-cable', 
        'elec-eolienne', 
        'elec-ppv'
    ];
    
    allCards.forEach(id => {
        const card = document.getElementById(id);
        if (card) card.style.display = 'none';
    });
    
    // Configuration des couleurs par bouton
    const buttonColors = {
        'btnElecGeneralites': { bg: 'linear-gradient(135deg, #42A5F5 0%, #2196F3 100%)', border: '#2196F3', color: '#fff' },
        'btnElecVoisinage': { bg: 'linear-gradient(135deg, #FFD60A 0%, #FFC107 100%)', border: '#FFC107', color: '#000' },
        'btnElecZonage': { bg: 'linear-gradient(135deg, #FF6B35 0%, #F44336 100%)', border: '#F44336', color: '#fff' },
        'btnElecCable': { bg: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', border: '#F57C00', color: '#fff' },
        'btnElecEolienne': { bg: 'linear-gradient(135deg, #8BC34A 0%, #4CAF50 100%)', border: '#4CAF50', color: '#fff' },
        'btnElecPpv': { bg: 'linear-gradient(135deg, #AB47BC 0%, #9C27B0 100%)', border: '#9C27B0', color: '#fff' }
    };
    
    // Réinitialiser tous les boutons avec leurs couleurs d'origine
    const allButtons = Object.keys(buttonColors);
    
    allButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const colors = buttonColors[id];
            btn.style.background = colors.bg;
            btn.style.borderColor = colors.border;
            btn.style.borderWidth = '2px';
            btn.style.opacity = '0.6';
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
            btn.style.color = colors.color;
        }
    });
    
    // Activer le bouton sélectionné
    const buttonMap = {
        'generalites': 'btnElecGeneralites',
        'voisinage': 'btnElecVoisinage',
        'zonage': 'btnElecZonage',
        'cable': 'btnElecCable',
        'eolienne': 'btnElecEolienne',
        'ppv': 'btnElecPpv'
    };
    
    const activeBtn = document.getElementById(buttonMap[type]);
    if (activeBtn) {
        activeBtn.style.borderWidth = '4px';
        activeBtn.style.opacity = '1';
        activeBtn.style.transform = 'scale(1.05)';
        activeBtn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    }
    
    // Afficher uniquement la carte sélectionnée
    const selectedCard = document.getElementById('elec-' + type);
    if (selectedCard) {
        selectedCard.style.display = 'block';
        // Si c'est l'éolienne, recalculer pour afficher la valeur
        if (type === 'eolienne') {
            calculateEolienne();
        }
        // Scroller directement vers la carte après un court délai pour laisser le temps au rendu
        setTimeout(() => {
            selectedCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function adjustDiametreTransport(delta) {
    const input = document.getElementById('diametreTransport');
    if (input) {
        let value = parseFloat(input.value) + delta;
        value = Math.max(50, value);
        input.value = value;
        calculateTransport();
    }
}

function calculateElectricLine() {
    const tension = document.getElementById('tensionLine')?.value || 'bt';
    const resultElement = document.getElementById('electricLineResult');
    
    if (!resultElement) return;
    
    let distance = 5;
    let description = '';
    
    switch(tension) {
        case 'bt':
            distance = 5;
            description = 'Basse Tension';
            break;
        case 'hta':
            distance = 5;
            description = 'Haute Tension A';
            break;
        case 'htb':
            distance = 5;
            description = 'Haute Tension B';
            break;
    }
    
    resultElement.innerHTML = `
        <div class="result-item">
            <span>${description}</span>
            <span class="result-value">${distance} m</span>
        </div>
    `;
}


// ========== MODULES COMMANDEMENT ==========

// ===== PATRAC DR =====

function printPatracDR() {
    const printWindow = window.open('', '', 'width=800,height=600');
    const data = {
        infoNom: document.getElementById('patrac-info-nom')?.value || '',
        infoDate: document.getElementById('patrac-info-date')?.value || '',
        infoMission: document.getElementById('patrac-info-mission')?.value || '',
        infoZone: document.getElementById('patrac-info-zone')?.value || '',
        infoDuree: document.getElementById('patrac-info-duree')?.value || '',
        personnel: document.getElementById('patrac-personnel')?.value || '',
        personnelListe: document.getElementById('patrac-personnel-liste')?.value || '',
        armementVehicules: getVehiculesTexte(),
        armementAutre: document.getElementById('patrac-armement-autre')?.value || '',
        tenue: document.getElementById('patrac-tenue')?.value || '',
        radio: document.getElementById('patrac-radio')?.value || '',
        alimentation: document.getElementById('patrac-alimentation')?.value || '',
        cmdChef: document.getElementById('patrac-cmd-chef')?.value || '',
        cmdChefTel: document.getElementById('patrac-cmd-chef-tel')?.value || '',
        cmdAdjoint: document.getElementById('patrac-cmd-adjoint')?.value || '',
        cmdAdjointTel: document.getElementById('patrac-cmd-adjoint-tel')?.value || '',
        cmdCA: getCATexte(),
        deroulement: document.getElementById('patrac-deroulement')?.value || '',
        rdvHeure: document.getElementById('patrac-rdv-heure')?.value || '',
        rdvLieu: document.getElementById('patrac-rdv-lieu')?.value || ''
    };
    
    printWindow.document.write(`
        <html>
        <head>
            <title>PATRAC DR - Ordre Préparatoire</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #c41e3a; border-bottom: 3px solid #c41e3a; padding-bottom: 10px; font-size: 2.2em; }
                h2 { color: #8b0000; margin-top: 20px; }
                .section { margin: 15px 0; padding: 10px; border-left: 4px solid #c41e3a; background: #f5f5f5; }
                .info-detachement { background: linear-gradient(135deg, rgba(196,30,58,0.1) 0%, rgba(196,30,58,0.05) 100%); border: 3px solid #c41e3a; padding: 20px; margin: 20px 0; border-radius: 10px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
                .label { font-weight: bold; color: #c41e3a; }
                .content { white-space: pre-wrap; margin-top: 5px; }
                .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #666; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>📋 PATRAC DR - Ordre Préparatoire</h1>
            <p><em>Généré le ${new Date().toLocaleString('fr-FR')}</em></p>
            
            ${(data.infoNom || data.infoDate || data.infoMission || data.infoZone || data.infoDuree) ? `
            <div class="info-detachement">
                <h2 style="text-align: center; font-size: 1.8em; margin-top: 0;">📋 INFORMATIONS SUR LE DÉTACHEMENT</h2>
                <div class="info-grid">
                    ${data.infoNom ? `<div><div class="label">Nom du détachement:</div><div class="content" style="font-size: 1.2em; font-weight: bold;">${data.infoNom}</div></div>` : ''}
                    ${data.infoDate ? `<div><div class="label">Date de mission:</div><div class="content" style="font-size: 1.2em; font-weight: bold;">${new Date(data.infoDate).toLocaleDateString('fr-FR')}</div></div>` : ''}
                </div>
                ${data.infoMission ? `<div style="margin-top: 15px;"><div class="label">Nature de la mission:</div><div class="content" style="font-size: 1.1em;">${data.infoMission}</div></div>` : ''}
                <div class="info-grid">
                    ${data.infoZone ? `<div><div class="label">Zone d'intervention:</div><div class="content">${data.infoZone}</div></div>` : ''}
                    ${data.infoDuree ? `<div><div class="label">Durée prévisionnelle:</div><div class="content">${data.infoDuree}</div></div>` : ''}
                </div>
            </div>
            ` : ''}
            
            <div class="section">
                <div class="label">P - Personnel du détachement (X/Y/Z):</div>
                <div class="content">${data.personnel || 'Non renseigné'}</div>
                <div class="label" style="margin-top: 10px;">Liste nominative:</div>
                <div class="content">${data.personnelListe || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">A - Armement:</div>
                <div class="content">${(data.armementVehicules || 'Non renseigné').replace(/\n/g, '<br>')}</div>
                ${data.armementAutre ? `<div class="content" style="margin-top: 8px;"><strong>Autres matériels:</strong> ${data.armementAutre}</div>` : ''}
            </div>
            
            <div class="section">
                <div class="label">T - Tenue:</div>
                <div class="content">${data.tenue || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">R - Radio:</div>
                <div class="content">${data.radio || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">A - Alimentation:</div>
                <div class="content">${data.alimentation || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">C - Commandement:</div>
                <div class="content">
                    <strong>Chef de détachement:</strong> ${data.cmdChef || 'Non renseigné'}${data.cmdChefTel ? ` (${data.cmdChefTel})` : ''}<br>
                    <strong>Adjoint:</strong> ${data.cmdAdjoint || 'Non renseigné'}${data.cmdAdjointTel ? ` (${data.cmdAdjointTel})` : ''}<br>
                    <strong>Chefs d'agrès:</strong><br>
                    ${(data.cmdCA || 'Non renseigné').replace(/\n/g, '<br>')}
                </div>
            </div>
            
            <div class="section">
                <div class="label">D - Déroulement prévu:</div>
                <div class="content">${data.deroulement || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">R - Rendez-vous:</div>
                <div class="content">
                    <strong>Heure:</strong> ${data.rdvHeure || 'Non renseigné'}<br>
                    <strong>Lieu:</strong> ${data.rdvLieu || 'Non renseigné'}
                </div>
            </div>
            
            <div class="footer">
                DECIOPS v1.2 - Outil d'aide à la décision opérationnelle<br>
                Par les pompiers, pour les pompiers 🚒
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
                <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">🖨️ Imprimer / Enregistrer PDF</button>
                <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">❌ Fermer</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ===== GESTION DES VÉHICULES AVEC ÉQUIPAGES POUR PATRAC DR =====
let vehiculesPatrac = [];
let caPatrac = [];
let compteurCA = 0;
let vehiculeEnCours = null;

// Configuration des armements par type de véhicule
const configVehicules = {
    'FPT': { 
        armement: 8, 
        postes: ['Conducteur', 'Chef d\'agrès', 'Équipier 1', 'Équipier 2', 'Équipier 3', 'Équipier 4', 'Équipier 5', 'Équipier 6']
    },
    'FPTL': { 
        armement: 6, 
        postes: ['Conducteur', 'Chef d\'agrès', 'Équipier 1', 'Équipier 2', 'Équipier 3', 'Équipier 4']
    },
    'CCFS': { 
        armement: 3, 
        postes: ['Conducteur', 'Chef d\'agrès', 'Équipier 1']
    },
    'CCFM': { 
        armement: 4, 
        postes: ['Conducteur', 'Chef d\'agrès', 'Équipier 1', 'Équipier 2']
    },
    'CCFL': { 
        armement: 4, 
        postes: ['Conducteur', 'Chef d\'agrès', 'Équipier 1', 'Équipier 2']
    },
    'VSAV': { 
        armement: 3, 
        postes: ['Chef d\'agrès', 'Conducteur', 'Équipier']
    },
    'EPA': { 
        armement: 3, 
        postes: ['Conducteur', 'Chef d\'agrès', 'Équipier']
    }
};

function ajouterVehiculeAvecEquipage(type, armement) {
    vehiculeEnCours = {
        type: type,
        numero: '',
        armement: armement,
        equipage: []
    };
    
    ouvrirModalEquipage(type, armement);
}

function ajouterVehiculeAutre() {
    const type = prompt('Type de véhicule :', '');
    if (!type || type.trim() === '') return;
    
    const numero = prompt(`Numéro du ${type} :`, '');
    if (numero === null) return;
    
    const armement = prompt('Armement (nombre de personnes) :', '1');
    const nbPersonnes = parseInt(armement) || 1;
    
    vehiculeEnCours = {
        type: type.trim(),
        numero: numero.trim(),
        armement: nbPersonnes,
        equipage: []
    };
    
    ouvrirModalEquipageLibre(type, nbPersonnes);
}

function ouvrirModalEquipage(type, armement) {
    const modal = document.getElementById('modalEquipage');
    const titre = document.getElementById('modalTitre');
    const fields = document.getElementById('modalEquipageFields');
    
    titre.innerHTML = `🚒 ${type} - Armement ${armement}<br><span style="font-size: 0.7em; color: #FF9800; font-weight: normal;">💡 Le remplissage de l'équipage est optionnel</span>`;
    
    const config = configVehicules[type];
    let html = '';
    
    config.postes.forEach((poste, index) => {
        html += `
            <div style="background: var(--bg-main); padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 2px solid var(--border-medium);">
                <div style="font-weight: bold; color: #00ccff; margin-bottom: 10px; font-size: 1.1em;">${poste}</div>
                <div style="display: grid; grid-template-columns: 120px 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="display: block; font-size: 0.9em; margin-bottom: 5px; color: var(--text-secondary);">Grade</label>
                        <input type="text" id="equipage-${index}-grade" placeholder="Ex: CAP" style="width: 100%; padding: 8px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.9em; margin-bottom: 5px; color: var(--text-secondary);">Nom</label>
                        <input type="text" id="equipage-${index}-nom" placeholder="DUPONT" style="width: 100%; padding: 8px; text-transform: uppercase;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.9em; margin-bottom: 5px; color: var(--text-secondary);">Prénom</label>
                        <input type="text" id="equipage-${index}-prenom" placeholder="Jean" style="width: 100%; padding: 8px;">
                    </div>
                </div>
            </div>
        `;
    });
    
    fields.innerHTML = html;
    modal.style.display = 'block';
}

function ouvrirModalEquipageLibre(type, nbPersonnes) {
    const modal = document.getElementById('modalEquipage');
    const titre = document.getElementById('modalTitre');
    const fields = document.getElementById('modalEquipageFields');
    
    titre.innerHTML = `${type} - ${nbPersonnes} personne(s)<br><span style="font-size: 0.7em; color: #FF9800; font-weight: normal;">💡 Le remplissage de l'équipage est optionnel</span>`;
    document.getElementById('modalNumero').value = vehiculeEnCours.numero;
    
    let html = '';
    
    for (let i = 0; i < nbPersonnes; i++) {
        html += `
            <div style="background: var(--bg-main); padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 2px solid var(--border-medium);">
                <div style="font-weight: bold; color: #00ccff; margin-bottom: 10px; font-size: 1.1em;">Personne ${i + 1}</div>
                <div style="display: grid; grid-template-columns: 120px 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="display: block; font-size: 0.9em; margin-bottom: 5px; color: var(--text-secondary);">Grade</label>
                        <input type="text" id="equipage-${i}-grade" placeholder="Ex: CAP" style="width: 100%; padding: 8px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.9em; margin-bottom: 5px; color: var(--text-secondary);">Nom</label>
                        <input type="text" id="equipage-${i}-nom" placeholder="DUPONT" style="width: 100%; padding: 8px; text-transform: uppercase;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.9em; margin-bottom: 5px; color: var(--text-secondary);">Prénom</label>
                        <input type="text" id="equipage-${i}-prenom" placeholder="Jean" style="width: 100%; padding: 8px;">
                    </div>
                </div>
            </div>
        `;
    }
    
    fields.innerHTML = html;
    modal.style.display = 'block';
}

function fermerModalEquipage() {
    document.getElementById('modalEquipage').style.display = 'none';
    document.getElementById('modalNumero').value = '';
    vehiculeEnCours = null;
}

function validerEquipage() {
    if (!vehiculeEnCours) return;
    
    const numero = document.getElementById('modalNumero').value.trim();
    if (!numero) {
        alert('⚠️ Merci de renseigner le numéro du véhicule');
        return;
    }
    
    vehiculeEnCours.numero = numero;
    vehiculeEnCours.equipage = [];
    
    const config = configVehicules[vehiculeEnCours.type];
    const nbPersonnes = config ? config.postes.length : vehiculeEnCours.armement;
    
    // Accepter tout remplissage, même partiel ou vide
    for (let i = 0; i < nbPersonnes; i++) {
        const grade = document.getElementById(`equipage-${i}-grade`)?.value.trim() || '';
        const nom = document.getElementById(`equipage-${i}-nom`)?.value.trim() || '';
        const prenom = document.getElementById(`equipage-${i}-prenom`)?.value.trim() || '';
        
        // Toujours ajouter la personne, même si tous les champs sont vides
        vehiculeEnCours.equipage.push({
            poste: config ? config.postes[i] : `Personne ${i + 1}`,
            grade: grade,
            nom: nom,
            prenom: prenom
        });
    }
    
    vehiculesPatrac.push(vehiculeEnCours);
    afficherVehiculesEquipages();
    fermerModalEquipage();
}

function afficherVehiculesEquipages() {
    const liste = document.getElementById('listeVehiculesEquipages');
    if (!liste) return;
    
    if (vehiculesPatrac.length === 0) {
        liste.innerHTML = '<div style="color: #888; font-style: italic; padding: 10px;">Aucun véhicule ajouté</div>';
        return;
    }
    
    let html = '';
    vehiculesPatrac.forEach((v, index) => {
        // Filtrer les membres d'équipage renseignés (au moins un champ rempli)
        const equipageRenseigne = v.equipage.filter(p => p.grade || p.nom || p.prenom);
        
        html += `
            <div style="background: var(--bg-card); padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 3px solid var(--primary-red);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <span style="font-size: 1.5em; font-weight: bold; color: #00ccff;">${v.type} ${v.numero}</span>
                        <span style="color: #FF9800; margin-left: 15px; font-size: 1.1em;">Armement ${v.armement}</span>
                    </div>
                    <button onclick="retirerVehiculeEquipage(${index})" style="background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%); border: none; padding: 10px 20px; border-radius: 8px; color: white; cursor: pointer; font-weight: bold; font-size: 1em;">
                        ✕ Retirer
                    </button>
                </div>
                
                ${equipageRenseigne.length > 0 ? `
                    <div style="background: var(--bg-main); padding: 15px; border-radius: 8px;">
                        <div style="font-weight: bold; color: #FF9800; margin-bottom: 10px;">👥 Équipage :</div>
                        ${equipageRenseigne.map(p => `
                            <div style="padding: 8px; margin-bottom: 5px; border-left: 3px solid #00ccff; padding-left: 12px;">
                                <span style="color: #00ccff; font-weight: bold; min-width: 150px; display: inline-block;">${p.poste}:</span>
                                <span style="color: #212121; font-weight: 600;">${p.grade} ${p.nom} ${p.prenom}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div style="color: #888; font-style: italic;">Équipage non renseigné</div>'}
            </div>
        `;
    });
    
    liste.innerHTML = html;
}

function retirerVehiculeEquipage(index) {
    if (confirm('⚠️ Retirer ce véhicule et son équipage ?')) {
        vehiculesPatrac.splice(index, 1);
        afficherVehiculesEquipages();
    }
}

function getVehiculesTexte() {
    if (vehiculesPatrac.length === 0) return '';
    
    let texte = '';
    vehiculesPatrac.forEach(v => {
        texte += `\n${v.type} ${v.numero} (Armement ${v.armement})\n`;
        
        // Filtrer les membres d'équipage renseignés
        const equipageRenseigne = v.equipage.filter(p => p.grade || p.nom || p.prenom);
        
        if (equipageRenseigne.length > 0) {
            equipageRenseigne.forEach(p => {
                texte += `  - ${p.poste}: ${p.grade} ${p.nom} ${p.prenom}\n`;
            });
        } else {
            texte += `  (Équipage non renseigné)\n`;
        }
    });
    return texte;
}

// ===== GESTION DES CA =====
function ajouterCA() {
    compteurCA++;
    const id = `ca-${compteurCA}`;
    caPatrac.push(id);
    afficherCA();
}

function afficherCA() {
    const liste = document.getElementById('listeCA');
    if (!liste) return;
    
    if (caPatrac.length === 0) {
        liste.innerHTML = '<div style="color: #888; font-style: italic; padding: 10px;">Aucun chef d\'agrès ajouté</div>';
        return;
    }
    
    let html = '';
    caPatrac.forEach((id, index) => {
        html += `
            <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 2px solid var(--border-medium);">
                <div style="display: grid; grid-template-columns: 120px 1fr 150px; gap: 10px; align-items: end; margin-bottom: 10px;">
                    <div>
                        <label style="display: block; font-size: 0.9em; margin-bottom: 5px; color: var(--text-secondary);">Véhicule</label>
                        <input type="text" id="${id}-vehicule" placeholder="FPT 347" style="width: 100%; padding: 8px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.9em; margin-bottom: 5px; color: var(--text-secondary);">Nom du CA</label>
                        <input type="text" id="${id}-nom" placeholder="Ex: CAP Dupont" style="width: 100%; padding: 8px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.9em; margin-bottom: 5px; color: var(--text-secondary);">Téléphone</label>
                        <input type="tel" id="${id}-tel" placeholder="06 XX XX XX XX" style="width: 100%; padding: 8px;">
                    </div>
                </div>
                <button onclick="retirerCA(${index})" style="background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%); border: none; padding: 6px 12px; border-radius: 6px; color: white; cursor: pointer; font-size: 0.9em;">
                    ✕ Retirer ce CA
                </button>
            </div>
        `;
    });
    
    liste.innerHTML = html;
}

function retirerCA(index) {
    caPatrac.splice(index, 1);
    afficherCA();
}

function getCATexte() {
    if (caPatrac.length === 0) return '';
    let texte = '';
    caPatrac.forEach(id => {
        const vehicule = document.getElementById(`${id}-vehicule`)?.value || '';
        const nom = document.getElementById(`${id}-nom`)?.value || '';
        const tel = document.getElementById(`${id}-tel`)?.value || '';
        if (vehicule || nom) {
            texte += `${vehicule}: ${nom}`;
            if (tel) texte += ` (${tel})`;
            texte += '\n';
        }
    });
    return texte;
}

function clearPatracDR() {
    if (confirm('⚠️ Effacer tous les champs PATRAC DR ?')) {
        document.getElementById('patrac-personnel').value = '';
        document.getElementById('patrac-personnel-liste').value = '';
        document.getElementById('patrac-armement-autre').value = '';
        document.getElementById('patrac-tenue').value = '';
        document.getElementById('patrac-radio').value = '';
        document.getElementById('patrac-alimentation').value = '';
        document.getElementById('patrac-cmd-chef').value = '';
        document.getElementById('patrac-cmd-chef-tel').value = '';
        document.getElementById('patrac-cmd-adjoint').value = '';
        document.getElementById('patrac-cmd-adjoint-tel').value = '';
        document.getElementById('patrac-deroulement').value = '';
        document.getElementById('patrac-rdv-heure').value = '';
        document.getElementById('patrac-rdv-lieu').value = '';
        
        // Réinitialiser les listes
        vehiculesPatrac = [];
        caPatrac = [];
        compteurCA = 0;
        afficherVehiculesEquipages();
        afficherCA();
    }
}

// ===== DPIF =====

function printDPIF() {
    const printWindow = window.open('', '', 'width=800,height=600');
    const data = {
        direction: document.getElementById('dpif-direction')?.value || '',
        point: document.getElementById('dpif-point')?.value || '',
        gps: document.getElementById('dpif-gps')?.value || '',
        itineraire: document.getElementById('dpif-itineraire')?.value || '',
        ordre: document.getElementById('dpif-ordre')?.value || '',
        intervalles: document.getElementById('dpif-intervalles')?.value || '',
        vitesse: document.getElementById('dpif-vitesse')?.value || '',
        signalisation: document.getElementById('dpif-signalisation')?.value || '',
        communications: document.getElementById('dpif-communications')?.value || ''
    };
    
    printWindow.document.write(`
        <html>
        <head>
            <title>DPIF - Ordre de Mouvement</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #c41e3a; border-bottom: 3px solid #c41e3a; padding-bottom: 10px; }
                .section { margin: 15px 0; padding: 10px; border-left: 4px solid #c41e3a; background: #f5f5f5; }
                .label { font-weight: bold; color: #c41e3a; }
                .content { white-space: pre-wrap; margin-top: 5px; }
                .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #666; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>🗺️ DPIF - Ordre de Mouvement</h1>
            <p><em>Généré le ${new Date().toLocaleString('fr-FR')}</em></p>
            
            <div class="section">
                <div class="label">D - Direction générale à suivre:</div>
                <div class="content">${data.direction || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">P - Point à atteindre:</div>
                <div class="content">
                    ${data.point || 'Non renseigné'}
                    ${data.gps ? '<br><strong>GPS:</strong> ' + data.gps : ''}
                </div>
            </div>
            
            <div class="section">
                <div class="label">I - Itinéraire à suivre:</div>
                <div class="content">${data.itineraire || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">F - Formation du groupe:</div>
                <div class="content">
                    <strong>Ordre de marche:</strong><br>${data.ordre || 'Non renseigné'}<br><br>
                    <strong>Intervalles:</strong> ${data.intervalles || 'Non renseigné'}<br>
                    <strong>Vitesse:</strong> ${data.vitesse || 'Non renseigné'}<br>
                    <strong>Signalisation:</strong> ${data.signalisation || 'Non renseigné'}<br>
                    <strong>Communications:</strong> ${data.communications || 'Non renseigné'}
                </div>
            </div>
            
            <div class="footer">
                DECIOPS v1.0 - Outil d'aide à la décision opérationnelle<br>
                Par les pompiers, pour les pompiers 🚒
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
                <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">🖨️ Imprimer / Enregistrer PDF</button>
                <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">❌ Fermer</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function clearDPIF() {
    if (confirm('⚠️ Effacer tous les champs DPIF ?')) {
        document.getElementById('dpif-direction').value = '';
        document.getElementById('dpif-point').value = '';
        document.getElementById('dpif-gps').value = '';
        document.getElementById('dpif-itineraire').value = '';
        document.getElementById('dpif-ordre').value = '';
        document.getElementById('dpif-intervalles').value = '';
        document.getElementById('dpif-vitesse').value = '';
        document.getElementById('dpif-signalisation').value = '';
        document.getElementById('dpif-communications').value = '';
    }
}

// ===== SMES =====

function printSMES() {
    const printWindow = window.open('', '', 'width=800,height=600');
    const data = {
        situation: document.getElementById('smes-situation')?.value || '',
        mission: document.getElementById('smes-mission')?.value || '',
        execution: document.getElementById('smes-execution')?.value || '',
        securite: document.getElementById('smes-securite')?.value || ''
    };
    
    printWindow.document.write(`
        <html>
        <head>
            <title>SMES - Chef d'agrès/Équipe</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #c41e3a; border-bottom: 3px solid #c41e3a; padding-bottom: 10px; }
                .section { margin: 15px 0; padding: 10px; border-left: 4px solid #c41e3a; background: #f5f5f5; }
                .label { font-weight: bold; color: #c41e3a; }
                .content { white-space: pre-wrap; margin-top: 5px; }
                .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #666; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>🔴 SMES - Chef d'agrès / Équipe</h1>
            <p><em>Généré le ${new Date().toLocaleString('fr-FR')}</em></p>
            
            <div class="section">
                <div class="label">S - Situation:</div>
                <div class="content">${data.situation || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">M - Mission:</div>
                <div class="content">${data.mission || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">E - Exécution:</div>
                <div class="content">${data.execution || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">S - Sécurité:</div>
                <div class="content">${data.securite || 'Non renseigné'}</div>
            </div>
            
            <div class="footer">
                DECIOPS v1.0 - Outil d'aide à la décision opérationnelle<br>
                Par les pompiers, pour les pompiers 🚒
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
                <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">🖨️ Imprimer / Enregistrer PDF</button>
                <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">❌ Fermer</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function clearSMES() {
    if (confirm('⚠️ Effacer tous les champs SMES ?')) {
        document.getElementById('smes-situation').value = '';
        document.getElementById('smes-mission').value = '';
        document.getElementById('smes-execution').value = '';
        document.getElementById('smes-securite').value = '';
    }
}

// ===== SOIEC =====

function printSOIEC() {
    const printWindow = window.open('', '', 'width=800,height=600');
    const data = {
        situation: document.getElementById('soiec-situation')?.value || '',
        objectif: document.getElementById('soiec-objectif')?.value || '',
        idee: document.getElementById('soiec-idee')?.value || '',
        execution: document.getElementById('soiec-execution')?.value || '',
        commandement: document.getElementById('soiec-commandement')?.value || ''
    };
    
    printWindow.document.write(`
        <html>
        <head>
            <title>SOIEC - Chef de Groupe</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #c41e3a; border-bottom: 3px solid #c41e3a; padding-bottom: 10px; }
                .section { margin: 15px 0; padding: 10px; border-left: 4px solid #c41e3a; background: #f5f5f5; }
                .label { font-weight: bold; color: #c41e3a; }
                .content { white-space: pre-wrap; margin-top: 5px; }
                .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #666; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>🟠 SOIEC - Chef de Groupe</h1>
            <p><em>Généré le ${new Date().toLocaleString('fr-FR')}</em></p>
            
            <div class="section">
                <div class="label">S - Situation:</div>
                <div class="content">${data.situation || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">O - Objectif:</div>
                <div class="content">${data.objectif || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">I - Idée de manœuvre:</div>
                <div class="content">${data.idee || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">E - Exécution:</div>
                <div class="content">${data.execution || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">C - Commandement:</div>
                <div class="content">${data.commandement || 'Non renseigné'}</div>
            </div>
            
            <div class="footer">
                DECIOPS v1.0 - Outil d'aide à la décision opérationnelle<br>
                Par les pompiers, pour les pompiers 🚒
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
                <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">🖨️ Imprimer / Enregistrer PDF</button>
                <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">❌ Fermer</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function clearSOIEC() {
    if (confirm('⚠️ Effacer tous les champs SOIEC ?')) {
        document.getElementById('soiec-situation').value = '';
        document.getElementById('soiec-objectif').value = '';
        document.getElementById('soiec-idee').value = '';
        document.getElementById('soiec-execution').value = '';
        document.getElementById('soiec-commandement').value = '';
    }
}

// ===== SAOIECL =====

function printSAOIECL() {
    const printWindow = window.open('', '', 'width=800,height=600');
    const data = {
        situation: document.getElementById('saoiecl-situation')?.value || '',
        anticipation: document.getElementById('saoiecl-anticipation')?.value || '',
        objectif: document.getElementById('saoiecl-objectif')?.value || '',
        idee: document.getElementById('saoiecl-idee')?.value || '',
        execution: document.getElementById('saoiecl-execution')?.value || '',
        logistique: document.getElementById('saoiecl-logistique')?.value || '',
        commandement: document.getElementById('saoiecl-commandement')?.value || ''
    };
    
    printWindow.document.write(`
        <html>
        <head>
            <title>SAOIECL - Chef de Colonne/Site</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #c41e3a; border-bottom: 3px solid #c41e3a; padding-bottom: 10px; }
                .section { margin: 15px 0; padding: 10px; border-left: 4px solid #c41e3a; background: #f5f5f5; }
                .label { font-weight: bold; color: #c41e3a; }
                .content { white-space: pre-wrap; margin-top: 5px; }
                .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #666; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>👨‍🚒 SAOIECL - Chef de Colonne / Site</h1>
            <p><em>Généré le ${new Date().toLocaleString('fr-FR')}</em></p>
            
            <div class="section">
                <div class="label">S - Situation:</div>
                <div class="content">${data.situation || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">A - Anticipation:</div>
                <div class="content">${data.anticipation || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">O - Objectif:</div>
                <div class="content">${data.objectif || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">I - Idée de manœuvre:</div>
                <div class="content">${data.idee || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">E - Exécution:</div>
                <div class="content">${data.execution || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">L - Logistique:</div>
                <div class="content">${data.logistique || 'Non renseigné'}</div>
            </div>
            
            <div class="section">
                <div class="label">C - Commandement:</div>
                <div class="content">${data.commandement || 'Non renseigné'}</div>
            </div>
            
            <div class="footer">
                DECIOPS v1.0 - Outil d'aide à la décision opérationnelle<br>
                Par les pompiers, pour les pompiers 🚒
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
                <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">🖨️ Imprimer / Enregistrer PDF</button>
                <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">❌ Fermer</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function clearSAOIECL() {
    if (confirm('⚠️ Effacer tous les champs SAOIECL ?')) {
        document.getElementById('saoiecl-situation').value = '';
        document.getElementById('saoiecl-anticipation').value = '';
        document.getElementById('saoiecl-objectif').value = '';
        document.getElementById('saoiecl-idee').value = '';
        document.getElementById('saoiecl-execution').value = '';
        document.getElementById('saoiecl-logistique').value = '';
        document.getElementById('saoiecl-commandement').value = '';
    }
}

// ========== MODULE DENSITÉ ==========
// ========== INITIALISATION ==========
window.addEventListener('DOMContentLoaded', function() {
    // Initialiser les modules
    if (document.getElementById('convert-type')) {
        updateConverterUnits();
    }
    
    // ========== AUTO-SÉLECTION DU CONTENU DES CHAMPS ==========
    // Sélectionner automatiquement le contenu quand on clique sur un champ
    document.addEventListener('focusin', function(e) {
        const target = e.target;
        
        // Vérifier si c'est un champ de saisie (input ou textarea)
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            // Exclure les checkboxes, radios et autres types non textuels
            const excludedTypes = ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image'];
            
            if (target.tagName === 'INPUT' && excludedTypes.includes(target.type)) {
                return; // Ne rien faire pour ces types
            }
            
            // Sélectionner tout le contenu après un court délai pour assurer la compatibilité
            setTimeout(function() {
                try {
                    target.select();
                } catch (e) {
                    // En cas d'erreur, essayer une autre méthode
                    target.setSelectionRange(0, target.value.length);
                }
            }, 10);
        }
    });
});
// Modules manquants à ajouter

// ========== MODULE SECOURS ROUTIER ==========
function calculateSecours() {
    // Fonction pour secours routier
    alert('Module Secours Routier - En développement');
}

// ========== MODULE ÉPUISEMENT ==========
// ========== MODULE LIGNES ÉLECTRIQUES ==========
function calculateElectrique() {
    const tension = parseFloat(document.getElementById('elec-tension')?.value || 0);
    
    let distance = 0;
    let risque = '';
    
    if (tension < 1000) {
        distance = 3;
        risque = 'Basse tension';
    } else if (tension < 50000) {
        distance = 5;
        risque = 'Moyenne tension';
    } else if (tension < 225000) {
        distance = 10;
        risque = 'Haute tension';
    } else {
        distance = 20;
        risque = 'Très haute tension';
    }
    
    const result = document.getElementById('elec-result');
    if (result) {
        result.innerHTML = `
            <div class="result-box">
                <h3>${risque}</h3>
                <div class="info-card">
                    <div class="label">Distance de sécurité minimum</div>
                    <div class="value">${distance} m</div>
                </div>
                <div class="danger-box" style="margin-top: 20px;">
                    <strong>⚠️ DANGER :</strong> Ne jamais toucher une ligne électrique même tombée au sol
                </div>
            </div>
        `;
    }
}

// ========== MODULE EXPLOSIMÉTRIE ==========
function calculateExplosimetrie() {
    const lii = parseFloat(document.getElementById('explo-lii')?.value || 0);
    const mesure = parseFloat(document.getElementById('explo-mesure')?.value || 0);
    
    const pourcentLII = (mesure / lii) * 100;
    
    let zone = '';
    let color = '';
    
    if (pourcentLII < 10) {
        zone = '✅ ZONE SÛRE';
        color = '#4CAF50';
    } else if (pourcentLII < 25) {
        zone = '⚠️ SURVEILLANCE';
        color = '#FF9800';
    } else if (pourcentLII < 100) {
        zone = '🚨 ZONE DANGEREUSE';
        color = '#FF9800';
    } else {
        zone = '❌ ATMOSPHÈRE EXPLOSIVE';
        color = '#ff0000';
    }
    
    const result = document.getElementById('explo-result');
    if (result) {
        result.innerHTML = `
            <div class="result-box">
                <h3>Analyse explosimétrique :</h3>
                <div class="result-item">
                    <span>% LII :</span>
                    <span class="result-value">${pourcentLII.toFixed(1)} %</span>
                </div>
                <div class="alert-box" style="background: ${color}33; border-left-color: ${color};">
                    <strong style="color: ${color};">${zone}</strong>
                </div>
            </div>
        `;
    }
}

// ========== MODULE EXTINCTEURS ==========
function calculateExtincteurs() {
    const surface = parseFloat(document.getElementById('ext-surface')?.value || 0);
    const categorie = document.getElementById('ext-categorie')?.value || 'a';
    
    let nbExtincteurs = 0;
    let capacite = '';
    
    if (categorie === 'a') {
        nbExtincteurs = Math.ceil(surface / 200); // 1 extincteur / 200m²
        capacite = '6L ou 9kg';
    } else if (categorie === 'b') {
        nbExtincteurs = Math.ceil(surface / 150);
        capacite = '9kg CO2 ou poudre';
    } else {
        nbExtincteurs = Math.ceil(surface / 100);
        capacite = 'Spécifique risque';
    }
    
    const result = document.getElementById('ext-result');
    if (result) {
        result.innerHTML = `
            <div class="result-box">
                <h3>Besoins en extincteurs :</h3>
                <div class="result-item">
                    <span>Nombre minimum :</span>
                    <span class="result-value">${nbExtincteurs}</span>
                </div>
                <div class="result-item">
                    <span>Capacité recommandée :</span>
                    <span class="result-value">${capacite}</span>
                </div>
            </div>
        `;
    }
}

// ========== MODULE BOUTEILLES GAZ ==========
function calculateBouteilles() {
    const volume = parseFloat(document.getElementById('bout-volume')?.value || 0);
    const pression = parseFloat(document.getElementById('bout-pression')?.value || 0);
    
    const volumeReel = volume * pression; // Loi des gaz parfaits simplifiée
    
    const result = document.getElementById('bout-result');
    if (result) {
        result.innerHTML = `
            <div class="result-box">
                <h3>Volume de gaz disponible :</h3>
                <div class="info-card">
                    <div class="label">Volume à pression atmosphérique</div>
                    <div class="value">${volumeReel.toFixed(0)} L</div>
                </div>
            </div>
        `;
    }
}

// ========== MODULE ABAQUE CHARGES ==========
// ========== MODULE ABAQUE - CALCUL AUTOMATIQUE DE TOUS LES POIDS ==========
function calculateAbaqueAll() {
    const longueur = parseFloat(document.getElementById('abaque-longueur')?.value || 0);
    const largeur = parseFloat(document.getElementById('abaque-largeur')?.value || 0);
    const hauteur = parseFloat(document.getElementById('abaque-hauteur')?.value || 0);
    
    // Calcul du volume
    const volume = longueur * largeur * hauteur;
    const volumeLitres = volume * 1000;
    
    // Affichage du volume
    const volumeDisplay = document.getElementById('abaque-volume-display');
    const volumeLitresDisplay = document.getElementById('abaque-volume-litres');
    
    if (volumeDisplay) {
        volumeDisplay.textContent = volume.toFixed(3) + ' m³';
    }
    if (volumeLitresDisplay) {
        volumeLitresDisplay.textContent = volumeLitres.toFixed(0) + ' litres';
    }
    
    // Calculer le poids pour chaque matériau et grouper par catégorie
    const categories = [...new Set(densityData.map(item => item.categorie))];
    
    let html = '';
    
    categories.forEach(cat => {
        const items = densityData.filter(item => item.categorie === cat);
        
        html += `
            <div style="background: var(--bg-card); padding: 15px; border-radius: 12px; border: 2px solid var(--border-medium); margin-bottom: 15px;">
                <h3 style="color: var(--primary-red); margin-bottom: 12px; border-bottom: 2px solid var(--primary-red); padding-bottom: 8px; font-size: 1.2em; font-weight: bold;">
                    ${getCategoryIcon(cat)} ${cat}
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
        `;
        
        items.forEach(item => {
            const poids = volume * item.densite;
            const tonnes = poids / 1000;
            const color = getWeightColor(poids);
            
            html += `
                <div style="background: var(--bg-main); padding: 12px; border-radius: 8px; border-left: 4px solid ${color};">
                    <div style="font-size: 1.05em; font-weight: bold; margin-bottom: 6px; color: var(--text-light); line-height: 1.3;">
                        ${item.nom}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary); font-size: 0.9em;">Densité :</span>
                        <span style="color: #FF9800; font-weight: bold; font-size: 0.9em;">${item.densite.toFixed(0)} kg/m³</span>
                    </div>
                    <div style="background: #FFFFFF; padding: 12px; border-radius: 8px; text-align: center; margin-top: 8px; border: 2px solid ${color};">
                        <div style="font-size: 2.2em; font-weight: bold; color: #000000;">
                            ${poids >= 1000 ? tonnes.toFixed(2) : poids.toFixed(0)}
                        </div>
                        <div style="font-size: 1.1em; color: #000000; font-weight: 600; margin-top: 3px;">
                            ${poids >= 1000 ? 'tonnes' : 'kg'}
                        </div>
                        ${poids < 1000 && poids >= 1 ? `<div style="font-size: 0.85em; color: #666; margin-top: 3px;">(${tonnes.toFixed(3)} t)</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    const resultsDiv = document.getElementById('abaque-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = html;
    }
}

// Fonction pour obtenir une couleur en fonction du poids
function getWeightColor(poids) {
    if (poids < 100) return '#4CAF50';      // Léger - Vert
    if (poids < 500) return '#88ff00';      // Moyen-léger - Vert-jaune
    if (poids < 1000) return '#FF9800';     // Moyen - Jaune
    if (poids < 5000) return '#ff9900';     // Lourd - Orange
    if (poids < 10000) return '#ff6600';    // Très lourd - Orange foncé
    return '#ff0000';                        // Extrêmement lourd - Rouge
}

// Fonction pour obtenir une icône par catégorie
function getCategoryIcon(categorie) {
    const icons = {
        'Référence': '📏',
        'Hydrocarbure': '⛽',
        'Alcool': '🧪',
        'Huile': '🛢️',
        'Acide': '⚗️',
        'Construction': '🏗️',
        'Granulat': '🪨',
        'Bois': '🌲',
        'Métal': '🔩',
        'Plastique': '♻️',
        'Isolant': '🧱',
        'Autre': '📦'
    };
    return icons[categorie] || '📦';
}

// Fonction obsolète - remplacée par calculateAbaqueAll
function updateAbaqueForm() {
    calculateAbaqueAll();
}

function calculateAbaque() {
    calculateAbaqueAll();
}

function updateDensiteFromMateriau() {
    // Fonction obsolète - plus nécessaire
}

// ========== MODULE CALCUL DISTANCES SIMPLIFIÉ ==========
function switchDistanceTab(tabName) {
    // Cacher tous les onglets
    const allTabs = document.querySelectorAll('#distance-calc .tab-content');
    allTabs.forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Désactiver tous les boutons
    const allBtns = document.querySelectorAll('#distance-calc .tab-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Afficher l'onglet sélectionné
    const selectedTab = document.getElementById(`dist-tab-${tabName}`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Activer le bouton correspondant
    event.target.classList.add('active');
    
    // Lancer le calcul approprié
    if (tabName === 'distance') calculateDistanceCalc();
    else if (tabName === 'perimetre') calculatePerimetreCalc();
    else if (tabName === 'surface') calculateSurfaceCalc();
}

function calculateDistanceCalc() {
    const horizontal = parseFloat(document.getElementById('dist-horizontal')?.value || 0);
    const vertical = parseFloat(document.getElementById('dist-vertical')?.value || 0);
    
    // Distance en ligne droite (Pythagore)
    const distance = Math.sqrt(horizontal * horizontal + vertical * vertical);
    
    const result = document.getElementById('dist-result');
    if (result) {
        let detailVertical = '';
        if (vertical > 0) {
            detailVertical = `
                <div class="result-item">
                    <span>Composante verticale :</span>
                    <span class="result-value">${vertical.toFixed(1)} m</span>
                </div>
            `;
        }
        
        result.innerHTML = `
            <div class="result-box">
                <h3 style="color: #c41e3a; margin-bottom: 15px;">Résultat du calcul :</h3>
                <div class="info-card" style="margin-bottom: 15px;">
                    <div class="label">Distance en ligne droite</div>
                    <div class="value" style="font-size: 2.2em; color: #FF9800;">${distance.toFixed(1)} m</div>
                </div>
                <div class="result-item">
                    <span>Composante horizontale :</span>
                    <span class="result-value">${horizontal.toFixed(1)} m</span>
                </div>
                ${detailVertical}
            </div>
        `;
    }
}

function calculatePerimetreCalc() {
    const rayon = parseFloat(document.getElementById('perim-rayon')?.value || 0);
    
    const perimetre = 2 * Math.PI * rayon;
    const surface = Math.PI * rayon * rayon;
    
    const result = document.getElementById('perim-result');
    if (result) {
        result.innerHTML = `
            <div class="result-box">
                <h3 style="color: #c41e3a; margin-bottom: 15px;">Périmètre de sécurité :</h3>
                <div class="info-card" style="margin-bottom: 15px;">
                    <div class="label">Périmètre à baliser</div>
                    <div class="value" style="font-size: 2.2em; color: #FF9800;">${perimetre.toFixed(1)} m</div>
                </div>
                <div class="result-item">
                    <span>Rayon :</span>
                    <span class="result-value">${rayon.toFixed(0)} m</span>
                </div>
                <div class="result-item">
                    <span>Surface couverte :</span>
                    <span class="result-value">${surface.toFixed(0)} m²</span>
                </div>
                <div class="alert-box" style="margin-top: 15px;">
                    💡 <strong>Info :</strong> Pour un cercle de ${rayon}m de rayon, prévoir environ ${Math.ceil(perimetre)}m de rubalise
                </div>
            </div>
        `;
    }
}

function updateSurfaceFormCalc() {
    const type = document.getElementById('surface-type')?.value;
    const form = document.getElementById('surface-form');
    
    if (!form) return;
    
    if (type === 'rectangle') {
        form.innerHTML = `
            <div class="form-group">
                <label>Longueur (m) :</label>
                <input type="number" id="surf-longueur" value="20" step="0.5" oninput="calculateSurfaceCalc()">
            </div>
            <div class="form-group">
                <label>Largeur (m) :</label>
                <input type="number" id="surf-largeur" value="15" step="0.5" oninput="calculateSurfaceCalc()">
            </div>
        `;
    } else {
        form.innerHTML = `
            <div class="form-group">
                <label>Rayon (m) :</label>
                <input type="number" id="surf-rayon" value="25" step="0.5" oninput="calculateSurfaceCalc()">
            </div>
        `;
    }
    
    calculateSurfaceCalc();
}

function calculateSurfaceCalc() {
    const type = document.getElementById('surface-type')?.value;
    let surface = 0;
    let perimetre = 0;
    let details = '';
    
    if (type === 'rectangle') {
        const longueur = parseFloat(document.getElementById('surf-longueur')?.value || 0);
        const largeur = parseFloat(document.getElementById('surf-largeur')?.value || 0);
        surface = longueur * largeur;
        perimetre = 2 * (longueur + largeur);
        details = `
            <div class="result-item">
                <span>Longueur :</span>
                <span class="result-value">${longueur.toFixed(1)} m</span>
            </div>
            <div class="result-item">
                <span>Largeur :</span>
                <span class="result-value">${largeur.toFixed(1)} m</span>
            </div>
        `;
    } else {
        const rayon = parseFloat(document.getElementById('surf-rayon')?.value || 0);
        surface = Math.PI * rayon * rayon;
        perimetre = 2 * Math.PI * rayon;
        details = `
            <div class="result-item">
                <span>Rayon :</span>
                <span class="result-value">${rayon.toFixed(1)} m</span>
            </div>
            <div class="result-item">
                <span>Diamètre :</span>
                <span class="result-value">${(rayon * 2).toFixed(1)} m</span>
            </div>
        `;
    }
    
    const result = document.getElementById('surface-result');
    if (result) {
        result.innerHTML = `
            <div class="result-box">
                <h3 style="color: #c41e3a; margin-bottom: 15px;">Zone à couvrir :</h3>
                <div class="info-card" style="margin-bottom: 15px;">
                    <div class="label">Surface totale</div>
                    <div class="value" style="font-size: 2.2em; color: #FF9800;">${surface.toFixed(1)} m²</div>
                </div>
                ${details}
                <div class="result-item">
                    <span>Périmètre :</span>
                    <span class="result-value">${perimetre.toFixed(1)} m</span>
                </div>
            </div>
        `;
    }
}

// ========== MODULE ABAQUE CHARGES ==========

// ========== FONCTIONS MANQUANTES POUR DECIOPS ==========

// ========== MODULE FEU - Ajout de feu ==========
function addFire(type) {
    fireSelection[type] = (fireSelection[type] || 0) + 1;
    updateFireCounter(type);
    calculateFirePower();
}

function updateFireCounter(type) {
    const counter = document.getElementById(`count-${type}`);
    if (counter) {
        counter.textContent = fireSelection[type];
        counter.style.display = fireSelection[type] > 0 ? 'block' : 'none';
    }
}

// ========== MODULE ÉMULSEUR - Modes et calculs ==========
function setEmulseurMode(mode) {
    const directDiv = document.getElementById('emulseurDirect');
    const inverseDiv = document.getElementById('emulseurInverse');
    const btnDirect = document.getElementById('btnModeDirect');
    const btnInverse = document.getElementById('btnModeInverse');
    
    if (mode === 'direct') {
        directDiv.style.display = 'block';
        inverseDiv.style.display = 'none';
        btnDirect.style.background = 'linear-gradient(135deg, var(--primary-red) 0%, var(--primary-red-dark) 100%)';
        btnInverse.style.background = '#666';
        
        // Initialiser les boutons de taux d'application
        const tauxValue = parseFloat(document.getElementById('liquidType')?.value || 10);
        setTauxApplication(tauxValue);
        
        // Initialiser les boutons de concentration
        const concValue = parseInt(document.getElementById('concentration')?.value || 3);
        setConcentration(concValue);
    } else {
        directDiv.style.display = 'none';
        inverseDiv.style.display = 'block';
        btnDirect.style.background = '#666';
        btnInverse.style.background = 'linear-gradient(135deg, var(--primary-red) 0%, var(--primary-red-dark) 100%)';
        
        // Initialiser les boutons de taux d'application
        const tauxValue = parseFloat(document.getElementById('liquidTypeInv')?.value || 10);
        setTauxApplicationInv(tauxValue);
        
        // Initialiser les boutons de concentration
        const concValue = parseInt(document.getElementById('concentrationInv')?.value || 3);
        setConcentrationInv(concValue);
    }
}

// ========== FONCTIONS TAUX D'APPLICATION SIMPLIFIÉES ==========
function setTauxApplication(value) {
    const tauxInput = document.getElementById('liquidType');
    if (tauxInput) {
        tauxInput.value = value;
    }
    
    // Mettre à jour le champ personnalisé si visible
    const customInput = document.getElementById('customRate');
    if (customInput) {
        customInput.value = value;
    }
    
    // Définir les couleurs originales de chaque bouton
    const btnColors = {
        'btnTaux10': { bg: '#4CAF50', border: '#4CAF50' },
        'btnTaux20': { bg: '#2E7D32', border: '#2E7D32' },
        'btnTauxCustom': { bg: '#2196F3', border: '#2196F3' }
    };
    
    // Mettre à jour l'apparence des boutons
    const standardValues = [10, 20];
    ['btnTaux10', 'btnTaux20'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const btnValue = parseInt(btnId.replace('btnTaux', ''));
            const colors = btnColors[btnId];
            if (btnValue === value) {
                btn.style.background = colors.bg;
                btn.style.border = '5px solid #FFD700';
                btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.background = colors.bg;
                btn.style.border = '2px solid ' + colors.border;
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        }
    });
    
    // Gérer le bouton "Autre"
    const btnCustom = document.getElementById('btnTauxCustom');
    if (btnCustom) {
        const colors = btnColors['btnTauxCustom'];
        if (!standardValues.includes(value)) {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '5px solid #FFD700';
            btnCustom.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            btnCustom.style.transform = 'scale(1.05)';
        } else {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '2px solid ' + colors.border;
            btnCustom.style.boxShadow = 'none';
            btnCustom.style.transform = 'scale(1)';
        }
    }
    
    updateEmulseur();
}

function toggleCustomTaux() {
    const customDiv = document.getElementById('customRateDiv');
    const customInput = document.getElementById('customRate');
    
    if (customDiv.style.display === 'none') {
        customDiv.style.display = 'block';
        if (customInput) {
            customInput.focus();
            customInput.select();
        }
    } else {
        customDiv.style.display = 'none';
    }
}

function setTauxApplicationInv(value) {
    const tauxInput = document.getElementById('liquidTypeInv');
    if (tauxInput) {
        tauxInput.value = value;
    }
    
    // Mettre à jour le champ personnalisé si visible
    const customInput = document.getElementById('customRateInv');
    if (customInput) {
        customInput.value = value;
    }
    
    // Définir les couleurs originales de chaque bouton
    const btnColors = {
        'btnTauxInv10': { bg: '#4CAF50', border: '#4CAF50' },
        'btnTauxInv20': { bg: '#2E7D32', border: '#2E7D32' },
        'btnTauxInvCustom': { bg: '#2196F3', border: '#2196F3' }
    };
    
    // Mettre à jour l'apparence des boutons
    const standardValues = [10, 20];
    ['btnTauxInv10', 'btnTauxInv20'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const btnValue = parseInt(btnId.replace('btnTauxInv', ''));
            const colors = btnColors[btnId];
            if (btnValue === value) {
                btn.style.background = colors.bg;
                btn.style.border = '5px solid #FFD700';
                btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.background = colors.bg;
                btn.style.border = '2px solid ' + colors.border;
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        }
    });
    
    // Gérer le bouton "Autre"
    const btnCustom = document.getElementById('btnTauxInvCustom');
    if (btnCustom) {
        const colors = btnColors['btnTauxInvCustom'];
        if (!standardValues.includes(value)) {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '5px solid #FFD700';
            btnCustom.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            btnCustom.style.transform = 'scale(1.05)';
        } else {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '2px solid ' + colors.border;
            btnCustom.style.boxShadow = 'none';
            btnCustom.style.transform = 'scale(1)';
        }
    }
    
    updateEmulseurInverse();
}

function toggleCustomTauxInv() {
    const customDiv = document.getElementById('customRateDivInv');
    const customInput = document.getElementById('customRateInv');
    
    if (customDiv.style.display === 'none') {
        customDiv.style.display = 'block';
        if (customInput) {
            customInput.focus();
            customInput.select();
        }
    } else {
        customDiv.style.display = 'none';
    }
}

// ========== FONCTIONS CONCENTRATION SIMPLIFIÉES ==========
function setConcentration(value) {
    const concInput = document.getElementById('concentration');
    if (concInput) {
        concInput.value = value;
    }
    
    // Mettre à jour le champ personnalisé si visible
    const customInput = document.getElementById('customConcValue');
    if (customInput) {
        customInput.value = value;
    }
    
    // Définir les couleurs originales de chaque bouton
    const btnColors = {
        'btnConc1': { bg: '#81C784', border: '#81C784' },
        'btnConc3': { bg: '#FFEB3B', border: '#FFEB3B' },
        'btnConc6': { bg: '#FF9800', border: '#FF9800' },
        'btnConcCustom': { bg: '#2196F3', border: '#2196F3' }
    };
    
    // Mettre à jour l'apparence des boutons
    const standardValues = [1, 3, 6];
    ['btnConc1', 'btnConc3', 'btnConc6'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const btnValue = parseInt(btnId.replace('btnConc', ''));
            const colors = btnColors[btnId];
            if (btnValue === value) {
                btn.style.background = colors.bg;
                btn.style.border = '5px solid #FFD700';
                btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.background = colors.bg;
                btn.style.border = '2px solid ' + colors.border;
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        }
    });
    
    // Gérer le bouton "Autre"
    const btnCustom = document.getElementById('btnConcCustom');
    if (btnCustom) {
        const colors = btnColors['btnConcCustom'];
        if (!standardValues.includes(value)) {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '5px solid #FFD700';
            btnCustom.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            btnCustom.style.transform = 'scale(1.05)';
        } else {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '2px solid ' + colors.border;
            btnCustom.style.boxShadow = 'none';
            btnCustom.style.transform = 'scale(1)';
        }
    }
    
    updateEmulseur();
}

function toggleCustomConc() {
    const customDiv = document.getElementById('customConcDiv');
    const customInput = document.getElementById('customConcValue');
    
    if (customDiv.style.display === 'none') {
        customDiv.style.display = 'block';
        if (customInput) {
            customInput.focus();
            customInput.select();
        }
    } else {
        customDiv.style.display = 'none';
    }
}

function setConcentrationInv(value) {
    const concInput = document.getElementById('concentrationInv');
    if (concInput) {
        concInput.value = value;
    }
    
    // Mettre à jour le champ personnalisé si visible
    const customInput = document.getElementById('customConcValueInv');
    if (customInput) {
        customInput.value = value;
    }
    
    // Définir les couleurs originales de chaque bouton
    const btnColors = {
        'btnConcInv1': { bg: '#81C784', border: '#81C784' },
        'btnConcInv3': { bg: '#FFEB3B', border: '#FFEB3B' },
        'btnConcInv6': { bg: '#FF9800', border: '#FF9800' },
        'btnConcInvCustom': { bg: '#2196F3', border: '#2196F3' }
    };
    
    // Mettre à jour l'apparence des boutons
    const standardValues = [1, 3, 6];
    ['btnConcInv1', 'btnConcInv3', 'btnConcInv6'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const btnValue = parseInt(btnId.replace('btnConcInv', ''));
            const colors = btnColors[btnId];
            if (btnValue === value) {
                btn.style.background = colors.bg;
                btn.style.border = '5px solid #FFD700';
                btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.background = colors.bg;
                btn.style.border = '2px solid ' + colors.border;
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        }
    });
    
    // Gérer le bouton "Autre"
    const btnCustom = document.getElementById('btnConcInvCustom');
    if (btnCustom) {
        const colors = btnColors['btnConcInvCustom'];
        if (!standardValues.includes(value)) {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '5px solid #FFD700';
            btnCustom.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            btnCustom.style.transform = 'scale(1.05)';
        } else {
            btnCustom.style.background = colors.bg;
            btnCustom.style.border = '2px solid ' + colors.border;
            btnCustom.style.boxShadow = 'none';
            btnCustom.style.transform = 'scale(1)';
        }
    }
    
    updateEmulseurInverse();
}

function toggleCustomConcInv() {
    const customDiv = document.getElementById('customConcDivInv');
    const customInput = document.getElementById('customConcValueInv');
    
    if (customDiv.style.display === 'none') {
        customDiv.style.display = 'block';
        if (customInput) {
            customInput.focus();
            customInput.select();
        }
    } else {
        customDiv.style.display = 'none';
    }
}

function adjustDuree(delta) {
    const dureeInput = document.getElementById('duree');
    if (!dureeInput) return;
    
    let newValue = parseInt(dureeInput.value) + delta;
    
    // Arrondir au multiple de 5 le plus proche
    newValue = Math.round(newValue / 5) * 5;
    
    // Limiter entre 5 et 60 minutes
    newValue = Math.max(5, Math.min(60, newValue));
    
    dureeInput.value = newValue;
    updateEmulseur();
}

function adjustDureeInv(delta) {
    const dureeInput = document.getElementById('dureeInv');
    if (!dureeInput) return;
    
    let newValue = parseInt(dureeInput.value) + delta;
    
    // Arrondir au multiple de 5 le plus proche
    newValue = Math.round(newValue / 5) * 5;
    
    // Limiter entre 5 et 60 minutes
    newValue = Math.max(5, Math.min(60, newValue));
    
    dureeInput.value = newValue;
    updateEmulseurInverse();
}

function adjustEmulseurStock(delta) {
    const stockInput = document.getElementById('stockEmulseur');
    if (!stockInput) return;
    
    let newValue = parseInt(stockInput.value) + delta;
    newValue = Math.max(0, newValue);
    stockInput.value = newValue;
    updateEmulseurInverse();
}

function updateEmulseur() {
    // Récupération des valeurs
    const surface = parseFloat(document.getElementById('surface')?.value || 0);
    const duree = parseInt(document.getElementById('duree')?.value || 20);
    
    // Récupération directe du taux d'application depuis le champ hidden
    const tauxApplication = parseFloat(document.getElementById('liquidType')?.value || 10);
    
    // Récupération directe de la concentration depuis le champ hidden
    const concentration = parseFloat(document.getElementById('concentration')?.value || 3);
    
    // Calculs
    const debitSolution = surface * tauxApplication;
    const volumeSolution = debitSolution * duree;
    const volumeEmulseur = volumeSolution * (concentration / 100);
    const volumeEau = volumeSolution - volumeEmulseur;
    
    // Affichage des volumes
    const volumesDiv = document.getElementById('emulseurVolumes');
    if (volumesDiv) {
        volumesDiv.innerHTML = `
            <div class="result-item">
                <span>Volume de solution total :</span>
                <span class="result-value">${volumeSolution.toFixed(0)} L</span>
            </div>
            <div class="result-item">
                <span>Eau nécessaire :</span>
                <span class="result-value">${volumeEau.toFixed(0)} L</span>
            </div>
        `;
    }
    
    // Affichage des débits
    const debitsDiv = document.getElementById('emulseurDebits');
    if (debitsDiv) {
        debitsDiv.innerHTML = `
            <div class="result-item">
                <span>Débit de solution :</span>
                <span class="result-value">${debitSolution.toFixed(0)} L/min</span>
            </div>
            <div class="result-item">
                <span>Taux d'application :</span>
                <span class="result-value">${tauxApplication} L/min/m²</span>
            </div>
        `;
    }
    
    // Affichage de la quantité d'émulseur (TAILLE RÉDUITE)
    const quantiteDiv = document.getElementById('emulseurQuantite');
    if (quantiteDiv) {
        const bidons20L = Math.ceil(volumeEmulseur / 20);
        
        quantiteDiv.innerHTML = `
            <div class="info-card" style="background: rgba(255, 255, 255, 0.3); margin-bottom: 12px; border: 2px solid #F57C00;">
                <div class="label" style="color: #000000 !important; font-size: 1em;">Volume d'émulseur à ${concentration}%</div>
                <div class="value" style="font-size: 1.8em; color: #000000 !important; font-weight: 900;">${volumeEmulseur.toFixed(0)} L</div>
            </div>
            <div class="result-item" style="background: rgba(255, 255, 255, 0.2); border-left-color: #F57C00;">
                <span style="color: #000000 !important;">Bidons de 20L nécessaires :</span>
                <span class="result-value" style="color: #000000 !important; font-weight: 700;">${bidons20L} bidons</span>
            </div>
        `;
    }
}

function updateEmulseurInverse() {
    // Récupération des valeurs
    const stockEmulseur = parseFloat(document.getElementById('stockEmulseur')?.value || 100);
    const duree = parseInt(document.getElementById('dureeInv')?.value || 20);
    
    // Récupération directe du taux d'application depuis le champ hidden
    const tauxApplication = parseFloat(document.getElementById('liquidTypeInv')?.value || 10);
    
    // Récupération directe de la concentration depuis le champ hidden
    const concentration = parseFloat(document.getElementById('concentrationInv')?.value || 3);
    
    // Calculs inverses
    const volumeSolution = stockEmulseur / (concentration / 100);
    const debitSolution = volumeSolution / duree;
    const surface = debitSolution / tauxApplication;
    const volumeEau = volumeSolution - stockEmulseur;
    
    // Affichage du résultat principal (MÊME STYLE ORANGE QUE LE MODE DIRECT)
    const resultsDiv = document.getElementById('emulseurInverseResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="info-card" style="background: rgba(255, 255, 255, 0.3); margin-bottom: 12px; border: 2px solid #F57C00;">
                <div class="label" style="color: #000000 !important; font-size: 1em;">Surface couverte avec ce stock</div>
                <div class="value" style="font-size: 1.8em; color: #000000 !important; font-weight: 900;">${surface.toFixed(1)} m²</div>
            </div>
        `;
    }
    
    // Affichage des détails
    const detailsDiv = document.getElementById('emulseurInverseDetails');
    if (detailsDiv) {
        detailsDiv.innerHTML = `
            <div class="result-item">
                <span>Stock émulseur disponible :</span>
                <span class="result-value">${stockEmulseur.toFixed(0)} L</span>
            </div>
            <div class="result-item">
                <span>Eau nécessaire :</span>
                <span class="result-value">${volumeEau.toFixed(0)} L</span>
            </div>
            <div class="result-item">
                <span>Volume total de solution :</span>
                <span class="result-value">${volumeSolution.toFixed(0)} L</span>
            </div>
            <div class="result-item">
                <span>Débit de solution :</span>
                <span class="result-value">${debitSolution.toFixed(0)} L/min</span>
            </div>
            <div class="result-item">
                <span>Durée d'application :</span>
                <span class="result-value">${duree} minutes</span>
            </div>
            <div class="alert-box" style="margin-top: 15px;">
                💡 <strong>Info :</strong> Avec ${stockEmulseur}L d'émulseur à ${concentration}%, vous pouvez couvrir ${surface.toFixed(1)}m² pendant ${duree} minutes
            </div>
        `;
    }
}

// ========== MODULE CALCUL ABAQUE ==========
function updateAbaqueForm() {
    const type = document.getElementById('abaque-type')?.value;
    const form = document.getElementById('abaque-form');
    
    if (!form) return;
    
    if (type === 'poids') {
        form.innerHTML = `
            <div class="form-group">
                <label>Volume (L) :</label>
                <input type="number" id="abaque-volume" value="1000" step="100" oninput="calculateAbaque()">
            </div>
            <div class="form-group">
                <label>Densité :</label>
                <input type="number" id="abaque-densite" value="1.0" step="0.1" oninput="calculateAbaque()">
            </div>
        `;
    } else if (type === 'volume') {
        form.innerHTML = `
            <div class="form-group">
                <label>Masse (kg) :</label>
                <input type="number" id="abaque-masse" value="1000" step="100" oninput="calculateAbaque()">
            </div>
            <div class="form-group">
                <label>Densité :</label>
                <input type="number" id="abaque-densite" value="1.0" step="0.1" oninput="calculateAbaque()">
            </div>
        `;
    } else {
        form.innerHTML = `
            <div class="form-group">
                <label>Masse (kg) :</label>
                <input type="number" id="abaque-masse" value="1000" step="100" oninput="calculateAbaque()">
            </div>
            <div class="form-group">
                <label>Volume (L) :</label>
                <input type="number" id="abaque-volume" value="1000" step="100" oninput="calculateAbaque()">
            </div>
        `;
    }
    
    calculateAbaque();
}

function calculateAbaque() {
    const type = document.getElementById('abaque-type')?.value;
    let resultat = 0;
    let unite = '';
    
    if (type === 'poids') {
        const volume = parseFloat(document.getElementById('abaque-volume')?.value || 0);
        const densite = parseFloat(document.getElementById('abaque-densite')?.value || 1);
        resultat = volume * densite;
        unite = 'kg';
    } else if (type === 'volume') {
        const masse = parseFloat(document.getElementById('abaque-masse')?.value || 0);
        const densite = parseFloat(document.getElementById('abaque-densite')?.value || 1);
        resultat = masse / densite;
        unite = 'L';
    } else {
        const masse = parseFloat(document.getElementById('abaque-masse')?.value || 0);
        const volume = parseFloat(document.getElementById('abaque-volume')?.value || 0);
        resultat = volume > 0 ? masse / volume : 0;
        unite = '';
    }
    
    const result = document.getElementById('abaque-result');
    if (result) {
        result.innerHTML = `
            <div class="result-box">
                <div class="info-card">
                    <div class="label">Résultat</div>
                    <div class="value">${resultat.toFixed(2)} ${unite}</div>
                </div>
            </div>
        `;
    }
}

// ========== MODULE CALCUL DISTANCES ==========
// ========== MODULE CALCUL TEMPS DE TRAJET ==========
let vitesseSelectionnee = 50; // Vitesse par défaut

function selectVitesse(vitesse) {
    vitesseSelectionnee = vitesse;
    
    // Mettre à jour l'affichage des boutons
    const buttons = document.querySelectorAll('.vitesse-btn');
    buttons.forEach(btn => {
        // Retirer l'effet de sélection
        btn.style.boxShadow = btn.style.boxShadow.replace('0 0 0 4px rgba(229, 57, 53, 0.3), ', '');
        btn.style.transform = 'scale(1)';
    });
    
    // Ajouter l'effet de sélection au bouton cliqué
    const selectedBtn = document.querySelector(`.vitesse-btn[data-vitesse="${vitesse}"]`);
    if (selectedBtn) {
        selectedBtn.style.boxShadow = '0 0 0 4px rgba(229, 57, 53, 0.3), ' + selectedBtn.style.boxShadow;
        selectedBtn.style.transform = 'scale(1.05)';
    }
    
    // Recalculer le trajet
    calculateTrajet();
}

function calculateTrajet() {
    const distance = parseFloat(document.getElementById('trajet-distance')?.value || 0);
    
    if (distance <= 0) {
        return;
    }
    
    // Calcul du temps en heures
    const tempsHeures = distance / vitesseSelectionnee;
    
    // Conversion en heures et minutes
    const heures = Math.floor(tempsHeures);
    const minutes = Math.round((tempsHeures - heures) * 60);
    
    // Affichage du temps
    let tempsTexte = '';
    if (heures > 0) {
        tempsTexte = `${heures}h ${minutes}min`;
    } else {
        tempsTexte = `${minutes}min`;
    }
    
    // Si moins d'une minute
    if (heures === 0 && minutes === 0) {
        const secondes = Math.round(tempsHeures * 3600);
        tempsTexte = `${secondes}s`;
    }
    
    // Mise à jour de l'affichage
    const tempsDisplay = document.getElementById('trajet-temps');
    const distDisplay = document.getElementById('trajet-dist-display');
    const vitesseDisplay = document.getElementById('trajet-vitesse-display');
    
    if (tempsDisplay) tempsDisplay.textContent = tempsTexte;
    if (distDisplay) distDisplay.textContent = `${distance.toFixed(1)} km`;
    if (vitesseDisplay) vitesseDisplay.textContent = `${vitesseSelectionnee} km/h`;
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('trajet-distance')) {
        calculateTrajet();
    }
});

// ========== SAUVEGARDE ET MODALES ==========
function openSaveModal() {
    const modal = document.getElementById('saveModal');
    if (modal) modal.style.display = 'flex';
}

function closeSaveModal() {
    const modal = document.getElementById('saveModal');
    if (modal) modal.style.display = 'none';
}

function openInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.style.display = 'flex';
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.style.display = 'none';
}

function saveAsPDF() {
    alert('🔧 Fonction d\'export PDF en cours de développement');
    closeSaveModal();
}

function saveAsText() {
    alert('🔧 Fonction d\'export texte en cours de développement');
    closeSaveModal();
}

function saveAsImage() {
    alert('🔧 Fonction d\'export image en cours de développement');
    closeSaveModal();
}

function copyToClipboard() {
    alert('🔧 Fonction de copie en cours de développement');
    closeSaveModal();
}

// ========== GESTION DES THÈMES ==========
// ========== FONCTIONS ADDITIONNELLES POUR TOUS LES MODULES ==========

// ========== MODULE DISTANCES - Calculs spécifiques ==========
function calculateSiloReflechi() {
    const hauteur = parseFloat(document.getElementById('hauteurSilo')?.value || 30);
    const distance = hauteur * 1.5;
    const result = document.getElementById('perimatreSiloReflechi');
    if (result) {
        result.textContent = `${distance.toFixed(0)} m`;
    }
}

function calculateArbre() {
    const hauteur = parseFloat(document.getElementById('hauteurArbre')?.value || 20);
    const distance = hauteur * 1.5;
    const result = document.getElementById('perimetreArbre');
    if (result) {
        result.textContent = `${distance.toFixed(0)} m`;
    }
}

function calculateMur() {
    const hauteur = parseFloat(document.getElementById('hauteurMur')?.value || 3);
    const distance = hauteur * 1.5;
    const result = document.getElementById('perimatreMur');
    if (result) {
        result.textContent = `${distance.toFixed(0)} m`;
    }
}

function calculateEolienne() {
    const hauteur = parseFloat(document.getElementById('hauteurEolienne')?.value || 100);
    const distance = hauteur * 1.2;
    const result = document.getElementById('perimetreEolienne');
    if (result) {
        result.textContent = `${distance.toFixed(0)} m`;
    }
}

function adjustHauteurEolienne(delta) {
    const input = document.getElementById('hauteurEolienne');
    if (input) {
        let value = parseFloat(input.value) + delta;
        value = Math.max(50, value);
        input.value = value;
        calculateEolienne();
    }
}

// ========== MODULE ÉPUISEMENT ==========
let currentShape = 'rectangle';

function selectShape(shape) {
    currentShape = shape;
    
    // Cacher toutes les sections
    document.getElementById('dimensions-rectangle').style.display = 'none';
    document.getElementById('dimensions-carre').style.display = 'none';
    document.getElementById('dimensions-cercle').style.display = 'none';
    
    // Retirer l'état actif de tous les boutons
    document.querySelectorAll('.shape-card').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Afficher la section correspondante et activer le bouton
    if (shape === 'rectangle') {
        document.getElementById('dimensions-rectangle').style.display = 'block';
        document.getElementById('shape-rectangle').classList.add('active');
    } else if (shape === 'carre') {
        document.getElementById('dimensions-carre').style.display = 'block';
        document.getElementById('shape-carre').classList.add('active');
    } else if (shape === 'cercle') {
        document.getElementById('dimensions-cercle').style.display = 'block';
        document.getElementById('shape-cercle').classList.add('active');
    }
    
    calculateEpuisement();
}

// Variables pour les quantités de matériels
let quantites = {
    mat15: 0,
    mat30: 0,
    mat60: 0,
    mat90: 0
};

function modifierQuantite(materiel, delta) {
    quantites[materiel] = Math.max(0, quantites[materiel] + delta);
    document.getElementById('qty-' + materiel).textContent = quantites[materiel];
    calculateEpuisement();
}

function calculateEpuisement() {
    let surface = 0;
    
    // Calculer la surface selon la forme
    if (currentShape === 'rectangle') {
        const longueur = parseFloat(document.getElementById('longueur')?.value || 10);
        const largeur = parseFloat(document.getElementById('largeur')?.value || 5);
        surface = longueur * largeur;
    } else if (currentShape === 'carre') {
        const cote = parseFloat(document.getElementById('cote')?.value || 5);
        surface = cote * cote;
    } else if (currentShape === 'cercle') {
        const diametre = parseFloat(document.getElementById('diametre')?.value || 5);
        const rayon = diametre / 2;
        surface = Math.PI * rayon * rayon;
    }
    
    // Récupérer la hauteur d'eau et son unité
    const hauteurValue = parseFloat(document.getElementById('hauteur')?.value || 50);
    const uniteHauteur = document.getElementById('uniteHauteur')?.value || 'cm';
    
    // Convertir la hauteur en mètres selon l'unité
    let hauteur;
    if (uniteHauteur === 'cm') {
        hauteur = hauteurValue / 100; // cm vers m
    } else {
        hauteur = hauteurValue; // déjà en m
    }
    
    // Calculer le volume (surface en m² × hauteur en m = volume en m³)
    const volume = surface * hauteur;
    const volumeLitres = volume * 1000;
    
    // Afficher les résultats
    document.getElementById('surfaceEpuis').textContent = `${surface.toFixed(2)} m²`;
    document.getElementById('volumeEau').textContent = `${volumeLitres.toFixed(0)} L (${volume.toFixed(2)} m³)`;
    
    // Calculer le débit total en fonction des quantités
    let debitTotal = 0;
    debitTotal += quantites.mat15 * 250;  // 15 m³/h = 250 L/min
    debitTotal += quantites.mat30 * 500;  // 30 m³/h = 500 L/min
    debitTotal += quantites.mat60 * 1000; // 60 m³/h = 1000 L/min
    debitTotal += quantites.mat90 * 1500; // 90 m³/h = 1500 L/min
    
    // Si au moins un matériel est sélectionné
    if (debitTotal > 0) {
        const tempsMinutes = volumeLitres / debitTotal;
        const heures = Math.floor(tempsMinutes / 60);
        const minutes = Math.ceil(tempsMinutes % 60);
        
        let detailHTML = '<div style="background: var(--bg-main); padding: 15px; border-radius: 10px; margin-bottom: 15px;">';
        detailHTML += '<h4 style="color: #FF9800; margin-bottom: 10px;">Matériels engagés :</h4>';
        
        if (quantites.mat15 > 0) {
            const debitMatériel = quantites.mat15 * 250;
            detailHTML += `<div style="margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                <span>✓ ${quantites.mat15}× 15 m³/h (250 L/min)</span>
                <span style="color: #00ccff; font-weight: bold;">${debitMatériel} L/min</span>
            </div>`;
        }
        if (quantites.mat30 > 0) {
            const debitMatériel = quantites.mat30 * 500;
            detailHTML += `<div style="margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                <span>✓ ${quantites.mat30}× 30 m³/h (500 L/min)</span>
                <span style="color: #00ccff; font-weight: bold;">${debitMatériel} L/min</span>
            </div>`;
        }
        if (quantites.mat60 > 0) {
            const debitMatériel = quantites.mat60 * 1000;
            detailHTML += `<div style="margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                <span>✓ ${quantites.mat60}× 60 m³/h (1000 L/min)</span>
                <span style="color: #00ccff; font-weight: bold;">${debitMatériel} L/min</span>
            </div>`;
        }
        if (quantites.mat90 > 0) {
            const debitMatériel = quantites.mat90 * 1500;
            detailHTML += `<div style="margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                <span>✓ ${quantites.mat90}× 90 m³/h (1500 L/min)</span>
                <span style="color: #00ccff; font-weight: bold;">${debitMatériel} L/min</span>
            </div>`;
        }
        
        detailHTML += `<div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid var(--primary-red);">`;
        detailHTML += `<div style="display: flex; justify-content: space-between; font-size: 1.2em;">
            <strong>Débit total :</strong> 
            <span style="color: #4CAF50; font-weight: bold;">${debitTotal} L/min (${(debitTotal * 60 / 1000).toFixed(1)} m³/h)</span>
        </div>`;
        detailHTML += `</div></div>`;
        
        // Affichage de la durée
        let tempsHTML = '';
        if (heures > 0) {
            tempsHTML = `${heures}h ${minutes}min`;
        } else {
            tempsHTML = `${minutes} min`;
        }
        
        document.getElementById('detailMateriel').innerHTML = detailHTML;
        document.getElementById('tempsTotalEpuis').textContent = tempsHTML;
        document.getElementById('resultatMateriel').style.display = 'block';
        
        // Afficher les mesures de sécurité
        document.getElementById('mesuresSecurite').style.display = 'block';
    } else {
        document.getElementById('resultatMateriel').style.display = 'none';
        document.getElementById('mesuresSecurite').style.display = 'none';
    }
}


// ========== MODULE BOUTEILLES ==========
// ========== MODULE BOUTEILLES DE GAZ - Identification par couleur d'ogive ==========
function identifierBouteilleParCouleur(couleur) {
    const resultDiv = document.getElementById('resultatIdentificationBouteille');
    if (!resultDiv || !couleur) return;
    
    // Base de données complète des gaz selon norme NF EN 1089-3
    const gazData = {
        'jaune': {
            nom: 'GAZ TOXIQUE / CORROSIF',
            couleur: 'JAUNE (RAL 1018)',
            picto: '☠️',
            classe: 'Classe 2.3',
            risque: 'Toxique et/ou Corrosif',
            exemples: ['Chlore (Cl₂)', 'Ammoniac (NH₃)', 'Fluor (F₂)', 'Phosgène (COCl₂)', 'Dioxyde de soufre (SO₂)'],
            dangers: [
                'Toxique par inhalation',
                'Corrosif pour les voies respiratoires',
                'Peut causer des brûlures chimiques',
                'Risque d\'asphyxie',
                'Formation de nuage toxique'
            ],
            epi: ['ARI obligatoire', 'Combinaison étanche gaz', 'Gants NBR', 'Bottes étanches'],
            mesures: [
                'Périmètre de sécurité élargi',
                'Approche vent de dos',
                'Évacuation immédiate zone sous vent',
                'Cellule de crise NRBC si besoin',
                'Rideaux d\'eau si possible'
            ]
        },
        'rouge': {
            nom: 'GAZ INFLAMMABLE',
            couleur: 'ROUGE (RAL 3000)',
            picto: '🔥',
            classe: 'Classe 2.1',
            risque: 'Inflammable',
            exemples: ['Hydrogène (H₂)', 'Propane (C₃H₈)', 'Butane (C₄H₁₀)', 'Méthane (CH₄)', 'Éthylène (C₂H₄)'],
            dangers: [
                'Extrêmement inflammable',
                'Risque d\'explosion UVCE/BLEVE',
                'Formation d\'atmosphère explosive',
                'Boule de feu en cas d\'inflammation',
                'Effet domino sur autres bouteilles'
            ],
            epi: ['ARI obligatoire', 'Tenue de feu', 'Protection thermique si possible'],
            mesures: [
                'Supprimer toute source d\'ignition',
                'Explosimètre en continu',
                'Périmètre ≥ 100m si feu',
                'Refroidissement continu',
                'Pas d\'extinction du feu de torche'
            ]
        },
        'bleu': {
            nom: 'GAZ COMBURANT',
            couleur: 'BLEU CLAIR (RAL 5012)',
            picto: '⭕',
            classe: 'Classe 2.2 (5.1)',
            risque: 'Comburant',
            exemples: ['Oxygène (O₂)', 'Protoxyde d\'azote (N₂O)', 'Air enrichi en O₂'],
            dangers: [
                'Active et accélère la combustion',
                'Incompatible avec graisses/hydrocarbures',
                'Risque d\'inflammation spontanée',
                'Augmente intensité du feu',
                'Matériaux inertes deviennent combustibles'
            ],
            epi: ['ARI selon situation', 'Tenue propre (pas d\'hydrocarbures)', 'Pas de graisse'],
            mesures: [
                'Éloigner de tout combustible',
                'Interdire graisses et huiles',
                'Ventilation maximale',
                'Contrôle concentration O₂',
                'Refroidissement si exposition feu'
            ]
        },
        'vert': {
            nom: 'GAZ INERTE',
            couleur: 'VERT VIF (RAL 6018)',
            picto: '🟢',
            classe: 'Classe 2.2',
            risque: 'Asphyxiant simple',
            exemples: ['Azote (N₂)', 'Argon (Ar)', 'Hélium (He)', 'Néon (Ne)', 'Krypton (Kr)'],
            dangers: [
                'Asphyxie par carence en oxygène',
                'Pas de signes d\'alerte (gaz inodore)',
                'Perte de connaissance rapide',
                'Gaz plus lourd que l\'air (sauf He)',
                'Accumulation en points bas'
            ],
            epi: ['ARI en espace confiné', 'Détecteur O₂ obligatoire'],
            mesures: [
                'Ventilation intensive',
                'Contrôle %O₂ en continu',
                'Interdire accès espaces confinés',
                'Baliser zones à risque',
                'Binôme de sécurité'
            ]
        },
        'marron': {
            nom: 'ACÉTYLÈNE C₂H₂',
            couleur: 'MARRON (RAL 3009)',
            picto: '⚠️',
            classe: 'Classe 2.1 Instable',
            risque: 'Inflammable ET Instable',
            exemples: ['Acétylène uniquement (C₂H₂)'],
            dangers: [
                '⚠️ DÉCOMPOSITION EXPLOSIVE POSSIBLE',
                'Peut exploser SANS oxygène',
                'Sensible chocs, chaleur, pression',
                'Risque de polymérisation',
                'Formation acétylure de cuivre explosif'
            ],
            epi: ['ARI obligatoire', 'Tenue de feu', 'Distance maximale'],
            mesures: [
                'PÉRIMÈTRE ≥ 200 MÈTRES',
                'Refroidissement 1h minimum obligatoire',
                'Protocole spécifique strict',
                'Immersion dans eau possible',
                'NE JAMAIS INTERROMPRE refroidissement avant 1h',
                'Consulter protocole acétylène détaillé'
            ]
        },
        'blanc': {
            nom: 'OXYGÈNE PUR',
            couleur: 'BLANC (RAL 9010)',
            picto: '💨',
            classe: 'Classe 2.2 (5.1)',
            risque: 'Comburant puissant',
            exemples: ['Oxygène médical', 'Oxygène industriel'],
            dangers: [
                'Comburant très puissant',
                'Inflammation instantanée au contact graisses',
                'Saturation vêtements en O₂',
                'Combustion violente matériaux',
                'Risque incendie personnel'
            ],
            epi: ['Tenue propre impérativement', 'Pas de graisse/hydrocarbures', 'ARI si fuite importante'],
            mesures: [
                'Interdiction absolue graisses/huiles',
                'Laver mains avant manipulation',
                'Aérer vêtements saturés en O₂',
                'Pas de flamme/étincelle',
                'Ventilation maximale'
            ]
        },
        'vertfonce': {
            nom: 'ARGON',
            couleur: 'VERT FONCÉ (RAL 6001)',
            picto: '🟢',
            classe: 'Classe 2.2',
            risque: 'Asphyxiant (gaz rare)',
            exemples: ['Argon (Ar) - soudage TIG/MIG'],
            dangers: [
                'Asphyxiant simple',
                'Plus lourd que l\'air (1.4)',
                'Accumulation points bas',
                'Pas d\'odeur/couleur',
                'Perte connaissance rapide'
            ],
            epi: ['ARI en espace confiné', 'Détecteur O₂'],
            mesures: [
                'Ventilation basse prioritaire',
                'Contrôle O₂ en continu',
                'Interdire fosses/cuves',
                'Baliser zones basses',
                'Procédure espace confiné si besoin'
            ]
        },
        'noir': {
            nom: 'AZOTE',
            couleur: 'NOIR (RAL 9005)',
            picto: '⚫',
            classe: 'Classe 2.2',
            risque: 'Asphyxiant',
            exemples: ['Azote (N₂) - inertage, conservation'],
            dangers: [
                'Asphyxie par carence O₂',
                'Légèrement plus léger que air',
                'Inodore, incolore, insipide',
                'Aucun signe avant-coureur',
                'Mort en quelques minutes'
            ],
            epi: ['ARI en espace confiné', 'Détecteur O₂ obligatoire'],
            mesures: [
                'Ventilation générale',
                'Contrôle %O₂ permanent',
                'Procédure espace confiné',
                'Binôme + surveillance',
                'Formation asphyxie personnel'
            ]
        },
        'gris': {
            nom: 'DIOXYDE DE CARBONE CO₂',
            couleur: 'GRIS (RAL 7037)',
            picto: '💨',
            classe: 'Classe 2.2',
            risque: 'Asphyxiant + Narcotique',
            exemples: ['CO₂ (dioxyde de carbone)'],
            dangers: [
                'Asphyxiant (déplace O₂)',
                'Effet narcotique à forte concentration',
                'Plus lourd que l\'air (1.5)',
                'Accumulation rapide points bas',
                'Sensation oppression, vertige'
            ],
            epi: ['ARI en concentration >5%', 'Détecteur CO₂ et O₂'],
            mesures: [
                'Ventilation basse intensive',
                'Mesure %CO₂ et %O₂',
                'Évacuation points bas',
                'Attention effet sournois',
                'Surveillant à l\'extérieur'
            ]
        },
        'brun': {
            nom: 'HÉLIUM',
            couleur: 'BRUN (RAL 8008)',
            picto: '🎈',
            classe: 'Classe 2.2',
            risque: 'Asphyxiant (très léger)',
            exemples: ['Hélium (He) - ballons, cryogénie'],
            dangers: [
                'Asphyxiant simple',
                'Plus léger que air (0.14)',
                'Monte et s\'accumule en hauteur',
                'Risque plafonds, combles',
                'Perte de connaissance'
            ],
            epi: ['ARI en espace confiné', 'Détecteur O₂'],
            mesures: [
                'Ventilation haute prioritaire',
                'Attention accumulation plafond',
                'Contrôle O₂ en hauteur',
                'Percer plafond si accumulation',
                'Aération naturelle haute'
            ]
        }
    };
    
    const data = gazData[couleur];
    if (!data) return;
    
    // Affichage du résultat détaillé
    resultDiv.innerHTML = `
        <div class="result-box" style="margin-top: 30px; background: var(--bg-card); border: 3px solid #ff6600; animation: fadeIn 0.5s;">
            <h3 style="color: #ff6600; font-size: 2em; text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ff6600;">
                ${data.picto} ${data.nom}
            </h3>
            
            <div style="display: grid; gap: 15px; margin-bottom: 20px;">
                <div style="background: rgba(255,102,0,0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #ff6600;">
                    <strong style="color: #ff6600;">🎨 Couleur d'ogive :</strong>
                    <span style="color: #212121; font-size: 1.2em; font-weight: bold; margin-left: 10px;">${data.couleur}</span>
                </div>
                
                <div style="background: rgba(255,204,0,0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #FF9800;">
                    <strong style="color: #FF9800;">⚠️ Classification :</strong>
                    <span style="color: #212121; font-size: 1.1em; font-weight: 600; margin-left: 10px;">${data.classe}</span>
                </div>
                
                <div style="background: rgba(255,0,0,0.2); padding: 15px; border-radius: 8px; border-left: 4px solid #ff0000;">
                    <strong style="color: #ff0000;">🚨 Risque principal :</strong>
                    <span style="color: #212121; font-size: 1.2em; font-weight: bold; margin-left: 10px;">${data.risque}</span>
                </div>
            </div>
            
            <div style="background: rgba(0,204,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 2px solid #00ccff;">
                <h4 style="color: #00ccff; margin-bottom: 15px; font-size: 1.3em;">📌 Exemples de gaz</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${data.exemples.map(ex => `<span style="background: rgba(0,204,255,0.2); padding: 8px 15px; border-radius: 20px; color: #212121; font-size: 1em; border: 1px solid #00ccff;">${ex}</span>`).join('')}
                </div>
            </div>
            
            <div style="background: rgba(255,0,0,0.15); padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 2px solid #ff0000;">
                <h4 style="color: #ff0000; margin-bottom: 15px; font-size: 1.3em;">⚠️ DANGERS SPÉCIFIQUES</h4>
                <ul style="list-style: none; padding: 0;">
                    ${data.dangers.map(d => `<li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #212121; line-height: 1.6;">▸ ${d}</li>`).join('')}
                </ul>
            </div>
            
            ${couleur === 'marron' ? `
                <div style="background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); padding: 20px; border-radius: 10px; margin-top: 20px; border: 3px solid #D2691E; text-align: center;">
                    <h4 style="color: #FFFFFF; font-size: 1.4em; margin-bottom: 10px;">⚠️ ATTENTION ACÉTYLÈNE ⚠️</h4>
                    <p style="color: #FFD700; font-size: 1.2em; font-weight: bold; line-height: 1.8;">
                        Consulter le protocole spécifique dans<br>
                        <span style="font-size: 1.3em;">💧 Procédure de Refroidissement</span>
                    </p>
                </div>
            ` : ''}
        </div>
        
        <style>
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;
    
    // Scroll vers le résultat
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ========== MODULE EXPLOSIMÉTRIE - Corrections ==========
function calculateCorrections() {
    const valeurBrute = parseFloat(document.getElementById('valeurExplo')?.value || 0);
    const temp = parseFloat(document.getElementById('temperatureExplo')?.value || 20);
    const pression = parseFloat(document.getElementById('pressionExplo')?.value || 1013);
    const humidite = parseFloat(document.getElementById('humiditeExplo')?.value || 50);
    
    // Correction de température (règle simplifiée : +5°C = -2% de la lecture)
    const correctionTemp = valeurBrute * (1 - ((temp - 20) * 0.02 / 5));
    
    // Correction de pression (règle simplifiée : variation linéaire autour de 1013 mbar)
    const correctionPression = correctionTemp * (pression / 1013);
    
    // Valeur finale corrigée
    const valeurCorrigee = correctionPression;
    
    const resultDiv = document.getElementById('resultCorrections');
    if (resultDiv) {
        let risque = '';
        let color = '';
        if (valeurCorrigee < 10) {
            risque = '✅ Zone sûre';
            color = '#4CAF50';
        } else if (valeurCorrigee < 25) {
            risque = '⚠️ Attention - Zone à risque';
            color = '#FF9800';
        } else {
            risque = '❌ DANGER - Zone explosive';
            color = '#ff0000';
        }
        
        resultDiv.innerHTML = `
            <div class="result-box">
                <h3>📊 Valeur corrigée</h3>
                <div class="result-item">
                    <span>Valeur brute :</span>
                    <span class="result-value">${valeurBrute.toFixed(1)} % LIE</span>
                </div>
                <div class="result-item">
                    <span>Correction température :</span>
                    <span class="result-value">${((valeurBrute - correctionTemp)).toFixed(2)} % LIE</span>
                </div>
                <div class="result-item">
                    <span>Correction pression :</span>
                    <span class="result-value">${((correctionTemp - valeurCorrigee)).toFixed(2)} % LIE</span>
                </div>
                <div class="info-card" style="margin: 20px 0; background: ${color}33; border: 3px solid ${color};">
                    <div class="label">Valeur corrigée finale</div>
                    <div class="value" style="font-size: 3em; color: ${color};">${valeurCorrigee.toFixed(1)} % LIE</div>
                </div>
                <div class="alert-box" style="background: ${color}33; border-color: ${color};">
                    <strong style="color: ${color}; font-size: 1.3em;">${risque}</strong>
                </div>
            </div>
        `;
    }
}

function adjustValeurExplo(delta) {
    const input = document.getElementById('valeurExplo');
    if (!input) return;
    let newValue = parseFloat(input.value) + delta;
    newValue = Math.max(0, Math.min(100, newValue));
    input.value = newValue.toFixed(1);
    calculateCorrections();
}

function adjustPression(delta) {
    const input = document.getElementById('pressionExplo');
    if (!input) return;
    let newValue = parseFloat(input.value) + delta;
    newValue = Math.max(900, Math.min(1100, newValue));
    input.value = newValue.toFixed(0);
    calculateCorrections();
}

// ========== MODULE ÉLECTRIQUE ==========
function adjustPressionP1(delta) {
    const input = document.getElementById('pressionP1');
    if (!input) return;
    let newValue = parseFloat(input.value) + delta;
    newValue = Math.max(0, newValue);
    input.value = newValue.toFixed(1);
    calculateElectricLine();
}

function adjustPressionP2(delta) {
    const input = document.getElementById('pressionP2');
    if (!input) return;
    let newValue = parseFloat(input.value) + delta;
    newValue = Math.max(0, newValue);
    input.value = newValue.toFixed(1);
    calculateElectricLine();
}

// ========== MODULE SECOURS À PERSONNE ==========
function afficherProtocoleRefroidissement() {
    const temps = parseInt(document.getElementById('tempsRefroidissement')?.value || 10);
    const resultDiv = document.getElementById('protocoleBrulure');
    
    if (!resultDiv) return;
    
    let niveau = '';
    let color = '';
    let conseil = '';
    
    if (temps < 5) {
        niveau = '⚠️ Insuffisant';
        color = '#ff0000';
        conseil = 'Continuer le refroidissement ! Minimum 10 minutes recommandé.';
    } else if (temps < 10) {
        niveau = '⏱️ En cours';
        color = '#FF9800';
        conseil = 'Poursuivre jusqu\'à 10 minutes pour un refroidissement optimal.';
    } else if (temps <= 20) {
        niveau = '✅ Optimal';
        color = '#4CAF50';
        conseil = 'Refroidissement efficace. Poursuivre si la douleur persiste.';
    } else {
        niveau = '✅ Prolongé';
        color = '#00ccff';
        conseil = 'Refroidissement prolongé effectué. Surveiller l\'hypothermie locale.';
    }
    
    resultDiv.innerHTML = `
        <div class="result-box" style="border: 3px solid ${color};">
            <h3 style="color: ${color};">Évaluation du refroidissement</h3>
            <div class="info-card" style="background: ${color}33; margin: 15px 0;">
                <div class="label">Statut</div>
                <div class="value" style="font-size: 2em; color: ${color};">${niveau}</div>
            </div>
            <div class="result-item">
                <span>Temps écoulé :</span>
                <span class="result-value">${temps} minutes</span>
            </div>
            <div class="alert-box" style="background: ${color}22; border-color: ${color};">
                💡 <strong>Conseil :</strong> ${conseil}
            </div>
            <div class="alert-box" style="margin-top: 15px;">
                📋 <strong>Rappel :</strong><br>
                • Eau tempérée (15-25°C)<br>
                • Arroser sans pression<br>
                • Ne pas refroidir si &gt; 30% surface corporelle
            </div>
        </div>
    `;
}

// ========== INITIALISATION AU CHARGEMENT ==========
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le mode émulseur par défaut
    if (document.getElementById('emulseurDirect')) {
        setEmulseurMode('direct');
    }
    
    // ========== AUTO-SÉLECTION DES CHAMPS NUMÉRIQUES ==========
    // Sélectionner automatiquement tout le texte quand on clique sur un champ numérique
    // Amélioration ergonomique pour tablettes et saisie tactile
    const autoSelectFields = [
        'surface', 'duree', 'customRate', 'dureeInv',
        'stockEmulseur', 'customRateInv', 'customConcValue', 'customConcValueInv'
    ];
    
    autoSelectFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('focus', function() {
                this.select();
            });
            field.addEventListener('click', function() {
                this.select();
            });
        }
    });
    
    // Afficher le module d'accueil
    showModule('home');
    
    // Initialiser les calculs des modules distances
    if (document.getElementById('hauteurSilo')) calculateSiloReflechi();
    if (document.getElementById('hauteurArbre')) calculateArbre();
    if (document.getElementById('hauteurMur')) calculateMur();
    if (document.getElementById('hauteurEolienne')) calculateEolienne();
    
    // ========== GESTION TOUCHE ÉCHAP ET BOUTON RETOUR ==========
    // Permet un retour rapide au menu principal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            const activeModule = document.querySelector('.module.active');
            if (activeModule && activeModule.id !== 'home') {
                showModule('home');
            }
        }
    });
    
    // Gestion du bouton retour Android/navigation historique
    window.addEventListener('popstate', function() {
        const activeModule = document.querySelector('.module.active');
        if (activeModule && activeModule.id !== 'home') {
            showModule('home');
        }
    });
});

// ========== FONCTION DE VALIDATION UNIVERSELLE ==========
function validateInput(value, min, max, type = 'number') {
    if (type === 'number') {
        const num = parseFloat(value);
        if (isNaN(num)) {
            return { valid: false, error: '⚠️ Valeur invalide', value: null };
        }
        if (num < min) {
            return { valid: false, error: `⚠️ Minimum: ${min}`, value: null };
        }
        if (num > max) {
            return { valid: false, error: `⚠️ Maximum: ${max}`, value: null };
        }
        return { valid: true, value: num, error: null };
    }
    return { valid: true, value: value, error: null };
}

// ========== DERNIÈRES FONCTIONS MANQUANTES ==========

// ========== MODULE ARI AVANCÉ - Gestion des binômes ==========
// ========== MODULE ARI SIMPLIFIÉ ==========
function calculerAutonomieARI() {
    const pression = parseFloat(document.getElementById('pressionARI')?.value || 300);
    const volume = parseFloat(document.getElementById('volumeARI')?.value || 9);
    const conso = parseFloat(document.getElementById('consoARI')?.value || 100);
    const securite = parseFloat(document.getElementById('securiteARI')?.value || 55);
    
    // Calculs CORRECTS
    // 1. Autonomie totale = TOUTE la pression disponible
    const volumeAirTotal = pression * volume;
    const autonomieTotale = volumeAirTotal / conso;
    
    // 2. Mi-temps = Moitié de l'autonomie totale
    const miTemps = autonomieTotale / 2;
    
    // 3. Temps au sifflet = Autonomie MOINS la réserve de sécurité
    const pressionUtilisable = pression - securite;
    const volumeAirUtilisable = pressionUtilisable * volume;
    const tempsSifflet = volumeAirUtilisable / conso;
    
    // Afficher/masquer l'alerte de pression basse
    const alertePressioBasse = document.getElementById('alertePressioBasse');
    if (alertePressioBasse) {
        if (pression < 270) {
            alertePressioBasse.style.display = 'block';
        } else {
            alertePressioBasse.style.display = 'none';
        }
    }
    
    // Afficher les résultats
    const resultDiv = document.getElementById('resultatsARI');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        
        // Résultats arrondis (gros)
        document.getElementById('pressionUtilisable').textContent = pressionUtilisable.toFixed(0) + ' bar';
        document.getElementById('volumeAir').textContent = volumeAirTotal.toFixed(0) + ' L';
        document.getElementById('autonomieTotale').textContent = autonomieTotale.toFixed(0) + ' min';
        document.getElementById('miTemps').textContent = miTemps.toFixed(0) + ' min';
        document.getElementById('tempsSifflet').textContent = tempsSifflet.toFixed(0) + ' min';
        
        // Résultats exacts (petit)
        document.getElementById('autonomieExacte').textContent = '(Exact: ' + autonomieTotale.toFixed(2) + ' min)';
        document.getElementById('miTempsExact').textContent = '(Exact: ' + miTemps.toFixed(2) + ' min)';
        document.getElementById('tempsSiffletExact').textContent = '(Exact: ' + tempsSifflet.toFixed(2) + ' min)';
    }
}

function setBouteilleARI(volume) {
    document.getElementById('volumeARI').value = volume;
    
    const btn6 = document.getElementById('btnBout6');
    const btn7 = document.getElementById('btnBout7');
    const btn9 = document.getElementById('btnBout9');
    
    // Réinitialiser tous les boutons à leur état normal (coloré mais pas surligné)
    if (btn6) {
        btn6.style.background = 'linear-gradient(135deg, #81C784 0%, #66BB6A 100%)';
        btn6.style.borderColor = '#66BB6A';
        btn6.style.borderWidth = '3px';
        btn6.style.boxShadow = '0 4px 12px rgba(102, 187, 106, 0.3)';
        btn6.style.transform = 'scale(1)';
    }
    if (btn7) {
        btn7.style.background = 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)';
        btn7.style.borderColor = '#4CAF50';
        btn7.style.borderWidth = '3px';
        btn7.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
        btn7.style.transform = 'scale(1)';
    }
    if (btn9) {
        btn9.style.background = 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)';
        btn9.style.borderColor = '#388E3C';
        btn9.style.borderWidth = '3px';
        btn9.style.boxShadow = '0 4px 12px rgba(56, 142, 60, 0.3)';
        btn9.style.transform = 'scale(1)';
    }
    
    // Appliquer la SURBRILLANCE au bouton sélectionné
    if (volume === 6 && btn6) {
        btn6.style.background = 'linear-gradient(135deg, #A5D6A7 0%, #81C784 100%)'; // Plus clair
        btn6.style.borderColor = '#4CAF50';
        btn6.style.borderWidth = '4px';
        btn6.style.boxShadow = '0 0 25px rgba(129, 199, 132, 0.8), 0 0 50px rgba(129, 199, 132, 0.5), inset 0 0 20px rgba(255,255,255,0.3)';
        btn6.style.transform = 'scale(1.08)';
    } else if (volume === 7.2 && btn7) {
        btn7.style.background = 'linear-gradient(135deg, #81C784 0%, #66BB6A 100%)'; // Plus clair
        btn7.style.borderColor = '#388E3C';
        btn7.style.borderWidth = '4px';
        btn7.style.boxShadow = '0 0 25px rgba(102, 187, 106, 0.8), 0 0 50px rgba(102, 187, 106, 0.5), inset 0 0 20px rgba(255,255,255,0.3)';
        btn7.style.transform = 'scale(1.08)';
    } else if (volume === 9 && btn9) {
        btn9.style.background = 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)'; // Plus clair
        btn9.style.borderColor = '#2E7D32';
        btn9.style.borderWidth = '4px';
        btn9.style.boxShadow = '0 0 25px rgba(76, 175, 80, 0.8), 0 0 50px rgba(76, 175, 80, 0.5), inset 0 0 20px rgba(255,255,255,0.3)';
        btn9.style.transform = 'scale(1.08)';
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

// ========== MODULE BOUTEILLES ET SECOURS ==========
// ========== MODULE BOUTEILLES DE GAZ - Gestion des sections ==========
function showBouteillesSection(section) {
    const identificationDiv = document.getElementById('bouteillesIdentification');
    const refroidissementDiv = document.getElementById('bouteillesRefroidissement');
    
    if (!identificationDiv || !refroidissementDiv) return;
    
    // Masquer toutes les sections
    identificationDiv.style.display = 'none';
    refroidissementDiv.style.display = 'none';
    
    // Afficher la section demandée
    if (section === 'identification') {
        identificationDiv.style.display = 'block';
    } else if (section === 'refroidissement') {
        refroidissementDiv.style.display = 'block';
    }
    
    // Scroll vers la section
    setTimeout(() => {
        if (section === 'identification' && identificationDiv) {
            identificationDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (section === 'refroidissement' && refroidissementDiv) {
            refroidissementDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// ========== MODULE BOUTEILLES DE GAZ - Protocoles de refroidissement ==========
// ========== FONCTIONS POPUP REFROIDISSEMENT ==========
function ouvrirPopupRefroidissement(type) {
    if (type === 'standard') {
        document.getElementById('popupProtocoleStandard').style.display = 'block';
        document.body.style.overflow = 'hidden'; // Empêcher le scroll du body
    } else if (type === 'acetylene') {
        document.getElementById('popupProtocoleAcetylene').style.display = 'block';
        document.body.style.overflow = 'hidden'; // Empêcher le scroll du body
    }
}

function fermerPopupRefroidissement(type) {
    if (type === 'standard') {
        document.getElementById('popupProtocoleStandard').style.display = 'none';
        document.body.style.overflow = ''; // Restaurer le scroll du body
    } else if (type === 'acetylene') {
        document.getElementById('popupProtocoleAcetylene').style.display = 'none';
        document.body.style.overflow = ''; // Restaurer le scroll du body
    }
}

// Ancienne fonction conservée pour compatibilité (mais non utilisée)
function afficherProtocoleRefroidissement(type) {
    // Cette fonction est désormais obsolète mais conservée pour compatibilité
    ouvrirPopupRefroidissement(type);
}

// ========== MODULE SECOURS ROUTIER - Gestion des sections ==========
function showSRSection(section) {
    const mgoSection = document.getElementById('sectionMGO');
    const airbagSection = document.getElementById('sectionAirbag');
    const charteSection = document.getElementById('sectionCharte');
    const btnMGO = document.getElementById('btnMGO');
    const btnAirbag = document.getElementById('btnAirbag');
    const btnCharte = document.getElementById('btnCharte');
    
    if (!mgoSection || !airbagSection || !charteSection) return;
    
    // Masquer toutes les sections
    mgoSection.style.display = 'none';
    airbagSection.style.display = 'none';
    charteSection.style.display = 'none';
    
    // Réinitialiser les styles des boutons
    if (btnMGO) {
        btnMGO.style.background = 'linear-gradient(135deg, #E53935 0%, #C62828 100%)';
        btnMGO.style.opacity = '0.6';
    }
    if (btnAirbag) {
        btnAirbag.style.background = 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)';
        btnAirbag.style.opacity = '0.6';
    }
    if (btnCharte) {
        btnCharte.style.background = 'linear-gradient(135deg, #42A5F5 0%, #1E88E5 100%)';
        btnCharte.style.opacity = '0.6';
    }
    
    // Afficher la section demandée et mettre en évidence le bouton
    if (section === 'mgo') {
        mgoSection.style.display = 'block';
        if (btnMGO) {
            btnMGO.style.opacity = '1';
            btnMGO.style.boxShadow = '0 0 20px rgba(229, 57, 53, 0.6)';
        }
    } else if (section === 'airbag') {
        airbagSection.style.display = 'block';
        if (btnAirbag) {
            btnAirbag.style.opacity = '1';
            btnAirbag.style.boxShadow = '0 0 20px rgba(255, 152, 0, 0.6)';
        }
    } else if (section === 'charte') {
        charteSection.style.display = 'block';
        if (btnCharte) {
            btnCharte.style.opacity = '1';
            btnCharte.style.boxShadow = '0 0 20px rgba(66, 165, 245, 0.6)';
        }
    }
    
    // Scroll vers la section
    setTimeout(() => {
        if (section === 'mgo' && mgoSection) {
            mgoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (section === 'airbag' && airbagSection) {
            airbagSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (section === 'charte' && charteSection) {
            charteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}


// ========== MODULE EXTINCTEURS ==========
let classFeuSelectionnee = '';

function selectionnerClasseFeu(classe) {
    classFeuSelectionnee = classe;
    
    // Mettre à jour les styles des cartes
    const cards = document.querySelectorAll('.fire-class-card');
    cards.forEach(card => {
        card.classList.remove('selected');
    });
    
    // Mettre en évidence la carte sélectionnée
    event.target.closest('.fire-class-card').classList.add('selected');
    
    // Afficher les extincteurs appropriés
    afficherExtincteursAptes();
}

function afficherExtincteursAptes() {
    const resultDiv = document.getElementById('extincteurResult');
    if (!resultDiv || !classFeuSelectionnee) return;
    
    // Base de données des extincteurs par classe de feu
    const extincteurs = {
        'A': {
            titre: 'Feux de classe A - Feux secs',
            icone: '🪵',
            couleur: '#8B4513',
            agents: [
                { nom: 'Eau pulvérisée + additif', capacite: '6 litres minimum', efficacite: '⭐⭐⭐⭐⭐', note: 'Le plus efficace sur les feux de classe A' },
                { nom: 'Poudre ABC', capacite: '6 kg minimum', efficacite: '⭐⭐⭐⭐', note: 'Polyvalent mais salissant' },
                { nom: 'Mousse (AFFF)', capacite: '6 litres minimum', efficacite: '⭐⭐⭐⭐', note: 'Bon refroidissement' }
            ],
            distances: '3 à 6 mètres',
            technique: 'Attaquer la base des flammes par balayage latéral'
        },
        'B': {
            titre: 'Feux de classe B - Liquides inflammables',
            icone: '🛢️',
            couleur: '#FF4500',
            agents: [
                { nom: 'Poudre BC ou ABC', capacite: '6 kg minimum', efficacite: '⭐⭐⭐⭐⭐', note: 'Extinction rapide par inhibition chimique' },
                { nom: 'CO₂ (Dioxyde de carbone)', capacite: '2 ou 5 kg', efficacite: '⭐⭐⭐⭐', note: 'Propre, sans résidu' },
                { nom: 'Mousse (AFFF)', capacite: '6 litres minimum', efficacite: '⭐⭐⭐⭐', note: 'Forme un tapis isolant' }
            ],
            distances: '1 à 3 mètres',
            technique: 'Ne jamais projeter directement sur le liquide enflammé'
        },
        'C': {
            titre: 'Feux de classe C - Gaz',
            icone: '💨',
            couleur: '#1E90FF',
            agents: [
                { nom: 'Poudre BC ou ABC', capacite: '6 kg minimum', efficacite: '⭐⭐⭐⭐⭐', note: 'Extinction par inhibition chimique' }
            ],
            distances: '2 à 4 mètres',
            technique: '⚠️ PRIORITÉ : Fermer la vanne d\'alimentation en gaz',
            alerte: 'DANGER : Ne jamais éteindre une fuite de gaz enflammée sans couper l\'arrivée de gaz (risque d\'explosion)'
        },
        'D': {
            titre: 'Feux de classe D - Métaux',
            icone: '⚙️',
            couleur: '#C0C0C0',
            agents: [
                { nom: 'Poudre spéciale D', capacite: 'Variable selon métal', efficacite: '⭐⭐⭐⭐⭐', note: 'Extincteur spécifique obligatoire' },
                { nom: 'Sable sec', capacite: 'Couverture épaisse', efficacite: '⭐⭐⭐', note: 'En l\'absence d\'extincteur D' }
            ],
            distances: 'Distance de sécurité maximale',
            technique: 'Recouvrir abondamment le métal',
            alerte: '⛔ NE JAMAIS UTILISER : Eau, CO₂, poudre ABC classique (réaction violente possible)'
        },
        'F': {
            titre: 'Feux de classe F - Huiles de cuisson',
            icone: '🍳',
            couleur: '#FF8C00',
            agents: [
                { nom: 'Extincteur classe F (spécifique)', capacite: '2 à 6 litres', efficacite: '⭐⭐⭐⭐⭐', note: 'Agent humide spécial cuisine' },
                { nom: 'Couverture anti-feu', capacite: '1,2 x 1,2 m minimum', efficacite: '⭐⭐⭐⭐', note: 'Étouffement efficace' }
            ],
            distances: '1 à 2 mètres (prudence projections)',
            technique: 'Pulvériser en brouillard fin depuis le haut, jamais directement',
            alerte: '⛔ NE JAMAIS UTILISER : Eau en jet, poudre ABC (projections dangereuses d\'huile)'
        },
        'elect': {
            titre: 'Feux d\'origine électrique - Sous tension',
            icone: '⚡',
            couleur: '#FFD700',
            agents: [
                { nom: 'CO₂ (Dioxyde de carbone)', capacite: '2 ou 5 kg', efficacite: '⭐⭐⭐⭐⭐', note: 'Non conducteur, sans résidu' },
                { nom: 'Poudre ABC', capacite: '6 kg minimum', efficacite: '⭐⭐⭐⭐', note: 'Efficace mais salissant' }
            ],
            distances: '1 mètre minimum de sécurité',
            technique: 'COUPER L\'ALIMENTATION ÉLECTRIQUE EN PRIORITÉ',
            alerte: '⚠️ SÉCURITÉ : Vérifier que l\'extincteur est adapté aux tensions électriques présentes'
        }
    };
    
    const data = extincteurs[classFeuSelectionnee];
    if (!data) return;
    
    let html = `
        <div class="result-box" style="border: 3px solid ${data.couleur}; margin-top: 25px; animation: slideIn 0.5s;">
            <div style="text-align: center; margin-bottom: 25px;">
                <div style="font-size: 4em; margin-bottom: 10px;">${data.icone}</div>
                <h2 style="color: ${data.couleur}; margin: 0;">${data.titre}</h2>
            </div>
    `;
    
    // Alerte spéciale si présente
    if (data.alerte) {
        html += `
            <div class="alert-box" style="background: rgba(255,0,0,0.2); border: 3px solid #ff0000; margin-bottom: 20px;">
                <div style="font-size: 1.3em; font-weight: bold; color: #ff0000; margin-bottom: 10px;">${data.alerte}</div>
            </div>
        `;
    }
    
    // Agents extincteurs
    html += `<h3 style="color: #00ccff; border-bottom: 2px solid #00ccff; padding-bottom: 10px; margin-bottom: 20px;">✅ Agents extincteurs appropriés</h3>`;
    
    data.agents.forEach(agent => {
        html += `
            <div style="background: rgba(0,204,255,0.1); border-left: 4px solid #00ccff; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                <div style="font-size: 1.3em; font-weight: bold; color: #00ccff; margin-bottom: 8px;">${agent.nom}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
                    <div style="color: #FF9800;">📦 ${agent.capacite}</div>
                    <div style="color: #4CAF50;">${agent.efficacite}</div>
                </div>
                <div style="color: #212121; font-size: 0.95em; font-weight: 600;">💡 ${agent.note}</div>
            </div>
        `;
    });
    
    // Distance et technique
    html += `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0;">
            <div class="info-card" style="background: rgba(255,165,0,0.2); border: 2px solid #ff6600;">
                <div style="font-size: 0.9em; color: #FF9800; margin-bottom: 5px;">📏 Distance d'attaque</div>
                <div style="font-size: 1.2em; font-weight: bold; color: #212121;">${data.distances}</div>
            </div>
            <div class="info-card" style="background: rgba(0,255,0,0.1); border: 2px solid #4CAF50;">
                <div style="font-size: 0.9em; color: #4CAF50; margin-bottom: 5px;">🎯 Technique</div>
                <div style="font-size: 1em; font-weight: bold; color: #212121;">${data.technique}</div>
            </div>
        </div>
    `;
    
    html += `</div>`;
    
    resultDiv.innerHTML = html;
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateExtincteurs() {
    const surface = parseFloat(document.getElementById('surfaceExtincteur')?.value || 0);
    const typeLocal = document.getElementById('typeLocal')?.value || 'standard';
    
    let besoinsBase = 0;
    let multiplicateur = 1;
    
    // Calcul en fonction du type de local
    switch(typeLocal) {
        case 'standard':
            besoinsBase = Math.ceil(surface / 200); // 1 extincteur par 200m²
            multiplicateur = 1;
            break;
        case 'erp':
            besoinsBase = Math.ceil(surface / 300); // 1 extincteur par 300m²
            multiplicateur = 1;
            break;
        case 'industriel':
            besoinsBase = Math.ceil(surface / 150); // 1 extincteur par 150m²
            multiplicateur = 1.5;
            break;
        case 'risque':
            besoinsBase = Math.ceil(surface / 100); // 1 extincteur par 100m²
            multiplicateur = 2;
            break;
    }
    
    const nbExtincteurs = Math.ceil(besoinsBase * multiplicateur);
    
    const resultDiv = document.getElementById('resultExtincteurs');
    if (resultDiv) {
        resultDiv.innerHTML = `
            <div class="result-box">
                <h3>🧯 Besoins en extincteurs</h3>
                <div class="result-item">
                    <span>Surface à protéger :</span>
                    <span class="result-value">${surface} m²</span>
                </div>
                <div class="result-item">
                    <span>Type de local :</span>
                    <span class="result-value">${typeLocal.toUpperCase()}</span>
                </div>
                <div class="info-card" style="margin: 15px 0;">
                    <div class="label">Nombre d'extincteurs requis</div>
                    <div class="value" style="font-size: 2.5em; color: #ff6600;">${nbExtincteurs}</div>
                </div>
                <div class="alert-box">
                    💡 <strong>Conseil :</strong> Privilégier les extincteurs 6kg/6L minimum
                </div>
            </div>
        `;
    }
}

// ========== MODULE GAZ - Tableau des gaz ==========
function updateTableauGaz() {
    const pression = parseFloat(document.getElementById('pressionGaz')?.value || 300);
    const volume = parseFloat(document.getElementById('volumeGaz')?.value || 6);
    const conso = parseFloat(document.getElementById('consoGaz')?.value || 50);
    
    const volumeAir = pression * volume; // en litres
    const autonomie = volumeAir / conso; // en minutes
    
    const resultDiv = document.getElementById('tableauGazResult');
    if (resultDiv) {
        resultDiv.innerHTML = `
            <div class="result-box">
                <h3>📊 Calcul bouteille</h3>
                <div class="result-item">
                    <span>Volume d'air disponible :</span>
                    <span class="result-value">${volumeAir} L</span>
                </div>
                <div class="info-card" style="margin: 15px 0;">
                    <div class="label">Autonomie</div>
                    <div class="value" style="font-size: 2em; color: #4CAF50;">${autonomie.toFixed(0)} min</div>
                </div>
            </div>
        `;
    }
}

// ========== MODULE EXPLOSIMÉTRIE - Base de données des gaz ==========
gazDatabase = {
    // Alcanes légers (gaz)
    methane: { nom: 'Méthane', formule: 'CH₄', lie: 5.0 },
    ethane: { nom: 'Éthane', formule: 'C₂H₆', lie: 3.0 },
    propane: { nom: 'Propane', formule: 'C₃H₈', lie: 2.1 },
    butane: { nom: 'Butane', formule: 'C₄H₁₀', lie: 1.8 },
    isobutane: { nom: 'Isobutane', formule: 'C₄H₁₀', lie: 1.8 },
    
    // Alcanes liquides (hydrocarbures)
    pentane: { nom: 'Pentane', formule: 'C₅H₁₂', lie: 1.4 },
    hexane: { nom: 'Hexane', formule: 'C₆H₁₄', lie: 1.2 },
    heptane: { nom: 'Heptane', formule: 'C₇H₁₆', lie: 1.05 },
    octane: { nom: 'Octane', formule: 'C₈H₁₈', lie: 1.0 },
    nonane: { nom: 'Nonane', formule: 'C₉H₂₀', lie: 0.85 },
    decane: { nom: 'Décane', formule: 'C₁₀H₂₂', lie: 0.75 },
    dodecane: { nom: 'Dodécane', formule: 'C₁₂H₂₆', lie: 0.6 },
    
    // Alcènes
    ethylene: { nom: 'Éthylène', formule: 'C₂H₄', lie: 2.7 },
    propylene: { nom: 'Propylène', formule: 'C₃H₆', lie: 2.0 },
    butene: { nom: 'Butène', formule: 'C₄H₈', lie: 1.6 },
    
    // Hydrocarbures aromatiques
    benzene: { nom: 'Benzène', formule: 'C₆H₆', lie: 1.2 },
    toluene: { nom: 'Toluène', formule: 'C₇H₈', lie: 1.1 },
    xylene: { nom: 'Xylène', formule: 'C₈H₁₀', lie: 1.0 },
    styrene: { nom: 'Styrène', formule: 'C₈H₈', lie: 1.1 },
    
    // Alcynes
    acetylene: { nom: 'Acétylène', formule: 'C₂H₂', lie: 2.5 },
    
    // Carburants et mélanges
    essence: { nom: 'Essence (mélange)', formule: 'C₄-C₁₂', lie: 1.4 },
    diesel: { nom: 'Diesel/Gazole', formule: 'C₁₀-C₂₂', lie: 0.6 },
    kerosene: { nom: 'Kérosène', formule: 'C₉-C₁₆', lie: 0.7 },
    gpl: { nom: 'GPL (Butane/Propane)', formule: 'C₃-C₄', lie: 1.8 },
    gnr: { nom: 'GNR (Gaz Naturel)', formule: 'CH₄ + C₂H₆', lie: 4.5 },
    gnl: { nom: 'GNL (Gaz Naturel Liquéfié)', formule: 'CH₄', lie: 5.0 },
    gnv: { nom: 'GNV (Gaz Naturel Véhicule)', formule: 'CH₄', lie: 5.0 },
    gpl_auto: { nom: 'GPL Auto', formule: 'C₃H₈/C₄H₁₀', lie: 1.9 },
    
    // Alcools
    methanol: { nom: 'Méthanol', formule: 'CH₃OH', lie: 6.7 },
    ethanol: { nom: 'Éthanol', formule: 'C₂H₅OH', lie: 3.3 },
    propanol: { nom: 'Propanol', formule: 'C₃H₇OH', lie: 2.1 },
    butanol: { nom: 'Butanol', formule: 'C₄H₉OH', lie: 1.4 },
    
    // Éthers
    ether: { nom: 'Éther diéthylique', formule: 'C₄H₁₀O', lie: 1.9 },
    mtbe: { nom: 'MTBE (additif essence)', formule: 'C₅H₁₂O', lie: 1.5 },
    
    // Cétones
    acetone: { nom: 'Acétone', formule: 'C₃H₆O', lie: 2.5 },
    mek: { nom: 'MEK (Butanone)', formule: 'C₄H₈O', lie: 1.8 },
    
    // Esters
    ethyl_acetate: { nom: 'Acétate d\'éthyle', formule: 'C₄H₈O₂', lie: 2.0 },
    
    // Gaz industriels
    hydrogene: { nom: 'Hydrogène', formule: 'H₂', lie: 4.0 },
    monoxyde: { nom: 'Monoxyde de carbone', formule: 'CO', lie: 12.5 },
    sulfure: { nom: 'Sulfure d\'hydrogène', formule: 'H₂S', lie: 4.0 },
    ammoniac: { nom: 'Ammoniac', formule: 'NH₃', lie: 15.0 },
    
    // Autres gaz
    propane_oxy: { nom: 'Oxyde de propylène', formule: 'C₃H₆O', lie: 2.3 },
    butadiene: { nom: 'Butadiène', formule: 'C₄H₆', lie: 2.0 },
    isoprene: { nom: 'Isoprène', formule: 'C₅H₈', lie: 1.5 }
};

gazSelectionne = null;

// Initialiser l'explosimétrie au chargement
function initExplosimetrie() {
    remplirGazPresents();
    updateTableauCorrections();
}

// Remplir la grille de sélection des gaz avec catégories
function remplirGazPresents() {
    const grid = document.getElementById('gazPresentsGrid');
    if (!grid) return;
    
    // Organisation par catégories
    const categories = {
        'Gaz courants': ['butane', 'methane', 'propane', 'gnv', 'acetylene'],
        'GPL (Gaz de Pétrole Liquéfié)': ['isobutane', 'gpl', 'gpl_auto'],
        'GNR et GNL': ['gnr', 'gnl'],
        'Carburants et hydrocarbures légers': ['essence', 'diesel', 'kerosene', 'pentane', 'hexane', 'heptane', 'octane'],
        'Hydrocarbures lourds': ['nonane', 'decane', 'dodecane'],
        'Aromatiques (benzéniques)': ['benzene', 'toluene', 'xylene', 'styrene'],
        'Alcènes et alcynes': ['ethylene', 'propylene', 'butene', 'butadiene', 'isoprene'],
        'Alcools': ['methanol', 'ethanol', 'propanol', 'butanol'],
        'Éthers et cétones': ['ether', 'mtbe', 'acetone', 'mek', 'ethyl_acetate', 'propane_oxy'],
        'Gaz industriels': ['hydrogene', 'monoxyde', 'sulfure', 'ammoniac'],
        'Autres': ['ethane']
    };
    
    let html = '';
    
    for (const [categorie, gazList] of Object.entries(categories)) {
        html += `
            <div style="grid-column: 1 / -1; margin-top: 20px; margin-bottom: 10px;">
                <h4 style="color: #00ccff; font-size: 1.2em; border-bottom: 2px solid #00ccff; padding-bottom: 8px; margin: 0;">${categorie}</h4>
            </div>
        `;
        
        for (const key of gazList) {
            if (gazDatabase[key]) {
                const gaz = gazDatabase[key];
                html += `
                    <button onclick="selectionnerGaz('${key}')" 
                            id="btnGaz-${key}"
                            style="background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%); 
                                   border: 3px solid var(--border-medium); 
                                   padding: 20px; 
                                   border-radius: 12px; 
                                   cursor: pointer; 
                                   transition: all 0.3s;
                                   min-height: 130px;
                                   display: flex;
                                   flex-direction: column;
                                   justify-content: center;
                                   align-items: center;">
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--text-light); margin-bottom: 8px; text-align: center;">${gaz.nom}</div>
                        <div style="font-size: 1em; color: #FF9800; margin-bottom: 8px;">${gaz.formule}</div>
                        <div style="font-size: 0.9em; color: var(--text-secondary);">LIE: ${gaz.lie}%</div>
                    </button>
                `;
            }
        }
    }
    
    grid.innerHTML = html;
}

// Fonction de filtrage des gaz par recherche
function filterGazButtons() {
    const searchInput = document.getElementById('searchGaz');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const grid = document.getElementById('gazPresentsGrid');
    if (!grid) return;
    
    // Si pas de recherche, afficher tous les boutons
    if (searchTerm === '') {
        const allButtons = grid.querySelectorAll('button');
        const allHeaders = grid.querySelectorAll('div[style*="grid-column"]');
        allButtons.forEach(btn => btn.style.display = 'flex');
        allHeaders.forEach(h => h.style.display = 'block');
        return;
    }
    
    // Filtrer les boutons de gaz
    const allButtons = grid.querySelectorAll('button');
    const allHeaders = grid.querySelectorAll('div[style*="grid-column"]');
    
    let hasVisibleInCategory = {};
    
    // D'abord, déterminer quels gaz correspondent à la recherche
    allButtons.forEach(btn => {
        const btnId = btn.id;
        const gazKey = btnId.replace('btnGaz-', '');
        const gaz = gazDatabase[gazKey];
        
        if (gaz) {
            const nom = gaz.nom.toLowerCase();
            const formule = gaz.formule.toLowerCase();
            
            // Vérifier si le terme de recherche correspond au nom ou à la formule
            if (nom.includes(searchTerm) || formule.includes(searchTerm)) {
                btn.style.display = 'flex';
                
                // Marquer que cette catégorie a des éléments visibles
                const categoryHeader = btn.previousElementSibling;
                if (categoryHeader && categoryHeader.querySelector('h4')) {
                    hasVisibleInCategory[categoryHeader.textContent] = true;
                }
            } else {
                btn.style.display = 'none';
            }
        }
    });
    
    // Cacher/afficher les en-têtes de catégories selon s'ils ont des boutons visibles
    allHeaders.forEach(header => {
        const nextElement = header.nextElementSibling;
        let hasVisible = false;
        
        // Parcourir les éléments suivants jusqu'à la prochaine catégorie
        let current = nextElement;
        while (current && !current.querySelector('h4')) {
            if (current.tagName === 'BUTTON' && current.style.display === 'flex') {
                hasVisible = true;
                break;
            }
            current = current.nextElementSibling;
        }
        
        header.style.display = hasVisible ? 'block' : 'none';
    });
}

// Sélectionner un gaz et calculer
function selectionnerGaz(key) {
    gazSelectionne = key;
    
    // Mettre à jour les styles des boutons
    for (const k of Object.keys(gazDatabase)) {
        const btn = document.getElementById(`btnGaz-${k}`);
        if (btn) {
            if (k === key) {
                btn.style.background = 'linear-gradient(135deg, var(--primary-red) 0%, var(--primary-red-dark) 100%)';
                btn.style.borderColor = 'var(--primary-red)';
            } else {
                btn.style.background = 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)';
                btn.style.borderColor = 'var(--border-medium)';
            }
        }
    }
    
    calculerCorrectionGaz();
}

// Calculer la correction pour le gaz sélectionné
function calculerCorrectionGaz() {
    if (!gazSelectionne) return;
    
    const gazEtalon = document.getElementById('gazEtalon').value;
    const valeurAffichee = parseFloat(document.getElementById('valeurExplo').value);
    
    const lieEtalon = gazDatabase[gazEtalon].lie;
    const liePresent = gazDatabase[gazSelectionne].lie;
    
    const facteur = liePresent / lieEtalon;
    const valeurCorrigee = valeurAffichee * facteur;
    
    // Afficher les résultats
    const resultDiv = document.getElementById('resultCorrection');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        
        document.getElementById('gazPresentNom').textContent = gazDatabase[gazSelectionne].nom;
        document.getElementById('valeurCorrigee').textContent = valeurCorrigee.toFixed(1) + ' % LIE';
        
        document.getElementById('detailEtalon').textContent = gazDatabase[gazEtalon].nom;
        document.getElementById('detailLieEtalon').textContent = lieEtalon + ' %';
        document.getElementById('detailGazPresent').textContent = gazDatabase[gazSelectionne].nom;
        document.getElementById('detailLiePresent').textContent = liePresent + ' %';
        document.getElementById('detailFacteur').textContent = facteur.toFixed(3);
        document.getElementById('detailValeurAffichee').textContent = valeurAffichee + ' % LIE';
    }
}

// Mettre à jour le tableau de corrections avec catégories
function updateTableauCorrections() {
    const gazEtalon = document.getElementById('gazEtalon').value;
    const tbody = document.getElementById('bodyTableauFacteurs');
    if (!tbody) return;
    
    const lieEtalon = gazDatabase[gazEtalon].lie;
    
    // Organisation par catégories (même structure que remplirGazPresents)
    const categories = {
        'Gaz courants': ['butane', 'methane', 'propane', 'gnv', 'acetylene'],
        'GPL': ['isobutane', 'gpl', 'gpl_auto'],
        'GNR et GNL': ['gnr', 'gnl'],
        'Carburants': ['essence', 'diesel', 'kerosene', 'pentane', 'hexane', 'heptane', 'octane', 'nonane', 'decane', 'dodecane'],
        'Aromatiques': ['benzene', 'toluene', 'xylene', 'styrene'],
        'Alcènes/Alcynes': ['ethylene', 'propylene', 'butene', 'butadiene', 'isoprene'],
        'Alcools': ['methanol', 'ethanol', 'propanol', 'butanol'],
        'Éthers/Cétones': ['ether', 'mtbe', 'acetone', 'mek', 'ethyl_acetate', 'propane_oxy'],
        'Gaz industriels': ['hydrogene', 'monoxyde', 'sulfure', 'ammoniac'],
        'Autres': ['ethane']
    };
    
    let html = '';
    
    for (const [categorie, gazList] of Object.entries(categories)) {
        // Ligne de titre de catégorie
        html += `
            <tr style="background: rgba(0,204,255,0.2);">
                <td colspan="5" style="font-weight: bold; color: #00ccff; padding: 12px; text-align: left; border-top: 2px solid #00ccff;">
                    ${categorie}
                </td>
            </tr>
        `;
        
        // Lignes des gaz de cette catégorie
        for (const key of gazList) {
            if (gazDatabase[key]) {
                const gaz = gazDatabase[key];
                const facteur = gaz.lie / lieEtalon;
                const isEtalon = key === gazEtalon;
                
                html += `
                    <tr style="background: ${isEtalon ? 'rgba(255,204,0,0.3)' : 'transparent'};">
                        <td style="font-weight: ${isEtalon ? 'bold' : 'normal'}; color: ${isEtalon ? '#FF9800' : 'inherit'};">
                            ${gaz.nom}${isEtalon ? ' ⭐' : ''}
                        </td>
                        <td style="color: ${isEtalon ? '#FF9800' : 'inherit'};">${gaz.formule}</td>
                        <td style="text-align: center; color: #FF9800; font-weight: ${isEtalon ? 'bold' : 'normal'};">${gaz.lie}</td>
                        <td style="text-align: center; font-weight: bold; color: ${isEtalon ? '#FF9800' : '#4CAF50'};">${facteur.toFixed(3)}</td>
                        <td style="font-size: 0.9em; color: var(--text-secondary);">Valeur × ${facteur.toFixed(3)}</td>
                    </tr>
                `;
            }
        }
    }
    
    tbody.innerHTML = html;
}

// Appeler lors du changement de gaz d'étalonnage
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Initialiser l'explosimétrie si on est sur cette page
    if (document.getElementById('gazPresentsGrid')) {
        initExplosimetrie();
    }
    
    // Initialiser les listes pour PATRAC DR
    if (document.getElementById('listeVehiculesEquipages')) {
        afficherVehiculesEquipages();
    }
    if (document.getElementById('listeCA')) {
        afficherCA();
    }
    
    // Initialiser les boutons de pertes de charge
    if (document.getElementById('diametreTroncon')) {
        const diamValue = parseInt(document.getElementById('diametreTroncon')?.value || 70);
        setDiametreTroncon(diamValue);
    }
    if (document.getElementById('pressionLanceTroncon')) {
        const pressValue = parseFloat(document.getElementById('pressionLanceTroncon')?.value || 6);
        setPressionLance(pressValue);
    }
    if (document.getElementById('debitTroncon')) {
        const debitValue = parseInt(document.getElementById('debitTroncon')?.value || 500);
        setDebitLance(debitValue);
    }
    
    // Initialiser les sections GAZ et ELEC avec le premier bouton sélectionné
    if (document.getElementById('btnGazTransport')) {
        showGazType('transport');
    }
    if (document.getElementById('btnElecGeneralites')) {
        showElecType('generalites');
    }
});


// ========== MODAL À PROPOS ==========
function toggleAbout() {
    const modal = document.getElementById('aboutModal');
    modal.classList.toggle('active');
}

function closeAboutIfOutside(event) {
    if (event.target.id === 'aboutModal') {
        toggleAbout();
    }
}

// Fermer avec la touche Échap
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('aboutModal');
        if (modal.classList.contains('active')) {
            toggleAbout();
        }
    }
});

// Gestion du mode sombre
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const icon = document.getElementById('dark-mode-icon');
    if (document.body.classList.contains('dark-mode')) {
        icon.textContent = '☀️';
    } else {
        icon.textContent = '🌙';
    }
}

// Gestion des sections pliables
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const arrow = document.getElementById('arrow-' + sectionId);
    
    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        arrow.classList.remove('rotated');
    } else {
        section.classList.add('collapsed');
        arrow.classList.add('rotated');
    }
    
    // Sauvegarder l'état
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
}

// Restaurer l'état des sections au chargement
function restoreSectionsState() {
    const collapsedSections = JSON.parse(localStorage.getItem('collapsedSections') || '[]');
    collapsedSections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        const arrow = document.getElementById('arrow-' + sectionId);
        if (section && arrow) {
            section.classList.add('collapsed');
            arrow.classList.add('rotated');
        }
    });
}

// Charger le mode sombre au démarrage (VERSION CORRIGÉE POUR IPHONE)
(function() {
    // 1. Gestion du Mode Sombre avec sécurité
    try {
        // On essaie d'accéder à la mémoire
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'enabled') {
            document.body.classList.add('dark-mode');
        }
    } catch (e) {
        // Si ça plante (iPhone), on ne fait rien et on continue sans erreur
        console.log("Mode sombre : Mémoire non disponible sur cet appareil");
    }

    // 2. Mise à jour de l'icône (toujours sûr)
    setTimeout(updateDarkModeIcon, 100);

    // 3. Restauration des sections avec sécurité
    setTimeout(function() {
        try {
            if (typeof restoreSectionsState === "function") {
                restoreSectionsState();
            }
        } catch (e) {
            console.log("Sections : Mémoire non disponible");
        }
    }, 100);
})();
