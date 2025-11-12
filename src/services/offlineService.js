// services/offlineService.js
import { dbManager } from '../utils/indexedDB.js';

class OfflineService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.init();
  }

  init() {
    // Escuchar cambios de conexión
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    console.log('🌐 Servicio offline inicializado. Estado:', this.isOnline ? 'online' : 'offline');
  }

  handleOnline() {
    this.isOnline = true;
    console.log('✅ Conexión restaurada - Sincronizando datos...');
    
    // Emitir evento personalizado
    window.dispatchEvent(new CustomEvent('connectionChange', { 
      detail: { online: true } 
    }));

    // Intentar sincronización automática
    this.syncPendingData();
  }

  handleOffline() {
    this.isOnline = false;
    console.log('🔌 Sin conexión - Modo offline activado');
    
    window.dispatchEvent(new CustomEvent('connectionChange', { 
      detail: { online: false } 
    }));
  }

  async syncPendingData() {
    try {
      // Sincronizar posts pendientes a través del Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_PENDING_POSTS',
          data: { source: 'connection-restored' }
        });
      }
      
      console.log('🔄 Sincronización automática iniciada');
    } catch (error) {
      console.error('❌ Error en sincronización automática:', error);
    }
  }

  getConnectionStatus() {
    return {
      online: this.isOnline,
      lastSync: localStorage.getItem('lastSync'),
      pendingItems: localStorage.getItem('pendingItems') || 0,
      timestamp: new Date().toISOString()
    };
  }

  // Cache estratégico para recursos importantes
  async cacheCriticalResources() {
    if ('caches' in window) {
      try {
        const cache = await caches.open('critical-resources-v1');
        const resources = [
          '/',
          '/index.html',
          '/src/main.jsx',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png'
        ];
        
        await cache.addAll(resources);
        console.log('✅ Recursos críticos cacheados');
      } catch (error) {
        console.log('⚠️ Error cacheando recursos:', error);
      }
    }
  }

  // Verificar si un recurso está en cache
  async isResourceCached(url) {
    if (!('caches' in window)) return false;
    
    try {
      const cache = await caches.open('critical-resources-v1');
      const response = await cache.match(url);
      return !!response;
    } catch (error) {
      return false;
    }
  }

  // Obtener estadísticas del cache
  async getCacheStats() {
    if (!('caches' in window)) {
      return { supported: false };
    }

    try {
      const cacheNames = await caches.keys();
      const stats = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        stats[cacheName] = requests.length;
      }

      return {
        supported: true,
        caches: stats,
        totalCached: Object.values(stats).reduce((sum, count) => sum + count, 0)
      };
    } catch (error) {
      return {
        supported: true,
        error: error.message
      };
    }
  }

  // Limpiar cache
  async clearCache() {
    if (!('caches' in window)) return false;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      
      console.log('🗑️ Cache limpiado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error limpiando cache:', error);
      return false;
    }
  }

  // Simular modo offline para testing
  simulateOffline() {
    this.isOnline = false;
    window.dispatchEvent(new Event('offline'));
    console.log('🧪 Modo offline simulado');
  }

  simulateOnline() {
    this.isOnline = true;
    window.dispatchEvent(new Event('online'));
    console.log('🧪 Modo online simulado');
  }
}

// Crear instancia global
export const offlineService = new OfflineService();

// También exportar funciones individuales para uso directo
export const getConnectionStatus = () => offlineService.getConnectionStatus();
export const cacheCriticalResources = () => offlineService.cacheCriticalResources();
export const getCacheStats = () => offlineService.getCacheStats();
export const clearCache = () => offlineService.clearCache();