import { apiService } from './api.js';

class NotificationService {
  constructor() {
    this.publicVapidKey = 'BNp1ar-IkRx3TxfzMcRU26UTyd9J5gVDBlsgdIotdBXI3WvpBOhBT6taVXyZURzeDIe0aTb7Ly9251wu8EFVTYI';
  }

  // Verificar compatibilidad
  isSupported() {
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }

  // Solicitar permiso para notificaciones
  async requestPermission() {
    if (!this.isSupported()) {
      console.log('❌ Este navegador no soporta notificaciones push');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Permiso para notificaciones ya concedido');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('❌ Permiso para notificaciones denegado');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Permiso para notificaciones concedido');
        return true;
      } else {
        console.log('❌ Permiso para notificaciones denegado');
        return false;
      }
    } catch (error) {
      console.error('❌ Error solicitando permiso:', error);
      return false;
    }
  }

  // Suscribirse a notificaciones push
  async subscribeToPush() {
    if (!this.isSupported()) {
      console.log('❌ Notificaciones push no soportadas');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      // Si ya está suscrito, usar esa suscripción
      if (subscription) {
        console.log('📱 Usuario ya suscrito a notificaciones push');
        return subscription;
      }

      // Crear nueva suscripción
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicVapidKey)
      });

      console.log('📱 Nueva suscripción push creada');

      // Enviar suscripción al servidor
      await apiService.subscribeToPush(subscription);

      return subscription;
    } catch (error) {
      if (Notification.permission === 'denied') {
        console.log('❌ Permiso para notificaciones denegado por el usuario');
      } else {
        console.error('❌ Error suscribiendo a push:', error);
      }
      return null;
    }
  }

  // Convertir clave pública a Uint8Array
  urlBase64ToUint8Array(base64String) {
    try {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (error) {
      console.error('❌ Error convirtiendo VAPID key:', error);
      throw new Error('Clave VAPID inválida');
    }
  }

  // Enviar notificación de prueba
  async sendTestNotification() {
    try {
      const result = await apiService.sendNotification(
        '¡Hola desde Mi PWA! 👋',
        'Esta es una notificación push de prueba desde el frontend',
        '/icons/icon-192x192.png',
        '/'
      );
      
      console.log('📤 Notificación enviada:', result);
      return result;
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
      throw error;
    }
  }

  // Verificar si el usuario está suscrito
  async isSubscribed() {
    if (!this.isSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.error('❌ Error verificando suscripción:', error);
      return false;
    }
  }

  // Desuscribirse
  async unsubscribe() {
    if (!this.isSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        console.log('📱 Usuario desuscrito de notificaciones push');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error desuscribiendo:', error);
      return false;
    }
  }

  // Obtener estado completo de notificaciones
  async getNotificationStatus() {
    const supported = this.isSupported();
    const permission = Notification.permission;
    const subscribed = supported ? await this.isSubscribed() : false;
    
    return {
      supported,
      permission,
      subscribed,
      vapidKey: this.publicVapidKey ? '✅ Configurada' : '❌ No configurada'
    };
  }

  // Enviar notificación personalizada
  async sendCustomNotification(title, options = {}) {
    return await apiService.sendNotification(
      title,
      options.body || '',
      options.icon || '/icons/icon-192x192.png',
      options.url || '/'
    );
  }
}

export const notificationService = new NotificationService();