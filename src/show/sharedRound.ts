import type { Catalog, Item } from '../items/catalog.ts'
import type { Pins } from '../items/pins.ts'
import { itemLine, parseItemLine, type SharedItem } from '../items/sharedCatalog.ts'
import { starterRow } from '../items/starter.ts'
import { noteOf, type ComposingRound, type RoundLine, type RoundNote } from '../round/round.ts'
import { fragmentLink, MAX_LINK_ITEMS, pack, unpack } from '../shared/shareLink.ts'
import type { ShowOrder } from './showOrder.ts'

/**
 * A shared Round travels in the app's own link, after `#round=`, so it never reaches a server: a one-time hand-over
 * of the Round as the sender's Show tab lists it, not a live sync.
 *
 * Format v2: the text "2"; then the table and remark when set, as `t` or `r`, a tab and the text as a JSON string
 * (so line breaks and quotes survive); then one line per Round line, in the sender's Show order: the count, a tab,
 * then the Item as an Item line of the Items link (sharedCatalog.ts: a starter mark, or category, emoji and name).
 * Packed by shared/shareLink.ts, like the Items link. Format v1 (no table or remark) is still read.
 */
const FRAGMENT = '#round='
const VERSION = '2'
/** Longest table and remark taken from a link: the Show page's own limits. */
export const MAX_NOTE = { t: 10, r: 200 } as const
/** Far beyond any real Round; a bigger count is a broken or crafted link. */
export const MAX_COUNT = 999

interface SharedLine {
  item: SharedItem
  count: number
}

/** A Round as it arrives from a link: its lines in the sender's order, and its table and remark if any. */
export interface SharedRound extends RoundNote {
  lines: SharedLine[]
}

export async function encodeRound(lines: RoundLine[], note: RoundNote = {}): Promise<string> {
  const { table, remark } = noteOf(note)
  return pack(
    [
      VERSION,
      ...(table ? [`t\t${JSON.stringify(table)}`] : []),
      ...(remark ? [`r\t${JSON.stringify(remark)}`] : []),
      ...linkRows(lines),
    ].join('\n'),
  )
}

/**
 * The Round's lines as link rows, in order. A count above `MAX_COUNT` becomes consecutive rows that the receiver
 * merges back into one count (see `receiveRound`); a Round whose counts need more rows than a link may carry throws,
 * so the share sheet shows its error instead of emitting a link its own decoder would reject.
 */
function linkRows(lines: RoundLine[]): string[] {
  const out: string[] = []
  for (const { item, count } of lines) {
    if (!Number.isInteger(count) || count < 1) throw new Error('Round count out of range')
    const itemRows = Math.ceil(count / MAX_COUNT)
    if (out.length + itemRows > MAX_LINK_ITEMS) throw new Error('Round too large')
    const line = itemLine(item)
    for (let left = count; left > 0; left -= MAX_COUNT) out.push(`${Math.min(left, MAX_COUNT)}\t${line}`)
  }
  return out
}

/** A shared Round, or null when the link can't be read in full: used whole or not at all. */
export async function decodeRound(payload: string): Promise<SharedRound | null> {
  try {
    const [version, ...rows] = (await unpack(payload)).split('\n')
    if ((version !== '1' && version !== VERSION) || rows.length === 0) return null
    const lines: SharedLine[] = []
    const note: RoundNote = {}
    for (const row of rows) {
      const field = version === VERSION && (row.startsWith('t\t') || row.startsWith('r\t')) ? (row[0] as 't' | 'r') : null
      if (field) {
        const text: unknown = JSON.parse(row.slice(2))
        if (typeof text !== 'string' || text.length > MAX_NOTE[field] || lines.length > 0) return null
        note[field === 't' ? 'table' : 'remark'] = text
        continue
      }
      const tab = row.indexOf('\t')
      const count = Number(row.slice(0, tab))
      const item = tab > 0 ? parseItemLine(row.slice(tab + 1)) : null
      if (!item || !Number.isInteger(count) || count < 1 || count > MAX_COUNT || lines.length >= MAX_LINK_ITEMS) return null
      lines.push({ item, count })
    }
    return lines.length > 0 ? { lines, ...noteOf(note) } : null
  } catch {
    return null
  }
}

/** The app's address with the shared Round in its fragment. */
export function roundLink(appUrl: string, payload: string): string {
  return fragmentLink(appUrl, FRAGMENT, payload)
}

/** The encoded Round in an address fragment, or null when the fragment isn't a shared Round. */
export function roundPayload(hash: string): string | null {
  return hash.startsWith(FRAGMENT) ? hash.slice(FRAGMENT.length) : null
}

type Receiving = { catalog: Catalog; round: ComposingRound; pins: Pins; showOrder: ShowOrder }

/**
 * Takes in a shared Round: each line is matched to one of the receiver's Items (a starter Item by its mark, any Item
 * by name and category, ignoring case, in either language for starter Items), drinks the receiver doesn't have are
 * added to their Catalog, unpinned, and the shared Round replaces theirs. The sender's line order becomes their Show
 * order (#49), and its table and remark replace theirs. Nothing of theirs is removed or renamed; History and pins aren't touched. `undo` brings back their
 * Round and Show order and removes the added Items.
 */
export function receiveRound(
  state: Receiving,
  { lines, ...note }: SharedRound,
  newId: () => string,
): { next: Pick<Receiving, 'catalog' | 'round' | 'showOrder'>; undo: (current: Receiving) => Partial<Receiving> } {
  const catalog = [...state.catalog]
  const added = new Set<string>()
  const counts: Record<string, number> = {}
  /** The sender's line order, once per Item. */
  const order: string[] = []
  for (const { item, count } of lines) {
    let match = findMatch(catalog, item)
    if (!match) {
      match = { id: newId(), ...item }
      catalog.push(match)
      added.add(match.id)
    }
    if (!(match.id in counts)) order.push(match.id)
    counts[match.id] = (counts[match.id] ?? 0) + count
  }
  const previous = { round: state.round, showOrder: state.showOrder }
  return {
    next: { catalog, round: { counts, ...noteOf(note) }, showOrder: order },
    undo: (current) => ({
      ...previous,
      catalog: current.catalog.filter((i) => !added.has(i.id)),
      pins: current.pins.filter((id) => !added.has(id)),
    }),
  }
}

function findMatch(catalog: Catalog, shared: SharedItem): Item | undefined {
  if (shared.starter) {
    const same = catalog.find((i) => i.starter === shared.starter)
    if (same) return same
  }
  const wanted = namesOf(shared)
  return catalog.find((i) => i.category === shared.category && [...namesOf(i)].some((name) => wanted.has(name)))
}

/** An Item's names to match on, lower-cased: its own, and for a starter Item both its English and Dutch name. */
function namesOf(item: SharedItem): Set<string> {
  const row = item.starter ? starterRow(item.starter) : undefined
  return new Set([item.name, row?.en, row?.nl].filter((n) => n !== undefined).map((n) => n.toLocaleLowerCase()))
}
