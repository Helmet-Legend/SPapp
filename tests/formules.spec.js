// Formules en tête des calculateurs : bloc repliable présent partout où une formule existe,
// et chaque exemple donne bien le résultat du calculateur (le texte ne peut pas dériver du code).
const { test, expect } = require('./outils');

const CALCULATEURS = ['ari', 'fire', 'pertes', 'feu-foret', 'emulseur', 'explosimetrie', 'suap-wallace-calc', 'sal-calculateur',
    'lspcc-calculateur', 'convertisseur', 'abaque', 'distance-calc', 'epuisement'];

for (const id of CALCULATEURS) {
    test(`${id} : formules repliées en tête, avant les champs de saisie`, async ({ app }) => {
        await app.setViewportSize({ width: 375, height: 800 });
        await app.evaluate(i => showModule(i), id);
        const bloc = app.locator(`#${id} details.calc-formule`);
        await expect(bloc).toHaveCount(1);
        await expect(bloc).toBeVisible();
        expect(await bloc.evaluate(d => d.open)).toBe(false);
        const avant = await app.evaluate(i => {
            const m = document.getElementById(i), d = m.querySelector('details.calc-formule');
            const champ = m.querySelector('input:not([type=hidden]), select');
            return !champ || !!(d.compareDocumentPosition(champ) & Node.DOCUMENT_POSITION_FOLLOWING);
        }, id);
        expect(avant).toBe(true);
        await bloc.locator('summary').click();
        await expect(bloc.locator('li').first()).toBeVisible();
        expect(await app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    });
}

test('les calculateurs sans formule (formulaire, position, carte, générateur) n\'ont pas de bloc', async ({ app }) => {
    for (const id of ['fdf-ambiance', 'localisation', 'mes-points', 'carte-dfci', 'ia-manoeuvre']) {
        expect(await app.evaluate(i => document.querySelectorAll(`#${i} details.calc-formule`).length, id), id).toBe(0);
    }
});

test('ARI : 300 bar, 9 L, 100 L/min = 27 min, 22 min au sifflet (55 bar de sécurité)', async ({ app }) => {
    await app.evaluate(() => {
        showModule('ari');
        document.getElementById('pressionARI').value = 300; document.getElementById('volumeARI').value = 9;
        document.getElementById('consoARI').value = 100; document.getElementById('securiteARI').value = 55;
        calculerAutonomieARI();
    });
    await expect(app.locator('#autonomieTotale')).toHaveText('27 min');
    await expect(app.locator('#tempsSifflet')).toHaveText('22 min');
    await expect(app.locator('#ari details.calc-formule')).toContainText('27 min');
});

test('Puissance du feu : les puissances annoncées sont celles de l\'application, exemple 429 L/min', async ({ app }) => {
    await app.evaluate(() => { showModule('fire'); });
    expect(await app.evaluate(() => JSON.stringify(firePowers))).toBe('{"fenetre":2,"porte":4,"baie":8.4,"garage":11,"entrepot":36}');
    await app.evaluate(() => { fireSelection.fenetre = 1; fireSelection.porte = 1; calculateFirePower(); });
    await expect(app.locator('#flowRate')).toHaveText('429 L/min');
    const texte = await app.locator('#fire details.calc-formule').textContent();
    for (const t of ['2 MW', '4 MW', '8,4 MW', '11 MW', '36 MW', '429 L/min']) expect(texte, t).toContain(t);
});

test('Pertes de charge : Ø45, 500 L/min, 3 tuyaux, 6 bar à la lance = 9,6 bar', async ({ app }) => {
    await app.evaluate(() => {
        showModule('pertes'); pdcDiametre(45);
        const v = (id, x) => { document.getElementById(id).value = x; };
        v('pdcDebit', 500); v('pdcTuyaux', 3); v('pdcDenivele', 0); v('pdcPression', 6); v('pdcJonctions', 0);
        pdcCalculer();
    });
    await expect(app.locator('#pdcPompe')).toHaveText('9.6 bar');
});

test('Feu de forêt : vent de 30 km/h à 3 % = 15 m/min, 450 m en 30 min', async ({ app }) => {
    await app.evaluate(() => { showModule('feu-foret'); hygroTrabaud = ''; selectVentRapide(30); });
    const r = await app.locator('#feu-foret-result').innerText();
    expect(r).toContain('15.0 m/min');
    expect(r).toContain('450 m');
});

test('Émulseur : 100 m², 10 L/min/m², 20 min, 3 % = 600 L (30 bidons)', async ({ app }) => {
    await app.evaluate(() => {
        showModule('emulseur');
        document.getElementById('emuSurface').value = 100; document.getElementById('emuDuree').value = 20;
        emuTaux = 10; emuConcentration = 3; emuCalculer();
    });
    const r = await app.locator('#emuResultatPrincipal').innerText();
    expect(r).toContain('600 L');
    expect(r).toContain('30 bidons');
});

test('Explosimétrie : méthane (LIE 5 %) vers propane (LIE 2,1 %), lecture 20 % = 47,6 % LIE', async ({ app }) => {
    await app.evaluate(() => showModule('explosimetrie'));
    const r = await app.evaluate(() => { const f = facteurPrudent(5, 2.1); return [f.toFixed(2), (20 * f).toFixed(1), facteurPrudent(2, 5)]; });
    expect(r).toEqual(['2.38', '47.6', 1]);
});

test('Wallace : tête + bras gauche chez l\'adulte = 18 %', async ({ app }) => {
    await app.evaluate(() => { showModule('suap-wallace-calc'); wallaceBasculerZone('tete'); wallaceBasculerZone('bras_g'); });
    await expect(app.locator('#wallaceTotalPct')).toHaveText('18 %');
});

test('Facteur de chute : 3 m de chute, 10 m de corde = 0,30', async ({ app }) => {
    await app.evaluate(() => {
        showModule('lspcc-calculateur');
        document.getElementById('lspcc-hauteur').value = 3; document.getElementById('lspcc-corde').value = 10; calculerFacteurChute();
    });
    await expect(app.locator('#lspcc-resultat')).toContainText('0.30');
});

test('Convertisseur : 10 bar = 145,04 psi', async ({ app }) => {
    await app.evaluate(() => showModule('convertisseur'));
    expect(await app.evaluate(() => { initConversionData(); return (10 / conversionData.pression.units['bar'] * conversionData.pression.units['psi']).toFixed(2); })).toBe('145.04');
});

test('Abaque : 2 × 2 × 1 m = 4 m³', async ({ app }) => {
    await app.evaluate(() => {
        showModule('abaque');
        document.getElementById('abaque-longueur').value = 2; document.getElementById('abaque-largeur').value = 2; document.getElementById('abaque-hauteur').value = 1;
        calculateAbaqueAll();
    });
    await expect(app.locator('#abaque-volume-display')).toHaveText('4.000 m³');
});

test('Temps de trajet : 110 km à 90 km/h = 1 h 13 min', async ({ app }) => {
    await app.evaluate(() => { showModule('distance-calc'); selectVitesse(90); document.getElementById('trajet-distance').value = 110; calculateTrajet(); });
    await expect(app.locator('#trajet-temps')).toHaveText('1h 13min');
});

test('Épuisement : 10 × 5 m, 0,5 m d\'eau, une pompe de 30 m³/h = 50 min', async ({ app }) => {
    await app.evaluate(() => {
        showModule('epuisement');
        document.getElementById('longueur').value = 10; document.getElementById('largeur').value = 5;
        document.getElementById('hauteur').value = 50; document.getElementById('uniteHauteur').value = 'cm';
        modifierQuantite('mat30', 1); calculateEpuisement();
    });
    await expect(app.locator('#tempsTotalEpuis')).toHaveText('50 min');
});
