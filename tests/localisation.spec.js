// Outil « Se localiser » : GPS, DFCI, formats, adresse (service simulé).
const { test, expect, ecranActif } = require('./outils');

const ouvrir = (app) => app.evaluate(() => showModule('localisation'));

test('l\'outil est dans la liste des calculateurs et s\'ouvre', async ({ app }) => {
    await app.click('[data-onglet="calculs"]');
    await expect(app.locator('#navHome')).toContainText('Se localiser');
    await app.click('#navHome >> text=Se localiser');
    expect(await ecranActif(app)).toBe('localisation');
});

test('saisir un GPS (DMS) donne le DFCI et les trois écritures, et inversement', async ({ app }) => {
    await ouvrir(app);
    await expect(app.locator('#loc-resultat')).toBeHidden();
    await app.fill('#loc-gps', '43°23\'50" N 3°26\'32" E');
    await expect(app.locator('#loc-dfci')).toHaveValue('GD82E1.3');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.3');
    await expect(app.locator('#loc-r-formats')).toContainText('43° 23,833\' N');
    await app.fill('#loc-gps', '');
    await app.fill('#loc-dfci', 'hd02d1.2');
    await expect(app.locator('#loc-gps')).toHaveValue(/^43\.40\d+ N, 3\.66\d+ E$/);
    await expect(app.locator('#loc-r-dfci')).toHaveText('HD02D1.2');
});

test('la position de l\'appareil remplit tout, avec la précision', async ({ app }) => {
    const context = app.context();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 43.3951, longitude: 3.4263, accuracy: 12 });
    await ouvrir(app);
    await app.click('.loc-ma-position');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.4');
    await expect(app.locator('#loc-r-precision')).toContainText('± 12 m');
});

test('recherche d\'adresse (service simulé) puis adresse la plus proche', async ({ app }) => {
    const reponse = (label, lon, lat, city) => JSON.stringify({ features: [{ geometry: { coordinates: [lon, lat] }, properties: { label, city } }] });
    await app.route('https://data.geopf.fr/geocodage/search**', r => r.fulfill({ status: 200, contentType: 'application/json', body: reponse('5 Rue de la Paix 34500 Béziers', 3.2161, 43.3441, 'Béziers') }));
    await app.route('https://data.geopf.fr/geocodage/reverse**', r => r.fulfill({ status: 200, contentType: 'application/json', body: reponse('Route de Saint-Thibéry 34630 Saint-Thibéry', 3.4263, 43.3951, 'Saint-Thibéry') }));
    await ouvrir(app);
    await app.fill('#loc-adresse', '5 rue de la paix béziers');
    await app.click('#localisation .loc-ligne button');
    await app.click('.loc-adresse');
    await expect(app.locator('#loc-r-adresse')).toContainText('Béziers');
    await expect(app.locator('#loc-dfci')).toHaveValue(/^[A-N]{2}\d\d[A-L]\d\.\d$/);
    await app.fill('#loc-gps', '43.3951 N, 3.4263 E');
    await app.click('#localisation .loc-actions >> text=Adresse la plus proche');
    await expect(app.locator('#loc-r-adresse')).toContainText('Saint-Thibéry');
});

test('service d\'adresses indisponible : message clair, le reste fonctionne', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#loc-adresse', 'rue inconnue');
    await app.click('#localisation .loc-ligne button');
    await expect(app.locator('#loc-etat')).toContainText('indisponible');
    await app.fill('#loc-gps', '43.3951, 3.4263');
    await expect(app.locator('#loc-dfci')).toHaveValue('GD82E1.4');
});

test('« Utiliser dans le message d\'ambiance » reporte DFCI, GPS et commune', async ({ app }) => {
    await app.route('https://data.geopf.fr/geocodage/reverse**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ features: [{ geometry: { coordinates: [3.4263, 43.3951] }, properties: { label: 'Saint-Thibéry', city: 'Saint-Thibéry' } }] }) }));
    await ouvrir(app);
    await app.fill('#loc-gps', '43.3951, 3.4263');
    await app.click('#localisation .loc-actions >> text=Adresse la plus proche');
    await expect(app.locator('#loc-r-adresse')).toContainText('Saint-Thibéry');
    await app.click('#localisation .loc-actions >> text=Utiliser dans le message');
    expect(await ecranActif(app)).toBe('fdf-ambiance');
    await expect(app.locator('#amb-dfci')).toHaveValue('GD82E1.4');
    await expect(app.locator('#amb-commune')).toHaveValue('Saint-Thibéry');
    await expect(app.locator('#amb-apercu')).toContainText('Je suis au carreau DFCI GD82E1.4');
});
