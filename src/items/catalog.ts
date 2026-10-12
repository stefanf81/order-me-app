import type { ComposingRound } from '../round/round.ts'
import type { Locale } from '../shared/i18n.ts'
import { pinnedFirst, type Pins } from './pins.ts'
import { isStarterName, STARTER } from './starter.ts'

export type Category = 'drink' | 'snack'

export interface Item {
  id: string
  name: string
  category: Category
  emoji: string
  /**
   * Set on starter Items: which starter row this is (see starter.ts). Its name then follows the app's language
   * (localizeCatalog) until the Operator renames it.
   */
  starter?: string
}

export type Catalog = Item[]

/** The Catalog a first launch starts with, named in the device's language. Each Item remembers its starter row. */
export function seedCatalog(locale: Locale, newId: () => string): Catalog {
  return STARTER.map((row) => ({ id: newId(), name: row[locale], category: row.category, emoji: row.emoji, starter: row.key }))
}

export type Sections = Record<Category, Item[]>

/**
 * The Catalog as the Items page lists it: Drinks then Snacks, each with its Pinned Items first, then the rest in
 * Catalog order (the starter list's order, then Items as they were added).
 */
export function catalogSections(catalog: Catalog, pins: Pins = []): Sections {
  const section = (category: Category) =>
    pinnedFirst(
      catalog.filter((i) => i.category === category),
      pins,
    )
  return { drink: section('drink'), snack: section('snack') }
}

/** What the Operator fills in when adding or editing an Item. */
export interface ItemDraft {
  name: string
  category: Category
  emoji: string
}

export type DraftProblem = 'nameRequired' | 'emojiRequired'

const emojiSegmenter = new Intl.Segmenter()

/** Tidies a draft (trimmed name, a single emoji) or says what is missing. */
export function checkDraft(draft: ItemDraft): { ok: true; value: ItemDraft } | { ok: false; problem: DraftProblem } {
  const name = draft.name.trim().replace(/\s+/g, ' ')
  if (!name) return { ok: false, problem: 'nameRequired' }
  // First grapheme, so multi-part emoji such as 👩‍🍳 survive intact.
  const [first] = emojiSegmenter.segment(draft.emoji.trim())
  if (!first) return { ok: false, problem: 'emojiRequired' }
  return { ok: true, value: { name, category: draft.category, emoji: first.segment } }
}

export function addToCatalog(catalog: Catalog, draft: ItemDraft, id: string): Catalog {
  return [...catalog, { id, ...draft }]
}

/**
 * Changes an Item's name, category or emoji. Its id, and so its count in the composing Round, stays the same. A
 * starter Item stays one unless renamed: saving the name the sheet showed (in either language) isn't a rename.
 */
export function editItem(catalog: Catalog, itemId: string, draft: ItemDraft): Catalog {
  return catalog.map((item) => {
    if (item.id !== itemId) return item
    const starter = item.starter && isStarterName(item.starter, draft.name) ? item.starter : undefined
    return starter ? { id: itemId, ...draft, starter } : { id: itemId, ...draft }
  })
}

/**
 * Removes an Item from the Catalog, from the Round being composed and from the pins. Placed Rounds keep their
 * snapshot (ADR-0001).
 */
export function deleteItem(
  state: { catalog: Catalog; round: ComposingRound; pins: Pins },
  itemId: string,
): { catalog: Catalog; round: ComposingRound; pins: Pins } {
  const { [itemId]: _removed, ...counts } = state.round.counts
  return {
    catalog: state.catalog.filter((i) => i.id !== itemId),
    // Only the count goes: the Round's table and remark stay.
    round: { ...state.round, counts },
    pins: state.pins.filter((id) => id !== itemId),
  }
}

type Deletable = { catalog: Catalog; round: ComposingRound; pins: Pins; showOrder: string[] }

/** `id` put back at `index` in `ids` (clamped), unless it's there already. */
function reinsert(ids: string[], id: string, index: number): string[] {
  if (index < 0 || ids.includes(id)) return ids
  return [...ids.slice(0, index), id, ...ids.slice(index)]
}

/**
 * Deletes an Item at once (Catalog, composing Round, pins and Show order; History keeps its snapshots, ADR-0001),
 * and returns `undo`, which puts it back exactly where it was: its Catalog place, pin position, Round count and
 * Show order position. Anything else changed in between is kept.
 */
export function deleteWithUndo(state: Deletable, itemId: string): { next: Deletable; undo: (current: Deletable) => Partial<Deletable> } {
  const index = state.catalog.findIndex((i) => i.id === itemId)
  const item = state.catalog[index]
  const count = state.round.counts[itemId]
  const pinAt = state.pins.indexOf(itemId)
  const showAt = state.showOrder.indexOf(itemId)
  const next = { ...deleteItem(state, itemId), showOrder: state.showOrder.filter((id) => id !== itemId) }
  return {
    next,
    undo: (current) => {
      if (!item || current.catalog.some((i) => i.id === itemId)) return {}
      return {
        catalog: [...current.catalog.slice(0, index), item, ...current.catalog.slice(index)],
        round: count ? { ...current.round, counts: { ...current.round.counts, [itemId]: count } } : current.round,
        pins: reinsert(current.pins, itemId, pinAt),
        showOrder: reinsert(current.showOrder, itemId, showAt),
      }
    },
  }
}
