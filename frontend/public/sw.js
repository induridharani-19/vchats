const CACHE_NAME = 'vchats-cache-v2.1';

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
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
