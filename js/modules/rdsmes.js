/**
 * Vulcain - RDSMES (SDIS 34) : outils des fiches sauvetages / sauvegarde opérationnelle
 *  - autonomie en « économie d'air » (10 l/min)
 *  - moyen utilisable comme itinéraire de secours selon l'étage
 *  - construction du message de détresse (Je suis / Je vois / Je fais / Je demande)
 */

// Autonomie en économie d'air : volume (l) × pression (bar) / consommation (l/min)
function calculerAirSurvie() {
    const volume = parseFloat(document.getElementById('rdAirVolume').value);
    const pression = parseFloat(document.getElementById('rdAirPression').value);
    const avertisseur = document.getElementById('rdAirAvertisseur').checked;
    const sortie = document.getElementById('rdAirResultat');
    if (!(volume > 0) || !(pression > 0)) {
        sortie.textContent = 'Indiquez la pression restante.';
        return;
    }
    const conso = 10 + (avertisseur ? 5 : 0);
    const minutes = Math.floor(volume * pression / conso);
    const h = Math.floor(minutes / 60), m = minutes % 60;
    const duree = h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
    sortie.innerHTML = `<strong style="font-size:1.4em">≈ ${duree}</strong><br>` +
        `<small>${volume} l × ${pression} bar ÷ ${conso} l/min${avertisseur ? ' (avertisseur en marche : +5 l/min)' : ''}</small>`;
}

// Itinéraires de secours réalisables selon l'étage (RDSMES § 4.2)
const RD_MOYENS_SECOURS = [
    { etageMax: 2, moyen: 'Échelle à coulisse 2 plans' },
    { etageMax: 4, moyen: 'Échelle à coulisse 3 plans' },
    { etageMax: 6, moyen: 'Élévateur aérien de 18 m (MEA 18)' },
    { etageMax: 8, moyen: 'Élévateur aérien de 24 m (MEA 24)' },
    { etageMax: 10, moyen: 'Élévateur aérien de 30 m (MEA 30)' },
];

function calculerItineraireSecours() {
    const etage = parseInt(document.getElementById('rdEtage').value, 10);
    const sortie = document.getElementById('rdEtageResultat');
    if (isNaN(etage) || etage < 0) {
        sortie.textContent = 'Indiquez l\'étage (0 = rez-de-chaussée).';
        return;
    }
    const possibles = RD_MOYENS_SECOURS.filter(x => etage <= x.etageMax);
    if (!possibles.length) {
        sortie.innerHTML = '<strong>Au-delà du 10<sup>e</sup> étage : pas d\'itinéraire de secours par l\'extérieur.</strong><br>' +
            'Privilégier l\'itinéraire de repli ; à défaut, rechercher une zone de mise à l\'abri des effets du sinistre.';
        return;
    }
    sortie.innerHTML = `<strong>Étage ${etage} — moyens utilisables :</strong><ul style="margin:6px 0 0 18px">` +
        possibles.map(x => `<li>${x.moyen} <small>(jusqu'au ${x.etageMax}<sup>e</sup>)</small></li>`).join('') + '</ul>';
}

// Message de détresse (NELAR) à lire à la radio
function construireMessageDetresse() {
    const val = id => document.getElementById(id).value.trim();
    const suis = val('rdSuis') || '…';
    const vois = val('rdVois') || '…';
    const pression = val('rdPression');
    const fais = val('rdFais') || '…';
    const demande = val('rdDemande') || '…';
    const texte = 'URGENT, URGENT, URGENT.\n' +
        `Je suis : ${suis}.\n` +
        `Je vois : ${vois}${pression ? `, pression ${pression} bars` : ''}.\n` +
        `Je fais : ${fais}.\n` +
        `Je demande : ${demande}.`;
    document.getElementById('rdMessage').textContent = texte;
}

function copierMessageDetresse() {
    const texte = document.getElementById('rdMessage').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(texte).catch(() => {});
}
