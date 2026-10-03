/**
 * Vulcain - Calcul rapide de perte de charge pour un établissement
 * Référence : tableau « Hydraulique – Pertes de charge » (RDMI), perte pour 20 m de tuyau.
 * Ø45, Ø70, Ø110 : perte = perte de référence × (débit / débit de référence)² × (longueur / 20).
 * Ø25 (LDV) : valeurs du tableau uniquement, la loi du carré ne s'y applique pas.
 */
const PDC_REFERENCES = {
    25: { points: { 58: 1.7, 150: 2.2 }, debits: [58, 150] },
    45: { perte: 1.2, debitRef: 500, debits: [250, 500] },
    70: { perte: 0.44, debitRef: 1000, debits: [500, 1000, 2000] },
    110: { perte: 0.24, debitRef: 2000, debits: [1000, 2000] }
};
let pdcDiametreChoisi = 45;

function pdcPertePour20m(diametre, debit) {
    const ref = PDC_REFERENCES[diametre];
    if (!ref) return null;
    if (ref.points) return ref.points[debit] ?? null;
    return ref.perte * Math.pow(debit / ref.debitRef, 2);
}

function pdcDiametre(diametre) {
    pdcDiametreChoisi = diametre;
    const ref = PDC_REFERENCES[diametre];
    const debit = document.getElementById('pdcDebit');
    if (!ref.debits.includes(Number(debit.value))) debit.value = ref.debits[ref.debits.length > 2 ? 1 : ref.debits.length - 1];
    debit.readOnly = Boolean(ref.points);
    document.getElementById('pdcDebitsTypes').innerHTML = ref.debits
        .map(d => `<button type="button" data-pdc-debit="${d}" onclick="pdcChoisirDebit(${d})">${d} L/min</button>`).join('');
    pdcCalculer();
}

function pdcChoisirDebit(debit) {
    document.getElementById('pdcDebit').value = debit;
    pdcCalculer();
}

function pdcCalculer() {
    const sortie = document.getElementById('pdcPompe');
    if (!sortie) return;
    const lire = id => parseFloat(document.getElementById(id).value) || 0;
    const debit = lire('pdcDebit'), tuyaux = lire('pdcTuyaux'), denivele = lire('pdcDenivele');
    const pression = lire('pdcPression'), jonctions = lire('pdcJonctions');
    const ref = PDC_REFERENCES[pdcDiametreChoisi];
    const alerte = document.getElementById('pdcAlerte');

    document.querySelectorAll('[data-pdc-diam]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pdcDiam) === pdcDiametreChoisi)));
    document.querySelectorAll('[data-pdc-debit]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pdcDebit) === debit)));

    const perte20 = pdcPertePour20m(pdcDiametreChoisi, debit);
    if (perte20 === null || debit <= 0) {
        sortie.textContent = '–';
        document.getElementById('pdcDetail').textContent = 'Indiquez un débit.';
        alerte.style.display = 'none';
        return;
    }
    const perteTuyaux = perte20 * tuyaux;
    const perteDenivele = denivele / 10;
    const total = pression + perteTuyaux + perteDenivele + jonctions;
    sortie.textContent = `${total.toFixed(1)} bar`;
    document.getElementById('pdcDetail').textContent =
        `Lance ${pression} + tuyaux ${perteTuyaux.toFixed(2)} (${tuyaux} × ${perte20.toFixed(2)}) ` +
        `${perteDenivele >= 0 ? '+' : '−'} dénivelé ${Math.abs(perteDenivele).toFixed(1)} + jonctions ${jonctions} bar`;

    const messages = [];
    const max = ref.debits[ref.debits.length - 1];
    if (!ref.points && debit > max) messages.push(`Débit supérieur aux valeurs du tableau pour ce diamètre (${max} L/min) : résultat extrapolé.`);
    alerte.textContent = messages.join(' ');
    alerte.style.display = messages.length ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('pdcRapide')) pdcDiametre(45); });
