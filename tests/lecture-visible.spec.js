// Style de lecture des anciennes pages : tout ce qui était visible reste visible, rien n'est coupé à 375 px.
const { test, expect } = require('./outils');

const MESURE = theme => {
    document.documentElement.setAttribute('data-theme', theme);
    const sortie = {};
    const ids = Array.from(document.querySelectorAll('.module')).filter(m => Lecture.niveau(m) === 'bandeau').map(m => m.id);
    ids.forEach(id => {
        showModule(id);
        const m = document.getElementById(id);
        m.querySelectorAll('details').forEach(d => { d.open = true; });
        const liste = [];
        m.querySelectorAll('*').forEach(e => {
            if (e.closest('[data-lecture-ajout]')) return;
            const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
            const contenu = e.tagName === 'IMG' || (e.children.length === 0 && e.textContent.trim() !== '');
            const visible = contenu && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 && +cs.opacity > 0;
            const rogne = cs.overflow !== 'visible' && e.tagName !== 'IMG' && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)
                && !/(auto|scroll)/.test(cs.overflowX);
            const defile = (() => { for (let a = e.parentElement; a && a !== m; a = a.parentElement) if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) return true; return false; })();
            const dehors = visible && !defile && (r.right > window.innerWidth + 1 || r.left < -1);
            liste.push([visible ? 1 : 0, rogne ? 1 : 0, dehors ? 1 : 0, (e.id || e.className || e.tagName).toString().slice(0, 40)]);
        });
        sortie[id] = { liste, page: document.documentElement.scrollWidth - window.innerWidth };
    });
    return sortie;
};

for (const theme of ['sombre', 'clair']) {
    test('anciennes pages, ' + theme + ', 375 px : rien de masqué, de coupé ni de hors écran', async ({ app }) => {
        test.setTimeout(300000);
        await app.setViewportSize({ width: 375, height: 800 });
        await app.evaluate(() => localStorage.setItem('vulcain-lecture', 'off'));
        await app.reload();
        const avant = await app.evaluate(MESURE, theme);
        await app.evaluate(() => localStorage.removeItem('vulcain-lecture'));
        await app.reload();
        const apres = await app.evaluate(MESURE, theme);
        const ids = Object.keys(avant);
        expect(ids.length).toBeGreaterThanOrEqual(40);
        const problemes = [];
        ids.forEach(id => {
            const a = avant[id], b = apres[id];
            if (!b || a.liste.length !== b.liste.length) { problemes.push(id + ' : structure différente'); return; }
            if (b.page > 0) problemes.push(id + ' : débordement horizontal ' + b.page + 'px');
            a.liste.forEach((x, i) => {
                const y = b.liste[i];
                if (x[0] && !y[0]) problemes.push(id + ' : devenu invisible → ' + x[3]);
                if (!x[1] && y[1]) problemes.push(id + ' : contenu rogné → ' + y[3]);
                if (!x[2] && y[2]) problemes.push(id + ' : hors écran → ' + y[3]);
            });
        });
        expect(problemes).toEqual([]);
    });
}

test('ancienne page : bandeau, sections numérotées et alertes habillées, contenu des boîtes intact', async ({ app }) => {
    await app.evaluate(() => showModule('impm-souterrain'));
    const m = app.locator('#impm-souterrain');
    await expect(m).toHaveClass(/lecture-bandeau/);
    expect(await m.locator('.lec-boite').count()).toBeGreaterThanOrEqual(2);
    expect(await m.locator('.lec-bt').count()).toBeGreaterThanOrEqual(2);
    await expect(m.locator('.lec-nav')).toBeVisible();
    await app.evaluate(() => showModule('suap-brulures'));
    expect(await app.locator('#suap-brulures .lec-boite').count()).toBeGreaterThanOrEqual(2);
    await expect(app.locator('#suap-brulures')).toContainText('Gel d\'eau');
});
