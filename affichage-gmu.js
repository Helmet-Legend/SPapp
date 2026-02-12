// ========== AFFICHAGE DES FICHES GMU ==========

function afficherFicheGMU(numeroONU, nomMatiere, classe) {
    // Trouver le guide associé
    const numeroGuide = onuVersGuide[numeroONU] || "111"; // Guide par défaut si non trouvé
    const guide = guidesGMU[numeroGuide];
    
    if (!guide) {
        return `
            <div style="padding: 30px; text-align: center; background: var(--bg-card); border-radius: 15px; border: 3px solid #FF9800;">
                <div style="font-size: 3em; margin-bottom: 15px;">⚠️</div>
                <h3 style="color: var(--primary-red);">Guide GMU non disponible</h3>
                <p style="color: var(--text-secondary);">Le guide d'intervention pour ce produit n'est pas encore dans la base.</p>
                <p style="color: var(--text-secondary); font-style: italic; margin-top: 20px;">Numéro ONU: ${numeroONU} - Guide ${numeroGuide}</p>
            </div>
        `;
    }
    
    // Construire la fiche orange style GMU
    let html = `
        <div style="background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%); padding: 3px; border-radius: 15px; margin: 20px 0; box-shadow: 0 8px 20px rgba(255,107,0,0.3);">
            <div style="background: var(--bg-card); border-radius: 12px; padding: 0; overflow: hidden;">
                
                <!-- En-tête orange -->
                <div style="background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%); padding: 25px; text-align: center; border-bottom: 5px solid #FF6B00;">
                    <div style="font-size: 2.5em; font-weight: bold; color: white; margin-bottom: 10px;">GUIDE ${numeroGuide}</div>
                    <h3 style="color: white; margin: 0; font-size: 1.5em; font-weight: 600;">${guide.titre}</h3>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid rgba(255,255,255,0.3);">
                        <div style="color: white; font-size: 1.1em;"><strong>UN${numeroONU}</strong> - ${nomMatiere}</div>
                        ${guide.pointEclair ? `<div style="color: white; font-size: 1em; margin-top: 5px; background: rgba(255,0,0,0.3); display: inline-block; padding: 5px 15px; border-radius: 8px;"><strong>Point éclair:</strong> ${guide.pointEclair}</div>` : ''}
                    </div>
                </div>
                
                <div style="padding: 30px;">
    `;
    
    // RISQUES POTENTIELS
    html += `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #FF6B00; border-bottom: 3px solid #FF6B00; padding-bottom: 10px; margin-bottom: 15px; font-size: 1.6em;">
                ⚠️ RISQUES POTENTIELS
            </h3>
    `;
    
    if (guide.risques.incendie) {
        html += `
            <div style="background: rgba(255,0,0,0.1); padding: 20px; border-radius: 12px; margin-bottom: 15px; border-left: 5px solid #FF0000;">
                <h4 style="color: #FF0000; margin: 0 0 15px 0; font-size: 1.3em; font-weight: 700;">🔥 INCENDIE OU EXPLOSION</h4>
                <ul style="margin: 0; padding-left: 25px; line-height: 1.8; color: var(--text-primary);">
                    ${guide.risques.incendie.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (guide.risques.sante) {
        html += `
            <div style="background: rgba(255,165,0,0.1); padding: 20px; border-radius: 12px; border-left: 5px solid #FFA500;">
                <h4 style="color: #FF8C00; margin: 0 0 15px 0; font-size: 1.3em; font-weight: 700;">☠️ SANTÉ</h4>
                <ul style="margin: 0; padding-left: 25px; line-height: 1.8; color: var(--text-primary);">
                    ${guide.risques.sante.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    html += `</div>`;
    
    // SÉCURITÉ PUBLIQUE
    html += `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #0066CC; border-bottom: 3px solid #0066CC; padding-bottom: 10px; margin-bottom: 15px; font-size: 1.6em;">
                🚨 SÉCURITÉ PUBLIQUE
            </h3>
            <div style="background: rgba(0,102,204,0.1); padding: 20px; border-radius: 12px; border-left: 5px solid #0066CC;">
                <ul style="margin: 0; padding-left: 25px; line-height: 1.8; color: var(--text-primary);">
                    ${guide.securitePublique.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    // VÊTEMENTS DE PROTECTION (EPI)
    html += `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #4CAF50; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; margin-bottom: 15px; font-size: 1.6em;">
                👕 VÊTEMENTS DE PROTECTION (EPI)
            </h3>
            <div style="background: rgba(76,175,80,0.1); padding: 20px; border-radius: 12px; border-left: 5px solid #4CAF50;">
                <ul style="margin: 0; padding-left: 25px; line-height: 1.8; color: var(--text-primary);">
                    ${guide.epi.map(e => `<li>${e}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    // ÉVACUATION
    html += `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #9C27B0; border-bottom: 3px solid #9C27B0; padding-bottom: 10px; margin-bottom: 15px; font-size: 1.6em;">
                🚁 ÉVACUATION - DISTANCES DE SÉCURITÉ
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <div style="background: rgba(156,39,176,0.1); padding: 20px; border-radius: 12px; border-left: 5px solid #9C27B0; text-align: center;">
                    <div style="font-size: 0.9em; color: #9C27B0; font-weight: 600; margin-bottom: 10px;">Mesure immédiate</div>
                    <div style="font-size: 2em; font-weight: bold; color: var(--primary-red);">${guide.evacuation.immediat}</div>
                </div>
                ${guide.evacuation.deversementMajeur ? `
                <div style="background: rgba(255,152,0,0.1); padding: 20px; border-radius: 12px; border-left: 5px solid #FF9800; text-align: center;">
                    <div style="font-size: 0.9em; color: #FF9800; font-weight: 600; margin-bottom: 10px;">Déversement majeur</div>
                    <div style="font-size: 2em; font-weight: bold; color: var(--primary-red);">${guide.evacuation.deversementMajeur}</div>
                </div>
                ` : ''}
                <div style="background: rgba(244,67,54,0.1); padding: 20px; border-radius: 12px; border-left: 5px solid #F44336; text-align: center;">
                    <div style="font-size: 0.9em; color: #F44336; font-weight: 600; margin-bottom: 10px;">Incendie de citerne</div>
                    <div style="font-size: 2em; font-weight: bold; color: var(--primary-red);">${guide.evacuation.incendie}</div>
                </div>
            </div>
        </div>
    `;
    
    // MESURES D'URGENCE
    html += `
        <div style="margin-bottom: 30px;">
            <h3 style="color: #FF6B00; border-bottom: 3px solid #FF6B00; padding-bottom: 10px; margin-bottom: 15px; font-size: 1.6em;">
                🧯 MESURES D'URGENCE
            </h3>
    `;
    
    // INCENDIE
    if (guide.mesures.incendie) {
        html += `
            <div style="background: rgba(255,0,0,0.1); padding: 20px; border-radius: 12px; margin-bottom: 15px; border-left: 5px solid #FF0000;">
                <h4 style="color: #FF0000; margin: 0 0 15px 0; font-size: 1.3em; font-weight: 700;">🔥 INCENDIE</h4>
        `;
        
        if (guide.mesures.incendie.attention) {
            html += `
                <div style="background: rgba(255,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 2px solid #FF0000;">
                    <strong style="color: #FF0000;">⚠️ ATTENTION :</strong>
                    <ul style="margin: 10px 0 0 0; padding-left: 25px;">
                        ${guide.mesures.incendie.attention.map(a => `<li>${a}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (guide.mesures.incendie.mineur) {
            html += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: var(--text-primary); font-size: 1.1em;">Incendie mineur :</strong>
                    <ul style="margin: 5px 0 0 0; padding-left: 25px; line-height: 1.8;">
                        ${guide.mesures.incendie.mineur.map(m => `<li>${m}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (guide.mesures.incendie.majeur) {
            html += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: var(--text-primary); font-size: 1.1em;">Incendie majeur :</strong>
                    <ul style="margin: 5px 0 0 0; padding-left: 25px; line-height: 1.8;">
                        ${guide.mesures.incendie.majeur.map(m => `<li>${m}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (guide.mesures.incendie.citerne) {
            html += `
                <div>
                    <strong style="color: var(--text-primary); font-size: 1.1em;">Incendie impliquant des citernes :</strong>
                    <ul style="margin: 5px 0 0 0; padding-left: 25px; line-height: 1.8;">
                        ${guide.mesures.incendie.citerne.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        html += `</div>`;
    }
    
    // DÉVERSEMENT OU FUITE
    if (guide.mesures.deversement) {
        html += `
            <div style="background: rgba(33,150,243,0.1); padding: 20px; border-radius: 12px; border-left: 5px solid #2196F3;">
                <h4 style="color: #2196F3; margin: 0 0 15px 0; font-size: 1.3em; font-weight: 700;">💧 DÉVERSEMENT OU FUITE</h4>
                <ul style="margin: 0; padding-left: 25px; line-height: 1.8; color: var(--text-primary);">
                    ${guide.mesures.deversement.map(d => `<li>${d}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    html += `</div>`;
    
    // PREMIERS SOINS
    html += `
        <div style="margin-bottom: 20px;">
            <h3 style="color: #E91E63; border-bottom: 3px solid #E91E63; padding-bottom: 10px; margin-bottom: 15px; font-size: 1.6em;">
                ⚕️ PREMIERS SOINS
            </h3>
            <div style="background: rgba(233,30,99,0.1); padding: 20px; border-radius: 12px; border-left: 5px solid #E91E63;">
    `;
    
    if (Array.isArray(guide.premiersSoins)) {
        html += `<ul style="margin: 0; padding-left: 25px; line-height: 1.8; color: var(--text-primary);">
            ${guide.premiersSoins.map(ps => `<li>${ps}</li>`).join('')}
        </ul>`;
    } else {
        html += `<p style="margin: 0; color: var(--text-primary); font-size: 1.1em;">${guide.premiersSoins}</p>`;
    }
    
    html += `
            </div>
        </div>
    `;
    
    // Note importante
    if (guide.attention) {
        html += `
            <div style="background: rgba(255,193,7,0.2); padding: 20px; border-radius: 12px; border: 3px solid #FFC107; margin-top: 20px;">
                <strong style="color: #F57C00; font-size: 1.2em;">⚠️ ATTENTION :</strong>
                <p style="margin: 10px 0 0 0; color: var(--text-primary); line-height: 1.6;">${guide.attention}</p>
            </div>
        `;
    }
    
    html += `
                </div> <!-- fin padding -->
            </div> <!-- fin bg-card -->
        </div> <!-- fin bordure orange -->
    `;
    
    return html;
}

// Fonction pour afficher la fiche depuis le module TMD
function afficherFicheTMD(numeroONU, nomMatiere, classe) {
    const resultsDiv = document.getElementById('tmdResults');
    const ficheHTML = afficherFicheGMU(numeroONU, nomMatiere, classe);
    
    resultsDiv.innerHTML = `
        <button class="back-btn" onclick="searchTMD()" style="margin-bottom: 20px;">← Retour à la recherche</button>
        ${ficheHTML}
    `;
    
    // Scroll vers le haut
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
