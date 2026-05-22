const CACHE_NAME = 'agent-catalog-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/app/index.html',
  '/pages/main.js',
  '/script.js',
  '/style.css',
  '/manifest.json',
  '/data.csv'
];

// Устанавливаем Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Установка...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование файлов');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[SW] Ошибка кэширования:', err);
      })
  );
  // Активируем сразу
  self.skipWaiting();
});

// Перехват запросов
self.addEventListener('fetch', event => {
  // Пропускаем неподходящие запросы
  const requestUrl = new URL(event.request.url);
  
  // Не кэшируем запросы к API Google Sheets (динамические данные)
  if (requestUrl.href.includes('script.google.com')) {
    return;
  }
  
  // Не кэшируем POST, PUT, DELETE
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Не кэшируем аналитику и трекеры
  if (requestUrl.pathname.includes('analytics') || requestUrl.pathname.includes('tracking')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Если есть в кэше — возвращаем
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Иначе запрашиваем из сети
        return fetch(event.request)
          .then(networkResponse => {
            // Проверяем, что получили валидный ответ
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Клонируем ответ для сохранения в кэш
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(() => {
            // Если сеть недоступна и файла нет в кэше — возвращаем fallback
            console.warn('[SW] Офлайн режим, запрос не найден в кэше:', event.request.url);
            
            // Для навигационных запросов возвращаем index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // Для остальных запросов — ошибка
            return new Response('Вы офлайн. Некоторые данные недоступны.', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Активация — удаляем старые кэши
self.addEventListener('activate', event => {
  console.log('[SW] Активация...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Захватываем контроль над всеми клиентами
  event.waitUntil(clients.claim());
});

// Обработка сообщений от клиента
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
