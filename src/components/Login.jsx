import { useState } from 'react';
import { apiService } from '../services/api.js';
import './Login.css';

const Login = ({ onLogin }) => {
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
        // LOGIN con backend real
        result = await apiService.login(formData.email, formData.password);
      } else {
        // REGISTRO con backend real
        result = await apiService.register(formData.username, formData.email, formData.password);
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

  // Login rápido con usuarios de prueba
  const quickLogin = (email, password) => {
    setFormData({
      username: '',
      email: email,
      password: password
    });
    
    // Auto-submit después de un breve delay
    setTimeout(() => {
      const submitEvent = new Event('submit', { cancelable: true });
      document.querySelector('.login-form').dispatchEvent(submitEvent);
    }, 100);
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

        <div className="demo-info">
          <p><strong>Para probar:</strong></p>
          <p>Email: admin@test.com | Password: 123456</p>
          <p>O crea una cuenta nueva</p>
        </div>

        {/* Botón de acceso directo sin login (solo desarrollo) */}
        <button 
          type="button" 
          className="guest-btn"
          onClick={() => onLogin({
            id: 'guest',
            username: 'Invitado',
            email: 'invitado@test.com',
            role: 'user'
          }, 'guest-token')}
        >
          Entrar como Invitado (Solo Desarrollo)
        </button>
      </form>
    </div>
  );
};

export default Login;