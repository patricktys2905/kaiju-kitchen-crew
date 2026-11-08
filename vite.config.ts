import { execSync } from 'node:child_process';
import { configDefaults } from 'vitest/config';
import { defineConfig } from 'vite';

// Version shown in the menu corner: build date + commit, so you can tell which build a phone is running.
let commit = 'dev';
try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* not a git checkout */ }
const VERSION = process.env.KKC_VERSION ?? `${new Date().toISOString().slice(0, 10)}-${commit}`;
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the build works from any static host path (e.g. GitHub Pages /kitchen-kaiju/).
  base: './',
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  // host: true exposes the dev server on your Wi-Fi so phones/tablets on the same network can play.
  server: { port: 5195, host: true, open: false },
  preview: { host: true },
  build: { chunkSizeWarningLimit: 2500 },
  // agent worktrees live under .claude/: never run their tests from here
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
  plugins: [
    VitePWA({
      // 'prompt' so a new version never reloads mid-match; src/pwa.ts applies it from the menu.
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Kaiju Kitchen Crew',
        short_name: 'Kitchen Crew',
        description: 'A co-op cooking platformer for 2-6 tiny food kaiju. Stack up, cook the recipe, everyone onto the plate!',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'landscape',
        theme_color: '#140e0a',
        background_color: '#140e0a',
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole game so it runs with no connection after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,json,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
