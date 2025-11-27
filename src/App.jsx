import { useState, useEffect } from 'react';
import { apiService } from './services/api.js';
import { offlineService } from './services/offlineService.js';
import SplashScreen from './components/SplashScreen.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import UserNotifications from './components/UserNotifications.jsx';
import CreatePost from './components/CreatePost.jsx';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('splash');
  const [user, setUser] = useState(null);
  const [backendStatus, setBackendStatus] = useState({
    online: false,
    loading: true,
    error: null
  });
  const [apiBaseUrl, setApiBaseUrl] = useState(
    import.meta.env.VITE_API_URL || 'https://pwa-back-xmqw.onrender.com'
  );

  useEffect(() => {
    checkBackendStatus();
    checkStoredUser();
  }, [apiBaseUrl]);

  const checkBackendStatus = async () => {
    setBackendStatus(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🔍 Verificando estado del backend...', apiBaseUrl);
      
      // Intentar conectar al backend
      const response = await fetch(`${apiBaseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Agregar timeout
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend conectado:', data);
        setBackendStatus({
          online: true,
          loading: false,
          error: null,
          data: data
        });
      } else {
        console.warn('⚠️ Backend respondió con error:', response.status);
        setBackendStatus({
          online: false,
          loading: false,
          error: `Error ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      console.error('❌ Error conectando al backend:', error);
      
      let errorMessage = 'No se pudo conectar al servidor';
      
      if (error.name === 'TimeoutError') {
        errorMessage = 'El servidor está tardando demasiado en responder';
      } else if (error.name === 'TypeError') {
        errorMessage = 'Error de red - Verifica tu conexión';
      } else {
        errorMessage = error.message || 'Error desconocido';
      }

      setBackendStatus({
        online: false,
        loading: false,
        error: errorMessage
      });

      // Intentar con URL alternativa si falla
      if (apiBaseUrl === 'https://pwa-back-xmqw.onrender.com') {
        const alternativeUrl = 'http://localhost:5000';
        console.log(`🔄 Intentando con URL alternativa: ${alternativeUrl}`);
        // No cambiar automáticamente, solo informar
      }
    }
  };

  const checkStoredUser = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verificar si el token es válido
      apiService.setToken(token);
      // No establecer usuario automáticamente, esperar verificación
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    apiService.setToken(token);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    apiService.logout();
    setCurrentView('login');
  };

  const retryBackendConnection = () => {
    checkBackendStatus();
  };

  const changeApiBaseUrl = (newUrl) => {
    setApiBaseUrl(newUrl);
    // Recargar el estado
    setTimeout(() => checkBackendStatus(), 500);
  };

  const renderCurrentView = () => {
    // Mostrar splash screen mientras se verifica el backend
    if (currentView === 'splash' && backendStatus.loading) {
      return <SplashScreen />;
    }

    // Si el backend está caído, mostrar pantalla de error
    if (!backendStatus.online && !backendStatus.loading) {
      return (
        <div className="error-screen">
          <div className="error-content">
            <h1>🔌 Problema de Conexión</h1>
            <p>No se pudo conectar con el servidor backend.</p>
            
            <div className="error-details">
              <p><strong>Error:</strong> {backendStatus.error}</p>
              <p><strong>URL intentada:</strong> {apiBaseUrl}</p>
            </div>

            <div className="error-actions">
              <button onClick={retryBackendConnection} className="retry-btn">
                🔄 Reintentar Conexión
              </button>
              
              <div className="alternative-urls">
                <p>Si el problema persiste, prueba con:</p>
                <button 
                  onClick={() => changeApiBaseUrl('https://pwa-back-xmqw.onrender.com')}
                  className={`url-btn ${apiBaseUrl === 'https://pwa-back-xmqw.onrender.com' ? 'active' : ''}`}
                >
                  🌐 Producción: pwa-back-xmqw.onrender.com
                </button>
                <button 
                  onClick={() => changeApiBaseUrl('http://localhost:5000')}
                  className={`url-btn ${apiBaseUrl === 'http://localhost:5000' ? 'active' : ''}`}
                >
                  💻 Local: localhost:5000
                </button>
              </div>
            </div>

            <div className="offline-info">
              <p>
                <strong>Modo offline:</strong> Puedes usar la aplicación en modo limitado.
                Los datos se sincronizarán cuando se restablezca la conexión.
              </p>
              <button 
                onClick={() => setCurrentView('login')}
                className="offline-btn"
              >
                Continuar en Modo Offline
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Vistas normales cuando el backend está disponible
    switch (currentView) {
      case 'splash':
        return <SplashScreen />;
      case 'login':
        return (
          <Login 
            onLogin={handleLogin} 
            backendStatus={backendStatus}
            apiBaseUrl={apiBaseUrl}
          />
        );
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            onLogout={handleLogout}
            backendStatus={backendStatus}
            apiBaseUrl={apiBaseUrl}
          />
        );
      case 'notifications':
        return (
          <UserNotifications 
            user={user}
            onBack={() => setCurrentView('dashboard')}
            backendStatus={backendStatus}
            apiBaseUrl={apiBaseUrl}
          />
        );
      case 'create-post':
        return (
          <CreatePost 
            user={user}
            onBack={() => setCurrentView('dashboard')}
            backendStatus={backendStatus}
            apiBaseUrl={apiBaseUrl}
          />
        );
      default:
        return <SplashScreen />;
    }
  };

  return (
    <div className="app">
      {/* Header con estado de conexión */}
      {currentView !== 'splash' && (
        <header className="app-header">
          <div className="connection-status">
            {backendStatus.loading ? (
              <span className="status-loading">🔄 Conectando...</span>
            ) : backendStatus.online ? (
              <span className="status-online">✅ Conectado</span>
            ) : (
              <span className="status-offline">❌ Sin conexión</span>
            )}
          </div>
          
          {user && (
            <nav className="app-nav">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={currentView === 'dashboard' ? 'active' : ''}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setCurrentView('notifications')}
                className={currentView === 'notifications' ? 'active' : ''}
              >
                Notificaciones
              </button>
              <button 
                onClick={() => setCurrentView('create-post')}
                className={currentView === 'create-post' ? 'active' : ''}
              >
                Crear Post
              </button>
            </nav>
          )}
        </header>
      )}

      {/* Contenido principal */}
      <main className="app-main">
        {renderCurrentView()}
      </main>

      {/* Footer informativo */}
      {currentView !== 'splash' && (
        <footer className="app-footer">
          <p>
            Backend: {apiBaseUrl} | 
            Estado: {backendStatus.online ? '✅ En línea' : '❌ Offline'} |
            {user ? ` Usuario: ${user.username}` : ' No autenticado'}
          </p>
        </footer>
      )}
    </div>
  );
}

export default App;