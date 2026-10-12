import { expect, test, type Page } from '@playwright/test'
import { waitForServiceWorker } from './helpers.ts'

async function manifest(page: Page) {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const response = await page.request.get(new URL(href!, page.url()).href)
  expect(response.ok()).toBe(true)
  return response.json()
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('has a web app manifest for installing on the home screen', async ({ page }) => {
  expect(await manifest(page)).toMatchObject({
    name: 'OrderMe',
    short_name: 'OrderMe',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0e0e10',
    background_color: '#0e0e10',
    start_url: '/order-me-app/',
    scope: '/order-me-app/',
  })
})

test('every manifest icon exists at its declared size, including a maskable one', async ({ page }) => {
  const { icons } = await manifest(page)
  expect(icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  expect(icons.some((i: { purpose?: string }) => i.purpose?.includes('maskable'))).toBe(true)

  const manifestUrl = new URL((await page.locator('link[rel="manifest"]').getAttribute('href'))!, page.url())
  for (const icon of icons as { src: string; sizes: string }[]) {
    const src = new URL(icon.src, manifestUrl).href
    const size = await page.evaluate(async (src) => {
      const img = new Image()
      img.src = src
      await img.decode()
      return `${img.naturalWidth}x${img.naturalHeight}`
    }, src)
    expect(size, icon.src).toBe(icon.sizes)
  }
})

test('has an Apple touch icon and home-screen meta tags for iOS', async ({ page }) => {
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
  expect((await page.request.get(new URL(touchIcon!, page.url()).href)).ok()).toBe(true)
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'OrderMe')
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'black')
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
})

/**
 * Chrome's install requirements, checked through Chrome itself: it finds and parses the manifest without errors, and
 * a service worker controls the page. (Page.getInstallabilityErrors would be the direct check, but headless Chrome
 * always answers it with an empty list, even for about:blank, so it proves nothing here.)
 */
test('Chrome finds and parses the manifest without errors, and a service worker controls the page', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Page.getAppManifest is a CDP (Chromium) API')
  await waitForServiceWorker(page)
  const cdp = await page.context().newCDPSession(page)
  const { url, errors, data } = await cdp.send('Page.getAppManifest')

  expect(url).toMatch(/\/order-me-app\/manifest\.webmanifest$/)
  expect(errors).toEqual([])
  expect(JSON.parse(data!)).toMatchObject({ name: 'OrderMe', display: 'standalone' })
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toMatch(/\/order-me-app\/sw\.js$/)
})

/**
 * The service worker's precache manifest lists every file the app shell needs. Workbox's own runtime and sw.js are
 * loaded separately, so they are not in it.
 */
async function precacheUrls(page: Page) {
  const response = await page.request.get(new URL('sw.js', page.url()).href)
  expect(response.ok()).toBe(true)
  const sw = await response.text()
  return [...sw.matchAll(/\{url:"([^"]+)",revision:(?:"[^"]*"|null)\}/g)].map((m) => m[1])
}

/**
 * Each file must appear exactly once. vite-plugin-pwa adds the manifest's own icons and the web app manifest itself
 * on top of workbox.globPatterns; naming the same files in globPatterns too precached them twice, which is harmless
 * but makes the manifest misleading and inflates sw.js.
 */
test('the precache manifest lists each file once, and covers the app shell', async ({ page }) => {
  const urls = await precacheUrls(page)

  expect(urls.length).toBe(new Set(urls).size)

  const app = urls.filter((u) => u.startsWith('assets/')).map((u) => u.split('/').pop()!)
  expect(app.some((f) => f.endsWith('.js'))).toBe(true)
  expect(app.some((f) => f.endsWith('.css'))).toBe(true)
  expect(urls).toContain('index.html')
  expect(urls).toContain('manifest.webmanifest')
  // Kept on purpose, so an install done offline still has every icon.
  expect(urls).toContain('icons/icon-192.png')
  expect(urls).toContain('icons/apple-touch-icon.png')
})

test('after the first visit it loads and works with no network', async ({ page, context, browserName }) => {
  // Playwright's WebKit throws "internal error" reloading an offline page a service worker controls; real Safari
  // serves it from the cache. The app's own offline path is the same on both engines, so it is covered on Chromium.
  test.skip(browserName !== 'chromium', 'Playwright WebKit cannot reload offline under a service worker')
  await waitForServiceWorker(page)
  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'This round is on me' })).toBeVisible()
  await page.getByRole('button', { name: /^Duvel(,|$)/ }).tap()
  await expect(page.getByRole('button', { name: 'Duvel, 1 in round' })).toBeVisible()
  await context.setOffline(false)
})
