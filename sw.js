// Vulcain Service Worker v1.15.0
const CACHE_NAME = 'vulcain-v1.15.0';
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
