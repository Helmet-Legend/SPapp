// GDO Protection et sauvegarde du patrimoine culturel (DGSCGC, juin 2026) : pages, chiffres clés, PDF.
const { test, expect } = require('./outils');
const fs = require('fs');
const path = require('path');

const PDF = 'docs/commandement/GDO-Protection-sauvegarde-patrimoine-culturel-2026.pdf';
const THEME = 'GDO – Protection et sauvegarde du patrimoine culturel';
const IDS = ['menu', 'biens', 'vulnerabilite', 'acteurs', 'avant', 'sauvegarde', 'sinistres', 'apres'].map(p => `gdopat-${p}`);

test('le PDF est rangé dans docs/commandement et les 8 pages sont déclarées', async ({ app }) => {
    expect(fs.existsSync(path.join(__dirname, '..', PDF))).toBe(true);
    const nav = await app.evaluate(() => fetch('data/navigation.json').then(r => r.json()));
    const pages = nav.pages.filter(p => IDS.includes(p.id));
    expect(pages).toHaveLength(8);
    for (const p of pages) { expect(p.domaine).toBe('commandement'); expect(p.theme).toBe(THEME); }
    expect(nav.domaines.find(d => d.id === 'commandement').themes).toContain(THEME);
});

test('les 8 pages s\'ouvrent et le PDF est téléchargeable en fin de chaque chapitre', async ({ app }) => {
    for (const id of IDS) {
        await app.evaluate((i) => showModule(i), id);
        await expect(app.locator('#' + id)).toBeVisible();
        await expect(app.locator('#' + id + ' h2')).not.toBeEmpty();
        await expect(app.locator(`#${id} a.rd-pdf[href="${PDF}"]`)).toHaveCount(1);
    }
    const status = await app.evaluate((h) => fetch(h, { method: 'HEAD' }).then(x => x.status), PDF);
    expect(status).toBe(200);
});

test('tous les boutons des pages mènent à une page existante', async ({ app }) => {
    const manquantes = await app.evaluate((liste) => {
        const out = [];
        for (const id of liste) document.querySelectorAll(`#${id} [onclick*="showModule("]`).forEach(b => {
            const m = b.getAttribute('onclick').match(/showModule\('([^']+)'\)/);
            if (m) out.push(m[1]);
        });
        return [...new Set(out)].filter(c => !document.getElementById(c));
    }, IDS);
    expect(manquantes).toEqual([]);
});

test('chiffres clés du guide : sinistre tous les 8 jours, 45 223 immeubles, 3 zones, 3 niveaux', async ({ app }) => {
    await app.evaluate(() => showModule('gdopat-vulnerabilite'));
    const v = await app.locator('#gdopat-vulnerabilite').innerText();
    for (const x of ['tous les 8 jours', '63 %', '44 %', 'nitrate de cellulose', 'prévision à 72 h']) expect(v.toLowerCase()).toContain(x);
    await app.evaluate(() => showModule('gdopat-biens'));
    await expect(app.locator('#gdopat-biens')).toContainText('45 223');
    await app.evaluate(() => showModule('gdopat-sauvegarde'));
    const s = await app.locator('#gdopat-sauvegarde').innerText();
    for (const x of ['Zone d\'exclusion', 'Zone contrôlée', 'Zone de soutien', 'point de regroupement', 'Niveau']) expect(s.toLowerCase()).toContain(x.toLowerCase());
    await app.evaluate(() => showModule('gdopat-acteurs'));
    await expect(app.locator('#gdopat-acteurs')).toContainText('09 80 80 15 15');
});
