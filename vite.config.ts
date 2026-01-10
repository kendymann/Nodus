import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.'
        },
        {
          src: 'public/*',
          dest: '.'
        }
      ]
    })
  ],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: (chunkInfo) => {
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          const fileName = assetInfo.name || '';
          if (fileName.includes('sidepanel') && fileName.endsWith('.html')) {
            return 'sidepanel.html';
          }
          if (fileName && (fileName.includes('icon') || fileName.endsWith('.png'))) {
            return '[name].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        },
        manualChunks: (id) => {
          if (id.includes('src/background') || id.includes('src/content')) {
            return null;
          }
          if (id.includes('node_modules') && !id.includes('src/background') && !id.includes('src/content')) {
            return undefined;
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}));
