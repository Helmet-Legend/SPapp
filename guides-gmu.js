/**
 * ═══════════════════════════════════════════════════════════════════════
 * DÉCIOPS - GUIDES GMU COMPLETS + ASSOCIATIONS ONU
 * Fiches d'intervention d'urgence - Matières dangereuses
 * Version corrigée pour la France (18, ARI)
 * ═══════════════════════════════════════════════════════════════════════
 */

const guidesGMU = {

"111": {
    titre: "Chargement mixte / Non-identifié",
    risques: {
        incendie: ["Peut exploser sous chaleur, choc, friction ou contamination", "Peut réagir violemment au contact de l'eau", "Les contenants peuvent exploser lorsque chauffés"],
        sante: ["L'inhalation ou contact peut causer graves blessures ou mort", "Asphyxie possible sans avertissement", "Un feu peut produire des gaz toxiques"]
    },
    securitePublique: ["APPELER le 18 (Sapeurs-Pompiers) ou le 112", "Éloigner les personnes non autorisées", "Garder le vent dans le dos, rester en hauteur"],
    epi: ["Porter un Appareil Respiratoire Isolant (ARI) à pression positive", "Vêtements de protection pour feux : protection chimique limitée"],
    evacuation: { immediat: "Isoler 100 mètres minimum", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée"], majeur: ["Eau pulvérisée ou brouillard"], citerne: ["Refroidir avec eau abondante", "Se retirer si sifflement ou décoloration"] },
        deversement: ["Ne pas toucher le produit", "ÉLIMINER toute source d'ignition", "Équipement mis à la terre"]
    },
    premiersSoins: ["Transporter à l'air frais", "Rincer à grande eau si contact"]
},

"112": {
    titre: "Explosifs - Division 1.1, 1.2, 1.3",
    risques: {
        incendie: ["PEUT EXPLOSER ET PROJETER DES FRAGMENTS sur 1600 mètres", "Chaleur, chocs, friction peuvent provoquer détonation"],
        sante: ["Un feu peut produire des gaz toxiques", "Forces d'explosion peuvent être fatales"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Isoler immédiatement 500 mètres"],
    epi: ["Porter un ARI à pression positive"],
    evacuation: { immediat: "Isoler 500 mètres", incendie: "ISOLER 1600 mètres dans toutes les directions" },
    mesures: {
        incendie: { attention: ["NE PAS combattre si feu atteint la cargaison - ÉVACUER"], mineur: ["Eau abondante uniquement"], majeur: ["Se retirer et laisser brûler"] },
        deversement: ["Ne pas toucher", "Ne pas déplacer contenants endommagés"]
    },
    premiersSoins: ["Traiter blessures dues aux projections"]
},

"115": {
    titre: "Gaz - Inflammables (incluant liquides réfrigérés)",
    risques: {
        incendie: ["EXTRÊMEMENT INFLAMMABLE", "Mélanges explosifs avec l'air", "Vapeurs plus lourdes que l'air", "Retour de flamme possible", "Les contenants peuvent exploser"],
        sante: ["Asphyxie ou étourdissements possibles", "Contact cryogénique : brûlures et engelures"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos", "Aérer endroits clos avant accès"],
    epi: ["Porter un ARI à pression positive", "Vêtements thermiques pour liquides cryogéniques"],
    evacuation: { immediat: "Isoler 100 mètres", deversementMajeur: "Évacuer 800 mètres sous le vent", incendie: "Si citerne : ISOLER 1600 mètres" },
    mesures: {
        incendie: { attention: ["Ne pas éteindre fuite enflammée sauf si on peut arrêter la fuite"], mineur: ["Poudre chimique sèche", "CO2"], majeur: ["Eau pulvérisée"], citerne: ["Distance maximale", "Refroidir longtemps après extinction", "Se retirer si sifflement"] },
        deversement: ["ÉLIMINER toute source d'ignition", "Équipement mis à la terre", "Arrêter la fuite si sans risque", "Laisser s'évaporer"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Dégeler engelures à l'eau tiède"]
},

"117": {
    titre: "Gaz - Toxiques - Inflammables",
    risques: {
        incendie: ["EXTRÊMEMENT INFLAMMABLE", "Peut s'enflammer spontanément", "Mélanges explosifs avec l'air", "Les contenants peuvent exploser"],
        sante: ["TRÈS TOXIQUE : fatal si inhalé ou absorbé par la peau", "Contact peut causer graves brûlures et engelures"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos"],
    epi: ["Porter un ARI à pression positive", "Vêtement de protection chimique étanche aux gaz"],
    evacuation: { immediat: "Voir Tableau 1 pour distances d'isolation", incendie: "Si citerne : ISOLER 1600 mètres" },
    mesures: {
        incendie: { attention: ["Ne pas éteindre fuite enflammée sauf si possible d'arrêter la fuite"], mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée"], majeur: ["Eau pulvérisée"], citerne: ["Distance maximale", "Refroidir après extinction", "Se retirer si sifflement"] },
        deversement: ["Ne pas toucher le produit", "Arrêter la fuite si sans risque", "Brouillard d'eau pour réduire émanations"]
    },
    premiersSoins: ["Transporter à l'air frais IMMÉDIATEMENT", "Réanimation (attention contamination)", "Enlever vêtements contaminés", "Laver peau à grande eau", "Effets peuvent être retardés"]
},

"119": {
    titre: "Gaz - Toxiques - Ininflammables",
    risques: {
        incendie: ["Ininflammable mais accélère combustion", "Les contenants peuvent exploser"],
        sante: ["TOXIQUE : peut être fatal si inhalé", "Vapeurs extrêmement irritantes et corrosives", "Contact : brûlures et engelures"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos", "Aérer endroits clos"],
    epi: ["Porter un ARI à pression positive", "Vêtement de protection chimique"],
    evacuation: { immediat: "Voir Tableau 1 - Distances d'isolation", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { mineur: ["Eau pulvérisée", "Poudre chimique sèche"], majeur: ["Eau pulvérisée ou brouillard"], citerne: ["Distance maximale"] },
        deversement: ["Ne pas toucher le produit", "Brouillard d'eau pour réduire émanations", "Isoler zone jusqu'à dispersion"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Rincer yeux 15 min", "Effets peuvent être retardés"]
},

"120": {
    titre: "Gaz - Inertes (incluant liquides réfrigérés)",
    risques: {
        sante: ["Asphyxie sans avertissement en espaces clos", "Contact cryogénique : brûlures et engelures"],
        incendie: ["Gaz ininflammables", "Contenants peuvent exploser si chauffés"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Aérer endroits clos"],
    epi: ["Porter un ARI à pression positive", "Vêtements thermiques pour liquides cryogéniques"],
    evacuation: { immediat: "Isoler 100 mètres", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { general: ["Agent extincteur approprié au feu environnant"], citerne: ["Ne pas appliquer eau au point de fuite (glace)"] },
        deversement: ["Ne pas toucher le produit", "Arrêter la fuite si sans risque", "Laisser s'évaporer", "Aérer la zone"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Dégeler à l'eau tiède"],
    attention: "Liquides cryogéniques : matériaux deviennent fragiles"
},

"122": {
    titre: "Gaz - Comburants (incluant liquides réfrigérés)",
    risques: {
        incendie: ["Non combustible mais ACCÉLÈRE la combustion", "Matériaux saturés d'oxygène s'enflammeront facilement", "Contenants peuvent exploser"],
        sante: ["Asphyxie possible en espaces clos", "Contact cryogénique : brûlures"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Aérer endroits clos"],
    epi: ["Porter un ARI à pression positive", "Vêtements thermiques pour liquides cryogéniques"],
    evacuation: { immediat: "Isoler 100 mètres", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée"], majeur: ["Eau pulvérisée ou mousse"], citerne: ["Distance maximale", "Refroidir après extinction"] },
        deversement: ["Arrêter la fuite si sans risque", "Aérer la zone"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Dégeler à l'eau tiède"]
},

"125": {
    titre: "Gaz - Toxiques et/ou Corrosifs",
    risques: {
        sante: ["TOXIQUE et/ou CORROSIF : peut être fatal si inhalé ou absorbé", "Vapeurs extrêmement irritantes et corrosives", "Contact : brûlures et engelures"],
        incendie: ["Certains peuvent brûler", "Certains réagissent violemment à l'eau", "Contenants peuvent exploser"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos", "Aérer endroits clos"],
    epi: ["Porter un ARI à pression positive", "Vêtement de protection chimique si AUCUN risque d'incendie"],
    evacuation: { immediat: "Isoler 100 mètres", deversement: "Voir Tableau 1", incendie: "Si citerne : ISOLER 1600 mètres" },
    mesures: {
        incendie: { attention: ["Certains réagissent violemment à l'eau"], mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée"], majeur: ["Eau pulvérisée, brouillard ou mousse"], citerne: ["Distance maximale", "Refroidir après extinction", "Se retirer si sifflement", "Incendie majeur : se retirer et laisser brûler"] },
        deversement: ["Ne pas toucher le produit", "Arrêter la fuite si sans risque", "Brouillard d'eau pour réduire émanations", "Isoler zone jusqu'à dispersion"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Enlever vêtements contaminés", "Laver peau à grande eau 15-20 min", "Rincer yeux 15 min"]
},

"127": {
    titre: "Liquides inflammables (miscibles à l'eau / polaires)",
    risques: {
        incendie: ["INFLAMMABLE", "Vapeurs peuvent former mélanges explosifs", "Retour de flamme possible", "Contenants peuvent exploser"],
        sante: ["Inhalation ou contact peut irriter", "Un feu peut produire des gaz toxiques", "Vapeurs peuvent causer étourdissements"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos", "Aérer endroits clos"],
    epi: ["Porter un ARI à pression positive"],
    evacuation: { immediat: "Isoler 50 mètres", deversementMajeur: "Évacuer 300 mètres sous le vent", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { attention: ["Utiliser mousse ANTIALCOOL (AR-AFFF)"], mineur: ["Poudre chimique sèche", "CO2", "Mousse antialcool", "Eau pulvérisée"], majeur: ["Mousse antialcool (AR-AFFF)", "Eau pulvérisée", "Pas de jet direct"], citerne: ["Distance maximale", "Refroidir après extinction"] },
        deversement: ["ÉLIMINER toute source d'ignition", "Équipement mis à la terre", "Arrêter la fuite si sans risque", "Mousse antivapeur pour réduire émanations", "Absorber avec terre sèche"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Enlever vêtements contaminés", "Laver peau au savon et à l'eau", "Rincer yeux 15 min"]
},

"128": {
    titre: "Liquides inflammables (non-miscibles à l'eau)",
    risques: {
        incendie: ["EXTRÊMEMENT INFLAMMABLE", "Vapeurs peuvent former mélanges explosifs", "Retour de flamme possible", "Vapeurs plus lourdes que l'air, s'accumulent dans dépressions", "Risque explosif dans égouts", "Contenants peuvent exploser", "Plusieurs liquides flottent sur l'eau"],
        sante: ["Inhalation ou contact peut irriter", "Un feu peut produire des gaz toxiques", "Vapeurs peuvent causer étourdissements ou asphyxie"]
    },
    securitePublique: ["APPELER le 18 (Sapeurs-Pompiers) ou le 112", "Éloigner les personnes non autorisées", "Garder le vent dans le dos, rester en hauteur", "Aérer endroits clos avant accès"],
    epi: ["Porter un Appareil Respiratoire Isolant (ARI) à pression positive"],
    evacuation: { immediat: "Isoler 50 mètres", deversementMajeur: "Évacuer 300 mètres sous le vent", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { attention: ["Point d'éclair très bas", "L'eau peut être inefficace"], mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée", "Mousse"], majeur: ["Eau pulvérisée ou brouillard", "Mousse", "Pas de jet direct"], citerne: ["Distance maximale ou lances télécommandées", "Refroidir longtemps après extinction", "Ne pas introduire eau dans citerne percée", "Se retirer si sifflement ou décoloration", "Incendie majeur : se retirer et laisser brûler"] },
        deversement: ["ÉLIMINER toute source d'ignition", "Équipement mis à la terre", "Ne pas toucher ou marcher sur le produit", "Arrêter la fuite si sans risque", "Empêcher infiltration dans égouts", "Mousse antivapeur pour réduire émanations", "Absorber avec terre sèche", "Outils antiétincelles"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Oxygène si difficulté respiratoire", "Enlever vêtements contaminés", "Laver peau au savon et à l'eau", "Rincer yeux 15 min", "Refroidir brûlures à l'eau froide", "Ne pas enlever vêtements collés à la peau"]
},

"129": {
    titre: "Liquides inflammables (toxiques)",
    risques: {
        incendie: ["INFLAMMABLE", "Vapeurs peuvent former mélanges explosifs", "Contenants peuvent exploser"],
        sante: ["TOXIQUE : peut causer graves blessures ou mort", "Un feu peut produire des gaz toxiques"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos", "Aérer endroits clos"],
    epi: ["Porter un ARI à pression positive", "Vêtement de protection chimique"],
    evacuation: { immediat: "Isoler 50 mètres", deversementMajeur: "Évacuer 300 mètres sous le vent", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée", "Mousse antialcool"], majeur: ["Eau pulvérisée, brouillard ou mousse antialcool", "Pas de jet direct"], citerne: ["Distance maximale", "Refroidir après extinction"] },
        deversement: ["ÉLIMINER toute source d'ignition", "Équipement mis à la terre", "Arrêter la fuite si sans risque", "Absorber avec terre sèche", "Mousse antivapeur"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Enlever vêtements contaminés", "Laver peau au savon", "NE PAS faire vomir si ingestion", "Effets peuvent être retardés", "Consultation médicale obligatoire"]
},

"131": {
    titre: "Liquides inflammables - Toxiques",
    risques: {
        incendie: ["INFLAMMABLE", "Vapeurs peuvent former mélanges explosifs", "Contenants peuvent exploser"],
        sante: ["Peut être FATAL si inhalé, ingéré ou absorbé par la peau", "Contact peut causer brûlures", "Un feu produit des gaz toxiques"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos"],
    epi: ["Porter un ARI à pression positive", "Vêtement de protection chimique étanche"],
    evacuation: { immediat: "Voir Tableau 1", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée", "Mousse antialcool"], majeur: ["Eau pulvérisée ou mousse antialcool"], citerne: ["Distance maximale", "Refroidir après extinction"] },
        deversement: ["ÉLIMINER toute source d'ignition", "Arrêter la fuite si sans risque", "Absorber avec terre sèche"]
    },
    premiersSoins: ["Transporter à l'air frais IMMÉDIATEMENT", "Réanimation si arrêt respiratoire", "Enlever vêtements contaminés", "Laver peau à grande eau", "NE PAS faire vomir", "Effets peuvent être retardés"]
},

"132": {
    titre: "Liquides inflammables - Corrosifs",
    risques: {
        incendie: ["INFLAMMABLE", "Vapeurs peuvent former mélanges explosifs", "Certains réagissent violemment à l'eau", "Contenants peuvent exploser"],
        sante: ["CORROSIF : graves brûlures à la peau, aux yeux et voies respiratoires", "L'inhalation de vapeurs peut être fatale", "Un feu produit des gaz toxiques"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos"],
    epi: ["Porter un ARI à pression positive", "Vêtement de protection chimique résistant aux acides/bases"],
    evacuation: { immediat: "Isoler 50 mètres", deversementMajeur: "Évacuer 300 mètres sous le vent", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { attention: ["Certains réagissent violemment à l'eau"], mineur: ["Poudre chimique sèche", "CO2", "Mousse antialcool"], majeur: ["Eau pulvérisée, brouillard ou mousse antialcool"], citerne: ["Distance maximale", "Refroidir après extinction"] },
        deversement: ["ÉLIMINER toute source d'ignition", "Ne pas appliquer eau directement (réaction possible)", "Absorber avec terre sèche"]
    },
    premiersSoins: ["Transporter à l'air frais", "Enlever vêtements contaminés IMMÉDIATEMENT", "Laver peau à grande eau 20 min", "Rincer yeux 20 min", "NE PAS faire vomir si ingestion", "Consultation médicale urgente"]
},

"137": {
    titre: "Substances hydroréactives - Inflammables",
    risques: {
        incendie: ["Peut s'enflammer au contact de l'humidité ou de l'eau", "Réaction vigoureuse ou explosive avec l'eau", "Peut produire gaz inflammables/toxiques avec l'eau", "Contenants peuvent exploser"],
        sante: ["Inhalation ou contact peut irriter ou brûler", "Un feu peut produire des gaz toxiques"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos"],
    epi: ["Porter un ARI à pression positive", "Vêtement de protection chimique"],
    evacuation: { immediat: "Isoler 50 mètres", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { attention: ["NE PAS UTILISER D'EAU OU DE MOUSSE", "L'eau provoque réaction violente"], mineur: ["Poudre chimique sèche UNIQUEMENT", "Sable sec, terre sèche"], majeur: ["Sable sec, poudre sèche", "Se retirer et laisser brûler si nécessaire"], citerne: ["Ne JAMAIS appliquer d'eau"] },
        deversement: ["ÉLIMINER toute source d'ignition", "NE PAS mettre d'eau en contact", "Garder le produit au SEC", "Recouvrir de sable sec"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Brosser à sec les particules avant de rincer", "Refroidir brûlures à l'eau une fois particules enlevées"]
},

"153": {
    titre: "Substances toxiques et/ou corrosives (combustibles)",
    risques: {
        incendie: ["Matière combustible", "Contenants peuvent exploser"],
        sante: ["TOXIQUE : inhalation, ingestion ou contact peut être fatal", "Contact peut causer brûlures", "Un feu produit des gaz toxiques"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos"],
    epi: ["Porter un ARI à pression positive", "Vêtement de protection chimique"],
    evacuation: { immediat: "Isoler 50 mètres", deversementMajeur: "Évacuer 300 mètres sous le vent", incendie: "Si citerne : ISOLER 800 mètres" },
    mesures: {
        incendie: { mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée", "Mousse"], majeur: ["Eau pulvérisée, brouillard ou mousse"], citerne: ["Distance maximale", "Refroidir après extinction"] },
        deversement: ["Ne pas toucher le produit", "Arrêter la fuite si sans risque", "Brouillard d'eau pour réduire émanations", "Absorber avec terre sèche"]
    },
    premiersSoins: ["Transporter à l'air frais", "Réanimation si arrêt respiratoire", "Enlever vêtements contaminés", "Laver peau à grande eau 20 min", "Rincer yeux 20 min", "NE PAS faire vomir", "Effets peuvent être retardés"]
},

"154": {
    titre: "Substances corrosives - Acides",
    risques: {
        incendie: ["Incombustible mais peut favoriser combustion", "Certains réagissent violemment à l'eau", "Contenants peuvent exploser"],
        sante: ["CORROSIF : graves brûlures à la peau, aux yeux et voies respiratoires", "Inhalation de vapeurs peut être fatale", "Un feu produit des gaz toxiques"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Éloigner les personnes", "Garder le vent dans le dos"],
    epi: ["Porter un ARI à pression positive", "Vêtement de protection chimique résistant aux acides"],
    evacuation: { immediat: "Isoler 50 mètres", deversementMajeur: "Évacuer 100 mètres sous le vent", incendie: "Si citerne : ISOLER 500 mètres" },
    mesures: {
        incendie: { attention: ["Certains réagissent violemment à l'eau"], mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée (PRUDENCE)"], majeur: ["Eau pulvérisée ou brouillard", "Pas de jet direct"], citerne: ["Distance maximale", "Refroidir avec eau pulvérisée"] },
        deversement: ["Ne pas toucher le produit", "Arrêter la fuite si sans risque", "Neutraliser avec précaution (chaux, bicarbonate)", "Ne pas mettre d'eau directement", "Absorber avec terre sèche"]
    },
    premiersSoins: ["Transporter à l'air frais", "Enlever vêtements contaminés IMMÉDIATEMENT", "Laver peau à grande eau 20-30 min", "Rincer yeux 20-30 min", "NE PAS faire vomir si ingestion", "Faire boire de l'eau si victime consciente", "Consultation médicale urgente"]
},

"157": {
    titre: "Substances radioactives",
    risques: {
        radiation: ["RADIATION - Danger d'irradiation et de contamination", "Colis endommagés présentent risques de contamination"],
        sante: ["Exposition aux rayonnements peut être nocive", "Effets peuvent être retardés (heures, jours, semaines)"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Notifier autorités de radioprotection", "Éloigner les personnes", "Éviter tout contact avec le produit"],
    epi: ["Porter un ARI à pression positive", "Dosimètre recommandé"],
    evacuation: { immediat: "Isoler 50 mètres", colisEndommage: "Isoler 100 à 300 mètres selon indice de transport", incendie: "Évacuer 500 mètres" },
    mesures: {
        incendie: { attention: ["Priorité : empêcher dispersion du matériel radioactif", "Limiter temps d'exposition"], general: ["Agent extincteur approprié", "Ne pas déplacer contenants endommagés"] },
        deversement: ["Ne pas toucher contenants endommagés ou produit", "Recouvrir pour empêcher dispersion", "Ne pas inhaler les poussières", "Contacter spécialistes radioprotection"]
    },
    premiersSoins: ["Transporter à l'air frais", "Enlever et ISOLER vêtements contaminés dans sacs", "Laver peau à grande eau et au savon", "Consultation médicale urgente avec spécialiste", "Informer personnel médical de la nature radioactive"]
},

"163": {
    titre: "Substances radioactives (faible à modéré)",
    risques: {
        radiation: ["RADIATION - Risque faible à modéré", "Colis intacts présentent risque limité"],
        sante: ["Exposition prolongée peut être nocive", "Éviter inhalation de poussières"]
    },
    securitePublique: ["APPELER le 18 ou le 112", "Notifier autorités radioprotection", "Éloigner les personnes"],
    epi: ["ARI si poussières présentes", "Gants de protection", "Dosimètre recommandé"],
    evacuation: { immediat: "Isoler 25 mètres", colisEndommage: "Isoler 50 mètres" },
    mesures: {
        incendie: { general: ["Agent extincteur approprié", "Éviter de disperser le contenu"] },
        deversement: ["Ne pas toucher le produit", "Recouvrir sans manipuler", "Attendre spécialistes"]
    },
    premiersSoins: ["Transporter à l'air frais", "Enlever et isoler vêtements contaminés", "Laver peau au savon et à l'eau", "Consultation médicale"]
}

};


// ═══════════════════════════════════════════════════════════════════════
// ASSOCIATIONS NUMÉROS ONU → GUIDES GMU
// ═══════════════════════════════════════════════════════════════════════

const onuVersGuide = {

    // ========== CLASSE 1 - EXPLOSIFS (Guide 112) ==========
    "0027": "112", "0044": "112", "0081": "112", "0124": "112", "0154": "112",
    "0208": "112", "0209": "112", "0214": "112", "0215": "112", "0216": "112",
    "0217": "112", "0218": "112", "0219": "112", "0220": "112", "0221": "112",
    "0222": "112", "0224": "112", "0225": "112", "0226": "112", "0234": "112",
    "0235": "112", "0236": "112", "0237": "112", "0238": "112", "0240": "112",
    "0241": "112", "0242": "112", "0243": "112", "0244": "112", "0245": "112",
    "0246": "112", "0247": "112", "0248": "112", "0249": "112", "0250": "112",
    "0255": "112", "0257": "112", "0266": "112", "0267": "112", "0268": "112",
    "0271": "112", "0272": "112", "0275": "112", "0276": "112", "0277": "112",
    "0278": "112", "0279": "112", "0280": "112", "0281": "112", "0282": "112",
    "0283": "112", "0284": "112", "0285": "112", "0286": "112", "0287": "112",
    "0288": "112", "0289": "112", "0290": "112", "0291": "112", "0292": "112",
    "0293": "112", "0294": "112", "0295": "112", "0296": "112", "0297": "112",
    "0299": "112", "0300": "112", "0301": "112", "0303": "112", "0305": "112",
    "0306": "112", "0312": "112", "0313": "112", "0314": "112", "0315": "112",
    "0316": "112", "0317": "112", "0318": "112", "0319": "112", "0320": "112",
    "0321": "112", "0322": "112", "0323": "112", "0324": "112", "0325": "112",
    "0326": "112", "0327": "112", "0328": "112", "0329": "112", "0330": "112",
    "0331": "112", "0332": "112", "0333": "112", "0334": "112", "0335": "112",
    "0336": "112", "0337": "112", "0338": "112", "0339": "112", "0340": "112",
    "0341": "112", "0342": "112", "0343": "112", "0344": "112", "0345": "112",
    "0346": "112", "0347": "112", "0348": "112", "0349": "112", "0350": "112",
    "0351": "112", "0352": "112", "0353": "112", "0354": "112", "0355": "112",
    "0356": "112", "0357": "112", "0358": "112", "0359": "112", "0360": "112",
    "0361": "112", "0362": "112", "0363": "112", "0364": "112", "0365": "112",
    "0366": "112", "0367": "112", "0368": "112", "0369": "112", "0370": "112",
    "0371": "112", "0372": "112", "0373": "112", "0374": "112", "0375": "112",
    "0376": "112", "0377": "112", "0378": "112", "0379": "112", "0380": "112",

    // ========== CLASSE 2 - GAZ INFLAMMABLES (Guide 115) ==========
    "1001": "115", "1010": "115", "1011": "115", "1012": "115", "1027": "115",
    "1030": "115", "1032": "115", "1033": "115", "1035": "115", "1036": "115",
    "1037": "115", "1038": "115", "1039": "115", "1049": "115", "1055": "115",
    "1057": "115", "1060": "115", "1061": "115", "1063": "115", "1071": "115",
    "1075": "115", "1077": "115", "1081": "115", "1082": "115", "1083": "115",
    "1085": "115", "1086": "115", "1087": "115", "1954": "115", "1957": "115",
    "1959": "115", "1962": "115", "1964": "115", "1965": "115", "1966": "115",
    "1969": "115", "1971": "115", "1972": "115", "1978": "115", "2200": "115",
    "2419": "115", "2452": "115", "2453": "115", "2454": "115", "3153": "115",
    "3154": "115", "3537": "115",

    // ========== CLASSE 2 - GAZ TOXIQUES INFLAMMABLES (Guide 117) ==========
    "1016": "117", "1023": "117", "1026": "117", "1040": "117", "1053": "117",
    "1064": "117", "1911": "117", "1953": "117", "2188": "117", "2189": "117",
    "2192": "117", "2199": "117", "2202": "117", "2203": "117", "2204": "117",
    "2600": "117", "3305": "117", "3309": "117",

    // ========== CLASSE 2 - GAZ TOXIQUES (Guide 119) ==========
    "1017": "119", "1051": "119", "1062": "119", "1076": "119", "1581": "119",
    "1582": "119", "1955": "119", "1967": "119", "2191": "119",

    // ========== CLASSE 2 - GAZ INERTES (Guide 120) ==========
    "1002": "120", "1006": "120", "1009": "120", "1013": "120", "1018": "120",
    "1020": "120", "1021": "120", "1022": "120", "1028": "120", "1029": "120",
    "1041": "120", "1044": "120", "1046": "120", "1056": "120", "1058": "120",
    "1065": "120", "1066": "120", "1078": "120", "1080": "120", "1912": "120",
    "1950": "120", "1951": "120", "1952": "120", "1956": "120", "1958": "120",
    "1963": "120", "1968": "120", "1970": "120", "1973": "120", "1974": "120",
    "1976": "120", "1977": "120", "2187": "120", "2193": "120", "2517": "120",
    "3220": "120", "3296": "120", "3297": "120", "3298": "120", "3299": "120",
    "3300": "120",

    // ========== CLASSE 2 - GAZ COMBURANTS (Guide 122) ==========
    "1003": "122", "1014": "122", "1015": "122", "1043": "122", "1045": "122",
    "1070": "122", "1072": "122", "1073": "122", "1975": "122", "2190": "122",
    "2201": "122", "2421": "122", "2451": "122",

    // ========== CLASSE 2 - GAZ TOXIQUES/CORROSIFS (Guide 125) ==========
    "1005": "125", "1008": "125", "1048": "125", "1050": "125", "1052": "125",
    "1067": "125", "1069": "125", "1079": "125", "1745": "125", "1746": "125",
    "1749": "125", "2198": "125", "2417": "125", "2418": "125", "2420": "125",
    "3303": "125", "3304": "125", "3306": "125", "3307": "125", "3308": "125",
    "3310": "125", "3318": "125",

    // ========== CLASSE 3 - LIQUIDES INFLAMMABLES NON MISCIBLES (Guide 128) ==========
    "1114": "128", "1134": "128", "1136": "128", "1145": "128", "1146": "128",
    "1147": "128", "1175": "128", "1184": "128", "1202": "128", "1203": "128",
    "1206": "128", "1208": "128", "1216": "128", "1223": "128", "1262": "128",
    "1263": "128", "1267": "128", "1268": "128", "1294": "128", "1307": "128",
    "1863": "128", "1866": "128", "1993": "128", "3166": "128", "3257": "128",

    // ========== CLASSE 3 - LIQUIDES INFLAMMABLES MISCIBLES (Guide 127) ==========
    "1090": "127", "1091": "127", "1104": "127", "1105": "127", "1108": "127",
    "1109": "127", "1110": "127", "1112": "127", "1113": "127", "1120": "127",
    "1123": "127", "1126": "127", "1127": "127", "1128": "127", "1129": "127",
    "1148": "127", "1149": "127", "1150": "127", "1153": "127", "1155": "127",
    "1156": "127", "1157": "127", "1159": "127", "1161": "127", "1164": "127",
    "1165": "127", "1166": "127", "1167": "127", "1169": "127", "1170": "127",
    "1171": "127", "1172": "127", "1173": "127", "1176": "127", "1177": "127",
    "1178": "127", "1179": "127", "1180": "127", "1188": "127", "1189": "127",
    "1190": "127", "1191": "127", "1192": "127", "1193": "127", "1195": "127",
    "1197": "127", "1201": "127", "1207": "127", "1210": "127", "1212": "127",
    "1213": "127", "1218": "127", "1219": "127", "1220": "127", "1224": "127",
    "1231": "127", "1266": "127", "1274": "127", "1275": "127", "1276": "127",
    "1648": "127",

    // ========== CLASSE 3 - LIQUIDES INFLAMMABLES TOXIQUES (Guide 129/131) ==========
    "1092": "131", "1093": "129", "1098": "131", "1099": "131", "1100": "131",
    "1107": "129", "1111": "129", "1130": "129", "1131": "131", "1135": "131",
    "1139": "129", "1143": "131", "1144": "129", "1152": "129", "1163": "131",
    "1194": "129", "1199": "129", "1228": "131", "1230": "131",

    // ========== CLASSE 3 - LIQUIDES INFLAMMABLES CORROSIFS (Guide 132) ==========
    "1106": "132", "1125": "132", "1154": "132", "1158": "132", "1160": "132",
    "1162": "132", "1198": "132", "1214": "132", "1221": "132", "1277": "132",

    // ========== CLASSE 7 - RADIOACTIFS (Guide 157/163) ==========
    "2908": "163", "2909": "163", "2910": "163", "2911": "157", "2912": "157",
    "2913": "157", "2915": "163", "2916": "163", "2917": "163", "2919": "157",
    "2974": "163", "2975": "157", "2976": "163", "2977": "157", "2978": "157",
    "2979": "157", "2980": "163", "2981": "163", "2982": "163", "2983": "157",
    "3321": "163", "3322": "163", "3323": "163", "3324": "163", "3325": "163",
    "3326": "163", "3327": "157", "3328": "157", "3329": "157", "3330": "157",
    "3331": "157", "3332": "157", "3333": "163",

    // ========== CLASSE 8 - CORROSIFS (Guide 154/137/132/153) ==========
    "1715": "154", "1717": "132", "1718": "154", "1719": "154", "1722": "132",
    "1727": "154", "1760": "154", "1764": "154", "1778": "154", "1779": "154",
    "1783": "154", "1784": "137", "1787": "154", "1788": "154", "1789": "154",
    "1790": "154", "1791": "154", "1792": "154", "1793": "154", "1796": "154",
    "1805": "154", "1814": "154", "1824": "154", "1826": "154", "1830": "153",
    "1831": "137", "1832": "154", "1834": "137", "1902": "154", "1906": "154",
    "2031": "154", "2214": "154", "2796": "154", "2797": "154", "2798": "137",
    "2799": "154", "2800": "137", "2801": "154", "2802": "154", "2803": "154",

    // ========== CLASSE 9 - DIVERS ==========
    "2315": "171", "2990": "171", "3077": "171", "3082": "171", "3171": "147",
    "3245": "171", "3258": "171", "3268": "171", "3316": "171", "3334": "171",
    "3335": "171", "3363": "171", "3509": "171", "3535": "171", "3536": "147",
    "3548": "171", "3549": "158"
};


// ═══════════════════════════════════════════════════════════════════════
// EXPORTS GLOBAUX
// ═══════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.guidesGMU = guidesGMU;
    window.onuVersGuide = onuVersGuide;
}
