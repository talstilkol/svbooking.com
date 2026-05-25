// SV Booking Service Worker — offline fallback + cache strategy
const CACHE_NAME = 'svbooking-v1';
const PRICE_CACHE_NAME = 'svbooking-prices-v1';
const PRICE_CACHE_TTL = 120_000; // 2 minutes
const OFFLINE_URL = '/offline';
const PRIVATE_NAVIGATION_PREFIXES = [
  '/api',
  '/agents',
  '/dashboard',
  '/profile',
  '/favorites',
  '/trips',
];

// Assets to pre-cache on install
const PRE_CACHE = [
  '/',
  '/offline',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

function toSameOriginUrl(value) {
  try {
    const url = new URL(value || '/', self.location.origin);
    if (url.origin !== self.location.origin) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

function pathMatchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function shouldBypassServiceWorker(request, url) {
  if (request.method !== 'GET') return true;
  if (url.origin !== self.location.origin) return true;
  return PRIVATE_NAVIGATION_PREFIXES.some((prefix) => pathMatchesPrefix(url.pathname, prefix));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== PRICE_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/**
 * Price compare API: short-lived SWR cache.
 * GET /api/compare?hotelKey=...&checkIn=...&checkOut=... responses are cached
 * for 2 minutes. Within that window, the SW serves the cached response instantly
 * while revalidating in the background. This eliminates server round-trips for
 * repeat price checks (e.g., switching tabs and coming back).
 */
function isPriceCompareRequest(request, url) {
  return request.method === 'GET' &&
    url.origin === self.location.origin &&
    (url.pathname === '/api/compare' || url.pathname === '/api/compare/batch') &&
    url.searchParams.has('hotelKey') &&
    url.searchParams.has('checkIn');
}

function handlePriceCompare(event, request) {
  event.respondWith(
    caches.open(PRICE_CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached); // Offline: use cache if available

      if (cached) {
        // Check age — serve from cache if within TTL
        const cachedDate = cached.headers.get('date');
        const age = cachedDate ? Date.now() - new Date(cachedDate).getTime() : Infinity;
        if (age < PRICE_CACHE_TTL) {
          // SWR: serve cache, revalidate in background
          event.waitUntil(fetchPromise);
          return cached;
        }
      }

      // Cache miss or expired — wait for network
      return fetchPromise;
    })
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Price compare API — short-lived SWR cache (before the general bypass)
  if (isPriceCompareRequest(request, url)) {
    handlePriceCompare(event, request);
    return;
  }

  // Let the browser handle cross-origin, non-GET, API, auth, and private routes.
  if (shouldBypassServiceWorker(request, url)) return;

  // Navigation requests (pages) — network first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets — stale-while-revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'SV Booking notification', body: event.data.text() };
  }

  const title = payload.title || 'SV Booking notification';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: toSameOriginUrl(payload.url),
      source: payload.source || 'push',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = toSameOriginUrl(event.notification.data?.url);
  const absoluteTargetUrl = new URL(targetUrl, self.location.origin).toString();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url === absoluteTargetUrl) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
