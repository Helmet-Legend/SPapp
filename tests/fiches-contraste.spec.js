// Contenu des fiches lisible dans les deux thèmes : aucun texte sous 3:1 (WCAG, texte gros ou gras)
// sur aucun écran, y compris quelques résultats calculés.
const { test, expect } = require('./outils');

const SEUIL = 3;
const scenarios = {
    explosimetrie: () => selectionnerGaz('propane'),
    bouteilles: () => { showBouteillesSection('identification'); identifierBouteilleParCouleur('jaune'); },
    tmd: () => { document.getElementById('searchName').value = 'essence'; searchTMD(); },
    'distance-calc': () => selectVitesse(90),
};

function textesPeuLisibles([id, seuil]) {
    const parse = c => {
        const m = c && c.match(/[\d.]+/g);
        if (!m || m.length < 3) return null;
        return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
    };
    const L = ({ r, g, b }) => {
        const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    // Fond effectif : premier fond opaque (ou moyenne d'un dégradé) en remontant les parents
    const fondDe = el => {
        for (; el && el.nodeType === 1; el = el.parentElement) {
            const cs = getComputedStyle(el);
            if (cs.backgroundImage.includes('gradient')) {
                const arrets = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0])).filter(c => c && c.a > 0.5);
                if (arrets.length) return arrets.reduce((s, c) => s + L(c), 0) / arrets.length;
            }
            const bg = parse(cs.backgroundColor);
            if (bg && bg.a > 0.5) return L(bg);
        }
        return L(parse(getComputedStyle(document.body).backgroundColor));
    };
    const mauvais = [];
    document.getElementById(id).querySelectorAll('*').forEach(el => {
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
        if (el.closest('svg, .nav-crumbs')) return;
        const texte = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
        if (!texte || !/[\p{L}\p{N}]/u.test(texte)) return;
        const fg = parse(getComputedStyle(el).color);
        if (!fg || fg.a < 0.5) return;
        const f = L(fg), g = fondDe(el);
        const ratio = (Math.max(f, g) + 0.05) / (Math.min(f, g) + 0.05);
        if (ratio < seuil) mauvais.push(`${id} : « ${texte.slice(0, 30)} » (${ratio.toFixed(1)}:1)`);
    });
    return mauvais;
}

for (const nom of ['clair', 'sombre']) {
    test(`thème ${nom} : le contenu de toutes les fiches est lisible`, async ({ page }) => {
        test.setTimeout(180000);
        await page.addInitScript(t => localStorage.setItem('deciops.theme', t), nom);
        await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
        await page.goto('/index.html');
        await expect.poll(() => page.evaluate(() => typeof tmdDatabase !== 'undefined' && tmdDatabase.length)).toBeGreaterThan(0);
        const ids = await page.evaluate(() => [...document.querySelectorAll('.module')].map(m => m.id).filter(i => i !== 'home'));
        const mauvais = [];
        for (const id of ids) {
            await page.evaluate(i => showModule(i), id);
            if (scenarios[id]) await page.evaluate(scenarios[id]);
            mauvais.push(...await page.evaluate(textesPeuLisibles, [id, SEUIL]));
        }
        expect(mauvais).toEqual([]);
    });
}
