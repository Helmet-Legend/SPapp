// Outils communs aux tests DECIOPS
const { test: base, expect } = require('@playwright/test');

const test = base.extend({
    // Page DECIOPS chargée, navigation prête, erreurs JavaScript collectées dans page.erreurs
    app: async ({ page }, use) => {
        page.erreurs = [];
        page.on('pageerror', e => page.erreurs.push(e.message));
        page.on('console', m => {
            if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) page.erreurs.push(m.text());
        });
        page.on('dialog', d => d.accept());
        // Pas d'Internet pendant les tests : CDN, polices… sont coupés pour des résultats stables
        await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
        await page.goto('/index.html');
        await expect(page.locator('#navHome .nav-acc').first()).toBeVisible();
        await use(page);
    },
});

async function ecranActif(page) {
    return page.evaluate(() => document.querySelector('.module.active').id);
}

module.exports = { test, expect, ecranActif };
