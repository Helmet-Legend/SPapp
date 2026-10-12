// Onglet Calculs (kit UI) : Terrain en tête, familles, recherche, récents, photos ; accès rapide de l'accueil.
const { test, expect, ecranActif } = require('./outils');
const registre = require('../data/navigation.json');

const calculs = registre.pages.filter(p => p.type === 'calculateur');
const ouvrirCalculs = (app) => app.click('[data-onglet="calculs"]');

test('Terrain en tête : 4 tuiles dans l\'ordre, avec photo, puis la liste par famille sans doublon', async ({ app }) => {
    await ouvrirCalculs(app);
    const tuiles = app.locator('#navHome .calc-tuile');
    await expect(tuiles).toHaveCount(4);
    await expect(tuiles.nth(0)).toContainText('Se localiser');
    await expect(tuiles.nth(1)).toContainText('Mes points');
    await expect(tuiles.nth(2)).toContainText('Carte DFCI');
    await expect(tuiles.nth(3)).toContainText("Message d'ambiance");
    await expect(app.locator('#navHome .calc-carte')).toHaveCount(calculs.length - 4);
    const ids = await app.evaluate(() => [...document.querySelectorAll('#navHome .calc-tuile, #navHome .calc-carte')].map(b => b.dataset.page));
    expect(new Set(ids).size).toBe(calculs.length);
    await expect(app.locator('#navHome .calc-photo')).toHaveCount(calculs.length);
});

test('chaque calcul a une photo qui existe, une icône et un nom accessible', async ({ app }) => {
    for (const p of calculs) {
        expect(p.photo, p.id).toBeTruthy();
        expect(p.kit, p.id).toBeTruthy();
        const r = await app.evaluate(async (u) => { const x = await fetch(u); return { ok: x.ok, type: x.headers.get('content-type'), n: (await x.arrayBuffer()).byteLength }; }, p.photo);
        expect(r.ok, p.photo).toBe(true);
        expect(r.type).toMatch(/webp/);
        expect(r.n, p.photo).toBeLessThan(60 * 1024);
        expect(await app.evaluate((k) => !!document.getElementById('i-k-' + k), p.kit), p.kit).toBe(true);
    }
    await ouvrirCalculs(app);
    const sansNom = await app.evaluate(() => [...document.querySelectorAll('#navHome .calc-tuile, #navHome .calc-carte')].filter(b => b.textContent.trim().length < 4).length);
    expect(sansNom).toBe(0);
});

test('les photos sont en cache hors ligne (précache du service worker)', async () => {
    const sw = require('fs').readFileSync(require('path').join(__dirname, '..', 'sw.js'), 'utf8');
    for (const p of calculs) expect(sw, p.photo).toContain('./' + p.photo);
});

test('filtres par famille : un appui filtre, « Tous » rétablit, l\'état se voit', async ({ app }) => {
    await ouvrirCalculs(app);
    await expect(app.locator('.calc-filtre[aria-pressed="true"]')).toHaveText('Tous');
    await app.click('.calc-filtre[data-fam="inc"]');
    await expect(app.locator('.calc-filtre[aria-pressed="true"]')).toContainText('Incendie');
    const inc = calculs.filter(p => p.domaine === 'incendie').length;
    await expect(app.locator('#navHome .calc-carte')).toHaveCount(inc);
    await expect(app.locator('#navHome .calc-tuile')).toHaveCount(0);
    await app.click('.calc-filtre[data-fam="fdf"]');
    await expect(app.locator('#navHome .calc-carte')).toHaveCount(calculs.filter(p => p.domaine === 'fdf').length);
    await expect(app.locator('#navHome')).toContainText("Message d'ambiance");
    await app.click('.calc-filtre[data-fam="tout"]');
    await expect(app.locator('#navHome .calc-tuile')).toHaveCount(4);
    // Chaque filtre de la barre est une cible tactile d'au moins 44 px
    for (const b of await app.locator('.calc-filtre').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
});

test('recherche : filtre en direct, état « aucun résultat », conserve la saisie', async ({ app }) => {
    await ouvrirCalculs(app);
    await app.fill('#calcRecherche', 'plong');
    await expect(app.locator('#navHome .calc-carte')).toHaveCount(1);
    await expect(app.locator('#navHome .calc-carte')).toContainText('paliers');
    await expect(app.locator('#navHome .calc-tuile')).toHaveCount(0);
    await app.fill('#calcRecherche', 'gps');
    await expect(app.locator('#navHome [data-page="localisation"]')).toBeVisible();
    await app.fill('#calcRecherche', 'zzzz');
    await expect(app.locator('#navHome .calc-vide')).toContainText('Aucun calcul ne correspond');
    await expect(app.locator('#calcRecherche')).toBeFocused();
    await expect(app.locator('#calcRecherche')).toHaveValue('zzzz');
});

test('récents : absents au départ, puis les 3 derniers calculs ouverts, le plus récent d\'abord', async ({ app }) => {
    await ouvrirCalculs(app);
    await expect(app.locator('.calc-recents')).toHaveCount(0);
    for (const id of ['pertes', 'localisation', 'fire', 'tmd']) await app.evaluate((i) => showModule(i), id);
    await ouvrirCalculs(app);
    const r = app.locator('.calc-recents button');
    await expect(r).toHaveCount(3);                      // « tmd » n'est pas un calculateur : ignoré
    await expect(r.nth(0)).toContainText('Puissance du feu');
    await expect(r.nth(1)).toContainText('Se localiser');
    await expect(r.nth(2)).toContainText('Pertes de charge');
    await r.nth(1).click();
    expect(await ecranActif(app)).toBe('localisation');
});

test('accueil : accès rapide Terrain (3 outils) au-dessus des domaines, domaine Outils en sous-rubriques', async ({ app }) => {
    const rapide = app.locator('#navHome .acces-btn');
    await expect(rapide).toHaveCount(3);
    await expect(rapide.nth(0)).toContainText('Se localiser');
    await expect(rapide.nth(1)).toContainText('Mes points');
    await expect(rapide.nth(2)).toContainText('Carte DFCI');
    for (const b of await rapide.all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await rapide.nth(2).click();
    expect(await ecranActif(app)).toBe('carte-dfci');
    await app.evaluate(() => Navigation.allerOnglet('accueil'));
    await app.click('[data-domaine="outils"]');
    await expect(app.locator('#navHome [data-theme="outils|Localisation et carte"]')).toBeVisible();
    await expect(app.locator('#navHome [data-theme="outils|Calculs pratiques"]')).toBeVisible();
    await app.click('[data-theme="outils|Localisation et carte"]');
    await expect(app.locator('#navHome .nav-leaf')).toHaveCount(4);
});

test('thème clair et sombre : le texte des cartes reste lisible', async ({ app }) => {
    await ouvrirCalculs(app);
    for (const theme of ['clair', 'sombre']) {
        await app.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        const bas = await app.evaluate(() => {
            const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
            const res = [];
            document.querySelectorAll('#navHome .calc-carte').forEach((b) => {
                const t = getComputedStyle(b.querySelector('.calc-tx b')).color, f = getComputedStyle(b).backgroundColor;
                const [a, c] = [lum(t), lum(f)].sort((x, y) => y - x);
                res.push((a + .05) / (c + .05));
            });
            return Math.min(...res);
        });
        expect(bas, theme).toBeGreaterThan(4.5);
    }
});
