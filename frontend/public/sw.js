const CACHE_NAME = 'vchats-cache-v3.0';

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event - Purge all previous caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Purging old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event with Network-First strategy for HTML navigation
self.addEventListener('fetch', (event) => {
  let url;
  try {
    url = new URL(event.request.url);
  } catch (err) {
    return;
  }

  // Bypass non-GET, API routes, Socket.io, data URIs, and Cloudinary
  if (
    event.request.method !== 'GET' ||
    url.pathname.includes('/api') ||
    url.pathname.includes('/socket.io') ||
    url.hostname.includes('cloudinary') ||
    url.protocol === 'data:'
  ) {
    return;
  }

  // Network-First strategy for HTML navigation pages so new Vercel deployments are instantly loaded
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-While-Revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Event Handler (for Web Push Protocol & Lockscreen/System Notifications)
self.addEventListener('push', (event) => {
  let data = { title: 'VChats Message', body: 'You have a new message!', icon: '/logo192.png' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'New message on VChats',
    icon: data.icon || '/logo192.png',
    badge: '/logo192.png',
    tag: data.tag || 'vchats-notification',
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/dashboard',
      conversationId: data.conversationId,
    },
    actions: [
      { action: 'open', title: '💬 Open VChats' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title || 'VChats', options));
});

// Notification Click Handler (opens app when user clicks lock screen / home screen banner)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
