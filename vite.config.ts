import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // دمج المفتاح من مصادر متعددة لضمان تمريره وقت الـ build
  const apiKey = env.VITE_API_KEY || process.env.VITE_API_KEY || "";
  
  return {
    plugins: [react()],
    base: '/kinantouch/', 
    define: {
      // حقن المفتاح ليكون متاحاً برمجياً
      'process.env.API_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      minify: 'esbuild',
      sourcemap: false
    }
  };
});