// components/SplashScreen.jsx
import { useState, useEffect } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Iniciando aplicación...');
  const [isComplete, setIsComplete] = useState(false);

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
        setIsComplete(true);
        
        // Esperar un poco antes de llamar al callback
        setTimeout(() => {
          // Verificación segura antes de ejecutar
          if (typeof onLoadingComplete === 'function') {
            onLoadingComplete();
          } else {
            console.log('SplashScreen: Loading complete, but no callback provided');
          }
        }, 1000);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [onLoadingComplete]);

  // Si el componente está completo pero no hay callback, ocultar después de tiempo
  useEffect(() => {
    if (isComplete && typeof onLoadingComplete !== 'function') {
      const fallbackTimer = setTimeout(() => {
        console.warn('SplashScreen: Auto-hiding due to missing onLoadingComplete');
        // Aquí podrías agregar lógica para ocultar el splash screen
      }, 2000);
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [isComplete, onLoadingComplete]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-icon">🦦</div>
        <h1>Mi PWA App</h1>
        <p>{currentStep}</p>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Debug info - solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-info">
            <small>
              onLoadingComplete: {typeof onLoadingComplete}
              {isComplete && ' • Complete!'}
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

// Prop por defecto para evitar errores
SplashScreen.defaultProps = {
  onLoadingComplete: null
};

export default SplashScreen;