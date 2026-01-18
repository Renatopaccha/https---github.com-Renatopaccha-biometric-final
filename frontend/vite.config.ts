
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      // PERFORMANCE OPTIMIZATION: Removed unnecessary package version aliases
      // that can prevent tree-shaking. Only keeping the src alias.
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    // PERFORMANCE OPTIMIZATION: Enable minification for smaller bundles
    minify: 'esbuild',
    // Enable source maps for production debugging
    sourcemap: false,
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Manual chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          // UI component libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          // Chart library (large dependency)
          'chart-vendor': ['recharts'],
          // Form libraries
          'form-vendor': ['react-hook-form'],
          // Markdown rendering
          'markdown-vendor': ['react-markdown'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    allowedHosts: [
      "https-githubcom-renatopaccha-biometric-final-production.up.railway.app",
      "localhost"
    ],
    host: true,
    port: 4173,
  },
});