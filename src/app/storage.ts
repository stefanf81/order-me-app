import type { PlacedRound } from '../history/history.ts'
import { seedCatalog, type Catalog } from '../items/catalog.ts'
import type { Pins } from '../items/pins.ts'
import { recognizeStarters } from '../items/starter.ts'
import type { ShowOrder } from '../show/showOrder.ts'
import { emptyRound, type ComposingRound } from '../round/round.ts'
import { DEFAULT_SETTINGS, type Settings } from '../settings/settings.ts'
import type { Locale } from '../shared/i18n.ts'
import { cleanCatalog, cleanHistory, cleanIds, cleanRound, cleanSettings, type Cleaned } from './validate.ts'

/** The slice of the Web Storage API this module needs; window.localStorage satisfies it. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface AppState {
  catalog: Catalog
  round: ComposingRound
  /** Placed Rounds, newest first. */
  history: PlacedRound[]
  settings: Settings
  /** Pinned Items, in the Operator's order. */
  pins: Pins
  /** The line order of the last shared Round received (#49); empty if none. */
  showOrder: ShowOrder
}

interface Seed {
  locale: Locale
  newId: () => string
}

const KEY = 'order-me'
/** Where a saved state this version can't use is kept before the app starts fresh over it. */
const BACKUP_KEY = 'order-me.unreadable'

/** v1: Catalog + composing Round (#1). */
interface StoredV1 {
  version: 1
  catalog: Catalog
  round: ComposingRound
}

/** v2: adds history of placed Rounds (#3). */
interface StoredV2 extends Omit<StoredV1, 'version'> {
  version: 2
  history: PlacedRound[]
}

/** v3: adds settings (#11). */
interface StoredV3 extends Omit<StoredV2, 'version'> {
  version: 3
  settings: Settings
}

/** v4: adds Pinned Items (#29). */
interface StoredV4 extends Omit<StoredV3, 'version'> {
  version: 4
  pins: Pins
}

/** v5: starter Items are marked (Item.starter), so their names follow the app language (#43). */
interface StoredV5 extends Omit<StoredV4, 'version'> {
  version: 5
}

/** v6: adds the Show order from a shared Round (#49). */
interface StoredV6 extends AppState {
  version: 6
}

type Stored = StoredV1 | StoredV2 | StoredV3 | StoredV4 | StoredV5 | StoredV6

/** True when nothing has been saved yet (or it can't be read): the next load is a first launch. */
export function isFirstLaunch(store: KeyValueStore): boolean {
  return read(store) === null
}

/** Deletes the saved app state, so the next load is a first launch again. Only this app's key: the origin is shared. */
export function forgetAppState(store: KeyValueStore): void {
  try {
    store.removeItem(KEY)
    store.removeItem(BACKUP_KEY)
  } catch {
    // Storage blocked: there was nothing saved to forget.
  }
}

/**
 * Keeps what's stored under the app's key before a fresh start overwrites it. A save from a newer version (after a
 * rollback) or a half-damaged one is still the Operator's History and Items; the next save would destroy it.
 */
function keepUnusable(store: KeyValueStore): void {
  try {
    const raw = store.getItem(KEY)
    if (raw !== null) store.setItem(BACKUP_KEY, raw)
  } catch {
    // Storage blocked or full: nothing more can be done for the old data.
  }
}

/** Reads the saved app state, seeding and saving the starter Catalog on first launch. */
export function loadAppState(store: KeyValueStore, seed: Seed): AppState {
  const saved = read(store)
  if (saved) {
    const { value, dropped } = cleanStored(saved)
    // Dropping a bad entry is the one time a usable save is changed behind the Operator's back: keep the original.
    if (dropped) keepUnusable(store)
    return upgrade(value)
  }

  keepUnusable(store)
  const fresh: AppState = {
    catalog: seedCatalog(seed.locale, seed.newId),
    round: emptyRound(),
    history: [],
    settings: DEFAULT_SETTINGS,
    pins: [],
    showOrder: [],
  }
  saveAppState(store, fresh)
  return fresh
}

/** Saves the app state. Failures (storage blocked or full) are swallowed: the app keeps working in memory. */
export function saveAppState(store: KeyValueStore, state: AppState): void {
  const stored: StoredV6 = { version: 6, ...state }
  try {
    store.setItem(KEY, JSON.stringify(stored))
  } catch {
    // Nothing useful to do mid-round; the next successful save catches up.
  }
}

/**
 * The save with every field checked (validate.ts): bad Items, placed Rounds, counts, pins and settings are dropped,
 * so the screens only ever see well-formed data. Fields a version doesn't have yet are left alone.
 */
function cleanStored(saved: Stored): Cleaned<Stored> {
  const fields: Record<string, unknown> = { ...saved }
  const checks: Cleaned<unknown>[] = []
  const check = <T>(name: string, cleaned: Cleaned<T>) => {
    fields[name] = cleaned.value
    checks.push(cleaned)
  }
  check('catalog', cleanCatalog(saved.catalog))
  check('round', cleanRound(saved.round))
  if (saved.version >= 2) check('history', cleanHistory(fields.history))
  if (saved.version >= 3) check('settings', cleanSettings(fields.settings, DEFAULT_SETTINGS))
  if (saved.version >= 4) check('pins', cleanIds(fields.pins))
  if (saved.version >= 6) check('showOrder', cleanIds(fields.showOrder))
  const dropped = checks.some((c) => c.dropped)
  return { value: dropped ? (fields as unknown as Stored) : saved, dropped }
}

function upgrade(saved: Stored): AppState {
  if (saved.version === 6) return withoutVersion(saved)
  return { ...upgradeToV5(saved), showOrder: [] }
}

function upgradeToV5(saved: Exclude<Stored, StoredV6>): Omit<AppState, 'showOrder'> {
  if (saved.version === 5) return withoutVersion(saved)
  // Before v5, starter Items weren't marked: recognise them by name (starter.ts).
  const earlier = upgradeToV4(saved)
  return { ...earlier, catalog: recognizeStarters(earlier.catalog) }
}

/** The saved state without its storage version: that belongs to the save, not to the app state. */
function withoutVersion<T extends { version: number }>({ version: _version, ...state }: T): Omit<T, 'version'> {
  return state
}

function upgradeToV4(saved: Exclude<Stored, StoredV5 | StoredV6>): Omit<AppState, 'showOrder'> {
  switch (saved.version) {
    case 1:
      return { catalog: saved.catalog, round: saved.round, history: [], settings: DEFAULT_SETTINGS, pins: [] }
    case 2:
      return { catalog: saved.catalog, round: saved.round, history: saved.history, settings: DEFAULT_SETTINGS, pins: [] }
    case 3:
      return { catalog: saved.catalog, round: saved.round, history: saved.history, settings: saved.settings, pins: [] }
    case 4:
      return { catalog: saved.catalog, round: saved.round, history: saved.history, settings: saved.settings, pins: saved.pins }
  }
}

/**
 * The saved state, or null when there is none or it can't be used: unreadable, or not the shape of any version (the
 * origin is shared with other GitHub Pages projects, so the key could hold anything). The app then starts fresh
 * rather than failing to open.
 */
function read(store: KeyValueStore): Stored | null {
  try {
    const raw = store.getItem(KEY)
    const saved: unknown = raw === null ? null : JSON.parse(raw)
    return isStored(saved) ? saved : null
  } catch {
    return null
  }
}

/** A light check of what every version has: a known version, a Catalog list and a Round with counts. */
function isStored(saved: unknown): saved is Stored {
  if (typeof saved !== 'object' || saved === null) return false
  const { version, catalog, round } = saved as Record<string, unknown>
  return (
    typeof version === 'number' &&
    version >= 1 &&
    version <= 6 &&
    Array.isArray(catalog) &&
    typeof round === 'object' &&
    round !== null &&
    typeof (round as Record<string, unknown>).counts === 'object'
  )
}
