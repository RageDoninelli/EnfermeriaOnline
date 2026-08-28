/* ============================================================
   ENFERMERÍA ONLINE — SERVICE WORKER
   Habilita instalación como app y uso sin conexión.
   IMPORTANTE: si cambias APP_VERSION en el HTML, sube también
   el número de CACHE_NAME aquí para invalidar la caché antigua.
   ============================================================ */
const CACHE_NAME = 'enfermeria-online-v1.0.0';
const APP_SHELL = [
  './enfermeria-online.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  if(url.origin === self.location.origin){
    // App shell propio: red primero (para recibir actualizaciones), con respaldo en caché si no hay conexión.
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./enfermeria-online.html')))
    );
  } else {
    // Recursos externos (p. ej. Google Fonts): caché primero, luego red; nunca rompe si falla.
    event.respondWith(
      caches.match(req).then(cached => {
        if(cached) return cached;
        return fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
          return res;
        }).catch(() => cached);
      })
    );
  }
});
