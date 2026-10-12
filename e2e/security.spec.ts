import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    violations: string[]
  }
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
 * quietly allowed. This pins that, and the allowances the app genuinely needs; loosening one should be a deliberate
 * edit here, not something that slips in with a new feature.
 */
test('the policy allows only what the app needs, and nothing by default', async ({ page }) => {
  await page.goto('./')
  const content = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  const directives = new Map(
    content!
      .split(';')
      .map((directive) => directive.trim().split(/\s+/))
      .map(([name, ...values]) => [name, values] as const),
  )

  expect(directives.get('default-src')).toEqual(["'none'"])
  expect(directives.get('script-src')).toEqual(["'self'", expect.stringMatching(/^'sha256-[A-Za-z0-9+/=]+'$/)])
  expect(directives.get('style-src')).toEqual(["'self'"])
  // The QR codes are data: images.
  expect(directives.get('img-src')).toEqual(["'self'", 'data:'])
  // Reset app asks the app's own URL whether it is reachable.
  expect(directives.get('connect-src')).toEqual(["'self'"])
  // The browser fetches the web app manifest and the service worker itself.
  expect(directives.get('manifest-src')).toEqual(["'self'"])
  expect(directives.get('worker-src')).toEqual(["'self'"])

  for (const directive of ['font-src', 'media-src', 'frame-src', 'object-src', 'base-uri', 'form-action']) {
    expect(directives.get(directive), directive).toEqual(["'none'"])
  }
})
