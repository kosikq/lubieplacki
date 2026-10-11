import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// Na GitHub Pages aplikacja leży pod /<repo>/ — ustawiane w workflow przez BASE_PATH.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    preact({ prerender: { enabled: false } }),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'splash/*.png'],
      manifest: {
        name: 'CBZC Trener',
        short_name: 'CBZC',
        description: 'Nauka do testu teoretycznego CBZC — 300 pytań, egzamin próbny, statystyki.',
        lang: 'pl',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F2F2F7',
        theme_color: '#F2F2F7',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    target: 'safari16',
    cssTarget: 'safari16',
    reportCompressedSize: true,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
} as any);
