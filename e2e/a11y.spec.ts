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
  })
}
