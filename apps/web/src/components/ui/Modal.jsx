import X from 'lucide-react/dist/esm/icons/x.mjs'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

import styles from './ui.module.css'

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function Modal({ title, onClose, children, footer, width = 440 }) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const initialFocus = dialog?.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? dialog?.querySelector(focusableSelector)
    initialFocus?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll(focusableSelector)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div className={styles.modalLayer} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={dialogRef}
        className={styles.modal}
        style={{ '--modal-width': `${width}px` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.modalHeader}>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="닫기"><X size={17} /></button>
        </header>
        <div className={styles.modalBody}>{children}</div>
        {footer ? <footer className={styles.modalFooter}>{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}
