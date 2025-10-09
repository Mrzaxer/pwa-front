// Configuración de IndexedDB para almacenar posts pendientes
const DB_NAME = 'PWA_PostsDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_posts';

class IndexedDBManager {
  constructor() {
    this.db = null;
  }

  // Abrir/Crear la base de datos
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Crear object store si no existe
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // Crear índices para búsquedas
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('endpoint', 'endpoint', { unique: false });
        }
      };
    });
  }

  // Guardar post pendiente
  async savePendingPost(postData) {
    await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const postWithMetadata = {
        ...postData,
        timestamp: Date.now(),
        attempts: 0,
        status: 'pending'
      };
      
      const request = store.add(postWithMetadata);
      
      request.onsuccess = () => {
        console.log('📝 Post guardado en IndexedDB:', request.result);
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener todos los posts pendientes
  async getAllPendingPosts() {
    await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar post pendiente (cuando se sincroniza exitosamente)
  async deletePendingPost(id) {
    await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('🗑️ Post eliminado de IndexedDB:', id);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Actualizar intentos de un post
  async updatePostAttempts(id, attempts) {
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
          
          const updateRequest = store.put(post);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Post no encontrado'));
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

export const dbManager = new IndexedDBManager();