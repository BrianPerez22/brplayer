import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * base './' → la app funciona en cualquier subruta (GitHub Pages, tu servidor, etc.).
 * En desarrollo, define BRPLAYER_SERVER=https://tu-servidor para que /api/canciones apunte a tu biblioteca.
 */
const server = process.env.BRPLAYER_SERVER;

/** `npm run build:single` → un único brplayer.html con todo dentro (se abre con doble clic, sin servidor). */
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: server ? { proxy: { '/api': { target: server, changeOrigin: true } } } : undefined,
  build: mode === 'single'
    ? { target: 'es2020', outDir: 'dist-single', copyPublicDir: false }
    : { target: 'es2020', sourcemap: false },
}));
