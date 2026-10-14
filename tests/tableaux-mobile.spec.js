// Tableaux sur téléphone : aucun écran ne doit défiler latéralement à cause d'un tableau ou d'une rangée trop large.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./outils');

const registre = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/navigation.json'), 'utf8'));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
// Tolérance : 4 px (arrondis de bordures). Trois calculateurs (« epuisement », « ia-manoeuvre », « pertes ») dépassent d'un bouton ou d'une carte
// à 320 px seulement : volontairement non touchés (les calculateurs gardent leur structure), limite surveillée.
const MARGE = 4;
const CALCULATEURS_TOLERES = { epuisement: 20, 'ia-manoeuvre': 20, pertes: 20 };

async function sansAnimation(app) {
    await app.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
}

for (const largeur of [320, 375]) {
    test(`aucun écran ne défile latéralement à ${largeur} px (détails dépliés)`, async ({ app }) => {
        test.setTimeout(300000);
        await app.setViewportSize({ width: largeur, height: 800 });
        await sansAnimation(app);
        const trop = await app.evaluate(async liste => {
            const out = [];
            for (const id of liste) {
                showModule(id);
                const m = document.getElementById(id);
                m.querySelectorAll('details').forEach(d => { d.open = true; });
                await new Promise(r => requestAnimationFrame(r));
                const depasse = m.scrollWidth - m.clientWidth;
                if (depasse > 1) out.push({ id, depasse });
            }
            return out;
        }, registre.pages.map(p => p.id));
        const inattendus = trop.filter(t => t.depasse > (CALCULATEURS_TOLERES[t.id] || MARGE));
        expect(inattendus, 'écrans qui défilent latéralement').toEqual([]);
    });
}

test('tous les tableaux des fiches sont dans un cadre à défilement (sauf les calculateurs), et leur nombre est inchangé', async ({ app }) => {
    const attendus = (html.match(/<table[\s>]/g) || []).length;
    const calculs = registre.pages.filter(p => p.type === 'calculateur').map(p => p.id);
    const r = await app.evaluate(ids => {
        const tous = [...document.querySelectorAll('.module table')];
        const horsCalculs = tous.filter(t => !ids.includes(t.closest('.module').id));
        return {
            total: tous.length,
            sansCadre: horsCalculs.filter(t => !t.closest('.rd-tablescroll-auto, .rd-tablescroll')).length,
            calculsEnveloppes: tous.filter(t => ids.includes(t.closest('.module').id) && t.closest('.rd-tablescroll-auto')).length
        };
    }, calculs);
    expect(r.total).toBe(attendus);
    expect(r.sansCadre, 'tableaux sans cadre hors calculateurs').toBe(0);
    expect(r.calculsEnveloppes, 'les calculateurs ne sont pas modifiés').toBe(0);
});

test('un tableau plus large que l\'écran défile dans son cadre, avec indice de défilement', async ({ app }) => {
    await app.setViewportSize({ width: 375, height: 800 });
    await sansAnimation(app);
    await app.evaluate(() => { showModule('ulm'); document.querySelectorAll('#ulm details').forEach(d => { d.open = true; }); });
    const cadre = app.locator('#ulm .rd-tablescroll-auto', { has: app.locator('th', { hasText: 'Particularités' }) }).first();
    await cadre.scrollIntoViewIfNeeded();
    const depasse = await cadre.evaluate(c => c.scrollWidth - c.clientWidth);
    expect(depasse, 'le tableau dépasse du cadre').toBeGreaterThan(10);
    await expect(cadre).toHaveClass(/rd-tablescroll-suite/);
    await cadre.evaluate(c => { c.scrollLeft = c.scrollWidth; });
    await expect(cadre).not.toHaveClass(/rd-tablescroll-suite/);
});

test('sur grand écran, les tableaux gardent toute la largeur', async ({ app }) => {
    await app.setViewportSize({ width: 1280, height: 900 });
    await sansAnimation(app);
    await app.evaluate(() => { showModule('rdmi-pei'); });
    const r = await app.evaluate(() => {
        const t = document.querySelector('#rdmi-pei table.rd-table'), c = t.parentElement;
        return { tableau: Math.round(t.getBoundingClientRect().width), cadre: Math.round(c.clientWidth), defile: c.scrollWidth - c.clientWidth };
    });
    expect(r.defile).toBeLessThanOrEqual(1);
    expect(Math.abs(r.tableau - r.cadre)).toBeLessThanOrEqual(2);
});

test('la rangée d\'échelle de douleur et les balises lumineuses passent à la ligne sur téléphone', async ({ app }) => {
    await app.setViewportSize({ width: 360, height: 800 });
    await sansAnimation(app);
    await app.evaluate(() => { showModule('suap-bilan'); showModule('eld-materiels'); });
    for (const id of ['suap-bilan', 'eld-materiels']) {
        await app.evaluate(i => { showModule(i); document.querySelectorAll(`#${i} details`).forEach(d => { d.open = true; }); }, id);
        const d = await app.evaluate(i => { const m = document.getElementById(i); return m.scrollWidth - m.clientWidth; }, id);
        expect(d, id).toBeLessThanOrEqual(1);
    }
});
