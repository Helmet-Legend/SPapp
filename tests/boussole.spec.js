// Boussole : cap en degrés, nord vrai/magnétique (déclinaison WMM hors ligne), fiabilité, cap figé.
const { test, expect, ecranActif } = require('./outils');

const ouvrir = async (app) => { await app.evaluate(() => { showModule('boussole'); Boussole.demarrer(); Boussole.definirPosition({ lat: 43.3951, lon: 3.4263 }); }); };
// Envoie des mesures de capteur Android (deviceorientationabsolute) comme le ferait le téléphone
const capteur = (app, alpha, beta = 0, gamma = 0, fois = 12) => app.evaluate(async ([a, b, g, n]) => {
    for (let i = 0; i < n; i++) {
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { alpha: a, beta: b, gamma: g, absolute: true }));
        await new Promise(r => setTimeout(r, 70));
    }
}, [alpha, beta, gamma, fois]);

test('déclinaison : accord avec le modèle de référence WMM 2025 (± 0,05°)', async ({ app }) => {
    const d = await app.evaluate(() => {
        const t = new Date('2026-10-12T00:00:00Z');
        return [[43.4, 3.4], [48.85, 2.35], [-21.1, 55.5], [60, -100], [35, 139]].map(([a, b]) => Declinaison.calculer(a, b, t));
    });
    [2.396, 2.085, -19.481, 4.508, -7.828].forEach((v, i) => expect(Math.abs(d[i] - v)).toBeLessThan(0.05));
    expect(await app.evaluate(() => Declinaison.calculer(90, 0))).toBeNull();
});

test('boussole : le cap suit le capteur, nord vrai = magnétique + déclinaison', async ({ app }) => {
    await ouvrir(app);
    expect(await ecranActif(app)).toBe('boussole');
    await capteur(app, 270); // alpha 270 = cap 90° (est) magnétique
    const decl = await app.evaluate(() => Boussole.declinaison());
    expect(decl).toBeGreaterThan(1.5); expect(decl).toBeLessThan(3.5);
    const vrai = Math.round(90 + decl);
    await expect(app.locator('#bou-cap')).toContainText(String(vrai));
    await expect(app.locator('#bou-dir')).toHaveText('EST');
    await app.click('#bou-nord-mag');
    await expect(app.locator('#bou-cap')).toContainText('90');
    await expect(app.locator('#bou-ref')).toHaveText('Nord magnétique');
    await app.click('#bou-nord-vrai');
    await expect(app.locator('#bou-ref')).toHaveText('Nord vrai (carte)');
    expect(app.erreurs).toEqual([]);
});

test('boussole : le passage par le nord ne fait pas tourner le cadran à l\'envers', async ({ app }) => {
    await ouvrir(app);
    await app.click('#bou-nord-mag');
    await capteur(app, 358, 0, 0, 12);  // cap 2°
    await capteur(app, 2, 0, 0, 12);    // cap 358°
    const t = await app.evaluate(() => document.getElementById('bou-cadran').style.transform);
    const angle = parseFloat(t.match(/-?[\d.]+/)[0]);
    expect(Math.abs(angle)).toBeLessThan(10);
});

test('boussole : indicateurs de fiabilité (inclinaison, stabilité) et capteur absent', async ({ app }) => {
    await ouvrir(app);
    await expect(app.locator('#bou-indicateurs')).toContainText('En attente du capteur');
    await capteur(app, 180, 0, 0, 14);
    await expect(app.locator('#bou-indicateurs')).toContainText('Téléphone à plat');
    await expect(app.locator('#bou-indicateurs')).toContainText('Cap stable');
    await expect(app.locator('#boussole')).toHaveAttribute('data-niveau', /bon|moyen/);
    await capteur(app, 180, 60, 0, 3);
    await expect(app.locator('#bou-indicateurs')).toContainText('Tenez le téléphone à plat');
    await expect(app.locator('#boussole')).toHaveAttribute('data-niveau', 'mauvais');
});

test('boussole : perturbation magnétique signalée', async ({ app }) => {
    await ouvrir(app);
    await app.evaluate(() => Boussole.mesure({ cap: 10, inclinaison: 0, champ: 120 }));
    await expect(app.locator('#bou-indicateurs')).toContainText('Perturbation magnétique');
    await app.evaluate(() => Boussole.mesure({ cap: 10, inclinaison: 0, champ: 48 }));
    await expect(app.locator('#bou-indicateurs')).toContainText('Champ magnétique normal');
});

test('boussole : figer le cap donne le contre-azimut, copie et enregistre la position', async ({ app }) => {
    await ouvrir(app);
    await app.click('#bou-nord-mag');
    await expect(app.locator('#bou-figer')).toBeDisabled();
    await capteur(app, 270, 0, 0, 14); // 90°
    await app.click('#bou-figer');
    await expect(app.locator('#bou-releve')).toBeVisible();
    await expect(app.locator('#bou-releve-cap')).toContainText('90°');
    await expect(app.locator('#bou-releve-retour')).toHaveText('270°');
    await capteur(app, 0, 0, 0, 14); // le cap relevé ne bouge plus
    await expect(app.locator('#bou-releve-cap')).toContainText('90°');
    await app.click('#bou-releve-point');
    const l = await app.evaluate(() => MesPoints.liste());
    expect(l).toHaveLength(1);
    expect(l[0].note).toContain('Cap 90°');
    expect(l[0]).toMatchObject({ lat: 43.3951, lon: 3.4263 });
    await app.click('#bou-figer');
    await expect(app.locator('#bou-releve')).toBeHidden();
});

test('boussole : accessible depuis Se localiser, la recherche et le menu Outils', async ({ app }) => {
    await app.evaluate(() => showModule('localisation'));
    await app.click('#loc-menu-btn');
    await app.click('#loc-menu >> text=Boussole');
    expect(await ecranActif(app)).toBe('boussole');
    await app.evaluate(() => Navigation.allerOnglet('chercher'));
    await app.fill('#navSearchInput', 'boussole');
    await expect(app.locator('#navSearchResults .nav-row[data-page="boussole"]')).toContainText('Boussole');
});

test('boussole : sur iPhone, l\'autorisation est demandée par un appui puis le cap vient de webkitCompassHeading', async ({ app }) => {
    await app.evaluate(() => {
        DeviceOrientationEvent.requestPermission = () => Promise.resolve('granted');
        showModule('boussole');
    });
    await expect(app.locator('#bou-activer')).toBeVisible();
    await app.click('#bou-activer');
    await expect(app.locator('#bou-activer')).toBeHidden();
    await app.evaluate(async () => {
        for (let i = 0; i < 12; i++) {
            const e = new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 0, gamma: 0 });
            Object.defineProperty(e, 'webkitCompassHeading', { value: 200 });
            Object.defineProperty(e, 'webkitCompassAccuracy', { value: 5 });
            window.dispatchEvent(e);
            await new Promise(r => setTimeout(r, 70));
        }
        Boussole.definirPosition(null);
    });
    await app.click('#bou-nord-mag');
    await expect(app.locator('#bou-cap')).toContainText('200');
    await expect(app.locator('#bou-indicateurs')).toContainText('Précision bonne');
});

test('boussole : refus d\'autorisation expliqué', async ({ app }) => {
    await app.evaluate(() => { DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied'); showModule('boussole'); });
    await app.click('#bou-activer');
    await expect(app.locator('#bou-refus')).toBeVisible();
});
