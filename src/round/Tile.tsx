import { memo, useMemo, type CSSProperties } from 'react'
import type { Item } from '../items/catalog.ts'
import { emojiColour } from './emojiColour.ts'

interface TileProps {
  item: Item
  count: number
  label: string
  removeLabel: string
  /** Called with the Item's id; pass the same function for every tile, so untouched tiles skip re-rendering. */
  onAdd: (itemId: string) => void
  onRemove: (itemId: string) => void
}

function buzz() {
  try {
    navigator.vibrate?.(10)
  } catch {
    // Haptics are a nicety; some browsers throw instead of ignoring.
  }
}

/** Memoized: a tap changes one tile's count, and only that tile should re-render. */
export const Tile = memo(function Tile({ item, count, label, removeLabel, onAdd, onRemove }: TileProps) {
  /** The emoji's main colour for the tile's gradient (#83); null keeps the plain tile. */
  const colour = useMemo(() => emojiColour(item.emoji), [item.emoji])
  const className = ['tile', colour && 'has-colour', count > 0 && 'has-count'].filter(Boolean).join(' ')
  return (
    <div className={className} style={colour ? ({ '--emoji': colour } as CSSProperties) : undefined}>
      <button
        type="button"
        className="tile-add"
        aria-label={label}
        onClick={() => {
          buzz()
          onAdd(item.id)
        }}
      >
        <span className="tile-emoji" aria-hidden="true">
          {item.emoji}
        </span>
        <span className="tile-name">{item.name}</span>
      </button>
      {count > 0 && (
        <>
          {/* A sibling of the add button, not inside it, so a − tap can never also add. */}
          <button
            type="button"
            className="tile-remove"
            aria-label={removeLabel}
            onClick={() => {
              buzz()
              onRemove(item.id)
            }}
          >
            <span aria-hidden="true">−</span>
          </button>
          {/* Keyed by count so the pop animation replays on every change. */}
          <span key={count} className="badge" aria-hidden="true">
            {count}
          </span>
        </>
      )}
    </div>
  )
})
