/**
 * Vulcain - Module SAL (Sauvetage Aquatique et Plongée)
 * Tables MT 2012 (Air Standard) et calcul des paliers
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

// Règle des tables : profondeur et temps exacts immédiatement supérieurs
function ligneMT2012(tables, profondeur, temps) {
    const profs = Object.keys(tables.air).map(Number).sort((a, b) => a - b);
    const prof = profs.find(p => p >= profondeur);
    if (prof === undefined) return { hors: 'profondeur' };
    const lignes = tables.air[prof];
    const ligne = lignes.find(l => l.temps >= temps);
    if (!ligne) return { hors: 'temps', prof, max: lignes[lignes.length - 1].temps };
    return { prof, ligne };
}

// Moins de 12 m : tableau « temps au fond maximum sans palier » (intervalle 12 h)
function sansPalierMT2012(tables, profondeur, temps) {
    const l = tables.sansPalier.lignes.find(x => parseFloat(x.profondeur) >= profondeur);
    if (!l) return null;
    const max = l.valeurs[0];
    return { prof: l.profondeur, max, ok: max === 'illimité' || temps <= max };
}

function carteResultat(titre, valeur) {
    return `<div class="sal-res-carte"><span>${titre}</span><b>${valeur}</b></div>`;
}

async function calculerPaliers() {
    await loadTablesMT2012();

    const profondeur = parseFloat(String(document.getElementById('calc-profondeur').value).replace(',', '.'));
    const temps = parseInt(document.getElementById('calc-temps').value);
    const resultat = document.getElementById('calc-resultat');

    if (!profondeur || !temps || profondeur <= 0 || temps <= 0) {
        resultat.innerHTML = '<p class="sal-res-info">Saisissez la profondeur et le temps au fond.</p>';
        return;
    }

    if (profondeur > 60) {
        resultat.innerHTML = '<div class="rd-alerte"><strong>⛔ Plus de 60 m : hors tables à l\'air.</strong> Profondeur maximale des plongées à l\'air : 60 m (50 à 60 m sous mesures de sécurité particulières).</div>';
        return;
    }

    // Moins de 12 m : les tables Air Standard commencent à 12 m
    if (profondeur < 12) {
        const sp = sansPalierMT2012(tablesMT2012, profondeur, temps);
        if (sp && sp.ok) {
            resultat.innerHTML = `<div class="sal-res sal-res-ok"><strong>✅ Sans palier</strong>
                <p>À ${sp.prof} m, le temps sans palier est ${sp.max === 'illimité' ? 'illimité' : sp.max + ' min'} (intervalle de 12 h avant la plongée).</p></div>`;
        } else {
            resultat.innerHTML = `<div class="rd-alerte">Au-delà de ${sp ? sp.max : '?'} min à ${sp ? sp.prof : profondeur} m, utiliser la table <strong>Air Standard 12 m</strong> : saisissez 12 m.</div>`;
        }
        return;
    }

    const r = ligneMT2012(tablesMT2012, profondeur, temps);
    if (r.hors === 'temps') {
        resultat.innerHTML = `<div class="rd-alerte"><strong>⛔ Temps hors table</strong> : à ${r.prof} m, la table s'arrête à <strong>${r.max} min</strong>. Consulter le directeur de plongée.</div>`;
        return;
    }

    const l = r.ligne;
    const arrondi = (r.prof !== profondeur || l.temps !== temps)
        ? `<p class="sal-res-info">Ligne utilisée : <strong>${r.prof} m – ${l.temps} min</strong> (profondeur et temps immédiatement supérieurs de la table).</p>`
        : '';
    const paliers = PALIERS_MT2012.filter(([k]) => l[k] > 0);
    const successive = l.successive
        ? '<span class="sal-ok">Possible</span>'
        : '<span class="sal-non">Non (pas de nouvelle plongée avant 12 h)</span>';

    const corps = paliers.length
        ? `<strong>⚠️ Paliers obligatoires (air)</strong>
            <div class="sal-paliers">${paliers.map(([k, p]) => `<div><span>${p} m</span><b>${l[k]} min</b></div>`).join('')}</div>`
        : '<strong>✅ Remontée sans palier</strong>';

    resultat.innerHTML = `<div class="sal-res ${paliers.length ? 'sal-res-paliers' : 'sal-res-ok'}">
            ${corps}
            ${arrondi}
            <div class="sal-res-cartes">
                ${carteResultat('Remontée au 1er palier', l.remontee)}
                ${carteResultat('Total décompression', l.total)}
            </div>
            <p>Plongée successive : ${successive}</p>
        </div>`;
}

// Tableau de référence complet, construit depuis les données (une seule source)
async function afficherTablesMT2012() {
    const zone = document.getElementById('table-mt2012');
    if (!zone || zone.dataset.fait) return;
    await loadTablesMT2012();
    const tete = '<tr><th>Temps</th><th>Remontée</th><th>18 m</th><th>15 m</th><th>12 m</th><th>9 m</th><th>6 m</th><th>3 m</th><th>Total</th><th>Succ.</th></tr>';
    zone.innerHTML = Object.keys(tablesMT2012.air).map(Number).sort((a, b) => a - b).map(p => {
        const lignes = tablesMT2012.air[p].map(l => `<tr><td>${l.temps}</td><td>${l.remontee}</td>${
            PALIERS_MT2012.map(([k]) => `<td>${l[k] || '-'}</td>`).join('')}<td>${l.total}</td><td>${l.successive ? 'Oui' : 'Non'}</td></tr>`).join('');
        return `<details class="jsp-cours"><summary>Profondeur ${p} m</summary><div style="overflow-x:auto"><table class="rd-table"><thead>${tete}</thead><tbody>${lignes}</tbody></table></div></details>`;
    }).join('');
    zone.dataset.fait = '1';
}

// Exposer globalement
window.calculerPaliers = calculerPaliers;
window.afficherTablesMT2012 = afficherTablesMT2012;
