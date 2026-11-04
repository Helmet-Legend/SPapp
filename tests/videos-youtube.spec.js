// Vidéos YouTube en vignette cliquable : la vidéo ne se charge qu'au toucher.
const { test, expect } = require('./outils');

const VIDEOS = [
    ['echelles-coulisses', 'KXNNDZpP_ss'],
    ['suap-hemorragies', 'kTzO5aTEC0c'],
    ['rdmi-etb-lance', 'M0HU5zFhYeo'],
    ['gto-securite', 'CTwQQlE2TDU'],
    ['gto-securite', 'eQnpXvkX53s'],
];

for (const [module, id] of VIDEOS) {
    test(`vidéo ${id} dans ${module} : vignette, puis lecteur au toucher`, async ({ app }) => {
        await app.route(/youtube-nocookie\.com|ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '' }));
        await app.evaluate(m => showModule(m), module);
        const vignette = app.locator(`#${module} .yt-facade[onclick*="${id}"]`);
        await expect(vignette).toHaveCount(1);
        await expect(vignette.locator('img')).toHaveAttribute('src', `https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
        await expect(app.locator(`#${module} a[href="https://youtu.be/${id}"]`)).toHaveCount(1);
        await expect(app.locator(`#${module} iframe[src*="${id}"]`)).toHaveCount(0);   // rien ne charge avant le toucher
        await vignette.scrollIntoViewIfNeeded();
        await vignette.click();
        const lecteur = app.locator(`#${module} iframe[src*="${id}"]`);
        await expect(lecteur).toHaveCount(1);
        await expect(lecteur).toHaveAttribute('src', new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${id}\\?`));
        // Le lecteur garde la taille de la vignette (pas les 300 × 150 px par défaut d'un iframe)
        const t = await lecteur.boundingBox();
        expect(t.width).toBeGreaterThan(320);
        expect(Math.abs(t.width / t.height - 16 / 9)).toBeLessThan(0.05);
    });
}
