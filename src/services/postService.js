import { apiService } from './api.js';
import { dbManager } from '../utils/indexedDB.js';

class PostService {
  // Enviar post - intenta con backend, si falla guarda en IndexedDB
  async sendPost(title, content) {
    const postData = {
      title,
      content,
      author: JSON.parse(localStorage.getItem('user'))?.username || 'Usuario',
      timestamp: new Date().toISOString()
    };

    try {
      console.log('📤 Intentando enviar POST al backend');
      
      // Verificar si el backend está disponible primero
      const isBackendAvailable = await apiService.isBackendAvailable();
      
      if (!isBackendAvailable) {
        throw new Error('Backend no disponible');
      }

      // Aquí puedes usar tu endpoint real cuando lo implementes
      // Por ahora simulamos el envío
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simular éxito 80% del tiempo, error 20%
          if (Math.random() > 0.2) {
            resolve();
          } else {
            reject(new Error('Error simulado del servidor'));
          }
        }, 1000);
      });

      console.log('✅ POST enviado exitosamente al backend');
      return {
        success: true,
        message: 'Post publicado exitosamente'
      };
      
    } catch (error) {
      console.log('❌ Error enviando POST, guardando en IndexedDB:', error.message);
      
      // Guardar en IndexedDB para sincronización posterior
      const postId = await dbManager.savePendingPost({
        endpoint: '/api/posts',
        data: postData,
        method: 'POST',
        timestamp: Date.now()
      });
      
      // Registrar background sync
      await this.registerBackgroundSync();
      
      return {
        success: false,
        message: 'Post guardado localmente. Se enviará automáticamente cuando recuperes conexión.',
        localId: postId,
        offline: true
      };
    }
  }

  // Registrar background sync
  async registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('pending-posts-sync');
        console.log('🔄 Background Sync registrado para posts pendientes');
        return true;
      } catch (error) {
        console.log('❌ Error registrando Background Sync:', error);
        return false;
      }
    } else {
      console.log('⚠️ Background Sync no soportado en este navegador');
      return false;
    }
  }

  // Sincronizar manualmente posts pendientes
  async syncPendingPosts() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_PENDING_POSTS'
      });
      console.log('🔄 Sincronización manual de posts iniciada');
      return true;
    } else {
      console.log('❌ Service Worker no disponible para sincronización');
      return false;
    }
  }

  // Obtener posts pendientes de IndexedDB
  async getPendingPosts() {
    try {
      const posts = await dbManager.getAllPendingPosts();
      return posts;
    } catch (error) {
      console.error('❌ Error obteniendo posts pendientes:', error);
      return [];
    }
  }

  // Eliminar post pendiente (cuando se sincroniza exitosamente)
  async deletePendingPost(postId) {
    try {
      await dbManager.deletePendingPost(postId);
      console.log(`🗑️ Post pendiente ${postId} eliminado`);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando post pendiente:', error);
      return false;
    }
  }

  // Procesar posts pendientes (usado por el Service Worker)
  async processPendingPosts() {
    try {
      const pendingPosts = await this.getPendingPosts();
      console.log(`🔄 Procesando ${pendingPosts.length} posts pendientes`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const post of pendingPosts) {
        try {
          // Simular envío al backend (reemplaza con tu lógica real)
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Marcar como exitoso y eliminar de IndexedDB
          await this.deletePendingPost(post.id);
          successCount++;
          
          console.log(`✅ Post ${post.id} sincronizado exitosamente`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Error sincronizando post ${post.id}:`, error);
        }
      }

      return {
        success: true,
        processed: pendingPosts.length,
        successCount,
        errorCount
      };
    } catch (error) {
      console.error('❌ Error procesando posts pendientes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verificar estado de la sincronización
  async getSyncStatus() {
    const pendingPosts = await this.getPendingPosts();
    const backgroundSyncSupported = 'SyncManager' in window;
    
    return {
      pendingPosts: pendingPosts.length,
      backgroundSyncSupported,
      lastSync: localStorage.getItem('lastSync') || 'Nunca'
    };
  }
}

export const postService = new PostService();