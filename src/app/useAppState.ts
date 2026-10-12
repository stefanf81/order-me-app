import { useEffect, useMemo, useState } from 'react'
import { deletePlacedRound, markOrdered } from '../history/history.ts'
import { addToCatalog, deleteWithUndo, editItem, type ItemDraft, type Sections } from '../items/catalog.ts'
import { movePin, pinsAfterEdit, togglePin } from '../items/pins.ts'
import { replaceCatalog, type SharedItem } from '../items/sharedCatalog.ts'
import { receiveRound, type SharedRound } from '../show/sharedRound.ts'
import { add, clearWithUndo, remove, withNote, type ComposingRound, type RoundNote } from '../round/round.ts'
import type { ThemeSetting } from '../settings/settings.ts'
import type { LanguageSetting, Locale } from '../shared/i18n.ts'
import { resetApp } from '../settings/reset.ts'
import { newId } from '../shared/id.ts'
import {
  forgetAppState,
  isFirstLaunch,
  loadAppState,
  saveData,
  saveRound,
  type AppState,
  type KeyValueStore,
} from './storage.ts'

/** window.localStorage, or an in-memory stand-in when the browser refuses access (e.g. some private modes). */
function browserStore(): KeyValueStore {
  try {
    return window.localStorage
  } catch {
    const data = new Map<string, string>()
    return {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    }
  }
}

/** `seedLocale` only matters on first launch, when the starter Catalog is created. */
export function useAppState(seedLocale: Locale) {
  const [store] = useState(browserStore)
  /** Read before the first load saves the starter Catalog: a shared link opened now replaces it without asking. */
  const [firstLaunch] = useState(() => isFirstLaunch(store))
  const [state, setState] = useState<AppState>(() =>
    loadAppState(store, { locale: seedLocale, newId }),
  )

  /** True once a save failed (storage blocked or full): the app says so once, rather than silently not saving. */
  const [saveFailed, setSaveFailed] = useState(false)

  // Save on every change so a killed tab or locked phone loses nothing. The Round changes on every tap; the rest
  // only when something in it changes, so a tap never rewrites the Catalog or History. The saves are synchronous;
  // only reporting a failure is deferred, so an effect never sets state while rendering.
  useEffect(() => {
    if (!saveRound(store, state.round)) void Promise.resolve().then(() => setSaveFailed(true))
  }, [store, state.round])
  /** The slow-changing state as one value: the effect below runs only when one of its parts changes. */
  const data = useMemo(
    () => ({
      catalog: state.catalog,
      history: state.history,
      settings: state.settings,
      pins: state.pins,
      showOrder: state.showOrder,
    }),
    [state.catalog, state.history, state.settings, state.pins, state.showOrder],
  )
  useEffect(() => {
    if (!saveData(store, data)) void Promise.resolve().then(() => setSaveFailed(true))
  }, [store, data])

  /**
   * Goes up on every place and undo-place, and when a Shared Catalog replaces the Catalog: the moments the tile
   * order is recomputed (see useTileOrder).
   */
  const [placements, setPlacements] = useState(0)

  // Every action goes through setState's updater, so the object never changes and features can hold on to it.
  const actions = useMemo(() => {
    const update = (change: (s: AppState) => Partial<AppState>) => setState((s) => ({ ...s, ...change(s) }))
    return {
      addToRound: (itemId: string) => update((s) => ({ round: add(s.round, itemId) })),
      removeFromRound: (itemId: string) => update((s) => ({ round: remove(s.round, itemId) })),
      /** Empties the Round in one go and returns its Undo, which brings the Round back exactly (#55). */
      clearRound: () => {
        let undo: (() => ComposingRound) | undefined
        update((s) => {
          const cleared = clearWithUndo(s.round)
          undo = cleared.undo
          return { round: cleared.next }
        })
        return () => update(() => (undo ? { round: undo() } : {}))
      },
      replaceRound: (round: ComposingRound) => update(() => ({ round })),
      /** Sets the Round's table and/or remark, as typed on the Show page. */
      setRoundNote: (note: RoundNote) => update((s) => ({ round: withNote(s.round, note) })),
      deleteRound: (roundId: string) => update((s) => ({ history: deletePlacedRound(s.history, roundId) })),
      /** Adds a new Item to the Catalog, and optionally straight into the composing Round ("+ New" tile). */
      createItem: (draft: ItemDraft, options: { addToRound?: boolean } = {}) => {
        const id = newId()
        update((s) => ({
          catalog: addToCatalog(s.catalog, draft, id),
          round: options.addToRound ? add(s.round, id) : s.round,
        }))
      },
      updateItem: (itemId: string, draft: ItemDraft) =>
        update((s) => ({ catalog: editItem(s.catalog, itemId, draft), pins: pinsAfterEdit(s.pins, s.catalog, itemId, draft) })),
      /** Deletes an Item at once and returns its Undo, which puts it back where it was (see deleteWithUndo). */
      removeFromCatalog: (itemId: string) => {
        let undo: ((s: AppState) => Partial<AppState>) | undefined
        update((s) => {
          const deleted = deleteWithUndo(s, itemId)
          undo = deleted.undo
          return deleted.next
        })
        return () => update((s) => undo?.(s) ?? {})
      },
      togglePin: (itemId: string) => update((s) => ({ pins: togglePin(s.pins, itemId) })),
      /** Moves a pinned Item to position `to` among its section's pinned Items. */
      movePin: (itemId: string, to: number) => update((s) => ({ pins: movePin(s.pins, s.catalog, itemId, to) })),
      clearHistory: () => update(() => ({ history: [] })),
      /**
       * Takes in a shared Round (see receiveRound): replaces the Round, adding missing Items. Returns its Undo, which
       * brings back the previous Round and removes the added Items.
       */
      receiveRound: (shared: SharedRound) => {
        let undo: ((s: AppState) => Partial<AppState>) | undefined
        update((s) => {
          const received = receiveRound(s, shared, newId)
          undo = received.undo
          return received.next
        })
        // The updater has run by the time anyone can tap Undo (the toast appears after the next render).
        return () => update((s) => undo?.(s) ?? {})
      },
      /** Replaces the Catalog with a Shared Catalog: fresh ids, empty Round, no pins, History kept. */
      replaceCatalog: (items: SharedItem[]) => {
        // New ids: a Show order from before points at nothing any more.
        update(() => ({ ...replaceCatalog(items, newId), showOrder: [] }))
        setPlacements((n) => n + 1)
      },
      setLanguage: (language: LanguageSetting) => update((s) => ({ settings: { ...s.settings, language } })),
      setTheme: (theme: ThemeSetting) => update((s) => ({ settings: { ...s.settings, theme } })),
      /** Back to a first install, with the newest version (see resetApp). Resolves 'offline' when it couldn't. */
      resetApp: () => {
        const appUrl = new URL(import.meta.env.BASE_URL, location.href).href
        return resetApp(
          {
            fetch: (url, init) => fetch(url, init),
            caches: 'caches' in window ? caches : undefined,
            serviceWorker: navigator.serviceWorker,
            forgetAppState: () => forgetAppState(store),
            reload: (url) => location.replace(url),
          },
          appUrl,
        )
      },
    }
  }, [store])

  /** Places the composing Round and returns a function that undoes exactly that placement. */
  const placeRound = (sections: Sections) => {
    const meta = { id: newId(), placedAt: new Date().toISOString() }
    // Set inside the updater, which has run by the time anyone can tap Undo (the toast appears after the next render).
    let undo: ReturnType<typeof markOrdered>['undo'] | undefined
    // Functional update: a second activation can never compute from a stale state.
    setState((s) => {
      const placed = markOrdered(s, sections, meta)
      undo = placed.undo
      return { ...s, ...placed.next }
    })
    setPlacements((n) => n + 1)
    return () => {
      setState((s) => (undo ? { ...s, ...undo(s) } : s))
      setPlacements((n) => n + 1)
    }
  }

  return { state, firstLaunch, placements, actions, placeRound, saveFailed }
}

export type AppActions = ReturnType<typeof useAppState>['actions']
