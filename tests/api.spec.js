// Fonction serveur api/gemini.js, testée sans navigateur (l'API Claude est simulée).
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const ORIGINE = 'https://s-papp.vercel.app';

// Vercel exécute api/gemini.js comme module ES : on le charge de la même façon,
// et à chaque fois neuf (compteurs de limite remis à zéro).
async function chargerHandler() {
    process.env.ANTHROPIC_API_KEY = 'cle-de-test';
    const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'gemini.js'), 'utf8');
    const url = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(source + '\n// ' + Math.random());
    return (await import(url)).default;
}

function fausseReponse() {
    return {
        code: 200, entetes: {}, corps: '', terminee: false, headersSent: false,
        setHeader(k, v) { this.entetes[k] = v; },
        status(c) { this.code = c; return this; },
        json(o) { this.corps = JSON.stringify(o); this.terminee = true; return this; },
        write(t) { this.headersSent = true; this.corps += t; },
        end() { this.terminee = true; return this; },
    };
}

// Flux SSE de l'API Claude, découpé au milieu d'une ligne
function simulerClaude(capture) {
    const evenements = [
        { type: 'message_start' },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Bonjour' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: ' pompiers' } },
        { type: 'message_stop' },
    ];
    const octets = new TextEncoder().encode(evenements.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(''));
    const morceaux = [octets.slice(0, 40), octets.slice(40, 101), octets.slice(101)];
    global.fetch = async (url, options) => {
        capture.corps = JSON.parse(options.body);
        let i = 0;
        return { ok: true, body: { getReader: () => ({ read: async () => (i < morceaux.length ? { done: false, value: morceaux[i++] } : { done: true }) }) } };
    };
}

async function appeler(handler, { origine = ORIGINE, methode = 'POST', corps = { types: ['Incendie'] }, ip = '10.0.0.1' } = {}) {
    const res = fausseReponse();
    await handler({ method: methode, headers: { origin: origine, 'x-forwarded-for': ip }, body: corps }, res);
    return res;
}

test('refuse un appel qui ne vient pas du site', async () => {
    const handler = await chargerHandler();
    expect((await appeler(handler, { origine: 'https://pirate.example' })).code).toBe(403);
    expect((await appeler(handler, { origine: null })).code).toBe(403);
});

test('refuse un texte libre à la place des paramètres du formulaire', async () => {
    const handler = await chargerHandler();
    const res = await appeler(handler, { corps: { prompt: 'Écris autre chose' }, ip: '10.0.0.2' });
    expect(res.code).toBe(400);
});

test('construit le prompt côté serveur avec des tailles plafonnées', async () => {
    const handler = await chargerHandler();
    const capture = {};
    simulerClaude(capture);
    const res = await appeler(handler, {
        corps: { types: ['Incendie', 'x'.repeat(500)], consignes: 'c'.repeat(5000), nbPersonnel: '9999' },
        ip: '10.0.0.3',
    });
    expect(res.code).toBe(200);
    const prompt = capture.corps.messages[0].content;
    expect(prompt).toContain('**EFFECTIF :** 200 sapeurs-pompiers');
    expect(prompt).not.toContain('x'.repeat(101));
    expect(prompt).not.toContain('c'.repeat(1001));
});

test('utilise un modèle Claude actuel, sans réflexion préalable', async () => {
    const handler = await chargerHandler();
    const capture = {};
    simulerClaude(capture);
    await appeler(handler, { ip: '10.0.0.7' });
    // claude-sonnet-4-20250514 a été retiré (404) : ne jamais y revenir
    expect(capture.corps.model).not.toMatch(/sonnet-4-2025/);
    expect(capture.corps.model).toBe(process.env.CLAUDE_MODEL || 'claude-sonnet-5');
    expect(capture.corps.thinking).toEqual({ type: 'disabled' });
    expect(capture.corps.stream).toBe(true);
    expect(capture.corps.temperature).toBeUndefined();
});

test('retransmet le flux même quand une ligne est coupée', async () => {
    const handler = await chargerHandler();
    simulerClaude({});
    const res = await appeler(handler, { ip: '10.0.0.4' });
    expect(res.corps).toContain('data: {"text":"Bonjour"}');
    expect(res.corps).toContain('data: {"text":" pompiers"}');
    expect(res.corps.trim().endsWith('data: [DONE]')).toBe(true);
});

test('limite le nombre de générations par appareil', async () => {
    const handler = await chargerHandler();
    simulerClaude({});
    for (let i = 0; i < 5; i++) expect((await appeler(handler, { ip: '10.0.0.5' })).code).toBe(200);
    const bloque = await appeler(handler, { ip: '10.0.0.5' });
    expect(bloque.code).toBe(429);
    expect((await appeler(handler, { ip: '10.0.0.6' })).code).toBe(200);
});
