/**
 * DECIOPS - Calculateur facteur de chute (LSPCC)
 */
// Fonction calculateur facteur de chute LSPCC
function calculerFacteurChute() {
    const hauteur = parseFloat(document.getElementById('lspcc-hauteur').value);
    const corde = parseFloat(document.getElementById('lspcc-corde').value);
    const resultat = document.getElementById('lspcc-resultat');

    if (!hauteur || !corde || corde <= 0) {
        resultat.innerHTML = '<p style="color: #9E9E9E; font-style: italic;">Entrez les valeurs pour calculer le facteur de chute</p>';
        return;
    }

    const facteur = hauteur / corde;
    let status, color, bgColor, icon, message;

    if (facteur <= 0.3) {
        status = 'FACTEUR OPTIMAL';
        color = '#2E7D32';
        bgColor = '#C8E6C9';
        icon = '✅';
        message = 'Progression sécurisée';
    } else if (facteur <= 1) {
        status = 'FACTEUR À ÉVITER';
        color = '#E65100';
        bgColor = '#FFE0B2';
        icon = '⚠️';
        message = 'Risque modéré';
    } else {
        status = 'FACTEUR INTERDIT';
        color = '#C62828';
        bgColor = '#FFCDD2';
        icon = '⛔';
        message = 'DANGER ! Repositionner l\'amarrage';
    }

    resultat.innerHTML = `
        <div style="background: ${bgColor}; padding: 25px; border-radius: 12px;">
            <div style="font-size: 3em;">${icon}</div>
            <div style="font-size: 2.5em; font-weight: 700; color: ${color};">${facteur.toFixed(2)}</div>
            <div style="font-size: 1.3em; font-weight: 700; color: ${color};">${status}</div>
            <div style="margin-top: 10px;">${message}</div>
        </div>
    `;
}
