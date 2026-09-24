/**
 * Vulcain - Module SAL (Sauvetage Aquatique et Plongée)
 * Tables MT2012 et calculs de décompression
 */

let tablesMT2012 = null;

// Charger les tables au démarrage
async function loadTablesMT2012() {
    if (!tablesMT2012) {
        tablesMT2012 = await DataLoader.load('tables_mt2012.json');
    }
    return tablesMT2012;
}

async function calculerPaliers() {
    await loadTablesMT2012();
    
    const profondeur = parseInt(document.getElementById('calc-profondeur').value);
    const temps = parseInt(document.getElementById('calc-temps').value);
    const resultat = document.getElementById('calc-resultat');
    
    if (!profondeur || !temps) {
        resultat.innerHTML = '<p style="text-align: center; color: var(--t-muted, #9E9E9E); font-style: italic;">Sélectionnez profondeur et temps pour calculer</p>';
        return;
    }
    
    const table = tablesMT2012[profondeur];
    if (!table) {
        resultat.innerHTML = '<p style="text-align: center; color: light-dark(#c8180b, #f7756b); font-weight: 700;">❌ Profondeur non disponible dans les tables</p>';
        return;
    }
    
    // Trouver la ligne correspondante (temps immédiatement supérieur ou égal)
    let ligne = null;
    for (let i = 0; i < table.length; i++) {
        if (temps <= table[i].temps) {
            ligne = table[i];
            break;
        }
    }
    
    if (!ligne) {
        // Temps supérieur au maximum de la table
        resultat.innerHTML = `
            <div style="background: var(--t-s2, #FFEBEE); padding: 20px; border-radius: 10px; text-align: center;">
                <div style="font-size: 2em; margin-bottom: 10px;">⛔</div>
                <strong style="color: light-dark(#c22727, #e57e7e); font-size: 1.2em;">TEMPS HORS TABLE</strong>
                <p style="margin-top: 10px;">Le temps de ${temps} min à ${profondeur}m dépasse les limites des tables MT2012.</p>
                <p style="font-size: 0.9em;">Maximum pour cette profondeur : <strong>${table[table.length-1].temps} min</strong></p>
            </div>
        `;
        return;
    }
    
    // Calculer DTR
    const vitesseRemontee = 12; // m/min
    const tempsRemontee = Math.ceil(profondeur / vitesseRemontee);
    
    // Construire le résultat
    let html = '';
    
    // Cas sans palier
    if (ligne.p9 === 0 && ligne.p6 === 0 && ligne.p3 === 0) {
        html = `
            <div style="background: linear-gradient(135deg, var(--t-s2, #E8F5E9) 0%, light-dark(#C8E6C9, #363d3a) 100%); padding: 25px; border-radius: 12px; text-align: center;">
                <div style="font-size: 3em; margin-bottom: 10px;">✅</div>
                <strong style="color: light-dark(#2a722e, #41b147); font-size: 1.5em;">PLONGÉE SANS PALIER</strong>
                <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div style="background: var(--t-s1, #fff); padding: 15px; border-radius: 8px;">
                        <div style="font-size: 0.85em; color: var(--t-muted, #666);">Profondeur</div>
                        <div style="font-size: 1.8em; font-weight: 700; color: light-dark(#1565c0, #5da1ed);">${profondeur}m</div>
                    </div>
                    <div style="background: var(--t-s1, #fff); padding: 15px; border-radius: 8px;">
                        <div style="font-size: 0.85em; color: var(--t-muted, #666);">Temps fond</div>
                        <div style="font-size: 1.8em; font-weight: 700; color: light-dark(#b33f00, #ff7124);">${temps}'</div>
                    </div>
                    <div style="background: var(--t-s1, #fff); padding: 15px; border-radius: 8px;">
                        <div style="font-size: 0.85em; color: var(--t-muted, #666);">DTR</div>
                        <div style="font-size: 1.8em; font-weight: 700; color: light-dark(#7b1fa2, #c77ee6);">${ligne.dtr}'</div>
                    </div>
                </div>
                <div style="margin-top: 15px; padding: 10px; background: var(--t-s1, #fff); border-radius: 8px;">
                    <strong>GPS : ${ligne.gps}</strong> | Remontée : ${vitesseRemontee} m/min
                </div>
            </div>
        `;
    } else {
        // Cas avec paliers
        let paliersHTML = '';
        if (ligne.p9 > 0) {
            paliersHTML += `<div style="background: light-dark(#FFCDD2, #40393c); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 0.9em; color: light-dark(#c22727, #e57e7e);">Palier 9m</div>
                <div style="font-size: 2em; font-weight: 700; color: light-dark(#b71c1c, #eb7c7c);">${ligne.p9}'</div>
            </div>`;
        }
        if (ligne.p6 > 0) {
            paliersHTML += `<div style="background: light-dark(#FFE0B2, #403c36); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 0.9em; color: light-dark(#b33f00, #ff7124);">Palier 6m</div>
                <div style="font-size: 2em; font-weight: 700; color: light-dark(#a24900, #fe7300);">${ligne.p6}'</div>
            </div>`;
        }
        if (ligne.p3 > 0) {
            paliersHTML += `<div style="background: light-dark(#C8E6C9, #363d3a); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 0.9em; color: light-dark(#2a722e, #41b147);">Palier 3m</div>
                <div style="font-size: 2em; font-weight: 700; color: light-dark(#1b5e20, #34b53e);">${ligne.p3}'</div>
            </div>`;
        }
        
        const totalPaliers = ligne.p9 + ligne.p6 + ligne.p3;
        
        html = `
            <div style="background: linear-gradient(135deg, light-dark(#FFF8E1, #40403f) 0%, light-dark(#FFECB3, #403e36) 100%); padding: 25px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 2.5em; margin-bottom: 5px;">⚠️</div>
                    <strong style="color: light-dark(#9f4e07, #f57f17); font-size: 1.4em;">PALIERS OBLIGATOIRES</strong>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                    <div style="background: var(--t-s1, #fff); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.85em; color: var(--t-muted, #666);">Profondeur</div>
                        <div style="font-size: 1.5em; font-weight: 700; color: light-dark(#1565c0, #5da1ed);">${profondeur}m</div>
                    </div>
                    <div style="background: var(--t-s1, #fff); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.85em; color: var(--t-muted, #666);">Temps fond</div>
                        <div style="font-size: 1.5em; font-weight: 700; color: light-dark(#b33f00, #ff7124);">${temps}'</div>
                    </div>
                </div>
                
                <div style="background: var(--t-s1, #fff); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                    <div style="text-align: center; font-weight: 700; color: light-dark(#1a237e, #9098e8); margin-bottom: 15px; font-size: 1.1em;">📊 PALIERS À EFFECTUER</div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px;">
                        ${paliersHTML}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="background: var(--t-s2, #E8EAF6); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.8em; color: light-dark(#3f51b5, #8d98d7);">Total paliers</div>
                        <div style="font-size: 1.3em; font-weight: 700; color: light-dark(#1a237e, #9098e8);">${totalPaliers}'</div>
                    </div>
                    <div style="background: var(--t-s2, #F3E5F5); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.8em; color: light-dark(#7b1fa2, #c77ee6);">DTR</div>
                        <div style="font-size: 1.3em; font-weight: 700; color: light-dark(#4a148c, #b688ee);">${ligne.dtr}'</div>
                    </div>
                    <div style="background: var(--t-s2, #ECEFF1); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.8em; color: light-dark(#506974, #87a1ad);">GPS</div>
                        <div style="font-size: 1.3em; font-weight: 700; color: var(--t-ink, #263238);">${ligne.gps}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    resultat.innerHTML = html;
}

// Exposer globalement
window.calculerPaliers = calculerPaliers;
