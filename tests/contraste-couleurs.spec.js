// Couleurs et contrastes (kit graphique v2) : jetons des deux thèmes + texte lisible sur les écrans principaux.
// Seuils WCAG : 4,5:1 pour le texte normal, 3:1 pour le texte gros (≥ 24 px, ou ≥ 18,7 px en gras) et pour les icônes.
const { test, expect } = require('./outils');

const hex = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number); return { r: m[0], g: m[1], b: m[2] }; };
const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

for (const theme of ['clair', 'sombre']) {
    test(`jetons du thème ${theme} : rouge de texte, rouge de fond, texte secondaire et couleurs de famille`, async ({ page }) => {
        await page.addInitScript((t) => { localStorage.setItem('deciops.theme', t); localStorage.setItem('vulcain-bienvenue', '1'); }, theme);
        await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
        await page.goto('/index.html');
        await page.click('[data-onglet="calculs"]');
        const v = await page.evaluate(() => {
            const el = document.querySelector('.calc-vue'), cs = getComputedStyle(el), body = getComputedStyle(document.body);
            // résout une variable CSS en couleur calculée
            const res = (nom, ctx) => { const e = document.createElement('i'); e.style.color = `var(${nom})`; ctx.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; };
            const b = document.body;
            const out = { page: res('--t-page', b), s1: res('--t-s1', b), s2: res('--t-s2', b), muted: res('--t-muted', b), ink: res('--t-ink', b),
                accent: res('--t-accent', b), accentBg: res('--t-accent-bg', b), accentInk: res('--t-accent-ink', b), familles: {} };
            for (const f of ['inc', 'fdf', 'risk', 'suap', 'spe', 'out']) out.familles[f] = res('--f-' + f, el);
            return out;
        });
        const c = Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'familles').map(([k, x]) => [k, hex(x)]));
        expect(ratio(c.accentInk, c.accentBg), 'texte blanc sur fond rouge').toBeGreaterThanOrEqual(4.5);
        expect(ratio(c.accent, c.s1), 'texte rouge sur surface').toBeGreaterThanOrEqual(4.5);
        expect(ratio(c.accent, c.page), 'texte rouge sur la page').toBeGreaterThanOrEqual(4.5);
        expect(ratio(c.muted, c.s1), 'texte secondaire sur surface').toBeGreaterThanOrEqual(4.5);
        expect(ratio(c.muted, c.page), 'texte secondaire sur la page').toBeGreaterThanOrEqual(4.5);
        expect(ratio(c.ink, c.s2), 'texte sur surface relevée').toBeGreaterThanOrEqual(7);
        for (const [f, col] of Object.entries(v.familles)) expect(ratio(hex(col), c.s1), `famille ${f} (icône)`).toBeGreaterThanOrEqual(3);
    });
}

// Balayage des écrans principaux : aucun texte sous le seuil, dans les deux thèmes.
const ECRANS = [
    ['accueil', async (p) => {}],
    ['calculs', async (p) => { await p.click('[data-onglet="calculs"]'); }],
    ['domaine ouvert', async (p) => { await p.click('[data-onglet="accueil"]'); await p.click('[data-domaine="incendie"]'); }],
    ['boussole', async (p) => { await p.evaluate(() => { showModule('boussole'); Boussole.mesure({ cap: 40, inclinaison: 5, champ: 46 }); Boussole.figer(); }); }],
    ['se localiser', async (p) => { await p.evaluate(() => showModule('localisation')); await p.fill('#loc-saisie', '43.3951, 3.4263'); }],
    ['mes points', async (p) => { await p.evaluate(() => { MesPoints.ajouter({ nom: 'Citerne nord', lat: 43.3951, lon: 3.4263, note: 'Accès par la gauche' }); MesPoints.ouvrir(); }); }],
    ['carte dfci', async (p) => { await p.evaluate(() => showModule('carte-dfci')); }],
    ['pertes de charge', async (p) => { await p.evaluate(() => showModule('pertes')); }],
    ['message d\'ambiance', async (p) => { await p.evaluate(() => showModule('fdf-ambiance')); }],
    ['convertisseur', async (p) => { await p.evaluate(() => showModule('convertisseur')); }],
];

function peuLisibles() {
    const parse = c => { const s = c && c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/); if (s) return { r: +s[1] * 255, g: +s[2] * 255, b: +s[3] * 255, a: s[4] === undefined ? 1 : +s[4] }; const m = c && c.match(/[\d.]+/g); if (!m || m.length < 3) return null; return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] }; };
    const L = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
    const fond = el => { for (; el && el.nodeType === 1; el = el.parentElement) { const cs = getComputedStyle(el); if (cs.backgroundImage.includes('gradient')) { const st = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0])).filter(c => c && c.a > .5); if (st.length) return st.reduce((s, c) => s + L(c), 0) / st.length; } const bg = parse(cs.backgroundColor); if (bg && bg.a > .5) return L(bg); } return L(parse(getComputedStyle(document.body).backgroundColor)); };
    const zone = document.querySelector('.module.active') || document.getElementById('home');
    const surPhoto = document.body.classList.contains('accueil-photo');
    const res = [];
    zone.querySelectorAll('*').forEach(el => {
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
        if (el.closest('svg, mark, .calc-photo, .nav-crumbs')) return;
        if (surPhoto && !el.closest('.calc-vue, .acces-rapide') && !el.closest('.nav-acc')) return; // texte posé sur la photo : testé ailleurs
        const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
        if (!t || !/[\p{L}\p{N}]/u.test(t)) return;
        const cs = getComputedStyle(el), fg = parse(cs.color);
        if (!fg || fg.a < .5) return;
        const r = (Math.max(L(fg), fond(el)) + .05) / (Math.min(L(fg), fond(el)) + .05);
        const px = parseFloat(cs.fontSize), gros = px >= 24 || (+cs.fontWeight >= 700 && px >= 18.66);
        if (r < (gros ? 3 : 4.5)) res.push(`${t.slice(0, 28)} (${r.toFixed(2)}:1, ${px}px)`);
    });
    return res;
}

for (const theme of ['clair', 'sombre']) {
    test(`écrans principaux, thème ${theme} : tout le texte est lisible`, async ({ page }) => {
        await page.addInitScript((t) => { localStorage.setItem('deciops.theme', t); localStorage.setItem('vulcain-bienvenue', '1'); }, theme);
        await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
        await page.goto('/index.html');
        await expect(page.locator('#navHome .nav-acc').first()).toBeVisible();
        const echecs = {};
        for (const [nom, aller] of ECRANS) {
            await aller(page);
            await page.waitForTimeout(250);
            const r = await page.evaluate(peuLisibles);
            if (r.length) echecs[nom] = r.slice(0, 6);
            if (nom !== 'accueil' && nom !== 'calculs' && nom !== 'domaine ouvert') await page.evaluate(() => showModule('home'));
        }
        expect(echecs).toEqual({});
    });
}
