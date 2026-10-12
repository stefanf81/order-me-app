import { describe, expect, it } from 'vitest'
import { newId } from './id.ts'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('newId', () => {
  it('generates valid UUID v4 strings in a secure context', () => {
    const id = newId()
    expect(id).toMatch(UUID_V4)
  })

  it('generates distinct IDs on consecutive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId()))
    expect(ids.size).toBe(50)
  })

  it('falls back to pseudo-random UUID v4 when crypto.randomUUID is undefined', () => {
    const original = crypto.randomUUID.bind(crypto)
    try {
      // Emulate an insecure context (e.g. mobile Safari on plain HTTP LAN IP)
      // @ts-expect-error mutating for test
      crypto.randomUUID = undefined
      const id = newId()
      expect(id).toMatch(UUID_V4)
    } finally {
      crypto.randomUUID = original
    }
  })
})
