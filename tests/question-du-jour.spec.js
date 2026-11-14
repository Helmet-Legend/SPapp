// Question du jour : carte d'accueil, rotation sans doublon, rappel des erreurs, série, réglage.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./outils');

const CLE = 'vulcain.qdj';
const donnees = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.json'), 'utf8'));
const nav = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'navigation.json'), 'utf8'));
const questions = donnees.questions;

function jourDecale(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
async function ecrireEtat(page, etat) {
    await page.evaluate(([c, e]) => localStorage.setItem(c, JSON.stringify(e)), [CLE, etat]);
}
async function lireEtat(page) {
    return page.evaluate(c => JSON.parse(localStorage.getItem(c) || 'null'), CLE);
}
async function recharger(page) {
    await page.reload();
    await expect(page.locator('#navHome .nav-acc').first()).toBeVisible();
}
async function repondre(page, bonne) {
    const q = await questionAffichee(page);
    const texte = bonne ? q.choix[q.bonne] : q.choix.find((_, i) => i !== q.bonne);
    await page.locator('.qdj-choix-btn', { hasText: texte }).first().click();
    return q;
}
async function questionAffichee(page) {
    const texte = (await page.locator('.qdj-q').textContent()).trim();
    return questions.find(q => q.q === texte);
}

test('banque : 30 questions bien formées, fiches existantes, identifiants uniques', () => {
    const ids = new Set(nav.pages.map(p => p.id));
    expect(questions.length).toBeGreaterThanOrEqual(30);
    expect(new Set(questions.map(q => q.id)).size).toBe(questions.length);
    for (const q of questions) {
        expect(q.choix, q.id).toHaveLength(4);
        expect(new Set(q.choix).size, q.id + ' : choix identiques').toBe(4);
        expect(q.bonne, q.id).toBeGreaterThanOrEqual(0);
        expect(q.bonne, q.id).toBeLessThan(4);
        expect(q.explication.length, q.id).toBeGreaterThan(20);
        expect(ids.has(q.fiche), q.id + ' : fiche ' + q.fiche).toBe(true);
    }
});

test('la carte s\'affiche sur l\'accueil avec 4 choix, sans erreur JavaScript', async ({ app }) => {
    await expect(app.locator('#qdj .qdj')).toBeVisible();
    await expect(app.locator('.qdj-choix-btn')).toHaveCount(4);
    expect(await questionAffichee(app)).toBeTruthy();
    expect(app.erreurs).toEqual([]);
});

test('bonne réponse : verdict, explication, fiche liée, série à 1, puis carte compacte au rechargement', async ({ app }) => {
    const q = await repondre(app, true);
    await expect(app.locator('.qdj-verdict')).toHaveText('Bonne réponse !');
    await expect(app.locator('.qdj-expl')).toHaveText(q.explication);
    await expect(app.locator('.qdj-serie')).toContainText('1 jour');
    await expect(app.locator('.qdj-choix-btn.qdj-bon')).toHaveCount(1);
    await expect(app.locator('.qdj-choix-btn').first()).toBeDisabled();
    await recharger(app);
    await expect(app.locator('.qdj-compact')).toContainText('Revenez demain');
    await expect(app.locator('.qdj-choix-btn')).toHaveCount(0);
    await app.click('#qdj .qdj-btn:has-text("Revoir la réponse")');
    await expect(app.locator('.qdj-expl')).toHaveText(q.explication);
    await app.click('.qdj-btn-fiche');
    expect(await app.evaluate(() => document.querySelector('.module.active').id)).toBe(q.fiche);
});

test('la série continue d\'un jour à l\'autre et repart à 1 après une pause', async ({ app }) => {
    await ecrireEtat(app, { jour: jourDecale(-1), id: questions[0].id, repondu: true, serie: 4, derniere: jourDecale(-1) });
    await recharger(app);
    await expect(app.locator('.qdj-serie')).toContainText('4 jours');
    await repondre(app, true);
    await expect(app.locator('.qdj-serie')).toContainText('5 jours');
    await ecrireEtat(app, { jour: jourDecale(-5), id: questions[0].id, repondu: true, serie: 9, derniere: jourDecale(-5) });
    await recharger(app);
    await expect(app.locator('.qdj-serie')).toHaveCount(0);
    await repondre(app, true);
    await expect(app.locator('.qdj-serie')).toContainText('1 jour');
});

test('une réponse fausse programme un rappel à J+3, et la question revient ce jour-là', async ({ app }) => {
    await repondre(app, false);
    await expect(app.locator('.qdj-verdict')).toHaveText('Pas tout à fait.');
    await expect(app.locator('.qdj-choix-btn.qdj-faux')).toHaveCount(1);
    await expect(app.locator('.qdj-choix-btn.qdj-bon')).toHaveCount(1);
    const etat = await lireEtat(app);
    const id = etat.id;
    expect(etat.erreurs[id].due).toBe(jourDecale(3));
    // Le jour de l'échéance : la question ratée est reposée en priorité
    etat.jour = jourDecale(-1);
    etat.erreurs[id].due = jourDecale(0);
    await ecrireEtat(app, etat);
    await recharger(app);
    const q = await questionAffichee(app);
    expect(q.id).toBe(id);
    // Deux bonnes réponses de suite la font sortir de la file
    await repondre(app, true);
    let e = await lireEtat(app);
    expect(e.erreurs[id].bons).toBe(1);
    expect(e.erreurs[id].due).toBe(jourDecale(7));
    e.jour = jourDecale(-1);
    e.erreurs[id].due = jourDecale(0);
    await ecrireEtat(app, e);
    await recharger(app);
    expect((await questionAffichee(app)).id).toBe(id);
    await repondre(app, true);
    e = await lireEtat(app);
    expect(e.erreurs[id]).toBeUndefined();
});

test('30 jours de suite : chaque question sort une fois, sans doublon', async ({ app }) => {
    const vues = [];
    for (let i = 0; i < 30; i++) {
        const q = await questionAffichee(app);
        vues.push(q.id);
        const e = await lireEtat(app);
        e.jour = '2000-01-01';
        await ecrireEtat(app, e);
        await recharger(app);
    }
    expect(new Set(vues).size).toBe(30);
});

test('« Encore une » propose une autre question sans toucher à la série', async ({ app }) => {
    const du_jour = await questionAffichee(app);
    await repondre(app, true);
    await app.click('#qdj .qdj-btn:has-text("Encore une")');
    const autre = await questionAffichee(app);
    expect(autre.id).not.toBe(du_jour.id);
    await expect(app.locator('.qdj-titre')).toHaveText('Encore une question');
    await repondre(app, true);
    await expect(app.locator('.qdj-serie')).toContainText('1 jour');
    await app.click('#qdj .qdj-btn:has-text("Question du jour")');
    await expect(app.locator('.qdj-titre')).toHaveText('Question du jour');
});

test('masquer la carte : elle disparaît pour la session ; l\'interrupteur de Réglages la désactive', async ({ app }) => {
    await app.click('.qdj-fermer');
    await expect(app.locator('#qdj')).toBeHidden();
    await app.click('#reglagesBtn');
    await expect(app.locator('#qdjSwitch')).toHaveAttribute('aria-checked', 'true');
    await app.click('#qdjSwitch');
    await expect(app.locator('#qdjSwitch')).toHaveAttribute('aria-checked', 'false');
    await app.evaluate(() => sessionStorage.clear());
    await recharger(app);
    await expect(app.locator('#qdj')).toBeHidden();
    await app.click('#reglagesBtn');
    await app.click('#qdjSwitch');
    await app.evaluate(() => fermerReglages());
    await expect(app.locator('#qdj .qdj')).toBeVisible();
});

test('la carte reste lisible en thème sombre sur petit écran, sans débordement', async ({ app }) => {
    await app.setViewportSize({ width: 360, height: 740 });
    await app.evaluate(() => document.documentElement.setAttribute('data-theme', 'sombre'));
    await repondre(app, false);
    const debordement = await app.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(debordement).toBe(false);
});

test('la toute première question indique qu\'on peut désactiver les questions, puis l\'astuce disparaît', async ({ app }) => {
    await expect(app.locator('.qdj-astuce')).toContainText('désactiver');
    await expect(app.locator('.qdj-astuce')).toContainText('Réglages');
    await repondre(app, true);
    await expect(app.locator('.qdj-astuce')).toBeVisible();   // toujours là sur cette carte, réponse affichée
    await recharger(app);
    await app.click('#qdj .qdj-btn:has-text("Encore une")');
    await expect(app.locator('.qdj-astuce')).toHaveCount(0);
    await app.evaluate(() => localStorage.removeItem('vulcain.qdj'));
    await recharger(app);
    await app.click('.qdj-btn-desactiver');
    await expect(app.locator('#qdj')).toBeHidden();
    await app.click('#reglagesBtn');
    await expect(app.locator('#qdjSwitch')).toHaveAttribute('aria-checked', 'false');
});
