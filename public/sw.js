/* Generated into public/sw.js by npm run build. */
const CACHE_VERSION = '66a7853cbdf5634e';
const ASSETS = [
  "assets/app-icon-maskable-v2-192.png",
  "assets/app-icon-maskable-v2-512.png",
  "assets/app-icon-v2-192.png",
  "assets/app-icon-v2-512.png",
  "assets/apple-touch-icon-v2-152.png",
  "assets/apple-touch-icon-v2-167.png",
  "assets/apple-touch-icon-v2-180.png",
  "assets/favicon-v2.ico",
  "assets/qr-cdg-parking.png",
  "css/app.css",
  "data/iata.json",
  "index.html",
  "js/app.js",
  "js/core.js",
  "js/mappings.js",
  "js/preferences.js",
  "js/theme.js",
  "manifest.webmanifest"
];
const CACHE_PREFIX = 'cdg-parking:' + new URL(self.registration.scope).pathname + ':';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // addAll is atomic. An incomplete download never replaces the working version.
    await cache.addAll(ASSETS.map(asset => new Request(new URL(asset, self.registration.scope), { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = request.mode === 'navigate' ? new URL('index.html', scope).href : request;
    const cached = await cache.match(key, { ignoreSearch: true });
    // Returning cached files first keeps startup independent of network latency.
    return cached || fetch(request);
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
