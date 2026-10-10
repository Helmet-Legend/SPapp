// Message d'ambiance FDF : rédaction du message radio, carreau DFCI et point GPS (dans les deux sens).
const { test, expect } = require('./outils');

const ouvrir = (app) => app.evaluate(() => showModule('fdf-ambiance'));

test('le message d\'ambiance se rédige dans l\'ordre du canevas', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#amb-indicatif', 'CCF Saint-Thibéry');
    await app.fill('#amb-codis', '34');
    await app.fill('#amb-dfci', 'gd 82 e1.4');
    await app.fill('#amb-commune', 'Saint-Thibéry');
    await app.fill('#amb-lieudit', 'La Rouquette');
    await app.fill('#amb-repere', 'au sud du château');
    await app.fill('#amb-feu', 'feu de sous-bois');
    await app.selectOption('#amb-vegetation', 'Pinède');
    await app.selectOption('#amb-propagation', 'rapide');
    await app.selectOption('#amb-vent-dir', 'NO');
    await app.selectOption('#amb-vent-force', 'soutenue');
    await app.selectOption('#amb-relief', 'montant');
    await app.fill('#amb-surf-brulee', '5000');
    await app.fill('#amb-surf-menacee', '2');
    await app.selectOption('#amb-surf-menacee-u', 'hectares');
    await app.fill('#amb-front', '150');
    await app.check('input[value="habitation isolée"]');
    await app.fill('#amb-sensible-dist', '500');
    await app.selectOption('#amb-terrestre', 'un GIFF');
    await app.selectOption('#amb-aerien', 'un appui aérien HBE sur zone');
    await app.fill('#amb-demande-autre', 'Gendarmerie pour boucler un axe');
    const msg = await app.textContent('#amb-apercu');
    const ordre = ['Carreau DFCI GD82E1.4.', 'Commune de Saint-Thibéry.', 'Lieu-dit La Rouquette.', 'Au sud du château.', 'Feu de sous-bois.', 'Végétation : pinède.', 'Propagation rapide.',
        'Vent de Nord-Ouest, force soutenue.', 'Relief montant.', 'Surface brûlée 5000 m².', 'Surface menacée 2 hectares.', 'Longueur du front de feu 150 m.',
        'Point sensible : habitation isolée, à 500 mètres.', 'Je demande : Un GIFF et un appui aérien HBE sur zone.', 'Autre : Gendarmerie pour boucler un axe.',
        'Je poursuis la reconnaissance.', 'Je prends l\'appellation COS Saint-Thibéry.'];
    let pos = -1;
    for (const e of ordre) { const i = msg.indexOf(e); expect(i, e).toBeGreaterThan(pos); pos = i; }
    expect(msg).not.toContain('carrossable');
});

test('la position GPS renseigne le point DFCI et le GPS (référence : GD82E1.4)', async ({ app }) => {
    const context = app.context();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 43.3951, longitude: 3.4263 });
    await ouvrir(app);
    await app.click('#fdf-ambiance .amb-gps button');
    await expect(app.locator('#amb-dfci')).toHaveValue('GD82E1.4');
    await expect(app.locator('#amb-gps')).toHaveValue('43.39510 N, 3.42630 E');
    await expect(app.locator('#amb-apercu')).toContainText('Carreau DFCI GD82E1.4. Coordonnées GPS 43.39510 N, 3.42630 E.');
});

test('saisir le DFCI calcule le GPS, et inversement', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#amb-dfci', 'GD82E1.4');
    const gps = await app.inputValue('#amb-gps');
    expect(gps).toMatch(/^43\.397\d+ N, 3\.424\d+ E$/);
    await app.fill('#amb-dfci', '');
    await app.fill('#amb-gps', '44.0600 N, 5.0418 E');
    await expect(app.locator('#amb-dfci')).toHaveValue('KD08K9.5');
    await app.fill('#amb-gps', '43,3951 3,4263');
    await expect(app.locator('#amb-dfci')).toHaveValue('GD82E1.4');
});

test('un DFCI invalide est signalé et ne modifie pas le GPS', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#amb-gps', '43.3951 N, 3.4263 E');
    await app.fill('#amb-dfci', 'GD8');
    await expect(app.locator('#amb-geo-etat')).toContainText('incomplet ou invalide');
    await expect(app.locator('#amb-gps')).toHaveValue('43.3951 N, 3.4263 E');
});

test('le calcul du carreau DFCI retrouve les points de référence et fait l\'aller-retour', async ({ app }) => {
    const r = await app.evaluate(() => {
        const pts = [[43.3951, 3.4263], [44.671124, 1.27723], [43.4287, 5.0410], [44.0600, 5.0418], [45.6132, 0.1438]];
        const codes = pts.map(([la, lo]) => carreauDFCI(la, lo).code);
        const retour = ['GD82E1', 'GD82E1.1', 'GD82E1.2', 'GD82E1.3', 'GD82E1.4', 'GD82E1.5'].map(c => {
            const g = dfciVersGPS(lireDFCI(c));
            return carreauDFCI(g.lat, g.lon).code;
        });
        return { codes, retour };
    });
    expect(r.codes).toEqual(['GD82E1.4', 'FE06H1.2', 'KD02L4.5', 'KD08K9.5', 'EF26E5.4']);
    expect(r.retour).toEqual(['GD82E1.5', 'GD82E1.1', 'GD82E1.2', 'GD82E1.3', 'GD82E1.4', 'GD82E1.5']);
});
