// Calculateur de paliers : plusieurs palanquées (8 au maximum), chacune avec son propre calcul.
const { test, expect } = require('./outils');

const saisir = (app, id, v) => app.evaluate(([i, val]) => {
    const e = document.getElementById(i); e.value = val;
    e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
}, [id, v]);
const palanquee = async (app, prof, temps, immersion) => {
    await saisir(app, 'calc-profondeur', prof); await saisir(app, 'calc-temps', temps);
    if (immersion) await saisir(app, 'sal-immersion', immersion);
};
const ouvrir = async app => { await app.evaluate(() => showModule('sal-calculateur')); await expect(app.locator('.pal-onglet.actif')).toHaveText(/P1/); };
const ajouter = async app => { await app.locator('#pal-ajouter').click(); };

test('une seule palanquée au départ : écran inchangé, pas de synthèse', async ({ app }) => {
    await ouvrir(app);
    await expect(app.locator('.pal-onglet:not(.pal-plus)')).toHaveCount(1);
    await expect(app.locator('#pal-synthese')).toBeHidden();
    await palanquee(app, '30', '25', '10:00');
    await expect(app.locator('#calc-resultat')).toContainText('3 m');
    await expect(app.locator('.sal-vision-sortie b')).toHaveText('10:33');
});

test('trois palanquées : chacune garde son calcul, la synthèse les classe par heure de sortie', async ({ app }) => {
    await ouvrir(app);
    await palanquee(app, '30', '25', '10:00');
    await ajouter(app);
    await expect(app.locator('.pal-onglet.actif')).toHaveText(/P2/);
    expect(await app.locator('#calc-profondeur').inputValue()).toBe('');
    expect(await app.locator('#sal-immersion').inputValue()).toBe('');
    await palanquee(app, '20', '40', '10:05');
    await ajouter(app);
    await palanquee(app, '35', '20', '10:15');
    // sorties au plus tôt : P1 10:33, P2 10:50, P3 10:45 -> ordre P1, P3, P2
    const lignes = app.locator('#pal-lignes .pal-ligne');
    await expect(lignes).toHaveCount(3);
    await expect(lignes.nth(0)).toContainText('P1');
    await expect(lignes.nth(0)).toContainText('10:33');
    await expect(lignes.nth(0)).toContainText('Prochaine à sortir');
    await expect(lignes.nth(1)).toContainText('P3');
    await expect(lignes.nth(1)).toContainText('10:45');
    await expect(lignes.nth(2)).toContainText('P2');
    await expect(lignes.nth(2)).toContainText('10:50');
    // revenir sur P1 : ses réglages et son résultat sont intacts
    await app.locator('.pal-onglet', { hasText: 'P1' }).first().click();
    expect(await app.locator('#calc-profondeur').inputValue()).toBe('30');
    expect(await app.locator('#sal-immersion').inputValue()).toBe('10:00');
    await expect(app.locator('.sal-vision-sortie b')).toHaveText('10:33');
    await expect(app.locator('#calc-resultat')).toContainText('7:15');
});

test('le résultat d\'une palanquée est celui du calculateur seul (aucun calcul n\'est modifié)', async ({ app }) => {
    await ouvrir(app);
    await palanquee(app, '30', '25', '10:00');
    const seul = await app.locator('#calc-resultat').innerHTML();
    await ajouter(app);
    await palanquee(app, '20', '40', '10:05');
    await app.locator('.pal-onglet', { hasText: 'P1' }).first().click();
    expect(await app.locator('#calc-resultat').innerHTML()).toBe(seul);
});

test('8 palanquées au maximum', async ({ app }) => {
    await ouvrir(app);
    for (let i = 0; i < 7; i++) await ajouter(app);
    await expect(app.locator('.pal-onglet:not(.pal-plus)')).toHaveCount(8);
    await expect(app.locator('#pal-ajouter')).toBeDisabled();
    await expect(app.locator('#pal-dupliquer')).toBeDisabled();
});

test('dupliquer copie les réglages, sans l\'heure d\'immersion', async ({ app }) => {
    await ouvrir(app);
    await palanquee(app, '20', '40', '10:05');
    await saisir(app, 'calc-methode', 'oxy');
    await app.locator('#pal-dupliquer').click();
    await expect(app.locator('.pal-onglet.actif')).toHaveText(/P2/);
    expect(await app.locator('#calc-profondeur').inputValue()).toBe('20');
    expect(await app.locator('#calc-temps').inputValue()).toBe('40');
    expect(await app.locator('#calc-methode').inputValue()).toBe('oxy');
    expect(await app.locator('#sal-immersion').inputValue()).toBe('');
});

test('nom modifiable, suppression avec confirmation, « tout effacer »', async ({ app }) => {
    await ouvrir(app);
    await expect(app.locator('#pal-supprimer')).toBeDisabled();
    await palanquee(app, '30', '25', '10:00');
    await app.locator('#pal-nom').fill('Binôme Alpha');
    await expect(app.locator('.pal-onglet.actif')).toContainText('Binôme Alpha');
    await ajouter(app);
    await palanquee(app, '20', '40', '10:05');
    await app.locator('#pal-supprimer').click();   // confirm() accepté par la fixture
    await expect(app.locator('.pal-onglet:not(.pal-plus)')).toHaveCount(1);
    await expect(app.locator('.pal-onglet.actif')).toContainText('Binôme Alpha');
    expect(await app.locator('#calc-profondeur').inputValue()).toBe('30');
    await ajouter(app);
    await app.locator('#pal-effacer').click();
    await expect(app.locator('.pal-onglet:not(.pal-plus)')).toHaveCount(1);
    expect(await app.locator('#calc-profondeur').inputValue()).toBe('');
});

test('les palanquées sont retrouvées après rechargement, calculs refaits', async ({ app }) => {
    await ouvrir(app);
    await palanquee(app, '30', '25', '10:00');
    await ajouter(app);
    await palanquee(app, '20', '40', '10:05');
    await app.reload();
    await app.evaluate(() => showModule('sal-calculateur'));
    await expect(app.locator('.pal-onglet:not(.pal-plus)')).toHaveCount(2);
    await expect(app.locator('#pal-lignes .pal-ligne').nth(0)).toContainText('10:33');
    await expect(app.locator('#pal-lignes .pal-ligne').nth(1)).toContainText('10:50');
    await expect(app.locator('.pal-onglet.actif')).toHaveText(/P2/);
});

test('mobile 375 px : pas de défilement latéral de la page avec 8 palanquées', async ({ app }) => {
    await app.setViewportSize({ width: 375, height: 800 });
    await ouvrir(app);
    await palanquee(app, '30', '25', '10:00');
    for (let i = 0; i < 7; i++) { await ajouter(app); await palanquee(app, String(20 + i), '30', '10:' + String(10 + i)); }
    expect(await app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await expect(app.locator('#pal-lignes .pal-ligne')).toHaveCount(8);
});
