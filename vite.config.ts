
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // البحث عن المفتاح في كافة المسميات المحتملة لضمان استقرار التشغيل
  const apiKey = env.VITE_GROQ_API_KEY || env.API_KEY || env.VITE_API_KEY || process.env.API_KEY || "";
  
  return {
    plugins: [react()],
    base: '/kinantouch/', 
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      minify: 'esbuild',
      sourcemap: false
    }
  };
});
