// Outil « Se localiser » v2 : champ unique (DFCI / GPS / adresse), résultat, barre d'actions, récents (services simulés).
const { test, expect, ecranActif } = require('./outils');

const ouvrir = (app) => app.evaluate(() => showModule('localisation'));
const reponse = (label, lon, lat, city) => JSON.stringify({ features: [{ geometry: { coordinates: [lon, lat] }, properties: { label, name: label.split(' 3')[0], city, postcode: '34500' } }] });

test('l\'outil est dans la liste des calculateurs et s\'ouvre', async ({ app }) => {
    await app.click('[data-onglet="calculs"]');
    await expect(app.locator('#navHome')).toContainText('Se localiser');
    await app.click('#navHome >> text=Se localiser');
    expect(await ecranActif(app)).toBe('localisation');
    await expect(app.locator('#loc-vide')).toBeVisible();
    await expect(app.locator('#loc-resultat')).toBeHidden();
    await expect(app.locator('#loc-barre')).toBeHidden();
});

test('dans l\'onglet Calculs : boussole pour « Se localiser », carte pour « Carte DFCI »', async ({ app }) => {
    await app.click('[data-onglet="calculs"]');
    await expect(app.locator('#navHome [data-page="localisation"] .calc-ic use')).toHaveAttribute('href', '#i-k-compass');
    await expect(app.locator('#navHome [data-page="carte-dfci"] .calc-ic use')).toHaveAttribute('href', '#i-k-map');
});

test('champ unique : un GPS (DMS) donne le DFCI et les trois écritures, et inversement', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#loc-saisie', '43°23\'50" N 3°26\'32" E');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.3');
    await expect(app.locator('#loc-r-formats')).toContainText('43° 23,833\' N');
    await expect(app.locator('#loc-barre')).toBeVisible();
    await expect(app.locator('#loc-vide')).toBeHidden();
    await app.fill('#loc-saisie', 'hd02d1.2');
    await expect(app.locator('#loc-r-dfci')).toHaveText('HD02D1.2');
    await expect(app.locator("#loc-r-formats")).toContainText(/43\.40\d+° N/);
    await expect(app.locator("#loc-r-formats")).toContainText(/3\.66\d+° E/);
});

test('saisie invalide : message clair, bordure rouge, aucun résultat', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#loc-saisie', 'GD82Z9');
    await expect(app.locator('#loc-etat')).toContainText('Carreau non reconnu');
    await expect(app.locator('#loc-saisie')).toHaveClass(/loc-erreur/);
    await expect(app.locator('#loc-resultat')).toBeHidden();
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    await expect(app.locator('#loc-saisie')).not.toHaveClass(/loc-erreur/);
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.4');
});

test('une adresse n\'est jamais prise pour un GPS et propose la recherche', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#loc-saisie', '5 rue de la paix 17 Béziers');
    await expect(app.locator('#loc-chercher')).toBeVisible();
    await expect(app.locator('#loc-resultat')).toBeHidden();
});

test('la position de l\'appareil remplit tout, avec la précision', async ({ app }) => {
    const context = app.context();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 43.3951, longitude: 3.4263, accuracy: 12 });
    await ouvrir(app);
    await app.click('.loc-ma-position');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.4');
    await expect(app.locator('#loc-saisie')).toHaveValue('GD82E1.4');
    await expect(app.locator('#loc-r-precision')).toContainText('± 12 m');
});

test('recherche d\'adresse (service simulé) puis adresse la plus proche à l\'ouverture du bloc', async ({ app }) => {
    await app.route('https://data.geopf.fr/geocodage/search**', r => r.fulfill({ status: 200, contentType: 'application/json', body: reponse('5 Rue de la Paix 34500 Béziers', 3.2161, 43.3441, 'Béziers') }));
    await app.route('https://data.geopf.fr/geocodage/reverse**', r => r.fulfill({ status: 200, contentType: 'application/json', body: reponse('Route de Saint-Thibéry 34630 Saint-Thibéry', 3.4263, 43.3951, 'Saint-Thibéry') }));
    await ouvrir(app);
    await app.fill('#loc-saisie', '5 rue de la paix béziers');
    await app.press('#loc-saisie', 'Enter');
    await expect(app.locator('.loc-adresse')).toContainText('34500 Béziers');
    await app.click('.loc-adresse');
    await expect(app.locator('#loc-r-adresse')).toContainText('Béziers');
    await expect(app.locator('#loc-r-dfci')).toHaveText(/^[A-N]{2}\d\d[A-L]\d\.\d$/);
    await app.fill('#loc-saisie', '43.3951 N, 3.4263 E');
    await expect(app.locator('#loc-r-adresse')).toContainText('Ouvrez pour la chercher');
    await app.click('#loc-adresse-bloc summary');
    await expect(app.locator('#loc-r-adresse')).toContainText('Saint-Thibéry');
});

test('service d\'adresses indisponible : message clair, le reste fonctionne', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#loc-saisie', 'rue inconnue');
    await app.click('#loc-chercher');
    await expect(app.locator('#loc-etat')).toContainText('indisponible');
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.4');
});

test('copie par format, copie de tout et exemples cliquables', async ({ app }) => {
    await app.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await ouvrir(app);
    await app.click('[data-exemple="GD82E1.4"]');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.4');
    await expect(app.locator('#loc-r-formats')).toContainText('Degrés, minutes décimales · DMD');
    await expect(app.locator('#loc-r-formats')).toContainText('LAT');
    await expect(app.locator('[data-copie="dms"]')).toHaveText('⧉ Copier');
    await app.click('[data-copie="dms"]');
    await expect(app.locator('[data-copie="dms"]')).toHaveText('✓ Copié');
    expect(await app.evaluate(() => navigator.clipboard.readText())).toMatch(/^43° \d+' \d+" N, 3° \d+' \d+" E$/);
    await app.click('#loc-barre >> text=Tout copier');
    const t = await app.evaluate(() => navigator.clipboard.readText());
    expect(t).toContain('DFCI : GD82E1.4');
    expect(t).toContain('google.com/maps');
});

test('menu ⋯ : actions rares, fond de mini-carte mémorisé, effacer', async ({ app }) => {
    await ouvrir(app);
    await expect(app.locator('#loc-menu')).toBeHidden();
    await app.click('#loc-menu-btn');
    await expect(app.locator('#loc-menu')).toBeVisible();
    await expect(app.locator('#loc-fond')).toContainText('Plan IGN');
    await app.click('#loc-fond');
    await expect(app.locator('#loc-fond')).toContainText('Photo aérienne');
    expect(await app.evaluate(() => localStorage.getItem('vulcain-carte-fond'))).toBe('photo');
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    await expect(app.locator('#loc-resultat')).toBeVisible();
    await app.click('#loc-menu >> text=Effacer');
    await expect(app.locator('#loc-resultat')).toBeHidden();
    await expect(app.locator('#loc-saisie')).toHaveValue('');
    await expect(app.locator('#loc-menu')).toBeHidden();
});

test('derniers points : mémorisés sur l\'appareil (5 au maximum) et rappelables', async ({ app }) => {
    await ouvrir(app);
    for (const c of ['GD82E1.4', 'GD82E1.3', 'HD02D1.2']) {
        await app.fill('#loc-saisie', c);
        await app.waitForFunction((code) => (JSON.parse(localStorage.getItem('vulcain-loc-recents') || '[]')[0] || {}).code === code, c, { timeout: 6000 });
    }
    const r = await app.evaluate(() => JSON.parse(localStorage.getItem('vulcain-loc-recents')).map(x => x.code));
    expect(r).toEqual(['HD02D1.2', 'GD82E1.3', 'GD82E1.4']);
    await app.click('#loc-menu-btn');
    await app.click('#loc-menu >> text=Effacer');
    await expect(app.locator('#loc-recents button')).toHaveCount(3);
    await app.click('#loc-recents button >> nth=1');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.3');
});

test('hors ligne : bandeau explicite, DFCI et GPS toujours calculés', async ({ app }) => {
    await ouvrir(app);
    await expect(app.locator('#loc-hors-ligne')).toBeHidden();
    await app.context().setOffline(true);
    await expect(app.locator('#loc-hors-ligne')).toBeVisible();
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.4');
    await expect(app.locator('#loc-meteo')).toContainText('Hors ligne');
    await app.context().setOffline(false);
    await expect(app.locator('#loc-hors-ligne')).toBeHidden();
});

test('« Vers message d\'ambiance » reporte DFCI, GPS et commune', async ({ app }) => {
    await app.route('https://data.geopf.fr/geocodage/reverse**', r => r.fulfill({ status: 200, contentType: 'application/json', body: reponse('Saint-Thibéry', 3.4263, 43.3951, 'Saint-Thibéry') }));
    await ouvrir(app);
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    await app.click('#loc-adresse-bloc summary');
    await expect(app.locator('#loc-r-adresse')).toContainText('Saint-Thibéry');
    await app.click('#loc-barre >> text=message d\'ambiance');
    expect(await ecranActif(app)).toBe('fdf-ambiance');
    await expect(app.locator('#amb-dfci')).toHaveValue('GD82E1.4');
    await expect(app.locator('#amb-commune')).toHaveValue('Saint-Thibéry');
    await expect(app.locator('#amb-apercu')).toContainText('Je suis au carreau DFCI GD82E1.4');
});
