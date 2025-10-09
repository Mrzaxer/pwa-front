import { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbInfo, setDbInfo] = useState(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      // Intentar conectar al backend primero
      const response = await fetch('/api/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      } else {
        throw new Error('Backend no disponible');
      }
    } catch (error) {
      // Si falla, usar imágenes locales
      console.log('🌐 Usando imágenes locales');
      const localImages = [
        { id: 1, url: 'https://picsum.photos/300/200?random=1', title: 'Imagen 1' },
        { id: 2, url: 'https://picsum.photos/300/200?random=2', title: 'Imagen 2' },
        { id: 3, url: 'https://picsum.photos/300/200?random=3', title: 'Imagen 3' },
        { id: 4, url: 'https://picsum.photos/300/200?random=4', title: 'Imagen 4' },
        { id: 5, url: 'https://picsum.photos/300/200?random=5', title: 'Imagen 5' },
        { id: 6, url: 'https://picsum.photos/300/200?random=6', title: 'Imagen 6' },
        { id: 7, url: 'https://picsum.photos/300/200?random=7', title: 'Imagen 7' },
        { id: 8, url: 'https://picsum.photos/300/200?random=8', title: 'Imagen 8' }
      ];
      setImages(localImages);
    } finally {
      setLoading(false);
    }
  };

  // Función para crear ObjectStore y ver la DB
  const handleCreateObjectStore = () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('PWA_Database', 1);
      
      request.onerror = (event) => {
        const error = `❌ Error: ${event.target.error}`;
        setDbInfo(error);
        reject(error);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const info = `
✅ Base de datos abierta
📊 Nombre: ${db.name}
🔢 Versión: ${db.version}
📦 ObjectStores: ${Array.from(db.objectStoreNames).join(', ') || 'Ninguno'}
        `;
        setDbInfo(info);
        console.log('📊 Info DB:', db);
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Crear ObjectStore para posts pendientes
        if (!db.objectStoreNames.contains('pending_posts')) {
          const store = db.createObjectStore('pending_posts', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('endpoint', 'endpoint', { unique: false });
          setDbInfo('🆕 ObjectStore "pending_posts" creado con índices');
        }
      };
    });
  };

  // Función para agregar datos de prueba
  const addTestData = async () => {
    try {
      const db = await handleCreateObjectStore();
      
      const transaction = db.transaction(['pending_posts'], 'readwrite');
      const postStore = transaction.objectStore('pending_posts');
      
      // Datos de prueba para posts pendientes
      const testPost = {
        endpoint: '/api/posts',
        data: {
          title: 'Post de prueba desde IndexedDB',
          content: 'Este post se guardó localmente y se sincronizará después',
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
        setDbInfo(prev => prev + `\n\n📝 Post de prueba agregado (ID: ${postRequest.result})`);
      };
      
      postRequest.onerror = (error) => {
        setDbInfo(`❌ Error agregando post: ${error.target.error}`);
      };
      
    } catch (error) {
      setDbInfo(`❌ Error: ${error}`);
    }
  };

  // Función para ver todos los datos
  const viewAllData = async () => {
    const request = window.indexedDB.open('PWA_Database');
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending_posts')) {
        setDbInfo('❌ No existe el ObjectStore "pending_posts". Crea primero la DB.');
        return;
      }
      
      const transaction = db.transaction(['pending_posts'], 'readonly');
      const postStore = transaction.objectStore('pending_posts');
      const postRequest = postStore.getAll();
      
      postRequest.onsuccess = () => {
        const posts = postRequest.result;
        let info = `📊 POSTS PENDIENTES (${posts.length}):\n\n`;
        
        if (posts.length === 0) {
          info += 'No hay posts pendientes';
        } else {
          posts.forEach((post, index) => {
            info += `📝 POST ${index + 1}:\n`;
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
        setDbInfo(`❌ Error leyendo datos: ${error.target.error}`);
      };
    };
  };

  // Función para limpiar la DB
  const clearDatabase = () => {
    const request = window.indexedDB.open('PWA_Database');
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (db.objectStoreNames.contains('pending_posts')) {
        const transaction = db.transaction(['pending_posts'], 'readwrite');
        const store = transaction.objectStore('pending_posts');
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          setDbInfo('🗑️ Todos los posts pendientes fueron eliminados');
        };
        
        clearRequest.onerror = (error) => {
          setDbInfo(`❌ Error limpiando DB: ${error.target.error}`);
        };
      } else {
        setDbInfo('❌ No existe el ObjectStore "pending_posts"');
      }
    };
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="user-info">
          <h1>¡Bienvenido, {user.username}!</h1>
          <p>{user.email} | 🔧 Modo desarrollo</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
      </header>
      
      {/* Panel de control de Base de Datos */}
      <div className="db-control-panel">
        <h2>🧪 Panel de Control - IndexedDB</h2>
        <p>Gestiona la base de datos local para posts offline</p>
        
        <div className="db-buttons">
          <button onClick={handleCreateObjectStore} className="db-btn create">
            🗃️ Crear DB
          </button>
          <button onClick={addTestData} className="db-btn add">
            📝 Agregar Post Prueba
          </button>
          <button onClick={viewAllData} className="db-btn view">
            👀 Ver Posts Pendientes
          </button>
          <button onClick={clearDatabase} className="db-btn clear">
            🗑️ Limpiar DB
          </button>
        </div>
        
        {dbInfo && (
          <div className="db-info">
            <h3>📊 Información de la Base de Datos:</h3>
            <pre>{dbInfo}</pre>
          </div>
        )}
      </div>
      
      <div className="images-section">
        <h2>Galería de Imágenes</h2>
        <p>Las imágenes se cargan desde internet y se cachean para offline</p>
        
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
                    // Si falla la imagen, usar una de respaldo
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