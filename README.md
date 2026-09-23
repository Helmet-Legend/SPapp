# DECIOPS v1.10.0 - Architecture Modulaire

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
│   ├── navigation.js       # Accueil, onglets, recherche, favoris, fil d'Ariane
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
    ├── navigation.json     # Registre de navigation : domaines, thèmes, fiches, mots-clés
    ├── modules.json        # Mots-clés d'origine (repris dans navigation.json)
    ├── gaz_bouteilles.json # Couleurs des bouteilles de gaz
    ├── lspcc.json          # Lot de sauvetage LSPCC
    └── tables_mt2012.json  # Tables de décompression plongée
```

> Modifier les fichiers dans `js/`, `css/`, `data/` et `icons/`. À la racine, seuls
> `index.html`, `sw.js`, `manifest.json` et les trois fichiers GMU sont utilisés.
>
> Version : modifier `APP_VERSION` dans `js/app.js`, `CACHE_NAME` dans `sw.js` et `version` dans `package.json`.
>
> Générateur IA : variables Vercel `ANTHROPIC_API_KEY` (obligatoire), `ALLOWED_ORIGINS`,
> `RATE_LIMIT_MAX` (5 par défaut) et `RATE_LIMIT_WINDOW_MS` (10 min par défaut) en option.

## 🧭 Navigation

Tout le menu est généré à partir de `data/navigation.json` :

- **Accueil** : un menu déroulant par domaine, un sous-menu par thème ;
- **Onglets** en bas de l'écran : Accueil, Calculs, Chercher, Favoris ;
- **Fil d'Ariane** et bouton ☆ favori en haut de chaque écran ;
- favoris et fiches récentes gardés sur l'appareil.

### Ajouter une fiche

1. Créer l'écran dans `index.html` : `<div id="mon-id" class="module">…</div>` ;
2. Ajouter une entrée dans `pages` de `data/navigation.json` :

```json
{
  "id": "mon-id",
  "titre": "Titre affiché",
  "domaine": "incendie",
  "theme": "Calculs incendie",
  "type": "fiche",
  "motsCles": ["mot", "autre mot"]
}
```

- `domaine` : `incendie`, `risques`, `sap`, `routier`, `specialites`, `commandement` ou `outils` ;
- `theme` : un des thèmes listés pour ce domaine dans `domaines` (en ajouter un si besoin) ;
- `type` : `calculateur` (apparaît aussi dans l'onglet Calculs), `fiche`, `ordre`,
  `presentation` (page d'introduction d'un thème) ou `menu` (page de boutons, absente des menus).

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
