// Carte DFCI : grille dessinée sur le téléphone (hors ligne), niveaux selon le zoom, point touché, recherche.
const { test, expect, ecranActif } = require('./outils');

const ouvrir = async (app) => {
    await app.evaluate(() => showModule('carte-dfci'));
    await expect(app.locator('#cd-carte .leaflet-container, #cd-carte.leaflet-container')).toBeVisible();
};

test('la carte DFCI est dans les outils et s\'ouvre sans erreur', async ({ app }) => {
    await app.click('[data-onglet="calculs"]');
    await expect(app.locator('#navHome')).toContainText('Carte DFCI');
    await app.click('#navHome >> text=Carte DFCI');
    expect(await ecranActif(app)).toBe('carte-dfci');
    await expect(app.locator('#cd-carte.leaflet-container')).toBeVisible();
    expect(app.erreurs.filter(e => !/tile|net::|Failed/i.test(e))).toEqual([]);
});

test('la grille change de niveau selon le zoom et s\'étiquette avec les vrais codes', async ({ app }) => {
    await ouvrir(app);
    await app.evaluate(() => CarteDFCI.carte().setView([43.4, 3.4], 6, { animate: false }));
    let e = await app.evaluate(() => CarteDFCI.etat());
    expect(e.niveau).toBe('100km');
    expect(e.etiquettes).toBeGreaterThan(0);
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 9, { animate: false }));
    e = await app.evaluate(() => CarteDFCI.etat());
    expect(e.niveau).toBe('20km');
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 12, { animate: false }));
    e = await app.evaluate(() => CarteDFCI.etat());
    expect(e.niveau).toBe('2km');
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 15, { animate: false }));
    e = await app.evaluate(() => CarteDFCI.etat());
    expect(e.niveau).toBe('2km+zones');
    const textes = await app.locator('.cd-etiquette span').allTextContents();
    expect(textes.some(t => /^GD82E1\.[1-5]$/.test(t))).toBe(true);
});

test('chercher un carreau ou un GPS centre la carte et affiche le code', async ({ app }) => {
    await ouvrir(app);
    await app.fill('#cd-recherche', 'gd82e1.4');
    await app.press('#cd-recherche', 'Enter');
    await expect(app.locator('#cd-i-dfci')).toHaveText('GD82E1.4');
    await expect(app.locator('#cd-i-formats')).toContainText('DMS');
    await app.fill('#cd-recherche', '44.0600, 5.0418');
    await app.press('#cd-recherche', 'Enter');
    await expect(app.locator('#cd-i-dfci')).toHaveText('KD08K9.5');
    await app.fill('#cd-recherche', 'n’importe quoi');
    await app.press('#cd-recherche', 'Enter');
    await expect(app.locator('#cd-etat')).toContainText('non reconnus');
});

test('toucher la carte donne le carreau du point touché', async ({ app }) => {
    await ouvrir(app);
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 14, { animate: false }));
    await app.locator('#cd-carte').click({ position: { x: 150, y: 150 } });
    await expect(app.locator('#cd-info')).toBeVisible();
    const attendu = await app.evaluate(() => {
        const c = CarteDFCI.carte(), p = c.containerPointToLatLng([150, 150]);
        return carreauDFCI(p.lat, p.lng).code;
    });
    await expect(app.locator('#cd-i-dfci')).toHaveText(attendu);
    await expect(app.locator('#cd-info [aria-label*="message d\'ambiance"]')).toHaveText('📻 Message');
    await app.click('#cd-info >> text=Message');
    expect(await ecranActif(app)).toBe('fdf-ambiance');
    await expect(app.locator('#amb-dfci')).toHaveValue(attendu);
});

test('depuis « Se localiser » : voir le point sur la carte DFCI', async ({ app }) => {
    await app.evaluate(() => showModule('localisation'));
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    await app.click('#loc-barre >> text=Carte');
    expect(await ecranActif(app)).toBe('carte-dfci');
    await expect(app.locator('#cd-i-dfci')).toHaveText('GD82E1.4');
});

test('sans réseau : la grille reste là et un message prévient pour le fond', async ({ app }) => {
    await ouvrir(app);
    await app.evaluate(() => CarteDFCI.carte().setView([43.3951, 3.4263], 12, { animate: false }));
    await expect(app.locator('#cd-alerte-fond')).toBeVisible({ timeout: 15000 });
    expect((await app.evaluate(() => CarteDFCI.etat())).lignes).toBeGreaterThan(5);
    await app.click('#carte-dfci [data-fond="aucun"]');
    await expect(app.locator('#cd-alerte-fond')).toBeHidden();
});

test('plein écran : la carte occupe l\'écran, on peut en sortir', async ({ app }) => {
    await ouvrir(app);
    const avant = await app.locator('#cd-carte').boundingBox();
    await expect(app.locator('#cd-plein')).toHaveText('⤢ Plein écran');
    await expect(app.locator('#carte-dfci .cd-loc')).toHaveText('📍 Ma position');
    await app.click('#cd-plein');
    await expect(app.locator('#carte-dfci.cd-plein')).toBeVisible();
    await expect(app.locator('#cd-plein')).toContainText('Quitter');
    const plein = await app.locator('#cd-carte').boundingBox();
    expect(plein.height).toBeGreaterThan(avant.height);
    await app.click('#cd-plein');
    await expect(app.locator('#carte-dfci.cd-plein')).toHaveCount(0);
    await expect(app.locator('.app-header')).toBeVisible();
});

// ---------- Points enregistrés depuis la carte ----------
test('carte : « Enregistrer ce point » dans la fenêtre d\'info, nom prérempli, repère ⭐ et pastille', async ({ app }) => {
    await app.evaluate(() => CarteDFCI.voir(43.3951, 3.4263));
    await expect(app.locator('#cd-pastille')).toBeHidden();
    await expect(app.locator('#cd-info .cd-enregistrer')).toContainText('Enregistrer ce point');
    await app.click('#cd-info .cd-enregistrer');
    await expect(app.locator('#loc-feuille')).toBeVisible();
    await expect(app.locator('#loc-nom')).toHaveValue(/^Point \d\d\/\d\d \d\d:\d\d$/);
    await expect(app.locator('#loc-feuille-resume')).toContainText('GD82E1.4');
    await app.fill('#loc-nom', 'Citerne nord');
    await app.click('#loc-feuille .loc-valider');
    await expect(app.locator('#loc-feuille')).toBeHidden();
    const l = await app.evaluate(() => MesPoints.liste());
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ nom: 'Citerne nord', lat: 43.3951, lon: 3.4263 });
    await expect(app.locator('#cd-pastille')).toHaveText('⭐ 1 point enregistré');
    await expect(app.locator('.cd-point-marqueur')).toHaveCount(1);
    await expect(app.locator('.cd-point-marqueur .cd-etiquette')).toHaveText('Citerne nord');
});

test('carte : toucher un repère ⭐ ouvre sa fenêtre (nom, coordonnées, note) avec Copier, Fiche et Maps', async ({ app }) => {
    await app.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await app.evaluate(() => { MesPoints.ajouter({ nom: 'Poteau carrefour', note: 'Raccord de 100', lat: 43.3951, lon: 3.4263 }); CarteDFCI.voir(43.3951, 3.4263); CarteDFCI.fermerInfo(); });
    await app.click('.cd-point-marqueur .cd-etoile');
    await expect(app.locator('#cd-point')).toBeVisible();
    await expect(app.locator('#cd-info')).toBeHidden();
    await expect(app.locator('#cd-p-nom')).toContainText('Poteau carrefour');
    await expect(app.locator('#cd-p-coord')).toContainText('DFCI GD82E1.4');
    await expect(app.locator('#cd-p-note')).toHaveText('Raccord de 100');
    await app.click('#cd-point >> text=Copier');
    expect(await app.evaluate(() => navigator.clipboard.readText())).toContain('Poteau carrefour');
    await app.click('#cd-point >> text=Fiche');
    expect(await ecranActif(app)).toBe('mes-points');
    await expect(app.locator('#mp-vue-fiche')).toBeVisible();
    await expect(app.locator('#mp-f-nom')).toHaveText('Poteau carrefour');
    // Supprimer le point retire son repère de la carte
    await app.click('#mp-btn-suppr'); await app.click('#mp-btn-suppr');
    await app.evaluate(() => CarteDFCI.voir(43.3951, 3.4263));
    await expect(app.locator('.cd-point-marqueur')).toHaveCount(0);
    await expect(app.locator('#cd-pastille')).toBeHidden();
});

test('carte : la pastille cadre la carte sur tous les points ; les noms disparaissent quand on s\'éloigne', async ({ app }) => {
    await app.evaluate(() => {
        MesPoints.ajouter({ nom: 'Nord', lat: 43.9, lon: 3.4 });
        MesPoints.ajouter({ nom: 'Sud', lat: 43.0, lon: 3.6 });
        CarteDFCI.voir(43.5, 3.5, 15); CarteDFCI.fermerInfo();
    });
    await expect(app.locator('#cd-pastille')).toHaveText('⭐ 2 points enregistrés');
    await app.click('#cd-pastille');
    const ok = await app.evaluate(() => { const b = CarteDFCI.carte().getBounds(); return b.contains([43.9, 3.4]) && b.contains([43.0, 3.6]); });
    expect(ok).toBe(true);
    await app.evaluate(() => CarteDFCI.carte().setZoom(8, { animate: false }));
    await expect(app.locator('.cd-point-marqueur .cd-etiquette')).toHaveCount(0);
    await expect(app.locator('.cd-point-marqueur .cd-etoile')).toHaveCount(2);
    await app.evaluate(() => CarteDFCI.carte().setView([43.9, 3.4], 14, { animate: false }));
    await expect(app.locator('.cd-point-marqueur .cd-etiquette').first()).toBeVisible();
    await expect(app.locator('.cd-point-marqueur .cd-etiquette').first()).toHaveText(/Nord|Sud/);
});

test('carte en plein écran : la feuille d\'enregistrement passe au-dessus de la carte', async ({ app }) => {
    await app.evaluate(() => CarteDFCI.voir(43.3951, 3.4263));
    await app.click('#cd-plein');
    await expect(app.locator('#carte-dfci.cd-plein')).toBeVisible();
    await app.click('#cd-info .cd-enregistrer');
    await expect(app.locator('#loc-feuille')).toBeVisible();
    const dessus = await app.evaluate(() => { const r = document.querySelector('#loc-nom').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!e.closest('#loc-feuille'); });
    expect(dessus).toBe(true);
    await app.click('#loc-feuille .loc-annuler');
    await expect(app.locator('#loc-feuille')).toBeHidden();
    expect(await app.evaluate(() => MesPoints.nombre())).toBe(0);
});
