import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  // For GitHub Pages, the demo app is served from a subpath (e.g. /sge/demo/).
  // Vite needs an explicit base so asset URLs resolve correctly.
  base: process.env.VITE_BASE || '/',
  resolve: {
    alias: {
      '@sge/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'SGE Energy',
        short_name: 'SGE',
        description: 'Claim your SGE tokens on Ethereum mainnet',
        theme_color: '#12B886',
        background_color: '#081B0E',
        display: 'standalone',
        // Use a relative start URL so it works under GitHub Pages subpaths.
        start_url: '.',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*(rpc|alchemy|infura).*/,
            handler: 'NetworkOnly',
          },
        ],
        navigateFallback: `${process.env.VITE_BASE || '/'}index.html`,
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
