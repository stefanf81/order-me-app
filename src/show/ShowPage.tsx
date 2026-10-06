import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { Sections } from '../items/catalog.ts'
import { roundLines, totalOf, type ComposingRound } from '../round/round.ts'
import type { Messages } from '../shared/i18n.ts'
import type { Overlays } from '../shared/ui/overlays.ts'
import { RoundBar } from '../round/RoundBar.tsx'
import { shareOrCopy, shareText } from './share.ts'
import type { AppActions } from '../app/useAppState.ts'
import { browserHost, keepScreenAwake } from './wakeLock.ts'

interface ShowPageProps {
  round: ComposingRound
  /** The grid's tile order, so lines read in the same order as the tiles. */
  sections: Sections
  /** True while this is the page on screen: the screen is kept awake only then. */
  active: boolean
  t: Messages
  actions: Pick<AppActions, 'addToRound' | 'removeFromRound' | 'clearRound' | 'setRoundNote'>
  /** Places the Round and returns its Undo (see useAppState). */
  onPlace: (sections: Sections) => () => void
  overlays: Overlays
  /** Slides to the Round page: from the empty state, and after Ordered. */
  onGoToRound: () => void
  /** Opens the Share Round sheet (the QR button). */
  onShare: () => void
}

/** Smallest size a name may shrink to before it is allowed to break mid-word. */
const MIN_NAME_PX = 20

/**
 * Names are 32px so they read at arm's length, but a single long word ("Bitterballen") can't fit beside the
 * −/+ buttons on a phone. Shrink just that line, 2px at a time, until it fits; mid-word breaks are a last resort.
 */
function fitName(el: HTMLElement) {
  el.style.fontSize = ''
  el.style.overflowWrap = ''
  let px = parseFloat(getComputedStyle(el).fontSize)
  while (el.scrollWidth > el.clientWidth && px > MIN_NAME_PX) {
    px -= 2
    el.style.fontSize = `${px}px`
  }
  if (el.scrollWidth > el.clientWidth) el.style.overflowWrap = 'anywhere'
}

/**
 * The Show page (ADR-0005): the Round in large type to read out or show to the bartender, and the place to mark it
 * as ordered. A swipe page between Round and Items; Clear lives on the Round page only.
 */
export function ShowPage({ round, sections, active, t, actions, onPlace, overlays, onGoToRound, onShare }: ShowPageProps) {
  const lines = useMemo(() => roundLines(round, sections), [round, sections])
  const total = totalOf(round)
  const bodyRef = useRef<HTMLDivElement>(null)
  /** What the line widths depend on: the names, and the counts beside them. Typing a remark changes neither. */
  const fitKey = lines.map(({ item, count }) => `${item.id}\t${item.name}\t${count}`).join('\n')

  // Fitting measures every line, which forces a layout: only on the page on screen, and only when a line changed.
  // The Round page re-renders this page on every tap; off screen, it is fitted on arrival instead.
  useLayoutEffect(() => {
    if (!active) return
    const fitAll = () => bodyRef.current?.querySelectorAll<HTMLElement>('.show-what').forEach(fitName)
    fitAll()
    window.addEventListener('resize', fitAll)
    return () => window.removeEventListener('resize', fitAll)
  }, [active, fitKey])

  // The screen stays on while the bartender reads it, and may sleep once the Operator swipes away.
  useEffect(() => (active ? keepScreenAwake(browserHost()) : undefined), [active])

  /** Clear stays on Show, which then shows its empty state; Undo brings the Round back (#55). */
  const clear = () => overlays.notify(t.roundCleared, { label: t.undo, run: actions.clearRound() })
  /** The Text button: the Round as plain text, straight to the phone's share sheet, or copied (#57). */
  const shareAsText = async () => {
    const outcome = await shareOrCopy(shareText(lines, t, round), navigator)
    if (outcome === 'copied') overlays.notify(t.copied)
  }
  const markOrdered = () => {
    const undo = onPlace(sections)
    onGoToRound()
    overlays.notify(t.roundPlaced, { label: t.undo, run: undo })
  }

  const list = (category: 'drink' | 'snack') => (
    <ul className="show-lines">
      {lines
        .filter((l) => l.item.category === category)
        .map(({ item, count }) => (
          <li key={item.id} className="show-line">
            <span className="show-count">{count}</span>
            <span className="show-times">×</span>
            <span className="show-what">
              {/* Non-breaking space keeps the emoji on the name's line; long names hyphenate instead. */}
              <span aria-hidden="true">{item.emoji}</span>
              {' '}
              {item.name}
            </span>
            <span className="show-controls">
              <button type="button" aria-label={t.removeOne(item.name)} onClick={() => actions.removeFromRound(item.id)}>
                −
              </button>
              <button type="button" aria-label={t.addOne(item.name)} onClick={() => actions.addToRound(item.id)}>
                +
              </button>
            </span>
          </li>
        ))}
    </ul>
  )
  const hasSnacks = lines.some((l) => l.item.category === 'snack')

  return (
    <section className="page show-page" aria-labelledby="show-title">
      <header className="page-head">
        <h1 className="page-title" id="show-title">
          {t.showTitle}
        </h1>
        {total > 0 && (
          <div className="show-tools">
            {/* Short labels to fit beside the title; the accessible names say what each shares, and contain the label. */}
            <div className="show-share">
              <button type="button" className="btn btn-quiet" aria-label={t.shareAsText} onClick={shareAsText}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-icon">
                  <path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                </svg>
                {t.textShort}
              </button>
              <button type="button" className="btn btn-quiet" aria-label={t.shareAsQr} onClick={onShare}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-icon">
                  <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
                </svg>
                QR
              </button>
            </div>
            {/* The table, right under Text and QR: a table icon as its label. Kept with the Round, saved in History,
                sent with Text and QR; Clear empties it. */}
            <div className="show-table">
              <label htmlFor="round-table">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-icon">
                  <path d="M7 9l1.5-4h7L17 9M3 9h18M5 9v10M19 9v10" />
                </svg>
                <span className="visually-hidden">{t.tableLabel}</span>
              </label>
              <input
                id="round-table"
                className="input input-table"
                value={round.table ?? ''}
                maxLength={10}
                autoComplete="off"
                enterKeyHint="done"
                onChange={(e) => actions.setRoundNote({ table: e.target.value })}
              />
            </div>
          </div>
        )}
      </header>

      {total === 0 ? (
        <div className="show-empty">
          <p>{t.showEmpty}</p>
          <button type="button" className="btn btn-outline" onClick={onGoToRound}>
            {t.backToRound}
          </button>
        </div>
      ) : (
        <>
          <div className="show-body" ref={bodyRef}>
            {list('drink')}
            {hasSnacks && (
              <>
                <h2 className="section-label show-divider">
                  <span className="dot dot-snack" aria-hidden="true" />
                  {t.snacks}
                </h2>
                {list('snack')}
              </>
            )}
            <p className="show-total">
              <span>{t.total}</span>
              <span data-testid="show-total">{total}</span>
            </p>
            {/* The remark, below the total: kept with the Round, saved in History, sent with Text and QR. */}
            <div className="field round-remark">
              <label htmlFor="round-remark">{t.remarkLabel}</label>
              <textarea
                id="round-remark"
                className="input input-remark"
                value={round.remark ?? ''}
                rows={2}
                maxLength={200}
                onChange={(e) => actions.setRoundNote({ remark: e.target.value })}
              />
            </div>
          </div>

          {/* The same bar as the Round page's (#55); none while the Round is empty. */}
          <div className="show-bar">
            <RoundBar total={total} t={t} onClear={clear}>
              <button type="button" className="btn btn-primary" onClick={markOrdered}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-icon">
                  <path d="M5 12l5 5 9-10" />
                </svg>
                {t.markOrdered}
              </button>
            </RoundBar>
          </div>
        </>
      )}
    </section>
  )
}
