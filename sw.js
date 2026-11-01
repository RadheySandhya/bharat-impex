/* Bharat Impex service worker — makes the app installable and the shell load fast.
 * - API calls: always network (stock data must never be stale).
 * - Hashed build assets: cache-first (file names change on every build).
 * - Page navigations: network-first, cached copy only when offline.
 */
const CACHE = 'bi-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.endsWith('/deploy.php')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('shell', copy));
          return res;
        })
        .catch(() => caches.match('shell'))
    );
    return;
  }

  if (/\/assets\/|\/icons\//.test(url.pathname)) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname, copy));
        }
        return res;
      }))
    );
  }
});
