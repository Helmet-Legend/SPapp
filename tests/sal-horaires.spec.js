// Calculateur de paliers MT 2012 : vision globale de la plongée (heures déduites du résultat des paliers).
const { test, expect } = require('./outils');

const saisir = (app, id, v) => app.evaluate(([i, val]) => {
    const e = document.getElementById(i); e.value = val;
    e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
}, [id, v]);
const ouvrir = async (app, prof, temps) => {
    await app.evaluate(() => showModule('sal-calculateur'));
    await saisir(app, 'calc-profondeur', prof); await saisir(app, 'calc-temps', temps);
};
const heures = (app) => app.locator('#sal-vision-resultat .sal-chrono .sal-h').allTextContents();

test('paliers d\'abord : le résultat s\'affiche avant la vision globale, sans heure d\'immersion', async ({ app }) => {
    await ouvrir(app, '30', '25');
    await expect(app.locator('#calc-resultat')).toContainText('3 m');
    await expect(app.locator('#sal-vision-aide')).toContainText('heure d\'immersion');
    await expect(app.locator('#sal-vision-resultat')).toBeEmpty();
    const y1 = (await app.locator('#calc-resultat').boundingBox()).y, y2 = (await app.locator('#sal-vision').boundingBox()).y;
    expect(y2).toBeGreaterThan(y1);
    await expect(app.locator('.calc-dock')).toContainText('7 min 15 s');
});

test('30 m / 25 min, immersion 10:00 : parachute, début de déco, palier et sortie (table MT 2012)', async ({ app }) => {
    await ouvrir(app, '30', '25');
    await saisir(app, 'sal-immersion', '10:00');
    // début de remontée 10:25 ; parachute 10:26 ; arrivée 1er palier 10:27:15 ; sortie 10:32:15 -> 10:33 (au plus tôt)
    expect(await heures(app)).toEqual(['10:00', '10:25', '10:26', '10:27', '10:27', '10:33']);
    const tuiles = await app.locator('.sal-vision-tuile b').allTextContents();
    expect(tuiles).toEqual(['10:25', '10:26', '10:27', '10:33']);
    await expect(app.locator('#sal-vision-resultat')).toContainText('Palier à 3 m');
    await expect(app.locator('#sal-vision-resultat')).toContainText('5 min');
    await expect(app.locator('.calc-dock')).toContainText('7 min 15 s · sortie 10:33');
});

test('le résultat des paliers reste inchangé quand on saisit l\'immersion', async ({ app }) => {
    await ouvrir(app, '30', '25');
    const avant = await app.locator('#calc-resultat').innerHTML();
    await saisir(app, 'sal-immersion', '08:15');
    expect(await app.locator('#calc-resultat').innerHTML()).toBe(avant);
});

test('sans palier (30 m / 15 min) : pas de début de déco, sortie à la fin de la remontée', async ({ app }) => {
    await ouvrir(app, '30', '15');
    await saisir(app, 'sal-immersion', '14:00');
    await expect(app.locator('#sal-vision-resultat')).toContainText('Sans palier');
    // remontée 2:30 : début de remontée 14:15, sortie 14:17:30 -> 14:18
    const tuiles = await app.locator('.sal-vision-tuile b').allTextContents();
    expect(tuiles[0]).toBe('14:15'); expect(tuiles[1]).toBe('14:16'); expect(tuiles[2]).toBe('Sans palier'); expect(tuiles[3]).toBe('14:18');
});

test('minuit : l\'heure de sortie passe au lendemain', async ({ app }) => {
    await ouvrir(app, '30', '25');
    await saisir(app, 'sal-immersion', '23:50');
    expect((await heures(app)).slice(-1)[0]).toContain('00:');
    await expect(app.locator('#sal-vision-resultat')).toContainText('lendemain');
});

test('même règles que le calculateur : altitude, Nitrox, plongée successive et tables Air/Oxy passent par la vision globale', async ({ app }) => {
    await ouvrir(app, '30', '25');
    await saisir(app, 'sal-immersion', '09:00');
    const total = async () => (await app.locator('#calc-resultat .sal-res-carte', { hasText: 'Total décompression' }).locator('b').textContent()).trim();
    const lire = (t) => { const [m, s] = t.split(':').map(Number); return m + s / 60; };
    // chaque réglage : la sortie annoncée = immersion + temps + total de la carte « Total décompression »
    for (const [id, val] of [['calc-methode', 'oxy'], ['calc-methode', 'air'], ['calc-altitude', '1'], ['calc-altitude', ''], ['calc-intervalle', '3'], ['calc-intervalle', '']]) {
        await saisir(app, id, val);
        const t = lire(await total());
        const attendu = 9 * 60 + 25 + t;
        const h = (await app.locator('.sal-vision-tuile b').allTextContents()).slice(-1)[0];
        const [hh, mm] = h.split(':').map(Number);
        expect(hh * 60 + mm).toBe(Math.ceil(attendu - 1e-9));
    }
});

test('hors table : aucune heure affichée, message d\'aide', async ({ app }) => {
    await ouvrir(app, '30', '500');
    await saisir(app, 'sal-immersion', '10:00');
    await expect(app.locator('#sal-vision-resultat')).toBeEmpty();
    await expect(app.locator('#sal-vision-aide')).toContainText('Calculez d\'abord');
});

test('plongée sans palier à moins de 12 m : heures de début de remontée et de parachute seulement', async ({ app }) => {
    await ouvrir(app, '9', '30');
    await saisir(app, 'sal-immersion', '10:00');
    await expect(app.locator('#sal-vision-resultat')).toContainText('table « sans palier »');
    expect(await app.locator('.sal-vision-tuile b').allTextContents()).toEqual(['10:30', '10:31']);
});

test('bouton « Maintenant » : heure du téléphone', async ({ app }) => {
    await ouvrir(app, '30', '25');
    await app.click('#sal-vision button');
    expect(await app.locator('#sal-immersion').inputValue()).toMatch(/^\d{2}:\d{2}$/);
    expect(app.erreurs).toEqual([]);
});
