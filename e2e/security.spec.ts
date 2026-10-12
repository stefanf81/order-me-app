import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    violations: string[]
    injectedRan?: boolean
  }
}

/** The directives this build is allowed to contain, with the values each must have. Nothing else may appear. */
const ALLOWED: Record<string, string[]> = {
  'default-src': ["'none'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  // The QR codes are data: images.
  'img-src': ["'self'", 'data:'],
  // Reset app asks the app's own URL whether it is reachable.
  'connect-src': ["'self'"],
  // The browser fetches the web app manifest and the service worker itself.
  'manifest-src': ["'self'"],
  'worker-src': ["'self'"],
  'font-src': ["'none'"],
  'media-src': ["'none'"],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
}

test('the Content-Security-Policy blocks nothing the app itself does', async ({ page }) => {
  await page.addInitScript(() => {
    window.violations = []
    document.addEventListener('securitypolicyviolation', (e) => window.violations.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
  // A saved light theme: the inline theme script (allowed by its hash) must still apply it before first paint.
  await page.addInitScript(() => {
    const saved = {
      version: 3,
      catalog: [{ id: 'd', name: 'Duvel', category: 'drink', emoji: '🍺' }],
      round: { counts: {} },
      history: [],
      settings: { language: 'en', theme: 'light' },
    }
    if (!localStorage.getItem('order-me')) localStorage.setItem('order-me', JSON.stringify(saved))
  })
  await page.goto('./')
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  // Round → Show → QR sheet (a data: image).
  const nav = page.getByRole('navigation')
  await page.getByRole('button', { name: /^Duvel(,|$)/ }).tap()
  await nav.getByRole('button', { name: 'Show' }).tap()
  await page.getByRole('button', { name: 'Share as QR code' }).tap()
  await expect(page.getByRole('dialog', { name: 'Share Round' }).getByRole('img')).toBeVisible()

  expect(await page.evaluate(() => window.violations)).toEqual([])
})

/**
 * The policy starts from `default-src 'none'`, so a resource type nobody thought about is refused instead of
 * quietly allowed. This pins the whole policy: the exact set of directives, each one's values, and no repeats.
 * Loosening one should be a deliberate edit here, not something that slips in with a new feature.
 */
test('the policy allows only what the app needs, and nothing by default', async ({ page }) => {
  await page.goto('./')
  const content = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  const parsed = content!
    .split(';')
    .map((directive) => directive.trim())
    .filter(Boolean)
    .map((directive) => directive.split(/\s+/) as [string, ...string[]])

  // A repeated directive is ignored by the browser (the first one counts), so a permissive copy could be appended
  // at the end to hide from a per-name check. Reject repeats outright.
  const names = parsed.map(([name]) => name)
  expect([...new Set(names)]).toEqual(names)

  // No directive beyond the allowed set may exist: a new one (script-src-elem, child-src, …) can widen what runs.
  expect(names.slice().sort()).toEqual(Object.keys(ALLOWED).sort())

  const directives = new Map(parsed.map(([name, ...values]) => [name, values]))
  for (const [name, expected] of Object.entries(ALLOWED)) {
    if (name === 'script-src') {
      // The app's own code, plus the inlined theme script by its hash.
      expect(directives.get(name), name).toEqual(["'self'", expect.stringMatching(/^'sha256-[A-Za-z0-9+/=]+'$/)])
    } else {
      expect(directives.get(name), name).toEqual(expected)
    }
  }
})

/** The policy's whole point is that injected markup cannot run: prove it, rather than trusting the strings above. */
test('an inline script the policy does not name is refused', async ({ page }) => {
  await page.addInitScript(() => {
    window.violations = []
    document.addEventListener('securitypolicyviolation', (e) => window.violations.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
  await page.goto('./')

  await page.evaluate(() => {
    const script = document.createElement('script')
    script.textContent = 'window.injectedRan = true'
    document.head.append(script)
  })

  expect(await page.evaluate(() => window.injectedRan)).toBeUndefined()
  expect(await page.evaluate(() => window.violations)).toEqual([expect.stringContaining('script-src')])
})
