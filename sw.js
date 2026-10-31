const CACHE_NAME = 'vietnam-cache-v1';
const TILE_CACHE = 'vietnam-tiles'; // tuiles OSM : conservées d'une version à l'autre
const PRECACHE_ASSETS = [
  './', './index.html', './style.css', './data.js', './app.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/layers.png', './vendor/leaflet/images/layers-2x.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME && k !== TILE_CACHE).map((k) => caches.delete(k))
    ))
  ]));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tuiles OSM : cache-first
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(caches.open(TILE_CACHE).then((cache) =>
      cache.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      }).catch(() => hit))
    ));
    return;
  }
  if (url.origin !== location.origin) return;

  // Bibliothèque vendorisée et icônes : cache-first
  if (url.pathname.includes('/vendor/') || url.pathname.includes('/icons/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); return res;
    })));
    return;
  }

  // HTML / JS / CSS / manifest : network-first (jamais de page obsolète avec du réseau)
  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((h) => h || caches.match('./index.html')))
  );
});
