const CACHE_STATIC = 'app_shell_v2.0';
const CACHE_DYNAMIC = 'dynamic_cache_v2.0';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-128x128.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png'
];

// Instalación
self.addEventListener('install', (event) => {
  console.log('🔄 SW: Instalando...');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        console.log('📦 Cacheando App Shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación
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

// Background Sync - Sincronizar posts pendientes
self.addEventListener('sync', (event) => {
  console.log('🔄 Evento sync:', event.tag);
  
  if (event.tag === 'pending-posts-sync') {
    event.waitUntil(syncPendingPosts());
  }
});

// Mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_PENDING_POSTS') {
    console.log('📡 Sincronización manual solicitada');
    syncPendingPosts();
  }
});

// Función para sincronizar posts pendientes
async function syncPendingPosts() {
  try {
    console.log('🔄 Iniciando sincronización de posts pendientes...');
    
    // Obtener todos los clientes (pestañas abiertas)
    const clients = await self.clients.matchAll();
    
    // Enviar mensaje a todos los clientes para obtener posts pendientes
    clients.forEach(client => {
      client.postMessage({
        type: 'GET_PENDING_POSTS'
      });
    });
    
  } catch (error) {
    console.log('❌ Error en syncPendingPosts:', error);
  }
}

// Interceptar mensajes del cliente para procesar posts
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'PROCESS_PENDING_POSTS') {
    const { posts } = event.data;
    console.log(`📦 Procesando ${posts.length} posts pendientes`);
    
    for (const post of posts) {
      await processPendingPost(post);
    }
  }
});

// Procesar un post pendiente individual
async function processPendingPost(post) {
  try {
    console.log(`🔄 Procesando post ${post.id}:`, post.endpoint);
    
    const response = await fetch(post.endpoint, {
      method: post.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post.data),
    });

    if (response.ok) {
      console.log(`✅ Post ${post.id} sincronizado exitosamente`);
      
      // Eliminar de IndexedDB (a través del cliente)
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'DELETE_PENDING_POST',
          postId: post.id
        });
      });
      
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Error sincronizando post ${post.id}:`, error.message);
    
    // Incrementar intentos (a través del cliente)
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_POST_ATTEMPTS',
        postId: post.id,
        attempts: (post.attempts || 0) + 1
      });
    });
  }
}

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