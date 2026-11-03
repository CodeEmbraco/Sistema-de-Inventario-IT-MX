import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, Vite (puerto 5173) reenvía la API y los archivos subidos al servidor Node.
const API = process.env.VITE_API_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
      '/vistas': API,
    },
  },
});
