import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'Resell Tracker',
        short_name: 'Resell',
        description: 'Inventory, sales and profit tracking for Depop, eBay and Vinted',
        theme_color: '#d2a24c',
        background_color: '#0e0e10',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/resell-tracker/',
        start_url: '/resell-tracker/',
        icons: [
          { src: 'pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Keep navigations to Firebase's own paths away from the SPA fallback.
        navigateFallbackDenylist: [/^\/.*\/__\//, /^\/.*\/google\.firestore/],
        // There is deliberately NO route for firestore.googleapis.com here.
        // Workbox only calls respondWith() for a matching route, so with none,
        // Firestore's requests never enter the service worker and the browser
        // makes them natively. A `NetworkOnly` route is NOT a passthrough — it
        // still hands the request to the SW, which re-issues it with its own
        // fetch(). Firestore's Listen/Write channels are long-lived streams the
        // client aborts routinely, and those aborts surface as "a ServiceWorker
        // intercepted the request and encountered an unexpected error".
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  base: '/resell-tracker/',
  server: { port: 5175 },
})
