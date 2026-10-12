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

/** Everything but the composing Round: the part that only changes on a deliberate edit (see the split saves). */
export type DataState = Omit<AppState, 'round'>

interface Seed {
  locale: Locale
  newId: () => string
}

/** The slow-changing state: Catalog, History, settings, pins and Show order. Rewritten only when one of them changes. */
const KEY = 'order-me'
/** The composing Round on its own: saved on every tap, so a tap never rewrites the Catalog or History. */
export const ROUND_KEY = 'order-me.round'
/** Where a save this version can't use is kept before the app starts fresh over it. */
export const BACKUP_KEY = 'order-me.unreadable'
/** The same, for a Round that can't be used. */
export const BACKUP_ROUND_KEY = 'order-me.unreadable.round'

/** Every key the app owns on the shared origin: what Reset app and the crash screen clear, and nothing else. */
export const APP_KEYS = [KEY, ROUND_KEY, BACKUP_KEY, BACKUP_ROUND_KEY] as const

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

/** v6: adds the Show order from a shared Round (#49). The last version that held everything in one key. */
interface StoredV6 extends AppState {
  version: 6
}

/** The single-key formats, read and migrated on load. */
type Stored = StoredV1 | StoredV2 | StoredV3 | StoredV4 | StoredV5 | StoredV6

/** v7: the slow-changing state under KEY, without the composing Round. */
interface StoredDataV7 extends DataState {
  version: 7
}

/** v7: the composing Round under ROUND_KEY. */
interface StoredRoundV7 {
  version: 7
  round: ComposingRound
}

type StoredData = Stored | StoredDataV7

/** True when nothing has been saved yet (or it can't be read): the next load is a first launch. */
export function isFirstLaunch(store: KeyValueStore): boolean {
  return readData(store) === null
}

/** Deletes the saved app state, so the next load is a first launch again. Only this app's keys: the origin is shared. */
export function forgetAppState(store: KeyValueStore): void {
  try {
    for (const key of APP_KEYS) store.removeItem(key)
  } catch {
    // Storage blocked: there was nothing saved to forget.
  }
}

/**
 * Keeps what's stored under a key before a fresh start (or a cleaned save) overwrites it. A save from a newer
 * version (after a rollback) or a half-damaged one is still the Operator's History and Items; the next save would
 * destroy it.
 */
function keepUnusable(store: KeyValueStore, key: string, backup: string): void {
  try {
    const raw = store.getItem(key)
    if (raw !== null) store.setItem(backup, raw)
  } catch {
    // Storage blocked or full: nothing more can be done for the old data.
  }
}

/** Reads the saved app state, seeding and saving the starter Catalog on first launch, and migrating older saves. */
export function loadAppState(store: KeyValueStore, seed: Seed): AppState {
  const data = readData(store)
  const round = readRound(store)

  if (data) {
    if (isV7Data(data)) {
      const { value, dropped } = cleanData(data)
      // Dropping a bad entry is the one time a usable save is changed behind the Operator's back: keep the original.
      if (dropped) keepUnusable(store, KEY, BACKUP_KEY)
      return { ...value, round: round ?? emptyRound() }
    }
    const { value, dropped } = cleanStored(data)
    if (dropped) keepUnusable(store, KEY, BACKUP_KEY)
    const upgraded = upgrade(value)
    // A Round in its own key is at least as new as the one in the legacy save; take it, then migrate the save.
    const composing = round ?? upgraded.round
    // The Round first: if that write fails, the legacy save (which still holds it) is left untouched.
    if (saveRound(store, composing)) saveData(store, upgraded)
    return { ...upgraded, round: composing }
  }

  // No usable data: keep what was there before starting fresh over it, including a Round that can't be used alone.
  keepUnusable(store, KEY, BACKUP_KEY)
  if (readRaw(store, ROUND_KEY) !== null) keepUnusable(store, ROUND_KEY, BACKUP_ROUND_KEY)
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

/**
 * Saves everything. The Round goes first: a failed data write then still leaves the previous data (and its Round)
 * intact. A failure (storage blocked or full) is reported, not thrown: the app keeps working in memory.
 */
export function saveAppState(store: KeyValueStore, state: AppState): boolean {
  return saveRound(store, state.round) && saveData(store, state)
}

/** Saves just the composing Round: the small, every-tap write. */
export function saveRound(store: KeyValueStore, round: ComposingRound): boolean {
  const stored: StoredRoundV7 = { version: 7, round }
  try {
    store.setItem(ROUND_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

/** Saves just the slow-changing state: written when the Catalog, History, settings, pins or Show order change. */
export function saveData(store: KeyValueStore, state: DataState): boolean {
  const { catalog, history, settings, pins, showOrder } = state
  const stored: StoredDataV7 = { version: 7, catalog, history, settings, pins, showOrder }
  try {
    store.setItem(KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

/**
 * The single-key save with every field checked (validate.ts): bad Items, placed Rounds, counts, pins and settings are
 * dropped, so the screens only ever see well-formed data. Fields a version doesn't have yet are left alone.
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

/** The v7 data save with every field checked, like cleanStored. */
function cleanData(saved: StoredDataV7): Cleaned<DataState> {
  const checks: Cleaned<unknown>[] = []
  const take = <T>(cleaned: Cleaned<T>): T => {
    checks.push(cleaned)
    return cleaned.value
  }
  const value = {
    catalog: take(cleanCatalog(saved.catalog)),
    history: take(cleanHistory(saved.history)),
    settings: take(cleanSettings(saved.settings, DEFAULT_SETTINGS)),
    pins: take(cleanIds(saved.pins)),
    showOrder: take(cleanIds(saved.showOrder)),
  } as unknown as DataState
  return { value, dropped: checks.some((c) => c.dropped) }
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

function readRaw(store: KeyValueStore, key: string): string | null {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

/**
 * The slow-changing save, or null when there is none or it can't be used: unreadable, or not the shape of any
 * version (the origin is shared with other GitHub Pages projects, so the key could hold anything). The app then
 * starts fresh rather than failing to open.
 */
function readData(store: KeyValueStore): StoredData | null {
  try {
    const raw = store.getItem(KEY)
    const saved: unknown = raw === null ? null : JSON.parse(raw)
    return isStoredData(saved) ? saved : null
  } catch {
    return null
  }
}

/** The composing Round from its own key, or null when there is none or it can't be used (kept under BACKUP_ROUND_KEY). */
function readRound(store: KeyValueStore): ComposingRound | null {
  const raw = readRaw(store, ROUND_KEY)
  if (raw === null) return null
  let saved: unknown
  try {
    saved = JSON.parse(raw)
  } catch {
    keepUnusable(store, ROUND_KEY, BACKUP_ROUND_KEY)
    return null
  }
  if (!isStoredRound(saved)) {
    keepUnusable(store, ROUND_KEY, BACKUP_ROUND_KEY)
    return null
  }
  const { value, dropped } = cleanRound(saved.round)
  if (dropped) keepUnusable(store, ROUND_KEY, BACKUP_ROUND_KEY)
  return value as unknown as ComposingRound
}

/** A light check of the single-key formats: a known version, a Catalog list and a Round with counts. */
function isStoredData(saved: unknown): saved is StoredData {
  if (typeof saved !== 'object' || saved === null) return false
  const { version, catalog, round } = saved as Record<string, unknown>
  // Integers only: a fractional version (e.g. 4.5) would match no upgrade path and crash the app.
  if (typeof version !== 'number' || !Number.isInteger(version) || !Array.isArray(catalog)) return false
  if (version === 7) return true
  return (
    version >= 1 &&
    version <= 6 &&
    typeof round === 'object' &&
    round !== null &&
    typeof (round as Record<string, unknown>).counts === 'object'
  )
}

const isV7Data = (saved: StoredData): saved is StoredDataV7 => saved.version === 7

/** A light check of the Round save: version 7 and a Round with counts. */
function isStoredRound(saved: unknown): saved is StoredRoundV7 {
  if (typeof saved !== 'object' || saved === null) return false
  const { version, round } = saved as Record<string, unknown>
  return version === 7 && typeof round === 'object' && round !== null && typeof (round as Record<string, unknown>).counts === 'object'
}
