// Service Worker — CogPilote
// Bump CACHE_NAME on each deploy to invalidate stale cache.
// Chemins RELATIFs : l'app fonctionne quel que soit le sous-dossier
// d'hébergement (nom du dépôt GitHub Pages, domaine custom, etc.).
const CACHE_NAME = 'cogpilote-v16';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/storage.js',
  './js/engine.js',
  './js/ui.js',
  './js/app.js',
  './js/exercise-config.js',
  './js/exercises/registry.js',
  './js/exercises/math-trainer.js',
  './js/exercises/fractions.js',
  './js/exercises/percentages.js',
  './js/exercises/divisibility.js',
  './js/exercises/prime-numbers.js',
  './js/exercises/alphabet-rank.js',
  './js/exercises/letter-gap.js',
  './js/exercises/letter-jumps.js',
  './js/exercises/anagrams.js',
  './js/exercises/word-box.js',
  './js/exercises/nback.js',
  './js/exercises/digit-span.js',
  './js/exercises/flash-memory.js',
  './js/exercises/stroop-gonogo.js',
  './js/exercises/visual-search.js',
  './js/exercises/reaction-time.js',
  './js/exercises/logic-series.js',
  './js/exercises/angle-estimation.js',
  './js/exercises/marbles.js',
  './js/exercises/letter-bubbles.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll will fail silently if icons (PNG) are missing — use individual add
      return Promise.allSettled(PRECACHE.map((url) => cache.add(url).catch(() => {})));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return response;
      });
    })
  );
});
