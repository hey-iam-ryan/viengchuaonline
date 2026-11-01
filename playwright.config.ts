import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:4173/viengchuaonline/',
    locale: 'vi-VN',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], locale: 'vi-VN' } }],
  webServer: {
    command: 'npm run build:e2e -w @vco/web && npm run preview -w @vco/web -- --port 4173 --strictPort',
    url: 'http://localhost:4173/viengchuaonline/',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_REALTIME_URL: '' },
  },
});
