/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from the frontend directory so BACKEND_PROXY_TARGET can be set
  // in frontend/.env without leaking into browser bundles (no VITE_ prefix).
  const env = loadEnv(mode, process.cwd(), '');

  /**
   * Vite proxy target (server-side only — NOT exposed to browser code).
   *
   * Native development:  http://127.0.0.1:5003  (default)
   * Docker dev compose:  http://backend:5003     (set BACKEND_PROXY_TARGET)
   *
   * This value is consumed solely by the Vite dev server when proxying /api
   * requests. The browser never sees this URL; it sends relative /api calls
   * to Vite which forwards them here.
   */
  const backendProxyTarget =
    env.BACKEND_PROXY_TARGET ?? 'http://127.0.0.1:5003';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            ui: ['lucide-react', 'react-hot-toast'],
            http: ['axios', 'socket.io-client'],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendProxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  };
});

