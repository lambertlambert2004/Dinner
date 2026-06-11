/* School Dinner Menu - service worker
   HTML is network-first so a new deploy shows straight away.
   Other assets are cache-first for speed and offline use. */
const CACHE = 'dinner-v9';
const ASSETS = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req=e.request; if(req.method!=='GET') return;
  const accept=req.headers.get('accept')||'';
  const isHTML = req.mode==='navigate' || accept.includes('text/html');
  if(isHTML){ e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c));return r;}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))); return; }
  e.respondWith(caches.match(req).then(cached=>{ const live=fetch(req).then(r=>{ if(r&&r.status===200){const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c));} return r; }).catch(()=>cached); return cached||live; })); 
});
