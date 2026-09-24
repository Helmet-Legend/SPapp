// Calculateurs et formulaires : résultats vérifiés sur des valeurs connues.
const { test, expect } = require('./outils');

test('temps de trajet : 110 km à 90 km/h = 1h 13min', async ({ app }) => {
    await app.evaluate(() => showModule('distance-calc'));
    await app.fill('#trajet-distance', '110');
    await app.click('button[onclick="selectVitesse(90)"]');
    await expect(app.locator('#trajet-temps')).toHaveText('1h 13min');
    await expect(app.locator('#trajet-vitesse-display')).toHaveText('90 km/h');
});

test('explosimètre : propane lu 25 % sur un appareil étalonné méthane = 10,5 % LIE', async ({ app }) => {
    await app.evaluate(() => showModule('explosimetrie'));
    await expect(app.locator('#gazPresentsGrid button').first()).toBeVisible();
    await app.selectOption('#gazEtalon', 'methane');
    await app.fill('#valeurExplo', '20');
    await app.click('#btnGaz-propane');
    await app.click('button[onclick="adjustValeurExplo(5)"]');
    await expect(app.locator('#valeurExplo')).toHaveValue('25');
    await expect(app.locator('#valeurCorrigee')).toHaveText('10.5 % LIE');
});

test('explosimètre : la recherche filtre les gaz', async ({ app }) => {
    await app.evaluate(() => showModule('explosimetrie'));
    await app.fill('#searchGaz', 'prop');
    await expect(app.locator('#btnGaz-propane')).toBeVisible();
    await expect(app.locator('#btnGaz-methane')).toBeHidden();
});

test('PATRAC DR : ajouter puis retirer un véhicule', async ({ app }) => {
    await app.evaluate(() => showModule('patrac-dr'));
    await app.click("button[onclick=\"ajouterVehiculeAvecEquipage('FPT', 8)\"]");
    await expect(app.locator('#modalEquipage')).toBeVisible();
    await app.fill('#modalNumero', 'FPT 347');
    await app.fill('#equipage-0-grade', 'SGT');
    await app.fill('#equipage-0-nom', 'DUPONT');
    await app.click('button[onclick="validerEquipage()"]');
    await expect(app.locator('#listeVehiculesEquipages')).toContainText('FPT 347');
    await expect(app.locator('#listeVehiculesEquipages')).toContainText('SGT DUPONT');
    await app.click('button[onclick="retirerVehiculeEquipage(0)"]');
    await expect(app.locator('#listeVehiculesEquipages')).toContainText('Aucun véhicule ajouté');
});

test('PATRAC DR : ajouter un chef d\'agrès', async ({ app }) => {
    await app.evaluate(() => showModule('patrac-dr'));
    await app.evaluate(() => ajouterCA());
    await expect(app.locator('#listeCA input')).toHaveCount(3);
});

test('bouteilles de gaz : identification par couleur et protocole de refroidissement', async ({ app }) => {
    await app.evaluate(() => { showModule('bouteilles'); showBouteillesSection('identification'); });
    await app.evaluate(() => identifierBouteilleParCouleur('jaune'));
    await expect(app.locator('#resultatIdentificationBouteille')).toContainText('TOXIQUE');
    await app.evaluate(() => { showBouteillesSection('refroidissement'); ouvrirPopupRefroidissement('standard'); });
    await expect(app.locator('#popupProtocoleStandard')).toBeVisible();
});

test('base TMD : recherche par nom', async ({ app }) => {
    // La base est chargée en arrière-plan après l'affichage
    await expect.poll(() => app.evaluate(() => tmdDatabase.length)).toBeGreaterThan(100);
    await app.evaluate(() => showModule('tmd'));
    await app.fill('#searchName', 'essence');
    await expect(app.locator('#tmdResults .result-box').first()).toBeVisible();
});
