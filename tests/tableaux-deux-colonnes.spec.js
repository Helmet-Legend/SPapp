// Tableaux à deux colonnes : trois mises en page selon le contenu (paire, c1, compact), actions en gras isolées,
// texte pleine largeur sur téléphone. Le contenu ne change jamais (lecture.spec.js le vérifie sur chaque chapitre).
const { test, expect } = require('./outils');

const LONG = 'Texte assez long pour dépasser le seuil de soixante caractères : il décrit la conduite à tenir pas à pas.';

// Page de test : quatre tableaux construits à la main, traités par le style de lecture comme n'importe quel chapitre
async function pageDeTest(app) {
    await app.evaluate(long => {
        const m = document.createElement('div');
        m.id = 'test-deux-colonnes';
        m.className = 'module';
        m.innerHTML = `<div class="rd-section"><h3>Essai</h3>
            <table class="rd-table" id="t-c1"><tr><th>Phase</th><th>Actions</th></tr>
              <tr><td>Reconnaissance</td><td><strong>Identifier</strong> : logo, marque. <strong>Inspecter</strong> : contrôler l'intégrité des équipements. <strong>Isoler</strong> : couper l'alimentation. ${long}</td></tr>
              <tr><td>Attaque</td><td>Progression par les <strong>3/4 avant</strong>. ${long}</td></tr></table>
            <table class="rd-table" id="t-compact"><tr><th>Sigle</th><th>Sens</th></tr>
              <tr><td>AC / DC</td><td>Courant alternatif / continu</td></tr><tr><td>EVA</td><td>Éthylène vinyle acétate</td></tr></table>
            <table class="rd-table" id="t-paire"><tr><th>Effets sur les personnes exposées au flux thermique</th><th>Flux</th></tr>
              <tr><td>Effets irréversibles sur les personnes exposées (seuil réglementaire)</td><td>3 kW/m²</td></tr>
              <tr><td>Premiers effets létaux et destruction significative de vitres</td><td>5 kW/m²</td></tr></table>
            <table class="rd-table" id="t-trois"><tr><th></th><th>A</th><th>B</th></tr><tr><td>x</td><td>1</td><td>2</td></tr></table></div>`;
        document.body.appendChild(m);
        Lecture.forcer(m);
        window.__rendu = (document.getElementById('t-c1').textContent);
    }, LONG);
}

test('classement : titre + texte long = c1, titre + valeur courte = compact, deux colonnes de contenu = paire', async ({ app }) => {
    await pageDeTest(app);
    const classes = id => app.locator('#' + id).evaluate(t => Array.from(t.classList).filter(c => c.startsWith('lec')));
    expect(await classes('t-c1')).toEqual(expect.arrayContaining(['lec-cards', 'lec-deux', 'lec-c1']));
    expect(await classes('t-compact')).toEqual(expect.arrayContaining(['lec-cards', 'lec-deux', 'lec-compact']));
    const paire = await classes('t-paire');
    expect(paire).toContain('lec-paire');
    expect(paire).not.toContain('lec-cards');
    // les valeurs courtes d'un tableau « paire » ne se coupent pas sur deux lignes
    await expect(app.locator('#t-paire td.lec-court')).toHaveCount(2);
    // un tableau à trois colonnes n'est pas concerné
    expect(await classes('t-trois')).not.toEqual(expect.arrayContaining(['lec-c1']));
});

test('actions en gras : isolées seulement quand une cellule en contient au moins deux', async ({ app }) => {
    await pageDeTest(app);
    const lignes = app.locator('#t-c1 tr:not(:has(th))');
    await expect(lignes.nth(0).locator('strong.lec-act')).toHaveCount(3);
    await expect(lignes.nth(0).locator('.lec-saut')).toHaveCount(2);   // pas de saut avant la première action
    await expect(lignes.nth(1).locator('strong.lec-act')).toHaveCount(0);
    await expect(lignes.nth(1).locator('.lec-saut')).toHaveCount(0);
    // les sauts sont des ajouts du style, vides, retirables sans toucher au texte
    const sauts = await app.locator('#t-c1 .lec-saut').evaluateAll(l => l.map(s => [s.textContent, s.hasAttribute('data-lecture-ajout')]));
    expect(sauts).toEqual([['', true], ['', true]]);
});

test('trait de séparation : dessiné par un pseudo-élément, sans dégradé de fond sur la ligne (sinon le fond réel du texte serait mal mesuré)', async ({ app }) => {
    await pageDeTest(app);
    for (const id of ['t-c1', 't-compact']) {
        const r = await app.locator('#' + id + ' tr:not(:has(th))').first().evaluate(tr => ({
            trait: getComputedStyle(tr, '::before').height,
            fond: getComputedStyle(tr).backgroundImage
        }));
        expect(r.trait).toBe('1px');
        expect(r.fond).not.toContain('gradient');
    }
});

test('le style est idempotent : le réappliquer n\'ajoute rien', async ({ app }) => {
    await pageDeTest(app);
    const avant = await app.locator('#test-deux-colonnes').evaluate(m => [m.querySelectorAll('.lec-saut').length, m.querySelectorAll('.lec-act').length, m.innerHTML.length]);
    await app.evaluate(() => Lecture.forcer(document.getElementById('test-deux-colonnes')));
    const apres = await app.locator('#test-deux-colonnes').evaluate(m => [m.querySelectorAll('.lec-saut').length, m.querySelectorAll('.lec-act').length, m.innerHTML.length]);
    expect(apres).toEqual(avant);
});

for (const largeur of [320, 375, 430]) {
    for (const theme of ['clair', 'sombre']) {
        test(`texte pleine largeur et aucun débordement à ${largeur} px (${theme}) sur la page « MGO véhicules » et les effets du feu`, async ({ app }) => {
            await app.setViewportSize({ width: largeur, height: 900 });
            await app.evaluate(t => { localStorage.setItem('vulcain.theme', t); }, theme);
            await app.reload();
            await app.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
            for (const id of ['gouv-incendie', 'gdoinc-homme', 'gdoeaux-mesures']) {
                await app.evaluate(i => showModule(i), id);
                const m = app.locator('#' + id);
                await expect(m.locator('table.lec-deux, table.lec-paire').first()).toBeAttached();
                // texte des blocs « titre + texte long » : au moins 85 % de la largeur du bloc (l'ancien rendu en occupait 44 %)
                const rapports = await m.locator('table.lec-c1').evaluateAll(tables => tables.map(t => {
                    const tr = t.querySelector('tr:not(:has(th))');
                    return tr.cells[1].getBoundingClientRect().width / tr.getBoundingClientRect().width;
                }));
                for (const r of rapports) expect(r).toBeGreaterThan(0.85);
                const depasse = await m.evaluate(el => el.scrollWidth - el.clientWidth);
                expect(depasse).toBeLessThanOrEqual(4);
            }
        });
    }
}
