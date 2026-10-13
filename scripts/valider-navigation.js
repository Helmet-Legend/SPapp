#!/usr/bin/env node
/**
 * Validation de data/navigation.json (registre central de la navigation).
 *
 * Usage :
 *   node scripts/valider-navigation.js                 rapport lisible, code de sortie 1 s'il y a une erreur
 *   node scripts/valider-navigation.js --json          rapport au format JSON
 *   node scripts/valider-navigation.js --registre f    valide un autre fichier (pour les tests)
 *   npm run valider:nav
 *
 * ERREUR : le registre est incorrect (à corriger avant de publier).
 * AVERTISSEMENT : à connaître, sans bloquer (par exemple « motsCles » vide).
 * Le script ne modifie aucun fichier.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const args = process.argv.slice(2);
const formatJson = args.includes('--json');
const iReg = args.indexOf('--registre');
const fichierRegistre = iReg >= 0 && args[iReg + 1] ? path.resolve(args[iReg + 1]) : path.join(RACINE, 'data', 'navigation.json');

const TYPES = ['calculateur', 'fiche', 'ordre', 'presentation', 'menu'];
// Champs connus : obligatoires, puis facultatifs (tous utilisés par js/navigation.js)
const CHAMPS_PAGE = ['id', 'titre', 'domaine', 'theme', 'type', 'motsCles', 'court', 'sous', 'kit', 'photo', 'terrain', 'grande', 'picto'];
const CHAMPS_DOMAINE = ['id', 'titre', 'icone', 'picto', 'couleur', 'themes', 'couleursThemes'];

const erreurs = [];
const avertissements = [];
const err = (portee, message) => erreurs.push({ portee, message });
const avert = (portee, message) => avertissements.push({ portee, message });
const texte = v => typeof v === 'string' && v.trim() !== '';

function terminer() {
    if (formatJson) {
        console.log(JSON.stringify({ erreurs, avertissements }, null, 2));
    } else {
        const ligne = (niveau, e) => `[${niveau}] ${e.portee} : ${e.message}`;
        erreurs.forEach(e => console.log(ligne('ERREUR', e)));
        avertissements.forEach(e => console.log(ligne('AVERTISSEMENT', e)));
        console.log(`\nValidation de ${path.relative(process.cwd(), fichierRegistre) || fichierRegistre} : `
            + `${erreurs.length} erreur(s), ${avertissements.length} avertissement(s).`);
    }
    process.exit(erreurs.length ? 1 : 0);
}

// ---------- 1. Fichier et structure ----------
let registre;
try {
    registre = JSON.parse(fs.readFileSync(fichierRegistre, 'utf8'));
} catch (e) {
    err('fichier', `JSON illisible ou invalide (${e.message})`);
    terminer();
}
if (!registre || typeof registre !== 'object' || Array.isArray(registre)) { err('racine', 'le registre doit être un objet'); terminer(); }
if (!Array.isArray(registre.domaines)) err('domaines', 'doit être un tableau');
if (!Array.isArray(registre.pages)) err('pages', 'doit être un tableau');
if (erreurs.length) terminer();

// ---------- 2. Contexte : index.html (écrans, symboles d'icônes) ----------
const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
const idsHtml = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const ecrans = new Set([
    ...[...html.matchAll(/<div[^>]*\bid="([^"]+)"[^>]*class="[^"]*\bmodule\b/g)].map(m => m[1]),
    ...[...html.matchAll(/<div[^>]*class="[^"]*\bmodule\b[^"]*"[^>]*\bid="([^"]+)"/g)].map(m => m[1])
]);
const symboles = new Set([...html.matchAll(/<symbol[^>]*\bid="([^"]+)"/g)].map(m => m[1]));
idsHtml.filter((id, i) => idsHtml.indexOf(id) !== i).forEach((id, i, a) => { if (a.indexOf(id) === i) err('index.html', `identifiant HTML en double : « ${id} »`); });

// ---------- 3. Domaines ----------
const domaines = {};
registre.domaines.forEach((d, i) => {
    const nom = `domaine #${i + 1}${d && d.id ? ' « ' + d.id + ' »' : ''}`;
    if (!d || typeof d !== 'object' || Array.isArray(d)) { err(nom, 'doit être un objet'); return; }
    if (!texte(d.id)) { err(nom, '« id » absent ou vide'); return; }
    if (domaines[d.id]) err(nom, 'identifiant de domaine en double');
    domaines[d.id] = d;
    if (!texte(d.titre)) err(nom, '« titre » absent ou vide');
    if (!texte(d.couleur) || !/^#[0-9A-Fa-f]{6}$/.test(d.couleur)) err(nom, '« couleur » doit être au format #RRGGBB');
    if (!texte(d.picto)) err(nom, '« picto » absent ou vide');
    else if (!symboles.has('i-' + d.picto)) err(nom, `pictogramme « ${d.picto} » absent des icônes (symbole i-${d.picto})`);
    if (!Array.isArray(d.themes)) err(nom, '« themes » doit être un tableau');
    else {
        d.themes.forEach((t, k) => { if (!texte(t)) err(nom, `thème #${k + 1} vide ou non texte`); });
        d.themes.filter((t, k) => d.themes.indexOf(t) !== k).forEach(t => err(nom, `thème en double : « ${t} »`));
        d.themes.filter(t => texte(t) && !registre.pages.some(p => p && p.domaine === d.id && p.theme === t))
            .forEach(t => avert(nom, `thème « ${t} » sans aucune page`));
    }
    if (d.couleursThemes !== undefined) {
        if (!d.couleursThemes || typeof d.couleursThemes !== 'object') err(nom, '« couleursThemes » doit être un objet');
        else Object.keys(d.couleursThemes).filter(t => !(d.themes || []).includes(t)).forEach(t => err(nom, `« couleursThemes » : thème inconnu « ${t} »`));
    }
    Object.keys(d).filter(c => !CHAMPS_DOMAINE.includes(c)).forEach(c => avert(nom, `champ inconnu « ${c} »`));
    const photo = path.join(RACINE, 'images', 'accueil', `dom-${d.id}.jpeg`);
    if (!fs.existsSync(photo)) err(nom, `image de la carte absente : images/accueil/dom-${d.id}.jpeg`);
});

// ---------- 4. Pages ----------
const vus = {};
const motsClesVides = [];
registre.pages.forEach((p, i) => {
    const nom = `page #${i + 1}${p && p.id ? ' « ' + p.id + ' »' : ''}`;
    if (!p || typeof p !== 'object' || Array.isArray(p)) { err(nom, 'doit être un objet'); return; }
    if (!texte(p.id)) { err(nom, '« id » absent ou vide'); return; }
    if (!/^[A-Za-z0-9_-]+$/.test(p.id)) err(nom, '« id » : caractères autorisés = lettres, chiffres, tiret et tiret bas');
    if (vus[p.id]) err(nom, `identifiant en double (déjà utilisé par la page #${vus[p.id]})`);
    else vus[p.id] = i + 1;
    if (!texte(p.titre)) err(nom, '« titre » absent ou vide');
    if (!texte(p.domaine)) err(nom, '« domaine » absent ou vide');
    else if (!domaines[p.domaine]) err(nom, `domaine inconnu « ${p.domaine} »`);
    if (!TYPES.includes(p.type)) err(nom, `type « ${p.type} » non pris en charge (attendus : ${TYPES.join(', ')})`);
    if (!texte(p.theme)) { if (p.type !== 'menu') err(nom, '« theme » absent ou vide (autorisé seulement pour un menu)'); }
    else if (domaines[p.domaine] && Array.isArray(domaines[p.domaine].themes) && !domaines[p.domaine].themes.includes(p.theme)) {
        err(nom, `thème « ${p.theme} » absent de la liste du domaine « ${p.domaine} »`);
    }
    if (p.motsCles === undefined) { if (p.type !== 'menu') motsClesVides.push(p.id + ' (absent)'); }
    else if (!Array.isArray(p.motsCles)) err(nom, '« motsCles » doit être un tableau de textes');
    else {
        p.motsCles.forEach((k, n) => { if (!texte(k)) err(nom, `« motsCles » : élément #${n + 1} vide ou non texte`); });
        p.motsCles.filter((k, n) => p.motsCles.indexOf(k) !== n).forEach(k => avert(nom, `« motsCles » : « ${k} » en double`));
        if (p.motsCles.length === 0 && p.type !== 'menu') motsClesVides.push(p.id);
    }
    ['court', 'sous', 'kit', 'photo', 'picto'].forEach(c => { if (p[c] !== undefined && !texte(p[c])) err(nom, `« ${c} » doit être un texte non vide`); });
    if (p.terrain !== undefined && typeof p.terrain !== 'number') err(nom, '« terrain » doit être un nombre');
    if (p.grande !== undefined && typeof p.grande !== 'boolean') err(nom, '« grande » doit être vrai ou faux');
    if (texte(p.kit) && !symboles.has('i-k-' + p.kit)) err(nom, `icône « ${p.kit} » absente (symbole i-k-${p.kit})`);
    if (texte(p.picto) && !symboles.has('i-' + p.picto)) err(nom, `pictogramme « ${p.picto} » absent (symbole i-${p.picto})`);
    if (texte(p.photo) && !fs.existsSync(path.join(RACINE, p.photo))) err(nom, `image absente : ${p.photo}`);
    Object.keys(p).filter(c => !CHAMPS_PAGE.includes(c)).forEach(c => avert(nom, `champ inconnu « ${c} »`));
    if (!ecrans.has(p.id)) err(nom, 'aucun écran « div.module » portant cet identifiant dans index.html');
});
if (motsClesVides.length) avert('motsCles', `${motsClesVides.length} page(s) sans mots-clés (recherche limitée au titre, au thème et au texte) : ${motsClesVides.join(', ')}`);

// ---------- 5. Écrans sans entrée dans le registre ----------
const idsRegistre = new Set(registre.pages.filter(p => p && p.id).map(p => p.id));
[...ecrans].filter(e => e !== 'home' && !idsRegistre.has(e)).forEach(e => err('index.html', `écran « ${e} » absent du registre (invisible dans les menus)`));

terminer();
