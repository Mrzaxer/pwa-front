// services/api.js
class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.baseUrl = 'https://pwa-back-xmqw.onrender.com/api';
  }

  setToken(token) {
    this.token = token;
    if (token) {  
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options
    };

    // Agregar body si existe y es un objeto
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      console.log(`🌐 Haciendo petición a: ${url}`);
      const response = await fetch(url, config);
      
      // Si no hay contenido, retornar éxito
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `Error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`❌ Error en ${endpoint}:`, error);
      
      // Si es error de red (offline), lanzar error específico
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Error de conexión. Verifica tu conexión a internet.');
      }
      
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password, customBaseUrl = null) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    }
    
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    
    if (data.success && data.token) {
      this.setToken(data.token);
      // Guardar usuario en localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  }

  async register(username, email, password, customBaseUrl = null) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    }
    
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: { username, email, password }
    });
    
    if (data.success && data.token) {
      this.setToken(data.token);
      // Guardar usuario en localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  }

  async getProfile() {
    return await this.request('/auth/profile');
  }

  async updateProfile(username) {
    return await this.request('/auth/profile', {
      method: 'PUT',
      body: { username }
    });
  }

  async changePassword(currentPassword, newPassword) {
    return await this.request('/auth/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword }
    });
  }

  // Images endpoints
  async getImages(customBaseUrl = null) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    }
    return await this.request('/images');
  }

  async getImageById(id) {
    return await this.request(`/images/${id}`);
  }

  // Push notifications endpoints
  async subscribeToPush(subscription, customBaseUrl = null) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    }
    return await this.request('/push/subscribe', {
      method: 'POST',
      body: { subscription }
    });
  }

  async unsubscribeFromPush(subscription, customBaseUrl = null) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    }
    return await this.request('/push/unsubscribe', {
      method: 'POST',
      body: { subscription }
    });
  }

  async sendNotification(title, message = '', icon = '', url = '/') {
    return await this.request('/push/send', {
      method: 'POST',
      body: { title, message, icon, url }
    });
  }

  async sendTestNotification(customBaseUrl = null) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    }
    return await this.request('/push/test', {
      method: 'POST'
    });
  }

  async getPushStats() {
    return await this.request('/push/stats');
  }

  // Posts endpoints
  async createPost(title, content, customBaseUrl = null) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    }
    return await this.request('/posts', {
      method: 'POST',
      body: { title, content }
    });
  }

  async getPosts() {
    return await this.request('/posts');
  }

  async getPostById(id) {
    return await this.request(`/posts/${id}`);
  }

  async updatePost(id, title, content) {
    return await this.request(`/posts/${id}`, {
      method: 'PUT',
      body: { title, content }
    });
  }

  async deletePost(id) {
    return await this.request(`/posts/${id}`, {
      method: 'DELETE'
    });
  }

  // Health check
  async healthCheck(customBaseUrl = null) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    }
    return await this.request('/health');
  }

  // Verificar si el backend está disponible
  async isBackendAvailable(customBaseUrl = null) {
    try {
      await this.healthCheck(customBaseUrl);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Método para cambiar la URL base dinámicamente
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  // Método para obtener la URL base actual
  getBaseUrl() {
    return this.baseUrl;
  }
}

export const apiService = new ApiService();