// GTO Sauvetages et mises en sécurité (DGSCGC, novembre 2020) : pages, chiffres clés, PDF.
const { test, expect } = require('./outils');
const fs = require('fs');
const path = require('path');

const PDF = 'docs/incendie/GTO-Sauvetages-mises-en-securite-2020.pdf';
const THEME = 'GTO – Sauvetages et mises en sécurité';
const IDS = ['menu', 'echelles', 'mea', 'lspcc', 'materiels', 'preparer', 'lspcc-technique', 'echelles-technique', 'sauveteur'].map(p => `gtosms-${p}`);

test('le PDF est rangé dans docs/incendie et les 9 pages sont déclarées', async ({ app }) => {
    expect(fs.existsSync(path.join(__dirname, '..', PDF))).toBe(true);
    const nav = await app.evaluate(() => fetch('data/navigation.json').then(r => r.json()));
    const pages = nav.pages.filter(p => IDS.includes(p.id));
    expect(pages).toHaveLength(9);
    for (const p of pages) { expect(p.domaine).toBe('incendie'); expect(p.theme).toBe(THEME); }
    expect(nav.domaines.find(d => d.id === 'incendie').themes).toContain(THEME);
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

test('chiffres clés du guide : poids des échelles, portées EPS, distances électriques, lots, facteur de chute', async ({ app }) => {
    const texte = async (id) => { await app.evaluate((i) => showModule(i), id); return (await app.locator('#' + id).innerText()).toLowerCase(); };
    const ech = await texte('gtosms-echelles');
    for (const x of ['8 kg', '20 kg', '33 kg', '75 kg', '1/3 de la longueur développée', '4 grands pas', 'entre 2 m et 5 m']) expect(ech).toContain(x);
    const mea = await texte('gtosms-mea');
    for (const x of ['23,5 m', '28 m', '10 m', '90 kg', '16 t', '1 m', '5 m', 'harnais de protection contre les chutes']) expect(mea).toContain(x);
    const lot = await texte('gtosms-lspcc');
    for (const x of ['30 m minimum', '60 m minimum', '3 000 dan', '2 000 dan', '750 dan', '30 °c maximum']) expect(lot).toContain(x);
    const mat = await texte('gtosms-materiels');
    for (const x of ['25 000 v', '1 min 20', '40 secondes']) expect(mat).toContain(x);
    const tec = await texte('gtosms-lspcc-technique');
    for (const x of ['supérieur à 1 : interdit', '90° maximum', '20 cm', 'mannequin']) expect(tec).toContain(x);
    const sau = await texte('gtosms-sauveteur');
    for (const x of ['nelar', 'minimum de 4 pompiers', '55 minutes', 'nance drill', 'denver drill']) expect(sau).toContain(x);
});

test('photos et schémas du guide : 131 figures, toutes chargées, légendées', async ({ app }) => {
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
    expect(total).toBe(131);
});
