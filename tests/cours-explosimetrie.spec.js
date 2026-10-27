// Cours d'explosimétrie : accès depuis le menu Risques GAZ, contenu clé, valeurs de LIE/LSE du cours.
const { test, expect } = require('./outils');

test('cours d\'explosimétrie : ouvert depuis le menu Risques GAZ, avec ses sections et son quiz', async ({ app }) => {
    await app.evaluate(() => showModule('risques-gaz-menu'));
    await app.click('button.menu-banniere:has(img[alt^="03 – Cours d\'explosimétrie"])');
    const page = app.locator('#cours-explosimetrie');
    await expect(page).toBeVisible();
    await expect(page.locator('h2')).toContainText('Cours d\'explosimétrie');
    await expect(page).toContainText('20 % LIE');
    await expect(page).toContainText('74,2 %');
    await expect(page.locator('details')).toHaveCount(10);
});

test('cours d\'explosimétrie : le bouton Retour ramène au menu Risques GAZ', async ({ app }) => {
    await app.evaluate(() => showModule('cours-explosimetrie'));
    await app.click('#cours-explosimetrie .back-btn');
    await expect(app.locator('#risques-gaz-menu')).toBeVisible();
});

test('explosimétrie : LIE et LSE alignées sur le cours (propane, butane, pentane, essence, CO)', async ({ app }) => {
    const v = await app.evaluate(async () => {
        const g = await (await fetch('data/gaz.json')).json();
        return ['methane', 'propane', 'butane', 'pentane', 'essence', 'monoxyde'].map(k => [g[k].lie, g[k].lse]);
    });
    expect(v).toEqual([[5, 15], [2.1, 9.3], [1.9, 8.4], [1.5, 7.8], [1.6, 7.6], [12.5, 74.2]]);
});
