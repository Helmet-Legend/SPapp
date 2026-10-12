// Chercher, Favoris, Réglages : suggestions, pastilles de type, état vide, thèmes en cartes, interrupteurs.
const { test, expect, ecranActif } = require('./outils');

test('Chercher : suggestions en un toucher, puis résultats avec pastille de type', async ({ app }) => {
    await app.evaluate(() => Navigation.allerOnglet('chercher'));
    await expect(app.locator('.vue-titre h3')).toHaveText('Rechercher');
    const sugg = app.locator('#navSearchResults [data-suggest]');
    expect(await sugg.count()).toBeGreaterThanOrEqual(5);
    for (const b of await sugg.all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await app.click('#navSearchResults [data-suggest="GPS"]');
    await expect(app.locator('#navSearchInput')).toHaveValue('GPS');
    await expect(app.locator('#navSearchResults .nav-row[data-page="localisation"]')).toBeVisible();
    await expect(app.locator('#navSearchResults .nav-row[data-page="localisation"] .nav-tag')).toHaveText('CALCUL');
    await app.fill('#navSearchInput', 'système feu');
    await expect(app.locator('#navSearchResults .nav-row[data-page="gdoinc-systeme-feu"] .nav-tag')).toHaveText('FICHE');
    await app.fill('#navSearchInput', '');
    await expect(app.locator('#navSearchResults [data-suggest]').first()).toBeVisible();
});

test('Chercher : « Consultés récemment » sous les suggestions', async ({ app }) => {
    await app.evaluate(() => { showModule('ari'); Navigation.allerOnglet('chercher'); });
    await expect(app.locator('#navSearchResults .nav-sect', { hasText: 'Consultés récemment' })).toBeVisible();
    await expect(app.locator('#navSearchResults .nav-row[data-page="ari"]')).toBeVisible();
});

test('Favoris : titre avec le nombre, lignes avec pastille de type', async ({ app }) => {
    await app.evaluate(() => Navigation.allerOnglet('favoris'));
    await expect(app.locator('.vue-titre h3')).toHaveText('Favoris');
    const n = await app.locator('#navHome .nav-row').count();
    await expect(app.locator('.vue-titre .nav-nb')).toHaveText(String(n));
    await expect(app.locator('#navHome .nav-row[data-page="fire"] .nav-tag')).toHaveText('CALCUL');
});

test('Favoris vides : explication et bouton « Voir les calculs »', async ({ app }) => {
    await app.evaluate(() => { localStorage.setItem('deciops.favoris', '[]'); Navigation.allerOnglet('favoris'); });
    await expect(app.locator('.nav-vide b')).toHaveText('Aucun favori');
    await app.click('.nav-vide-btn');
    await expect(app.locator('#navHome .calc-vue')).toBeVisible();
    expect(app.erreurs).toEqual([]);
});

test('Réglages : thèmes en 3 cartes avec aperçu, le choix s\'applique', async ({ app }) => {
    await app.evaluate(() => ouvrirReglages());
    const cartes = app.locator('#reglagesModal [data-theme-choix]');
    await expect(cartes).toHaveCount(3);
    const xs = await cartes.evaluateAll(cs => cs.map(c => Math.round(c.getBoundingClientRect().left)));
    expect(new Set(xs).size).toBe(3);                         // côte à côte
    await expect(app.locator('#reglagesModal .reglages-aperu')).toHaveCount(3);
    await app.click('#reglagesModal [data-theme-choix="clair"]');
    await expect(app.locator('html')).toHaveAttribute('data-theme', 'clair');
    await expect(app.locator('#reglagesModal [data-theme-choix="clair"]')).toHaveAttribute('aria-checked', 'true');
    await app.click('#reglagesModal [data-theme-choix="sombre"]');
    await expect(app.locator('html')).toHaveAttribute('data-theme', 'sombre');
});

test('Réglages : notifications en interrupteurs, version affichée', async ({ app }) => {
    await app.evaluate(() => ouvrirReglages());
    await expect(app.locator('#reglagesModal [role="switch"] .reglages-inter')).toHaveCount(2);
    await expect(app.locator('#reglagesModal .reglages-version')).toContainText('Vulcain v');
    const version = await app.evaluate(() => document.querySelector('#reglagesModal .reglages-version').textContent.match(/v([\d.]+)/)[1]);
    expect(await app.evaluate(() => document.querySelector('.app-footer')?.textContent || '')).toContain(version);
});
