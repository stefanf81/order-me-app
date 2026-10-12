import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Category, Item } from '../items/catalog.ts'
import { decodeCatalog, encodeCatalog, sharedPayload } from '../items/sharedCatalog.ts'
import type { RoundLine } from '../round/round.ts'
import { decodeRound, encodeRound, MAX_COUNT, MAX_NOTE, roundPayload } from '../show/sharedRound.ts'

// Tidied single-line names without consecutive spaces (matching checkDraft's normalization)
const safeText = (maxLen: number) =>
  fc
    .stringMatching(/^[A-Za-z0-9_-]+( [A-Za-z0-9_-]+)*$/)
    .filter((s) => s.length > 0 && s.length <= maxLen)

const categoryArb = fc.constantFrom<Category>('drink', 'snack')

const itemArb: fc.Arbitrary<Item> = fc.record({
  id: fc.uuid(),
  name: safeText(30),
  category: categoryArb,
  emoji: fc.constantFrom('🍺', '🍷', '🍟', '☕', '🥤', '🥜'),
})

describe('property-based tests: link payload extraction', () => {
  it('roundPayload handles arbitrary hash strings safely', () => {
    fc.assert(
      fc.property(fc.string(), (hash) => {
        const payload = roundPayload(hash)
        if (hash.startsWith('#round=')) {
          expect(payload).toBe(hash.slice(7))
        } else {
          expect(payload).toBeNull()
        }
      }),
      { numRuns: 200 },
    )
  })

  it('sharedPayload handles arbitrary hash strings safely', () => {
    fc.assert(
      fc.property(fc.string(), (hash) => {
        const payload = sharedPayload(hash)
        if (hash.startsWith('#items=')) {
          expect(payload).toBe(hash.slice(7))
        } else {
          expect(payload).toBeNull()
        }
      }),
      { numRuns: 200 },
    )
  })
})

describe('property-based tests: decode fuzzing against arbitrary payloads', () => {
  it('decodeRound never throws or crashes on arbitrary strings and validates returned shapes', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (payload) => {
        const res = await decodeRound(payload)
        if (res !== null) {
          expect(Array.isArray(res.lines)).toBe(true)
          expect(res.lines.length).toBeLessThanOrEqual(200)
          for (const line of res.lines) {
            expect(line.count).toBeGreaterThan(0)
            expect(Number.isInteger(line.count)).toBe(true)
            expect(typeof line.item.name).toBe('string')
            expect(line.item.name.length).toBeGreaterThan(0)
            expect(['drink', 'snack']).toContain(line.item.category)
          }
          if (res.table !== undefined) expect(typeof res.table).toBe('string')
          if (res.remark !== undefined) expect(typeof res.remark).toBe('string')
        }
      }),
      { numRuns: 100 },
    )
  })

  it('decodeCatalog never throws or crashes on arbitrary strings and validates returned shapes', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (payload) => {
        const res = await decodeCatalog(payload)
        if (res !== null) {
          expect(Array.isArray(res)).toBe(true)
          expect(res.length).toBeLessThanOrEqual(200)
          for (const item of res) {
            expect(typeof item.name).toBe('string')
            expect(item.name.length).toBeGreaterThan(0)
            expect(typeof item.emoji).toBe('string')
            expect(['drink', 'snack']).toContain(item.category)
          }
        }
      }),
      { numRuns: 100 },
    )
  })
})

describe('property-based tests: encode/decode round trips', () => {
  it('catalog encode followed by decode preserves items', async () => {
    const catalogArb = fc.uniqueArray(itemArb, { selector: (i) => i.name, minLength: 1, maxLength: 20 })

    await fc.assert(
      fc.asyncProperty(catalogArb, async (catalog) => {
        const encoded = await encodeCatalog(catalog)
        expect(typeof encoded).toBe('string')
        const decoded = await decodeCatalog(encoded)
        expect(decoded).not.toBeNull()
        expect(decoded!.map((i) => ({ name: i.name, category: i.category, emoji: i.emoji }))).toEqual(
          catalog.map((i) => ({ name: i.name, category: i.category, emoji: i.emoji })),
        )
      }),
      { numRuns: 30 },
    )
  })

  it('round encode followed by decode preserves counts, names and notes', async () => {
    const roundLineArb = fc
      .record({
        item: itemArb,
        count: fc.integer({ min: 1, max: MAX_COUNT }),
      })
      .map((r): RoundLine => r)

    const roundLinesArb = fc.uniqueArray(roundLineArb, { selector: (r) => r.item.name, minLength: 1, maxLength: 15 })

    const noteArb = fc.record({
      table: fc.option(safeText(MAX_NOTE.t), { nil: undefined }),
      remark: fc.option(safeText(MAX_NOTE.r), { nil: undefined }),
    })

    await fc.assert(
      fc.asyncProperty(roundLinesArb, noteArb, async (lines, note) => {
        const encoded = await encodeRound(lines, note)
        expect(typeof encoded).toBe('string')
        const decoded = await decodeRound(encoded)
        expect(decoded).not.toBeNull()
        expect(decoded!.lines.map((l) => ({ name: l.item.name, count: l.count, category: l.item.category }))).toEqual(
          lines.map((l) => ({ name: l.item.name, count: l.count, category: l.item.category })),
        )
        if (note.table) expect(decoded!.table).toBe(note.table)
        if (note.remark) expect(decoded!.remark).toBe(note.remark)
      }),
      { numRuns: 30 },
    )
  })
})
