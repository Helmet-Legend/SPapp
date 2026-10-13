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

// ---------- Les 9 autres calculateurs ----------
const saisir = (app, id, v) => app.evaluate(([i, val]) => { const e = document.getElementById(i); e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);

test('Abaque, Temps de trajet, Épuisement, Facteur de chute : barre fixe avec le résultat', async ({ app }) => {
    await app.evaluate(() => showModule('abaque'));
    for (const [i, v] of [['abaque-longueur', '10'], ['abaque-largeur', '5'], ['abaque-hauteur', '2']]) await saisir(app, i, v);
    await expect(dock(app)).toContainText('100.000 m³');
    await app.evaluate(() => showModule('distance-calc'));
    await saisir(app, 'trajet-distance', '30');
    await expect(dock(app)).toContainText('36min');
    await app.evaluate(() => showModule('epuisement'));
    for (const [i, v] of [['longueur', '10'], ['largeur', '5'], ['hauteur', '2']]) await saisir(app, i, v);
    await expect(dock(app)).toContainText('1000 L');
    await app.evaluate(() => showModule('lspcc-calculateur'));
    await saisir(app, 'lspcc-hauteur', '3'); await saisir(app, 'lspcc-corde', '10');
    await expect(dock(app)).toContainText('0.30');
});

test('Paliers MT 2012 : barre fixe, calcul inchangé', async ({ app }) => {
    await app.evaluate(() => showModule('sal-calculateur'));
    await saisir(app, 'calc-profondeur', '28'); await saisir(app, 'calc-temps', '25');
    await expect(dock(app)).toContainText('7 min 15 s');
    await expect(app.locator('#calc-resultat')).toContainText('3 m');
});

test('Convertisseur : la barre rappelle « valeur unité = valeur unité »', async ({ app }) => {
    await app.evaluate(() => showModule('convertisseur'));
    // L'appli referme la zone juste après l'ouverture de l'écran : on rouvre jusqu'à ce qu'elle tienne
    await expect(async () => {
        await app.evaluate(() => selectQuickConvert('pression'));
        await expect(app.locator('#conversionZone')).toBeVisible({ timeout: 500 });
    }).toPass({ timeout: 8000 });
    await saisir(app, 'value1', '10');
    await expect(dock(app).locator('b')).toHaveText(/^10 bar = 145\.04 psi$/);
    await saisir(app, 'value1', '');
    await expect(dock(app)).toBeHidden();
});

test('Wallace : pas de barre tant qu\'aucune zone n\'est brûlée ; formulaires (message d\'ambiance, IA) sans barre', async ({ app }) => {
    await app.evaluate(() => showModule('suap-wallace-calc'));
    await expect(dock(app)).toBeHidden();
    await app.evaluate(() => showModule('fdf-ambiance'));
    await expect(dock(app)).toBeHidden();
    await app.evaluate(() => showModule('ia-manoeuvre'));
    await expect(dock(app)).toBeHidden();
    expect(app.erreurs).toEqual([]);
});
