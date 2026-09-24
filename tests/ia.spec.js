// Générateur IA côté navigateur (réponse du serveur simulée).
const { test, expect } = require('./outils');

test('affiche la réponse en flux, sans exécuter de HTML, et n\'envoie que les paramètres', async ({ app }) => {
    let corpsEnvoye = null;
    await app.route('**/api/gemini', async route => {
        corpsEnvoye = JSON.parse(route.request().postData());
        // Une ligne coupée entre deux morceaux + une tentative d'injection HTML
        await route.fulfill({
            status: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: 'data: {"text":"## Titre\\n<img src=x onerror=\\"window.__xss=1\\">"}\n\ndata: {"text":" **fin**"}\n\ndata: [DONE]\n\n',
        });
    });
    await app.evaluate(() => showModule('ia-manoeuvre'));
    await app.locator('input[name="type"]').first().check();
    await app.click('#btn-generer');

    await expect(app.locator('#scenario-contenu strong')).toHaveText('fin');
    await expect(app.locator('#scenario-contenu')).toContainText('<img src=x');
    await expect(app.locator('#scenario-contenu img')).toHaveCount(0);
    expect(await app.evaluate(() => window.__xss)).toBeUndefined();

    expect(corpsEnvoye).not.toHaveProperty('prompt');
    expect(corpsEnvoye.types.length).toBe(1);
});

test('affiche le message d\'erreur du serveur', async ({ app }) => {
    const messages = [];
    app.removeAllListeners('dialog');
    app.on('dialog', d => { messages.push(d.message()); d.accept(); });
    await app.route('**/api/gemini', route => route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Trop de générations rapprochées.' }),
    }));
    await app.evaluate(() => showModule('ia-manoeuvre'));
    await app.locator('input[name="type"]').first().check();
    await app.click('#btn-generer');
    await expect.poll(() => messages.join(' ')).toContain('Trop de générations rapprochées.');
});

test('bloque la 3e génération en 24 h sans appeler le serveur', async ({ app }) => {
    let appels = 0;
    const messages = [];
    app.removeAllListeners('dialog');
    app.on('dialog', d => { messages.push(d.message()); d.accept(); });
    await app.route('**/api/gemini', async route => {
        appels++;
        await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'data: {"text":"ok"}\n\ndata: [DONE]\n\n' });
    });
    await app.evaluate(() => { localStorage.removeItem('vulcain.ia.generations'); showModule('ia-manoeuvre'); iaAfficherQuota(); });
    await expect(app.locator('#ia-quota')).toContainText('2 générations sur 2');
    await app.locator('input[name="type"]').first().check();
    for (let i = 0; i < 2; i++) {
        await app.click('#btn-generer');
        await expect(app.locator('#btn-generer')).toBeEnabled();
    }
    await expect(app.locator('#ia-quota')).toContainText('Limite atteinte');
    await app.click('#btn-generer');
    await expect.poll(() => messages.join(' ')).toContain('Limite atteinte');
    expect(appels).toBe(2);
});
