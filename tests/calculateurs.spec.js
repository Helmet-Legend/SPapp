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
    await app.selectOption('#equipage-0-grade', 'SGT');
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

test('paliers MT 2012 Air/Oxy 6 m : 60 m 10 min = 3 min à 9 m, 7 min O₂ à 6 m', async ({ app }) => {
    await app.evaluate(() => showModule('sal-calculateur'));
    await app.selectOption('#calc-methode', 'oxy');
    await app.fill('#calc-profondeur', '60');
    await app.fill('#calc-temps', '10');
    const res = app.locator('#calc-resultat');
    await expect(res).toContainText('9 m3 min');
    await expect(res).toContainText('6 m O₂7 min');
    await expect(res).toContainText('14:15');
    await expect(app.locator('#table-mt2012-oxy details')).toHaveCount(17);
});

test('paliers MT 2012 : plongée successive, Nitrox et altitude', async ({ app }) => {
    await app.evaluate(() => showModule('sal-calculateur'));
    const res = app.locator('#calc-resultat');
    // 30 m 20 min après 1 h 15 de surface : + 25 min → ligne 30 m 45 min
    await app.fill('#calc-profondeur', '30');
    await app.fill('#calc-temps', '20');
    await app.selectOption('#calc-intervalle', '3');
    await expect(res).toContainText('temps équivalent 45 min');
    await expect(res).toContainText('29:00');
    // Nitrox 40/60 à 30 m → 21 m
    await app.selectOption('#calc-intervalle', '');
    await app.selectOption('#calc-melange', '40/60');
    await app.fill('#calc-temps', '40');
    await expect(res).toContainText('profondeur équivalente 21 m');
    await expect(res).toContainText('4:30');
    // Altitude 1000-1500 m, 20 m réels → 27 m
    await app.selectOption('#calc-melange', '');
    await app.selectOption('#calc-altitude', '2');
    await app.fill('#calc-profondeur', '20');
    await app.fill('#calc-temps', '30');
    await expect(res).toContainText('profondeur équivalente 27 m');
    await expect(res).toContainText('7:00');
});

test('Wallace : tête seule (adulte) = 9 %, sous le seuil de gravité', async ({ app }) => {
    await app.evaluate(() => showModule('suap-wallace-calc'));
    await app.click('button[data-zone="tete"]');
    await expect(app.locator('#wallaceTotalPct')).toHaveText('9 %');
    await expect(app.locator('#wallaceInterpretation')).toContainText('refroidie');
});

test('Wallace : au-delà de 20 % (adulte), alerte de gravité', async ({ app }) => {
    await app.evaluate(() => showModule('suap-wallace-calc'));
    await app.click('button[data-zone="tronc_av"]');
    await app.click('button[data-zone="tronc_ar"]');
    await expect(app.locator('#wallaceTotalPct')).toHaveText('36 %');
    await expect(app.locator('#wallaceInterpretation')).toContainText('SB > 20 %');
    await expect(app.locator('#wallaceInterpretation')).toContainText('coordination médicale');
});

test('Wallace : passage en mode enfant recalcule les pourcentages (tête 17 %)', async ({ app }) => {
    await app.evaluate(() => showModule('suap-wallace-calc'));
    await app.click('#wallaceModeEnfant');
    await app.click('button[data-zone="tete"]');
    await expect(app.locator('#wallaceTotalPct')).toHaveText('17 %');
    await expect(app.locator('#wallaceInterpretation')).toContainText('SB > 10 %');
});

test('Wallace : petites taches (main = 1 % chacune) et réinitialisation', async ({ app }) => {
    await app.evaluate(() => showModule('suap-wallace-calc'));
    await app.click('button[onclick="wallaceAjusterMains(1)"]');
    await app.click('button[onclick="wallaceAjusterMains(1)"]');
    await expect(app.locator('#wallaceTotalPct')).toHaveText('2 %');
    await app.click('button[onclick="wallaceReinitialiser()"]');
    await expect(app.locator('#wallaceTotalPct')).toHaveText('0 %');
    await expect(app.locator('#wallaceMainsCompte')).toHaveText('0');
});

test('émulseur (mode direct) : 100 m² à 20 L/min/m², 6 %, 15 min = 1800 L (90 bidons)', async ({ app }) => {
    await app.evaluate(() => showModule('emulseur'));
    await app.click('button[onclick="emuChoisirTaux(20)"]');
    await app.click('button[onclick="emuChoisirConcentration(6)"]');
    await app.fill('#emuSurface', '100');
    await app.fill('#emuDuree', '15');
    await expect(app.locator('#emuResultatPrincipal')).toContainText('1800 L');
    await expect(app.locator('#emuResultatPrincipal')).toContainText('90 bidons de 20 L');
    await expect(app.locator('#emuDetails')).toContainText('2000 L/min');
    await expect(app.locator('#emuDetails')).toContainText('28200 L');
});

test('émulseur (mode inverse) : 100 L de stock à 3 %, 10 L/min/m², 20 min = 16,7 m²', async ({ app }) => {
    await app.evaluate(() => showModule('emulseur'));
    await app.click('button[onclick="emuMode(\'inverse\')"]');
    await expect(app.locator('#emulseurInverse')).toBeVisible();
    await expect(app.locator('#emuInverseResultatPrincipal')).toContainText('16.7 m²');
    await expect(app.locator('#emuInverseDetails')).toContainText('3333 L');
});

test('feux de forêt règle des 3 % : vent 30 km/h = 15 m/min, risque MODÉRÉ', async ({ app }) => {
    await app.evaluate(() => showModule('feu-foret'));
    await app.click('button[onclick="selectVentRapide(30)"]');
    const res = app.locator('#feu-foret-result');
    await expect(res).toContainText('15.0 m/min');
    await expect(res).toContainText('RISQUE MODÉRÉ');
    await expect(res).toContainText('225 m'); // distance à 15 min
    await expect(res).toContainText('1.80 km'); // distance à 2 h
});

test('facteur de chute LSPCC : 2 m sur 5 m de corde = 0,40 (à éviter)', async ({ app }) => {
    await app.evaluate(() => showModule('lspcc-calculateur'));
    await app.fill('#lspcc-hauteur', '2');
    await app.fill('#lspcc-corde', '5');
    const res = app.locator('#lspcc-resultat');
    await expect(res).toContainText('0.40');
    await expect(res).toContainText('FACTEUR À ÉVITER');
});

test('facteur de chute LSPCC : 6 m sur 4 m de corde = 1,50 (interdit)', async ({ app }) => {
    await app.evaluate(() => showModule('lspcc-calculateur'));
    await app.fill('#lspcc-hauteur', '6');
    await app.fill('#lspcc-corde', '4');
    await expect(app.locator('#lspcc-resultat')).toContainText('1.50');
    await expect(app.locator('#lspcc-resultat')).toContainText('FACTEUR INTERDIT');
});

test('convertisseur : 90 km/h = 25 m/s', async ({ app }) => {
    await app.evaluate(() => showModule('convertisseur'));
    await app.click('button[onclick="selectQuickConvert(\'vitesse\')"]');
    await app.click('button[onclick="setQuickValue(90)"]');
    await expect(app.locator('#value2')).toHaveText('25.0000');
});

test('convertisseur : 37 °C = 98,6 °F', async ({ app }) => {
    await app.evaluate(() => showModule('convertisseur'));
    await app.click('button[onclick="selectQuickConvert(\'temperature\')"]');
    await app.click('button[onclick="setQuickValue(37)"]');
    await expect(app.locator('#value2')).toHaveText('98.6000');
});

test('abaque des charges : 1 m³ d\'eau = 1,00 tonne, d\'essence = 730 kg', async ({ app }) => {
    await app.evaluate(() => showModule('abaque'));
    await expect.poll(() => app.evaluate(() => densityData.length)).toBeGreaterThan(0);
    await app.fill('#abaque-longueur', '2');
    await app.fill('#abaque-largeur', '1');
    await app.fill('#abaque-hauteur', '0.5');
    const res = app.locator('#abaque-results');
    await expect(res).toContainText('1.00');
    await expect(res).toContainText('tonnes');
    await expect(res).toContainText('730');
});

test('épuisement de volume : 10×5 m, 50 cm d\'eau, 1 pompe 30 m³/h = 50 min', async ({ app }) => {
    await app.evaluate(() => showModule('epuisement'));
    await app.click('button[onclick="modifierQuantite(\'mat30\', 1)"]');
    await expect(app.locator('#surfaceEpuis')).toHaveText('50.00 m²');
    await expect(app.locator('#volumeEau')).toHaveText('25000 L (25.00 m³)');
    await expect(app.locator('#tempsTotalEpuis')).toHaveText('50 min');
    await expect(app.locator('#detailMateriel')).toContainText('500 L/min');
});
