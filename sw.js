// Service Worker SANTERRA
// Actualización automática: detecta cambios sin necesidad de cambiar versión manualmente

const CACHE_NAME = 'santerra-cache';

// ── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  // Activar inmediatamente sin esperar a que se cierre la pestaña
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.add('./index.html'))
  );
});

// ── ACTIVATE ───────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  // Tomar control de todas las pestañas abiertas inmediatamente
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Limpiar cachés viejas si las hay
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    ])
  );
});

// ── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Firebase siempre directo a la red — nunca cachear
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com')
  ) return;

  // index.html y raíz: NETWORK FIRST
  // Siempre intenta descargar la versión más nueva
  // Solo usa caché si no hay red (modo avión)
  if (
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('/') ||
    url.pathname === '' ||
    url.pathname.endsWith('manifest.json')
  ) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          // Guardar la versión nueva en caché
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Sin red: usar caché
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Otros recursos: cache first (fuentes Google, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── MENSAJE ────────────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
