// NAUTA Service Worker v3
const CACHE = 'nauta-v202607192306';
const STATIC = [
  '/Impacto-termico/manifest.json',
  '/Impacto-termico/icon-192.png',
  '/Impacto-termico/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls — network only, never cache
  const isAPI = url.hostname.includes('supabase') ||
                url.hostname.includes('open-meteo') ||
                url.hostname.includes('nominatim') ||
                url.hostname.includes('montevideo.gub.uy') ||
                url.hostname.includes('googleapis');

  if (isAPI) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{}', { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // HTML files — network first, fall back to cache
  // This ensures index.html always updates when online
  if (e.request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Other static assets (icons, manifest) — cache first
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
    )
  );
});
