/**
 * Vulcain - Calculateur interactif Wallace (surface cutanée brûlée)
 * Pourcentages : RT SUAP 2025 (voir fiche suap-brulures). Seuils de gravité
 * (SB > 20 % adulte / > 10 % enfant) repris de la même fiche.
 */
var WALLACE_ZONES = [
    { id: 'tete', nom: 'Tête', adulte: 9, enfant: 17 },
    { id: 'tronc_av', nom: 'Tronc avant', adulte: 18, enfant: 18 },
    { id: 'tronc_ar', nom: 'Tronc arrière', adulte: 18, enfant: 18 },
    { id: 'bras_d', nom: 'Bras droit', adulte: 9, enfant: 9 },
    { id: 'bras_g', nom: 'Bras gauche', adulte: 9, enfant: 9 },
    { id: 'jambe_d', nom: 'Jambe droite', adulte: 18, enfant: 14 },
    { id: 'jambe_g', nom: 'Jambe gauche', adulte: 18, enfant: 14 },
    { id: 'perinee', nom: 'Périnée', adulte: 1, enfant: 0 }
];

var wallaceMode = 'adulte';
var wallaceZonesActives = {};
var wallaceMains = 0;

function wallaceRemplirGrille() {
    var grille = document.getElementById('wallaceZonesGrid');
    if (!grille) return;
    var html = '';
    WALLACE_ZONES.forEach(function (z) {
        if (wallaceMode === 'enfant' && z.id === 'perinee') return; // pas de valeur enfant distincte
        var pct = wallaceMode === 'adulte' ? z.adulte : z.enfant;
        var actif = wallaceZonesActives[z.id];
        html += '<button type="button" class="wallace-zone' + (actif ? ' wallace-zone-active' : '') + '" data-zone="' + z.id + '" onclick="wallaceBasculerZone(\'' + z.id + '\')">' +
            '<span class="wallace-zone-nom">' + z.nom + '</span><span class="wallace-zone-pct">' + pct + ' %</span></button>';
    });
    grille.innerHTML = html;
}

function wallaceBasculerZone(id) {
    wallaceZonesActives[id] = !wallaceZonesActives[id];
    wallaceRemplirGrille();
    wallaceCalculer();
}

function wallaceChangerMode(mode) {
    wallaceMode = mode;
    document.getElementById('wallaceModeAdulte').setAttribute('aria-checked', mode === 'adulte' ? 'true' : 'false');
    document.getElementById('wallaceModeEnfant').setAttribute('aria-checked', mode === 'enfant' ? 'true' : 'false');
    if (mode === 'enfant') delete wallaceZonesActives.perinee;
    wallaceRemplirGrille();
    wallaceCalculer();
}

function wallaceAjusterMains(delta) {
    wallaceMains = Math.max(0, Math.min(20, wallaceMains + delta));
    document.getElementById('wallaceMainsCompte').textContent = wallaceMains;
    wallaceCalculer();
}

function wallaceReinitialiser() {
    wallaceZonesActives = {};
    wallaceMains = 0;
    document.getElementById('wallaceMainsCompte').textContent = '0';
    wallaceRemplirGrille();
    wallaceCalculer();
}

function wallaceCalculer() {
    var total = wallaceMains;
    WALLACE_ZONES.forEach(function (z) {
        if (!wallaceZonesActives[z.id]) return;
        total += wallaceMode === 'adulte' ? z.adulte : z.enfant;
    });
    total = Math.min(100, total);

    var totalEl = document.getElementById('wallaceTotalPct');
    var interpEl = document.getElementById('wallaceInterpretation');
    var boiteEl = document.getElementById('wallaceResultat');
    if (!totalEl || !interpEl || !boiteEl) return;

    totalEl.textContent = total + ' %';

    var seuil = wallaceMode === 'adulte' ? 20 : 10;
    var grave = total > seuil;
    boiteEl.style.borderColor = total === 0 ? 'var(--t-line)' : (grave ? '#F44336' : '#4CAF50');
    if (total === 0) {
        interpEl.textContent = 'Sélectionnez les zones brûlées ci-dessus.';
    } else if (grave) {
        interpEl.textContent = '⚠️ SB > ' + seuil + ' % (' + wallaceMode + ') : ne pas refroidir davantage, risque de détresse circulatoire — alerter la coordination médicale sans délai.';
    } else {
        interpEl.textContent = 'Peut être refroidie 10 à 20 min à l\'eau tempérée si brûlure < 30 min.';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('wallaceZonesGrid')) { wallaceRemplirGrille(); wallaceCalculer(); }
});
