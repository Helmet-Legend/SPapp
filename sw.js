// Vulcain Service Worker v1.17.0
const CACHE_NAME = 'vulcain-v1.17.0';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './css/theme.css',
  './fonts/barlow-condensed-latin-600-normal.woff2',
  './fonts/barlow-condensed-latin-700-normal.woff2',
  './fonts/barlow-latin-400-normal.woff2',
  './fonts/barlow-latin-500-normal.woff2',
  './fonts/barlow-latin-600-normal.woff2',
  './fonts/manrope-latin-500-normal.woff2',
  './fonts/manrope-latin-600-normal.woff2',
  './fonts/manrope-latin-700-normal.woff2',
  './fonts/manrope-latin-800-normal.woff2',
  './js/app.js',
  './js/data-loader.js',
  './js/modules/sal.js',
  './js/modules/ia-manoeuvre.js',
  './js/modules/gaz.js',
  './js/modules/bouteilles.js',
  './js/modules/commandement.js',
  './js/modules/trajet.js',
  './js/modules/rdsmes.js',
  './js/modules/rdeb.js',
  './images/rdlspcc/abordage-schemas.jpg',
  './images/rdlspcc/abordage-vsr.jpg',
  './images/rdlspcc/amarrage-angle.jpg',
  './images/rdlspcc/amarrage-double.jpg',
  './images/rdlspcc/amarrage-intermediaire.jpg',
  './images/rdlspcc/amarrage-principal.jpg',
  './images/rdlspcc/ancrage-vehicule.jpg',
  './images/rdlspcc/anneaux.jpg',
  './images/rdlspcc/antichute.jpg',
  './images/rdlspcc/cle-arret.jpg',
  './images/rdlspcc/code-itn.jpg',
  './images/rdlspcc/conditionnement.jpg',
  './images/rdlspcc/connecteurs.jpg',
  './images/rdlspcc/corde.jpg',
  './images/rdlspcc/cordelette.jpg',
  './images/rdlspcc/descendeur.jpg',
  './images/rdlspcc/evolution-mea.jpg',
  './images/rdlspcc/excavation-1.jpg',
  './images/rdlspcc/excavation-2.jpg',
  './images/rdlspcc/excavation-3.jpg',
  './images/rdlspcc/exterieur-schemas.jpg',
  './images/rdlspcc/facteur-chute.jpg',
  './images/rdlspcc/harnais-habillage.jpg',
  './images/rdlspcc/harnais-mea.jpg',
  './images/rdlspcc/harnais.jpg',
  './images/rdlspcc/longe-antichute.jpg',
  './images/rdlspcc/longe-maintien.jpg',
  './images/rdlspcc/noeud-8.jpg',
  './images/rdlspcc/noeud-francais.jpg',
  './images/rdlspcc/passage-vide.jpg',
  './images/rdlspcc/pendulaire.jpg',
  './images/rdlspcc/poulie.jpg',
  './images/rdlspcc/protection.jpg',
  './images/rdlspcc/reco-conditions.jpg',
  './images/rdlspcc/reco-itineraires.jpg',
  './images/rdlspcc/repartition.jpg',
  './images/rdlspcc/sac.jpg',
  './images/rdlspcc/sangle-harnais.jpg',
  './images/rdlspcc/sangles-evolution.jpg',
  './images/rdlspcc/secu-coulisse.jpg',
  './images/rdlspcc/secu-crochets.jpg',
  './images/rdlspcc/secu-mea.jpg',
  './images/rdlspcc/securisation-charge.jpg',
  './images/rdlspcc/systeme.jpg',
  './images/rdlspcc/tirant-air.jpg',
  './images/rdlspcc/toiture.jpg',
  './images/rdlspcc/triangle-conscient.jpg',
  './images/rdlspcc/triangle-inconscient.jpg',
  './images/rdlspcc/triangle-recond.jpg',
  './images/rdlspcc/triangle-reglages.jpg',
  './images/rdlspcc/triangle.jpg',
  './images/rdep/appui-depassement.jpg',
  './images/rdep/appui-sans-depassement.jpg',
  './images/rdep/attache-corde.jpg',
  './images/rdep/coulisse-ancrage.jpg',
  './images/rdep/coulisse-desolidarisee.jpg',
  './images/rdep/coulisse-excavation.jpg',
  './images/rdep/coulisse-horizontale.jpg',
  './images/rdep/coulisse2-nomenclature.jpg',
  './images/rdep/coulisse3-nomenclature.jpg',
  './images/rdep/crochets-ancrage.jpg',
  './images/rdep/crochets-monter.jpg',
  './images/rdep/crochets-nomenclature.jpg',
  './images/rdep/pietage.jpg',
  './images/rdep/portes.jpg',
  './images/rdep/proc-9-1.jpg',
  './images/rdep/proc-9-10.jpg',
  './images/rdep/proc-9-11.jpg',
  './images/rdep/proc-9-12.jpg',
  './images/rdep/proc-9-13.jpg',
  './images/rdep/proc-9-14.jpg',
  './images/rdep/proc-9-15.jpg',
  './images/rdep/proc-9-16.jpg',
  './images/rdep/proc-9-17.jpg',
  './images/rdep/proc-9-18.jpg',
  './images/rdep/proc-9-19.jpg',
  './images/rdep/proc-9-2.jpg',
  './images/rdep/proc-9-20.jpg',
  './images/rdep/proc-9-21.jpg',
  './images/rdep/proc-9-22.jpg',
  './images/rdep/proc-9-23.jpg',
  './images/rdep/proc-9-24.jpg',
  './images/rdep/proc-9-3.jpg',
  './images/rdep/proc-9-4.jpg',
  './images/rdep/proc-9-5.jpg',
  './images/rdep/proc-9-6.jpg',
  './images/rdep/proc-9-7.jpg',
  './images/rdep/proc-9-8.jpg',
  './images/rdep/proc-9-9.jpg',
  './images/rdep/techniques-acces.jpg',
  './images/rdep/telescopique-nomenclature.jpg',
  './images/rdep/telescopique-panier.jpg',
  './images/rdeb/amarrage-ligne-guide.jpg',
  './images/rdeb/ari-composants.jpg',
  './images/rdeb/ari-flexibles.jpg',
  './images/rdeb/ascenseur.jpg',
  './images/rdeb/bouteille-schema.jpg',
  './images/rdeb/bouteilles.jpg',
  './images/rdeb/brassee.jpg',
  './images/rdeb/capelage.jpg',
  './images/rdeb/chassis.jpg',
  './images/rdeb/coiffage-filet.jpg',
  './images/rdeb/coiffage-griffe.jpg',
  './images/rdeb/conditionnement.jpg',
  './images/rdeb/couleurs.jpg',
  './images/rdeb/croisement.jpg',
  './images/rdeb/demi-masque.jpg',
  './images/rdeb/deshabillage-filet.jpg',
  './images/rdeb/deshabillage-griffe.jpg',
  './images/rdeb/eas.jpg',
  './images/rdeb/epi-electrique.jpg',
  './images/rdeb/espace-mort.jpg',
  './images/rdeb/etiquettes-adr.jpg',
  './images/rdeb/exploration-circulaire.jpg',
  './images/rdeb/exploration-laterale.jpg',
  './images/rdeb/exploration-lineaire.jpg',
  './images/rdeb/gestes.jpg',
  './images/rdeb/habillage.jpg',
  './images/rdeb/harnais.jpg',
  './images/rdeb/ldv-etablissement.jpg',
  './images/rdeb/liaison-perso.jpg',
  './images/rdeb/ligne-guide.jpg',
  './images/rdeb/lignes-electriques.jpg',
  './images/rdeb/linky.jpg',
  './images/rdeb/marquage.jpg',
  './images/rdeb/masques.jpg',
  './images/rdeb/pictos-clp.jpg',
  './images/rdeb/port-ligne-guide.jpg',
  './images/rdeb/recherche-temps.jpg',
  './images/rdeb/remplacement-bouteille.jpg',
  './images/rdeb/retournement.jpg',
  './images/rdeb/sad.jpg',
  './images/rdeb/schema-ops.jpg',
  './images/rdeb/symboles.jpg',
  './images/rdeb/tableau-gestion.jpg',
  './images/rdeb/tth900.jpg',
  './images/rdeb/voies-penetration.jpg',
  './images/rdeb/zonage-exemple.jpg',
  './images/rdsmes/assistance-intervenant.jpg',
  './images/rdsmes/assistance-victime.jpg',
  './images/rdsmes/attache-victime.jpg',
  './images/rdsmes/deshabillage.jpg',
  './images/rdsmes/echelle-coulisse.jpg',
  './images/rdsmes/echelle-crochets.jpg',
  './images/rdsmes/evacuation-commande.jpg',
  './images/rdsmes/evacuation-fenetre.jpg',
  './images/rdsmes/evacuation-tuyau.jpg',
  './images/rdsmes/excavation.jpg',
  './images/rdsmes/facades.jpg',
  './images/rdsmes/fils-cables.jpg',
  './images/rdsmes/mea-detecteur.jpg',
  './images/rdsmes/mea-passage-vide.jpg',
  './images/rdsmes/mea-polygone.jpg',
  './images/rdsmes/mea-positions.jpg',
  './images/rdsmes/mea-sol.jpg',
  './images/rdsmes/mea-terminologie.jpg',
  './images/rdsmes/mea-victime.jpg',
  './images/rdsmes/moyens.jpg',
  './images/rdsmes/passage-avant.jpg',
  './images/rdsmes/passage-dos.jpg',
  './images/rdsmes/passage-vide-coulisse.jpg',
  './images/rdsmes/point-ancrage.jpg',
  './images/rdsmes/point-fixe-humain.jpg',
  './images/rdsmes/porter.jpg',
  './images/rdsmes/positions-attente.jpg',
  './images/rdsmes/profil-reduit.jpg',
  './images/rdsmes/retrait-ari.jpg',
  './images/rdsmes/traction-escalier.jpg',
  './images/rdsmes/traction-sim.jpg',
  './images/rdsmes/traction-sol.jpg',
  './js/modules/lspcc.js',
  './js/pwa-theme.js',
  './js/theme.js',
  './js/navigation.js',
  './data/navigation.json',
  './guides-gmu.js',
  './affichage-gmu.js',
  './gmu-integration.js',
  './data/config.json',
  './data/conversions.json',
  './data/densites.json',
  './data/gaz.json',
  './data/gaz_bouteilles.json',
  './data/modules.json',
  './data/tables_mt2012.json',
  './data/tmd.json',
  './data/lspcc.json',
  './manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🚒 Vulcain: Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🚒 Vulcain: Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de cache: Network First, puis Cache
self.addEventListener('fetch', event => {
  // Ne jamais intercepter les appels API (POST, flux IA) ni les requêtes externes
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone la réponse pour le cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Si offline, utiliser le cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // Page de fallback si rien en cache
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
