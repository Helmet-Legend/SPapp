/**
 * Vulcain - Générateur de manœuvre IA
 *
 * Le navigateur n'envoie que les paramètres du formulaire : le prompt est
 * construit côté serveur (api/gemini.js), ce qui empêche d'utiliser
 * l'endpoint comme un accès libre à l'IA.
 */

// Collecter les valeurs cochées
function getCheckedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
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
        vehicules: getCheckedValues('vehicule'),
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
        iaEnregistrerGeneration();

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
        .replace(/^- (.*$)/gm, '<li style="margin-left: 20px;">$1</li>')
        .replace(/^(\d+)\. (.*$)/gm, '<li style="margin-left: 20px;"><strong>$1.</strong> $2</li>')
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

// Télécharger le scénario en PDF
function telechargerPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Récupérer le contenu brut (sans HTML)
    const contenuHTML = document.getElementById('scenario-contenu');
    const contenuTexte = contenuHTML.innerText;
    
    // Collecter les paramètres du scénario
    const types = getCheckedValues('type');
    const vehicules = getCheckedValues('vehicule');
    const duree = document.getElementById('duree-manoeuvre').value;
    const niveau = document.getElementById('niveau-manoeuvre').value;
    
    // Configuration PDF
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = margin;
    
    // En-tête avec logo et titre
    doc.setFillColor(106, 27, 154); // Violet Vulcain
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('🚒 Vulcain', margin, 15);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Générateur de Scénarios d\'Entraînement', margin, 25);
    
    yPosition = 45;
    doc.setTextColor(0, 0, 0);
    
    // Informations du scénario
    doc.setFillColor(243, 229, 245);
    doc.rect(margin, yPosition, maxWidth, 25, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    yPosition += 8;
    doc.text(`Type: ${types.join(', ')}`, margin + 5, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Véhicules: ${vehicules.length > 0 ? vehicules.join(', ') : 'Non spécifié'}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Durée: ${duree} | Niveau: ${niveau}`, margin + 5, yPosition);
    
    yPosition += 15;
    
    // Ligne de séparation
    doc.setDrawColor(142, 36, 170);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    // Contenu du scénario
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Découper le texte en lignes qui tiennent dans la page
    const lignes = doc.splitTextToSize(contenuTexte, maxWidth);
    
    for (let i = 0; i < lignes.length; i++) {
        // Vérifier si on doit ajouter une nouvelle page
        if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
        }
        
        const ligne = lignes[i];
        
        // Détecter les titres (lignes en majuscules ou avec emojis)
        if (ligne.match(/^[📋🎯📖👥⏱️🔄✅⚠️📦]/)) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(106, 27, 154);
            yPosition += 3;
        } else if (ligne === ligne.toUpperCase() && ligne.length < 50 && ligne.trim().length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(74, 20, 140);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
        }
        
        doc.text(ligne, margin, yPosition);
        yPosition += 5;
    }
    
    // Pied de page sur toutes les pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.setFont('helvetica', 'italic');
        doc.text(
            `Vulcain v${APP_VERSION} - Scénario généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i}/${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }
    
    // Générer le nom du fichier
    const dateStr = new Date().toISOString().split('T')[0];
    const typeStr = types[0] ? types[0].replace(/\s+/g, '_') : 'Scenario';
    const filename = `Scenario_${typeStr}_${dateStr}.pdf`;
    
    // Télécharger le PDF
    doc.save(filename);
    
    // Confirmation
    setTimeout(() => {
        alert(`✅ PDF téléchargé : ${filename}`);
    }, 100);
}
