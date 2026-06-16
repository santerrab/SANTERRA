// Service Worker SANTERRA — v4 — FCM Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyAHoSDlNAZdxjAZCrjLeDMZoYTGr2Oq-CA",
  authDomain: "santerra-1d82f.firebaseapp.com",
  projectId: "santerra-1d82f",
  storageBucket: "santerra-1d82f.firebasestorage.app",
  messagingSenderId: "942523311161",
  appId: "1:942523311161:web:3f9a25e92ef33488b719e8"
});

const messaging = firebase.messaging();

// ── CACHE ─────────────────────────────────────────────────────────────────────
const CACHE = 'santerra-v4';

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

// ── FCM: notificación en background (app cerrada o minimizada) ────────────────
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || '📦 Nuevo pedido — SANTERRA', {
    body: body || 'Hay una solicitud pendiente de despacho',
    icon: 'https://santerrab.github.io/SANTERRA/icon-192x192.png',
    badge: 'https://santerrab.github.io/SANTERRA/icon-192x192.png',
    tag: 'pedido-santerra',
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 600, 150, 600],
    data: { url: 'https://santerrab.github.io/SANTERRA/' }
  });
});

// Al tocar la notificación → abrir o enfocar la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || 'https://santerrab.github.io/SANTERRA/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('SANTERRA') || c.url.includes('santerrab'));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
