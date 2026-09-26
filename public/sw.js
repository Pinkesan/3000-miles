// Service worker: precaches the app shell, cache first; data/*.json network first. Bump VERSION with version.js.
const VERSION = '0.4.0';
const CACHE = '3000-miles-' + VERSION;
const FILES = [
  './',
  './css/app.css',
  './css/fonts.css',
  './data/route.json',
  './data/words.json',
  './fonts/Anuphan-400-latin.woff2',
  './fonts/Anuphan-400-thai.woff2',
  './fonts/Anuphan-600-latin.woff2',
  './fonts/Anuphan-600-thai.woff2',
  './fonts/Overpass-400-latin.woff2',
  './fonts/Overpass-600-latin.woff2',
  './fonts/Overpass-700-italic-latin.woff2',
  './fonts/Overpass-800-latin.woff2',
  './fonts/OverpassMono-600-latin.woff2',
  './img/apple-touch-icon.png',
  './img/favicon.png',
  './img/favicon.svg',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-maskable-512.png',
  './img/icon.svg',
  './index.html',
  './js/arcade.js',
  './js/checkpoint.js',
  './js/components/gauge.js',
  './js/components/odometer.js',
  './js/components/question.js',
  './js/components/stars.js',
  './js/components/wordcard.js',
  './js/components/wordrow.js',
  './js/day.js',
  './js/icons.js',
  './js/main.js',
  './js/plan.js',
  './js/progress.js',
  './js/quiz.js',
  './js/rng.js',
  './js/score.js',
  './js/screens/arcade.js',
  './js/screens/card.js',
  './js/screens/checkpoint.js',
  './js/screens/drive.js',
  './js/screens/home.js',
  './js/screens/map.js',
  './js/screens/postcard.js',
  './js/screens/results.js',
  './js/screens/settings.js',
  './js/screens/word.js',
  './js/screens/words.js',
  './js/sfx.js',
  './js/speech.js',
  './js/srs.js',
  './js/store.js',
  './js/summary.js',
  './js/text.js',
  './js/ui.js',
  './js/version.js',
  './js/wordlist.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('3000-miles-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  try {
    return await fetch(request);
  } catch (err) {
    if (request.mode === 'navigate') {
      const shell = await cache.match('./');
      if (shell) return shell;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  const isData = url.pathname.includes('/data/') && url.pathname.endsWith('.json');
  event.respondWith(isData ? networkFirst(request) : cacheFirst(request));
});
