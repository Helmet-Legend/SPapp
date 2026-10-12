// « Mes points » : positions enregistrées (nom libre, coordonnées, DFCI), distance/cap hors ligne, export/import GPX, usage en mer.
const { test, expect, ecranActif } = require('./outils');

const loc = (app) => app.evaluate(() => showModule('localisation'));
const enregistrer = async (app, saisie, nom, note) => {
    await loc(app);
    await app.fill('#loc-saisie', saisie);
    await app.click('.loc-enregistrer');
    if (nom !== undefined) await app.fill('#loc-nom', nom);
    if (note) await app.fill('#loc-note', note);
    await app.click('#loc-feuille .loc-valider');
};

test('Se localiser : le bouton est visible sans défiler, la feuille avec un nom prérempli et enregistre', async ({ app }) => {
    await loc(app);
    await expect(app.locator('.loc-enregistrer')).toBeHidden();
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    await expect(app.locator('.loc-enregistrer')).toContainText('Enregistrer ce point');
    await app.setViewportSize({ width: 390, height: 844 });
    const y = (await app.locator('.loc-enregistrer').boundingBox()).y;
    expect(y).toBeLessThan(844 - 150); // au-dessus de la barre d'actions fixe
    await expect(app.locator('#loc-nb-points')).toBeHidden();
    await app.click('.loc-enregistrer');
    await expect(app.locator('#loc-feuille')).toBeVisible();
    await expect(app.locator('#loc-nom')).toHaveValue(/^Point \d\d\/\d\d \d\d:\d\d$/);
    await expect(app.locator('#loc-feuille-resume')).toContainText('GD82E1.4');
    await app.fill('#loc-nom', 'Citerne nord du château');
    await app.fill('#loc-note', 'Accès par le chemin de gauche');
    await app.click('#loc-feuille .loc-valider');
    await expect(app.locator('#loc-feuille')).toBeHidden();
    await expect(app.locator('#loc-nb-points')).toHaveText('1 enregistré ›');
    const l = await app.evaluate(() => MesPoints.liste());
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ nom: 'Citerne nord du château', note: 'Accès par le chemin de gauche', lat: 43.3951, lon: 3.4263 });
});

test('annuler la feuille n\'enregistre rien ; un nom vide reprend le nom par défaut', async ({ app }) => {
    await loc(app);
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    await app.click('.loc-enregistrer');
    await app.click('#loc-feuille .loc-annuler');
    expect(await app.evaluate(() => MesPoints.nombre())).toBe(0);
    await app.click('.loc-enregistrer');
    await app.fill('#loc-nom', '   ');
    await app.click('#loc-feuille .loc-valider');
    expect((await app.evaluate(() => MesPoints.liste()))[0].nom).toMatch(/^Point \d\d\/\d\d/);
});

test('la liste « Mes points » affiche les points, survit à un rechargement et se filtre', async ({ app }) => {
    await enregistrer(app, '43.3951, 3.4263', 'Citerne nord');
    await enregistrer(app, '43°23\'50" N 3°26\'32" E', 'Départ de feu');
    await app.click('#loc-nb-points');
    expect(await ecranActif(app)).toBe('mes-points');
    await expect(app.locator('#mp-liste .mp-ligne')).toHaveCount(2);
    await expect(app.locator('#mp-vide')).toBeHidden();
    await expect(app.locator('#mp-menu')).toBeHidden();
    await expect(app.locator('#mp-modif')).toBeHidden();
    await expect(app.locator('#mp-liste .mp-ligne').first()).toContainText('Départ de feu');
    await expect(app.locator('#mp-liste')).toContainText('DFCI GD82E1.3');
    await app.fill('#mp-recherche', 'citerne');
    await expect(app.locator('#mp-liste .mp-ligne')).toHaveCount(1);
    await app.fill('#mp-recherche', 'gd82e1.3');
    await expect(app.locator('#mp-liste .mp-ligne')).toContainText('Départ de feu');
    await app.fill('#mp-recherche', 'zzz');
    await expect(app.locator('#mp-liste')).toContainText('Aucun point ne correspond');
    await app.reload();
    await app.evaluate(() => showModule('mes-points'));
    await expect(app.locator('#mp-liste .mp-ligne')).toHaveCount(2);
});

test('liste vide : message d\'aide et accès à Se localiser', async ({ app }) => {
    await app.evaluate(() => showModule('mes-points'));
    await expect(app.locator('#mp-vide')).toBeVisible();
    await expect(app.locator('#mp-outils')).toBeHidden();
    await app.click('#mp-vide >> text=Aller à Se localiser');
    expect(await ecranActif(app)).toBe('localisation');
});

test('fiche d\'un point : trois formats avec copie, renommer, supprimer en deux appuis', async ({ app }) => {
    await app.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await enregistrer(app, '43.3951, 3.4263', 'Citerne nord');
    await app.evaluate(() => MesPoints.ouvrir());
    await app.click('#mp-liste .mp-ligne');
    await expect(app.locator('#mp-f-nom')).toHaveText('Citerne nord');
    await expect(app.locator('#mp-f-dfci')).toHaveText('GD82E1.4');
    await expect(app.locator('#mp-f-formats')).toContainText('Degrés, minutes décimales · DMD');
    await app.click('#mp-f-formats [data-copie="dmd"]');
    expect(await app.evaluate(() => navigator.clipboard.readText())).toBe("43° 23,706' N, 3° 25,578' E");
    await app.click('#mes-points >> text=Tout copier');
    expect(await app.evaluate(() => navigator.clipboard.readText())).toContain('Citerne nord');
    await app.click('#mes-points >> text=Renommer / note');
    await app.fill('#mp-m-nom', 'Citerne nord rénovée');
    await app.fill('#mp-m-note', 'Vérifiée en octobre');
    await app.click('#mp-modif .mp-principal');
    await expect(app.locator('#mp-f-nom')).toHaveText('Citerne nord rénovée');
    await expect(app.locator('#mp-f-note')).toHaveText('Vérifiée en octobre');
    await app.click('#mp-btn-suppr');
    await expect(app.locator('#mp-btn-suppr')).toContainText('confirmer');
    expect(await app.evaluate(() => MesPoints.nombre())).toBe(1);
    await app.click('#mp-btn-suppr');
    expect(await app.evaluate(() => MesPoints.nombre())).toBe(0);
    await expect(app.locator('#mp-vue-liste')).toBeVisible();
    await expect(app.locator('#mp-vide')).toBeVisible();
});

test('en mer : position en DMD, pas de carreau inventé, pas de message d\'ambiance, enregistrement possible', async ({ app }) => {
    await loc(app);
    await app.fill('#loc-saisie', '0.5, 0.5');
    await expect(app.locator('#loc-r-titre')).toHaveText('Position');
    await expect(app.locator('#loc-r-dfci')).toContainText("0° 30,000' N");
    await expect(app.locator('#loc-r-sous')).toContainText('Hors carroyage DFCI');
    await expect(app.locator('#loc-btn-ambiance')).toBeHidden();
    await app.click('.loc-enregistrer');
    await app.fill('#loc-nom', 'Mouillage nord');
    await app.click('#loc-feuille .loc-valider');
    await app.evaluate(() => MesPoints.ouvrir());
    await expect(app.locator('#mp-liste')).toContainText('Hors carroyage');
    await app.click('#mp-liste .mp-ligne');
    await expect(app.locator('#mp-f-dfci')).toBeHidden();
    await expect(app.locator('#mp-f-pastille')).toContainText('Hors carroyage');
    await loc(app);
    await app.fill('#loc-saisie', 'GD82E1.4');
    await expect(app.locator('#loc-r-titre')).toHaveText('Carreau DFCI');
    await expect(app.locator('#loc-btn-ambiance')).toBeVisible();
});

test('distance (milles nautiques, km) et cap vrai calculés hors ligne', async ({ app }) => {
    const r = await app.evaluate(() => {
        const d = (a, b) => MesPoints.distanceCap({ lat: a[0], lon: a[1] }, { lat: b[0], lon: b[1] });
        return { nord: d([43, 3], [44, 3]), est: d([0, 0], [0, 1]), sud: d([44, 3], [43, 3]), ouest: d([0, 1], [0, 0]), nul: d([43, 3], [43, 3]),
            texte: MesPoints.texteDistance(d([43, 3], [44, 3])), proche: MesPoints.texteDistance({ nm: 0.1, km: 0.185, cap: 359.6 }) };
    });
    expect(r.nord.nm).toBeCloseTo(60.04, 1); expect(Math.round(r.nord.cap)).toBe(0); expect(r.nord.km).toBeCloseTo(111.2, 0);
    expect(Math.round(r.est.cap)).toBe(90); expect(r.est.nm).toBeCloseTo(60.04, 1);
    expect(Math.round(r.sud.cap)).toBe(180);
    expect(Math.round(r.ouest.cap)).toBe(270);
    expect(r.nul.nm).toBe(0);
    expect(r.texte).toEqual({ nm: '60 NM', km: '111 km', cap: 'cap 000°' });
    expect(r.proche.cap).toBe('cap 000°');
    expect(r.proche.km).toBe('185 m');
});

test('distances depuis ma position (géolocalisation sur demande), tri par proximité', async ({ app }) => {
    const context = app.context();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 43.0, longitude: 3.0, accuracy: 10 });
    await app.evaluate(() => { MesPoints.ajouter({ nom: 'Loin', lat: 44.0, lon: 3.0 }); MesPoints.ajouter({ nom: 'Proche', lat: 43.1, lon: 3.0 }); });
    await app.evaluate(() => MesPoints.ouvrir());
    await expect(app.locator('.mp-dist')).toHaveCount(0);
    await app.click('#mp-menu-btn');
    await app.click('#mp-menu >> text=Distances depuis ma position');
    await expect(app.locator('#mp-liste .mp-ligne').first()).toContainText('Proche');
    await expect(app.locator('#mp-liste .mp-ligne').first()).toContainText('6,0 NM');
    await expect(app.locator('#mp-liste .mp-ligne').first()).toContainText('cap 000°');
    await expect(app.locator('#mp-liste .mp-ligne').nth(1)).toContainText('60 NM');
});

test('export GPX (points de passage) puis import sans doublon', async ({ app }) => {
    await enregistrer(app, '43.3951, 3.4263', 'Citerne <nord> & "est"', 'Accès chemin');
    await enregistrer(app, '0.5, 0.5', 'Mouillage');
    await app.evaluate(() => MesPoints.ouvrir());
    await app.click('#mp-menu-btn');
    const [dl] = await Promise.all([app.waitForEvent('download'), app.click('#mp-menu >> text=Exporter (GPX)')]);
    expect(dl.suggestedFilename()).toMatch(/^vulcain-mes-points-\d{8}\.gpx$/);
    const contenu = require('fs').readFileSync(await dl.path(), 'utf8');
    expect(contenu).toContain('<gpx version="1.1"');
    expect(contenu).toContain('<wpt lat="43.395100" lon="3.426300">');
    expect(contenu).toContain('<name>Citerne &lt;nord&gt; &amp; &quot;est&quot;</name>');
    expect(contenu).toContain('DFCI GD82E1.4');
    expect(contenu).toContain('<wpt lat="0.500000" lon="0.500000">');
    // Import du même fichier : tout est déjà présent
    await app.setInputFiles('#mp-import', { name: 'sauvegarde.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(contenu) });
    await expect(app.locator('#mp-etat')).toContainText('0 point importé · 2 déjà présents');
    // Import d'un fichier d'une autre application
    const autre = '<?xml version="1.0"?><gpx version="1.1" creator="Autre"><wpt lat="42.5" lon="9.4"><name>Cap Corse</name></wpt><wpt lat="999" lon="1"><name>Faux</name></wpt></gpx>';
    await app.setInputFiles('#mp-import', { name: 'autre.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(autre) });
    await expect(app.locator('#mp-etat')).toContainText('1 point importé');
    await expect(app.locator('#mp-liste')).toContainText('Cap Corse');
    expect(await app.evaluate(() => MesPoints.nombre())).toBe(3);
    await app.setInputFiles('#mp-import', { name: 'abime.gpx', mimeType: 'text/plain', buffer: Buffer.from('pas du xml <<<') });
    await expect(app.locator('#mp-etat')).toContainText('illisible');
    expect(await app.evaluate(() => MesPoints.nombre())).toBe(3);
});

test('stockage bloqué ou corrompu : l\'appli ne plante pas', async ({ app }) => {
    await app.evaluate(() => { localStorage.setItem('vulcain-mes-points', '{pas du json'); });
    await app.reload();
    await app.evaluate(() => showModule('mes-points'));
    await expect(app.locator('#mp-vide')).toBeVisible();
    expect(await app.evaluate(() => MesPoints.nombre())).toBe(0);
});

test('accès : menu ⋯ de Se localiser, liste des calculs avec l\'icône épingle', async ({ app }) => {
    await loc(app);
    await app.click('#loc-menu-btn');
    await app.click('#loc-menu >> text=Mes points');
    expect(await ecranActif(app)).toBe('mes-points');
    await app.click('[data-onglet="calculs"]');
    await expect(app.locator('#navHome [data-page="mes-points"] .calc-ic use')).toHaveAttribute('href', '#i-k-pin');
    await app.click('#navHome [data-page="mes-points"]');
    expect(await ecranActif(app)).toBe('mes-points');
});

test('depuis la fiche : voir sur la carte DFCI et reprendre dans Se localiser', async ({ app }) => {
    await enregistrer(app, '43.3951, 3.4263', 'Citerne nord');
    await app.evaluate(() => MesPoints.ouvrir());
    await app.click('#mp-liste .mp-ligne');
    await app.click('#mes-points >> text=Voir sur la carte');
    expect(await ecranActif(app)).toBe('carte-dfci');
    await expect(app.locator('#cd-i-dfci')).toHaveText('GD82E1.4');
    await app.evaluate(() => MesPoints.ouvrir());
    await app.click('#mp-liste .mp-ligne');
    await app.click('#mes-points >> text=Dans Se localiser');
    expect(await ecranActif(app)).toBe('localisation');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.4');
});
