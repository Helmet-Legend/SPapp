/**
 * DECIOPS - Commandement : PATRAC DR, DPIF, SMES, SOIEC, SAOIECL
 */
// Restauré depuis js/app.js (version antérieure au commit 4c28be7 du 17/02/2026).

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
                DECIOPS v${APP_VERSION} - Outil d'aide à la décision opérationnelle<br>
                Par les pompiers, pour les pompiers 🚒
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <p style="color: var(--t-muted, #666); font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
                <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">🖨️ Imprimer / Enregistrer PDF</button>
                <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">❌ Fermer</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

let vehiculesPatrac = [];

let caPatrac = [];

let compteurCA = 0;

let vehiculeEnCours = null;

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
    
    titre.innerHTML = `🚒 ${type} - Armement ${armement}<br><span style="font-size: 0.7em; color: light-dark(#945800, #ff9800); font-weight: normal;">💡 Le remplissage de l'équipage est optionnel</span>`;
    
    const config = configVehicules[type];
    let html = '';
    
    config.postes.forEach((poste, index) => {
        html += `
            <div style="background: var(--bg-main); padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 2px solid var(--border-medium);">
                <div style="font-weight: bold; color: light-dark(#006e8a, #00ccff); margin-bottom: 10px; font-size: 1.1em;">${poste}</div>
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
    
    titre.innerHTML = `${type} - ${nbPersonnes} personne(s)<br><span style="font-size: 0.7em; color: light-dark(#945800, #ff9800); font-weight: normal;">💡 Le remplissage de l'équipage est optionnel</span>`;
    document.getElementById('modalNumero').value = vehiculeEnCours.numero;
    
    let html = '';
    
    for (let i = 0; i < nbPersonnes; i++) {
        html += `
            <div style="background: var(--bg-main); padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 2px solid var(--border-medium);">
                <div style="font-weight: bold; color: light-dark(#006e8a, #00ccff); margin-bottom: 10px; font-size: 1.1em;">Personne ${i + 1}</div>
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
        liste.innerHTML = '<div style="color: var(--t-muted, #888); font-style: italic; padding: 10px;">Aucun véhicule ajouté</div>';
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
                        <span style="font-size: 1.5em; font-weight: bold; color: light-dark(#006e8a, #00ccff);">${v.type} ${v.numero}</span>
                        <span style="color: light-dark(#945800, #ff9800); margin-left: 15px; font-size: 1.1em;">Armement ${v.armement}</span>
                    </div>
                    <button onclick="retirerVehiculeEquipage(${index})" style="background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%); border: none; padding: 10px 20px; border-radius: 8px; color: white; cursor: pointer; font-weight: bold; font-size: 1em;">
                        ✕ Retirer
                    </button>
                </div>
                
                ${equipageRenseigne.length > 0 ? `
                    <div style="background: var(--bg-main); padding: 15px; border-radius: 8px;">
                        <div style="font-weight: bold; color: light-dark(#945800, #ff9800); margin-bottom: 10px;">👥 Équipage :</div>
                        ${equipageRenseigne.map(p => `
                            <div style="padding: 8px; margin-bottom: 5px; border-left: 3px solid light-dark(#00ccff, #0c6982); padding-left: 12px;">
                                <span style="color: light-dark(#006e8a, #00ccff); font-weight: bold; min-width: 150px; display: inline-block;">${p.poste}:</span>
                                <span style="color: var(--t-ink, #212121); font-weight: 600;">${p.grade} ${p.nom} ${p.prenom}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div style="color: var(--t-muted, #888); font-style: italic;">Équipage non renseigné</div>'}
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
        liste.innerHTML = '<div style="color: var(--t-muted, #888); font-style: italic; padding: 10px;">Aucun chef d\'agrès ajouté</div>';
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
                <p style="color: var(--t-muted, #666); font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
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
                <p style="color: var(--t-muted, #666); font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
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
                <p style="color: var(--t-muted, #666); font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
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
                <p style="color: var(--t-muted, #666); font-size: 0.9em; margin-bottom: 15px;">💡 Cliquez sur "Imprimer" puis choisissez "Enregistrer en PDF" pour sauvegarder le document</p>
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
