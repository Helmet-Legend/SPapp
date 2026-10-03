/**
 * Vulcain - Taux d'application additif / émulseur
 * Calcul direct : surface + taux d'application + concentration + durée → besoins.
 * Calcul inverse : stock d'émulseur + taux + concentration + durée → surface réalisable.
 */
const EMU_TAUX = [
    { valeur: 10, libelle: 'Hydrocarbure' },
    { valeur: 20, libelle: 'Liquide polaire' }
];
const EMU_CONCENTRATIONS = [1, 3, 6];
let emuTaux = 10, emuConcentration = 3;
let emuTauxInv = 10, emuConcentrationInv = 3;

function emuToggleCustom(divId) {
    const div = document.getElementById(divId);
    div.style.display = div.style.display === 'block' ? 'none' : 'block';
    if (div.style.display === 'block') div.querySelector('input').focus();
}

function emuMode(mode) {
    document.getElementById('emulseurDirect').style.display = mode === 'direct' ? 'block' : 'none';
    document.getElementById('emulseurInverse').style.display = mode === 'inverse' ? 'block' : 'none';
    document.querySelectorAll('[data-emu-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.emuMode === mode)));
    if (mode === 'direct') emuCalculer(); else emuCalculerInverse();
}

function emuChoisirTaux(valeur, custom) {
    emuTaux = valeur;
    document.querySelectorAll('[data-emu-taux]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.emuTaux) === valeur && !custom)));
    document.getElementById('emuTauxCustom').setAttribute('aria-pressed', String(Boolean(custom)));
    emuCalculer();
}

function emuChoisirConcentration(valeur, custom) {
    emuConcentration = valeur;
    document.querySelectorAll('[data-emu-conc]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.emuConc) === valeur && !custom)));
    document.getElementById('emuConcCustom').setAttribute('aria-pressed', String(Boolean(custom)));
    emuCalculer();
}

function emuChoisirTauxInv(valeur, custom) {
    emuTauxInv = valeur;
    document.querySelectorAll('[data-emu-taux-inv]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.emuTauxInv) === valeur && !custom)));
    document.getElementById('emuTauxInvCustom').setAttribute('aria-pressed', String(Boolean(custom)));
    emuCalculerInverse();
}

function emuChoisirConcentrationInv(valeur, custom) {
    emuConcentrationInv = valeur;
    document.querySelectorAll('[data-emu-conc-inv]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.emuConcInv) === valeur && !custom)));
    document.getElementById('emuConcInvCustom').setAttribute('aria-pressed', String(Boolean(custom)));
    emuCalculerInverse();
}

function emuAjusterDuree(id, delta) {
    const champ = document.getElementById(id);
    champ.value = Math.max(5, Math.min(60, (parseInt(champ.value) || 0) + delta));
    id === 'emuDuree' ? emuCalculer() : emuCalculerInverse();
}

function emuAjusterStock(delta) {
    const champ = document.getElementById('emuStock');
    champ.value = Math.max(0, (parseInt(champ.value) || 0) + delta);
    emuCalculerInverse();
}

function emuCalculer() {
    const surface = parseFloat(document.getElementById('emuSurface').value) || 0;
    const duree = parseInt(document.getElementById('emuDuree').value) || 0;

    const debitSolution = surface * emuTaux;
    const volumeSolution = debitSolution * duree;
    const volumeEmulseur = volumeSolution * (emuConcentration / 100);
    const volumeEau = volumeSolution - volumeEmulseur;
    const bidons20L = Math.ceil(volumeEmulseur / 20);

    document.getElementById('emuResultatPrincipal').innerHTML =
        `<div class="label">Émulseur nécessaire à ${emuConcentration} %</div>` +
        `<div class="value">${volumeEmulseur.toFixed(0)} L</div>` +
        `<div class="label">${bidons20L} bidon${bidons20L > 1 ? 's' : ''} de 20 L</div>`;

    document.getElementById('emuDetails').innerHTML = `<div class="rd-resultats">` +
        emuTuile('debit', 'c-bleu', 'Débit requis', debitSolution.toFixed(0), 'L/min') +
        emuTuile('emulseur', 'c-rouge', 'Volume émulseur', volumeEmulseur.toFixed(0), `L (concentration ${emuConcentration} %)`) +
        emuTuile('eau', 'c-orange', "Volume d'eau", volumeEau.toFixed(0), 'L') +
        emuTuile('mousse', 'c-violet', 'Volume de solution', volumeSolution.toFixed(0), 'L') +
        `</div>`;
}

function emuTuile(icone, couleur, label, valeur, unite) {
    return `<div class="rd-tile ${couleur}">` +
        `<img class="rd-tile-icone" src="images/emulseur/icon-${icone}.png" alt="" loading="lazy">` +
        `<div class="rd-tile-label">${label}</div>` +
        `<div class="rd-tile-valeur">${valeur} </div>` +
        `<div class="rd-tile-unite">${unite}</div>` +
        `</div>`;
}

function emuCalculerInverse() {
    const stock = parseFloat(document.getElementById('emuStock').value) || 0;
    const duree = parseInt(document.getElementById('emuDureeInv').value) || 0;

    const volumeSolution = emuConcentrationInv ? stock / (emuConcentrationInv / 100) : 0;
    const debitSolution = duree ? volumeSolution / duree : 0;
    const surface = emuTauxInv ? debitSolution / emuTauxInv : 0;
    const volumeEau = volumeSolution - stock;

    document.getElementById('emuInverseResultatPrincipal').innerHTML =
        `<div class="label">Surface réalisable</div>` +
        `<div class="value">${surface.toFixed(1)} m²</div>`;

    document.getElementById('emuInverseDetails').innerHTML = `<div class="rd-resultats">` +
        emuTuile('debit', 'c-bleu', 'Débit de solution', debitSolution.toFixed(0), 'L/min') +
        emuTuile('eau', 'c-orange', "Eau nécessaire", volumeEau.toFixed(0), 'L') +
        emuTuile('mousse', 'c-violet', 'Volume de solution', volumeSolution.toFixed(0), 'L') +
        `</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('emulseur')) { emuCalculer(); emuCalculerInverse(); }
});
