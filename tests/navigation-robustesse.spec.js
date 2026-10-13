// Robustesse de la navigation : script de validation du registre et comportement face à un registre défaillant.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { test, expect } = require('./outils');

test.use({ serviceWorkers: 'block' });   // le service worker court-circuiterait les routes de test

const RACINE = path.join(__dirname, '..');
const REGISTRE = JSON.parse(fs.readFileSync(path.join(RACINE, 'data/navigation.json'), 'utf8'));
const valider = (...args) => spawnSync('node', [path.join(RACINE, 'scripts/valider-navigation.js'), ...args], { encoding: 'utf8' });

// ---------- Script de validation ----------
test('le registre actuel est valide (aucune erreur)', () => {
    const r = valider();
    expect(r.stdout).not.toContain('[ERREUR]');
    expect(r.status).toBe(0);
});

test('le script de validation détecte les erreurs de structure et de données', () => {
    const mauvais = JSON.parse(JSON.stringify(REGISTRE));
    mauvais.pages[3].domaine = 'inconnu';
    mauvais.pages[5].type = 'zzz';
    mauvais.pages[7].motsCles = 'texte';
    mauvais.pages[9].photo = 'images/nexiste/pas.webp';
    delete mauvais.pages[12].theme;
    mauvais.pages.push(JSON.parse(JSON.stringify(mauvais.pages[10])));
    const fichier = path.join(os.tmpdir(), 'vulcain-registre-mauvais.json');
    fs.writeFileSync(fichier, JSON.stringify(mauvais));
    const r = valider('--registre', fichier);
    expect(r.status).toBe(1);
    for (const attendu of ['domaine inconnu', 'type « zzz » non pris en charge', '« motsCles » doit être un tableau', 'image absente', '« theme » absent', 'identifiant en double']) {
        expect(r.stdout).toContain(attendu);
    }
    const json = JSON.parse(valider('--registre', fichier, '--json').stdout);
    expect(json.erreurs.length).toBeGreaterThanOrEqual(6);
});

test('le script de validation refuse un JSON invalide ou sans tableaux', () => {
    const casse = path.join(os.tmpdir(), 'vulcain-registre-casse.json');
    fs.writeFileSync(casse, '{ pas du json');
    expect(valider('--registre', casse).status).toBe(1);
    const vide = path.join(os.tmpdir(), 'vulcain-registre-vide.json');
    fs.writeFileSync(vide, '{"version":1}');
    const r = valider('--registre', vide);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('doit être un tableau');
});

// ---------- Comportement de l'appli face à un registre défaillant ----------
async function ouvrir(page, gestionnaireRegistre) {
    page.journal = { erreurs: [], avertissements: [], pageerrors: [] };
    page.on('pageerror', e => page.journal.pageerrors.push(e.message));
    page.on('console', m => {
        if (m.type() === 'error') page.journal.erreurs.push(m.text());
        if (m.type() === 'warning') page.journal.avertissements.push(m.text());
    });
    await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
    await page.route('**/data/navigation.json', gestionnaireRegistre);
    await page.goto('/index.html');
}

test('erreur HTTP : message clair, erreur technique en console, nouvel essai possible', async ({ page }) => {
    let appels = 0;
    await ouvrir(page, r => (appels++ === 0 ? r.fulfill({ status: 500, body: 'erreur' }) : r.continue()));
    await expect(page.locator('#navHome .nav-empty')).toContainText('momentanément indisponible');
    await expect(page.locator('#navHome .nav-empty')).not.toContainText('500');
    expect(page.journal.erreurs.some(m => m.includes('Navigation : registre indisponible'))).toBe(true);
    expect(page.journal.pageerrors).toEqual([]);
    await page.locator('[data-reessayer]').click();
    await expect(page.locator('#navHome .nav-acc')).toHaveCount(REGISTRE.domaines.length);
    expect(page.journal.pageerrors).toEqual([]);
});

test('réseau coupé : message adapté et nouvel essai', async ({ page }) => {
    let appels = 0;
    await ouvrir(page, r => (appels++ === 0 ? r.abort('failed') : r.continue()));
    await expect(page.locator('#navHome .nav-empty')).toContainText('connexion');
    await page.locator('[data-reessayer]').click();
    await expect(page.locator('#navHome .nav-acc')).toHaveCount(REGISTRE.domaines.length);
});

test('JSON invalide : message adapté, aucune erreur JavaScript non gérée', async ({ page }) => {
    await ouvrir(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{ pas du json' }));
    await expect(page.locator('#navHome .nav-empty')).toContainText('n\'a pas pu être lu');
    await expect(page.locator('[data-reessayer]')).toBeVisible();
    expect(page.journal.pageerrors).toEqual([]);
});

test('registre sans tableau « pages » : message d\'erreur, pas de plantage ni de rendu partiel', async ({ page }) => {
    await ouvrir(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 1, domaines: REGISTRE.domaines }) }));
    await expect(page.locator('#navHome .nav-empty')).toContainText('incomplet');
    await expect(page.locator('#navHome .nav-acc')).toHaveCount(0);
    expect(page.journal.pageerrors).toEqual([]);
});

test('entrées invalides : ignorées et signalées, le reste de l\'appli fonctionne', async ({ page }) => {
    const modif = JSON.parse(JSON.stringify(REGISTRE));
    const premier = REGISTRE.pages.find(p => p.type === 'fiche');
    modif.pages.push({ id: 'page-domaine-inconnu', titre: 'Page du domaine fantôme', domaine: 'fantome', theme: 'X', type: 'fiche', motsCles: [] });
    modif.pages.push(Object.assign({}, premier, { titre: 'Doublon à ignorer' }));
    modif.pages.push({ id: 'page-mots-cles-texte', titre: 'Page à mots-clés texte', domaine: premier.domaine, theme: premier.theme, type: 'fiche', motsCles: 'pas un tableau' });
    modif.pages.push({ id: 'page-type-inconnu', titre: 'Page de type étrange', domaine: premier.domaine, theme: premier.theme, type: 'zzz', motsCles: [] });
    modif.pages.push({ titre: 'Page sans identifiant', domaine: premier.domaine, theme: premier.theme, type: 'fiche' });
    await ouvrir(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(modif) }));
    await expect(page.locator('#navHome .nav-acc')).toHaveCount(REGISTRE.domaines.length);
    const journal = page.journal;
    // Signalements en console
    expect(journal.erreurs.some(m => m.includes('identifiant de page en double « ' + premier.id + ' »'))).toBe(true);
    for (const attendu of ['domaine inconnu « fantome »', '« motsCles » n\'est pas un tableau', 'absent']) {
        expect(journal.avertissements.some(m => m.includes(attendu))).toBe(true);
    }
    expect(journal.avertissements.some(m => m.includes('sans écran HTML') && m.includes('page-type-inconnu'))).toBe(true);
    // Recherche : la page du domaine fantôme est absente, le type inconnu s'affiche comme une fiche (avec avertissement)
    await page.click('[data-onglet="chercher"]');
    await page.fill('#navSearchInput', 'fantôme');
    await expect(page.locator('#navSearchResults')).toContainText('Aucune fiche ne correspond');
    await page.fill('#navSearchInput', 'type étrange');
    await expect(page.locator('#navSearchResults [data-page="page-type-inconnu"] .nav-tag')).toHaveText('FICHE');
    expect(journal.avertissements.some(m => m.includes('type de page inconnu « zzz »'))).toBe(true);
    await page.fill('#navSearchInput', 'mots-clés texte');
    await expect(page.locator('#navSearchResults [data-page="page-mots-cles-texte"]')).toBeVisible();
    expect(journal.pageerrors).toEqual([]);
});

test('une icône « kit » manquante est remplacée par l\'icône générique', async ({ page }) => {
    const modif = JSON.parse(JSON.stringify(REGISTRE));
    const calc = modif.pages.find(p => p.type === 'calculateur' && !p.terrain);
    calc.kit = 'kit-inexistant';
    await ouvrir(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(modif) }));
    await expect(page.locator('#navHome .nav-acc').first()).toBeVisible();
    await page.click('[data-onglet="calculs"]');
    const href = await page.locator(`#navHome [data-page="${calc.id}"] svg use`).first().getAttribute('href');
    expect(href).toBe('#i-info');
    expect(page.journal.pageerrors).toEqual([]);
});
