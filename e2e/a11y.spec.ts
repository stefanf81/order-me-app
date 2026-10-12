import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/** The four pages by their tab, in both themes: no serious or critical accessibility violations (axe-core). */
const PAGES = ['History', 'Round', 'Show', 'Settings']

for (const theme of ['dark', 'light'] as const) {
  test(`no serious accessibility violations on any page in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((theme) => {
      const saved = {
        version: 6,
        catalog: [
          { id: 'd', name: 'Duvel', category: 'drink', emoji: '🍺' },
          { id: 'c', name: 'Chips', category: 'snack', emoji: '🍟' },
        ],
        round: { counts: { d: 2, c: 1 } },
        history: [{ id: 'r1', placedAt: '2026-09-01T18:00:00.000Z', lines: [{ itemId: 'd', name: 'Duvel', category: 'drink', emoji: '🍺', count: 2 }] }],
        settings: { language: 'en', theme },
        pins: [],
        showOrder: [],
      }
      if (!localStorage.getItem('order-me')) localStorage.setItem('order-me', JSON.stringify(saved))
    }, theme)
    await page.goto('./')

    const nav = page.getByRole('navigation', { name: 'Pages' })
    for (const name of PAGES) {
      await nav.getByRole('button', { name }).tap()
      await expect(nav.getByRole('button', { name })).toHaveAttribute('aria-current', 'page')
      const { violations, passes } = await new AxeBuilder({ page }).analyze()
      // The scan really ran: an empty page would pass trivially.
      expect(passes.length).toBeGreaterThan(10)
      const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious.map((v) => `${name}: ${v.id} (${v.nodes.length}) ${v.help}`)).toEqual([])
    }

    // --- Overlays (ItemSheet, QrSheet, ConfirmDialog) ---
    // 1. ItemSheet on Round page
    await nav.getByRole('button', { name: 'Round' }).tap()
    await page.getByRole('button', { name: 'New Item' }).tap()
    await expect(page.getByRole('dialog')).toBeVisible()
    // Wait for the slide-up (240ms) and fade-in (120ms) animations to settle before scanning contrast.
    await page.waitForTimeout(300)
    const itemSheetAxe = await new AxeBuilder({ page }).analyze()
    expect(
      itemSheetAxe.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `ItemSheet: ${v.id} ${v.help}`),
    ).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // 2. QrSheet on Show page
    await nav.getByRole('button', { name: 'Show' }).tap()
    await page.getByRole('button', { name: 'Share as QR code' }).tap()
    await expect(page.getByRole('dialog', { name: 'Share Round' })).toBeVisible()
    await page.waitForTimeout(300)
    const qrSheetAxe = await new AxeBuilder({ page }).analyze()
    expect(
      qrSheetAxe.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `QrSheet: ${v.id} ${v.help}`),
    ).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // 3. ConfirmDialog on Settings page
    await nav.getByRole('button', { name: 'Settings' }).tap()
    await page.getByRole('region', { name: 'General' }).getByRole('button', { name: 'Reset app' }).tap()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.waitForTimeout(200)
    const confirmAxe = await new AxeBuilder({ page }).analyze()
    expect(
      confirmAxe.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `ConfirmDialog: ${v.id} ${v.help}`),
    ).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })
}
