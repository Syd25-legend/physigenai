import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // This makes env vars available as process.env.VAR for compatibility
        'process.env': JSON.stringify(env)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'), // Standard: points @ to src
        }
      }
    };
});