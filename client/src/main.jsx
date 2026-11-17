import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { instalarMock } from './api.js';
// Tipografías del Brand Toolkit, incluidas en el proyecto (funcionan sin internet)
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import './styles/app.css';
import './styles/nidec.css';

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
