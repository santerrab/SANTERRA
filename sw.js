// Service Worker SANTERRA — v3 — fuerza descarga limpia
const CACHE = 'santerra-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add('./index.html')));
});

self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    self.clients.claim(),
    // Eliminar TODOS los caches anteriores (v1, v2, etc)
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
  ]));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com')) return;
  // HTML y manifest: Network First — siempre descarga lo más nuevo
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') ||
      url.pathname === '' || url.pathname.endsWith('manifest.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    ); return;
  }
  // Resto: Cache First
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});

// Push notifications
self.addEventListener('push', e => {
  let data = { title: '📦 Nuevo pedido — SANTERRA', body: 'Hay una solicitud pendiente' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch(_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%230d1117"/><text x="96" y="130" font-size="100" text-anchor="middle">📦</text></svg>',
      tag: 'pedido-santerra', renotify: true, requireInteraction: true,
      vibrate: [300, 100, 300, 100, 500]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('index.html') || c.url.endsWith('/'));
      if (existing) return existing.focus();
      return clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
