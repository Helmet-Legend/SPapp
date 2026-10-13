// GDO Interventions dans les silos (DGSCGC 2019) : pages, chiffres clés, lien PDF, rangement.
const { test, expect } = require('./outils');
const fs = require('fs');
const path = require('path');

const PAGES = ['gdosilo-menu', 'gdosilo-milieu', 'gdosilo-phenomenes', 'gdosilo-premieres', 'gdosilo-extinction', 'gdosilo-vidange', 'gdosilo-secours'];

test('le PDF est rangé dans docs/incendie et rien ne traîne à la racine', async () => {
    const racine = path.join(__dirname, '..');
    expect(fs.existsSync(path.join(racine, 'docs/incendie/GDO-Interventions-Silos.pdf'))).toBe(true);
    expect(fs.readdirSync(racine).filter(f => f.toLowerCase().endsWith('.pdf'))).toEqual([]);
});

test('les 7 pages existent, sont classées dans Incendie et s\'ouvrent', async ({ app }) => {
    for (const id of PAGES) {
        await app.evaluate((i) => showModule(i), id);
        await expect(app.locator('#' + id)).toBeVisible();
        await expect(app.locator('#' + id + ' h2')).not.toBeEmpty();
    }
    const nav = await app.evaluate(() => fetch('data/navigation.json').then(r => r.json()));
    const pages = nav.pages.filter(p => PAGES.includes(p.id));
    expect(pages).toHaveLength(7);
    for (const p of pages) { expect(p.domaine).toBe('incendie'); expect(p.theme).toBe('GDO – Interventions dans les silos'); }
});

test('chiffres clés du guide : périmètres 25 m / 50 m, 1,5 x la hauteur, pas d\'eau dans le grain', async ({ app }) => {
    await app.evaluate(() => showModule('gdosilo-premieres'));
    const t = await app.locator('#gdosilo-premieres').innerText();
    expect(t).toContain('25 m'); expect(t).toContain('50 m'); expect(t).toContain('1,5 × la hauteur');
    await app.evaluate(() => showModule('gdosilo-extinction'));
    await expect(app.locator('#gdosilo-extinction')).toContainText('Feu à cœur : l\'eau est a priori à proscrire');
    await app.evaluate(() => showModule('gdosilo-secours'));
    await expect(app.locator('#gdosilo-secours')).toContainText('Metz en 1982');
});

test('chaque chapitre se termine par le lien de téléchargement du PDF', async ({ app }) => {
    for (const id of PAGES) {
        await app.evaluate((i) => showModule(i), id);
        const liens = app.locator('#' + id + ' a.rd-pdf[href="docs/incendie/GDO-Interventions-Silos.pdf"]');
        await expect(liens).toHaveCount(1);
        const pdfAvantSource = await app.evaluate((i) => {
            const m = document.getElementById(i);
            const l = m.querySelector('a.rd-pdf'), s = m.querySelector('.rd-source');
            return !!(l.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING);
        }, id);
        expect(pdfAvantSource).toBe(true);
    }
});

test('le lien PDF pointe vers un fichier présent et la recherche trouve les silos', async ({ app }) => {
    await app.evaluate(() => showModule('gdosilo-menu'));
    const href = await app.locator('#gdosilo-menu a.rd-pdf').getAttribute('href');
    expect(href).toBe('docs/incendie/GDO-Interventions-Silos.pdf');
    const r = await app.evaluate((h) => fetch(h, { method: 'HEAD' }).then(x => x.status), href);
    expect(r).toBe(200);
    const nav = await app.evaluate(() => fetch('data/navigation.json').then(r => r.json()));
    const hits = nav.pages.filter(p => (p.motsCles || []).includes('inertage'));
    expect(hits.map(p => p.id)).toContain('gdosilo-extinction');
});
