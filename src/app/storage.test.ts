import { describe, expect, it } from 'vitest'
import { add, countOf } from '../round/round.ts'
import { forgetAppState, isFirstLaunch, loadAppState, saveAppState, type KeyValueStore } from './storage.ts'

/** In-memory stand-in for window.localStorage. */
function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const ids = () => {
  let n = 0
  return () => `id-${++n}`
}

describe('app state storage', () => {
  it('first launch: the starter Catalog, an empty Round, no history, default settings', () => {
    const state = loadAppState(memoryStore(), { locale: 'en', newId: ids() })
    expect(state.catalog).toHaveLength(28)
    expect(state.round.counts).toEqual({})
    expect(state.history).toEqual([])
    expect(state.pins).toEqual([])
    // Language follows the phone; dark theme.
    expect(state.settings).toEqual({ language: 'system', theme: 'dark' })
  })

  it('knows a first launch: nothing saved yet', () => {
    const store = memoryStore()
    expect(isFirstLaunch(store)).toBe(true)
    loadAppState(store, { locale: 'en', newId: ids() })
    expect(isFirstLaunch(store)).toBe(false)
  })

  it('forgets only its own saved state, so the next launch is a first launch again', () => {
    const store = memoryStore()
    store.setItem('another-app', 'kept')
    const first = loadAppState(store, { locale: 'en', newId: ids() })
    saveAppState(store, { ...first, catalog: [], pins: ['x'] })
    forgetAppState(store)
    expect(isFirstLaunch(store)).toBe(true)
    expect(loadAppState(store, { locale: 'en', newId: ids() }).catalog).toHaveLength(28)
    expect(store.getItem('another-app')).toBe('kept')
  })

  it('seeds only once: a later launch in another language keeps the Operator’s Catalog', () => {
    const store = memoryStore()
    loadAppState(store, { locale: 'nl', newId: ids() })
    const again = loadAppState(store, { locale: 'en', newId: ids() })
    expect(again.catalog.map((i) => i.name)).toContain('Water plat')
    expect(again.catalog.map((i) => i.name)).not.toContain('Still water')
  })

  it('restores the composing Round saved before a restart', () => {
    const store = memoryStore()
    const first = loadAppState(store, { locale: 'en', newId: ids() })
    const duvel = first.catalog.find((i) => i.name === 'Duvel')!
    saveAppState(store, { ...first, round: add(add(first.round, duvel.id), duvel.id) })

    const restarted = loadAppState(store, { locale: 'en', newId: ids() })
    expect(countOf(restarted.round, duvel.id)).toBe(2)
    expect(restarted.catalog).toEqual(first.catalog)
  })

  it('still starts with the starter Catalog when the browser blocks storage', () => {
    const blocked: KeyValueStore = {
      getItem: () => { throw new DOMException('denied', 'SecurityError') },
      setItem: () => { throw new DOMException('denied', 'SecurityError') },
      removeItem: () => { throw new DOMException('denied', 'SecurityError') },
    }
    const state = loadAppState(blocked, { locale: 'en', newId: ids() })
    expect(state.catalog).toHaveLength(28)
    expect(() => saveAppState(blocked, state)).not.toThrow()
    expect(() => forgetAppState(blocked)).not.toThrow()
  })

  it('starts fresh when the saved data is unreadable', () => {
    const store = memoryStore()
    store.setItem('order-me', '{not json')
    const state = loadAppState(store, { locale: 'en', newId: ids() })
    expect(state.catalog).toHaveLength(28)
  })

  it('starts fresh, instead of failing, when the saved data has an unknown version or shape', () => {
    for (const saved of [{ version: 99, catalog: [] }, { version: 6, catalog: 'x' }, { version: 6, catalog: [], round: null }, 42, null]) {
      const store = memoryStore()
      store.setItem('order-me', JSON.stringify(saved))
      expect(loadAppState(store, { locale: 'en', newId: ids() }).catalog, JSON.stringify(saved)).toHaveLength(28)
    }
  })

  it('keeps a save it cannot use under another key, instead of overwriting it with the fresh start', () => {
    const newer = JSON.stringify({ version: 7, catalog: [{ id: 'x', name: 'Future' }], round: { counts: {} }, history: ['kept'] })
    for (const saved of [newer, '{not json']) {
      const store = memoryStore()
      store.setItem('order-me', saved)
      expect(loadAppState(store, { locale: 'en', newId: ids() }).catalog).toHaveLength(28)
      expect(store.getItem('order-me.unreadable'), saved).toBe(saved)
      expect(JSON.parse(store.getItem('order-me')!).version).toBe(6)
    }
  })

  it('writes no backup on a first launch or when the save is usable', () => {
    const store = memoryStore()
    const first = loadAppState(store, { locale: 'en', newId: ids() })
    loadAppState(store, { locale: 'en', newId: ids() })
    expect(first.catalog).toHaveLength(28)
    expect(store.getItem('order-me.unreadable')).toBeNull()
  })

  it('drops only the damaged entries of a save, keeps the rest and the original under another key', () => {
    const good = { id: 'd', name: 'Duvel', category: 'drink', emoji: '🍺' }
    const line = { itemId: 'd', name: 'Duvel', category: 'drink', emoji: '🍺', count: 2 }
    const damaged = {
      version: 6,
      catalog: [good, null, { id: 'x' }, { ...good, id: 'y', category: 'soup' }, 7],
      round: { counts: { d: 2, y: -1, z: 'many', w: 1.5 }, table: 4 },
      history: [{ id: 'r1', placedAt: '2026-09-01T18:00:00.000Z', lines: [line] }, { id: 'r2', placedAt: 'yesterday', lines: [] }, 'x'],
      settings: { language: 'fr', theme: 'light' },
      pins: ['d', 3, null],
      showOrder: 'd',
    }
    const store = memoryStore()
    store.setItem('order-me', JSON.stringify(damaged))
    const state = loadAppState(store, { locale: 'en', newId: ids() })
    expect(state.catalog).toEqual([good])
    expect(state.round).toEqual({ counts: { d: 2 } })
    expect(state.history.map((r) => r.id)).toEqual(['r1'])
    expect(state.settings).toEqual({ language: 'system', theme: 'light' })
    expect(state.pins).toEqual(['d'])
    expect(state.showOrder).toEqual([])
    expect(store.getItem('order-me.unreadable')).toBe(JSON.stringify(damaged))
  })

  it('leaves a well-formed save alone, with no backup', () => {
    const store = memoryStore()
    const first = loadAppState(store, { locale: 'en', newId: ids() })
    const line = { itemId: 'a', name: 'Duvel', category: 'drink' as const, emoji: '🍺', count: 2 }
    saveAppState(store, {
      ...first,
      round: { counts: { a: 1 }, table: '4', remark: 'no ice' },
      history: [{ id: 'r1', placedAt: '2026-09-01T18:00:00.000Z', table: '4', lines: [line] }],
      pins: ['a'],
      showOrder: ['a'],
    })
    const again = loadAppState(store, { locale: 'en', newId: ids() })
    expect(again.history).toHaveLength(1)
    expect(again.round).toEqual({ counts: { a: 1 }, table: '4', remark: 'no ice' })
    expect(store.getItem('order-me.unreadable')).toBeNull()
  })

  it('forgets the kept save too, so a reset leaves nothing behind', () => {
    const store = memoryStore()
    store.setItem('order-me', '{not json')
    loadAppState(store, { locale: 'en', newId: ids() })
    forgetAppState(store)
    expect(store.getItem('order-me.unreadable')).toBeNull()
  })

  it('restores placed Rounds after a restart', () => {
    const store = memoryStore()
    const first = loadAppState(store, { locale: 'en', newId: ids() })
    const placed = {
      id: 'r1',
      placedAt: '2026-09-22T21:14:00.000Z',
      lines: [{ itemId: 'x', name: 'Duvel', category: 'drink' as const, emoji: '🍺', count: 3 }],
    }
    saveAppState(store, { ...first, history: [placed] })

    expect(loadAppState(store, { locale: 'en', newId: ids() }).history).toEqual([placed])
  })

  it('upgrades a save from before history existed, keeping the Catalog and the composing Round', () => {
    const store = memoryStore()
    const catalog = [{ id: 'd', name: 'Duvel', category: 'drink', emoji: '🍺' }]
    store.setItem('order-me', JSON.stringify({ version: 1, catalog, round: { counts: { d: 2 } } }))

    const state = loadAppState(store, { locale: 'en', newId: ids() })
    // Duvel is a starter name, so the upgrade marks it.
    expect(state.catalog).toEqual([{ ...catalog[0], starter: 'duvel' }])
    expect(countOf(state.round, 'd')).toBe(2)
    expect(state.history).toEqual([])
  })

  it('remembers the chosen language and theme after a restart', () => {
    const store = memoryStore()
    const first = loadAppState(store, { locale: 'en', newId: ids() })
    saveAppState(store, { ...first, settings: { language: 'nl', theme: 'light' } })
    expect(loadAppState(store, { locale: 'en', newId: ids() }).settings).toEqual({ language: 'nl', theme: 'light' })
  })

  it('remembers Pinned Items and their order after a restart', () => {
    const store = memoryStore()
    const first = loadAppState(store, { locale: 'en', newId: ids() })
    saveAppState(store, { ...first, pins: ['id-3', 'id-1'] })
    expect(loadAppState(store, { locale: 'en', newId: ids() }).pins).toEqual(['id-3', 'id-1'])
  })

  it('remembers the Show order after a restart, and starts without one', () => {
    const store = memoryStore()
    const first = loadAppState(store, { locale: 'en', newId: ids() })
    expect(first.showOrder).toEqual([])
    saveAppState(store, { ...first, showOrder: ['id-2', 'id-1'] })
    expect(loadAppState(store, { locale: 'en', newId: ids() }).showOrder).toEqual(['id-2', 'id-1'])
  })

  it('upgrades a save from before the Show order existed: no Show order', () => {
    const store = memoryStore()
    const catalog = [{ id: 'k', name: 'Kriek', category: 'drink', emoji: '🍒' }]
    const settings = { language: 'en', theme: 'dark' }
    store.setItem('order-me', JSON.stringify({ version: 5, catalog, round: { counts: {} }, history: [], settings, pins: [] }))
    expect(loadAppState(store, { locale: 'en', newId: ids() })).toEqual({ catalog, round: { counts: {} }, history: [], settings, pins: [], showOrder: [] })
  })

  it('upgrades a save from before starter Items were marked: recognises them, keeps everything else', () => {
    const store = memoryStore()
    const catalog = [
      { id: 'a', name: 'Plat water', category: 'drink', emoji: '💧' },
      { id: 'b', name: 'Kriek', category: 'drink', emoji: '🍒' },
    ]
    const history = [{ id: 'r1', placedAt: '2026-09-22T21:14:00.000Z', lines: [] }]
    const settings = { language: 'nl', theme: 'light' }
    store.setItem('order-me', JSON.stringify({ version: 4, catalog, round: { counts: { a: 2 } }, history, settings, pins: ['b'] }))

    const state = loadAppState(store, { locale: 'en', newId: ids() })
    expect(state.catalog).toEqual([{ ...catalog[0], starter: 'still-water-v1' }, catalog[1]])
    expect(state).toMatchObject({ round: { counts: { a: 2 } }, history, settings, pins: ['b'] })
  })

  it('upgrades the oldest saves too, recognising their starter Items', () => {
    const store = memoryStore()
    const catalog = [{ id: 'd', name: 'Bier', category: 'drink', emoji: '🍺' }]
    store.setItem('order-me', JSON.stringify({ version: 1, catalog, round: { counts: {} } }))
    expect(loadAppState(store, { locale: 'en', newId: ids() }).catalog).toEqual([{ ...catalog[0], starter: 'beer' }])
  })

  it('upgrades a save from before pins existed: everything kept, nothing pinned', () => {
    const store = memoryStore()
    const catalog = [{ id: 'd', name: 'Duvel', category: 'drink', emoji: '🍺' }]
    const history = [{ id: 'r1', placedAt: '2026-09-22T21:14:00.000Z', lines: [] }]
    const settings = { language: 'nl', theme: 'light' }
    store.setItem('order-me', JSON.stringify({ version: 3, catalog, round: { counts: { d: 1 } }, history, settings }))

    const state = loadAppState(store, { locale: 'en', newId: ids() })
    expect(state).toEqual({ catalog: [{ ...catalog[0], starter: 'duvel' }], round: { counts: { d: 1 } }, history, settings, pins: [], showOrder: [] })
  })

  it('upgrades a save from before settings existed, keeping history', () => {
    const store = memoryStore()
    const catalog = [{ id: 'd', name: 'Duvel', category: 'drink', emoji: '🍺' }]
    const history = [{ id: 'r1', placedAt: '2026-09-22T21:14:00.000Z', lines: [] }]
    store.setItem('order-me', JSON.stringify({ version: 2, catalog, round: { counts: {} }, history }))

    const state = loadAppState(store, { locale: 'en', newId: ids() })
    expect(state.history).toEqual(history)
    expect(state.settings).toEqual({ language: 'system', theme: 'dark' })
  })
})
