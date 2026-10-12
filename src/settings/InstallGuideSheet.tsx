import { useRef } from 'react'
import type { Messages } from '../shared/i18n.ts'
import { Sheet } from '../shared/ui/Sheet.tsx'

interface InstallGuideSheetProps {
  t: Messages
  onClose: () => void
}

/** Safari's Share icon, so step 1 points at the button to look for. */
const SHARE_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-icon">
    <path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
)

/**
 * How to add the app to the home screen on an iPhone or iPad, which (unlike Chrome on Android) has no install
 * prompt the app could open itself.
 */
export function InstallGuideSheet({ t, onClose }: InstallGuideSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  return (
    <Sheet title={t.addToHome} titleId="install-title" initialFocusRef={closeRef} onClose={onClose}>
      <ol className="install-steps">
        {t.installSteps.map((step, i) => (
          <li key={i}>
            {i === 0 && <span className="install-share">{SHARE_ICON}</span>}
            {step}
          </li>
        ))}
      </ol>
      <div className="share-actions">
        <button ref={closeRef} type="button" className="btn btn-neutral" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </Sheet>
  )
}
