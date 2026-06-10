// Service Worker SANTERRA — Network First para HTML, Cache First para recursos
const CACHE = 'santerra-v2';
const HTML_URLS = ['./index.html', './', ''];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add('./index.html')));
});

self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
  ]));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com')) return;
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') ||
      url.pathname === '' || url.pathname.endsWith('manifest.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    ); return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});

// ── NOTIFICACIONES PUSH (cuando la app está en background) ───────────────────
self.addEventListener('push', e => {
  let data = { title: '📦 Nuevo pedido — SANTERRA', body: 'Hay una solicitud pendiente de despacho', area: '' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch(_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%230d1117"/><text x="96" y="130" font-size="100" text-anchor="middle">📦</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="%230d1117"/><text x="48" y="66" font-size="52" text-anchor="middle">📦</text></svg>',
      tag: 'pedido-santerra',
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 500],
      data: { url: self.location.origin + self.location.pathname.replace('sw.js','') + 'index.html' }
    })
  );
});

// Al tocar la notificación → abrir o enfocar la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('index.html') || c.url.endsWith('/'));
      if (existing) return existing.focus();
      return clients.openWindow(e.notification.data?.url || './index.html');
    })
  );
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
