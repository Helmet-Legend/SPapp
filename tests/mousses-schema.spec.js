// Schéma « Chaîne de production de mousse » : le cadre « Rendement » ne doit recouvrir aucun autre cadre.
const { test, expect } = require('./outils');

for (const largeur of [320, 360, 390, 449, 600, 900, 1280]) {
    test(`schéma de mousse : aucun chevauchement à ${largeur} px`, async ({ app }) => {
        await app.setViewportSize({ width: largeur, height: 900 });
        await app.evaluate(() => showModule('mousses-schema'));
        await expect(app.locator('#mousses-schema')).toBeVisible();
        await app.waitForTimeout(500);   // fin de l'animation d'entrée de l'écran
        const r = await app.evaluate(() => {
            const m = document.getElementById('mousses-schema');
            const chaine = m.querySelector('.result-box > div');
            const rend = m.querySelector('[data-schema="rendement"]');
            const rect = e => e.getBoundingClientRect();
            const boite = rect(rend);
            // Tous les cadres du schéma : les blocs de la chaîne (enfants directs du conteneur vertical)
            const autres = [...chaine.querySelector('div').children].filter(e => e.offsetParent && e.textContent.trim() && !/⬇/.test(e.textContent));
            const chevauche = autres.filter(e => {
                const a = rect(e);
                return boite.left < a.right && boite.right > a.left && boite.top < a.bottom && boite.bottom > a.top;
            }).map(e => e.textContent.trim().slice(0, 30));
            const dernier = rect(autres[autres.length - 1]);
            const cadre = rect(m.querySelector('.result-box'));
            return { chevauche, nb: autres.length, sousLaChaine: boite.top >= dernier.bottom - 1, dansLeCadre: boite.right <= cadre.right + 1 && boite.left >= cadre.left - 1, texte: rend.textContent.replace(/\s+/g, ' ').trim() };
        });
        expect(r.nb, 'cadres de la chaîne trouvés').toBe(5);
        expect(r.chevauche, 'cadres recouverts par « Rendement »').toEqual([]);
        expect(r.sousLaChaine, '« Rendement » placé sous la chaîne').toBe(true);
        expect(r.dansLeCadre, '« Rendement » reste dans le cadre').toBe(true);
        expect(r.texte).toContain('RENDEMENT');
        expect(r.texte).toContain('Mousse / Émulseur');
    });
}

test('schéma de mousse : le cadre « Taux de Foisonnement » reste lisible en entier', async ({ app }) => {
    await app.setViewportSize({ width: 390, height: 900 });
    await app.evaluate(() => showModule('mousses-schema'));
    await app.waitForTimeout(500);
    const visible = await app.evaluate(() => {
        const f = document.querySelector('#mousses-schema [data-schema="foisonnement"]');
        f.scrollIntoView({ block: 'center' });   // hors de la barre d'onglets fixe
        const r = f.getBoundingClientRect();
        // Le point central de chaque quart du cadre doit appartenir au cadre lui-même (rien ne le recouvre)
        const pts = [[.25, .5], [.5, .5], [.75, .5]].map(([x, y]) => document.elementFromPoint(r.left + r.width * x, r.top + r.height * y));
        return pts.every(el => el && f.contains(el));
    });
    expect(visible).toBe(true);
});
