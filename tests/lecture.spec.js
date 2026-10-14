// Style de lecture des chapitres : habillage seulement. Le contenu (texte, photos, schémas, boutons, liens) ne change jamais.
const { test, expect } = require('./outils');
const REGISTRE = require('../data/navigation.json');

const IDS = REGISTRE.pages.filter(p => ['fiche', 'presentation', 'ordre'].includes(p.type)).map(p => p.id);

test('aucun chapitre ne change : même HTML, mêmes textes, images, schémas, boutons et liens', async ({ app }) => {
    test.setTimeout(240000);
    await app.evaluate(() => localStorage.setItem('vulcain-lecture', 'off'));
    const bilan = await app.evaluate(ids => {
        // On retire seulement ce que le style ajoute : classes lec…, attributs data-lec… / data-label, barre de navigation
        const sansAjouts = module => {
            const copie = module.cloneNode(true);
            copie.querySelectorAll('[data-lecture-ajout]').forEach(e => e.remove());
            let html = copie.innerHTML.replace(/\sdata-lec[\w-]*="[^"]*"/g, '').replace(/\sdata-label="[^"]*"/g, '');
            return html.replace(/\sclass="([^"]*)"/g, (m, c) => {
                const k = c.split(/\s+/).filter(x => x && !/^lec/.test(x) && x !== 'lecture');
                return k.length ? ' class="' + k.join(' ') + '"' : '';
            });
        };
        const compte = module => {
            const copie = module.cloneNode(true);
            copie.querySelectorAll('[data-lecture-ajout]').forEach(e => e.remove());
            return {
                img: copie.querySelectorAll('img').length,
                boutons: copie.querySelectorAll('button, a').length,
                mots: (copie.textContent.match(/\S+/g) || []).length
            };
        };
        const sortie = { eligibles: 0, ecarts: [], nonEligibles: 0 };
        ids.forEach(id => {
            const m = document.getElementById(id);
            if (!m) return;
            if (!Lecture.eligible(m)) { sortie.nonEligibles++; return; }
            sortie.eligibles++;
            const avant = sansAjouts(m), c0 = compte(m);
            Lecture.forcer(m);
            const apres = sansAjouts(m), c1 = compte(m);
            if (avant !== apres || JSON.stringify(c0) !== JSON.stringify(c1)) sortie.ecarts.push(id);
        });
        return sortie;
    }, IDS);
    expect(bilan.eligibles).toBeGreaterThan(250);
    expect(bilan.ecarts).toEqual([]);
});

test('un chapitre ouvert reçoit le style : bandeau photo, navigation par sections, rubriques, étapes, cartes', async ({ app }) => {
    await app.evaluate(() => showModule('gdoinc-systeme-feu'));
    const m = app.locator('#gdoinc-systeme-feu');
    await expect(m).toHaveClass(/lecture/);
    await expect(m.locator('.lec-nav button')).toHaveCount(await m.locator('.rd-section > h3:first-child').count());
    await expect(m.locator('ol.lec-steps')).toHaveCount(1);
    expect(await m.locator('ul.lec-defs').count()).toBeGreaterThanOrEqual(1);
    await expect(m.locator('table.lec-cards').first()).toBeVisible();
    // Le bandeau du titre porte la photo du domaine
    const fond = await m.locator('> h2').evaluate(h => getComputedStyle(h).backgroundImage);
    expect(fond).toContain('dom-incendie');
});

test('la navigation par sections amène à la bonne rubrique', async ({ app }) => {
    await app.evaluate(() => showModule('gdoinc-systeme-feu'));
    const m = app.locator('#gdoinc-systeme-feu');
    await m.locator('.lec-nav button').nth(3).click();
    await expect.poll(() => m.locator('.rd-section').nth(3).evaluate(s => Math.round(s.getBoundingClientRect().top))).toBeLessThan(140);
    await expect(m.locator('.lec-nav button').nth(3)).toHaveAttribute('aria-current', 'true');
});

test('l\'interrupteur « off » rétablit l\'ancien aspect, et les pages d\'autres familles ne sont pas touchées', async ({ app }) => {
    await app.evaluate(() => { localStorage.setItem('vulcain-lecture', 'off'); showModule('gdoinc-systeme-feu'); });
    await expect(app.locator('#gdoinc-systeme-feu')).not.toHaveClass(/lecture/);
    await app.evaluate(() => showModule('ari'));
    await expect(app.locator('#ari')).not.toHaveClass(/lecture/);
});

test('mobile et deux thèmes : aucun débordement horizontal sur un chapitre à tableaux', async ({ app }) => {
    for (const theme of ['sombre', 'clair']) {
        await app.evaluate(t => { document.documentElement.setAttribute('data-theme', t); showModule('gtosms-echelles'); }, theme);
        const trop = await app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(trop).toBeLessThanOrEqual(0);
    }
});

test('un tableau large devient des cartes : tout reste visible à 375 px, sans défilement latéral', async ({ app }) => {
    await app.setViewportSize({ width: 375, height: 800 });
    await app.evaluate(() => { showModule('ulm'); document.querySelectorAll('#ulm details').forEach(d => { d.open = true; }); });
    const carte = app.locator('#ulm table.lec-cards', { has: app.locator('th', { hasText: 'Particularités' }) }).first();
    await expect(carte).toBeVisible();
    const r = await carte.evaluate(t => ({ depasse: t.scrollWidth - t.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth }));
    expect(r.depasse).toBeLessThanOrEqual(1);
    expect(r.page).toBeLessThanOrEqual(0);
    await expect(carte.locator('td[data-label="Particularités"]').first()).toBeVisible();
});
