import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * base './' → la app funciona en cualquier subruta (GitHub Pages, tu servidor, etc.).
 * En desarrollo, define BRPLAYER_SERVER=https://tu-servidor para que /api/canciones apunte a tu biblioteca.
 */
const server = process.env.BRPLAYER_SERVER;

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: server ? { proxy: { '/api': { target: server, changeOrigin: true } } } : undefined,
  build: { target: 'es2020', sourcemap: false },
});
