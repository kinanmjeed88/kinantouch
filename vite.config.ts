import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/kinantouch/', // Base path for GitHub Pages repository
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});