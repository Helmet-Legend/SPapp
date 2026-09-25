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

// Tables MT 2012 (annexe II du référentiel SAL) : valeurs officielles
test('paliers MT 2012 : 30 m 30 min = 10 min à 3 m, total 12:15', async ({ app }) => {
    await app.evaluate(() => showModule('sal-calculateur'));
    await app.fill('#calc-profondeur', '30');
    await app.fill('#calc-temps', '30');
    const res = app.locator('#calc-resultat');
    await expect(res).toContainText('3 m10 min');
    await expect(res).toContainText('12:15');
    await expect(res).toContainText('Possible');
});

test('paliers MT 2012 : 45 m 20 min = 3 min à 9 m, 5 à 6 m, 12 à 3 m', async ({ app }) => {
    await app.evaluate(() => showModule('sal-calculateur'));
    await app.fill('#calc-profondeur', '45');
    await app.fill('#calc-temps', '20');
    const res = app.locator('#calc-resultat');
    await expect(res).toContainText('9 m3 min');
    await expect(res).toContainText('6 m5 min');
    await expect(res).toContainText('3 m12 min');
    await expect(res).toContainText('23:00');
});

test('paliers MT 2012 : 28 m 22 min se lit sur la ligne 30 m 25 min', async ({ app }) => {
    await app.evaluate(() => showModule('sal-calculateur'));
    await app.fill('#calc-profondeur', '28');
    await app.fill('#calc-temps', '22');
    const res = app.locator('#calc-resultat');
    await expect(res).toContainText('30 m – 25 min');
    await expect(res).toContainText('3 m5 min');
    await expect(res).toContainText('7:15');
});

test('paliers MT 2012 : temps hors table et plongée sans palier', async ({ app }) => {
    await app.evaluate(() => showModule('sal-calculateur'));
    await app.fill('#calc-profondeur', '60');
    await app.fill('#calc-temps', '40');
    await expect(app.locator('#calc-resultat')).toContainText('35 min');
    await app.fill('#calc-profondeur', '18');
    await app.fill('#calc-temps', '50');
    await expect(app.locator('#calc-resultat')).toContainText('sans palier');
    await expect(app.locator('#table-mt2012 details')).toHaveCount(17);
});
