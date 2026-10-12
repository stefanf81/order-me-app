import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { qrCode } from './qr.ts'
import { Sheet } from './Sheet.tsx'
import type { Messages } from '../i18n.ts'

interface QrSheetProps {
  title: string
  /** Under the QR code: what scanning it does. */
  hint: string
  /** The link the QR code holds; null while it's still being made. */
  link: string | null
  /** True when the link couldn't be built at all: the sheet says so instead of waiting forever. */
  failed?: boolean
  /** The QR code's description for screen readers. */
  alt: string
  /** More buttons after Copy link (e.g. Share as text). */
  children?: ReactNode
  t: Messages
  onClose: () => void
}

/** How long Copy link shows how copying went, before it reads "Copy link" again. */
const FEEDBACK_MS = 2000
const QR_COLOURS = { on: [0, 0, 0, 255], off: [255, 255, 255, 255], pad: 4 } as const

/**
 * Bottom sheet with a link as a QR code, then full-width buttons: Copy link, whatever the caller adds, and Close.
 * Copy link answers in its own label ("✓ Copied" or "Couldn't copy") for 2 seconds, where the thumb is (#56).
 */
export function QrSheet({ title, hint, link, failed = false, alt, children, t, onClose }: QrSheetProps) {
  const code = useMemo(() => (link ? qrCode(link) : null), [link])
  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null)
  const resetTimer = useRef<number>(undefined)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  const copyLink = async () => {
    if (!link) return
    let outcome: 'copied' | 'failed' = 'copied'
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Blocked or unsupported: say so, rather than nothing.
      outcome = 'failed'
    }
    setCopied(outcome)
    window.clearTimeout(resetTimer.current)
    resetTimer.current = window.setTimeout(() => setCopied(null), FEEDBACK_MS)
  }
  const copyLabel = copied === 'copied' ? `✓ ${t.copiedShort}` : copied === 'failed' ? t.copyFailed : t.copyLink

  return (
    <Sheet title={title} titleId="qr-sheet-title" initialFocusRef={closeRef} onClose={onClose}>
      {link &&
        (code ? (
          <>
            <img className="share-qr" src={code.toDataURL({ ...QR_COLOURS, scale: 4 })} alt={alt} />
            <p className="share-hint">{hint}</p>
          </>
        ) : (
          <p className="share-hint">{t.tooBigForQr}</p>
        ))}
      {failed && <p className="share-hint">{t.shareFailed}</p>}

      <div className="share-actions">
        {/* void: the copy handles its own failure and reports it in the label, so the promise is fire-and-forget. */}
        <button type="button" className="btn btn-outline" disabled={!link} onClick={() => void copyLink()}>
          {copyLabel}
        </button>
        {children}
        <button ref={closeRef} type="button" className="btn btn-neutral" onClick={onClose}>
          {t.close}
        </button>
      </div>
      {/* A changing button label isn't announced on its own. */}
      <p className="visually-hidden" aria-live="polite">
        {copied === 'copied' ? t.copied : copied === 'failed' ? t.copyFailed : ''}
      </p>
    </Sheet>
  )
}
