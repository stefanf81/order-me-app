import { memo, useMemo, useState } from 'react'
import type { Catalog } from '../items/catalog.ts'
import type { Messages } from '../shared/i18n.ts'
import type { Overlays } from '../shared/ui/overlays.ts'
import type { AppActions } from '../app/useAppState.ts'
import { groupByDay, orderAgain, placedTotal, type HistoryDay, type PlacedRound } from './history.ts'
import { useToday } from './useToday.ts'

interface HistoryPageProps {
  history: PlacedRound[]
  /** For Order again, which only brings back Items still in the Catalog. */
  catalog: Catalog
  /** Locale for dates and times, from formattingLocale(). */
  dateLocale: string
  t: Messages
  actions: Pick<AppActions, 'deleteRound' | 'replaceRound'>
  overlays: Overlays
  /** Called after Order again, to show the refilled Round. */
  onOrderedAgain: () => void
}

/**
 * Past Rounds by day, newest first. Everything shown comes from the placed snapshot, never the live Catalog.
 * Memoized: History grows without end, and a tap on the Round page must not re-render all of it.
 */
export const HistoryPage = memo(function HistoryPage({
  history,
  catalog,
  dateLocale,
  t,
  actions,
  overlays,
  onOrderedAgain,
}: HistoryPageProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const now = useToday()
  const time = useMemo(() => new Intl.DateTimeFormat(dateLocale, { hour: '2-digit', minute: '2-digit' }), [dateLocale])
  const days = useMemo(() => groupByDay(history, now), [history, now])

  const dayLabel = ({ daysAgo, day }: HistoryDay) => {
    if (daysAgo === 0) return t.today
    if (daysAgo === 1) return t.yesterday
    const year = day.getFullYear() === now.getFullYear() ? undefined : 'numeric'
    return new Intl.DateTimeFormat(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year }).format(day)
  }

  const confirmDelete = (round: PlacedRound) =>
    overlays.confirm({
      text: t.deleteRoundConfirm,
      confirmLabel: t.delete,
      onConfirm: () => actions.deleteRound(round.id),
    })

  const orderAgainFrom = (placed: PlacedRound) => {
    // Always replaces what is being composed (PRD): no prompt, no undo.
    const { round, skipped } = orderAgain(placed, catalog)
    actions.replaceRound(round)
    onOrderedAgain()
    if (skipped > 0) overlays.notify(t.skippedItems(skipped))
  }

  const toggle = (id: string) =>
    setExpanded((open) => {
      const next = new Set(open)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <section className="page" aria-labelledby="history-title">
      <header className="page-head">
        <h1 className="page-title" id="history-title">
          {t.history}
        </h1>
        {history.length > 0 && <span className="page-sub">{t.roundsCount(history.length)}</span>}
      </header>

      {history.length === 0 && <p className="page-empty">{t.historyEmpty}</p>}

      {days.map((group) => (
        <section key={group.day.getTime()} className="section">
          <h2 className="section-label">{dayLabel(group)}</h2>
          {group.rounds.map((round) => {
            const at = time.format(new Date(round.placedAt))
            const open = expanded.has(round.id)
            return (
              <article key={round.id} className="history-card" aria-label={t.roundAt(at)}>
                <div className="history-card-head">
                  <b>
                    {at}
                    {round.table && <span className="history-table"> · {t.tableLine(round.table)}</span>}
                  </b>
                  <span>{t.itemsCount(placedTotal(round))}</span>
                </div>
                <button
                  type="button"
                  className="history-summary"
                  aria-expanded={open}
                  onClick={() => toggle(round.id)}
                >
                  {round.lines.map((l) => `${l.count} ${l.name}`).join(' · ')}
                </button>
                {open && (
                  <ul className="history-lines">
                    {round.lines.map((l) => (
                      <li key={l.itemId}>
                        <b>{l.count}</b>
                        <span>
                          <span aria-hidden="true">{l.emoji}</span> {l.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {round.remark && <p className="history-remark">{t.remarkLine(round.remark)}</p>}
                <div className="history-card-actions">
                  <button type="button" className="btn btn-outline" onClick={() => orderAgainFrom(round)}>
                    {t.orderAgain}
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-quiet"
                    aria-label={t.deleteRoundFrom(at)}
                    onClick={() => confirmDelete(round)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-icon">
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      ))}
    </section>
  )
})
