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
      // Ocultar splash screen después de 2 segundos
      setTimeout(() => {
        setShowSplash(false);
        setLoading(false);
      }, 2000);
    }
  };

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('error');
      }
    } catch (error) {
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

  if (showSplash) {
    return <SplashScreen />;
  }

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="App">
      {/* Status Bar */}
      <div className={`status-bar ${backendStatus}`}>
        <div className="status-indicator"></div>
        <span>
          {backendStatus === 'online' && '✅ Conectado al backend'}
          {backendStatus === 'offline' && '🔌 Modo offline - Los posts se guardarán localmente'}
          {backendStatus === 'error' && '⚠️ Problema de conexión con el backend'}
          {backendStatus === 'checking' && '🔄 Verificando conexión...'}
        </span>
      </div>

      {user ? (
        <Dashboard user={user} onLogout={handleLogout} backendStatus={backendStatus} />
      ) : (
        <Login onLogin={handleLogin} backendStatus={backendStatus} />
      )}
    </div>
  );
}

export default App;