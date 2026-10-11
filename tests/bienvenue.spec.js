// Message de bienvenue : affiché à la première ouverture, une seule fois.
const { test, expect } = require('@playwright/test');

test('le message de bienvenue s\'affiche une fois puis disparaît', async ({ page }) => {
    await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
    await page.goto('/index.html');
    const fenetre = page.locator('#bienvenueModal');
    await expect(fenetre).toBeVisible();
    await expect(fenetre).toContainText('Thème clair ou sombre');
    await expect(fenetre).toContainText('Une erreur, une idée');
    await expect(fenetre).toContainText('ergonomie');
    await page.click('#bienvenueModal .bienvenue-ok');
    await expect(fenetre).toBeHidden();
    await page.reload();
    await page.waitForTimeout(1200);
    await expect(fenetre).toBeHidden();
});

test('« Revoir le message de bienvenue » depuis les Réglages, et raccourci vers les Réglages', async ({ page }) => {
    await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
    await page.addInitScript(() => localStorage.setItem('vulcain-bienvenue', '1'));
    await page.goto('/index.html');
    await page.click('#reglagesBtn');
    await page.click('text=Revoir le message de bienvenue');
    await expect(page.locator('#bienvenueModal')).toBeVisible();
    await page.click('#bienvenueModal >> text=Choisir mon thème');
    await expect(page.locator('#bienvenueModal')).toBeHidden();
    await expect(page.locator('#reglagesModal')).toBeVisible();
});
