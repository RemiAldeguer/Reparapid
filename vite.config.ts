import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {PUBLIC_SITE_ORIGIN} from './src/public-site-origin.mjs';
export default defineConfig({
  plugins: [react(), {
    name: 'reparapid-canonical-origin',
    transformIndexHtml(html) {
      return html
        .replace(/(<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["'])[^"']*(["'])/i, (_tag, before, after) => `${before}${PUBLIC_SITE_ORIGIN}/${after}`)
        .replace(/(<meta\b[^>]*\bproperty=["']og:url["'][^>]*\bcontent=["'])[^"']*(["'])/i, (_tag, before, after) => `${before}${PUBLIC_SITE_ORIGIN}/${after}`);
    },
  }], base: './',
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:3040', changeOrigin: false } },
  },
});
