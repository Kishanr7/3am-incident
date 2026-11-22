/* 3 a.m. Incident service worker: lets the game install to a home screen and run offline.
   Own files: network first (so updates arrive), cache as the offline fallback.
   The SQL engine from cdnjs: cache first (its URL is versioned and never changes). */
const VERSION = 'tai-v22';
const CORE = ['./', 'index.html', 'assets/app.css', 'assets/engine.js', 'assets/cases.js', 'assets/cases2.js', 'assets/cases3.js', 'assets/tables.js', 'assets/cast.js', 'assets/app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'case-1/'];
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
const FONTS = 'https://cdn.jsdelivr.net/npm/@fontsource';
const ENGINE = [CDN + 'sql-wasm.js', CDN + 'sql-wasm.wasm',
  FONTS + '-variable/fraunces@5.3.0/files/fraunces-latin-soft-normal.woff2',
  FONTS + '/lato@5.3.0/files/lato-latin-400-normal.woff2', FONTS + '/lato@5.3.0/files/lato-latin-700-normal.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all([
    c.addAll(CORE),
    ...ENGINE.map((u) => fetch(u, { mode: 'cors' }).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null)),
  ])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.href.startsWith(CDN) || url.href.startsWith(FONTS)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const copy = r.clone(); if (r.ok) caches.open(VERSION).then((c) => c.put(req, copy)); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./'))));
});
