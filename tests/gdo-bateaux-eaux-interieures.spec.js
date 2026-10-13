// GDO Interventions à bord des bateaux en eaux intérieures (DGSCGC, 2018) : pages, chiffres clés, PDF.
const { test, expect } = require('./outils');
const fs = require('fs');
const path = require('path');

const PDF = 'docs/specialites/GDO-Bateaux-eaux-interieures-2018.pdf';
const THEME = 'GDO – Bateaux en eaux intérieures';
const IDS = ['menu', 'milieu', 'ouvrages', 'bateaux', 'acteurs', 'commerce', 'planif', 'mesures', 'sinistres'].map(p => `gdoeaux-${p}`);

test('le PDF est rangé dans docs/specialites et les 9 pages sont déclarées', async ({ app }) => {
    expect(fs.existsSync(path.join(__dirname, '..', PDF))).toBe(true);
    const nav = await app.evaluate(() => fetch('data/navigation.json').then(r => r.json()));
    const pages = nav.pages.filter(p => IDS.includes(p.id));
    expect(pages).toHaveLength(9);
    for (const p of pages) { expect(p.domaine).toBe('specialites'); expect(p.theme).toBe(THEME); }
    expect(nav.domaines.find(d => d.id === 'specialites').themes).toContain(THEME);
});

test('les 9 pages s\'ouvrent et le PDF est téléchargeable en fin de chaque chapitre', async ({ app }) => {
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

test('chiffres clés du guide : 8 500 km, 80 % VNF, 1 799 franchissements, Bollène 22 m, signalisation TMD', async ({ app }) => {
    await app.evaluate(() => showModule('gdoeaux-milieu'));
    const m = await app.locator('#gdoeaux-milieu').innerText();
    for (const x of ['8 500 km', '80 %', '1 799', '16 décembre 2010']) expect(m).toContain(x);
    await app.evaluate(() => showModule('gdoeaux-ouvrages'));
    await expect(app.locator('#gdoeaux-ouvrages')).toContainText('Bollène (22 m)');
    await app.evaluate(() => showModule('gdoeaux-bateaux'));
    const b = (await app.locator('#gdoeaux-bateaux').innerText()).toLowerCase();
    for (const x of ['1 cône ou feu bleu', 'matières explosibles', '2 000 à 4 500 t', 'adn', '40 m³']) expect(b).toContain(x.toLowerCase());
    await app.evaluate(() => showModule('gdoeaux-planif'));
    const p = await app.locator('#gdoeaux-planif').innerText();
    for (const x of ['15 décembre 2015', 'plus long linéaire de berges']) expect(p).toContain(x);
    await app.evaluate(() => showModule('gdoeaux-sinistres'));
    await expect(app.locator('#gdoeaux-sinistres')).toContainText('conduction thermique');
});
