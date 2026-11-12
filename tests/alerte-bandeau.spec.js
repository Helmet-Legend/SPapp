// Encadré « Attention » (.rd-alerte) : cadre rouge et bandeau rouge plein, lisibles en clair comme en sombre.
const { test, expect } = require('./outils');

const lum = c => { const m = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

for (const theme of ['clair', 'sombre']) {
    test(`thème ${theme} : bandeau « Attention » et texte de l'encadré lisibles`, async ({ app }) => {
        await app.evaluate(t => Theme.choisir(t), theme);
        await app.evaluate(() => showModule('echelles-menu'));
        const r = await app.evaluate(() => {
            const e = document.querySelector('#echelles-menu .rd-alerte');
            const b = getComputedStyle(e, '::before'), c = getComputedStyle(e);
            return { contenu: b.content, bandeauFond: b.backgroundColor, bandeauTexte: b.color, fond: c.backgroundColor, texte: c.color, bordure: c.borderTopWidth, bordureCouleur: c.borderTopColor,
                     margeG: b.marginLeft, margeD: b.marginRight, margeH: b.marginTop, remplissageG: c.paddingLeft, remplissageH: c.paddingTop, afficheBloc: b.display, theme: document.documentElement.dataset.theme };
        });
        expect(r.theme).toBe(theme === 'clair' ? 'clair' : 'sombre');
        expect(r.contenu).toContain('ATTENTION');
        expect(r.bandeauFond).toBe('rgb(194, 31, 54)');
        expect(contraste(r.bandeauTexte, r.bandeauFond)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(r.texte, r.fond)).toBeGreaterThanOrEqual(7);
        expect(r.bordure).toBe('2px');
        // le bandeau déborde du remplissage de chaque côté : il couvre toute la largeur de l'encadré
        expect(r.afficheBloc).toBe('block');
        expect(r.margeG).toBe('-' + r.remplissageG);
        expect(r.margeD).toBe('-' + r.remplissageG);
        expect(r.margeH).toBe('-' + r.remplissageH);
    });
}

test('les astuces vertes ne changent pas', async ({ app }) => {
    await app.evaluate(() => showModule('echelles-securite'));
    const r = await app.evaluate(() => { const e = document.querySelector('#echelles-securite .rd-astuce'); const c = getComputedStyle(e); return { gauche: c.borderLeftWidth, avant: getComputedStyle(e, '::before').content }; });
    expect(r.gauche).toBe('5px');
    expect(r.avant).toContain('💡');
});
