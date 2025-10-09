import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Inicializar IndexedDB
const initIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('database', 1);
    
    request.onerror = (event) => {
      console.error('❌ Error abriendo DB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      console.log('✅ DB inicializada');
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('table')) {
        db.createObjectStore('table', { autoIncrement: true });
        console.log('🆕 ObjectStore creado');
      }
    };
  });
};

// Registrar Service Worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ SW registrado:', registration.scope);
      
      // Esperar a que el SW esté activo antes de inicializar la mensajería
      if (registration.active) {
        initializeSWMessaging();
      } else {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              initializeSWMessaging();
            }
          });
        });
      }
    } catch (error) {
      console.log('❌ Error SW:', error);
    }
  }
};

// Inicializar la mensajería del SW de forma dinámica
const initializeSWMessaging = async () => {
  try {
    // Importación dinámica para evitar errores si el archivo no existe
    const module = await import('./utils/swMessaging.js');
    console.log('✅ SW Messaging inicializado');
  } catch (error) {
    console.log('⚠️ SW Messaging no disponible:', error.message);
  }
};

// Inicializar la aplicación
const initApp = async () => {
  try {
    await initIndexedDB();
    await registerServiceWorker();
  } catch (error) {
    console.log('❌ Error inicializando app:', error);
  }
};

// Ejecutar inicialización
initApp();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)