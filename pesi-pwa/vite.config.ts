import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/PESI-Ponto_v1/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'PESI Ponto',
        short_name: 'PESI',
        description: 'Programa Escola em Tempo Integral — Ponto (Oficineiro/Coordenador/Admin)',
        theme_color: '#0f4c81',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/PESI-Ponto_v1/',
        start_url: '/PESI-Ponto_v1/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/, handler: 'NetworkFirst', options: { cacheName: 'supabase-api', networkTimeoutSeconds: 5 } },
        ],
      },
    }),
  ],
})
