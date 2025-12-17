import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // الأولوية لـ VITE_API_KEY لبيئة الإنتاج
  const apiKey = env.VITE_API_KEY || process.env.VITE_API_KEY || env.API_KEY || process.env.API_KEY || "";
  
  return {
    plugins: [react()],
    base: '/kinantouch/', 
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild', // التأكد من عدم استخدام terser
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    }
  };
});