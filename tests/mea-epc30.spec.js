// Deux sections SDIS 34 (domaine Conduite) : « MEA – Tronc commun » et « EPC30 Renault – Riffaud 2026 ».
const { test, expect } = require('./outils');

const MEA = ['mea-tc-menu', 'mea-tc-generalites', 'mea-tc-fonctionnement', 'mea-tc-utilisation', 'mea-tc-precautions', 'mea-tc-pictos'];
const EPC = ['epc30-menu', 'epc30-cabine', 'epc30-stabilisation', 'epc30-commandes', 'epc30-plateforme', 'epc30-secours'];

test('registre : deux thèmes distincts dans Conduite, six pages chacun', async ({ app }) => {
    const r = await app.evaluate(() => {
        const pages = Navigation.pages();
        const par = t => pages.filter(p => p.theme === t).map(p => p.id);
        return { mea: par('MEA – Tronc commun (SDIS 34)'), epc: par('EPC30 Renault – Riffaud 2026 (SDIS 34)'), domaines: pages.filter(p => /^(mea-tc|epc30)-/.test(p.id)).map(p => p.domaine) };
    });
    expect(r.mea).toEqual(MEA);
    expect(r.epc).toEqual(EPC);
    expect(new Set(r.domaines)).toEqual(new Set(['conduite']));
});

for (const id of [...MEA, ...EPC]) {
    test(`${id} : la page s'ouvre, ses images et son PDF existent`, async ({ app }) => {
        await app.evaluate(i => showModule(i), id);
        const page = app.locator('#' + id);
        await expect(page).toBeVisible();
        await expect(page.locator('h2')).not.toHaveText('');
        await expect(page.locator('.rd-tampon')).toContainText('SDIS 34');
        const r = await app.evaluate(async i => {
            const m = document.getElementById(i);
            const urls = [...m.querySelectorAll('img')].map(e => e.getAttribute('src')).concat([...m.querySelectorAll('a.rd-pdf')].map(a => a.getAttribute('href').split('#')[0]));
            const ko = [];
            for (const u of urls) { const x = await fetch(u, { method: 'GET' }); if (!x.ok) ko.push(u); }
            return { n: urls.length, ko, sansAlt: [...m.querySelectorAll('img')].filter(e => !(e.alt || '').trim()).length };
        }, id);
        expect(r.ko).toEqual([]);
        expect(r.sansAlt).toBe(0);
        expect(r.n).toBeGreaterThan(0);
    });
}

test('contenu clé du tronc commun MEA (valeurs de la source)', async ({ app }) => {
    const texte = async id => { await app.evaluate(i => showModule(i), id); return (await app.locator('#' + id).evaluate(e => e.textContent)).replace(/\s+/g, ' '); };
    const g = await texte('mea-tc-generalites');
    expect(g).toContain('8 mètres');                   // voie engin
    expect(g).toContain('100 kN');                     // voie échelle
    expect(g).toContain('NF EN 14043');
    const f = await texte('mea-tc-fonctionnement');
    expect(f).toContain('polygone de sustentation');
    expect(f).toContain('+75°');
    expect(f).toContain('−17°');
    const u = await texte('mea-tc-utilisation');
    expect(u).toContain('3,7 kg/cm²');
    expect(u).toContain('1,1 kg/cm²');
    expect(u).toContain('maximum de 8 hommes');
    const pr = await texte('mea-tc-precautions');
    expect(pr).toContain('5 de Ø110 mm OU 12 de Ø70 mm');
    expect(pr).toContain('1 LDV 1000 ou 2 LDV 500');
    expect(pr).toContain('−10 °C');
    expect(pr).toContain('Tous les mouvements sont interdits avec du personnel sur le parc');
});

test('contenu clé du guide EPC30 (valeurs de la source)', async ({ app }) => {
    const texte = async id => { await app.evaluate(i => showModule(i), id); return (await app.locator('#' + id).evaluate(e => e.textContent)).replace(/\s+/g, ' '); };
    const m = await texte('epc30-menu');
    expect(m).toContain('16 tonnes');
    expect(m).toContain('2,7 à 5,2 m');
    expect(m).toContain('400 kg');
    const c = await texte('epc30-cabine');
    expect(c).toContain('20 000 V');
    expect(c).toContain('inférieure à 15°');
    expect(c).toContain('inférieur à 9°');
    const s = await texte('epc30-stabilisation');
    expect(s).toContain('15 cm, 30 cm, 50 cm, 80 cm et 150 cm');
    expect(s).toContain('3,45 m');
    const p = await texte('epc30-plateforme');
    expect(p).toContain('6 hommes');
    expect(p).toContain('comptabilisée comme 2 hommes');
    const sec = await texte('epc30-secours');
    expect(sec).toContain('40 min');
    expect(sec).toContain('10 min');
});

test('recherche : les mots-clés mènent aux bonnes pages', async ({ app }) => {
    const trouve = async mot => app.evaluate(m => Navigation.pages().filter(p => (p.motsCles || []).some(k => k.toLowerCase() === m)).map(p => p.id), mot);
    expect(await trouve('haubanage')).toContain('mea-tc-precautions');
    expect(await trouve('sky-nacelle')).toContain('epc30-plateforme');
    expect(await trouve('detect-line')).toContain('epc30-cabine');
    expect(await trouve('polygone de sustentation')).toContain('mea-tc-fonctionnement');
});

test('les menus renvoient vers toutes leurs pages et vers l\'autre section', async ({ app }) => {
    for (const [menu, cibles] of [['mea-tc-menu', MEA.slice(1)], ['epc30-menu', EPC.slice(1)]]) {
        await app.evaluate(i => showModule(i), menu);
        const liens = await app.evaluate(i => [...document.querySelectorAll('#' + i + ' button')].map(b => (b.getAttribute('onclick') || '').match(/showModule\('([^']+)'\)/)?.[1]).filter(Boolean), menu);
        for (const c of cibles) expect(liens).toContain(c);
    }
    await app.evaluate(() => showModule('mea-tc-menu'));
    await app.click('#mea-tc-menu button[onclick="showModule(\'epc30-menu\')"]');
    await expect(app.locator('#epc30-menu')).toBeVisible();
});
