# DECIOPS v1.9.1 - Architecture Modulaire

## 📁 Structure du projet

```
DECIOPS/
├── index.html              # Page principale (HTML uniquement, aucun script ni style en ligne)
├── api/
│   └── gemini.js           # Fonction Vercel du générateur IA (API Claude, protégée)
├── css/
│   └── styles.css          # Tous les styles
├── js/
│   ├── data-loader.js      # Chargeur de données JSON
│   ├── app.js              # Logique principale (navigation, calculateurs, À propos, APP_VERSION)
│   ├── pwa-theme.js        # Service worker, installation PWA, thème clair/sombre
│   └── modules/
│       ├── sal.js          # SAL (plongée/décompression)
│       ├── gaz.js          # Explosimétrie
│       ├── bouteilles.js   # Bouteilles de gaz (identification, refroidissement)
│       ├── commandement.js # PATRAC DR, DPIF, SMES, SOIEC, SAOIECL
│       ├── trajet.js       # Temps de trajet
│       ├── sauvegarde.js   # Fenêtre « Enregistrer le calcul »
│       ├── lspcc.js        # Facteur de chute LSPCC
│       └── ia-manoeuvre.js # Générateur de manœuvre IA (côté navigateur)
├── guides-gmu.js, affichage-gmu.js, gmu-integration.js  # Fiches GMU (TMD)
└── data/
    ├── config.json         # Configuration de l'application
    ├── tmd.json            # Base TMD
    ├── gaz.json            # Base des gaz pour explosimétrie
    ├── densites.json       # Densités des matériaux
    ├── conversions.json    # Facteurs de conversion
    ├── modules.json        # Index des modules (recherche)
    ├── gaz_bouteilles.json # Couleurs des bouteilles de gaz
    ├── lspcc.json          # Lot de sauvetage LSPCC
    └── tables_mt2012.json  # Tables de décompression plongée
```

> Les copies à la racine (`app.js`, `styles.css`, `tmd.json`…) ne sont **pas** chargées par le site :
> seules comptent celles de `js/`, `css/` et `data/`.
>
> Version : modifier `APP_VERSION` dans `js/app.js`, `CACHE_NAME` dans `sw.js` et `version` dans `package.json`.
>
> Générateur IA : variables Vercel `ANTHROPIC_API_KEY` (obligatoire), `ALLOWED_ORIGINS`,
> `RATE_LIMIT_MAX` (5 par défaut) et `RATE_LIMIT_WINDOW_MS` (10 min par défaut) en option.

## 🚀 Utilisation

1. Ouvrez `index.html` dans un navigateur
2. Pour le développement local, utilisez un serveur HTTP (pour le chargement des JSON) :
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx serve
   ```

## 📝 Modification des données

### Ajouter un produit TMD
Éditez `data/tmd.json` et ajoutez un objet :
```json
{
  "onu": "1234",
  "nom": "Nom du produit",
  "classe": 3,
  "danger": "33",
  "risques": "Inflammable",
  "picto": "🔥"
}
```

### Ajouter un gaz (explosimétrie)
Éditez `data/gaz.json` :
```json
"nouveau_gaz": {
  "nom": "Nouveau Gaz",
  "formule": "XX₂",
  "lie": 2.5
}
```

### Modifier les conversions
Éditez `data/conversions.json` pour ajouter des unités ou modifier les facteurs.

## 🔧 Architecture technique

### Chargement des données
Le fichier `js/data-loader.js` charge les JSON de manière asynchrone :
```javascript
const data = await DataLoader.loadAll();
// ou
const tmd = await DataLoader.getTMD();
```

### Variables globales
Les données sont stockées dans des variables globales pour compatibilité :
- `tmdDatabase` - Produits TMD
- `gazDatabase` - Gaz explosimétrie
- `densityData` - Densités matériaux
- `conversionData` - Facteurs conversion
- `modulesData` - Index modules

## 📱 Compatibilité

- iOS 14+
- Android 9+
- Chrome, Firefox, Safari, Edge

## ⚠️ Notes importantes

- L'application nécessite un serveur HTTP pour charger les fichiers JSON
- Le mode hors-ligne fonctionne avec un Service Worker (à implémenter)
- Les données sont en cache navigateur après premier chargement

## 👨‍🚒 Crédits

**RESCUEAPP** - Solution professionnelle pour sapeurs-pompiers
© 2025 DECIOPS - Tous droits réservés
