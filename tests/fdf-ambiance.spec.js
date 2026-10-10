// Message d'ambiance FDF : rédaction du message radio et carreau DFCI calculé depuis le GPS.
const { test, expect } = require('./outils');

test('le message d\'ambiance se rédige à partir du formulaire', async ({ app }) => {
    await app.evaluate(() => showModule('fdf-ambiance'));
    await app.fill('#amb-indicatif', 'CCF Saint-Thibéry');
    await app.fill('#amb-codis', '34');
    await app.fill('#amb-commune', 'Saint-Thibéry');
    await app.selectOption('#amb-feu', 'Feu de sous-bois');
    await app.selectOption('#amb-vent-dir', 'NO');
    await app.fill('#amb-vent-force', '40');
    await app.check('input[name="amb-giff"]');
    const msg = await app.textContent('#amb-apercu');
    expect(msg).toContain('De CCF Saint-Thibéry pour CODIS 34');
    expect(msg).toContain('Je suis : Sur la commune de Saint-Thibéry');
    expect(msg).toContain('vent de Nord-Ouest à environ 40 km/h');
    expect(msg).toContain('Je demande : Un GIFF complet.');
});

test('la position GPS renseigne le carreau DFCI (point de référence : GD82E1.4)', async ({ app }) => {
    const context = app.context();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 43.3951, longitude: 3.4263 });
    await app.evaluate(() => showModule('fdf-ambiance'));
    await app.click('#fdf-ambiance .amb-gps button');
    await expect(app.locator('#amb-gps-etat')).toContainText('GD82E1.4');
    await expect(app.locator('#amb-apercu')).toContainText('Carreau DFCI GD82E1.4.');
    await expect(app.locator('#amb-apercu')).toContainText('Coordonnées GPS 43.39510 N, 3.42630 E.');
});

test('le calcul du carreau DFCI retrouve les points de référence', async ({ app }) => {
    const codes = await app.evaluate(() => [[43.3951, 3.4263], [44.671124, 1.27723], [43.4287, 5.0410], [44.0600, 5.0418], [45.6132, 0.1438]]
        .map(([la, lo]) => carreauDFCI(la, lo).code));
    expect(codes).toEqual(['GD82E1.4', 'FE06H1.2', 'KD02L4.5', 'KD08K9.5', 'EF26E5.4']);
});
