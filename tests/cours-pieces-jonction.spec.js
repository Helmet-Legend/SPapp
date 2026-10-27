// Cours sur les pièces de jonction : accès depuis Incendie > Protection & matériels, contenu clé.
const { test, expect } = require('./outils');

test('pièces de jonction : la fiche s\'ouvre avec ses sections et son quiz', async ({ app }) => {
    await app.evaluate(() => showModule('cours-pieces-jonction'));
    const page = app.locator('#cours-pieces-jonction');
    await expect(page).toBeVisible();
    await expect(page.locator('h2')).toContainText('Les pièces de jonction');
    await expect(page).toContainText('Dubois Spécial Paris');
    await expect(page).toContainText('100 / 2 x 65');
    await expect(page.locator('details')).toHaveCount(10);
});

test('pièces de jonction : la fiche est dans le registre, thème Protection & matériels', async ({ app }) => {
    const page = await app.evaluate(() => Navigation.pages().find(p => p.id === 'cours-pieces-jonction'));
    expect(page).toMatchObject({ domaine: 'incendie', theme: 'Protection & matériels', type: 'fiche' });
});

test('pièces de jonction : la recherche trouve la fiche par « DSP » et « retenue »', async ({ app }) => {
    for (const mot of ['DSP', 'retenue']) {
        const ids = await app.evaluate(m => Navigation.pages().filter(p => (p.motsCles || []).some(k => k.toLowerCase() === m.toLowerCase())).map(p => p.id), mot);
        expect(ids).toContain('cours-pieces-jonction');
    }
});
