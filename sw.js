// Service Worker de Dynamic Combat.
// Siempre pide primero al servidor la versión más reciente; solo usa la copia guardada si no hay conexión.
// Cuando subas una versión nueva del juego, cambia el número de CACHE.
const CACHE = 'dyco-v0.9.4';
const CORE = ['./', './index.html', './manifest.json', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  // Red primero para todo: lo de nuestro servidor se revalida (sin usar la caché del navegador);
  // si la red falla, se sirve la copia guardada.
  const net = req.mode === 'navigate'
    ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(req, sameOrigin ? { cache: 'no-cache' } : undefined);

  e.respondWith(
    net
      .then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          const key = req.mode === 'navigate' ? './index.html' : req;
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req.mode === 'navigate' ? './index.html' : req).then((hit) => hit || Response.error())
      )
  );
});
