#!/usr/bin/env node
// Génère tests/protege.manifest.json : empreinte SHA-256 de chaque fichier protégé.
// Contenu protégé : photos et schémas à l'intérieur des dossiers (GTO, GDO, RDMI, fiches pédagogiques…) et documents (docs/).
// Images de boutons : photos des 18 calculs (images/calculs) et des 12 domaines (images/accueil/dom-*) : refaites avec les images fournies, à ne plus toucher.
// Exclus : le reste de images/accueil (fonds d'écran jour et nuit, anciennes vignettes).
// À relancer UNIQUEMENT quand du contenu protégé est volontairement ajouté ou remplacé :  node scripts/protege-manifest.js
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const EXCLUS = [/^images\/accueil\/(?!dom-)/];
const fichiers = execSync('git ls-files images docs', { cwd: racine, encoding: 'utf8' }).split('\n').filter(Boolean)
    .filter(f => !EXCLUS.some(r => r.test(f))).sort();
const empreintes = {};
for (const f of fichiers) empreintes[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(racine, f))).digest('hex');
fs.writeFileSync(path.join(racine, 'tests', 'protege.manifest.json'), JSON.stringify({
    regle: "Contenu protégé : ne pas modifier, recadrer, recompresser ni remplacer. Regénérer ce fichier seulement après un ajout ou un remplacement voulu.",
    exclus: ['images/accueil/ (sauf dom-*)'],
    nombre: fichiers.length,
    fichiers: empreintes
}, null, 0));
console.log(fichiers.length + ' fichiers protégés enregistrés.');
