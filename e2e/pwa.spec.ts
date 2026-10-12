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
 * Every precached path, as the service worker stores them: relative to the app's base. A leading '/order-me-app/'
 * is stripped so the test still matches if Workbox switches to absolute URLs.
 */
function precachePaths(sw: string) {
  return [...sw.matchAll(/\{url:"([^"]+)",revision:(?:"[^"]*"|null)\}/g)].map(([, url]) =>
    url.replace(/^\/order-me-app\//, ''),
  )
}

/**
 * Each file appears exactly once, and the set is exactly the app shell plus every icon the page and manifest point
 * at. vite-plugin-pwa adds the manifest's icons and the web app manifest itself on top of workbox.globPatterns, so
 * naming the same files in globPatterns too listed them twice (harmless, but a misleading manifest).
 *
 * The icons are read from the manifest and the <link> tags rather than hardcoded, so dropping one is caught.
 */
test('the precache manifest lists each file once: the app shell and every icon', async ({ page }) => {
  const response = await page.request.get(new URL('sw.js', page.url()).href)
  expect(response.ok()).toBe(true)
  const paths = precachePaths(await response.text())

  expect(paths.length).toBe(new Set(paths).size)

  const href = async (selector: string) =>
    new URL((await page.locator(selector).getAttribute('href'))!, page.url()).pathname.replace(/^\/order-me-app\//, '')
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await page.request.get(new URL(manifestHref!, page.url()).href)).json()

  const icons = [
    ...manifest.icons.map((icon: { src: string }) => icon.src),
    await href('link[rel="icon"]'),
    await href('link[rel="apple-touch-icon"]'),
  ]
  const byName = (a: string, b: string) => a.localeCompare(b)
  // The app shell: the page, the web app manifest, the script that registers the service worker, and the icons.
  // The assets are named by their hash, so those are compared by extension rather than by name.
  expect(paths.filter((p) => !p.startsWith('assets/')).sort(byName)).toEqual(
    ['index.html', 'manifest.webmanifest', 'registerSW.js', ...icons].sort(byName),
  )
  // The assets in assets/: one CSS stylesheet, and two JS chunks (the app shell and the React vendor chunk).
  expect(paths.filter((p) => p.startsWith('assets/')).map((p) => p.slice(p.lastIndexOf('.'))).sort(byName)).toEqual([
    '.css',
    '.js',
    '.js',
  ])
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
