// app/components/ModalWrapper.tsx
// Accessible modal wrapper: focus trap, Escape key, click-outside, ARIA roles.
// Wrap any modal content with this component.
'use client'
import { useEffect, useRef, type ReactNode } from 'react'

interface ModalWrapperProps {
  onClose: () => void
  children: ReactNode
  /** Optional ARIA label for the dialog */
  ariaLabel?: string
  /** Max-width class or style — default 'max-w-xl' */
  maxWidth?: string
  /** Extra classes on the inner container (e.g., max-height, overflow) */
  innerClassName?: string
  /** Allow closing by clicking the backdrop. Default: true */
  closeOnBackdrop?: boolean
}

export default function ModalWrapper({
  onClose,
  children,
  ariaLabel,
  maxWidth = 'max-w-xl',
  innerClassName = '',
  closeOnBackdrop = true,
}: ModalWrapperProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Save and move focus into the modal
    previousFocus.current = document.activeElement as HTMLElement
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()

    // Restore focus on unmount
    return () => { previousFocus.current?.focus() }
  }, [])

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function handleBackdropClick(e: React.MouseEvent) {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        ref={dialogRef}
        className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  )
}
