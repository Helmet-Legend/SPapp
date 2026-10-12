// Refonte des calculateurs : barre de résultat fixe, habillage commun, calculs inchangés.
const { test, expect } = require('./outils');

const dock = (app) => app.locator('.calc-dock');

test('ARI : la barre fixe rappelle l\'autonomie et suit le calcul', async ({ app }) => {
    await app.evaluate(() => { showModule('ari'); calculerAutonomieARI(); });
    await expect(dock(app)).toBeVisible();
    await expect(dock(app)).toContainText('Autonomie totale');
    const avant = await app.locator('#autonomieTotale').textContent();
    await expect(dock(app).locator('b')).toHaveText(avant.trim());
    await app.fill('#pressionARI', '200');
    await expect(dock(app).locator('b')).not.toHaveText(avant.trim());
    await expect(dock(app).locator('b')).toHaveText((await app.locator('#autonomieTotale').textContent()).trim());
    expect(app.erreurs).toEqual([]);
});

test('ARI : les formules ne changent pas (300 bar, 9 L, 105 l/min → 25,7 min)', async ({ app }) => {
    await app.evaluate(() => { showModule('ari'); document.getElementById('pressionARI').value = 300; document.getElementById('volumeARI').value = 9; document.getElementById('consoARI').value = 105; calculerAutonomieARI(); });
    await expect(app.locator('#autonomieExacte')).toContainText('25.71');
});

test('Puissance du feu : la barre affiche la puissance totale ; elle disparaît hors calculateur', async ({ app }) => {
    await app.evaluate(() => { showModule('fire'); addFire('fenetre'); addFire('porte'); });
    await expect(dock(app)).toContainText('6.0 MW');
    await app.evaluate(() => showModule('home'));
    await expect(dock(app)).toBeHidden();
    await app.evaluate(() => showModule('tmd'));
    await expect(dock(app)).toBeHidden();
});

test('Règle des 3 % et Additif : barre fixe avec le résultat', async ({ app }) => {
    await app.evaluate(() => { showModule('feu-foret'); selectVentRapide(30, document.querySelector('[data-vent="30"]')); });
    await expect(dock(app)).toContainText('15.0 m/min');
    await app.evaluate(() => showModule('emulseur'));
    await expect(dock(app)).toContainText('Émulseur nécessaire');
});

test('calculateurs : champs de saisie hauts (≥ 56 px) et boutons ≥ 44 px', async ({ app }) => {
    await app.evaluate(() => showModule('ari'));
    const h = await app.locator('#pressionARI').boundingBox();
    expect(h.height).toBeGreaterThanOrEqual(55);
    for (const b of await app.locator('#ari .form-group button').all()) {
        if (await b.isVisible()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
});

test('Copier : le résultat de la barre est copié sans erreur', async ({ app }) => {
    await app.evaluate(() => { showModule('ari'); calculerAutonomieARI(); });
    await app.click('.calc-dock-copier');
    expect(app.erreurs).toEqual([]);
});
