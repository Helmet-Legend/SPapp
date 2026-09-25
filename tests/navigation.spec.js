// Navigation : menus déroulants, onglets, recherche, favoris, fil d'Ariane, geste retour.
const fs = require('fs');
const path = require('path');
const { test, expect, ecranActif } = require('./outils');

const registre = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/navigation.json'), 'utf8'));

test('l\'accueil affiche un menu par domaine', async ({ app }) => {
    await expect(app.locator('#navHome .nav-acc')).toHaveCount(registre.domaines.length);
});

test('menu › sous-menu › fiche, avec fil d\'Ariane', async ({ app }) => {
    await app.click('[data-domaine="specialites"]');
    await app.click('[data-theme="specialites|SAL / SAV – Plongée"]');
    await app.click('.nav-leaf[data-page="sal-tables"]');
    expect(await ecranActif(app)).toBe('sal-tables');
    await expect(app.locator('#sal-tables .nav-crumbs nav')).toContainText('Spécialités & sauvetage');
    await expect(app.locator('#sal-tables .nav-crumbs nav')).toContainText('SAL / SAV – Plongée');
});

test('un seul menu ouvert à la fois', async ({ app }) => {
    await app.click('[data-domaine="incendie"]');
    await app.click('[data-domaine="specialites"]');
    await expect(app.locator('[data-domaine="incendie"]')).toHaveAttribute('aria-expanded', 'false');
    await expect(app.locator('[data-domaine="specialites"]')).toHaveAttribute('aria-expanded', 'true');
    await app.click('[data-theme="specialites|SAL / SAV – Plongée"]');
    await app.click('[data-theme="specialites|ELD – Exploration longue durée"]');
    await expect(app.locator('[data-theme="specialites|SAL / SAV – Plongée"]')).toHaveAttribute('aria-expanded', 'false');
    await expect(app.locator('[data-theme="specialites|ELD – Exploration longue durée"]')).toHaveAttribute('aria-expanded', 'true');
    await app.click('[data-domaine="specialites"]');
    await expect(app.locator('#navHome .nav-acc-head[aria-expanded="true"]')).toHaveCount(0);
});

test('chaque fiche du registre s\'ouvre depuis les menus', async ({ app }) => {
    test.setTimeout(420000);   // parcourt les ~190 fiches une par une
    const pages = registre.pages.filter(p => p.type !== 'menu');
    for (const p of pages) {
        await app.evaluate(() => Navigation.allerOnglet('accueil'));
        const domaineOuvert = await app.getAttribute(`[data-domaine="${p.domaine}"]`, 'aria-expanded');
        if (domaineOuvert !== 'true') await app.click(`[data-domaine="${p.domaine}"]`);
        const feuille = app.locator(`.nav-leaf[data-page="${p.id}"]`);
        if (!(await feuille.isVisible())) await app.click(`[data-theme="${p.domaine}|${p.theme}"]`);
        await feuille.click({ timeout: 5000 }).catch(e => { throw new Error(`Fiche ${p.id} : ${e.message}`); });
        expect(await ecranActif(app), p.id).toBe(p.id);
    }
});

test('onglet Calculs : tous les calculateurs', async ({ app }) => {
    await app.click('[data-onglet="calculs"]');
    const attendus = registre.pages.filter(p => p.type === 'calculateur').length;
    await expect(app.locator('#navHome .nav-row')).toHaveCount(attendus);
});

test('recherche par titre, mot-clé et texte de la fiche', async ({ app }) => {
    await app.click('[data-onglet="chercher"]');
    await expect(app.locator('#navSearchInput')).toBeFocused();

    await app.fill('#navSearchInput', 'rcp');
    await expect(app.locator('#navSearchResults [data-page="suap-rcp"]')).toBeVisible();

    await app.fill('#navSearchInput', 'acétylène');
    await expect(app.locator('#navSearchResults [data-page="bouteilles"]')).toBeVisible();
});

test('recherche d\'un n° ONU dans la base TMD', async ({ app }) => {
    await app.click('[data-onglet="chercher"]');
    await app.fill('#navSearchInput', '1203');
    await app.click('#navSearchResults [data-tmd]');
    expect(await ecranActif(app)).toBe('tmd');
    await expect(app.locator('#searchONU')).toHaveValue('1203');
    await expect(app.locator('#tmdResults .result-box').first()).toBeVisible();
});

test('ajouter et retrouver un favori', async ({ app }) => {
    await app.evaluate(() => showModule('suap-hemorragies'));
    await app.click('#suap-hemorragies .nav-fav');
    await expect(app.locator('#suap-hemorragies .nav-fav')).toHaveAttribute('aria-pressed', 'true');
    await app.click('[data-onglet="favoris"]');
    await expect(app.locator('#navHome [data-page="suap-hemorragies"]')).toBeVisible();
});

test('le geste retour revient à l\'écran et à l\'onglet précédents', async ({ app }) => {
    await app.click('[data-onglet="calculs"]');
    await app.click('#navHome [data-page="ari"]');
    expect(await ecranActif(app)).toBe('ari');

    await app.goBack();
    expect(await ecranActif(app)).toBe('home');
    await expect(app.locator('#navHome')).toHaveAttribute('data-vue', 'calculs');

    await app.goBack();
    await expect(app.locator('#navHome')).toHaveAttribute('data-vue', 'accueil');
});

test('les boutons « ← Retour » des fiches fonctionnent', async ({ app }) => {
    await app.evaluate(() => showModule('sal-tables'));
    await app.click('#sal-tables > .back-btn');
    expect(await ecranActif(app)).toBe('sal-menu');
});

test('la fenêtre À propos s\'ouvre et affiche la version', async ({ app }) => {
    const version = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;
    await app.click('.about-btn');
    await expect(app.locator('#aboutModal')).toHaveClass(/active/);
    await expect(app.locator('#aboutModal .app-version').first()).toHaveText(version);
    await app.keyboard.press('Escape');
    await expect(app.locator('#aboutModal')).not.toHaveClass(/active/);
});
