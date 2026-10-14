// Moteur de recherche : variantes d'écriture, plusieurs mots, mots très courants, acronymes, non-régression.
const { test, expect } = require('./outils');

async function chercher(app, q) {
    return app.evaluate(async q => {
        const inp = document.getElementById('navSearchInput');
        inp.value = q;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 30));
        return [...document.querySelectorAll('#navSearchResults .nav-row:not(.nav-row-tmd)')].map(r => r.dataset.page);
    }, q);
}
test.beforeEach(async ({ app }) => { await app.click('[data-onglet="chercher"]'); });

test('une même recherche écrite autrement donne les mêmes résultats', async ({ app }) => {
    const groupes = [
        ['feu de forêt', 'feu de foret', 'feu-de-foret', 'FEU  DE FORÊT', 'feu, de forêt'],
        ['coeur', 'cœur', 'CŒUR'],
        ['d\'incendie', 'd’incendie', 'd incendie', 'D\'INCENDIE'],
        ['mousse émulseur', 'émulseur mousse', 'EMULSEUR, MOUSSE'],
        ['toxicité fumées', 'toxicite fumees', 'Toxicité, fumées'],
        ['arrêt cardiaque', 'arret cardiaque', 'arrêt-cardiaque']
    ];
    for (const g of groupes) {
        const ref = (await chercher(app, g[0])).slice().sort();
        expect(ref.length, g[0]).toBeGreaterThan(0);
        for (const variante of g.slice(1)) expect((await chercher(app, variante)).slice().sort(), `« ${variante} » comme « ${g[0]} »`).toEqual(ref);
    }
});

test('les recherches de plusieurs mots ne dépendent plus de l\'ordre ni de la contiguïté', async ({ app }) => {
    expect((await chercher(app, 'mousse emulseur'))[0]).toBe('mousses-emulseurs');
    expect((await chercher(app, 'toxicité fumées'))[0]).toBe('gdotox-menu');
    expect((await chercher(app, 'échelle crochets'))[0]).toBe('echelles-crochets');
    expect((await chercher(app, 'autonomie ari'))[0]).toBe('ari');
    expect((await chercher(app, 'message ambiance'))[0]).toBe('fdf-ambiance');
    expect((await chercher(app, 'taux foisonnement'))[0]).toBe('mousses-taux');
    expect((await chercher(app, 'engagement milieu vicié'))[0]).toBe('gtomv');
    expect((await chercher(app, 'facteur de chute'))[0]).toBe('lspcc-calculateur');
    // un mot sans correspondance : aucun résultat (tous les mots doivent être trouvés)
    expect(await chercher(app, 'mousse zzzzqq')).toEqual([]);
    expect(await chercher(app, 'azerty')).toEqual([]);
});

test('les mots très courants seuls ne renvoient rien, et sont ignorés dans une expression', async ({ app }) => {
    for (const q of ['de', 'la', 'le', 'des', 'de la']) expect(await chercher(app, q), q).toEqual([]);
    await expect(app.locator('#navSearchResults')).toContainText('Aucune fiche ne correspond');
    expect((await chercher(app, 'feu de forêt')).length).toBeGreaterThan(20);
});

test('les acronymes courts ne remontent plus les mots qui les contiennent', async ({ app }) => {
    const ari = await chercher(app, 'ari');
    expect(ari).toContain('ari');
    expect(ari.length).toBeLessThan(100);   // avant : 173 pages, dont « particulier », « variable »…
    for (const q of ['gps', 'tmd', 'rcp', 'dae', 'onu']) expect((await chercher(app, q)).length, q).toBeGreaterThan(0);
    expect((await chercher(app, 'ARI'))).toEqual(ari);
});

test('non-régression : la première réponse des recherches courantes est inchangée', async ({ app }) => {
    const attendu = {
        TMD: 'tmd', ARI: 'rdeb-ari', SUAP: 'suap-menu', LSPCC: 'lspcc-menu', FDF: 'fdf-ambiance', rcp: 'suap-rcp', DAE: 'pse-5',
        gps: 'localisation', emulseur: 'mousses-emulseurs', plongée: 'sal-menu', explosimétrie: 'explosimetrie', wallace: 'suap-wallace-calc',
        hémorragie: 'suap-hemorragies', brûlure: 'suap-brulures', ventilation: 'vent-menu', RDMI: 'rdmi-menu', RDEB: 'rdeb-menu',
        RDSMES: 'rdsmes-menu', COD: 'cod1', silo: 'gdosilo-menu', drone: 'drones', patrimoine: 'gdopat-menu', bateau: 'gdoeaux-menu',
        fumées: 'gdotox-menu', cagoule: 'gdotox-cagoule', halligan: 'halligan', autonomie: 'rdeb-autonomie', convertisseur: 'convertisseur',
        abaque: 'abaque', pse: 'pse-menu', jsp: 'jsp1-menu', eld: 'eld-menu', sal: 'sal-menu', sav: 'sav-menu'
    };
    const ecarts = [];
    for (const [q, id] of Object.entries(attendu)) {
        const r = await chercher(app, q);
        if (r[0] !== id) ecarts.push(`${q} : ${r[0]} au lieu de ${id}`);
        // sans accent ni majuscule : même 1re réponse
        const sans = q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        if (sans !== q) { const r2 = await chercher(app, sans); if (r2[0] !== id) ecarts.push(`${sans} : ${r2[0]} au lieu de ${id}`); }
    }
    expect(ecarts).toEqual([]);
});

test('les mots trouvés sont surlignés dans les titres, sans injecter de HTML', async ({ app }) => {
    await chercher(app, 'mousse emulseur');
    const marques = await app.locator('#navSearchResults .nav-row:not(.nav-row-tmd)').first().locator('mark').allTextContents();
    expect(marques.length).toBeGreaterThan(0);
    await chercher(app, '<img src=x onerror=alert(1)>');
    await expect(app.locator('#navSearchResults img')).toHaveCount(0);
    expect(app.erreurs).toEqual([]);
});

test('le filtre de l\'onglet Calculs accepte plusieurs mots, sans accent', async ({ app }) => {
    await app.click('[data-onglet="calculs"]');
    await app.fill('#calcRecherche', 'autonomie ari');
    await expect(app.locator('#navHome [data-page="ari"]').first()).toBeVisible();
    await app.fill('#calcRecherche', 'pertes charge');
    await expect(app.locator('#navHome [data-page="pertes"]').first()).toBeVisible();
    await app.fill('#calcRecherche', 'mousse zzzzqq');
    await expect(app.locator('#navHome .calc-vide')).toBeVisible();
});

test('une requête d\'un seul caractère affiche les suggestions', async ({ app }) => {
    await chercher(app, 'a');
    await expect(app.locator('#navSearchResults .nav-suggest')).toBeVisible();
});
