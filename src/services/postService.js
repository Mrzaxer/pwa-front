import { dbManager } from '../utils/indexedDB.js';

class PostService {
  // Intentar enviar post normalmente, si falla guardar en IndexedDB
  async sendPost(endpoint, data) {
    try {
      console.log('📤 Intentando enviar POST a:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log('✅ POST enviado exitosamente');
        return await response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.log('❌ Error enviando POST, guardando en IndexedDB:', error.message);
      
      // Guardar en IndexedDB
      const postId = await dbManager.savePendingPost({
        endpoint,
        data,
        method: 'POST'
      });
      
      // Registrar sync para background sync
      await this.registerBackgroundSync();
      
      return {
        success: false,
        message: 'Post guardado localmente, se enviará cuando haya conexión',
        localId: postId
      };
    }
  }

  // Registrar background sync
  async registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('pending-posts-sync');
        console.log('🔄 Background Sync registrado');
      } catch (error) {
        console.log('❌ Error registrando Background Sync:', error);
      }
    } else {
      console.log('⚠️ Background Sync no soportado');
    }
  }

  // Sincronizar manualmente (para testing)
  async syncPendingPosts() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_PENDING_POSTS'
      });
    }
  }
}

export const postService = new PostService();