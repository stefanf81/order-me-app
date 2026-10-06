import { useCallback, useEffect, useMemo, useState } from 'react'
import { HistoryPage } from '../history/HistoryPage.tsx'
import { catalogSections, type Item } from '../items/catalog.ts'
import { ItemSheet } from '../items/ItemSheet.tsx'
import { ShareItemsSheet } from '../items/ShareItemsSheet.tsx'
import { localizeCatalog } from '../items/starter.ts'
import { noteOf, roundLines } from '../round/round.ts'
import { RoundPage } from '../round/RoundPage.tsx'
import { useTileOrder } from '../round/useTileOrder.ts'
import { InstallGuideSheet } from '../settings/InstallGuideSheet.tsx'
import { SettingsPage } from '../settings/SettingsPage.tsx'
import { useTheme } from '../settings/useTheme.ts'
import { detectLocale, formattingLocale, messages, resolveLocale } from '../shared/i18n.ts'
import { ConfirmDialog, type Confirmation } from '../shared/ui/ConfirmDialog.tsx'
import type { Overlays } from '../shared/ui/overlays.ts'
import { Pager } from '../shared/ui/Pager.tsx'
import { TabBar } from '../shared/ui/TabBar.tsx'
import { TAB_ICONS } from '../shared/ui/tabIcons.tsx'
import { Toast, type ToastMessage } from '../shared/ui/Toast.tsx'
import { ShareRoundSheet } from '../show/ShareRoundSheet.tsx'
import { showSections } from '../show/showOrder.ts'
import { ShowPage } from '../show/ShowPage.tsx'
import { useUpdate } from './updates.ts'
import { useAppState } from './useAppState.ts'
import { useSharedLinks } from './useSharedLinks.ts'

const ROUND_PAGE = 1
const SHOW_PAGE = 2

/** The four swipe pages plus the overlays on top of them. Each feature wires its own handlers. */
export function App() {
  const { state, firstLaunch, placements, actions, placeRound } = useAppState(detectLocale(navigator.language))
  const locale = resolveLocale(state.settings.language, navigator.language)
  const t = messages[locale]
  useTheme(state.settings.theme)
  /** The Catalog as shown: starter Items named in the app's language. Everything on screen, placed or shared uses it. */
  const catalog = useMemo(() => localizeCatalog(state.catalog, locale), [state.catalog, locale])
  const sections = useTileOrder(catalog, state.pins, state.history, placements)
  /** The grid in the Show tab's order: a received Show order first (#49). Share and History follow it too. */
  const show = useMemo(() => showSections(sections, state.showOrder), [sections, state.showOrder])
  /** The Round as the Show tab lists it: what Share Round sends. */
  const showLines = useMemo(() => roundLines(state.round, show), [state.round, show])
  /** The Round's table and remark, tidied: what Share Round sends. */
  const roundNote = useMemo(() => noteOf(state.round), [state.round])

  const [page, setPage] = useState(ROUND_PAGE)
  /** The Item sheet: `{}` to add a new Item, `{ item }` to edit one, `{ forRound }` from the + New tile. */
  const [sheet, setSheet] = useState<{ item?: Item; forRound?: boolean } | null>(null)
  /** Which share sheet is open: the Catalog (Settings page) or the Round (Show page). */
  const [sharing, setSharing] = useState<'items' | 'round' | null>(null)
  /** The Add to Home Screen guide (Settings page, iPhone and iPad). */
  const [installGuide, setInstallGuide] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const overlays = useMemo<Overlays>(
    () => ({ confirm: setConfirmation, notify: (text, action) => setToast({ id: Date.now(), text, action }) }),
    [],
  )
  const { ready: updateReady, update } = useUpdate()
  /** After Later the pop-up stays away; Settings then offers the update next to the version. */
  const [updateLater, setUpdateLater] = useState(false)
  const overlayOpen = sheet !== null || sharing !== null || installGuide || confirmation !== null
  /** The update pop-up, never over an open sheet or dialog: it waits until the Operator is done there. */
  const offerUpdate = updateReady && !updateLater && !overlayOpen

  useSharedLinks({
    firstLaunch,
    catalogSize: catalog.length,
    t,
    actions,
    overlays,
    onRoundReceived: () => setPage(SHOW_PAGE),
  })

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = t.appName
  }, [locale, t])

  const closeSheet = useCallback(() => setSheet(null), [])
  const closeSharing = useCallback(() => setSharing(null), [])
  const closeInstallGuide = useCallback(() => setInstallGuide(false), [])
  const closeToast = useCallback(() => setToast(null), [])
  const closeConfirmation = useCallback(() => setConfirmation(null), [])
  const toRound = useCallback(() => setPage(ROUND_PAGE), [])
  const dateLocale = formattingLocale(locale, navigator.language)

  // Every page stays mounted (the Pager slides between them), so a tap re-renders all four unless their props stay
  // the same. These objects only change when what they hold does: History and Settings skip taps on the Round.
  const settingsItems = useMemo(
    () => ({
      sections: catalogSections(catalog, state.pins),
      pins: state.pins,
      count: catalog.length,
      actions,
      overlays,
      onAdd: () => setSheet({}),
      onShare: () => setSharing('items'),
      onEdit: (item: Item) => setSheet({ item }),
    }),
    [catalog, state.pins, actions, overlays],
  )
  const hasHistory = state.history.length > 0
  const settingsGeneral = useMemo(
    () => ({ settings: state.settings, hasHistory, actions, overlays, onInstallGuide: () => setInstallGuide(true) }),
    [state.settings, hasHistory, actions, overlays],
  )
  const settingsVersion = useMemo(() => ({ dateLocale, updateReady, onUpdate: update }), [dateLocale, updateReady, update])

  const pages = [
    <HistoryPage
      key="history"
      history={state.history}
      catalog={catalog}
      dateLocale={dateLocale}
      t={t}
      actions={actions}
      overlays={overlays}
      onOrderedAgain={toRound}
    />,
    <RoundPage
      key="round"
      sections={sections}
      round={state.round}
      t={t}
      actions={actions}
      overlays={overlays}
      onShow={() => setPage(SHOW_PAGE)}
      onNew={() => setSheet({ forRound: true })}
    />,
    <ShowPage
      key="show"
      round={state.round}
      sections={show}
      active={page === SHOW_PAGE}
      t={t}
      actions={actions}
      onPlace={placeRound}
      overlays={overlays}
      onGoToRound={toRound}
      onShare={() => setSharing('round')}
    />,
    <SettingsPage
      key="settings"
      t={t}
      items={settingsItems}
      general={settingsGeneral}
      version={settingsVersion}
    />,
  ]

  return (
    <>
      <div className="shell" inert={overlayOpen || offerUpdate}>
        <Pager pages={pages} page={page} onPageChange={setPage} />
        <TabBar
          tabs={[
            { label: t.historyTab, name: t.history, icon: TAB_ICONS.history },
            { label: t.round, name: t.round, icon: TAB_ICONS.round },
            { label: t.show, name: t.show, icon: TAB_ICONS.show },
            { label: t.settingsTab, name: t.settings, icon: TAB_ICONS.settings },
          ]}
          page={page}
          navLabel={t.pages}
          onPageChange={setPage}
        />
      </div>

      {sheet && (
        // The sheet stays open under a delete confirmation, but must not take taps while it is.
        <div inert={confirmation !== null}>
          <ItemSheet {...sheet} t={t} actions={actions} overlays={overlays} onClose={closeSheet} />
        </div>
      )}

      {sharing && (
        <div inert={confirmation !== null}>
          {sharing === 'items' ? (
            <ShareItemsSheet catalog={catalog} t={t} onClose={closeSharing} />
          ) : (
            <ShareRoundSheet lines={showLines} note={roundNote} t={t} onClose={closeSharing} />
          )}
        </div>
      )}

      {installGuide && <InstallGuideSheet t={t} onClose={closeInstallGuide} />}

      {toast && <Toast key={toast.id} toast={toast} onDone={closeToast} />}

      {offerUpdate && (
        <ConfirmDialog
          text={t.updateAvailable}
          confirmLabel={t.update}
          cancelLabel={t.later}
          tone="primary"
          onConfirm={update}
          onClose={() => setUpdateLater(true)}
        />
      )}

      {confirmation && <ConfirmDialog {...confirmation} cancelLabel={t.cancel} onClose={closeConfirmation} />}
    </>
  )
}
