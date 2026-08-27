/* Dinner service worker
   - index.html and data.json are network-first, but the network only gets
     NET_TIMEOUT ms before the cached copy is served. Stops the app hanging on
     a weak signal at the school gate.
   - Everything else is cache-first with a background refresh.
   - The new worker does not take over until the page asks it to (the parent
     taps the "new version" toast), so a mid-session update never reloads
     under someone's feet.
   Bump CACHE on every deploy that changes a cached asset. */
const CACHE = 'dinner-v29';
const NET_TIMEOUT = 3000;
const ASSETS = [
  './', './index.html', './data.json', './manifest.json',
  './icon-180.png', './icon-192.png', './icon-512.png',
  './fonts/bricolage.woff2', './fonts/hanken.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(timer); resolve(v); }, err => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');
  const isData = url.pathname.endsWith('/data.json');

  if (isHTML || isData) {
    e.respondWith(
      withTimeout(fetch(req), NET_TIMEOUT)
        .then(r => {
          if (r && r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
          return r;
        })
        .catch(() => caches.match(req).then(r => r || (isHTML ? caches.match('./index.html') : Response.error())))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const live = fetch(req).then(r => {
        if (r && r.status === 200) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
        return r;
      }).catch(() => cached);
      return cached || live;
    })
  );
});
