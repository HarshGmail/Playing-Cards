const CACHE_VERSION = 'v1';
const OFFLINE_CACHE = `offline-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [OFFLINE_URL, '/icon-192.png', '/badge-96.png'];
const DEFAULT_URL = '/dashboard';
const DEFAULT_TITLE = 'Playing Cards';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('offline-') && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.open(OFFLINE_CACHE).then((cache) => cache.match(OFFLINE_URL))
    )
  );
});

function parsePushData(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch (err) {
    return { body: event.data.text() };
  }
}

self.addEventListener('push', (event) => {
  const data = parsePushData(event);
  const title = data.title || DEFAULT_TITLE;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: data.tag,
      data: { url: data.url || DEFAULT_URL },
    })
  );
});

function isSameOrigin(client) {
  return client.url.startsWith(self.location.origin);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(
    (event.notification.data && event.notification.data.url) || DEFAULT_URL,
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find(isSameOrigin);
      if (existing && 'focus' in existing) {
        return existing.focus().then((focused) => {
          if ('navigate' in focused) return focused.navigate(targetUrl);
          return focused;
        });
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
