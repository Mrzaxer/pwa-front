import { useState, useEffect } from 'react';
import { apiService } from '../services/api.js';
import { offlineService } from '../services/offlineService.js';
import './Login.css';

const Login = ({ onLogin, backendStatus, apiBaseUrl }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(offlineService.isOnline);
  const [pendingOperations, setPendingOperations] = useState(0);

  useEffect(() => {
    const handleConnectionChange = (event) => {
      const online = event.detail ? event.detail.online : navigator.onLine;
      setIsOnline(online);
    };

    const handlePendingOperationsUpdate = async () => {
      await updatePendingOperationsCount();
    };

    window.addEventListener('connectionChange', handleConnectionChange);
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);
    window.addEventListener('pendingOperationsUpdated', handlePendingOperationsUpdate);

    updatePendingOperationsCount();

    return () => {
      window.removeEventListener('connectionChange', handleConnectionChange);
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
      window.removeEventListener('pendingOperationsUpdated', handlePendingOperationsUpdate);
    };
  }, []);

  const updatePendingOperationsCount = async () => {
    try {
      const pending = await offlineService.getPendingAuthOperations();
      setPendingOperations(pending.length);
    } catch (error) {
      console.error('Error obteniendo operaciones pendientes:', error);
      setPendingOperations(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!offlineService.isOnline) {
        // Modo offline - Guardar localmente
        const operationData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          timestamp: new Date().toISOString(),
          apiBaseUrl: apiBaseUrl
        };

        const saved = await offlineService.saveAuthOperation(
          isLogin ? 'login' : 'register', 
          operationData
        );
        
        if (saved) {
          setMessage(`⚠️ ${isLogin ? 'Login' : 'Registro'} guardado localmente. Se enviará automáticamente cuando haya conexión.`);
          setFormData({ username: '', email: '', password: '' });
        } else {
          setMessage('❌ Error guardando la operación localmente');
        }
      } else {
        // Modo online - Procesar normalmente
        let result;
        
        if (isLogin) {
          result = await apiService.login(formData.email, formData.password, apiBaseUrl);
        } else {
          result = await apiService.register(formData.username, formData.email, formData.password, apiBaseUrl);
        }

        if (result.success) {
          onLogin(result.user, result.token);
          setMessage(`✅ ${isLogin ? 'Login exitoso' : 'Registro exitoso'}`);
        } else {
          setMessage(`❌ ${result.message}`);
        }
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
      await updatePendingOperationsCount();
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      setMessage('🔌 No hay conexión para sincronizar');
      return;
    }

    setLoading(true);
    try {
      const result = await offlineService.syncPendingAuthOperations(onLogin);
      if (result.synced > 0) {
        setMessage(`✅ Sincronizados ${result.synced} operaciones pendientes`);
      } else {
        setMessage('ℹ️ No hay operaciones pendientes para sincronizar');
      }
    } catch (error) {
      setMessage('❌ Error durante la sincronización');
    } finally {
      setLoading(false);
      await updatePendingOperationsCount();
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
        
        <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '✅ Conectado' : '⚠️ Sin conexión'}
        </div>

        {pendingOperations > 0 && (
          <div className="pending-operations">
            <span>📋 {pendingOperations} operación(es) pendientes</span>
            {isOnline && (
              <button 
                type="button" 
                onClick={handleManualSync}
                className="sync-button"
                disabled={loading}
              >
                {loading ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            )}
          </div>
        )}
        
        {!isLogin && (
          <input
            type="text"
            placeholder="Nombre de usuario"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
            minLength="3"
          />
        )}
        
        <input
          type="email"
          placeholder="Correo electrónico"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
        
        <input
          type="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
          minLength="6"
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : (isLogin ? 'Entrar' : 'Registrarse')}
        </button>
        
        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : message.includes('⚠️') ? 'warning' : message.includes('ℹ️') ? 'info' : 'error'}`}>
            {message}
          </div>
        )}
        
        <p className="toggle-form" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </p>
      </form>
    </div>
  );
};

export default Login;