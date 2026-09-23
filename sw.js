// DECIOPS Service Worker v1.10.0
const CACHE_NAME = 'deciops-v1.10.0';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/data-loader.js',
  './js/modules/sal.js',
  './js/modules/ia-manoeuvre.js',
  './js/modules/gaz.js',
  './js/modules/bouteilles.js',
  './js/modules/commandement.js',
  './js/modules/trajet.js',
  './js/modules/sauvegarde.js',
  './js/modules/lspcc.js',
  './js/pwa-theme.js',
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
        console.log('🚒 DECIOPS: Cache ouvert');
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
            console.log('🚒 DECIOPS: Suppression ancien cache:', cacheName);
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
