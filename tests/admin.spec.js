// Onglet Admin : visible seulement si la clé administrateur est mémorisée sur l'appareil.
const { test, expect, ecranActif } = require('./outils');

test('l\'onglet Admin est masqué par défaut', async ({ app }) => {
    await expect(app.locator('#navOngletAdmin')).toBeHidden();
    await expect(app.locator('#navTabbar button:visible')).toHaveCount(4);
});

test('avec la clé mémorisée : onglet Admin, page d\'administration, verrouillage', async ({ page }) => {
    await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
    await page.addInitScript(() => localStorage.setItem('vulcain-push-admin', JSON.stringify('cle-de-test')));
    await page.goto('/index.html');
    await expect(page.locator('#navOngletAdmin')).toBeVisible();
    await page.click('#navOngletAdmin');
    for (const t of ['Tableau de bord', 'Messages reçus', 'Envoyer une notification', 'Verrouiller']) {
        await expect(page.locator('#navHome')).toContainText(t);
    }
    await page.click('[data-admin="dashboard"]');
    expect(await ecranActif(page)).toBe('admin-dashboard');
    await page.evaluate(() => showModule('home'));
    await page.click('#navOngletAdmin');
    await page.click('[data-admin="verrouiller"]');
    await expect(page.locator('#navOngletAdmin')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('vulcain-push-admin'))).toBeNull();
});

test('les liens d\'administration des Réglages sont masqués sans clé', async ({ app }) => {
    await app.click('#reglagesBtn');
    await expect(app.locator('.reglages-admin:visible')).toHaveCount(0);
});

test('geste caché : 7 appuis sur la version, clé vérifiée par le serveur, puis accès admin', async ({ app }) => {
    let appels = 0;
    await app.route('**/api/admin-stats', route => {
        appels++;
        route.fulfill({ status: appels === 1 ? 401 : 200, contentType: 'application/json', body: JSON.stringify(appels === 1 ? { erreur: 'Clé administrateur incorrecte' } : { ok: true }) });
    });
    await app.click('.about-btn');
    await expect(app.locator('#adminDeverrouillage')).toBeHidden();
    for (let i = 0; i < 6; i++) await app.click('#aboutModal .app-version');
    await expect(app.locator('#adminDeverrouillage')).toBeHidden();
    await app.click('#aboutModal .app-version');
    await expect(app.locator('#adminDeverrouillage')).toBeVisible();
    await app.fill('#adminCleSaisie', 'mauvaise');
    await app.click('#adminDeverrouillage button');
    await expect(app.locator('#adminRetour')).toContainText('Clé refusée');
    await expect(app.locator('#navOngletAdmin')).toBeHidden();
    await app.fill('#adminCleSaisie', 'bonne');
    await app.click('#adminDeverrouillage button');
    await expect(app.locator('#adminRetour')).toContainText('activé');
    await expect(app.locator('#navOngletAdmin')).toBeVisible();
    expect(await app.evaluate(() => JSON.parse(localStorage.getItem('vulcain-push-admin')))).toBe('bonne');
});

const SERIE = (v) => Array.from({ length: 30 }, (_, i) => ({ jour: `2026-09-${String(i + 1).padStart(2, '0')}`, total: v(i) }));
const STATS = {
    ok: true, jours: 30, genere: '2026-10-11T08:00:00.000Z',
    stats: {
        ouverture: { serie: SERIE(i => i + 1), total: 465 },
        generation: { serie: SERIE(() => 1), total: 30 },
        pdf: { serie: SERIE(i => (i % 3 ? 0 : 2)), total: 20 },
    },
    topFiches: [{ fiche: 'gdoinc-eau', vues: 42 }, { fiche: 'fire', vues: 17 }],
    vues: { 'gdoinc-eau': 42, fire: 17 },
    profil: { mode: { application: 30, navigateur: 10 }, theme: { sombre: 25, clair: 15 }, version: { '1.69.33': 30, '1.69.30': 10 }, visiteur: { nouveau: 12, retour: 28 }, heure: Array.from({ length: 24 }, (_, h) => (h === 21 ? 9 : 1)) },
    recherches: [{ terme: 'citerne', n: 8 }], recherchesVides: [{ terme: 'drone thermique', n: 3 }],
    abonnes: { total: 12, nouveautes: 12, messages: 9, contact: 1 }, messages: 4,
};

test('le tableau de bord affiche usage, profil, contenu, recherches et communication', async ({ page }) => {
    await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
    await page.addInitScript(() => localStorage.setItem('vulcain-push-admin', JSON.stringify('cle')));
    await page.route('**/api/admin-stats', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STATS) }));
    await page.goto('/index.html');
    await page.click('#navOngletAdmin');
    await page.click('[data-admin="dashboard"]');
    await page.click('text=Charger les statistiques');
    const zone = page.locator('#statsCartes');
    for (const t of ['Aujourd\'hui', '7 derniers jours', 'Nouveaux visiteurs', 'App installée', 'Thème sombre', '1.69.33', 'heure la plus active',
        'Fiches les plus consultées', 'Vues par domaine', 'jamais consultée', 'citerne', 'drone thermique', '12 appareils abonnés', '4 messages reçus']) {
        await expect(zone, t).toContainText(t);
    }
    expect(await page.evaluate(() => document.querySelector('#statsCartes').scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('les recherches sont envoyées, une fois par mot, sans les saisies trop courtes', async ({ app }) => {
    const envoyes = [];
    await app.route('**/api/stats-evenement', route => { try { envoyes.push(JSON.parse(route.request().postData())); } catch (e) { /* ignoré */ } route.fulfill({ status: 204 }); });
    await app.click('[data-onglet="chercher"]');
    await app.fill('#navSearchInput', 'ci');
    await app.waitForTimeout(1800);
    await app.fill('#navSearchInput', 'citerne');
    await app.waitForTimeout(1900);
    const recherches = envoyes.filter(e => e.type === 'recherche');
    expect(recherches.map(r => r.terme)).toEqual(['citerne']);
    expect(typeof recherches[0].resultats).toBe('number');
});
