/**
 * Checks a saved state field by field. The origin is shared with other pages and an old or damaged save can hold
 * anything under the app's key, and the screens assume well-formed Items and Rounds: one bad entry would crash the
 * app on every launch. A bad entry is dropped, never repaired by guessing; the rest of the save is kept.
 */

export interface Cleaned<T> {
  value: T
  /** True when something had to be dropped or replaced. */
  dropped: boolean
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string'
const isCategory = (v: unknown) => v === 'drink' || v === 'snack'

/** The valid entries of a list; a list that isn't one is empty. Valid entries stay the same objects. */
function keepValid<T>(list: unknown, valid: (entry: unknown) => entry is T): Cleaned<T[]> {
  if (!Array.isArray(list)) return { value: [], dropped: true }
  const value = list.filter(valid)
  return { value, dropped: value.length !== list.length }
}

const isItem = (v: unknown): v is Record<string, unknown> =>
  isRecord(v) && isText(v.id) && isText(v.name) && v.name !== '' && isCategory(v.category) && isText(v.emoji) && (v.starter === undefined || isText(v.starter))

const isPlacedLine = (v: unknown): boolean =>
  isRecord(v) && isText(v.itemId) && isText(v.name) && isCategory(v.category) && isText(v.emoji) && Number.isInteger(v.count) && (v.count as number) > 0

const isPlacedRound = (v: unknown): v is Record<string, unknown> =>
  isRecord(v) &&
  isText(v.id) &&
  isText(v.placedAt) &&
  !Number.isNaN(Date.parse(v.placedAt)) &&
  Array.isArray(v.lines) &&
  v.lines.every(isPlacedLine) &&
  (v.table === undefined || isText(v.table)) &&
  (v.remark === undefined || isText(v.remark))

export const cleanCatalog = (list: unknown) => keepValid(list, isItem)
export const cleanHistory = (list: unknown) => keepValid(list, isPlacedRound)
export const cleanIds = (list: unknown) => keepValid(list, isText)

/** The composing Round: positive whole counts only, and a table and remark only if they are text. */
export function cleanRound(round: unknown): Cleaned<Record<string, unknown>> {
  if (!isRecord(round) || !isRecord(round.counts)) return { value: { counts: {} }, dropped: true }
  const entries = Object.entries(round.counts)
  const counts = entries.filter(([, n]) => Number.isInteger(n) && (n as number) > 0)
  const textOk = (round.table === undefined || isText(round.table)) && (round.remark === undefined || isText(round.remark))
  if (counts.length === entries.length && textOk) return { value: round, dropped: false }
  const { table, remark } = round
  return {
    value: { counts: Object.fromEntries(counts), ...(isText(table) ? { table } : {}), ...(isText(remark) ? { remark } : {}) },
    dropped: true,
  }
}

/** The language and theme, each falling back to its default when it isn't one of the known values. */
export function cleanSettings(settings: unknown, defaults: { language: string; theme: string }): Cleaned<Record<string, unknown>> {
  if (!isRecord(settings)) return { value: { ...defaults }, dropped: true }
  const language = ['system', 'en', 'nl'].includes(settings.language as string) ? settings.language : defaults.language
  const theme = ['dark', 'light', 'system'].includes(settings.theme as string) ? settings.theme : defaults.theme
  const ok = language === settings.language && theme === settings.theme
  return { value: ok ? settings : { ...settings, language, theme }, dropped: !ok }
}
