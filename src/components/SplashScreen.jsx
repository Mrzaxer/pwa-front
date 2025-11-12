// components/SplashScreen.jsx
import { useState, useEffect } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Iniciando aplicación...');

  useEffect(() => {
    const steps = [
      'Conectando con el backend...',
      'Cargando componentes...', 
      'Inicializando base de datos...',
      'Configurando notificaciones...',
      '¡Listo!'
    ];

    let current = 0;
    
    const interval = setInterval(() => {
      if (current < steps.length) {
        setCurrentStep(steps[current]);
        setProgress(((current + 1) / steps.length) * 100);
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onLoadingComplete();
        }, 1000);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [onLoadingComplete]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-icon">🚀</div>
        <h1>Mi PWA App</h1>
        <p>{currentStep}</p>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="splash-features">
          <div className="feature">✅ Autenticación JWT</div>
          <div className="feature">🔔 Notificaciones Push</div>
          <div className="feature">💾 IndexedDB Offline</div>
          <div className="feature">📱 Background Sync</div>
          <div className="feature">👥 Notificaciones entre usuarios</div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;