import { useState } from 'react';
import { apiService } from '../services/api.js';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let result;
      
      if (isLogin) {
        // LOGIN con backend real usando apiBaseUrl
        result = await apiService.login(formData.email, formData.password, apiBaseUrl);
      } else {
        // REGISTRO con backend real usando apiBaseUrl
        result = await apiService.register(formData.username, formData.email, formData.password, apiBaseUrl);
      }

      if (result.success) {
        onLogin(result.user, result.token);
        setMessage(`✅ ${isLogin ? 'Login exitoso' : 'Registro exitoso'}`);
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      <form onSubmit={handleSubmit} className="login-form">
        <h2>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
        
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
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
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