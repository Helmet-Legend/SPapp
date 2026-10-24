// Exactitude des formules affichées : chaque formule est réécrite ici, indépendamment du code de l'application,
// puis comparée au résultat réel du calculateur sur des centaines de saisies tirées au hasard (tirage reproductible).
// Si le calcul d'un calculateur change, ou si le texte des formules s'en écarte, un de ces tests échoue.
const { test, expect } = require('./outils');

const PRNG = `
  function alea(graine) { let a = graine >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const entre = (r, a, b) => a + (b - a) * r();
  const entier = (r, a, b) => Math.floor(entre(r, a, b + 1));
  const choix = (r, l) => l[Math.floor(r() * l.length)];
  const attendre = async (cond) => { for (let i = 0; i < 100 && !cond(); i++) await new Promise(t => setTimeout(t, 50)); };
`;
const lancer = (app, corps, graine) => app.evaluate(`(async () => { ${PRNG} const r = alea(${graine}); const ecarts = []; ${corps}; return ecarts; })()`);

test('ARI : les cinq résultats et l\'autonomie d\'engagement suivent les formules affichées (300 saisies)', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('ari');
      for (let i = 0; i < 300; i++) {
        const P = entier(r, 100, 300), V = choix(r, [6, 7.2, 9]), c = entier(r, 5, 150), s = entier(r, 40, 100);
        document.getElementById('pressionARI').value = P; document.getElementById('volumeARI').value = V;
        document.getElementById('consoARI').value = c; document.getElementById('securiteARI').value = s;
        calculerAutonomieARI();
        const lire = id => document.getElementById(id).textContent;
        const attendu = { volumeAir: (P * V) + ' L'.replace(/^/, ''), };
        const volume = P * V, auto = volume / c, utile = P - s, sifflet = utile * V / c;
        const t = (id, v) => { if (lire(id) !== v) ecarts.push(id + ' : ' + lire(id) + ' au lieu de ' + v + ' pour ' + [P, V, c, s]); };
        t('volumeAir', volume.toFixed(0) + ' L'); t('autonomieTotale', auto.toFixed(0) + ' min'); t('miTemps', (auto / 2).toFixed(0) + ' min');
        t('pressionUtilisable', utile.toFixed(0) + ' bar'); t('tempsSifflet', sifflet.toFixed(0) + ' min');
        t('autonomieExacte', '(Exact: ' + auto.toFixed(2) + ' min)'); t('miTempsExact', '(Exact: ' + (auto / 2).toFixed(2) + ' min)'); t('tempsSiffletExact', '(Exact: ' + sifflet.toFixed(2) + ' min)');
        // autonomie d'engagement : (P − 50) × V ÷ débit, arrondie, 1 min au moins ; survie (≤ 10 L/min) : pression totale
        const e = c <= 10 ? P : P - 50, att = e <= 0 ? 0 : Math.max(1, Math.round(e * V / c));
        if (autonomieRDEB(P, V, c) !== att) ecarts.push('RDEB ' + autonomieRDEB(P, V, c) + ' au lieu de ' + att + ' pour ' + [P, V, c]);
        // heure de sortie = heure d'entrée + autonomie d'engagement
        if (att) {
          const h = entier(r, 0, 23), m = entier(r, 0, 59);
          document.getElementById('heureEntreeARI').value = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); majAutonomieRDEB();
          const tot = (h * 60 + m + att) % 1440, voulu = String(Math.floor(tot / 60)).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0');
          if (!document.getElementById('rdebSortie').textContent.endsWith(voulu)) ecarts.push('sortie ' + document.getElementById('rdebSortie').textContent + ' au lieu de ' + voulu);
        }
      }`, 11);
    expect(ecarts).toEqual([]);
});

test('Puissance du feu : puissances lues à l\'écran = puissances des formules, débit = (puissance ÷ 1,4) × 100 (200 saisies)', async ({ app }) => {
    await app.evaluate(() => showModule('fire'));
    const ecran = (await app.locator('#fire').textContent()).replace(/\s+/g, ' ');
    const lues = [...ecran.matchAll(/(Fenêtre|Porte Garage|Porte Entrepôt|Baie Vitrée|Porte) [^=]*?= ([\d.,]+) MW/g)].map(m => [m[1], Number(m[2].replace(',', '.'))]);
    expect(Object.fromEntries(lues)).toEqual({ 'Fenêtre': 2, 'Porte': 4, 'Baie Vitrée': 8.4, 'Porte Garage': 11, 'Porte Entrepôt': 36 });
    const ecarts = await lancer(app, `
      const P = { fenetre: 2, porte: 4, baie: 8.4, garage: 11, entrepot: 36 };
      for (let i = 0; i < 200; i++) {
        let tot = 0;
        for (const k of Object.keys(P)) { fireSelection[k] = entier(r, 0, 5); tot += fireSelection[k] * P[k]; }
        calculateFirePower();
        const debit = (tot / 1.4) * 100;
        const a = document.getElementById('flowRate').textContent, b = document.getElementById('totalPower').textContent;
        if (a !== debit.toFixed(0) + ' L/min' || b !== tot.toFixed(1) + ' MW') ecarts.push(JSON.stringify(fireSelection) + ' : ' + b + ' / ' + a + ' au lieu de ' + tot.toFixed(1) + ' / ' + debit.toFixed(0));
      }`, 21);
    expect(ecarts).toEqual([]);
});

test('Pertes de charge, calcul rapide : références et formule (400 saisies, Ø25 par tableau)', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('pertes');
      const REF = { 45: [1.2, 500], 70: [0.44, 1000], 110: [0.24, 2000] };
      for (let i = 0; i < 400; i++) {
        const d = choix(r, [25, 45, 70, 110]);
        pdcDiametre(d);
        const debit = d === 25 ? choix(r, [58, 150]) : entier(r, 100, 2500), tuyaux = entier(r, 1, 10), den = entier(r, -20, 40), pr = entier(r, 4, 10), j = entier(r, 0, 5);
        const v = (id, x) => { document.getElementById(id).value = x; };
        v('pdcDebit', debit); v('pdcTuyaux', tuyaux); v('pdcDenivele', den); v('pdcPression', pr); v('pdcJonctions', j);
        pdcCalculer();
        const p20 = d === 25 ? ({ 58: 1.7, 150: 2.2 })[debit] : REF[d][0] * Math.pow(debit / REF[d][1], 2);
        const total = pr + tuyaux * p20 + den / 10 + j;
        const lu = parseFloat(document.getElementById('pdcPompe').textContent);
        if (Math.abs(lu - total) > 0.051) ecarts.push('Ø' + d + ' ' + [debit, tuyaux, den, pr, j] + ' : ' + lu + ' au lieu de ' + total.toFixed(2));
      }`, 31);
    expect(ecarts).toEqual([]);
});

test('Pertes de charge, calcul complet : même loi que le calcul rapide, alimentation + lance la plus exigeante + jonctions (200 scénarios)', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('pertes');
      const REF = { 45: [1.2, 500], 70: [0.44, 1000], 110: [0.24, 2000] };
      const perte = (d, debit, longueur) => REF[d][0] * Math.pow(debit / REF[d][1], 2) * (longueur / 20);
      for (let i = 0; i < 200; i++) {
        tronconsPerte.length = 0;
        const nl = entier(r, 1, 3), na = entier(r, 0, 2), j = entier(r, 0, 6);
        const lances = [], alims = [];
        for (let k = 0; k < nl; k++) { const n = entier(r, 1, 6); lances.push({ diametre: choix(r, [45, 70, 110]), nbTuyaux: n, longueur: n * 20, denivele: entier(r, -10, 30), debit: entier(r, 100, 1500), pressionLance: entier(r, 4, 8), isAlimentation: false, commentaire: 'x' }); }
        for (let k = 0; k < na; k++) { const n = entier(r, 1, 8); alims.push({ diametre: choix(r, [70, 110]), nbTuyaux: n, longueur: n * 20, denivele: entier(r, -10, 30), debit: 0, pressionLance: 0, isAlimentation: true, commentaire: 'Alimentation' }); }
        tronconsPerte.push(...alims, ...lances);
        document.getElementById('jonctionsPerte').value = j;
        calculerPertes();
        const total = lances.reduce((s, t) => s + t.debit, 0);
        const alim = alims.reduce((s, t) => s + perte(t.diametre, total, t.longueur) + t.denivele / 10, 0);
        const lance = Math.max(...lances.map(t => t.pressionLance + perte(t.diametre, t.debit, t.longueur) + t.denivele / 10));
        const voulu = alim + lance + j;
        const lu = parseFloat(document.getElementById('pressionPompeValue').textContent);
        if (Math.abs(lu - voulu) > 0.051) ecarts.push(JSON.stringify({ alims, lances, j }) + ' : ' + lu + ' au lieu de ' + voulu.toFixed(2));
      }`, 41);
    expect(ecarts).toEqual([]);
});

test('Feu de forêt : vitesse = vent × facteur ÷ 100, m/min = km/h × 1000 ÷ 60, distances 15-30-45-60-120 min, seuils de risque (toutes les combinaisons)', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('feu-foret');
      const bornes = [16, 24, 32, 40, 48];
      for (const hygro of ['', '41-45', '31-40', '26-30', '16-25', '0-15']) for (const vent of [10, 15, 20, 25, 30, 35, 40, 45, 50, 60]) {
        hygroTrabaud = hygro; selectVentRapide(vent);
        let f = 3; if (hygro) { let i = bornes.findIndex(b => vent <= b); if (i === -1) i = 4; f = TRABAUD[hygro][i]; }
        const v = vent * f / 100 * (1000 / 60), v2 = vent * f / 100 * 1000 / 60;   // même résultat à l'arrondi près selon l'ordre des opérations
        const txt = document.getElementById('feu-foret-result').innerText;
        if (!txt.includes(v.toFixed(1) + ' m/min') && !txt.includes(v2.toFixed(1) + ' m/min')) ecarts.push(hygro + ' ' + vent + ' : vitesse ' + v.toFixed(1) + ' absente');
        for (const t of [15, 30, 45, 60, 120]) { const aff = d => d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(2) + ' km'; const s = aff(v * t); if (!txt.includes(s) && !txt.includes(aff(v2 * t))) ecarts.push(hygro + ' ' + vent + ' ' + t + ' min : ' + s + ' absent'); }
        const niveau = v < 10 ? 'FAIBLE' : v < 20 ? 'MODÉRÉ' : v < 35 ? 'ÉLEVÉ' : 'CRITIQUE';
        if (!txt.includes('RISQUE ' + niveau)) ecarts.push(hygro + ' ' + vent + ' : risque ' + niveau + ' absent');
      }`, 51);
    expect(ecarts).toEqual([]);
});

test('Feu de forêt : table de Trabaud, 5 humidités × 5 vitesses de vent, valeurs de la table du GDO § 2.3.3', async ({ app }) => {
    await app.evaluate(() => showModule('feu-foret'));
    const table = await app.evaluate(() => JSON.stringify(TRABAUD));
    expect(JSON.parse(table)).toEqual({
        '41-45': [1.0, 2.0, 2.8, 3.2, 3.4], '31-40': [1.4, 2.8, 3.9, 4.5, 4.8], '26-30': [2.0, 4.0, 5.6, 6.4, 6.8],
        '16-25': [2.8, 5.6, 7.8, 9.0, 9.5], '0-15': [3.2, 6.4, 9.0, 10.2, 10.9]
    });
});

test('Émulseur : calcul direct et inverse (300 saisies)', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('emulseur');
      const lire = id => document.getElementById(id).innerText.replace(/\\s+/g, ' ');
      for (let i = 0; i < 300; i++) {
        const S = entier(r, 1, 2000), taux = choix(r, [4, 6, 10, 20, 2.5]), duree = entier(r, 1, 90), conc = choix(r, [1, 3, 6]);
        document.getElementById('emuSurface').value = S; document.getElementById('emuDuree').value = duree; emuTaux = taux; emuConcentration = conc; emuCalculer();
        const debit = S * taux, sol = debit * duree, em = sol * (conc / 100), eau = sol - em, bid = Math.ceil(em / 20);
        const principal = lire('emuResultatPrincipal'), det = lire('emuDetails');
        if (!principal.includes(em.toFixed(0) + ' L') || !principal.includes(bid + ' bidon')) ecarts.push('direct ' + [S, taux, duree, conc] + ' : ' + principal + ' / attendu ' + em.toFixed(0) + ' L, ' + bid + ' bidons');
        if (!det.includes(debit.toFixed(0)) || !det.includes(eau.toFixed(0)) || !det.includes(sol.toFixed(0))) ecarts.push('détails ' + [S, taux, duree, conc] + ' : ' + det);
        const stock = entier(r, 5, 2000), dI = entier(r, 1, 90), tauxI = choix(r, [4, 6, 10, 20]), concI = choix(r, [1, 3, 6]);
        document.getElementById('emuStock').value = stock; document.getElementById('emuDureeInv').value = dI; emuTauxInv = tauxI; emuConcentrationInv = concI; emuCalculerInverse();
        const solI = stock / (concI / 100), debI = solI / dI, surf = debI / tauxI;
        if (!lire('emuInverseResultatPrincipal').includes(surf.toFixed(1) + ' m²')) ecarts.push('inverse ' + [stock, dI, tauxI, concI] + ' : ' + lire('emuInverseResultatPrincipal') + ' au lieu de ' + surf.toFixed(1));
      }`, 61);
    expect(ecarts).toEqual([]);
});

test('Explosimétrie : facteur = LIE étalon ÷ LIE gaz présent (au moins 1), valeur corrigée = lue × facteur, toutes les paires de gaz', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('explosimetrie'); await attendre(() => Object.keys(gazDatabase).length > 0); initExplosimetrie();
      const cles = Object.keys(gazDatabase).filter(k => gazDatabase[k].lie > 0);
      const lue = [5, 12.5, 20, 33, 50];
      let n = 0;
      const etalons = [...document.getElementById('gazEtalon').options].map(o => o.value).filter(k => gazDatabase[k]);
      if (etalons.length < 3) ecarts.push("peu de gaz d'étalonnage : " + etalons.length);
      for (const et of etalons) for (const pr of cles) {
        document.getElementById('gazEtalon').value = et; selectionnerGaz(pr);
        const f = Math.max(1, gazDatabase[et].lie / gazDatabase[pr].lie);
        if (Math.abs(facteurPrudent(gazDatabase[et].lie, gazDatabase[pr].lie) - f) > 1e-12) ecarts.push('facteur ' + et + '/' + pr);
        for (const v of lue) {
          document.getElementById('valeurExplo').value = v; calculerCorrectionGaz();
          const c = v * f, voulu = c > 100 ? '> 100 % LIE' : c.toFixed(1) + ' % LIE';
          const lu = document.getElementById('valeurCorrigee').textContent;
          if (lu !== voulu) ecarts.push(et + '→' + pr + ' ' + v + ' : ' + lu + ' au lieu de ' + voulu);
          n++;
        }
      }
      if (n < 100) ecarts.push('trop peu de cas : ' + n);`, 71);
    expect(ecarts).toEqual([]);
});

test('Wallace : pourcentages par zone, mains, plafond de 100 % et seuils 20 % / 10 % (tous les cas aléatoires)', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('suap-wallace-calc');
      const P = { adulte: { tete: 9, tronc_av: 18, tronc_ar: 18, bras_d: 9, bras_g: 9, jambe_d: 18, jambe_g: 18, perinee: 1 },
                  enfant: { tete: 17, tronc_av: 18, tronc_ar: 18, bras_d: 9, bras_g: 9, jambe_d: 14, jambe_g: 14, perinee: 0 } };
      for (let i = 0; i < 300; i++) {
        const mode = choix(r, ['adulte', 'enfant']); wallaceMode = mode; wallaceZonesActives = {}; wallaceMains = entier(r, 0, 20);
        let total = wallaceMains;
        for (const z of Object.keys(P[mode])) if (r() < 0.45) { wallaceZonesActives[z] = true; total += P[mode][z]; }
        total = Math.min(100, total); wallaceCalculer();
        const lu = document.getElementById('wallaceTotalPct').textContent, inter = document.getElementById('wallaceInterpretation').textContent;
        if (lu !== total + ' %') ecarts.push(mode + ' : ' + lu + ' au lieu de ' + total + ' %');
        const seuil = mode === 'adulte' ? 20 : 10;
        if (total > 0 && (total > seuil) !== inter.includes('SB > ' + seuil)) ecarts.push(mode + ' ' + total + ' % : seuil ' + seuil + ' mal appliqué : ' + inter.slice(0, 40));
      }`, 81);
    expect(ecarts).toEqual([]);
});

test('Facteur de chute : hauteur ÷ corde, seuils 0,3 et 1, incohérence au-delà de 2 fois la corde, cas limites', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('lspcc-calculateur');
      const cas = [[3, 10], [0, 5], [1.5, 5], [5, 5], [5.05, 5], [10, 5], [10.1, 5], [2, 5], [0.3, 1], [1, 1], [1.01, 1]];
      for (let i = 0; i < 150; i++) cas.push([Math.round(entre(r, 0, 12) * 10) / 10, Math.round(entre(r, 0.5, 10) * 10) / 10]);
      for (const [h, c] of cas) {
        document.getElementById('lspcc-hauteur').value = h; document.getElementById('lspcc-corde').value = c; calculerFacteurChute();
        const txt = document.getElementById('lspcc-resultat').innerText;
        if (h > 2 * c) { if (!/incoh/i.test(txt)) ecarts.push(h + '/' + c + ' : incohérence non signalée'); continue; }
        const f = h / c, niveau = f <= 0.3 ? 'OPTIMAL' : f <= 1 ? 'À ÉVITER' : 'INTERDIT';
        if (!txt.includes(f.toFixed(2)) || !txt.includes('FACTEUR ' + niveau)) ecarts.push(h + '/' + c + ' : ' + txt.replace(/\\s+/g, ' ').slice(0, 70) + ' (attendu ' + f.toFixed(2) + ' ' + niveau + ')');
      }`, 91);
    expect(ecarts).toEqual([]);
});

test('Convertisseur : chaque coefficient correspond à l\'équivalence physique réelle, températures comprises', async ({ app }) => {
    const r = await app.evaluate(() => {
        showModule('convertisseur'); initConversionData();
        const c = (type, de, vers, v = 1) => type === 'temperature' ? conversionData.temperature.convert(v, de, vers) : v / conversionData[type].units[de] * conversionData[type].units[vers];
        return {
            barPa: c('pression', 'bar', 'Pa'), barKpa: c('pression', 'bar', 'kPa'), barPsi: c('pression', 'bar', 'psi'), barAtm: c('pression', 'bar', 'atm'),
            lminLs: c('debit', 'L/min', 'L/s'), lminM3h: c('debit', 'L/min', 'm³/h'), lminLh: c('debit', 'L/min', 'L/h'),
            lM3: c('volume', 'L', 'm³'), lMl: c('volume', 'L', 'mL'),
            mKm: c('distance', 'm', 'km'), mCm: c('distance', 'm', 'cm'), mMm: c('distance', 'm', 'mm'),
            kmhMs: c('vitesse', 'km/h', 'm/s'), kmhMph: c('vitesse', 'km/h', 'mph'),
            c0f: c('temperature', '°C', '°F', 0), c100f: c('temperature', '°C', '°F', 100), c37f: c('temperature', '°C', '°F', 37), c0k: c('temperature', '°C', 'K', 0), fc: c('temperature', '°F', '°C', 212), kc: c('temperature', 'K', '°C', 300)
        };
    });
    const proche = (a, b, tol) => Math.abs(a - b) <= tol;
    expect(r.barPa).toBe(100000); expect(r.barKpa).toBe(100); expect(proche(r.barPsi, 14.5038, 1e-4)).toBe(true);
    expect(proche(r.barAtm, 1 / 1.01325, 1e-5)).toBe(true);
    expect(proche(r.lminLs, 1 / 60, 1e-9)).toBe(true); expect(proche(r.lminM3h, 0.06, 1e-12)).toBe(true); expect(r.lminLh).toBe(60);
    expect(r.lM3).toBe(0.001); expect(r.lMl).toBe(1000);
    expect(r.mKm).toBe(0.001); expect(r.mCm).toBe(100); expect(r.mMm).toBe(1000);
    expect(proche(r.kmhMs, 1 / 3.6, 1e-6)).toBe(true); expect(proche(r.kmhMph, 1 / 1.609344, 1e-6)).toBe(true);
    expect(r.c0f).toBe(32); expect(r.c100f).toBe(212); expect(proche(r.c37f, 98.6, 1e-9)).toBe(true); expect(r.c0k).toBe(273.15); expect(r.fc).toBe(100); expect(proche(r.kc, 26.85, 1e-9)).toBe(true);
});

test('Abaque : volume = L × l × h, masse = volume × densité, tonnes à partir de 1 000 kg (100 saisies, tous les matériaux)', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('abaque'); await attendre(() => densityData.length > 0);
      for (let i = 0; i < 100; i++) {
        const L = Math.round(entre(r, 0.5, 20) * 10) / 10, l = Math.round(entre(r, 0.5, 10) * 10) / 10, h = Math.round(entre(r, 0.2, 6) * 10) / 10;
        document.getElementById('abaque-longueur').value = L; document.getElementById('abaque-largeur').value = l; document.getElementById('abaque-hauteur').value = h;
        calculateAbaqueAll();
        const vol = L * l * h;
        if (document.getElementById('abaque-volume-display').textContent !== vol.toFixed(3) + ' m³') ecarts.push('volume ' + [L, l, h]);
        if (document.getElementById('abaque-volume-litres').textContent !== (vol * 1000).toFixed(0) + ' litres') ecarts.push('litres ' + [L, l, h]);
        const txt = document.getElementById('abaque-results').innerText.replace(/\\s+/g, ' ');
        for (const it of densityData.slice(0, 6)) {
          const p = vol * it.densite, aff = p >= 1000 ? (p / 1000).toFixed(2) + ' tonnes' : p.toFixed(0) + ' kg';
          const bloc = txt.slice(txt.indexOf(it.nom));
          if (!bloc.includes(aff)) ecarts.push(it.nom + ' ' + [L, l, h] + ' : ' + aff + ' absent');
        }
      }
      if (densityData.length < 5) ecarts.push('base de densités vide');`, 101);
    expect(ecarts).toEqual([]);
});

test('Temps de trajet : distance ÷ vitesse, arrondi à la minute (toutes les vitesses, 300 distances)', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('distance-calc');
      for (let i = 0; i < 300; i++) {
        const v = choix(r, [50, 70, 80, 90, 110, 130]), d = Math.round(entre(r, 0.1, 400) * 10) / 10;
        selectVitesse(v); document.getElementById('trajet-distance').value = d; calculateTrajet();
        const th = d / v, tm = Math.round(th * 60), h = Math.floor(tm / 60), m = tm % 60;
        let voulu = h > 0 ? h + 'h ' + m + 'min' : m + 'min';
        if (h === 0 && m === 0) voulu = Math.round(th * 3600) + 's';
        const lu = document.getElementById('trajet-temps').textContent;
        if (lu !== voulu) ecarts.push(d + ' km à ' + v + ' : ' + lu + ' au lieu de ' + voulu);
      }`, 111);
    expect(ecarts).toEqual([]);
});

test('Épuisement : surface par forme, volume, débit des pompes, temps arrondi au supérieur (400 saisies)', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('epuisement');
      for (let i = 0; i < 400; i++) {
        const forme = choix(r, ['rectangle', 'carre', 'cercle']), unite = choix(r, ['cm', 'm']);
        selectShape(forme);
        const L = Math.round(entre(r, 1, 30) * 10) / 10, l = Math.round(entre(r, 1, 20) * 10) / 10, c = Math.round(entre(r, 1, 20) * 10) / 10, dia = Math.round(entre(r, 1, 20) * 10) / 10;
        const haut = unite === 'cm' ? entier(r, 5, 200) : Math.round(entre(r, 0.1, 3) * 10) / 10;
        const set = (id, x) => { document.getElementById(id).value = x; };
        set('longueur', L); set('largeur', l); set('cote', c); set('diametre', dia); set('hauteur', haut); document.getElementById('uniteHauteur').value = unite;
        quantites.mat15 = entier(r, 0, 3); quantites.mat30 = entier(r, 0, 3); quantites.mat60 = entier(r, 0, 3); quantites.mat90 = entier(r, 0, 2);
        calculateEpuisement();
        const surface = forme === 'rectangle' ? L * l : forme === 'carre' ? c * c : Math.PI * Math.pow(dia / 2, 2);
        const vol = surface * (unite === 'cm' ? haut / 100 : haut), litres = vol * 1000;
        const debit = quantites.mat15 * 250 + quantites.mat30 * 500 + quantites.mat60 * 1000 + quantites.mat90 * 1500;
        const t = id => document.getElementById(id).textContent;
        if (t('surfaceEpuis') !== surface.toFixed(2) + ' m²') ecarts.push('surface ' + forme + ' : ' + t('surfaceEpuis') + ' au lieu de ' + surface.toFixed(2));
        if (t('volumeEau') !== litres.toFixed(0) + ' L (' + vol.toFixed(2) + ' m³)') ecarts.push('volume ' + forme + ' : ' + t('volumeEau') + ' au lieu de ' + litres.toFixed(0) + ' L');
        if (debit > 0) {
          const mn = Math.ceil(litres / debit), hh = Math.floor(mn / 60), mm = mn % 60, voulu = hh > 0 ? hh + 'h ' + mm + 'min' : mm + ' min';
          if (t('tempsTotalEpuis') !== voulu) ecarts.push('temps ' + forme + ' ' + debit + ' L/min : ' + t('tempsTotalEpuis') + ' au lieu de ' + voulu);
        }
      }`, 121);
    expect(ecarts).toEqual([]);
});

test('Paliers de plongée : temps équivalent d\'une plongée successive = temps + majoration de la table', async ({ app }) => {
    const ecarts = await lancer(app, `
      showModule('sal-calculateur'); await loadTablesMT2012();
      const val = (id, x) => { const e = document.getElementById(id); e.value = x; };
      for (let i = 0; i < 40; i++) {
        const prof = choix(r, [15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45]), temps = entier(r, 5, 40), idx = entier(r, 0, 9);
        val('calc-profondeur', prof); val('calc-temps', temps); val('calc-methode', 'air'); val('calc-melange', ''); val('calc-altitude', ''); val('calc-intervalle', String(idx));
        await calculerPaliers();
        const m = majorationSuccessive(tablesMT2012, prof, idx);
        const txt = document.getElementById('calc-resultat').innerText.replace(/\\s+/g, ' ');
        const attendu = 'temps équivalent ' + (temps + m.minutes) + ' min';
        if (!txt.includes(attendu) && !/Temps hors table|Plongée successive interdite|hors table/i.test(txt)) ecarts.push(prof + ' m ' + temps + ' min intervalle ' + idx + ' : ' + attendu + ' absent');
      }`, 131);
    expect(ecarts).toEqual([]);
});
