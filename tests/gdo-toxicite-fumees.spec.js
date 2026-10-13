// GDO Prévention des risques liés à la toxicité des fumées (DGSCGC, septembre 2020) : pages, chiffres clés, PDF, figures.
const { test, expect } = require('./outils');
const fs = require('fs');
const path = require('path');

const PDF = 'docs/incendie/GDO-Prevention-risque-toxicite-fumees-2eme-edition.pdf';
const THEME = 'GDO – Prévention des risques liés à la toxicité des fumées';
const IDS = ['menu', 'fumees', 'exposition', 'centre', 'cagoule', 'operation', 'apres'].map(p => `gdotox-${p}`);

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

test('chiffres clés du guide : 280 °C, 500 °C, ALARA, 24 heures, 48 heures, eau froide, FFP3', async ({ app }) => {
    const texte = async (id) => { await app.evaluate((i) => showModule(i), id); return (await app.locator('#' + id).innerText()).toLowerCase(); };
    const f = await texte('gdotox-fumees');
    for (const x of ['280 °c', '500 °c', 'cyanure', 'hap', 'lignine']) expect(f).toContain(x);
    const e = await texte('gdotox-exposition');
    for (const x of ['absorption', 'adsorption', 'désorption', 'fréquence', 'micro-climat']) expect(e).toContain(x);
    const c = await texte('gdotox-centre');
    for (const x of ['vestiaire', 'chaussures de sport', '24 heures', 'bois traité']) expect(c).toContain(x);
    const g = await texte('gdotox-cagoule');
    for (const x of ['ne filtre pas les gaz', 'catégorie 3', 'peau rasée', 'décembre 2019']) expect(g).toContain(x);
    const o = await texte('gdotox-operation');
    for (const x of ['alara', 'brossage à sec', 'isoler la tenue', 'vtu', 'zone d\'exclusion']) expect(o).toContain(x);
    const a = await texte('gdotox-apres');
    for (const x of ['eau savonneuse froide', 'ongles', '48 heures', 'ffp3', 'absence d\'odeur']) expect(a).toContain(x);
});

test('photos et schémas du guide : 36 figures, toutes chargées, légendées', async ({ app }) => {
    test.setTimeout(240000);
    let total = 0;
    for (const id of IDS) {
        await app.evaluate((i) => showModule(i), id);
        const n = await app.evaluate((i) => {
            const imgs = [...document.querySelectorAll(`#${i} figure.rd-fig img`)];
            imgs.forEach(e => { e.loading = 'eager'; });
            return imgs.length;
        }, id);
        total += n;
        await expect.poll(() => app.evaluate((i) => [...document.querySelectorAll(`#${i} figure.rd-fig img`)].every(e => e.complete && e.naturalWidth > 0), id), { timeout: 30000 }).toBe(true);
        const vides = await app.evaluate((i) => [...document.querySelectorAll(`#${i} figure.rd-fig figcaption`)].filter(c => !c.textContent.trim()).length, id);
        expect(vides).toBe(0);
    }
    expect(total).toBe(36);
});
