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
 * can't send headers): only the app's own scripts, styles and connections, so injected markup could never run code
 * or send data elsewhere. The inline theme script is allowed by its hash. No policy on the dev server: it injects
 * inline styles.
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
        "default-src 'self'",
        `script-src 'self' ${themeHash}`,
        "style-src 'self'",
        // The QR codes are data: images.
        "img-src 'self' data:",
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
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // The unit tests cover the logic (.ts); the screens (.tsx) are covered by the Playwright specs in e2e/.
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      // A floor just under today's numbers (65.7 / 72.2 / 58.4 / 66.7): it only stops coverage sliding. Raise it as it grows.
      thresholds: { statements: 62, branches: 68, functions: 54, lines: 63 },
    },
  },
})
