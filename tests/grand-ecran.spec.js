// Version grand écran (≥ 1000 px) : barre latérale, contenu à droite, grilles larges. Le téléphone ne change pas.
const { test, expect } = require('./outils');

const rect = (app, sel) => app.locator(sel).first().boundingBox();
const debordement = (app) => app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe('ordinateur 1280 × 800', () => {
    test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

    test('barre latérale à gauche : logo, boutons et onglets en colonne', async ({ app }) => {
        const header = await rect(app, '.app-header');
        expect(header.x).toBe(0);
        expect(header.width).toBeLessThan(260);
        const onglets = await app.locator('#navTabbar button:visible').evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; }));
        expect(onglets.length).toBeGreaterThanOrEqual(4);
        onglets.forEach(([x]) => expect(x).toBeLessThan(40));
        for (let i = 1; i < onglets.length; i++) expect(onglets[i][1]).toBeGreaterThan(onglets[i - 1][1]);
        expect(app.erreurs).toEqual([]);
    });

    test('les onglets fonctionnent depuis la barre latérale', async ({ app }) => {
        await app.click('#navTabbar [data-onglet="calculs"]');
        await expect(app.locator('#navHome .calc-vue')).toBeVisible();
        await app.click('#navTabbar [data-onglet="chercher"]');
        await expect(app.locator('#navSearchInput')).toBeVisible();
        await app.click('#navTabbar [data-onglet="accueil"]');
        await expect(app.locator('#navHome .nav-acc').first()).toBeVisible();
    });

    test('le contenu commence à droite de la barre latérale et ne déborde pas', async ({ app }) => {
        for (const ecran of ['accueil', 'calculs']) {
            await app.evaluate(e => Navigation.allerOnglet(e), ecran);
            const nav = await rect(app, '#navHome');
            expect(nav.x).toBeGreaterThanOrEqual(232);
            expect(await debordement(app)).toBeLessThanOrEqual(0);
        }
        await app.evaluate(() => showModule('gdoinc-systeme-feu'));
        expect((await rect(app, '#gdoinc-systeme-feu')).x).toBeGreaterThanOrEqual(232);
        expect(await debordement(app)).toBeLessThanOrEqual(0);
        await app.evaluate(() => { showModule('ari'); calculerAutonomieARI(); });
        expect(await debordement(app)).toBeLessThanOrEqual(0);
    });

    test('accueil : bannière photo, recherche sous la photo (elle ne la masque pas), domaines sur 4 colonnes', async ({ app }) => {
        const fond = await rect(app, '.accueil-fond');
        expect(fond.height).toBeLessThan(320);
        expect(fond.x).toBeGreaterThanOrEqual(232);
        const rech = await rect(app, '.hero-recherche');
        expect(rech.y).toBeGreaterThanOrEqual(fond.y + fond.height);      // aucun recouvrement de la photo
        expect(rech.y - (fond.y + fond.height)).toBeLessThan(40);        // mais juste en dessous
        const premiere = await rect(app, '#navHome > *');
        expect(premiere.y).toBeGreaterThanOrEqual(rech.y + rech.height);  // le contenu commence sous la barre
        const hautes = await app.locator('#navHome > .nav-acc').evaluateAll(cs => cs.slice(0, 8).map(c => Math.round(c.getBoundingClientRect().top)));
        expect(new Set(hautes.slice(0, 4)).size).toBe(1);   // 4 cartes sur la première ligne
        expect(hautes[4]).toBeGreaterThan(hautes[0]);
    });

    test('calculs : cartes sur 3 colonnes', async ({ app }) => {
        await app.evaluate(() => Navigation.allerOnglet('calculs'));
        const tops = await app.locator('#calcListe .calc-carte').evaluateAll(cs => cs.slice(0, 6).map(c => Math.round(c.getBoundingClientRect().top)));
        expect(new Set(tops.slice(0, 3)).size).toBe(1);
        expect(tops[3]).toBeGreaterThan(tops[0]);
    });

    test('barre de résultat des calculateurs : à droite de la barre latérale', async ({ app }) => {
        await app.evaluate(() => { showModule('ari'); calculerAutonomieARI(); });
        const dock = await rect(app, '.calc-dock');
        expect(dock.x).toBeGreaterThanOrEqual(232);
    });
});

test('téléphone : disposition inchangée (onglets en bas, pas de barre latérale)', async ({ app }) => {
    const bar = await rect(app, '#navTabbar');
    const vh = await app.evaluate(() => window.innerHeight);
    expect(bar.y + bar.height).toBeGreaterThan(vh - 30);
    expect(bar.width).toBeGreaterThan(300);
    const header = await rect(app, '.app-header');
    expect(header.width).toBeGreaterThan(300);
});

test('accueil : photos des domaines agrandies en hauteur (120 px sur téléphone)', async ({ app }) => {
    const h = await app.locator('#navHome > .nav-acc .nav-acc-photo').first().evaluate(e => Math.round(e.getBoundingClientRect().height));
    expect(h).toBe(120);
});
