// ========== GUIDES GMU - FICHES D'INTERVENTION ORANGE ==========

const guidesGMU = {
    "111": {
        titre: "Chargement mixte/Non-identifié",
        risques: {
            incendie: [
                "Peut exploser sous l'action de la chaleur, le choc, la friction ou la contamination",
                "Peut réagir violemment ou explosivement au contact de l'air, de l'eau ou de mousses",
                "Peut être allumée par la chaleur, par des étincelles ou par des flammes",
                "Les vapeurs peuvent se propager vers une source d'ignition et provoquer un retour de flamme",
                "Les contenants peuvent exploser lorsque chauffés",
                "Les cylindres brisés peuvent s'autopropulser violemment"
            ],
            sante: [
                "L'inhalation, l'ingestion ou le contact peut causer de graves blessures, l'infection, la maladie ou la mort",
                "Une forte concentration de gaz peut provoquer l'asphyxie sans avertissement",
                "Le contact peut causer des brûlures à la peau et aux yeux",
                "Un feu ou le contact avec l'eau peut produire des gaz irritants, toxiques et/ou corrosifs",
                "Les eaux de contrôle d'incendie peuvent causer une contamination environnementale"
            ]
        },
        securitePublique: [
            "COMPOSER le 911 puis le numéro d'urgence sur les documents",
            "Éloigner les personnes non autorisées",
            "Garder le vent dans le dos, rester en hauteur et/ou en amont"
        ],
        epi: [
            "Porter un Appareil de Protection Respiratoire Autonome (APRA) à pression positive",
            "Les vêtements de protection pour feux d'immeuble offrent une protection thermique, mais protection chimique limitée"
        ],
        evacuation: {
            immediat: "Isoler dans un rayon minimum de 100 mètres",
            incendie: "Si citerne impliquée: ISOLER 800 mètres dans toutes les directions"
        },
        mesures: {
            incendie: {
                mineur: ["Poudre chimique sèche", "CO2", "Eau pulvérisée", "Mousse régulière"],
                majeur: [
                    "Eau pulvérisée ou en brouillard, ou mousse régulière",
                    "Si sans risque, éloigner les contenants non endommagés"
                ],
                citerne: [
                    "Refroidir les contenants avec des quantités abondantes d'eau",
                    "Empêcher l'infiltration d'eau dans les contenants",
                    "Se retirer si le sifflement augmente ou si la citerne se décolore",
                    "TOUJOURS se tenir éloigné d'une citerne en contact direct avec les flammes"
                ]
            },
            deversement: [
                "Ne pas toucher ou marcher sur le produit déversé",
                "ÉLIMINER toute source d'ignition (cigarette, fusée, étincelles, flammes)",
                "Tout équipement doit être mis à la terre",
                "Garder les combustibles loin de la substance déversée",
                "Utiliser un brouillard d'eau pour détourner ou réduire les émanations",
                "Empêcher l'infiltration dans cours d'eau, égouts, sous-sols"
            ]
        },
        premiersSoins: "Se référer à la section Premiers soins généraux"
    },

    "128": {
        titre: "Liquides inflammables (non-miscibles à l'eau)",
        pointEclair: "< -20°C (très bas)",
        risques: {
            incendie: [
                "EXTRÊMEMENT INFLAMMABLE : S'enflammera facilement sous l'action de la chaleur, d'étincelles ou de flammes",
                "Les vapeurs peuvent former des mélanges explosifs avec l'air",
                "Les vapeurs peuvent se propager vers une source d'ignition et provoquer un retour de flamme",
                "La plupart des vapeurs sont plus lourdes que l'air et s'accumulent dans les dépressions",
                "Les vapeurs posent un risque explosif à l'intérieur, à l'extérieur ou dans les égouts",
                "Le ruissellement vers les égouts peut créer un risque de feu ou d'explosion",
                "Les contenants peuvent exploser lorsque chauffés",
                "Plusieurs liquides vont flotter sur l'eau"
            ],
            sante: [
                "L'inhalation ou le contact peut irriter ou brûler la peau et les yeux",
                "Un feu peut produire des gaz irritants, corrosifs et/ou toxiques",
                "Les vapeurs peuvent causer des étourdissements ou l'asphyxie dans espaces clos",
                "Les eaux de contrôle d'incendie peuvent causer une contamination environnementale"
            ]
        },
        securitePublique: [
            "COMPOSER le 911 puis le numéro d'urgence sur les documents",
            "Éloigner les personnes non autorisées",
            "Garder le vent dans le dos, rester en hauteur et/ou en amont",
            "Aérer les endroits clos avant d'y accéder"
        ],
        epi: [
            "Porter un Appareil de Protection Respiratoire Autonome (APRA) à pression positive",
            "Les vêtements de protection pour feux d'immeuble offrent une protection thermique limitée"
        ],
        evacuation: {
            immediat: "Isoler dans un rayon minimum de 50 mètres",
            deversementMajeur: "Envisager évacuation de 300 mètres sous le vent",
            incendie: "Si citerne impliquée: ISOLER 800 mètres dans toutes les directions"
        },
        mesures: {
            incendie: {
                attention: ["La majorité ont un point d'éclair très bas", "L'eau pulvérisée peut s'avérer inefficace"],
                mineur: [
                    "Poudre chimique sèche",
                    "CO2",
                    "Eau pulvérisée",
                    "Mousse régulière ou antialcool"
                ],
                majeur: [
                    "Eau pulvérisée ou en brouillard",
                    "Mousse régulière ou antialcool",
                    "Éviter jet d'eau direct sur le produit",
                    "Éloigner les contenants non endommagés si sans risque"
                ],
                citerne: [
                    "Combattre d'une distance maximale ou avec lances télécommandées",
                    "Refroidir les contenants longtemps après extinction",
                    "Ne pas introduire d'eau dans wagon-citerne percé (débordement)",
                    "Se retirer si sifflement augmente ou si citerne se décolore",
                    "Pour incendie majeur: se retirer et laisser brûler"
                ]
            },
            deversement: [
                "ÉLIMINER toute source d'ignition (cigarette, fusée, étincelles, flammes)",
                "Tout équipement doit être mis à la terre",
                "Ne pas toucher ou marcher sur le produit",
                "Si sans risque, arrêter la fuite",
                "Empêcher infiltration dans cours d'eau, égouts, sous-sols",
                "Mousse antivapeur peut réduire les émanations",
                "Absorber avec terre sèche, sable ou produit non-combustible",
                "Utiliser outils antiétincelles pour récupérer absorbant",
                "Endiguer à bonne distance pour déversement majeur",
                "Eau pulvérisée peut réduire émanations mais ne prévient pas ignition"
            ]
        },
        premiersSoins: [
            "Se référer aux Premiers soins généraux",
            "Laver la peau au savon et à l'eau",
            "En cas de brûlure, refroidir immédiatement à l'eau froide",
            "Ne pas enlever vêtements collés à la peau"
        ]
    },

    "120": {
        titre: "Gaz - Inertes (incluant des liquides réfrigérés)",
        risques: {
            sante: [
                "Les vapeurs peuvent causer étourdissements ou asphyxie sans avertissement, surtout en espaces clos",
                "Les vapeurs de gaz liquéfiés sont plus lourdes que l'air et se diffusent au ras du sol",
                "Le contact avec gaz/liquide cryogénique peut causer graves blessures, brûlures et/ou engelures"
            ],
            incendie: [
                "Gaz ininflammables",
                "Les contenants peuvent exploser lorsque chauffés",
                "Les cylindres brisés peuvent s'autopropulser violemment"
            ]
        },
        securitePublique: [
            "COMPOSER le 911 puis le numéro d'urgence sur les documents",
            "Éloigner les personnes non autorisées",
            "Garder le vent dans le dos, rester en hauteur et/ou en amont",
            "Gaz plus lourds que l'air s'accumulent dans dépressions",
            "Aérer endroits clos avant d'y accéder si formé et équipé"
        ],
        epi: [
            "Porter un Appareil de Protection Respiratoire Autonome (APRA) à pression positive",
            "Toujours porter vêtements de protection thermique pour liquides cryogéniques",
            "Vêtements de protection pour feux offrent protection thermique limitée"
        ],
        evacuation: {
            immediat: "Isoler dans un rayon minimum de 100 mètres",
            deversementMajeur: "Envisager évacuation de 100 mètres sous le vent",
            incendie: "Si citerne impliquée: ISOLER 800 mètres dans toutes les directions"
        },
        mesures: {
            incendie: {
                general: [
                    "Employer agent extincteur approprié au type de feu environnant",
                    "Éloigner contenants non endommagés si sans risque",
                    "Cylindres endommagés manipulés que par spécialistes"
                ],
                citerne: [
                    "Combattre d'une distance maximale ou lances télécommandées",
                    "Refroidir contenants longtemps après extinction",
                    "Ne pas appliquer d'eau au point de fuite (obstruction par glace)",
                    "Se retirer si sifflement augmente ou citerne se décolore"
                ]
            },
            deversement: [
                "Ne pas toucher ou marcher sur le produit",
                "Si sans risque, arrêter la fuite",
                "Utiliser brouillard d'eau pour détourner ou réduire émanations",
                "Ne pas appliquer d'eau sur le déversement ou au point de fuite",
                "Si possible, retourner contenant pour laisser fuir gaz plutôt que liquide",
                "Empêcher infiltration dans cours d'eau, égouts, sous-sols",
                "Laisser la substance s'évaporer",
                "Aérer la zone"
            ]
        },
        premiersSoins: [
            "Se référer aux Premiers soins généraux",
            "Tout vêtement gelé sur la peau devrait être dégelé avant d'être enlevé",
            "En cas de contact avec liquide cryogénique, seul personnel médical doit tenter dégeler engelures"
        ],
        attention: "Avec liquides réfrigérés/cryogéniques, plusieurs matériaux deviennent fragiles et peuvent se briser facilement"
    },

    "125": {
        titre: "Gaz - Toxiques et/ou Corrosifs",
        risques: {
            sante: [
                "TOXIQUE et/ou CORROSIF; peut être fatal lorsqu'inhalé, ingéré ou absorbé par la peau",
                "Les vapeurs sont extrêmement irritantes et corrosives",
                "Contact avec gaz/liquide peut causer graves blessures, brûlures et/ou engelures",
                "Un feu produira des gaz irritants, corrosifs et/ou toxiques",
                "Les eaux de contrôle peuvent causer contamination environnementale"
            ],
            incendie: [
                "Certains peuvent brûler mais aucun ne s'enflamme facilement",
                "Vapeurs de gaz liquéfiés plus lourdes que l'air",
                "Certaines substances réagissent violemment au contact de l'eau",
                "Cylindres exposés au feu peuvent laisser s'échapper gaz toxiques/corrosifs",
                "Contenants peuvent exploser lorsque chauffés",
                "Cylindres brisés peuvent s'autopropulser violemment"
            ]
        },
        securitePublique: [
            "COMPOSER le 911 puis le numéro d'urgence sur les documents",
            "Éloigner les personnes non autorisées",
            "Garder le vent dans le dos, rester en hauteur et/ou en amont",
            "Gaz plus lourds que l'air s'accumulent dans dépressions",
            "Aérer endroits clos avant d'y accéder si formé et équipé"
        ],
        epi: [
            "Porter un Appareil de Protection Respiratoire Autonome (APRA) à pression positive",
            "Porter vêtement de protection chimique recommandé par fabricant si AUCUN RISQUE D'INCENDIE",
            "Vêtements de protection pour feux offrent protection thermique mais protection chimique limitée"
        ],
        evacuation: {
            immediat: "Isoler dans un rayon minimum de 100 mètres",
            deversement: "Voir Tableau 1 - Distances d'isolation initiale et d'activités de protection",
            incendie: "Si citerne impliquée: ISOLER 1600 mètres dans toutes les directions"
        },
        mesures: {
            incendie: {
                attention: ["Certaines substances réagissent violemment au contact de l'eau"],
                mineur: [
                    "Poudre chimique sèche",
                    "CO2",
                    "Eau pulvérisée ou brouillard"
                ],
                majeur: [
                    "Eau pulvérisée, brouillard ou mousse",
                    "Éloigner contenants non endommagés si sans risque"
                ],
                citerne: [
                    "Combattre d'une distance maximale ou lances télécommandées",
                    "Refroidir contenants longtemps après extinction",
                    "Ne pas appliquer d'eau au point de fuite (obstruction par glace)",
                    "Se retirer si sifflement augmente ou citerne se décolore",
                    "Pour incendie majeur: se retirer et laisser brûler"
                ]
            },
            deversement: [
                "Ne pas toucher ou marcher sur le produit",
                "Si sans risque, arrêter la fuite",
                "Utiliser brouillard d'eau pour détourner ou réduire émanations",
                "Ne pas appliquer d'eau sur déversement ou au point de fuite",
                "Si possible, retourner contenant pour laisser fuir gaz plutôt que liquide",
                "Empêcher infiltration dans cours d'eau, égouts, sous-sols",
                "Isoler la zone jusqu'à dispersion des gaz",
                "Aérer la zone"
            ]
        },
        premiersSoins: [
            "Se référer aux Premiers soins généraux",
            "Tout vêtement gelé sur la peau devrait être dégelé avant d'être enlevé"
        ]
    }
};

// ========== ASSOCIATION NUMÉROS ONU -> GUIDES GMU ==========
// Format: "numeroONU": "numeroGuide"

const onuVersGuide = {
    "1203": "128",  // Essence
    "1863": "128",  // Carburéacteur
    "1267": "128",  // Pétrole brut
    "1223": "128",  // Kérosène
    "1268": "128",  // Distillats de pétrole
    "1170": "127",  // Alcool éthylique
    "1219": "129",  // Isopropanol
    "1230": "129",  // Méthanol
    "1005": "125",  // Ammoniac anhydre
    "1017": "119",  // Chlore
    "1040": "119",  // Oxyde d'éthylène
    "1830": "153",  // Acide sulfurique
    "1789": "154",  // Acide chlorhydrique
    "1824": "154",  // Hydroxyde de sodium en solution
    "1977": "120",  // Azote liquide réfrigéré
    "1072": "122",  // Oxygène comprimé
    "1971": "115",  // Méthane comprimé
    "1075": "115",  // Gaz de pétrole liquéfiés
    "1978": "115"   // Propane
    // AJOUTER LES AUTRES ICI (voir section jaune du GMU page 28-85)
};
