// GNR Risques radiologiques : fiche dans le registre (thème NRBC), contenu clé, quiz.
const { test, expect } = require('./outils');

test('GNR risques radiologiques : la fiche s\'ouvre avec ses sections et son quiz', async ({ app }) => {
    await app.evaluate(() => showModule('gnr-risques-radiologiques'));
    const page = app.locator('#gnr-risques-radiologiques');
    await expect(page).toBeVisible();
    await expect(page.locator('h2')).toContainText('Risques radiologiques');
    await expect(page).toContainText('2,5 µGy/h');
    await expect(page).toContainText('GEMINI');
    await expect(page.locator('details')).toHaveCount(10);
});

test('GNR risques radiologiques : registre et recherche', async ({ app }) => {
    const page = await app.evaluate(() => Navigation.pages().find(p => p.id === 'gnr-risques-radiologiques'));
    expect(page).toMatchObject({ domaine: 'risques', theme: 'NRBC', type: 'fiche' });
    const ids = await app.evaluate(() => Navigation.pages().filter(p => (p.motsCles || []).some(k => k.toLowerCase() === 'cmir')).map(p => p.id));
    expect(ids).toContain('gnr-risques-radiologiques');
});
