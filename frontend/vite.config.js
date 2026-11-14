import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Off in dev so testing never shows stale cached screens; the production build still installs it.
      devOptions: { enabled: false },
      includeAssets: ['icons/favicon-32.png', 'icons/favicon-64.png', 'icons/favicon-dark-64.png', 'icons/apple-touch-icon.png', 'brand/logo-black.png', 'brand/logo-white.png'],
      manifest: {
        name: 'RDG DriveFlow',
        short_name: 'DriveFlow',
        description: 'RDG Car Deals & Services — dealership management & virtual showroom',
        theme_color: '#141414',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Never cache API calls in the service worker — reservations,
        // inventory, and auth state must always hit the network.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Explicit host avoids relying on how this machine resolves "localhost"
    // (IPv4 vs IPv6) — bind every interface so 127.0.0.1 and ::1 both work.
    host: true,
  },
})
