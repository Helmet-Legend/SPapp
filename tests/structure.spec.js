// Structure du site : ce qui a déjà cassé silencieusement doit faire échouer ces tests.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./outils');

const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');

test('la page se charge sans erreur JavaScript', async ({ app }) => {
    await app.waitForTimeout(500);
    expect(app.erreurs).toEqual([]);
});

test('chaque bouton appelle une fonction qui existe', async ({ app }) => {
    const manquantes = await app.evaluate(() => {
        const ignorees = new Set(['if', 'setTimeout', 'alert', 'confirm', 'parseInt', 'parseFloat', 'event']);
        const res = new Set();
        document.querySelectorAll('[onclick],[oninput],[onchange],[onkeyup],[onsubmit]').forEach(el => {
            for (const attr of ['onclick', 'oninput', 'onchange', 'onkeyup', 'onsubmit']) {
                const code = el.getAttribute(attr);
                if (!code) continue;
                for (const m of code.matchAll(/(?<![\w.])([A-Za-z_$][\w$]*)\s*\(/g)) {
                    if (!ignorees.has(m[1]) && typeof window[m[1]] !== 'function') res.add(`${m[1]} (${attr} dans #${el.closest('[id]')?.id})`);
                }
            }
        });
        return [...res];
    });
    expect(manquantes).toEqual([]);
});

test('chaque écran s\'ouvre sans erreur', async ({ app }) => {
    const ids = await app.evaluate(() => [...document.querySelectorAll('.module')].map(m => m.id));
    expect(ids.length).toBeGreaterThan(90);
    for (const id of ids) {
        await app.evaluate(i => showModule(i), id);
        await expect(app.locator(`#${id}`), `écran ${id}`).toHaveClass(/active/);
    }
    expect(app.erreurs).toEqual([]);
});

test('aucun identifiant HTML en double', async () => {
    const ids = [...lire('index.html').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(doublons).toEqual([]);
});

test('le registre de navigation couvre tous les écrans, sans erreur', async ({ app }) => {
    const registre = JSON.parse(lire('data/navigation.json'));
    const ecrans = await app.evaluate(() => [...document.querySelectorAll('.module')].map(m => m.id).filter(i => i !== 'home'));
    const ids = registre.pages.map(p => p.id);

    expect(ecrans.filter(e => !ids.includes(e)), 'écrans absents du registre (invisibles dans les menus)').toEqual([]);
    expect(ids.filter(i => !ecrans.includes(i)), 'entrées du registre sans écran').toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), 'entrées en double').toEqual([]);

    const types = ['calculateur', 'fiche', 'ordre', 'presentation', 'menu'];
    for (const p of registre.pages) {
        const d = registre.domaines.find(x => x.id === p.domaine);
        expect(d, `${p.id} : domaine « ${p.domaine} » inconnu`).toBeTruthy();
        if (p.theme) expect(d.themes, `${p.id} : thème « ${p.theme} » absent du domaine ${d.id}`).toContain(p.theme);
        expect(types, `${p.id} : type inconnu`).toContain(p.type);
        expect(p.titre, `${p.id} : titre vide`).toBeTruthy();
    }
});

test('tous les scripts et styles de la page existent', async ({ request }) => {
    const html = lire('index.html');
    const fichiers = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)].map(m => m[1])
        .filter(f => !/^https?:/.test(f));
    for (const f of fichiers) {
        const r = await request.get('/' + f);
        expect(r.status(), f).toBe(200);
    }
});

test('le cache hors-ligne ne référence que des fichiers existants', async ({ request }) => {
    // Un seul fichier manquant fait échouer l'installation du mode hors-ligne
    const fichiers = [...lire('sw.js').matchAll(/'\.\/([^']*)'/g)].map(m => m[1]);
    expect(fichiers.length).toBeGreaterThan(10);
    for (const f of fichiers) {
        const r = await request.get('/' + f);
        expect(r.status(), f || 'index').toBe(200);
    }
});

test('les données sont chargées', async ({ app }) => {
    // Les fichiers de data/ sont chargés en arrière-plan après l'affichage
    await expect.poll(() => app.evaluate(() => tmdDatabase.length)).toBeGreaterThan(100);
    await expect.poll(() => app.evaluate(() => Object.keys(gazDatabase).length)).toBeGreaterThan(10);
});

test('le numéro de version est le même partout', async ({ app }) => {
    const version = JSON.parse(lire('package.json')).version;
    expect(await app.evaluate(() => APP_VERSION)).toBe(version);
    expect(lire('sw.js')).toContain(`deciops-v${version}'`);
    expect(lire('index.html')).toContain(`<meta name="version" content="${version}">`);
});
