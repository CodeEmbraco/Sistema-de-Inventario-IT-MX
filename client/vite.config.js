import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, Vite (puerto 5173) reenvía la API y los archivos subidos al servidor Node (puerto 3001).
// IMPORTANTE: el puerto de Vite NO puede ser el mismo que el del servidor Node (3001),
// o Vite se reenvía las peticiones a sí mismo en un ciclo infinito (lentitud y error 500).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // lee client/.env y client/.env.development
  const API = env.VITE_API_TARGET || 'http://localhost:8007';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': API,
        '/uploads': API,
        '/vistas': API,
      },
    },
  };
});