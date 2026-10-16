import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  workers: 1,
  use: { channel: 'msedge', baseURL: 'http://localhost:5174', viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true },
  webServer: { command: 'npm run dev -- --port 5174 --strictPort', url: 'http://localhost:5174', reuseExistingServer: true, timeout: 60_000 },
})
