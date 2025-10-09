import { dbManager } from './indexedDB.js';

class SWMessaging {
  constructor() {
    this.init();
  }

  init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleSWMessage.bind(this));
    }
  }

  // Manejar mensajes del Service Worker
  async handleSWMessage(event) {
    const { type, postId, attempts } = event.data;
    
    switch (type) {
      case 'GET_PENDING_POSTS':
        await this.sendPendingPostsToSW();
        break;
        
      case 'DELETE_PENDING_POST':
        await dbManager.deletePendingPost(postId);
        break;
        
      case 'UPDATE_POST_ATTEMPTS':
        await dbManager.updatePostAttempts(postId, attempts);
        break;
        
      default:
        console.log('📨 Mensaje del SW:', event.data);
    }
  }

  // Enviar posts pendientes al Service Worker
  async sendPendingPostsToSW() {
    const pendingPosts = await dbManager.getAllPendingPosts();
    
    if (pendingPosts.length > 0) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PROCESS_PENDING_POSTS',
        posts: pendingPosts
      });
    }
  }

  // Enviar mensaje al SW
  sendMessage(message) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }
}

export const swMessaging = new SWMessaging();