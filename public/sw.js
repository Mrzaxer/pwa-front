const CACHE_STATIC = 'app_shell_v1.4';
const CACHE_DYNAMIC = 'dynamic_cache_v1.4';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/manifest.json',
  '/icons/icon48.png',
  '/icons/icon64.png',
  '/icons/icon128.png',
  '/icons/icon256.png'
];

// Instalación
self.addEventListener('install', (event) => {
  console.log('🔄 SW: Instalando...');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        console.log('📦 Cacheando App Shell e íconos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación (se mantiene igual)
self.addEventListener('activate', (event) => {
  console.log('✅ SW: Activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_STATIC && cacheName !== CACHE_DYNAMIC) {
            console.log('🗑️ Eliminando cache vieja:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch (se mantiene igual)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            
            if (!event.request.url.includes('/api/')) {
              caches.open(CACHE_DYNAMIC)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return networkResponse;
          })
          .catch((error) => {
            console.log('🌐 Modo offline');
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            return new Response('🔌 Sin conexión');
          });
      })
  );
});