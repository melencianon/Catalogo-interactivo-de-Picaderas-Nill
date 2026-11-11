import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR está deshabilitado en AI Studio a través de la variable de entorno DISABLE_HMR.
      // No modificar: la supervisión de archivos está desactivada para evitar el parpadeo durante las ediciones del agente.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Deshabilitar la monitorización de archivos cuando DISABLE_HMR es verdadero para ahorrar CPU durante las ediciones del agente.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});