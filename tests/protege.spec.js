// Contenu protégé : photos et schémas à l'intérieur des dossiers (GTO, GDO, RDMI, fiches pédagogiques…) et documents.
// Une refonte graphique ne doit en modifier aucun octet. Une image ajoutée est acceptée ; une image modifiée ou supprimée fait échouer le test.
const { test, expect } = require('@playwright/test');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const manifeste = JSON.parse(fs.readFileSync(path.join(__dirname, 'protege.manifest.json'), 'utf8'));

test('le contenu protégé (photos des dossiers, documents) est strictement inchangé', () => {
    const modifies = [], absents = [];
    for (const [f, h] of Object.entries(manifeste.fichiers)) {
        const p = path.join(racine, f);
        if (!fs.existsSync(p)) { absents.push(f); continue; }
        if (crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') !== h) modifies.push(f);
    }
    expect({ modifies, absents }).toEqual({ modifies: [], absents: [] });
    expect(Object.keys(manifeste.fichiers).length).toBe(manifeste.nombre);
});

test('les images des dossiers ne passent pas par le style de l\'interface (pas de filtre, ni de recadrage imposé)', () => {
    const css = fs.readFileSync(path.join(racine, 'css', 'theme.css'), 'utf8');
    // Les nouvelles règles de l'interface ne ciblent jamais les images de contenu (.rd-fig, .rd-photo, .module img)
    const nouveau = css.slice(css.indexOf('Onglet Calculs (kit UI Vulcain 34)'));
    expect(nouveau).not.toMatch(/\.rd-(fig|photo|img)|\.module\s+img|\bimg\s*\{[^}]*(filter|object-fit|border-radius)/);
});
