const API_BASE_URL = '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
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
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options
    };

    // Agregar body si existe y es un objeto
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
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
  async login(email, password) {
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

  async register(username, email, password) {
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
  async getImages() {
    return await this.request('/images');
  }

  async getImageById(id) {
    return await this.request(`/images/${id}`);
  }

  // Push notifications endpoints
  async subscribeToPush(subscription) {
    return await this.request('/push/subscribe', {
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

  async getPushStats() {
    return await this.request('/push/stats');
  }

  // Health check
  async healthCheck() {
    return await this.request('/health');
  }

  // Verificar si el backend está disponible
  async isBackendAvailable() {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const apiService = new ApiService();