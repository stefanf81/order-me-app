import { useEffect, useRef, type FormEvent, type ReactNode, type RefObject } from 'react'
import { useFocusTrap } from './useFocusTrap.ts'

export interface SheetProps {
  title: string
  titleId: string
  /** Element to focus when the sheet opens; defaults to the sheet itself. */
  initialFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
  /** If provided, the sheet is rendered as a `<form>` element with this submission handler. */
  onSubmit?: (e: FormEvent) => void
}

/**
 * Shared modal bottom sheet with scrim, drag handle, title, focus trapping,
 * Escape key listener, and backdrop click dismissal.
 */
export function Sheet({ title, titleId, initialFocusRef, onClose, children, onSubmit }: SheetProps) {
  const boxRef = useRef<HTMLElement>(null)
  useFocusTrap(boxRef, initialFocusRef)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const content = (
    <>
      <div className="sheet-grab" aria-hidden="true" />
      <h2 className="sheet-title" id={titleId}>
        {title}
      </h2>
      {children}
    </>
  )

  const sharedProps = {
    className: 'sheet',
    role: 'dialog' as const,
    'aria-modal': true as const,
    'aria-labelledby': titleId,
    tabIndex: -1,
  }

  return (
    <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {onSubmit ? (
        <form
          ref={boxRef as RefObject<HTMLFormElement>}
          {...sharedProps}
          onSubmit={onSubmit}
          noValidate
        >
          {content}
        </form>
      ) : (
        <div
          ref={boxRef as RefObject<HTMLDivElement>}
          {...sharedProps}
        >
          {content}
        </div>
      )}
    </div>
  )
}
