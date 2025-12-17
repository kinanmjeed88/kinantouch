import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // تحميل متغيرات البيئة من ملف .env (إذا وجد) ومن النظام
  const env = loadEnv(mode, process.cwd(), '');
  
  // نحدد المفتاح الأولوية لـ VITE_API_KEY كما طلب المستخدم
  const apiKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || "";
  
  return {
    plugins: [react()],
    base: '/kinantouch/', 
    define: {
      // حقن المفتاح ليصبح متاحاً عبر process.env.API_KEY داخل التطبيق
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild' // تغيير من terser إلى esbuild لإصلاح خطأ البناء
    }
  };
});