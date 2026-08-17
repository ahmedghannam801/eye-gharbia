/**
 * EYE Workflow Hub — Mobile & Web Push Service Worker
 * Handles background push notifications, PWA caching, and deep links.
 */

const SW_VERSION = 'eye-sw-v3';

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push Event Handler (Mobile Push Payload) ──────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {
    title: '🔔 إشعار جديد من منصة EYE',
    body: 'هناك تحديث جديد متاح على المنصة، اضغط للاستعراض.',
    icon: '/eye-logo.png',
    url: '/',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/eye-logo.png',
    badge: '/eye-logo.png',
    vibrate: [200, 100, 200, 100, 300],
    tag: payload.tag || `eye-notif-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open', title: '📱 فتح المنصة' },
      { action: 'close', title: 'إغلاق' },
    ],
    data: { url: payload.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// ── Notification Click Handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const relativeUrl = event.notification.data?.url || '/';
  const targetUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Background Sync / SW Messages ─────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_TEST_PUSH') {
    self.registration.showNotification(event.data.title || '🔔 إشعار تجريبي', {
      body: event.data.body || 'الإشعارات الفورية تعمل بنجاح على هذا الجهاز! 📲',
      icon: '/eye-logo.png',
      badge: '/eye-logo.png',
      vibrate: [200, 100, 200],
    });
  }
});
