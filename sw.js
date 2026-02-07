// DECIOPS Service Worker v1.9
const CACHE_NAME = 'deciops-v1.9';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/data-loader.js',
  './js/modules/sal.js',
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
