// Service Worker — CogPilote v1
// Bump CACHE_NAME on each deploy to invalidate stale cache
const CACHE_NAME = 'cogpilote-v2';

const PRECACHE = [
  '/calculateur_horaires/',
  '/calculateur_horaires/index.html',
  '/calculateur_horaires/manifest.json',
  '/calculateur_horaires/css/app.css',
  '/calculateur_horaires/js/storage.js',
  '/calculateur_horaires/js/engine.js',
  '/calculateur_horaires/js/ui.js',
  '/calculateur_horaires/js/app.js',
  '/calculateur_horaires/js/exercises/registry.js',
  '/calculateur_horaires/js/exercises/mental-math.js',
  '/calculateur_horaires/js/exercises/multiplication.js',
  '/calculateur_horaires/js/exercises/fractions.js',
  '/calculateur_horaires/js/exercises/percentages.js',
  '/calculateur_horaires/js/exercises/divisibility.js',
  '/calculateur_horaires/js/exercises/alphabet-rank.js',
  '/calculateur_horaires/js/exercises/letter-jumps.js',
  '/calculateur_horaires/js/exercises/nback.js',
  '/calculateur_horaires/js/exercises/digit-span.js',
  '/calculateur_horaires/js/exercises/flash-memory.js',
  '/calculateur_horaires/js/exercises/stroop-gonogo.js',
  '/calculateur_horaires/js/exercises/visual-search.js',
  '/calculateur_horaires/js/exercises/dual-task.js',
  '/calculateur_horaires/js/exercises/reaction-time.js',
  '/calculateur_horaires/js/exercises/logic-series.js',
  '/calculateur_horaires/js/exercises/mental-rotation.js',
  '/calculateur_horaires/js/exercises/angle-estimation.js',
  '/calculateur_horaires/js/exercises/letter-bubbles.js',
  '/calculateur_horaires/icons/icon.svg',
  '/calculateur_horaires/icons/icon-192.png',
  '/calculateur_horaires/icons/icon-512.png',
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
