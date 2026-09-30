// Formulaire de contact (À propos) : validation, envoi et gestion des erreurs.
const { test, expect } = require('./outils');

async function ouvrirContact(app) {
    await app.click('.about-btn');
    await expect(app.locator('#aboutModal')).toBeVisible();
    await app.locator('#contactMessage').scrollIntoViewIfNeeded();
}

test('formulaire de contact : message vide refusé sans appel réseau', async ({ app }) => {
    let appele = false;
    await app.route('**/api/contact', route => { appele = true; route.fulfill({ status: 200, body: '{"ok":true}' }); });
    await ouvrirContact(app);
    await app.click('button[onclick="envoyerContact()"]');
    await expect(app.locator('#contactRetour')).toHaveText('Le message est vide.');
    expect(appele).toBe(false);
});

test('formulaire de contact : envoi réussi vide les champs et confirme', async ({ app }) => {
    let corpsRecu = null;
    await app.route('**/api/contact', route => {
        corpsRecu = route.request().postDataJSON();
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await ouvrirContact(app);
    await app.fill('#contactMessage', 'La fiche EPA affiche la mauvaise icône.');
    await app.fill('#contactEmail', 'test@example.com');
    await app.click('button[onclick="envoyerContact()"]');
    await expect(app.locator('#contactRetour')).toHaveText('Message envoyé, merci !');
    await expect(app.locator('#contactMessage')).toHaveValue('');
    await expect(app.locator('#contactEmail')).toHaveValue('');
    expect(corpsRecu.message).toBe('La fiche EPA affiche la mauvaise icône.');
    expect(corpsRecu.contact).toBe('test@example.com');
});

test('formulaire de contact : erreur serveur affichée sans effacer le message', async ({ app }) => {
    await app.route('**/api/contact', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ erreur: 'Origine non autorisée' }) }));
    await ouvrirContact(app);
    await app.fill('#contactMessage', 'Un message qui ne partira pas.');
    await app.click('button[onclick="envoyerContact()"]');
    await expect(app.locator('#contactRetour')).toHaveText('Origine non autorisée');
    await expect(app.locator('#contactMessage')).toHaveValue('Un message qui ne partira pas.');
});
