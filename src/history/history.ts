import type { Catalog, Category, Sections } from '../items/catalog.ts'
import { emptyRound, noteOf, roundLines, type ComposingRound, type RoundNote } from '../round/round.ts'

/** One line of a placed Round: a frozen copy of the Item as it was (ADR-0001) plus its id, for Popularity only (ADR-0002). */
interface PlacedLine {
  itemId: string
  name: string
  category: Category
  emoji: string
  count: number
}

export interface PlacedRound extends RoundNote {
  id: string
  /** ISO 8601 timestamp. */
  placedAt: string
  lines: PlacedLine[]
}

export interface RoundAndHistory {
  round: ComposingRound
  /** Newest first. */
  history: PlacedRound[]
}

/**
 * Places the composing Round: it joins history as an immutable snapshot and composing starts afresh.
 * Returns an `undo` that takes it back out and restores exactly what was being composed.
 */
export function markOrdered(
  state: RoundAndHistory,
  sections: Sections,
  meta: { id: string; placedAt: string },
): { next: RoundAndHistory; undo: (current: RoundAndHistory) => RoundAndHistory } {
  const placed: PlacedRound = {
    ...meta,
    ...noteOf(state.round),
    lines: roundLines(state.round, sections).map(({ item, count }) => ({
      itemId: item.id,
      name: item.name,
      category: item.category,
      emoji: item.emoji,
      count,
    })),
  }
  const previous = state.round
  return {
    next: { round: emptyRound(), history: [placed, ...state.history] },
    undo: (current) => ({ round: previous, history: current.history.filter((r) => r.id !== placed.id) }),
  }
}

export interface HistoryDay {
  /** 0 for today, 1 for yesterday, … counted in local calendar days. */
  daysAgo: number
  /** Local midnight at the start of that day. */
  day: Date
  rounds: PlacedRound[]
}

const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Time until the next local midnight, from the calendar: right on days that are 23 or 25 hours long too. */
export function msUntilNextDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
}

/** Placed Rounds grouped by the local calendar day they were placed on, newest first. */
export function groupByDay(history: PlacedRound[], now: Date): HistoryDay[] {
  const today = startOfLocalDay(now).getTime()
  const groups: HistoryDay[] = []
  for (const round of history) {
    const day = startOfLocalDay(new Date(round.placedAt))
    // Rounding absorbs the 23- or 25-hour days around daylight-saving changes.
    const daysAgo = Math.round((today - day.getTime()) / 86_400_000)
    const last = groups.at(-1)
    if (last?.daysAgo === daysAgo) last.rounds.push(round)
    else groups.push({ daysAgo, day, rounds: [round] })
  }
  return groups
}

export function placedTotal(round: PlacedRound): number {
  return round.lines.reduce((sum, line) => sum + line.count, 0)
}

export function deletePlacedRound(history: PlacedRound[], roundId: string): PlacedRound[] {
  return history.filter((r) => r.id !== roundId)
}

/**
 * A fresh composing Round copied from a placed one ("same as last time"). Lines are matched to the Catalog by
 * source Item id (ADR-0002), so renamed Items still count; lines whose Item was deleted are skipped.
 */
export function orderAgain(placed: PlacedRound, catalog: Catalog): { round: ComposingRound; skipped: number } {
  const inCatalog = new Set(catalog.map((i) => i.id))
  const counts: Record<string, number> = {}
  let skipped = 0
  for (const line of placed.lines) {
    if (inCatalog.has(line.itemId)) counts[line.itemId] = line.count
    else skipped++
  }
  return { round: { counts, ...noteOf(placed) }, skipped }
}
