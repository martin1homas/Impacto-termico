// NAUTA Service Worker — PWA offline support
const CACHE = 'nauta-v1';
const STATIC = [
  '/Impacto-termico/',
  '/Impacto-termico/index.html',
  '/Impacto-termico/manifest.json',
  '/Impacto-termico/icon-192.png',
  '/Impacto-termico/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first for API calls, cache first for static assets
  const url = new URL(e.request.url);
  const isAPI = url.hostname.includes('supabase') ||
                url.hostname.includes('open-meteo') ||
                url.hostname.includes('nominatim') ||
                url.hostname.includes('montevideo.gub.uy');

  if (isAPI) {
    // Network only for live data
    e.respondWith(fetch(e.request).catch(() => new Response('{}', {headers: {'Content-Type': 'application/json'}})));
  } else {
    // Cache first for static assets
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
  }
});
