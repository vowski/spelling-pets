/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { readFileSync } from 'node:fs'
import { ortCacheName } from './src/ai/ortCache.ts'

// The runtime cache is named after the ONNX Runtime version, so an upgrade never pairs old .wasm files with new code.
const ORT_VERSION: string = JSON.parse(readFileSync('node_modules/onnxruntime-web/package.json', 'utf8')).version

export default defineConfig({
  base: './',
  plugins: [
    react(),
    // The ONNX Runtime files for AI tips are served by the app itself, so Hugging Face is the only outside download.
    viteStaticCopy({ targets: [{ src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*.{mjs,wasm}', dest: 'ort', rename: { stripBase: true } }] }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Spelling Pets',
        short_name: 'Spelling Pets',
        description: 'Fun daily spelling practice with a pet to look after.',
        lang: 'en-GB',
        theme_color: '#5fb88f',
        background_color: '#fff8ec',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,json}'],
        maximumFileSizeToCacheInBytes: 6_000_000,
        // AI tips: the runtime is cached on first use, not precached for everyone. Model files from Hugging Face are
        // cached by Transformers.js itself and are never touched here.
        globIgnores: ['**/ort/**'],
        runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.includes('/ort/'), handler: 'CacheFirst', options: { cacheName: ortCacheName(ORT_VERSION) } }],
      },
    }),
  ],
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tools/**/*.test.ts'],
    restoreMocks: true,
  },
})
