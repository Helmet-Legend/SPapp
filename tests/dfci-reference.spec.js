// Non-régression du carroyage DFCI : points relevés dans l'application de référence (carreau affiché pour une position donnée).
// Si un de ces codes change, le calcul Lambert II étendu est faussé : ne pas « corriger » le test sans nouveau relevé.
const { test, expect } = require('./outils');

const POINTS = [
    [43.3951, 3.4263, 'GD82E1.4'],
    [44.671124, 1.27723, 'FE06H1.2'],
    [43.4287, 5.0410, 'KD02L4.5'],
    [44.0600, 5.0418, 'KD08K9.5'],
    [45.6132, 0.1438, 'EF26E5.4'],
    [42.3108, 9.2673, 'NC62G2.1'],
    [41.6499, 9.1695, 'NB64F5.1'],
    [48.8480, 0.5559, 'EL62E4.5'],
    [48.0245, -3.4204, 'BK64F5.1'],
    [43.4070, 3.6651, 'HD02D1.2'],
    [43.39474, 3.66385, 'HD02D1.3'],
    [44.2529, 6.5262, 'LE22H2.1'],
];

test('12 points de référence : le carreau calculé est celui de l\'application de référence', async ({ app }) => {
    const codes = await app.evaluate((pts) => pts.map(([la, lo]) => carreauDFCI(la, lo).code), POINTS);
    expect(codes).toEqual(POINTS.map(p => p[2]));
});

test('carreau -> GPS -> carreau : chaque point de référence se retrouve (centre de sa zone)', async ({ app }) => {
    const r = await app.evaluate((codes) => codes.map(c => {
        const g = dfciVersGPS(lireDFCI(c));
        return carreauDFCI(g.lat, g.lon).code;
    }), POINTS.map(p => p[2]));
    expect(r).toEqual(POINTS.map(p => p[2]));
});

test('le point calculé reste dans le carreau de 2 km saisi, pour les 5 zones', async ({ app }) => {
    const r = await app.evaluate(() => ['GD82E1.1', 'GD82E1.2', 'GD82E1.3', 'GD82E1.4', 'GD82E1.5'].map(c => {
        const g = dfciVersGPS(lireDFCI(c));
        return carreauDFCI(g.lat, g.lon).code.slice(0, 6);
    }));
    expect(new Set(r)).toEqual(new Set(['GD82E1']));
});

test('hors du carroyage (mer, étranger) : aucun code inventé', async ({ app }) => {
    const r = await app.evaluate(() => [[0, 0], [60, 30], [-30, 150]].map(([la, lo]) => carreauDFCI(la, lo)));
    expect(r).toEqual([null, null, null]);
});

test('annonce de version (notification push) : fichier valide, à jour et fiche existante', async ({ app }) => {
    const n = await app.evaluate(() => fetch('/data/nouveautes.json').then(r => r.json()));
    expect(n.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(n.version).toBe(await app.evaluate(() => APP_VERSION));
    expect(n.titre.length).toBeLessThanOrEqual(80);
    expect(n.texte.length).toBeLessThanOrEqual(300);
    expect(n.fiche).toMatch(/^[a-z0-9-]{1,60}$/);
    expect(await app.evaluate((id) => !!document.getElementById(id), n.fiche)).toBe(true);
});
