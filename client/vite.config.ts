import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://proposal-server:5555',
        changeOrigin: true,
        // In local development outside docker, proposal-server can fallback to localhost:5555
        router: () => {
          return process.env.VITE_API_URL || 'http://proposal-server:5555';
        }
      }
    }
  }
});

