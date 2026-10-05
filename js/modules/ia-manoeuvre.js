/**
 * Vulcain - Générateur de manœuvre IA
 *
 * Le navigateur n'envoie que les paramètres du formulaire : le prompt est
 * construit côté serveur (api/gemini.js), ce qui empêche d'utiliser
 * l'endpoint comme un accès libre à l'IA.
 */

// Texte brut (markdown) du dernier scénario généré avec succès : réutilisé pour le PDF
let dernierScenarioBrut = '';

// Collecter les valeurs cochées
function getCheckedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// Véhicules : un clic ajoute une unité (ex. 4 clics sur CCF = « 4x CCF »), boucle après 9
const IA_VEHICULE_MAX = 9;
function iaVehiculeClic(bouton) {
    const compte = (parseInt(bouton.dataset.count, 10) || 0) + 1;
    bouton.dataset.count = compte > IA_VEHICULE_MAX ? 0 : compte;
    bouton.querySelector('.ia-veh-badge').textContent = bouton.dataset.count;
}

function getVehiculeValues() {
    return Array.from(document.querySelectorAll('.ia-veh-btn'))
        .map(bouton => {
            const compte = parseInt(bouton.dataset.count, 10) || 0;
            if (compte === 0) return null;
            return compte > 1 ? `${compte}x ${bouton.dataset.vehicule}` : bouton.dataset.vehicule;
        })
        .filter(Boolean);
}

// Remet le formulaire à son état initial (les grades par défaut restent cochés)
function iaReinitialiser() {
    document.querySelectorAll('#ia-manoeuvre input[type="checkbox"]').forEach(cb => {
        cb.checked = cb.id === 'grade-equipiers';
    });
    document.querySelectorAll('#ia-manoeuvre .ia-veh-btn').forEach(bouton => {
        bouton.dataset.count = 0;
        bouton.querySelector('.ia-veh-badge').textContent = '0';
    });
    const nbPersonnel = document.getElementById('nb-personnel');
    nbPersonnel.value = 8;
    document.getElementById('nb-personnel-val').textContent = '8';
    document.getElementById('duree-manoeuvre').value = '1 heure';
    document.getElementById('niveau-manoeuvre').value = 'Perfectionnement';
    document.getElementById('consignes-particulieres').value = '';
    document.getElementById('resultat-ia').style.display = 'none';
}

// Limite : 2 générations par 24 h sur cet appareil (le serveur applique aussi la limite)
const IA_LIMITE = 2;
const IA_FENETRE_MS = 24 * 60 * 60 * 1000;
const IA_CLE = 'vulcain.ia.generations';

function iaGenerationsRecentes() {
    try {
        const liste = JSON.parse(localStorage.getItem(IA_CLE) || '[]');
        return liste.filter(t => Date.now() - t < IA_FENETRE_MS);
    } catch (e) { return []; }
}

function iaEnregistrerGeneration() {
    try { localStorage.setItem(IA_CLE, JSON.stringify([...iaGenerationsRecentes(), Date.now()])); } catch (e) { /* stockage indisponible */ }
    iaAfficherQuota();
}

function iaProchaineGeneration() {
    const liste = iaGenerationsRecentes();
    if (liste.length < IA_LIMITE) return null;
    return new Date(Math.min(...liste) + IA_FENETRE_MS);
}

function iaHeure(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function iaJourEtHeure(date) {
    const demain = new Date(); demain.setDate(demain.getDate() + 1);
    const jour = date.toDateString() === new Date().toDateString() ? "aujourd'hui"
        : date.toDateString() === demain.toDateString() ? 'demain' : 'le ' + date.toLocaleDateString('fr-FR');
    return `${jour} à ${iaHeure(date)}`;
}

function iaDelai(ms) {
    const minutes = Math.max(1, Math.ceil(ms / 60000));
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

function iaAfficherQuota() {
    const utilisees = iaGenerationsRecentes().sort((a, b) => a - b);
    const reste = Math.max(0, IA_LIMITE - utilisees.length);
    const prochaine = iaProchaineGeneration();

    const zone = document.getElementById('ia-quota');
    if (zone) {
        zone.textContent = prochaine
            ? `Limite atteinte (${IA_LIMITE} générations par 24 h). Prochaine génération possible ${iaJourEtHeure(prochaine)}.`
            : `Il te reste ${reste} génération${reste > 1 ? 's' : ''} sur ${IA_LIMITE} pour les prochaines 24 h.`;
    }

    const compteur = document.getElementById('ia-compteur');
    if (!compteur) return;
    compteur.dataset.etat = reste === 0 ? 'epuise' : reste < IA_LIMITE ? 'partiel' : 'plein';
    document.getElementById('ia-compteur-reste').textContent = reste;

    const jetons = [];
    for (let i = 0; i < IA_LIMITE; i++) {
        const t = utilisees[i];
        if (t === undefined) {
            jetons.push(`<div class="ia-jeton dispo"><span class="ia-jeton-rond">✓</span><span><strong>Génération ${i + 1}</strong> · disponible</span></div>`);
        } else {
            const retour = new Date(t + IA_FENETRE_MS);
            jetons.push(`<div class="ia-jeton utilise"><span class="ia-jeton-rond">⏳</span><span><strong>Génération ${i + 1}</strong><br>Utilisée ${iaJourEtHeure(new Date(t))} · revient ${iaJourEtHeure(retour)} (dans ${iaDelai(retour - Date.now())})</span></div>`);
        }
    }
    document.getElementById('ia-jetons').innerHTML = jetons.join('');

    document.getElementById('ia-compteur-etat').textContent = reste === 0
        ? `Plus de génération disponible pour l'instant. La prochaine revient ${iaJourEtHeure(prochaine)}.`
        : reste === IA_LIMITE
            ? 'Tes 2 générations sont disponibles.'
            : `Il te reste 1 génération. L'autre revient ${iaJourEtHeure(new Date(utilisees[0] + IA_FENETRE_MS))}.`;

    const btn = document.getElementById('btn-generer');
    if (btn && !btn.dataset.enCours) btn.classList.toggle('ia-epuise', reste === 0);
}
// Actualisation chaque minute pour les délais affichés
setInterval(iaAfficherQuota, 60000);
document.addEventListener('DOMContentLoaded', iaAfficherQuota);

// Générer le scénario
async function genererManoeuvre() {
    const parametres = {
        types: getCheckedValues('type'),
        vehicules: getVehiculeValues(),
        lieux: getCheckedValues('lieu'),
        materiels: getCheckedValues('materiel'),
        grades: getCheckedValues('grade'),
        medical: getCheckedValues('medical'),
        nbPersonnel: document.getElementById('nb-personnel').value,
        duree: document.getElementById('duree-manoeuvre').value,
        niveau: document.getElementById('niveau-manoeuvre').value,
        consignes: document.getElementById('consignes-particulieres').value
    };

    // Validation minimale
    if (parametres.types.length === 0) {
        alert('⚠️ Veuillez sélectionner au moins un type de manœuvre');
        return;
    }

    if (iaProchaineGeneration()) {
        iaAfficherQuota();
        alert('⏳ ' + document.getElementById('ia-quota').textContent);
        return;
    }

    // UI loading
    const btn = document.getElementById('btn-generer');
    btn.disabled = true;
    btn.dataset.enCours = '1';
    btn.innerHTML = '<span class="loading">🔄</span> Génération en cours...';
    document.getElementById('resultat-ia').style.display = 'none';

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parametres)
        });

        if (!response.ok) {
            let message = 'Erreur serveur (' + response.status + ')';
            try {
                const erreur = await response.json();
                if (erreur && erreur.error) message = erreur.error;
            } catch (e) { /* réponse non JSON */ }
            throw new Error(message);
        }

        const scenarioDiv = document.getElementById('scenario-contenu');
        const resultatDiv = document.getElementById('resultat-ia');
        scenarioDiv.innerHTML = '';
        resultatDiv.style.display = 'block';
        resultatDiv.scrollIntoView({ behavior: 'smooth' });

        let texteComplet = '';
        let tampon = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Traite une ligne SSE complète ; renvoie false quand le flux est terminé
        const traiterLigne = function(line) {
            if (!line.startsWith('data: ')) return true;
            const data = line.slice(6);
            if (data === '[DONE]') return false;

            let parsed;
            try {
                parsed = JSON.parse(data);
            } catch (e) {
                console.error('Erreur parsing SSE:', e);
                return true;
            }
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
                texteComplet += parsed.text;
                scenarioDiv.innerHTML = formatScenario(texteComplet);
            }
            return true;
        };

        let enCours = true;
        while (enCours) {
            const { done, value } = await reader.read();
            tampon += decoder.decode(value || new Uint8Array(), { stream: !done });

            // Une ligne peut être coupée entre deux morceaux : on garde la fin incomplète
            const lines = tampon.split('\n');
            tampon = done ? '' : lines.pop();
            for (const line of lines) {
                if (!traiterLigne(line)) { enCours = false; break; }
            }
            if (done) enCours = false;
        }

        if (!texteComplet.trim()) {
            throw new Error('Aucune réponse générée par l\'IA');
        }
        dernierScenarioBrut = texteComplet;
        iaEnregistrerGeneration();
        statsEvenement('generation');

    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la génération : ' + error.message);
    } finally {
        btn.disabled = false;
        delete btn.dataset.enCours;
        iaAfficherQuota();
        btn.innerHTML = '<span>🤖</span> GÉNÉRER LE SCÉNARIO';
    }
}

// Échapper le HTML : le texte de l'IA ne doit jamais être interprété comme du code
function echapperHTML(texte) {
    return texte
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Formater le scénario avec mise en forme (le texte est échappé avant tout balisage)
function formatScenario(texte) {
    return echapperHTML(texte)
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: light-dark(#6a1b9a, #c383e9);">$1</strong>')
        .replace(/^### (.*$)/gm, '<h4 style="color: light-dark(#8e24aa, #cf7ee4); margin-top: 20px;">$1</h4>')
        .replace(/^## (.*$)/gm, '<h3 style="color: light-dark(#6a1b9a, #c383e9); margin-top: 25px; border-bottom: 2px solid light-dark(#E1BEE7, #716377); padding-bottom: 5px;">$1</h3>')
        .replace(/^# (.*$)/gm, '<h2 style="color: light-dark(#4a148c, #b688ee); margin-top: 25px;">$1</h2>')
        .replace(/^- (.*$)/gm, '<li style="margin-left: 20px; list-style-type: disc;">$1</li>')
        .replace(/^(\d+)\. (.*$)/gm, '<li style="margin-left: 20px; list-style-type: none;"><strong>$1.</strong> $2</li>')
        // Regroupe les <li> consécutifs dans un <ul> : sans ça ce sont des éléments de liste
        // orphelins (hors <ul>/<ol>), invalides et mal annoncés par les lecteurs d'écran.
        .replace(/(?:^<li.*<\/li>\n?)+/gm, bloc => `<ul style="list-style: none; padding-left: 0; margin: 8px 0;">${bloc.trim().replace(/\n/g, '')}</ul>`)
        .replace(/\n\n/g, '</p><p style="margin-top: 10px;">')
        .replace(/📋|🎯|📖|👥|⏱️|🔄|✅|⚠️|📦/g, '<span style="font-size: 1.2em;">$&</span>');
}

// Copier le scénario
function copierScenario() {
    const contenu = document.getElementById('scenario-contenu').innerText;
    navigator.clipboard.writeText(contenu).then(() => {
        alert('✅ Scénario copié dans le presse-papier !');
    }).catch(err => {
        console.error('Erreur copie:', err);
    });
}

// Couleurs du PDF, alignées sur l'identité Vulcain (--t-accent)
const PDF_ROUGE = [215, 38, 61];
const PDF_ENCRE = [26, 26, 26];
const PDF_GRIS = [110, 110, 110];
const PDF_FOND_CLAIR = [250, 236, 238];

let logoFlammeBase64 = null;
async function chargerLogoPDF() {
    if (logoFlammeBase64) return logoFlammeBase64;
    try {
        const reponse = await fetch('images/pdf/flamme-logo.png');
        const blob = await reponse.blob();
        logoFlammeBase64 = await new Promise((resolve, reject) => {
            const lecteur = new FileReader();
            lecteur.onload = () => resolve(lecteur.result);
            lecteur.onerror = reject;
            lecteur.readAsDataURL(blob);
        });
    } catch (e) { logoFlammeBase64 = false; }
    return logoFlammeBase64;
}

// Découpe un mot en tokens {texte, gras} à partir des marqueurs **gras**
function pdfTokeniser(ligne) {
    const tokens = [];
    ligne.split(/(\*\*.*?\*\*)/g).forEach(segment => {
        if (!segment) return;
        const gras = segment.startsWith('**') && segment.endsWith('**');
        const texte = gras ? segment.slice(2, -2) : segment;
        texte.split(/(\s+)/).forEach(mot => { if (mot) tokens.push({ texte: mot, gras }); });
    });
    return tokens;
}

// Écrit un paragraphe avec gestion du **gras** et retour à la ligne automatique.
// Retourne la position Y après écriture (gère aussi les sauts de page).
function pdfEcrireParagraphe(doc, ligne, x, y, maxWidth, options = {}) {
    const { pageWidth, pageHeight, margin, interligne = 5, taille = 10, prefixe = '', indentSuite = 0, couleur = PDF_ENCRE } = options;
    doc.setFontSize(taille);
    doc.setTextColor(...couleur);
    const tokens = pdfTokeniser(ligne);
    const espace = doc.getStringUnitWidth(' ') * taille / doc.internal.scaleFactor;
    let cursorX = x + (prefixe ? doc.getStringUnitWidth(prefixe) * taille / doc.internal.scaleFactor + 1 : 0);
    let premiereLigne = true;
    if (prefixe) { doc.setFont('helvetica', 'bold'); doc.text(prefixe, x, y); }

    tokens.forEach(({ texte, gras }) => {
        doc.setFont('helvetica', gras ? 'bold' : 'normal');
        const largeurMot = doc.getStringUnitWidth(texte) * taille / doc.internal.scaleFactor;
        const limiteX = pageWidth - margin;
        if (cursorX + largeurMot > limiteX && texte.trim()) {
            y += interligne;
            if (y > pageHeight - margin) { doc.addPage(); y = margin; }
            cursorX = x + indentSuite;
            premiereLigne = false;
        }
        if (texte.trim()) {
            doc.text(texte, cursorX, y);
            cursorX += largeurMot;
        } else {
            cursorX += espace;
        }
    });
    return y;
}

function pdfSautDePage(doc, y, margin, pageHeight, besoin = 10) {
    if (y > pageHeight - margin - besoin) { doc.addPage(); return margin; }
    return y;
}

// Télécharger le scénario en PDF, mis en forme avec l'identité visuelle Vulcain
async function telechargerPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const logo = await chargerLogoPDF();

    const types = getCheckedValues('type');
    const vehicules = getVehiculeValues();
    const lieux = getCheckedValues('lieu');
    const duree = document.getElementById('duree-manoeuvre').value;
    const niveau = document.getElementById('niveau-manoeuvre').value;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const maxWidth = pageWidth - margin * 2;

    // ---- En-tête : logo + wordmark Vulcain ----
    const hauteurEntete = 30;
    if (logo) {
        const largeurLogo = 11, hauteurLogo = 14;
        doc.addImage(logo, 'PNG', margin, 9, largeurLogo, hauteurLogo);
    }
    const xTitre = logo ? margin + 16 : margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...PDF_ENCRE);
    doc.text('VUL', xTitre, 20);
    const largeurVul = doc.getStringUnitWidth('VUL') * 22 / doc.internal.scaleFactor;
    doc.setTextColor(...PDF_ROUGE);
    doc.text('CAIN', xTitre + largeurVul, 20);
    const largeurCain = doc.getStringUnitWidth('CAIN') * 22 / doc.internal.scaleFactor;

    // Liseré tricolore sous le mot VULCAIN (fin liseré gris pour détacher le blanc du fond de page)
    const largeurMot = largeurVul + largeurCain;
    const yListere = 21.3, hListere = 1.6, largeurBande = largeurMot / 3;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.rect(xTitre, yListere, largeurMot, hListere, 'S');
    doc.setFillColor(0, 85, 164);
    doc.rect(xTitre, yListere, largeurBande, hListere, 'F');
    doc.setFillColor(239, 65, 53);
    doc.rect(xTitre + largeurBande * 2, yListere, largeurMot - largeurBande * 2, hListere, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_GRIS);
    doc.text("Générateur de scénarios d'entraînement — Le mémo du baroudeur", xTitre, 27.5);

    doc.setDrawColor(...PDF_ROUGE);
    doc.setLineWidth(0.8);
    doc.line(0, hauteurEntete, pageWidth, hauteurEntete);

    let yPosition = hauteurEntete + 10;

    // ---- Bandeau des paramètres du scénario ----
    const lignesInfos = [
        `Type : ${types.join(', ')}`,
        `Véhicules : ${vehicules.length > 0 ? vehicules.join(', ') : 'Non spécifié'}`,
        `Lieu : ${lieux.length > 0 ? lieux.join(', ') : 'Non spécifié'}`,
        `Durée : ${duree}  ·  Niveau : ${niveau}`
    ];
    const hauteurBandeau = lignesInfos.length * 5.5 + 6;
    doc.setFillColor(...PDF_FOND_CLAIR);
    doc.roundedRect(margin, yPosition, maxWidth, hauteurBandeau, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_ENCRE);
    let yInfo = yPosition + 7;
    lignesInfos.forEach(l => { doc.text(l, margin + 5, yInfo); yInfo += 5.5; });
    yPosition += hauteurBandeau + 10;

    // ---- Corps du scénario (markdown → mise en page) ----
    const texteBrut = dernierScenarioBrut || document.getElementById('scenario-contenu').innerText;
    const lignesSource = texteBrut.replace(/\r\n/g, '\n').split('\n');

    lignesSource.forEach(ligneBrute => {
        const ligne = ligneBrute.trim();
        if (!ligne) { yPosition += 3; return; }

        yPosition = pdfSautDePage(doc, yPosition, margin, pageHeight, 14);

        let m;
        if ((m = ligne.match(/^#{1,3}\s*(.*)$/))) {
            const titre = m[1].replace(/[📋🎯📖👥⏱️🔄✅⚠️📦]\s*/g, '').trim();
            yPosition += 4;
            yPosition = pdfSautDePage(doc, yPosition, margin, pageHeight, 14);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(...PDF_ROUGE);
            doc.text(titre, margin, yPosition);
            yPosition += 2;
            doc.setDrawColor(230, 200, 203);
            doc.setLineWidth(0.3);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 6;
        } else if ((m = ligne.match(/^-\s+(.*)$/))) {
            yPosition = pdfEcrireParagraphe(doc, m[1], margin, yPosition, maxWidth, {
                pageWidth, pageHeight, margin, prefixe: '•', indentSuite: 4
            });
            yPosition += 5.5;
        } else if ((m = ligne.match(/^(\d+)\.\s+(.*)$/))) {
            yPosition = pdfEcrireParagraphe(doc, m[2], margin, yPosition, maxWidth, {
                pageWidth, pageHeight, margin, prefixe: m[1] + '.', indentSuite: 6
            });
            yPosition += 5.5;
        } else {
            yPosition = pdfEcrireParagraphe(doc, ligne, margin, yPosition, maxWidth, { pageWidth, pageHeight, margin });
            yPosition += 5.5;
        }
    });

    // ---- Pied de page sur toutes les pages ----
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...PDF_ROUGE);
        doc.setLineWidth(0.4);
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
        doc.setFontSize(8);
        doc.setTextColor(...PDF_GRIS);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Vulcain v${APP_VERSION} · Scénario généré le ${new Date().toLocaleDateString('fr-FR')} · Page ${i}/${totalPages}`,
            pageWidth / 2,
            pageHeight - 9,
            { align: 'center' }
        );
    }

    // Générer le nom du fichier
    const dateStr = new Date().toISOString().split('T')[0];
    const typeStr = types[0] ? types[0].replace(/\s+/g, '_') : 'Scenario';
    const filename = `Scenario_${typeStr}_${dateStr}.pdf`;

    doc.save(filename);
    statsEvenement('pdf');

    setTimeout(() => {
        alert(`✅ PDF téléchargé : ${filename}`);
    }, 100);
}
