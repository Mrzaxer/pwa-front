import { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="user-info">
          <h1>¡Bienvenido, {user.username}!</h1>
          <p>{user.email} | Modo desarrollo</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
      </header>
      
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