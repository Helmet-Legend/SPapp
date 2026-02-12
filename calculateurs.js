// ========== CALCULATEUR ÉPUISEMENT ==========

let currentShape = 'rectangle';
let materiels = {
    mat15: 0,
    mat30: 0,
    mat60: 0
};

function selectShape(shape) {
    currentShape = shape;
    
    document.getElementById('dimensions-rectangle').style.display = shape === 'rectangle' ? 'block' : 'none';
    document.getElementById('dimensions-carre').style.display = shape === 'carre' ? 'block' : 'none';
    document.getElementById('dimensions-cercle').style.display = shape === 'cercle' ? 'block' : 'none';
    
    ['rectangle', 'carre', 'cercle'].forEach(s => {
        document.getElementById('shape-' + s).classList.remove('active');
    });
    document.getElementById('shape-' + shape).classList.add('active');
    
    calculateEpuisement();
}

function modifierQuantite(type, delta) {
    materiels[type] = Math.max(0, materiels[type] + delta);
    document.getElementById('qty-' + type).textContent = materiels[type];
    calculateEpuisement();
}

function calculateEpuisement() {
    let surface = 0;
    
    if (currentShape === 'rectangle') {
        const longueur = parseFloat(document.getElementById('longueur').value) || 0;
        const largeur = parseFloat(document.getElementById('largeur').value) || 0;
        surface = longueur * largeur;
    } else if (currentShape === 'carre') {
        const cote = parseFloat(document.getElementById('cote').value) || 0;
        surface = cote * cote;
    } else if (currentShape === 'cercle') {
        const diametre = parseFloat(document.getElementById('diametre').value) || 0;
        const rayon = diametre / 2;
        surface = Math.PI * rayon * rayon;
    }
    
    let hauteur = parseFloat(document.getElementById('hauteur').value) || 0;
    const uniteHauteur = document.getElementById('uniteHauteur').value;
    if (uniteHauteur === 'cm') {
        hauteur = hauteur / 100;
    }
    
    const volumeM3 = surface * hauteur;
    const volumeL = volumeM3 * 1000;
    
    document.getElementById('volumeEau').textContent = `${volumeL.toFixed(0)} L (${volumeM3.toFixed(2)} m³)`;
    
    const debit15 = materiels.mat15 * 15;
    const debit30 = materiels.mat30 * 30;
    const debit60 = materiels.mat60 * 60;
    const debitTotal = debit15 + debit30 + debit60;
    
    if (debitTotal > 0) {
        const tempsHeures = volumeM3 / debitTotal;
        const tempsMinutes = tempsHeures * 60;
        
        document.getElementById('resultatMateriel').style.display = 'block';
        document.getElementById('mesuresSecurite').style.display = 'block';
        document.getElementById('tempsTotalEpuis').textContent = `${Math.ceil(tempsMinutes)} min`;
        
        let detail = '<div style="display: grid; gap: 10px;">';
        if (materiels.mat15 > 0) {
            detail += `<div>💧 <strong>${materiels.mat15}x 15 m³/h</strong> = ${debit15} m³/h</div>`;
        }
        if (materiels.mat30 > 0) {
            detail += `<div>💧 <strong>${materiels.mat30}x 30 m³/h</strong> = ${debit30} m³/h</div>`;
        }
        if (materiels.mat60 > 0) {
            detail += `<div>💧 <strong>${materiels.mat60}x 60 m³/h</strong> = ${debit60} m³/h</div>`;
        }
        detail += `<div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #4CAF50; font-size: 1.2em;"><strong>Débit total :</strong> ${debitTotal} m³/h</div>`;
        detail += '</div>';
        document.getElementById('detailMateriel').innerHTML = detail;
    } else {
        document.getElementById('resultatMateriel').style.display = 'none';
        document.getElementById('mesuresSecurite').style.display = 'none';
    }
}

// ========== CALCULATEUR ABAQUE ==========

const materiaux = {
    'Béton armé': 2500,
    'Béton': 2300,
    'Brique creuse': 900,
    'Brique pleine': 1800,
    'Parpaing': 1300,
    'Bois (moyenne)': 600,
    'Acier': 7850,
    'Aluminium': 2700,
    'Verre': 2500,
    'Eau': 1000,
    'Terre': 1700,
    'Sable': 1600,
    'Graviers': 1500,
    'Plâtre': 1200,
    'Polystyrène': 30,
    'Laine de verre': 25
};

function calculateAbaqueAll() {
    const longueur = parseFloat(document.getElementById('abaque-longueur').value) || 0;
    const largeur = parseFloat(document.getElementById('abaque-largeur').value) || 0;
    const hauteur = parseFloat(document.getElementById('abaque-hauteur').value) || 0;
    
    const volume = longueur * largeur * hauteur;
    
    document.getElementById('abaque-volume-display').textContent = `${volume.toFixed(2)} m³`;
    document.getElementById('abaque-volume-litres').textContent = `${(volume * 1000).toFixed(0)} litres`;
    
    let html = '<div style="display: grid; gap: 15px;">';
    
    for (const [nom, densite] of Object.entries(materiaux)) {
        const poids = volume * densite;
        const tonnes = poids / 1000;
        
        let couleur = '#4CAF50';
        if (tonnes > 10) couleur = '#FF9800';
        if (tonnes > 50) couleur = '#F44336';
        
        html += `
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 15px; padding: 15px; background: var(--bg-card); border-radius: 10px; border-left: 5px solid ${couleur}; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <div>
                    <div style="font-size: 1.2em; font-weight: bold; color: var(--text-primary);">${nom}</div>
                    <div style="font-size: 0.9em; color: var(--text-secondary);">Densité: ${densite} kg/m³</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.8em; font-weight: bold; color: ${couleur};">${tonnes.toFixed(2)} t</div>
                    <div style="font-size: 0.9em; color: var(--text-secondary);">${poids.toFixed(0)} kg</div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    document.getElementById('abaque-results').innerHTML = html;
}

// ========== CALCULATEUR TEMPS DE TRAJET ==========

let currentVitesse = 50;

function selectVitesse(vitesse) {
    currentVitesse = vitesse;
    
    document.querySelectorAll('.vitesse-btn').forEach(btn => {
        if (parseInt(btn.getAttribute('data-vitesse')) === vitesse) {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
        } else {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
        }
    });
    
    calculateTrajet();
}

function calculateTrajet() {
    const distance = parseFloat(document.getElementById('trajet-distance').value) || 0;
    
    const tempsHeures = distance / currentVitesse;
    const heures = Math.floor(tempsHeures);
    const minutes = Math.round((tempsHeures - heures) * 60);
    
    let affichage = '';
    if (heures > 0) {
        affichage = `${heures}h ${minutes}min`;
    } else {
        affichage = `${minutes}min`;
    }
    
    document.getElementById('trajet-temps').textContent = affichage;
    document.getElementById('trajet-dist-display').textContent = `${distance.toFixed(1)} km`;
    document.getElementById('trajet-vitesse-display').textContent = `${currentVitesse} km/h`;
}

// Initialiser les calculateurs au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser épuisement si le module existe
    if (document.getElementById('volumeEau')) {
        calculateEpuisement();
    }
    
    // Initialiser abaque si le module existe
    if (document.getElementById('abaque-results')) {
        calculateAbaqueAll();
    }
    
    // Initialiser trajet si le module existe
    if (document.getElementById('trajet-result')) {
        calculateTrajet();
    }
});
