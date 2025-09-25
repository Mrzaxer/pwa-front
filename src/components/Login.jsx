import { useState } from 'react';
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

  // Usuarios predefinidos (almacenados en localStorage)
  const getStoredUsers = () => {
    const stored = localStorage.getItem('devUsers');
    return stored ? JSON.parse(stored) : [
      { id: 1, username: 'admin', email: 'admin@test.com', password: '123' },
      { id: 2, username: 'usuario1', email: 'usuario1@test.com', password: '123' },
      { id: 3, username: 'demo', email: 'demo@test.com', password: 'demo' }
    ];
  };

  const saveUsers = (users) => {
    localStorage.setItem('devUsers', JSON.stringify(users));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Simular delay de red
    setTimeout(() => {
      const users = getStoredUsers();
      
      if (isLogin) {
        // LOGIN
        const user = users.find(u => 
          u.email === formData.email && u.password === formData.password
        );
        
        if (user) {
          onLogin(user);
          setMessage('✅ Login exitoso');
        } else {
          setMessage('❌ Email o contraseña incorrectos');
        }
      } else {
        // REGISTRO
        const existingUser = users.find(u => 
          u.email === formData.email || u.username === formData.username
        );
        
        if (existingUser) {
          setMessage('❌ El usuario ya existe');
        } else if (!formData.username || !formData.email || !formData.password) {
          setMessage('❌ Completa todos los campos');
        } else {
          const newUser = {
            id: Date.now(),
            username: formData.username,
            email: formData.email,
            password: formData.password
          };
          const updatedUsers = [...users, newUser];
          saveUsers(updatedUsers);
          onLogin(newUser);
          setMessage('✅ Registro exitoso');
        }
      }
      setLoading(false);
    }, 500);
  };

  // Login rápido
  const quickLogin = (email, password) => {
    setFormData({
      username: '',
      email: email,
      password: password
    });
    
    setTimeout(() => {
      handleSubmit(new Event('submit'));
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

        <button 
          type="button" 
          className="guest-btn"
          onClick={() => onLogin({
            id: 999,
            username: 'Invitado',
            email: 'invitado@test.com'
          })}
        >
          Entrar como Invitado
        </button>
      </form>
    </div>
  );
};

export default Login;