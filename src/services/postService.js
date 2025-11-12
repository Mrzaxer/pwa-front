import { apiService } from './api.js';
import { dbManager } from '../utils/indexedDB.js';
import { offlineService } from './offlineService.js';

class PostService {
  constructor() {
    this.syncInProgress = false;
  }

  // Enviar post - intenta con backend, si falla guarda en IndexedDB
  async sendPost(title, content, image = null) {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const postData = {
      title,
      content,
      image,
      author: user.username || 'Usuario',
      authorId: user.id || null,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    try {
      console.log('📤 Intentando enviar POST al backend');
      
      // Verificar si estamos online
      if (!offlineService.isOnline) {
        throw new Error('Sin conexión a internet');
      }

      // Verificar si el backend está disponible
      const isBackendAvailable = await apiService.isBackendAvailable();
      
      if (!isBackendAvailable) {
        throw new Error('Backend no disponible');
      }

      // Envío real al backend (reemplaza con tu endpoint real)
      const response = await this.sendToBackend(postData);
      
      console.log('✅ POST enviado exitosamente al backend');
      return {
        success: true,
        message: 'Post publicado exitosamente',
        data: response
      };
      
    } catch (error) {
      console.log('❌ Error enviando POST, guardando en IndexedDB:', error.message);
      
      // Guardar en IndexedDB para sincronización posterior
      const postId = await this.savePostOffline(postData);
      
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

  // Envío real al backend
  async sendToBackend(postData) {
    // Aquí va tu lógica real de envío al backend
    // Por ahora simulamos el envío
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simular éxito 90% del tiempo, error 10%
        if (Math.random() > 0.1) {
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            ...postData,
            status: 'published',
            publishedAt: new Date().toISOString()
          });
        } else {
          reject(new Error('Error del servidor al publicar post'));
        }
      }, 1000);
    });
  }

  // Guardar post offline
  async savePostOffline(postData) {
    const postId = await dbManager.savePendingPost({
      endpoint: '/api/posts',
      data: postData,
      method: 'POST',
      timestamp: Date.now(),
      type: 'post'
    });

    // Actualizar contador de items pendientes
    this.updatePendingItemsCount();
    
    return postId;
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
    if (this.syncInProgress) {
      console.log('🔄 Sincronización ya en progreso...');
      return { success: false, message: 'Sincronización en progreso' };
    }

    this.syncInProgress = true;

    try {
      console.log('🔄 Iniciando sincronización manual de posts...');
      
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_PENDING_POSTS',
          data: { manual: true }
        });
      }

      const result = await this.processPendingPosts();
      console.log('✅ Sincronización manual completada');
      return result;

    } catch (error) {
      console.error('❌ Error en sincronización manual:', error);
      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Obtener posts pendientes de IndexedDB
  async getPendingPosts() {
    try {
      const posts = await dbManager.getAllPendingPosts();
      return posts.filter(post => post.type === 'post');
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
      
      // Actualizar contador
      this.updatePendingItemsCount();
      
      return true;
    } catch (error) {
      console.error('❌ Error eliminando post pendiente:', error);
      return false;
    }
  }

  // Procesar posts pendientes (usado por el Service Worker)
  async processPendingPosts() {
    if (this.syncInProgress) {
      return { success: false, message: 'Sincronización en progreso' };
    }

    this.syncInProgress = true;

    try {
      const pendingPosts = await this.getPendingPosts();
      console.log(`🔄 Procesando ${pendingPosts.length} posts pendientes`);
      
      if (pendingPosts.length === 0) {
        return { 
          success: true, 
          message: 'No hay posts pendientes para sincronizar',
          processed: 0,
          successCount: 0,
          errorCount: 0
        };
      }

      let successCount = 0;
      let errorCount = 0;
      const results = [];

      for (const post of pendingPosts) {
        try {
          // Intentar enviar al backend
          const result = await this.sendToBackend(post.data);
          
          // Marcar como exitoso y eliminar de IndexedDB
          await this.deletePendingPost(post.id);
          successCount++;
          
          results.push({
            id: post.id,
            success: true,
            data: result
          });
          
          console.log(`✅ Post ${post.id} sincronizado exitosamente`);

        } catch (error) {
          errorCount++;
          
          // Actualizar intentos
          const updatedAttempts = (post.attempts || 0) + 1;
          await dbManager.updatePostAttempts(post.id, updatedAttempts);

          // Si hay muchos intentos fallidos, marcar como fallido
          if (updatedAttempts >= 3) {
            await dbManager.updatePostStatus(post.id, 'failed');
          }

          results.push({
            id: post.id,
            success: false,
            error: error.message,
            attempts: updatedAttempts
          });

          console.error(`❌ Error sincronizando post ${post.id}:`, error);
        }
      }

      // Guardar última sincronización
      localStorage.setItem('lastSync', new Date().toISOString());

      return {
        success: true,
        processed: pendingPosts.length,
        successCount,
        errorCount,
        results
      };

    } catch (error) {
      console.error('❌ Error procesando posts pendientes:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Verificar estado de la sincronización
  async getSyncStatus() {
    const pendingPosts = await this.getPendingPosts();
    const backgroundSyncSupported = 'SyncManager' in window;
    const lastSync = localStorage.getItem('lastSync');
    
    return {
      pendingPosts: pendingPosts.length,
      backgroundSyncSupported,
      lastSync: lastSync ? new Date(lastSync).toLocaleString() : 'Nunca',
      syncInProgress: this.syncInProgress,
      online: offlineService.isOnline
    };
  }

  // Obtener estadísticas de posts
  async getPostStats() {
    const pendingPosts = await this.getPendingPosts();
    const allPosts = await dbManager.getAllPendingPosts();
    
    const stats = {
      totalPending: pendingPosts.length,
      totalAttempts: pendingPosts.reduce((sum, post) => sum + (post.attempts || 0), 0),
      failedPosts: pendingPosts.filter(post => post.status === 'failed').length,
      recentPosts: pendingPosts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
    };

    return stats;
  }

  // Actualizar contador de items pendientes
  updatePendingItemsCount() {
    this.getPendingPosts().then(posts => {
      localStorage.setItem('pendingItems', posts.length);
      
      // Emitir evento de cambio
      window.dispatchEvent(new CustomEvent('pendingItemsChange', {
        detail: { count: posts.length }
      }));
    });
  }

  // Limpiar posts fallidos
  async clearFailedPosts() {
    try {
      const pendingPosts = await this.getPendingPosts();
      const failedPosts = pendingPosts.filter(post => post.status === 'failed');
      
      for (const post of failedPosts) {
        await dbManager.deletePendingPost(post.id);
      }
      
      console.log(`🗑️ ${failedPosts.length} posts fallidos eliminados`);
      this.updatePendingItemsCount();
      
      return {
        success: true,
        deleted: failedPosts.length
      };
    } catch (error) {
      console.error('❌ Error limpiando posts fallidos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Reintentar posts fallidos
  async retryFailedPosts() {
    try {
      const pendingPosts = await this.getPendingPosts();
      const failedPosts = pendingPosts.filter(post => post.status === 'failed');
      
      for (const post of failedPosts) {
        await dbManager.updatePostStatus(post.id, 'pending');
        await dbManager.updatePostAttempts(post.id, 0);
      }
      
      console.log(`🔄 ${failedPosts.length} posts fallidos marcados para reintento`);
      
      // Iniciar sincronización
      await this.syncPendingPosts();
      
      return {
        success: true,
        retried: failedPosts.length
      };
    } catch (error) {
      console.error('❌ Error reintentando posts fallidos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const postService = new PostService();