/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from GitHub Pages at https://peteriron.github.io/order-me-app/
const BASE = '/order-me-app/'

/** Shown at the bottom of Settings: package.json's version, the CI run number ("dev" locally) and the build date. */
const BUILD = {
  version: (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version,
  number: process.env.GITHUB_RUN_NUMBER ?? 'dev',
  date: new Date().toISOString(),
}

/** Applies a saved light theme before first paint; inlined, since a separate file would load too late. */
const THEME_SCRIPT = readFileSync(new URL('./src/settings/themeBeforePaint.js', import.meta.url), 'utf8')

/**
 * Inlines the theme script into the page's <head> and, in the build, adds a Content-Security-Policy (GitHub Pages
 * can't send headers): the app's own scripts, styles and connections, `data:` images for the QR codes, and nothing
 * else. It starts from `default-src 'none'`, so a resource type nobody thought about is refused rather than quietly
 * allowed. The inline theme script is allowed by its hash. `e2e/security.spec.ts` pins the policy and checks that an
 * inline script it does not name really is blocked.
 *
 * This is defence in depth, not a guarantee: `'self'` covers the whole GitHub Pages origin, which is shared with
 * other projects (see docs/security.md). No policy on the dev server: it injects inline styles.
 */
function themeScriptAndPolicy(): Plugin {
  let build = false
  return {
    name: 'theme-script-and-policy',
    configResolved(config) {
      build = config.command === 'build'
    },
    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [{ tag: 'script', children: THEME_SCRIPT, injectTo: 'head' }]
      if (!build) return tags
      const themeHash = `'sha256-${createHash('sha256').update(THEME_SCRIPT).digest('base64')}'`
      const policy = [
        // Nothing is allowed unless it is named below: no third-party code, no cross-origin request, system fonts
        // only, so every resource type is spelled out rather than inherited.
        "default-src 'none'",
        `script-src 'self' ${themeHash}`,
        "style-src 'self'",
        // The QR codes are data: images.
        "img-src 'self' data:",
        // Reset app asks the app's own URL whether it is reachable (settings/reset.ts).
        "connect-src 'self'",
        // The browser fetches the web app manifest and the service worker itself.
        "manifest-src 'self'",
        "worker-src 'self'",
        "font-src 'none'",
        "media-src 'none'",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
      ].join('; ')
      // First in <head>: a <meta> policy only covers what comes after it.
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }, ...tags]
    },
  }
}

export default defineConfig({
  base: BASE,
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    react(),
    themeScriptAndPolicy(),
    VitePWA({
      // Register with a plain script. The new service worker takes over as soon as it installs (skipWaiting +
      // clientsClaim) but never reloads the open page by itself: a surprise reload while the bartender reads the
      // Counter view would be worse than running the old version a little longer. The app checks for new versions
      // and offers to reload (app/updates.ts); the next launch after a deploy gets the new version anyway.
      injectRegister: 'script-defer',
      registerType: 'autoUpdate',
      // The SVG favicon and the Apple touch icon aren't manifest icons, so name them; the manifest's own icons
      // (192, 512, maskable) are added on their own (includeManifestIcons). They are deliberately precached: an
      // install done with no network still gets every icon.
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: BASE,
        name: 'OrderMe',
        short_name: 'OrderMe',
        description: "Collect your friends' drink and snack requests and read the Round out at the counter.",
        lang: 'en',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0e0e10',
        background_color: '#0e0e10',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only the built app shell. The icons arrive through includeAssets/includeManifestIcons and the web app
        // manifest is added by the plugin itself, so listing png/svg/webmanifest here too would precache the same
        // file twice: 16 entries over 10 files.
        globPatterns: ['**/*.{js,css,html}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Splits React and its scheduler into a separate vendor chunk. When an update only changes app code,
        // the client re-downloads only the ~25 kB app chunk; the ~66 kB React chunk stays cached by the service worker.
        manualChunks: (id) => {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react'
          }
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // The unit tests cover the logic (.ts); the screens (.tsx) are covered by the Playwright specs in e2e/.
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      // A floor just under today's numbers (65.1 / 70.8 / 57.6 / 66.0): it only stops coverage sliding. Raise it as it grows.
      thresholds: { statements: 62, branches: 68, functions: 54, lines: 63 },
    },
  },
})
