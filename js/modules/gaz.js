/**
 * Vulcain - Explosimétrie : correction des valeurs selon le gaz d'étalonnage
 * Données : data/gaz.json (chargé par js/app.js dans gazDatabase)
 */
// Restauré depuis js/app.js (version antérieure au commit 4c28be7 du 17/02/2026),
// la version suivante ne correspondait plus ni à la page ni à data/gaz.json.

// Initialiser l'explosimétrie au chargement
function initExplosimetrie() {
    // Données non chargées (hors-ligne sans cache) : ne pas bloquer le reste de l'initialisation
    if (Object.keys(gazDatabase).length === 0) return;
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
                <h4 style="color: light-dark(#006e8a, #00ccff); font-size: 1.2em; border-bottom: 2px solid light-dark(#00ccff, #0c6982); padding-bottom: 8px; margin: 0;">${categorie}</h4>
            </div>
        `;
        
        for (const key of gazList) {
            if (gazDatabase[key]) {
                const gaz = gazDatabase[key];
                html += `
                    <button onclick="selectionnerGaz('${key}')" 
                            id="btnGaz-${key}"
                            style="background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%); color: var(--t-ink); 
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
                        <div style="font-size: 1em; color: light-dark(#945800, #ff9800); margin-bottom: 8px;">${gaz.formule}</div>
                        <div style="font-size: 0.9em; color: var(--text-secondary);">LIE: ${gaz.lie}%</div>
                    </button>
                `;
            }
        }
    }
    
    grid.innerHTML = html;
    // Recherche tapée avant la fin du chargement : on l'applique à la liste
    filterGazButtons();
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
                <td colspan="5" style="font-weight: bold; color: light-dark(#006e8a, #00ccff); padding: 12px; text-align: left; border-top: 2px solid light-dark(#00ccff, #0c6982);">
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
                        <td style="font-weight: ${isEtalon ? 'bold' : 'normal'}; color: ${isEtalon ? 'light-dark(#9e5e00, #ff9800)' : 'inherit'};">
                            ${gaz.nom}${isEtalon ? ' ⭐' : ''}
                        </td>
                        <td style="color: ${isEtalon ? 'light-dark(#9e5e00, #ff9800)' : 'inherit'};">${gaz.formule}</td>
                        <td style="text-align: center; color: light-dark(#945800, #ff9800); font-weight: ${isEtalon ? 'bold' : 'normal'};">${gaz.lie}</td>
                        <td style="text-align: center; font-weight: bold; color: ${isEtalon ? 'light-dark(#9e5e00, #ff9800)' : 'light-dark(#2e7d32, #6fcf76)'};">${facteur.toFixed(3)}</td>
                        <td style="font-size: 0.9em; color: var(--text-secondary);">Valeur × ${facteur.toFixed(3)}</td>
                    </tr>
                `;
            }
        }
    }
    
    tbody.innerHTML = html;
}

// Changement du gaz d'étalonnage (appelé par le menu déroulant)
function updateTableauGaz() {
    updateTableauCorrections();
    if (gazSelectionne) calculerCorrectionGaz();
}

// Boutons − / + de la valeur lue
function adjustValeurExplo(delta) {
    const input = document.getElementById('valeurExplo');
    if (!input) return;
    input.value = Math.max(0, Math.min(100, (parseFloat(input.value) || 0) + delta));
    if (gazSelectionne) calculerCorrectionGaz();
}
