import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { instalarMock } from './api.js';
import './styles/app.css';

async function iniciar() {
  // Modo sin servidor (solo desarrollo, ver client/.env.development).
  // En la compilación de producción este bloque y el simulador no se incluyen.
  if (import.meta.env.DEV && import.meta.env.VITE_SIN_SERVIDOR === 'true') {
    const { crearMock } = await import('./mock/mockApi.js');
    instalarMock(crearMock());
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

iniciar();
