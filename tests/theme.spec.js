// Thèmes Clair / Sombre et fenêtre Réglages.
const { test, expect } = require('./outils');

const theme = page => page.evaluate(() => document.documentElement.dataset.theme);

for (const [systeme, attendu] of [['light', 'clair'], ['dark', 'sombre']]) {
    test(`sans préférence enregistrée, le thème suit le téléphone (${systeme} → ${attendu})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: systeme });
        await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
        await page.goto('/index.html');
        expect(await theme(page)).toBe(attendu);
        await expect(page.locator('body')).toHaveClass(attendu === 'sombre' ? /dark-mode/ : /^(?!.*dark-mode)/);
        await expect(page.locator('[data-theme-choix="auto"]')).toHaveAttribute('aria-checked', 'true');
    });
}

test('Réglages : choisir Sombre, puis Clair, et le choix est mémorisé', async ({ app }) => {
    await app.click('#reglagesBtn');
    await expect(app.locator('#reglagesModal')).toBeVisible();

    await app.click('[data-theme-choix="sombre"]');
    expect(await theme(app)).toBe('sombre');
    await expect(app.locator('body')).toHaveClass(/dark-mode/);
    await expect(app.locator('[data-theme-choix="sombre"]')).toHaveAttribute('aria-checked', 'true');

    await app.reload();
    expect(await theme(app)).toBe('sombre');

    await app.click('#reglagesBtn');
    await app.click('[data-theme-choix="clair"]');
    expect(await theme(app)).toBe('clair');
    await expect(app.locator('body')).not.toHaveClass(/dark-mode/);
    await app.keyboard.press('Escape');
    await expect(app.locator('#reglagesModal')).toBeHidden();
    expect(app.erreurs).toEqual([]);
});

test('Réglages : Automatique suit le réglage du téléphone', async ({ app }) => {
    await app.click('#reglagesBtn');
    await app.click('[data-theme-choix="auto"]');
    await app.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => theme(app)).toBe('sombre');
    await app.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => theme(app)).toBe('clair');
});

test('l\'ancien réglage « mode sombre » est repris', async ({ page }) => {
    await page.addInitScript(() => { if (!localStorage.getItem('deciops.theme')) localStorage.setItem('theme', 'dark'); });
    await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
    await page.goto('/index.html');
    expect(await theme(page)).toBe('sombre');
});

// Contraste WCAG des textes de navigation (menus, onglets, fil d'Ariane, recherche)
async function textesPeuLisibles(page) {
    return page.evaluate(() => {
        const lum = c => {
            const m = c.match(/[\d.]+/g);
            if (!m || (m[3] !== undefined && +m[3] < 0.5)) return null;
            const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
            return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]);
        };
        // Texte posé directement sur la photo de l'accueil : fond inconnu ici,
        // vérifié sur les pixels réels par le test « texte sur la photo » ci-dessous.
        const surPhoto = document.body.classList.contains('accueil-photo');
        const fond = el => {
            while (el) {
                if (el === document.body && surPhoto) return null;
                const l = lum(getComputedStyle(el).backgroundColor); if (l !== null) return l; el = el.parentElement;
            }
            return lum(getComputedStyle(document.body).backgroundColor);
        };
        const zones = '.app-header, .nav-home, .nav-tabbar, .nav-crumbs';
        const mauvais = [];
        document.querySelectorAll(zones).forEach(zone => zone.querySelectorAll('*').forEach(el => {
            if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
            if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
            if (el.closest('mark')) return;
            const f = lum(getComputedStyle(el).color), g = fond(el);
            if (g === null) return;
            const r = (Math.max(f, g) + 0.05) / (Math.min(f, g) + 0.05);
            if (r < 4.5) mauvais.push(`${el.textContent.trim().slice(0, 30)} (${r.toFixed(1)}:1)`);
        }));
        return mauvais;
    });
}

for (const nom of ['clair', 'sombre']) {
    test(`thème ${nom} : la navigation est lisible (contraste ≥ 4,5:1)`, async ({ page }) => {
        await page.addInitScript(t => localStorage.setItem('deciops.theme', t), nom);
        await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
        await page.goto('/index.html');
        await expect(page.locator('#navHome .nav-acc').first()).toBeVisible();
        await page.click('[data-domaine="incendie"]');
        await page.click('[data-theme="incendie|Calculs incendie"]');
        expect(await textesPeuLisibles(page), 'accueil').toEqual([]);

        await page.click('[data-onglet="chercher"]');
        await page.fill('#navSearchInput', 'gaz');
        expect(await textesPeuLisibles(page), 'recherche').toEqual([]);

        await page.evaluate(() => showModule('tmd'));
        expect(await textesPeuLisibles(page), 'fil d\'Ariane').toEqual([]);
    });
}

// Accueil : le texte posé sur la photo (logo, domaines) doit rester lisible.
// On masque le texte, on capture l'écran et on lit les pixels réels sous chaque texte.
// Pire cas : le fond le plus proche de la couleur du texte (10 % des pixels les plus défavorables).
for (const nom of ['clair', 'sombre']) {
    test(`thème ${nom} : le texte sur la photo de l'accueil est lisible`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.addInitScript(t => localStorage.setItem('deciops.theme', t), nom);
        await page.route(url => !url.href.startsWith('http://127.0.0.1:4173/'), r => r.abort());
        await page.goto('/index.html');
        await expect(page.locator('body')).toHaveClass(/accueil-photo/);
        await page.evaluate(async () => {
            await document.fonts.ready;
            const url = getComputedStyle(document.querySelector('.accueil-fond')).backgroundImage.slice(5, -2);
            const img = new Image(); img.src = url; await img.decode();
        });
        await page.waitForTimeout(500);
        const cibles = await page.evaluate(() => {
            const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
            const out = [];
            document.querySelectorAll('.app-header *, .nav-home .nav-acc-head *').forEach(el => {
                if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
                const r = el.getBoundingClientRect();
                if (!r.width || r.bottom > innerHeight - 90) return;
                out.push({ t: el.textContent.trim().slice(0, 30), x: r.x, y: r.y, w: r.width, h: r.height, L: lum(getComputedStyle(el).color), grand: parseFloat(getComputedStyle(el).fontSize) >= 24 });
            });
            return out;
        });
        expect(cibles.length).toBeGreaterThan(5);
        await page.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important} svg{visibility:hidden}' });
        await page.waitForTimeout(200);
        const png = (await page.screenshot()).toString('base64');
        const mauvais = await page.evaluate(async ([png, cibles]) => {
            const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            const g = c.getContext('2d'); g.drawImage(img, 0, 0);
            const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
            return cibles.map(k => {
                const e = img.width / innerWidth; // densité de pixels de l'écran émulé
                const d = g.getImageData(Math.round(k.x * e), Math.round(k.y * e), Math.max(1, Math.round(k.w * e)), Math.max(1, Math.round(k.h * e))).data;
                const ls = [];
                for (let i = 0; i < d.length; i += 4) ls.push(0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]));
                ls.sort((a, b) => a - b);
                const fondPire = k.L > 0.5 ? ls[Math.floor(ls.length * 0.9)] : ls[Math.floor(ls.length * 0.1)];
                const r = (Math.max(k.L, fondPire) + 0.05) / (Math.min(k.L, fondPire) + 0.05);
                return r < (k.grand ? 3 : 4.5) ? `${k.t} (${r.toFixed(1)}:1)` : null;
            }).filter(Boolean);
        }, [png, cibles]);
        expect(mauvais).toEqual([]);
    });
}
