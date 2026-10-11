// Carte DFCI : grille dessinée sur le téléphone (hors ligne), niveaux selon le zoom, point touché, recherche.
const { test, expect, ecranActif } = require('./outils');

const ouvrir = async (app) => {
    await app.evaluate(() => showModule('carte-dfci'));
    await expect(app.locator('#cd-carte .leaflet-container, #cd-carte.leaflet-container')).toBeVisible();
};

test('la carte DFCI est dans les outils et s\'ouvre sans erreur', async ({ app }) => {
    await app.click('[data-onglet="calculs"]');
    await expect(app.locator('#navHome')).toContainText('Carte DFCI');
    await app.click('#navHome >> text=Carte DFCI');
    expect(await ecranActif(app)).toBe('carte-dfci');
    await expect(app.locator('#cd-carte.leaflet-container')).toBeVisible();
    expect(app.erreurs.filter(e => !/tile|net::|Failed/i.test(e))).toEqual([]);
});

test('la grille change de niveau selon le zoom et s\'étiquette avec les vrais codes', async ({ app }) => {
    await ouvrir(app);
    await app.evaluate(() => CarteDFCI.carte().setView([43.4, 3.4], 6, { animate: false }));
    let e = await app.evaluate(() => CarteDFCI.etat());
    expect(e.niveau).toBe('100km');
    expect(e.etiquettes).toBeGreaterThan(0);
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 9, { animate: false }));
    e = await app.evaluate(() => CarteDFCI.etat());
    expect(e.niveau).toBe('20km');
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 12, { animate: false }));
    e = await app.evaluate(() => CarteDFCI.etat());
    expect(e.niveau).toBe('2km');
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 15, { animate: false }));
    e = await app.evaluate(() => CarteDFCI.etat());
    expect(e.niveau).toBe('2km+zones');
    const textes = await app.locator('.cd-etiquette span').allTextContents();
    expect(textes.some(t => /^GD82E1\.[1-5]$/.test(t))).toBe(true);
});

test('chercher un carreau ou un GPS centre la carte et affiche le code', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#cd-recherche', 'gd82e1.4');
    await app.press('#cd-recherche', 'Enter');
    await expect(app.locator('#cd-i-dfci')).toHaveText('GD82E1.4');
    await expect(app.locator('#cd-i-formats')).toContainText('DMS');
    await app.fill('#cd-recherche', '44.0600, 5.0418');
    await app.press('#cd-recherche', 'Enter');
    await expect(app.locator('#cd-i-dfci')).toHaveText('KD08K9.5');
    await app.fill('#cd-recherche', 'n’importe quoi');
    await app.press('#cd-recherche', 'Enter');
    await expect(app.locator('#cd-etat')).toContainText('non reconnus');
});

test('toucher la carte donne le carreau du point touché', async ({ app }) => {
    await ouvrir(app);
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 14, { animate: false }));
    await app.locator('#cd-carte').click({ position: { x: 150, y: 150 } });
    await expect(app.locator('#cd-info')).toBeVisible();
    const attendu = await app.evaluate(() => {
        const c = CarteDFCI.carte(), p = c.containerPointToLatLng([150, 150]);
        return carreauDFCI(p.lat, p.lng).code;
    });
    await expect(app.locator('#cd-i-dfci')).toHaveText(attendu);
    await app.click('#cd-info >> text=Ambiance');
    expect(await ecranActif(app)).toBe('fdf-ambiance');
    await expect(app.locator('#amb-dfci')).toHaveValue(attendu);
});

test('depuis « Se localiser » : voir le point sur la carte DFCI', async ({ app }) => {
    await app.evaluate(() => showModule('localisation'));
    await app.fill('#loc-gps', '43.3951, 3.4263');
    await app.click('#localisation .loc-actions >> text=Voir sur la carte DFCI');
    expect(await ecranActif(app)).toBe('carte-dfci');
    await expect(app.locator('#cd-i-dfci')).toHaveText('GD82E1.4');
});

test('sans réseau : la grille reste là et un message prévient pour le fond', async ({ app }) => {
    await ouvrir(app);
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 12, { animate: false }));
    await expect(app.locator('#cd-alerte-fond')).toBeVisible({ timeout: 15000 });
    expect((await app.evaluate(() => CarteDFCI.etat())).lignes).toBeGreaterThan(5);
    await app.click('#carte-dfci [data-fond="aucun"]');
    await expect(app.locator('#cd-alerte-fond')).toBeHidden();
});

test('plein écran : la carte occupe l\'écran, on peut en sortir', async ({ app }) => {
    await ouvrir(app);
    const avant = await app.locator('#cd-carte').boundingBox();
    await app.click('#cd-plein');
    await expect(app.locator('#carte-dfci.cd-plein')).toBeVisible();
    const plein = await app.locator('#cd-carte').boundingBox();
    expect(plein.height).toBeGreaterThan(avant.height);
    await app.click('#cd-plein');
    await expect(app.locator('#carte-dfci.cd-plein')).toHaveCount(0);
    await expect(app.locator('.app-header')).toBeVisible();
});
