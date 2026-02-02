import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/js/main.js'),
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'css/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks: {
          // Separate vendor chunks for better caching
          'three-vendor': ['three'],
          'mediapipe-vendor': ['@mediapipe/face_mesh'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
    },
    sourcemap: false, // Disable sourcemaps for production (reduce size)
    chunkSizeWarningLimit: 600, // Increase limit (we have Three.js)
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ['three', '@mediapipe/face_mesh'],
  },
});
