import { useState, type KeyboardEvent } from 'react'
import type { Sections } from '../items/catalog.ts'
import type { Messages } from '../shared/i18n.ts'
import type { Overlays } from '../shared/ui/overlays.ts'
import { CategorySection } from '../shared/ui/CategorySection.tsx'
import type { AppActions } from '../app/useAppState.ts'
import { RoundBar } from './RoundBar.tsx'
import { Tile } from './Tile.tsx'
import { countOf, totalOf, type ComposingRound } from './round.ts'
import { searchSections } from './search.ts'

interface RoundPageProps {
  sections: Sections
  round: ComposingRound
  t: Messages
  actions: Pick<AppActions, 'addToRound' | 'removeFromRound' | 'clearRound'>
  overlays: Overlays
  onShow: () => void
  onNew: () => void
}

export function RoundPage({ sections, round, t, actions, onShow, onNew, overlays }: RoundPageProps) {
  /** Clear at once, with Undo (#55). */
  const clear = () => overlays.notify(t.roundCleared, { label: t.undo, run: actions.clearRound() })

  /** The search: null while closed. It stays open after tapping a tile, until its × (or Escape) closes it. */
  const [query, setQuery] = useState<string | null>(null)
  const searching = query !== null && query.trim() !== ''
  const shown = searching ? searchSections(sections, query) : sections
  const closeSearch = () => setQuery(null)
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') closeSearch()
    // Enter puts the keyboard away, to see the results.
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  const newTile = (
    // Last tile of the grid: add something that isn't in the Catalog yet, straight into the Round.
    <div className="tile tile-new">
      <button type="button" className="tile-add" aria-label={t.newItem} onClick={onNew}>
        <span className="tile-emoji" aria-hidden="true">
          +
        </span>
        <span className="tile-name">{t.newTile}</span>
      </button>
    </div>
  )

  const section = (category: keyof Sections, heading: string) => (
    <CategorySection category={category} heading={heading} idPrefix="round">
      <div className="grid">
        {shown[category].map((item) => {
          const count = countOf(round, item.id)
          return (
            <Tile
              key={item.id}
              item={item}
              count={count}
              label={t.tileLabel(item.name, count)}
              removeLabel={t.removeOne(item.name)}
              onAdd={actions.addToRound}
              onRemove={actions.removeFromRound}
            />
          )
        })}
        {category === 'snack' && newTile}
      </div>
    </CategorySection>
  )

  return (
    <>
      <div className="page">
        <header className="page-head round-head">
          {/* While searching, the field takes the title's place; the heading stays for screen readers. */}
          <h1 className={query === null ? 'page-title' : 'visually-hidden'}>{t.appName}</h1>
          {query === null ? (
            <button type="button" className="icon-btn icon-btn-quiet" aria-label={t.search} onClick={() => setQuery('')}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-icon">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
            </button>
          ) : (
            <div className="search-field" role="search">
              <input
                type="search"
                className="input"
                aria-label={t.search}
                placeholder={t.searchPlaceholder}
                value={query}
                autoFocus
                enterKeyHint="search"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
              />
              <button type="button" className="icon-btn icon-btn-quiet" aria-label={t.closeSearch} onClick={closeSearch}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-icon">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          )}
        </header>
        {(!searching || shown.drink.length > 0) && section('drink', t.drinks)}
        {(!searching || shown.snack.length > 0) && section('snack', t.snacks)}
        {searching && shown.drink.length + shown.snack.length === 0 && (
          <p className="search-empty">{t.noMatch(query.trim())}</p>
        )}
        {/* + New stays at the end of the grid even when no snack matches. */}
        {searching && shown.snack.length === 0 && <div className="grid">{newTile}</div>}
      </div>
      <RoundBar total={totalOf(round)} t={t} onClear={clear}>
        <button type="button" className="btn btn-primary" onClick={onShow}>
          {t.show}
          <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-icon">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </RoundBar>
    </>
  )
}
