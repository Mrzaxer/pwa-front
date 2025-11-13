import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SplashScreen from './components/SplashScreen';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');

  // URL CORRECTA del backend - IMPORTANTE para producción
  const API_BASE_URL = 'https://pwa-back-xmqw.onrender.com/api';

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Verificar si hay usuario guardado
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
      }
      
      // Verificar estado del backend
      await checkBackendStatus();
      
    } catch (error) {
      console.log('❌ Error inicializando app:', error);
      setBackendStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const checkBackendStatus = async () => {
    try {
      console.log('🔍 Verificando conexión con backend...');
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend conectado:', data.message);
        setBackendStatus('online');
      } else {
        console.warn('⚠️ Backend respondió con error:', response.status);
        setBackendStatus('error');
      }
    } catch (error) {
      console.log('🔌 No se pudo conectar al backend:', error.message);
      setBackendStatus('offline');
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const handleSplashComplete = () => {
    console.log('SplashScreen completado, mostrando aplicación principal');
    setShowSplash(false);
  };

  // Mostrar SplashScreen mientras se inicializa
  if (showSplash) {
    return <SplashScreen onLoadingComplete={handleSplashComplete} />;
  }

  // Mostrar loading solo si es necesario después del splash
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Finalizando carga...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Status Bar */}
      <div className={`status-bar ${backendStatus}`}>
        <div className="status-indicator"></div>
        <span>
          {backendStatus === 'online' && '✅ Conectado al backend'}
          {backendStatus === 'offline' && '🔌 Modo offline - Los datos se guardarán localmente'}
          {backendStatus === 'error' && '⚠️ Problema de conexión con el backend'}
          {backendStatus === 'checking' && '🔄 Verificando conexión...'}
        </span>
        {/* Información de debug - solo en desarrollo */}
        {import.meta.env.DEV && (
          <small style={{ marginLeft: '10px', opacity: 0.7 }}>
            API: {API_BASE_URL}
          </small>
        )}
      </div>

      {user ? (
        <Dashboard 
          user={user} 
          onLogout={handleLogout} 
          backendStatus={backendStatus} 
          apiBaseUrl={API_BASE_URL}
        />
      ) : (
        <Login 
          onLogin={handleLogin} 
          backendStatus={backendStatus} 
          apiBaseUrl={API_BASE_URL}
        />
      )}
    </div>
  );
}

export default App;