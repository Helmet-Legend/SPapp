// GTO Sauvegarde opérationnelle (DGSCGC, février 2024) : pages, chiffres clés, PDF.
const { test, expect } = require('./outils');
const fs = require('fs');
const path = require('path');

const PDF = 'docs/incendie/GTO-Sauvegarde-operationnelle-2024.pdf';
const THEME = 'GTO – Sauvegarde opérationnelle';
const IDS = ['menu', 'principes', 'auto', 'air', 'equipier', 'binome', 'dernier'].map(p => `gtosauv-${p}`);

test('le PDF est rangé dans docs/incendie et les 7 pages sont déclarées', async ({ app }) => {
    expect(fs.existsSync(path.join(__dirname, '..', PDF))).toBe(true);
    const nav = await app.evaluate(() => fetch('data/navigation.json').then(r => r.json()));
    const pages = nav.pages.filter(p => IDS.includes(p.id));
    expect(pages).toHaveLength(7);
    for (const p of pages) { expect(p.domaine).toBe('incendie'); expect(p.theme).toBe(THEME); }
    expect(nav.domaines.find(d => d.id === 'incendie').themes).toContain(THEME);
});

test('les 7 pages s\'ouvrent et le PDF est téléchargeable en fin de chaque chapitre', async ({ app }) => {
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

test('chiffres clés du guide : NELAR, 100 L/min, 135 L/min, 50 bar, 270 bar, signal 30 s, 4 pompiers', async ({ app }) => {
    await app.evaluate(() => showModule('gtosauv-principes'));
    const p = (await app.locator('#gtosauv-principes').innerText()).toLowerCase();
    for (const x of ['100 l/min', 'un binôme de sécurité pour un binôme engagé', 'au moins 30 secondes', 'sur ordre du cos']) expect(p).toContain(x);
    await app.evaluate(() => showModule('gtosauv-auto'));
    const a = await app.locator('#gtosauv-auto').innerText();
    for (const x of ['NELAR', 'AAALEERTER', 'URGENT']) expect(a).toContain(x);
    await app.evaluate(() => showModule('gtosauv-air'));
    const r = await app.locator('#gtosauv-air').innerText();
    for (const x of ['135 L/min', '10 L/min', '50 bars', '4 à 7 L/min']) expect(r).toContain(x);
    await app.evaluate(() => showModule('gtosauv-equipier'));
    await expect(app.locator('#gtosauv-equipier')).toContainText('270 bar');
    await app.evaluate(() => showModule('gtosauv-dernier'));
    await expect(app.locator('#gtosauv-dernier')).toContainText('Minimum de 4 pompiers');
});
