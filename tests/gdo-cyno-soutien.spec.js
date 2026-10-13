// GDO Équipes cynotechniques (2022) et GDO Préparation et soutien de l'intervenant (2026) : pages, chiffres clés, PDF.
const { test, expect } = require('./outils');
const fs = require('fs');
const path = require('path');

const GUIDES = [
    { nom: 'cynotechnique', prefixe: 'gdocyno', domaine: 'specialites', theme: 'GDO – Engagement des équipes cynotechniques',
      pdf: 'docs/specialites/GDO-Engagement-des-equipes-cynotechniques.pdf',
      pages: ['menu', 'binome', 'risques', 'specialite', 'conduite', 'recherche', 'special'] },
    { nom: 'soutien', prefixe: 'gdosout', domaine: 'commandement', theme: "GDO – Préparation et soutien de l'intervenant",
      pdf: 'docs/commandement/SOUTIEN-DE-L-INTERVENANT-2026.02.06.pdf',
      pages: ['menu', 'preparer', 'acteurs', 'sanitaire', 'releves', 'outils', 'apres'] },
];

for (const g of GUIDES) {
    const ids = g.pages.map(p => `${g.prefixe}-${p}`);

    test(`${g.nom} : PDF rangé dans docs/ et déclaré dans les pages`, async ({ app }) => {
        expect(fs.existsSync(path.join(__dirname, '..', g.pdf))).toBe(true);
        const nav = await app.evaluate(() => fetch('data/navigation.json').then(r => r.json()));
        const pages = nav.pages.filter(p => ids.includes(p.id));
        expect(pages).toHaveLength(7);
        for (const p of pages) { expect(p.domaine).toBe(g.domaine); expect(p.theme).toBe(g.theme); }
        expect(nav.domaines.find(d => d.id === g.domaine).themes).toContain(g.theme);
    });

    test(`${g.nom} : les 7 pages s'ouvrent et le PDF est téléchargeable en fin de chaque chapitre`, async ({ app }) => {
        for (const id of ids) {
            await app.evaluate((i) => showModule(i), id);
            await expect(app.locator('#' + id)).toBeVisible();
            await expect(app.locator('#' + id + ' h2')).not.toBeEmpty();
            await expect(app.locator(`#${id} a.rd-pdf[href="${g.pdf}"]`)).toHaveCount(1);
        }
        const status = await app.evaluate((h) => fetch(h, { method: 'HEAD' }).then(x => x.status), g.pdf);
        expect(status).toBe(200);
    });

    test(`${g.nom} : tous les boutons des pages mènent à une page existante`, async ({ app }) => {
        const cibles = await app.evaluate((liste) => {
            const out = [];
            for (const id of liste) document.querySelectorAll(`#${id} [onclick*="showModule("]`).forEach(b => {
                const m = b.getAttribute('onclick').match(/showModule\('([^']+)'\)/);
                if (m) out.push(m[1]);
            });
            return [...new Set(out)].filter(c => !document.getElementById(c));
        }, ids);
        expect(cibles).toEqual([]);
    });
}

test('cynotechnie : chiffres clés du guide', async ({ app }) => {
    await app.evaluate(() => showModule('gdocyno-recherche'));
    const t = await app.locator('#gdocyno-recherche').innerText();
    for (const v of ['3 à 6 minutes', '30 minutes', '200 m', '500 m', 'seconde équipe']) expect(t).toContain(v);
    await app.evaluate(() => showModule('gdocyno-special'));
    const s = await app.locator('#gdocyno-special').innerText();
    for (const v of ['12 équipes', '10 jours', '2 jours']) expect(s).toContain(v);
});

test('soutien : durées de relève, niveaux de pause et exemples chiffrés du guide', async ({ app }) => {
    await app.evaluate(() => showModule('gdosout-releves'));
    const r = await app.locator('#gdosout-releves').innerText();
    for (const v of ['20 minutes', '15 minutes', '5 heures en journée', '4 heures la nuit', '24 heures']) expect(r).toContain(v);
    await app.evaluate(() => showModule('gdosout-outils'));
    const o = await app.locator('#gdosout-outils').innerText();
    for (const v of ['score de 52', '-35 °C', 'Plus de 10', '5 à 15 minutes toutes les 3 à 4 heures', '30 minutes en zone de soutien']) expect(o).toContain(v);
});
