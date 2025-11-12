// components/UserNotifications.jsx
import { useState, useEffect } from 'react';
import { apiService } from '../services/api.js';
import './UserNotifications.css';

const UserNotifications = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [notificationForm, setNotificationForm] = useState({
    targetUserId: '',
    title: '',
    message: '',
    type: 'message'
  });

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      const response = await apiService.getAvailableUsers();
      if (response.success) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      setMessage('❌ Error cargando usuarios disponibles');
    }
  };

  const sendNotificationToUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await apiService.sendNotificationToUser(notificationForm);
      
      if (response.success) {
        setMessage('✅ Notificación enviada exitosamente');
        setNotificationForm({
          targetUserId: '',
          title: '',
          message: '',
          type: 'message'
        });
      } else {
        setMessage(`❌ ${response.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendQuickNotification = async (userId, presetType) => {
    const presets = {
      greeting: {
        title: '👋 ¡Hola!',
        message: `${currentUser.username} te está saludando`
      },
      reminder: {
        title: '⏰ Recordatorio',
        message: `${currentUser.username} te envió un recordatorio`
      },
      alert: {
        title: '🚨 Alerta Importante',
        message: `${currentUser.username} te envió una alerta`
      }
    };

    const preset = presets[presetType];
    setNotificationForm(prev => ({
      ...prev,
      targetUserId: userId,
      title: preset.title,
      message: preset.message,
      type: presetType
    }));

    // Auto-enviar después de un breve delay
    setTimeout(() => {
      document.getElementById('notification-form').dispatchEvent(
        new Event('submit', { cancelable: true })
      );
    }, 100);
  };

  return (
    <div className="user-notifications">
      <h3>👥 Enviar Notificaciones a Usuarios</h3>
      
      <form id="notification-form" onSubmit={sendNotificationToUser} className="notification-form">
        <div className="form-group">
          <label>Usuario Destino:</label>
          <select
            value={notificationForm.targetUserId}
            onChange={(e) => setNotificationForm({...notificationForm, targetUserId: e.target.value})}
            required
          >
            <option value="">Selecciona un usuario</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.email}) {user.hasSubscriptions ? '🔔' : '🔕'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Título:</label>
          <input
            type="text"
            value={notificationForm.title}
            onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
            placeholder="Título de la notificación"
            required
          />
        </div>

        <div className="form-group">
          <label>Mensaje:</label>
          <textarea
            value={notificationForm.message}
            onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
            placeholder="Mensaje de la notificación"
            rows="3"
            required
          />
        </div>

        <div className="form-group">
          <label>Tipo:</label>
          <select
            value={notificationForm.type}
            onChange={(e) => setNotificationForm({...notificationForm, type: e.target.value})}
          >
            <option value="message">Mensaje</option>
            <option value="alert">Alerta</option>
            <option value="reminder">Recordatorio</option>
            <option value="info">Informativo</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="send-btn">
          {loading ? 'Enviando...' : '📤 Enviar Notificación'}
        </button>
      </form>

      {/* Notificaciones Rápidas */}
      <div className="quick-notifications">
        <h4>Notificaciones Rápidas</h4>
        <div className="quick-buttons">
          {users.map(user => (
            <div key={user.id} className="user-quick-actions">
              <span>{user.username}</span>
              <div className="action-buttons">
                <button 
                  onClick={() => sendQuickNotification(user.id, 'greeting')}
                  className="quick-btn greeting"
                >
                  👋 Saludar
                </button>
                <button 
                  onClick={() => sendQuickNotification(user.id, 'reminder')}
                  className="quick-btn reminder"
                >
                  ⏰ Recordatorio
                </button>
                <button 
                  onClick={() => sendQuickNotification(user.id, 'alert')}
                  className="quick-btn alert"
                >
                  🚨 Alerta
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default UserNotifications;