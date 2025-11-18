import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  preview: {
    // Configuración para el servidor de preview
    // Esto ayuda con el routing en desarrollo
    port: 4173,
  },
  build: {
    // Asegurar que los assets se generen correctamente
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
