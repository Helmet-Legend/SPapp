// Fiches d'ordres (PATRAC DR, DPIF, SMES, SOIEC, SAOIECL) : habillage (À retenir, barre de lettres)
// sans changer les champs, les boutons ni le PDF.
const { test, expect } = require('./outils');
const STRUCTURE = require('./ordres-structure.json');

const FICHES = ['patrac-dr', 'dpif', 'smes', 'soiec', 'saoiecl'];

for (const id of FICHES) {
    test(`${id} : mêmes champs, mêmes boutons et mêmes titres qu'avant l'habillage`, async ({ app }) => {
        await app.evaluate(i => showModule(i), id);
        const vu = await app.evaluate(i => {
            const m = document.getElementById(i);
            const controles = Array.from(m.querySelectorAll('input, textarea, select, button'))
                .filter(e => !e.closest('[data-ordres-ajout], .nav-crumbs'))
                .map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('onclick') ? '[' + e.getAttribute('onclick') + ']' : ''));
            const titres = Array.from(m.querySelectorAll('h3')).map(h => h.textContent.replace(/\s+/g, ' ').trim());
            return { controles, titres };
        }, id);
        expect(vu.controles).toEqual(STRUCTURE[id].controles);
        expect(vu.titres).toEqual(STRUCTURE[id].titres);
    });
}

test('PATRAC DR : « À retenir » et barre de lettres', async ({ app }) => {
    await app.evaluate(() => showModule('patrac-dr'));
    await expect(app.locator('#patrac-dr .ord-retenir')).toContainText('Personnel · Armement · Tenue · Radio · Alimentation · Commandement · Déroulement · Rendez-vous');
    const lettres = await app.locator('#patrac-dr .ord-nav button').allTextContents();
    expect(lettres).toEqual(['📋', 'P', 'A', 'T', 'R', 'A', 'C', 'D', 'R']);
});

test('SMES, SOIEC, DPIF, SAOIECL : lettres de la barre', async ({ app }) => {
    const attendu = { smes: 'SMES', soiec: 'SOIEC', dpif: 'DPIF', saoiecl: 'SAOIELC' };   // ordre des sections de l'app : Logistique avant Commandement
    for (const [id, lettres] of Object.entries(attendu)) {
        await app.evaluate(i => showModule(i), id);
        const vu = (await app.locator(`#${id} .ord-nav button`).allTextContents()).join('');
        expect(vu).toBe(lettres);
        await expect(app.locator(`#${id} .ord-retenir`)).toHaveCount(1);
    }
});

test('un appui sur une lettre amène à la section', async ({ app }) => {
    await app.evaluate(() => showModule('patrac-dr'));
    await app.locator('#patrac-dr .ord-nav button').nth(7).click();   // D (Déroulement)
    await expect(app.locator('#patrac-deroulement')).toBeInViewport();
    await expect(app.locator('#patrac-dr .ord-nav button').nth(7)).toHaveAttribute('aria-current', 'true');
});

test('une section remplie marque sa lettre ; effacer la démarque', async ({ app }) => {
    await app.evaluate(() => showModule('smes'));
    const s = app.locator('#smes .ord-nav button').nth(0);
    await expect(s).not.toHaveClass(/ord-fait/);
    await app.fill('#smes-situation', 'Feu d\'appartement');
    await expect(s).toHaveClass(/ord-fait/);
    await app.click('#smes button[onclick="clearSMES()"]');   // confirm() accepté par la fixture
    await expect(s).not.toHaveClass(/ord-fait/);
});

test('PATRAC DR : un véhicule ajouté marque la lettre A', async ({ app }) => {
    await app.evaluate(() => showModule('patrac-dr'));
    const a = app.locator('#patrac-dr .ord-nav button').nth(2);
    await expect(a).not.toHaveClass(/ord-fait/);
    await app.click("button[onclick=\"ajouterVehiculeAvecEquipage('FPT', 8)\"]");
    await app.fill('#modalNumero', '347');
    await app.click('button[onclick="validerEquipage()"]');
    await expect(a).toHaveClass(/ord-fait/);
    await app.click('button[onclick="retirerVehiculeEquipage(0)"]');
    await expect(a).not.toHaveClass(/ord-fait/);
});

test('le PDF reprend toujours les champs saisis (SMES et DPIF)', async ({ app }) => {
    await app.evaluate(() => { window.__doc = ''; window.open = () => ({ document: { write: t => { window.__doc += t; }, close() {} }, focus() {} }); });
    await app.evaluate(() => showModule('smes'));
    await app.fill('#smes-situation', 'SITUATION-TEST-42');
    await app.fill('#smes-mission', 'MISSION-TEST-42');
    await app.evaluate(() => printSMES());
    let doc = await app.evaluate(() => window.__doc);
    expect(doc).toContain('SITUATION-TEST-42');
    expect(doc).toContain('MISSION-TEST-42');
    expect(doc).not.toContain('À retenir');
    await app.evaluate(() => { window.__doc = ''; showModule('dpif'); });
    await app.fill('#dpif-direction', 'NORD-TEST-42');
    await app.evaluate(() => printDPIF());
    doc = await app.evaluate(() => window.__doc);
    expect(doc).toContain('NORD-TEST-42');
    expect(doc).not.toContain('ord-nav');
});

test('les fiches ordres restent lisibles : pas de défilement horizontal', async ({ app }) => {
    for (const id of FICHES) {
        await app.evaluate(i => showModule(i), id);
        const l = await app.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(l).toBeLessThanOrEqual(1);
    }
});
