// Message d'ambiance FDF : rédaction du message radio, carreau DFCI et point GPS (dans les deux sens).
const { test, expect } = require('./outils');

const ouvrir = (app) => app.evaluate(() => showModule('fdf-ambiance'));

test('le message d\'ambiance est prérédigé dans l\'ordre du canevas', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#amb-indicatif', 'CCF Saint-Thibéry');
    await app.fill('#amb-codis', '34');
    await app.fill('#amb-dfci', 'gd 82 e1.4');
    await app.fill('#amb-commune', 'Saint-Thibéry');
    await app.fill('#amb-lieudit', 'La Rouquette');
    await app.fill('#amb-repere', 'au sud du château');
    await app.fill('#amb-feu', 'feu de sous-bois');
    await app.selectOption('#amb-vegetation', 'Pinède');
    await app.selectOption('#amb-surf-brulee-p', 'environ 5 000 m²');
    await app.selectOption('#amb-propagation', 'très rapide, feu virulent');
    await app.selectOption('#amb-vent-dir', 'NO');
    await app.selectOption('#amb-vent-force', 'soutenue');
    await app.selectOption('#amb-relief', 'montant');
    await app.selectOption('#amb-acces', 'Accès difficile');
    await app.fill('#amb-piste', 'DFCI 32');
    await app.selectOption('#amb-surf-menacee-p', 'environ 1 hectare');
    await app.selectOption('#amb-front-p', 'environ 200 m');
    await app.check('input[value="habitation isolée"]');
    await app.selectOption('#amb-sensible-dist-p', '__autre');
    await app.fill('#amb-sensible-dist', '450 mètres');
    await app.check('input[name="amb-demande"][value="terrestre"]');
    await app.check('input[name="amb-demande"][value="aérien"]');
    await app.check('input[name="amb-demande"][value="commandement"]');
    await app.fill('#amb-demande-autre', 'Gendarmerie pour boucler un axe');
    const msg = await app.textContent('#amb-apercu');
    const ordre = ['CODIS 34 de CCF Saint-Thibéry', 'Je suis au carreau DFCI GD82E1.4,', 'sur la commune de Saint-Thibéry, au lieu-dit La Rouquette.',
        'Au sud du château.', 'Je vois un feu de sous-bois en pinède.', 'La surface brûlée est estimée à environ 5 000 m².',
        'Le feu est virulent, avec une propagation très rapide.', 'Le vent est de Nord-Ouest, de force soutenue.', 'Le relief est montant.',
        'Accès difficile par la piste DFCI 32.', 'La surface menacée est estimée à environ 1 hectare.', 'Le front de feu mesure environ 200 m.',
        'Point sensible : habitation isolée, à 450 mètres.', 'Je demande des renforts terrestres, des moyens aériens et un commandement.',
        'Autre : Gendarmerie pour boucler un axe.', 'Je poursuis la reconnaissance.', 'Je prends l\'appellation COS Saint-Thibéry.', 'Fin de message.'];
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
    await expect(app.locator('#amb-apercu')).toContainText('Je suis au carreau DFCI GD82E1.4, aux coordonnées GPS 43.39510 N, 3.42630 E.');
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
