/* Generated into public/sw.js by npm run build. */
const CACHE_VERSION = '__CACHE_VERSION__';
const ASSETS = __PRECACHE_ASSETS__;
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
