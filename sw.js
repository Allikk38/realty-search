const CACHE_NAME = 'agent-catalog-v2'; // сменили версию
const urlsToCache = [
  '/',
  '/index.html',
  '/app/index.html',
  '/pages/main.js',
  '/script.js',
  '/style.css',
  '/manifest.json',
  '/data.csv'  // если нужно кэшировать данные
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});
