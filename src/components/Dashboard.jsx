import { useState, useEffect } from 'react';
import { apiService } from '../services/api.js';
import { notificationService } from '../services/notificationService.js';
import { postService } from '../services/postService.js';
import { dbManager } from '../utils/indexedDB.js';
import './Dashboard.css';

const Dashboard = ({ user, onLogout, backendStatus, apiBaseUrl }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbInfo, setDbInfo] = useState(null);
  const [notificationStatus, setNotificationStatus] = useState({
    permission: 'default',
    subscribed: false,
    loading: false
  });
  const [postForm, setPostForm] = useState({
    title: '',
    content: ''
  });
  const [postMessage, setPostMessage] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    fetchImages();
    checkNotificationStatus();
  }, [apiBaseUrl]);

  const checkNotificationStatus = async () => {
    const status = await notificationService.getNotificationStatus();
    setNotificationStatus(prev => ({
      ...prev,
      ...status
    }));
  };

  const fetchImages = async () => {
    try {
      const data = await apiService.getImages(apiBaseUrl);
      setImages(data);
    } catch (error) {
      console.log('Error cargando imágenes, usando respaldo:', error.message);
      const localImages = [
        { id: 1, url: 'https://picsum.photos/300/200?random=1', title: 'Imagen 1' },
        { id: 2, url: 'https://picsum.photos/300/200?random=2', title: 'Imagen 2' },
        { id: 3, url: 'https://picsum.photos/300/200?random=3', title: 'Imagen 3' },
        { id: 4, url: 'https://picsum.photos/300/200?random=4', title: 'Imagen 4' },
        { id: 5, url: 'https://picsum.photos/300/200?random=5', title: 'Imagen 5' },
        { id: 6, url: 'https://picsum.photos/300/200?random=6', title: 'Imagen 6' }
      ];
      setImages(localImages);
    } finally {
      setLoading(false);
    }
  };

  // ==================== NOTIFICACIONES PUSH ====================
  const handleEnableNotifications = async () => {
    setNotificationStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const permissionGranted = await notificationService.requestPermission();
      
      if (permissionGranted) {
        await notificationService.subscribeToPush(apiBaseUrl);
        await checkNotificationStatus();
        setDbInfo('Notificaciones push activadas correctamente');
      }
    } catch (error) {
      setDbInfo(`Error activando notificaciones: ${error.message}`);
    } finally {
      setNotificationStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSendTestNotification = async () => {
    try {
      await notificationService.sendTestNotification(apiBaseUrl);
      setDbInfo('Notificación de prueba enviada a todos los usuarios');
    } catch (error) {
      setDbInfo(`Error enviando notificación: ${error.message}`);
    }
  };

  const handleDisableNotifications = async () => {
    await notificationService.unsubscribe(apiBaseUrl);
    await checkNotificationStatus();
    setDbInfo('Notificaciones deshabilitadas');
  };

  // ==================== NOTIFICACIONES A USUARIO ESPECÍFICO ====================
  const handleSendToUser = async () => {
    if (!targetUserId || !notificationTitle) {
      setDbInfo('User ID y título son requeridos');
      return;
    }

    try {
      const result = await notificationService.sendNotificationToUser(
        targetUserId,
        notificationTitle,
        {
          body: notificationMessage,
          icon: '/icons/icon-192x192.png',
          url: '/dashboard',
          tag: 'user-notification'
        },
        apiBaseUrl
      );

      if (result.success) {
        setDbInfo(`Notificación enviada al usuario ${targetUserId}`);
        setTargetUserId('');
        setNotificationTitle('');
        setNotificationMessage('');
      } else {
        setDbInfo(`Error: ${result.error}`);
      }
    } catch (error) {
      setDbInfo(`Error enviando notificación: ${error.message}`);
    }
  };

  // ==================== INDEXEDDB ====================
  const handleCreateObjectStore = () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('PWA_Database', 1);
      
      request.onerror = (event) => {
        const error = `Error: ${event.target.error}`;
        setDbInfo(error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const info = `
Base de datos abierta
Nombre: ${db.name}
Versión: ${db.version}
ObjectStores: ${Array.from(db.objectStoreNames).join(', ') || 'Ninguno'}
        `;
        setDbInfo(info);
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('pending_posts')) {
          const store = db.createObjectStore('pending_posts', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('endpoint', 'endpoint', { unique: false });
          setDbInfo('ObjectStore "pending_posts" creado con índices');
        }
      };
    });
  };

  const addTestData = async () => {
    try {
      const db = await handleCreateObjectStore();
      
      const transaction = db.transaction(['pending_posts'], 'readwrite');
      const postStore = transaction.objectStore('pending_posts');
      
      const testPost = {
        endpoint: `${apiBaseUrl}/posts`,
        data: {
          title: 'Post de prueba desde IndexedDB',
          content: 'Este post se guardó localmente y se sincronizará cuando haya conexión',
          author: user.username,
          timestamp: new Date().toISOString()
        },
        method: 'POST',
        timestamp: Date.now(),
        attempts: 0,
        status: 'pending'
      };
      
      const postRequest = postStore.add(testPost);
      
      postRequest.onsuccess = () => {
        setDbInfo(prev => prev + `\n\nPost de prueba agregado (ID: ${postRequest.result})`);
      };
      
      postRequest.onerror = (error) => {
        setDbInfo(`Error agregando post: ${error.target.error}`);
      };
      
    } catch (error) {
      setDbInfo(`Error: ${error}`);
    }
  };

  const viewAllData = async () => {
    const request = window.indexedDB.open('PWA_Database');
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending_posts')) {
        setDbInfo('No existe el ObjectStore "pending_posts". Crea primero la DB.');
        return;
      }
      
      const transaction = db.transaction(['pending_posts'], 'readonly');
      const postStore = transaction.objectStore('pending_posts');
      const postRequest = postStore.getAll();
      
      postRequest.onsuccess = () => {
        const posts = postRequest.result;
        let info = `POSTS PENDIENTES (${posts.length}):\n\n`;
        
        if (posts.length === 0) {
          info += 'No hay posts pendientes';
        } else {
          posts.forEach((post, index) => {
            info += `POST ${index + 1}:\n`;
            info += `   ID: ${post.id}\n`;
            info += `   Endpoint: ${post.endpoint}\n`;
            info += `   Intentos: ${post.attempts}\n`;
            info += `   Estado: ${post.status}\n`;
            info += `   Fecha: ${new Date(post.timestamp).toLocaleString()}\n`;
            info += `   Datos: ${JSON.stringify(post.data).substring(0, 50)}...\n\n`;
          });
        }
        
        setDbInfo(info);
      };
      
      postRequest.onerror = (error) => {
        setDbInfo(`Error leyendo datos: ${error.target.error}`);
      };
    };
  };

  const clearDatabase = () => {
    const request = window.indexedDB.open('PWA_Database');
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (db.objectStoreNames.contains('pending_posts')) {
        const transaction = db.transaction(['pending_posts'], 'readwrite');
        const store = transaction.objectStore('pending_posts');
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          setDbInfo('Todos los posts pendientes fueron eliminados');
        };
        
        clearRequest.onerror = (error) => {
          setDbInfo(`Error limpiando DB: ${error.target.error}`);
        };
      } else {
        setDbInfo('No existe el ObjectStore "pending_posts"');
      }
    };
  };

  // ==================== CREAR POSTS ====================
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setPostMessage('');

    if (!postForm.title || !postForm.content) {
      setPostMessage('Título y contenido son requeridos');
      return;
    }

    try {
      const result = await postService.sendPost(postForm.title, postForm.content, apiBaseUrl);
      
      if (result.success) {
        setPostMessage('Post publicado exitosamente');
        setPostForm({ title: '', content: '' });
      } else {
        setPostMessage(result.message);
      }
    } catch (error) {
      setPostMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="user-info">
          <h1>¡Bienvenido, {user.username}!</h1>
          <p>{user.email} | {user.role}</p>
          <div className="backend-info">
            <span className={`backend-status ${backendStatus}`}>
              {backendStatus === 'online' && 'Backend Conectado'}
              {backendStatus === 'offline' && 'Modo Offline'}
              {backendStatus === 'error' && 'Error de Conexión'}
            </span>
            {import.meta.env.DEV && (
              <small className="api-url">API: {apiBaseUrl}</small>
            )}
          </div>
        </div>
        <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
      </header>

      {/* Panel de Notificaciones Push */}
      <div className="notification-panel">
        <h2>Notificaciones Push</h2>
        
        <div className="notification-status">
          <p>
            <strong>Estado:</strong> {notificationStatus.permission === 'granted' ? 'Permitido' : 
                                    notificationStatus.permission === 'denied' ? 'Denegado' : 'No decidido'}
          </p>
          <p>
            <strong>Suscripción:</strong> {notificationStatus.subscribed ? 'Activa' : 'Inactiva'}
          </p>
        </div>

        <div className="notification-buttons">
          {!notificationStatus.subscribed ? (
            <button 
              onClick={handleEnableNotifications}
              disabled={notificationStatus.loading || notificationStatus.permission === 'denied'}
              className="notification-btn enable"
            >
              {notificationStatus.loading ? 'Cargando...' : 'Activar Notificaciones'}
            </button>
          ) : (
            <>
              <button 
                onClick={handleSendTestNotification}
                className="notification-btn test"
              >
                Enviar Notificación Prueba
              </button>
              <button 
                onClick={handleDisableNotifications}
                className="notification-btn disable"
              >
                Desactivar Notificaciones
              </button>
            </>
          )}
        </div>

        {notificationStatus.permission === 'denied' && (
          <p className="notification-warning">
            Los permisos para notificaciones están denegados. 
            Debes habilitarlos manualmente en la configuración de tu navegador.
          </p>
        )}
      </div>

      {/* Panel de Notificaciones a Usuario Específico */}
      <div className="user-notification-panel">
        <h2>Enviar Notificación a Usuario Específico</h2>
        
        <div className="notification-form">
          <input
            type="text"
            placeholder="ID del usuario destino"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="notification-input"
          />
          
          <input
            type="text"
            placeholder="Título de la notificación"
            value={notificationTitle}
            onChange={(e) => setNotificationTitle(e.target.value)}
            className="notification-input"
            required
          />
          
          <textarea
            placeholder="Mensaje de la notificación (opcional)"
            value={notificationMessage}
            onChange={(e) => setNotificationMessage(e.target.value)}
            className="notification-textarea"
            rows="3"
          />
          
          <button 
            onClick={handleSendToUser}
            className="notification-btn user"
            disabled={!targetUserId || !notificationTitle}
          >
            Enviar a Usuario
          </button>
        </div>
      </div>

      {/* Panel de Control - IndexedDB */}
      <div className="db-control-panel">
        <h2>Panel de Control - IndexedDB</h2>
        <p>Gestiona la base de datos local para posts offline</p>
        
        <div className="db-buttons">
          <button onClick={handleCreateObjectStore} className="db-btn create">
            Crear DB
          </button>
          <button onClick={addTestData} className="db-btn add">
            Agregar Post Prueba
          </button>
          <button onClick={viewAllData} className="db-btn view">
            Ver Posts Pendientes
          </button>
          <button onClick={clearDatabase} className="db-btn clear">
            Limpiar DB
          </button>
        </div>
        
        {dbInfo && (
          <div className="db-info">
            <h3>Información de la Base de Datos:</h3>
            <pre>{dbInfo}</pre>
          </div>
        )}
      </div>

      {/* Crear Post */}
      <div className="create-post-panel">
        <h2>Crear Nuevo Post</h2>
        <form onSubmit={handlePostSubmit}>
          <input
            type="text"
            placeholder="Título del post"
            value={postForm.title}
            onChange={(e) => setPostForm({...postForm, title: e.target.value})}
            required
          />
          <textarea
            placeholder="Contenido del post"
            value={postForm.content}
            onChange={(e) => setPostForm({...postForm, content: e.target.value})}
            required
            rows="4"
          />
          <button type="submit" className="post-submit-btn">
            Publicar Post
          </button>
        </form>
        {postMessage && (
          <div className={`post-message ${postMessage.includes('exitosamente') ? 'success' : 'info'}`}>
            {postMessage}
          </div>
        )}
      </div>
      
      <div className="images-section">
        <h2>Galería de Imágenes</h2>
        <p>Las imágenes se cargan desde el backend y se cachean para offline</p>
        
        {loading ? (
          <div className="loading">Cargando imágenes...</div>
        ) : (
          <div className="images-grid">
            {images.map(image => (
              <div key={image.id} className="image-card">
                <img 
                  src={image.url} 
                  alt={image.title}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = `https://picsum.photos/300/200?random=${image.id + 10}`;
                  }}
                />
                <div className="image-info">
                  <h3>{image.title}</h3>
                  <span>ID: {image.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;