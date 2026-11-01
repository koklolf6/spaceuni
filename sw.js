/* SpaceUni — service worker: funciona sin conexión y se actualiza solo al abrir con internet.
   Cuando cambies el juego, sube el número de CACHE para forzar la actualización. */
const CACHE = 'spaceuni-v1';
const BASE = self.registration.scope;
const PAGE = new URL('index.html', BASE).href;
const CORE = [PAGE, 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;               // servidores externos / WebSocket: no tocar
  const key = req.mode === 'navigate' ? PAGE : req;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req.mode === 'navigate' ? PAGE : req, { cache: 'no-cache' }).then(r => {
      if (r && r.ok) cache.put(key, r.clone());
      return r;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }               // rápido: responde con lo guardado y actualiza detrás
    return (await net) || new Response('Sin conexión', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }));
});
