// Tableaux de trois colonnes et plus : quatre mises en page selon le contenu (t, e, v, f).
// Le contenu ne change jamais (lecture.spec.js le vérifie sur chaque chapitre).
const { test, expect } = require('./outils');

const L1 = 'Texte assez long pour dépasser le seuil : il décrit la conduite à tenir pas à pas, avec ses précautions.';
const L2 = 'Autre texte aussi long que le premier, pour que les deux colonnes de valeurs aient une longueur voisine.';

async function pageDeTest(app) {
    await app.evaluate(([l1, l2]) => {
        const m = document.createElement('div');
        m.id = 'test-plusieurs';
        m.className = 'module';
        m.innerHTML = `<div class="rd-section"><h3>Essai</h3>
            <table class="rd-table" id="t-court"><tr><th>Tuyau</th><th>Débit</th><th>Perte</th></tr>
              <tr><td>Ø25/20 m</td><td>58 l/min</td><td>0,3 bar</td></tr><tr><td>Ø45/20 m</td><td>500 l/min</td><td>1,2 bar</td></tr></table>
            <table class="rd-table" id="t-large"><tr><th>Humidité</th><th>8-16</th><th>17-24</th><th>25-32</th><th>33-40</th><th>41-48</th></tr>
              <tr><td>41-45 %</td><td>1,0</td><td>2,0</td><td>2,8</td><td>3,2</td><td>3,4</td></tr><tr><td>< 15 %</td><td>3,2</td><td>6,4</td><td>9,0</td><td>10,2</td><td>10,9</td></tr></table>
            <table class="rd-table" id="t-versus"><tr><th></th><th>Défusing</th><th>Débriefing</th></tr>
              <tr><td>Quand</td><td>${l1}</td><td>${l2}</td></tr><tr><td>Qui anime</td><td>${l2}</td><td>${l1}</td></tr></table>
            <table class="rd-table" id="t-versus-tete"><tr><th>Toxique</th><th>D'où vient-il ?</th><th>Effet</th></tr>
              <tr><td>CO</td><td>${l1}</td><td>${l2}</td></tr><tr><td>HCN</td><td>${l2}</td><td>${l1}</td></tr></table>
            <table class="rd-table" id="t-fiche"><tr><th>Action</th><th>Principe</th><th>Débit</th></tr>
              <tr><td>Attaque</td><td>${l1} ${l2} ${l1}</td><td>125 l/min</td></tr><tr><td>Repli</td><td>${l2} ${l1}</td><td>Important</td></tr></table></div>`;
        document.body.appendChild(m);
        Lecture.forcer(m);
    }, [L1, L2]);
}
const classes = (app, id) => app.locator('#' + id).evaluate(t => Array.from(t.classList).filter(c => c.startsWith('lec')));

test('classement : valeurs courtes = t, six colonnes = e, deux valeurs longues voisines = v, colonnes inégales = f', async ({ app }) => {
    await pageDeTest(app);
    const court = await classes(app, 't-court');
    expect(court).toContain('lec-t');
    expect(court).not.toContain('lec-cards');
    expect(await classes(app, 't-large')).toEqual(expect.arrayContaining(['lec-e']));
    expect(await classes(app, 't-versus')).toEqual(expect.arrayContaining(['lec-cards', 'lec-v']));
    expect(await classes(app, 't-versus-tete')).toEqual(expect.arrayContaining(['lec-cards', 'lec-v']));
    expect(await classes(app, 't-fiche')).toEqual(expect.arrayContaining(['lec-cards', 'lec-f']));
    // les valeurs courtes d'un vrai tableau ne se coupent pas sur deux lignes
    await expect(app.locator('#t-court td.lec-court').first()).toBeAttached();
});

test('le style est idempotent : le réappliquer ne change aucune classe', async ({ app }) => {
    await pageDeTest(app);
    const etat = () => app.locator('#test-plusieurs').evaluate(m => Array.from(m.querySelectorAll('table')).map(t => t.className).join('|') + ' ' + m.querySelectorAll('.lec-court').length);
    const avant = await etat();
    await app.evaluate(() => Lecture.forcer(document.getElementById('test-plusieurs')));
    expect(await etat()).toBe(avant);
});

test('mise en page v : deux panneaux séparés par un espace, la légende de la 1re colonne reste visible', async ({ app }) => {
    await app.setViewportSize({ width: 430, height: 900 });
    await pageDeTest(app);
    await app.evaluate(() => showModule('test-plusieurs'));
    for (const id of ['t-versus', 't-versus-tete']) {
        const g = await app.locator('#' + id + ' tr:not(:has(th))').first().evaluate(tr => {
            const a = tr.cells[1].getBoundingClientRect(), b = tr.cells[2].getBoundingClientRect(), t = tr.getBoundingClientRect();
            return { espace: Math.round(b.left - a.right), largeurA: a.width / t.width, largeurB: b.width / t.width };
        });
        expect(g.espace).toBeGreaterThanOrEqual(8);
        expect(g.largeurA).toBeGreaterThan(0.4);
        expect(g.largeurB).toBeGreaterThan(0.4);
    }
    // la 1re cellule d'en-tête renseignée (« Toxique ») est conservée et visible
    await expect(app.locator('#t-versus-tete th').first()).toBeVisible();
    await expect(app.locator('#t-versus-tete th').first()).toHaveText('Toxique');
});

test('vrai tableau (t) : toute la largeur, en-tête sur une ligne ; trait de séparation en pseudo-élément pour v et f', async ({ app }) => {
    await app.setViewportSize({ width: 430, height: 900 });
    await pageDeTest(app);
    await app.evaluate(() => showModule('test-plusieurs'));
    const r = await app.locator('#t-court').evaluate(t => t.getBoundingClientRect().width / t.parentElement.getBoundingClientRect().width);
    expect(r).toBeGreaterThan(0.95);
    for (const id of ['t-versus', 't-fiche']) {
        const x = await app.locator('#' + id + ' tr:not(:has(th))').first().evaluate(tr => ({ trait: getComputedStyle(tr, '::before').height, fond: getComputedStyle(tr).backgroundImage }));
        expect(x.trait).toBe('1px');
        expect(x.fond).not.toContain('gradient');
    }
});

for (const largeur of [320, 375, 430]) {
    for (const theme of ['clair', 'sombre']) {
        test(`aucun débordement à ${largeur} px (${theme}) sur des fiches à tableaux de trois colonnes et plus`, async ({ app }) => {
            await app.setViewportSize({ width: largeur, height: 900 });
            await app.evaluate(t => { localStorage.setItem('vulcain.theme', t); }, theme);
            await app.reload();
            await app.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
            for (const id of ['rdmi-hydraulique', 'gdo-meteo', 'gdo-cdt-apres', 'gdoinc-mgo', 'hygiene-fumees', 'sal-physique']) {
                await app.evaluate(i => showModule(i), id);
                const m = app.locator('#' + id);
                await expect(m.locator('table.lec-t, table.lec-e, table.lec-v, table.lec-f').first()).toBeAttached();
                const depasse = await m.evaluate(el => el.scrollWidth - el.clientWidth);
                expect(depasse, id).toBeLessThanOrEqual(4);
            }
        });
    }
}
