/* ==========================================================================
   Service worker — makes the whole site work offline after the first visit.

   Strategy: precache everything listed below on install, then serve
   "stale-while-revalidate": answer from the cache immediately, and refresh
   the cached copy in the background so edits appear on the next visit.

   The block between the PRECACHE markers is rewritten by
   tools/update_precache.py (it also derives CACHE_VERSION from file hashes,
   so a changed file invalidates old caches automatically). Run it after
   adding or replacing images or code, before pushing to GitHub.
   ========================================================================== */

// >>> PRECACHE (generated)
const CACHE_VERSION = '4cd49ff0f8f6';
const PRECACHE = [
  './',
  './index.html',
  './shared/core.js',
  './shared/theme.css',
  './games/cipher/config.js',
  './games/cipher/game.css',
  './games/cipher/game.js',
  './games/cipher/index.html',
  './games/cipher/',
  './games/hunt/config.js',
  './games/hunt/game.css',
  './games/hunt/game.js',
  './games/hunt/index.html',
  './games/hunt/',
  './games/paint/config.js',
  './games/paint/game.css',
  './games/paint/game.js',
  './games/paint/index.html',
  './games/paint/',
  './games/rotate/config.js',
  './games/rotate/game.css',
  './games/rotate/game.js',
  './games/rotate/index.html',
  './games/rotate/',
  './games/scratch/config.js',
  './games/scratch/game.css',
  './games/scratch/game.js',
  './games/scratch/index.html',
  './games/scratch/',
  './games/wordsearch/config.js',
  './games/wordsearch/game.css',
  './games/wordsearch/game.js',
  './games/wordsearch/index.html',
  './games/wordsearch/',
  './assets/images/cipher-1.jpg',
  './assets/images/hunt-1.jpg',
  './assets/images/hunt-2.jpg',
  './assets/images/paint-1.jpg',
  './assets/images/rotate-1.jpg',
  './assets/images/rotate-2.jpg',
  './assets/images/scratch-1.jpg',
  './assets/images/scratch-2.jpg',
  './assets/images/scratch-3.jpg',
  './assets/images/wordsearch-1.jpg'
];
// <<< PRECACHE

const CACHE_NAME = 'scrapbook-' + CACHE_VERSION;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Add files one by one so a single missing file cannot abort the install.
    await Promise.all(PRECACHE.map(async url => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (err) { console.warn('Precache failed for', url, err); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(n => n.startsWith('scrapbook-') && n !== CACHE_NAME)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });   // ?calibrate=1 etc.
    const refresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) { event.waitUntil(refresh); return cached; }          // refresh in the background
    const fresh = await refresh;
    return fresh || new Response('Offline and not cached.', { status: 503 });
  })());
});
