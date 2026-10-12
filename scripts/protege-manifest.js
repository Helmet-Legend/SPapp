#!/usr/bin/env node
// Génère tests/protege.manifest.json : empreinte SHA-256 de chaque fichier protégé.
// Contenu protégé : photos et schémas à l'intérieur des dossiers (GTO, GDO, RDMI, fiches pédagogiques…) et documents (docs/).
// Exclus : images/calculs (visuels de l'interface) et images/accueil (fond d'écran).
// À relancer UNIQUEMENT quand du contenu protégé est volontairement ajouté ou remplacé :  node scripts/protege-manifest.js
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const EXCLUS = [/^images\/calculs\//, /^images\/accueil\//];
const fichiers = execSync('git ls-files images docs', { cwd: racine, encoding: 'utf8' }).split('\n').filter(Boolean)
    .filter(f => !EXCLUS.some(r => r.test(f))).sort();
const empreintes = {};
for (const f of fichiers) empreintes[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(racine, f))).digest('hex');
fs.writeFileSync(path.join(racine, 'tests', 'protege.manifest.json'), JSON.stringify({
    regle: "Contenu protégé : ne pas modifier, recadrer, recompresser ni remplacer. Regénérer ce fichier seulement après un ajout ou un remplacement voulu.",
    exclus: ['images/calculs/', 'images/accueil/'],
    nombre: fichiers.length,
    fichiers: empreintes
}, null, 0));
console.log(fichiers.length + ' fichiers protégés enregistrés.');
