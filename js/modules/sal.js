/**
 * Vulcain - Module Plongée (SAL)
 * Tables MT 2012 (Air Standard, Air/Oxy 6 m) et calcul des paliers,
 * avec profondeur équivalente (Nitrox, altitude) et plongée successive (temps équivalent).
 * Source : annexe II du référentiel SAL (DGSCGC, 12/03/2014), tables du Ministère du Travail MT 2012.
 */

let tablesMT2012 = null;

// Charger les tables au démarrage
async function loadTablesMT2012() {
    if (!tablesMT2012) {
        tablesMT2012 = await DataLoader.load('tables_mt2012.json');
    }
    return tablesMT2012;
}

const PALIERS_MT2012 = [['p18', 18], ['p15', 15], ['p12', 12], ['p9', 9], ['p6', 6], ['p3', 3]];
const PALIERS_OXY = [['a21', '21 m'], ['a18', '18 m'], ['a15', '15 m'], ['a12', '12 m'], ['a9', '9 m'], ['o6', '6 m O₂']];

// Règle des tables : profondeur et temps exacts immédiatement supérieurs
function ligneMT2012(tables, profondeur, temps, methode = 'air') {
    const jeu = methode === 'oxy' ? tables.oxy : tables.air;
    const profs = Object.keys(jeu).map(Number).sort((a, b) => a - b);
    const prof = profs.find(p => p >= profondeur);
    if (prof === undefined) return { hors: 'profondeur' };
    const lignes = jeu[prof].filter(l => !l.exclu);
    const ligne = lignes.find(l => l.temps >= temps);
    if (!ligne) return { hors: 'temps', prof, max: lignes[lignes.length - 1].temps };
    return { prof, ligne };
}

// Moins de 12 m : tableau « temps au fond maximum sans palier » (colonne 0 = 12 h, 1 = 6 h, 2 = 4 h)
function sansPalierMT2012(tables, profondeur, temps, colonne = 0) {
    const l = tables.sansPalier.lignes.find(x => parseFloat(x.profondeur) >= profondeur);
    if (!l) return null;
    const max = l.valeurs[colonne];
    return { prof: l.profondeur, max, ok: max === 'illimité' || (typeof max === 'number' && temps <= max) };
}

// Profondeur équivalente lue dans une table « réelle → équivalente » (Nitrox ou altitude)
function profondeurEquivalente(table, profondeur, colonne) {
    const ligne = table.lignes.find(l => l.reelle >= profondeur) || null;
    if (!ligne) return null;
    const v = ligne.valeurs[colonne];
    return v === undefined ? { horsTable: true, reelle: ligne.reelle } : { eq: v, reelle: ligne.reelle, alerte: ligne.alerte };
}

// Plongée successive : majoration à ajouter au temps réel
function majorationSuccessive(tables, profondeur, intervalle) {
    const l = tables.successives.lignes.find(x => x.max >= Math.ceil(profondeur));
    if (!l) return null;
    return { libelle: l.libelle, minutes: l.valeurs[intervalle] };
}

function carteResultat(titre, valeur) {
    return `<div class="sal-res-carte"><span>${titre}</span><b>${valeur}</b></div>`;
}

function valeur(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

// Le calcul des paliers ne change pas. Il est enveloppé pour mettre ensuite à jour la vision globale (heures).
async function calculerPaliers() {
    derniereDecompression = null;
    try { await calculerPaliersTable(); } finally { majVisionGlobale(); }
}

async function calculerPaliersTable() {
    await loadTablesMT2012();

    const profondeur = parseFloat(String(valeur('calc-profondeur')).replace(',', '.'));
    const temps = parseInt(valeur('calc-temps'));
    const methode = valeur('calc-methode') || 'air';
    const melange = valeur('calc-melange');
    const altitude = valeur('calc-altitude');
    const intervalle = valeur('calc-intervalle');
    const resultat = document.getElementById('calc-resultat');
    const alerte = txt => { resultat.innerHTML = `<div class="rd-alerte">${txt}</div>`; };

    if (!profondeur || !temps || profondeur <= 0 || temps <= 0) {
        resultat.innerHTML = '<p class="sal-res-info">Saisissez la profondeur et le temps au fond.</p>';
        return;
    }
    if (profondeur > 60) {
        alerte('<strong>⛔ Plus de 60 m : hors tables.</strong> Profondeur maximale : 60 m (50 à 60 m uniquement avec décompression à l\'oxygène ou au Trimix).');
        return;
    }
    if (melange && methode === 'oxy') {
        alerte('<strong>⛔ Combinaison non prévue.</strong> La table Air/Oxy 6 m s\'emploie à l\'air (mélange autorisé : air ou oxygène). Le Nitrox se décompresse avec la table Air Standard par la profondeur équivalente.');
        return;
    }
    if (melange && altitude !== '') {
        alerte('<strong>⛔ Combinaison non prévue par le référentiel</strong> (Nitrox + altitude). Consulter le directeur de plongée.');
        return;
    }

    const etapes = [];
    let pTable = profondeur;

    if (melange) {
        if (profondeur > 40) { alerte('<strong>⛔ Nitrox : 40 m maximum</strong> (méthode Nitrox du référentiel).'); return; }
        const col = tablesMT2012.nitrox.melanges.indexOf(melange);
        const r = profondeurEquivalente(tablesMT2012.nitrox, Math.max(profondeur, 9), col);
        if (!r || r.horsTable) { alerte(`<strong>⛔ Nitrox ${melange} non utilisable à ${profondeur} m</strong> : la table ne donne pas de profondeur équivalente (profondeur plancher du mélange dépassée).`); return; }
        pTable = r.eq;
        etapes.push(`Nitrox ${melange} à ${profondeur} m (ligne ${r.reelle} m) → profondeur équivalente <strong>${r.eq} m</strong>`);
    }

    if (altitude !== '') {
        const r = profondeurEquivalente(tablesMT2012.altitude, Math.max(profondeur, 5), parseInt(altitude));
        if (!r || r.horsTable) { alerte('<strong>⛔ Hors table altitude</strong> : la profondeur équivalente dépasse 60 m. Plongée impossible avec ces tables.'); return; }
        pTable = r.eq;
        etapes.push(`Altitude ${tablesMT2012.altitude.tranches[altitude]} : ${profondeur} m (ligne ${r.reelle} m) → profondeur équivalente <strong>${r.eq} m</strong>${r.alerte ? ` <em>(${r.alerte})</em>` : ''}`);
    }

    let tTable = temps;
    const successive = intervalle !== '';
    let colonneSansPalier = 0;
    if (successive) {
        const idx = parseInt(intervalle);
        if (pTable > 51) { alerte('<strong>⛔ Plongée successive interdite au-delà de 51 m.</strong>'); return; }
        if (pTable < 12) {
            // Petits fonds : colonnes 6 h et 4 h de la table sans palier
            const bornes = tablesMT2012.successives.bornesMin;
            if (bornes[idx] < 240) { alerte('<strong>Intervalle inférieur à 4 h à moins de 12 m</strong> : non couvert par la table « sans palier ». Consulter le directeur de plongée.'); return; }
            colonneSansPalier = bornes[idx] >= 360 ? 1 : 2;
            etapes.push(`Plongée successive à moins de 12 m : colonne « intervalle ${tablesMT2012.sansPalier.intervalles[colonneSansPalier]} » de la table sans palier`);
        } else {
            const m = majorationSuccessive(tablesMT2012, pTable, idx);
            tTable = temps + m.minutes;
            etapes.push(`Plongée successive, ligne ${m.libelle}, intervalle ${tablesMT2012.successives.intervalles[idx]} : ${temps} + ${m.minutes} min → temps équivalent <strong>${tTable} min</strong>`);
        }
    }

    const listeEtapes = etapes.length ? `<ol class="sal-etapes">${etapes.map(e => `<li>${e}</li>`).join('')}</ol>` : '';
    const noteSuccessive = successive
        ? '<p>Plongée successive : <span class="sal-non">aucune autre plongée</span> (une seule plongée successive autorisée).</p>'
        : '';

    // Moins de 12 m : table « sans palier »
    if (pTable < 12) {
        const sp = sansPalierMT2012(tablesMT2012, pTable, tTable, colonneSansPalier);
        if (sp && sp.ok) {
            derniereDecompression = { temps, partiel: true };
            resultat.innerHTML = `<div class="sal-res sal-res-ok"><strong>✅ Sans palier</strong>${listeEtapes}
                <p>À ${sp.prof} m, le temps sans palier est ${sp.max === 'illimité' ? 'illimité' : sp.max + ' min'} (intervalle ${tablesMT2012.sansPalier.intervalles[colonneSansPalier]} avant la plongée).</p>
                ${successive ? '<p><strong>Palier de sécurité : 3 min à 3 m</strong> (plongée successive sans palier).</p>' : ''}${noteSuccessive}</div>`;
            return;
        }
        if (successive) { alerte(`À ${sp ? sp.prof : pTable} m, le temps sans palier (${sp ? sp.max : '?'} min) est dépassé en plongée successive. Consulter le directeur de plongée.`); return; }
        etapes.push(`Au-delà de ${sp ? sp.max : '?'} min à ${sp ? sp.prof : pTable} m : table <strong>12 m</strong>`);
        pTable = 12;
    }

    const r = ligneMT2012(tablesMT2012, pTable, tTable, methode);
    if (r.hors === 'profondeur') { alerte('<strong>⛔ Profondeur hors table.</strong>'); return; }
    if (r.hors === 'temps') {
        alerte(`<strong>⛔ Temps hors table</strong> : à ${r.prof} m, la table ${methode === 'oxy' ? 'Air/Oxy 6 m' : 'Air Standard'} s'arrête à <strong>${r.max} min</strong>. Consulter le directeur de plongée.`);
        return;
    }

    const l = r.ligne;
    const etapesFinales = etapes.length ? `<ol class="sal-etapes">${etapes.map(e => `<li>${e}</li>`).join('')}</ol>` : '';
    const arrondi = (r.prof !== pTable || l.temps !== tTable)
        ? `<p class="sal-res-info">Ligne utilisée : <strong>${r.prof} m – ${l.temps} min</strong> (profondeur et temps immédiatement supérieurs).</p>`
        : '';
    const liste = methode === 'oxy'
        ? PALIERS_OXY.filter(([k]) => l[k] > 0).map(([k, nom]) => [nom, l[k]])
        : PALIERS_MT2012.filter(([k]) => l[k] > 0).map(([k, p]) => [`${p} m`, l[k]]);
    const securite = successive && !liste.length;

    let suite;
    if (successive) suite = noteSuccessive;
    else suite = `<p>Plongée successive ensuite : ${l.successive ? '<span class="sal-ok">Possible</span>' : '<span class="sal-non">Impossible (pas de nouvelle plongée avant 12 h)</span>'}</p>`;

    const corps = liste.length
        ? `<strong>⚠️ Paliers obligatoires (${methode === 'oxy' ? 'air puis O₂ pur à 6 m' : 'air'})</strong>
            <div class="sal-paliers">${liste.map(([nom, min]) => `<div><span>${nom}</span><b>${min} min</b></div>`).join('')}</div>`
        : (securite ? '<strong>✅ Sans palier obligatoire</strong><p><strong>Palier de sécurité : 3 min à 3 m</strong> (plongée successive).</p>'
                    : '<strong>✅ Remontée sans palier</strong>');

    derniereDecompression = { temps, rem: enMinutes(l.remontee), total: enMinutes(l.total), paliers: liste, sans: !liste.length };
    resultat.innerHTML = `<div class="sal-res ${liste.length ? 'sal-res-paliers' : 'sal-res-ok'}">
            ${corps}
            ${etapesFinales}
            ${arrondi}
            <div class="sal-res-cartes">
                ${carteResultat('Remontée au 1er palier', l.remontee)}
                ${carteResultat('Total décompression', l.total)}
            </div>
            ${l.alerte ? `<p class="sal-res-info">⚠️ Ligne signalée : ${l.alerte}. Vérifier sur la table papier.</p>` : ''}
            ${suite}
        </div>`;
}

// ---------- Vision globale de la plongée : heures déduites du résultat des paliers ----------
// Rien n'est recalculé : durées de remontée et de décompression lues dans la table (ligne utilisée par le calculateur).
// Début de remontée = immersion + temps de plongée ; parachute = début de remontée + 1 min (comprise dans la remontée) ;
// début de la déco = arrivée au 1er palier ; sortie = début de remontée + total de la table.
let derniereDecompression = null;   // { temps, rem, total, paliers: [[nom, min]], sans, partiel }

function enMinutes(mmss) {
    const [m, sec] = String(mmss).split(':');
    return Number(m) + (sec ? Number(sec) / 60 : 0);
}
function hhmmEnMinutes(h) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(h || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
// « au plus tôt » : minute supérieure (jamais une sortie annoncée trop tôt) ; « arrivée » : minute entière écoulée
function heureTexte(min, auPlusTot) {
    const v = auPlusTot ? Math.ceil(min - 1e-9) : Math.floor(min + 1e-9);
    const j = ((v % 1440) + 1440) % 1440;
    return String(Math.floor(j / 60)).padStart(2, '0') + ':' + String(j % 60).padStart(2, '0') + (v >= 1440 ? ' (lendemain)' : '');
}
function dureeTexte(min) {
    let m = Math.floor(min + 1e-9), sec = Math.round((min - m) * 60);
    if (sec === 60) { m += 1; sec = 0; }
    return m + ' min' + (sec ? ' ' + String(sec).padStart(2, '0') + ' s' : '');
}
function salImmersionMaintenant() {
    const champ = document.getElementById('sal-immersion');
    if (!champ) return;
    const d = new Date();
    champ.value = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    majVisionGlobale();
}

function majVisionGlobale() {
    const zone = document.getElementById('sal-vision-resultat');
    const aide = document.getElementById('sal-vision-aide');
    const dock = document.getElementById('sal-dock');
    if (!zone || !aide) return;
    const d = derniereDecompression;
    const h0 = hhmmEnMinutes(valeur('sal-immersion'));
    zone.innerHTML = '';
    if (dock) dock.textContent = '';
    if (!d) { aide.textContent = 'Calculez d\'abord les paliers : profondeur et temps de plongée.'; return; }
    if (dock && !d.partiel) dock.textContent = d.sans ? 'Sans palier' : dureeTexte(d.total);
    if (h0 === null) { aide.textContent = 'Saisissez l\'heure d\'immersion : tous les horaires de la plongée s\'affichent ici.'; return; }
    aide.textContent = '';

    const depart = h0 + d.temps;
    const parachute = depart + 1;
    const tuile = (titre, v, cls) => `<div class="sal-vision-tuile${cls ? ' ' + cls : ''}"><span>${titre}</span><b>${v}</b></div>`;
    const etape = (h, titre, detail, cls) => `<li${cls ? ` class="${cls}"` : ''}><span class="sal-h">${h}</span><span class="sal-pt"></span><span class="sal-t"><b>${titre}</b><small>${detail}</small></span></li>`;
    let tuiles = tuile('Début de la remontée', heureTexte(depart)) + tuile('Parachute (début + 1 min)', heureTexte(parachute));
    let etapes = etape(heureTexte(h0), 'Immersion', 'Départ de la surface')
        + etape(heureTexte(depart), 'Début de la remontée', `${d.temps} min après l'immersion`)
        + etape(heureTexte(parachute), 'Envoi du parachute', 'En général 1 min après la fin de la plongée, comprise dans la remontée');

    if (d.partiel) {
        zone.innerHTML = `<div class="sal-vision-tuiles">${tuiles}</div><ul class="sal-chrono">${etapes}</ul>
            <p class="sal-res-info">Plongée sans palier à moins de 12 m : la table « sans palier » ne donne pas de durée de remontée (9 à 15 m/min). Prévoir le palier de sécurité de 3 min à 3 m.</p>`;
        return;
    }
    const sortie = depart + d.total;
    if (d.sans) {
        tuiles += tuile('Début de la déco', 'Sans palier') + tuile('Sortie de la palanquée (au plus tôt)', heureTexte(sortie, true), 'sal-vision-sortie');
        etapes += etape(heureTexte(depart + d.rem), 'Arrivée en surface, sans palier', `Remontée ${dureeTexte(d.rem)} (table)`);
    } else {
        tuiles += tuile('Début de la déco · 1er palier ' + d.paliers[0][0], heureTexte(depart + d.rem)) + tuile('Sortie de la palanquée (au plus tôt)', heureTexte(sortie, true), 'sal-vision-sortie');
        let t = depart + d.rem;
        etapes += etape(heureTexte(t), `Début de la déco : 1er palier à ${d.paliers[0][0]}`, `Remontée ${dureeTexte(d.rem)} (table)`);
        d.paliers.forEach(([nom, min], i) => {
            etapes += etape(heureTexte(t), `Palier à ${nom}`, `${min} min${i === d.paliers.length - 1 ? ' (la dernière minute sert à rejoindre la surface)' : ''}`);
            t += min;
        });
    }
    etapes += etape(heureTexte(sortie, true), 'Sortie de l\'eau (au plus tôt)', `Décompression totale : ${d.sans ? dureeTexte(d.total) + ', sans palier' : dureeTexte(d.total)}`, 'sal-fin');
    if (dock) dock.textContent = (d.sans ? 'Sans palier' : dureeTexte(d.total)) + ' · sortie ' + heureTexte(sortie, true);
    zone.innerHTML = `<div class="sal-vision-tuiles">${tuiles}</div><ul class="sal-chrono">${etapes}</ul>
        ${d.sans ? '<p class="sal-res-info">Sans palier obligatoire : la fiche Tables conseille quand même un palier de sécurité de 3 min à 3 m.</p>' : ''}
        <p class="sal-res-info">Estimation d\'après les tables MT 2012. Le directeur de plongée et l\'ordinateur de plongée font foi.</p>`;
}

// Tableaux de référence complets, construits depuis les données (une seule source)
async function afficherTablesMT2012() {
    const zone = document.getElementById('table-mt2012');
    if (!zone || zone.dataset.fait) return;
    await loadTablesMT2012();
    const tri = jeu => Object.keys(jeu).map(Number).sort((a, b) => a - b);

    const teteAir = '<tr><th>Temps</th><th>Remontée</th><th>18 m</th><th>15 m</th><th>12 m</th><th>9 m</th><th>6 m</th><th>3 m</th><th>Total</th><th>Succ.</th></tr>';
    zone.innerHTML = tri(tablesMT2012.air).map(p => {
        const lignes = tablesMT2012.air[p].map(l => `<tr><td>${l.temps}</td><td>${l.remontee}</td>${
            PALIERS_MT2012.map(([k]) => `<td>${l[k] || '-'}</td>`).join('')}<td>${l.total}</td><td>${l.successive ? 'Oui' : 'Non'}</td></tr>`).join('');
        return `<details class="jsp-cours"><summary>Air Standard – ${p} m</summary><div style="overflow-x:auto"><table class="rd-table"><thead>${teteAir}</thead><tbody>${lignes}</tbody></table></div></details>`;
    }).join('');

    const zoneOxy = document.getElementById('table-mt2012-oxy');
    if (zoneOxy) {
        const teteOxy = '<tr><th>Temps</th><th>Remontée</th><th>21 m</th><th>18 m</th><th>15 m</th><th>12 m</th><th>9 m</th><th>6 m O₂</th><th>Total</th><th>Succ.</th></tr>';
        zoneOxy.innerHTML = tri(tablesMT2012.oxy).map(p => {
            const lignes = tablesMT2012.oxy[p].map(l => `<tr${l.alerte ? ' class="sal-douteux"' : ''}><td>${l.temps}${l.alerte ? ' ⚠️' : ''}</td><td>${l.remontee}</td>${
                PALIERS_OXY.map(([k]) => `<td>${l[k] || '-'}</td>`).join('')}<td>${l.total}</td><td>${l.successive ? 'Oui' : 'Non'}</td></tr>${
                l.alerte ? `<tr class="sal-douteux"><td colspan="10">⚠️ ${l.alerte}</td></tr>` : ''}`).join('');
            return `<details class="jsp-cours"><summary>Air/Oxy 6 m – ${p} m</summary><div style="overflow-x:auto"><table class="rd-table"><thead>${teteOxy}</thead><tbody>${lignes}</tbody></table></div></details>`;
        }).join('');
    }
    zone.dataset.fait = '1';
}

// Tables annexes (successives, Nitrox, altitude) pour l'écran « Tables MT 2012 »
async function afficherTablesAnnexes() {
    const succ = document.getElementById('table-successives');
    if (!succ || succ.dataset.fait) return;
    await loadTablesMT2012();
    const t = tablesMT2012;
    const tableau = (tete, lignes) => `<div style="overflow-x:auto"><table class="rd-table"><thead><tr>${tete.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${lignes}</tbody></table></div>`;

    succ.innerHTML = tableau(['Prof.', ...t.successives.intervalles],
        t.successives.lignes.map(l => `<tr><td>${l.libelle}</td>${l.valeurs.map(v => `<td>${v}</td>`).join('')}</tr>`).join(''));

    const nitrox = document.getElementById('table-nitrox');
    if (nitrox) nitrox.innerHTML = tableau(['Prof. réelle', ...t.nitrox.melanges],
        t.nitrox.lignes.map(l => `<tr><td>${l.reelle} m</td>${t.nitrox.melanges.map((_, i) => `<td>${l.valeurs[i] !== undefined ? l.valeurs[i] + ' m' : '–'}</td>`).join('')}</tr>`).join(''));

    const alt = document.getElementById('table-altitude');
    if (alt) alt.innerHTML = tableau(['Prof. réelle', ...t.altitude.tranches],
        t.altitude.lignes.map(l => `<tr><td>${l.reelle} m${l.alerte ? ' ⚠️' : ''}</td>${t.altitude.tranches.map((_, i) => `<td>${l.valeurs[i] !== undefined ? l.valeurs[i] + ' m' : '–'}</td>`).join('')}</tr>`).join(''));

    succ.dataset.fait = '1';
}

// Exposer globalement
window.calculerPaliers = calculerPaliers;
window.afficherTablesMT2012 = afficherTablesMT2012;
window.afficherTablesAnnexes = afficherTablesAnnexes;
