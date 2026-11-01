import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/viengchuaonline/',
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  test: { environment: 'jsdom' },
} as any);
