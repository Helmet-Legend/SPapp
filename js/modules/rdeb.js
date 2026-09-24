/**
 * Vulcain - RDEB (SDIS 34) : autonomie d'engagement et heure de sortie prévisible
 * Autonomie = (pression − 50 bars de réserve) × volume ÷ débit ; en survie, pression totale.
 * Arrondi à la minute, 1 min minimum (méthode des abaques du RDEB).
 */
function autonomieRDEB(pression, volume, debit) {
    const pressionUtile = debit <= 10 ? pression : pression - 50;
    if (pressionUtile <= 0) return 0;
    return Math.max(1, Math.round(pressionUtile * volume / debit));
}

function formaterDureeRDEB(minutes) {
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

function majAutonomieRDEB() {
    const valeur = document.getElementById('rdebAutonomieValeur');
    if (!valeur) return;
    const pression = parseFloat(document.getElementById('pressionARI').value) || 0;
    const volume = parseFloat(document.getElementById('volumeARI').value) || 0;
    const debit = parseFloat(document.getElementById('consoARI').value) || 0;
    const sortie = document.getElementById('rdebSortie');
    document.querySelectorAll('[data-rdeb-debit]').forEach(b => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.rdebDebit) === debit));
    });
    if (!debit || !volume) { valeur.textContent = '–'; sortie.textContent = ''; return; }
    const minutes = autonomieRDEB(pression, volume, debit);
    valeur.textContent = minutes ? `≈ ${formaterDureeRDEB(minutes)}` : 'Pression insuffisante';
    const entree = document.getElementById('heureEntreeARI').value;
    if (entree && minutes) {
        const [h, m] = entree.split(':').map(Number);
        const total = (h * 60 + m + minutes) % 1440;
        sortie.textContent = `Heure de sortie prévisible : ${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    } else {
        sortie.textContent = 'Indiquez l\'heure d\'entrée pour l\'heure de sortie prévisible.';
    }
}

function choisirTechniqueRDEB(debit) {
    const conso = document.getElementById('consoARI');
    if (conso) conso.value = debit;
    calculerAutonomieARI();
}

function heureEntreeMaintenant() {
    const d = new Date();
    document.getElementById('heureEntreeARI').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    calculerAutonomieARI();
}

// Le calcul RDEB s'ajoute au calcul existant de la fiche ARI
(function () {
    const calculInitial = window.calculerAutonomieARI;
    if (typeof calculInitial !== 'function') return;
    window.calculerAutonomieARI = function () {
        calculInitial.apply(this, arguments);
        majAutonomieRDEB();
    };
})();
