// utils/indexedDB.js
const DB_NAME = 'PWA_PostsDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_posts';

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.isOpening = false;
    this.openQueue = [];
  }

  // Abrir/Crear la base de datos (con manejo de cola)
  async openDB() {
    if (this.db) return this.db;
    
    if (this.isOpening) {
      return new Promise((resolve) => {
        this.openQueue.push(resolve);
      });
    }

    this.isOpening = true;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.isOpening = false;
        this.processQueue(null);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isOpening = false;
        
        // Manejar cierre inesperado
        this.db.onclose = () => {
          console.log('⚠️ Conexión a IndexedDB cerrada');
          this.db = null;
        };
        
        this.db.onerror = (event) => {
          console.error('❌ Error en IndexedDB:', event.target.error);
        };
        
        resolve(this.db);
        this.processQueue(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('🔄 Actualizando IndexedDB a versión:', DB_VERSION);
        
        // Crear object store si no existe
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // Crear índices para búsquedas
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('endpoint', 'endpoint', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('attempts', 'attempts', { unique: false });
          
          console.log('✅ ObjectStore creado:', STORE_NAME);
        }
      };

      request.onblocked = () => {
        console.warn('⚠️ IndexedDB bloqueado por versión antigua abierta');
      };
    });
  }

  processQueue(db) {
    while (this.openQueue.length > 0) {
      const resolve = this.openQueue.shift();
      resolve(db);
    }
  }

  // Verificar si IndexedDB es soportado
  isSupported() {
    return 'indexedDB' in window;
  }

  // Guardar post pendiente (mejorado)
  async savePendingPost(postData) {
    if (!this.isSupported()) {
      throw new Error('IndexedDB no es soportado en este navegador');
    }

    try {
      await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const postWithMetadata = {
          ...postData,
          timestamp: Date.now(),
          attempts: 0,
          status: 'pending',
          lastAttempt: null
        };
        
        const request = store.add(postWithMetadata);
        
        request.onsuccess = () => {
          console.log('📝 Post guardado en IndexedDB. ID:', request.result);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('❌ Error guardando post:', request.error);
          reject(request.error);
        };

        transaction.oncomplete = () => {
          console.log('✅ Transacción completada para guardar post');
        };

        transaction.onerror = () => {
          console.error('❌ Error en transacción:', transaction.error);
        };
      });
    } catch (error) {
      console.error('❌ Error en savePendingPost:', error);
      throw error;
    }
  }

  // Obtener todos los posts pendientes (mejorado)
  async getAllPendingPosts() {
    if (!this.isSupported()) {
      console.warn('⚠️ IndexedDB no soportado, retornando array vacío');
      return [];
    }

    try {
      await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
          console.log(`📊 Obtenidos ${request.result.length} posts pendientes`);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('❌ Error obteniendo posts:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error en getAllPendingPosts:', error);
      return [];
    }
  }

  // Obtener posts por estado
  async getPostsByStatus(status = 'pending') {
    try {
      const allPosts = await this.getAllPendingPosts();
      return allPosts.filter(post => post.status === status);
    } catch (error) {
      console.error('❌ Error obteniendo posts por estado:', error);
      return [];
    }
  }

  // Eliminar post pendiente (mejorado)
  async deletePendingPost(id) {
    if (!this.isSupported()) {
      throw new Error('IndexedDB no es soportado');
    }

    try {
      await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => {
          console.log('🗑️ Post eliminado de IndexedDB. ID:', id);
          resolve();
        };
        
        request.onerror = () => {
          console.error('❌ Error eliminando post:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error en deletePendingPost:', error);
      throw error;
    }
  }

  // Actualizar intentos de un post (mejorado)
  async updatePostAttempts(id, attempts) {
    if (!this.isSupported()) {
      throw new Error('IndexedDB no es soportado');
    }

    try {
      await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const post = getRequest.result;
          if (post) {
            post.attempts = attempts;
            post.lastAttempt = Date.now();
            
            // Cambiar estado si hay muchos intentos fallidos
            if (attempts >= 3) {
              post.status = 'failed';
            }
            
            const updateRequest = store.put(post);
            updateRequest.onsuccess = () => {
              console.log(`🔄 Post ${id} actualizado. Intentos: ${attempts}`);
              resolve();
            };
            updateRequest.onerror = () => {
              console.error('❌ Error actualizando post:', updateRequest.error);
              reject(updateRequest.error);
            };
          } else {
            reject(new Error(`Post con ID ${id} no encontrado`));
          }
        };
        
        getRequest.onerror = () => {
          console.error('❌ Error obteniendo post:', getRequest.error);
          reject(getRequest.error);
        };
      });
    } catch (error) {
      console.error('❌ Error en updatePostAttempts:', error);
      throw error;
    }
  }

  // Actualizar estado de un post
  async updatePostStatus(id, status) {
    try {
      await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const post = getRequest.result;
          if (post) {
            post.status = status;
            post.lastAttempt = Date.now();
            
            const updateRequest = store.put(post);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            reject(new Error('Post no encontrado'));
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      console.error('❌ Error en updatePostStatus:', error);
      throw error;
    }
  }

  // Obtener estadísticas de la base de datos
  async getStats() {
    try {
      const allPosts = await this.getAllPendingPosts();
      const pending = allPosts.filter(p => p.status === 'pending').length;
      const failed = allPosts.filter(p => p.status === 'failed').length;
      const totalAttempts = allPosts.reduce((sum, post) => sum + post.attempts, 0);
      
      return {
        total: allPosts.length,
        pending,
        failed,
        totalAttempts,
        avgAttempts: allPosts.length > 0 ? (totalAttempts / allPosts.length).toFixed(2) : 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return { total: 0, pending: 0, failed: 0, totalAttempts: 0, avgAttempts: 0 };
    }
  }

  // Limpiar todos los posts (para desarrollo)
  async clearAllPosts() {
    if (!this.isSupported()) return;

    try {
      await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('🗑️ Todos los posts eliminados de IndexedDB');
          resolve();
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Error limpiando posts:', error);
      throw error;
    }
  }

  // Cerrar conexión (para limpieza)
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('🔒 Conexión a IndexedDB cerrada');
    }
  }
}

export const dbManager = new IndexedDBManager();