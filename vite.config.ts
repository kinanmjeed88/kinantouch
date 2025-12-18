
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // نستخدم VITE_GROQ_API_KEY كمصدر أساسي للمفتاح
  const apiKey = env.VITE_GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
  
  return {
    plugins: [react()],
    base: '/kinantouch/', 
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_GROQ_API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      minify: 'esbuild',
      sourcemap: false
    }
  };
});
