/**
 * Vulcain - Bouteilles de gaz : identification et refroidissement
 */
// Restauré depuis js/app.js (version antérieure au commit 4c28be7 du 17/02/2026).

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
            <h3 style="color: light-dark(#ad4500, #ff7214); font-size: 2em; text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ff6600;">
                ${data.picto} ${data.nom}
            </h3>
            
            <div style="display: grid; gap: 15px; margin-bottom: 20px;">
                <div style="background: rgba(255,102,0,0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #ff6600;">
                    <strong style="color: light-dark(#ad4500, #ff7214);">🎨 Couleur d'ogive :</strong>
                    <span style="color: var(--t-ink, #212121); font-size: 1.2em; font-weight: bold; margin-left: 10px;">${data.couleur}</span>
                </div>
                
                <div style="background: rgba(255,204,0,0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #FF9800;">
                    <strong style="color: light-dark(#945800, #ff9800);">⚠️ Classification :</strong>
                    <span style="color: var(--t-ink, #212121); font-size: 1.1em; font-weight: 600; margin-left: 10px;">${data.classe}</span>
                </div>
                
                <div style="background: rgba(255,0,0,0.2); padding: 15px; border-radius: 8px; border-left: 4px solid #ff0000;">
                    <strong style="color: light-dark(#cc0000, #ff6b6b);">🚨 Risque principal :</strong>
                    <span style="color: var(--t-ink, #212121); font-size: 1.2em; font-weight: bold; margin-left: 10px;">${data.risque}</span>
                </div>
            </div>
            
            <div style="background: rgba(0,204,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 2px solid light-dark(#00ccff, #0c6982);">
                <h4 style="color: light-dark(#006e8a, #00ccff); margin-bottom: 15px; font-size: 1.3em;">📌 Exemples de gaz</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${data.exemples.map(ex => `<span style="background: rgba(0,204,255,0.2); padding: 8px 15px; border-radius: 20px; color: var(--t-ink, #212121); font-size: 1em; border: 1px solid light-dark(#00ccff, #0c6982);">${ex}</span>`).join('')}
                </div>
            </div>
            
            <div style="background: rgba(255,0,0,0.15); padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 2px solid #ff0000;">
                <h4 style="color: light-dark(#cc0000, #ff6b6b); margin-bottom: 15px; font-size: 1.3em;">⚠️ DANGERS SPÉCIFIQUES</h4>
                <ul style="list-style: none; padding: 0;">
                    ${data.dangers.map(d => `<li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--t-ink, #212121); line-height: 1.6;">▸ ${d}</li>`).join('')}
                </ul>
            </div>
            
            ${couleur === 'marron' ? `
                <div style="background: linear-gradient(135deg, #8B4513 0%, #b75c1a 100%); color: #ffffff; padding: 20px; border-radius: 10px; margin-top: 20px; border: 3px solid #D2691E; text-align: center;">
                    <h4 style="color: #FFFFFF; font-size: 1.4em; margin-bottom: 10px;">⚠️ ATTENTION ACÉTYLÈNE ⚠️</h4>
                    <p style="color: #ffe557; font-size: 1.2em; font-weight: bold; line-height: 1.8;">
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
