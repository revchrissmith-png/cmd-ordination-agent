// hooks/useFlash.ts
// Shared flash-message hook.
// Replaces duplicated flash() + useState + setTimeout pattern across 3+ pages.
import { useState, useCallback } from 'react'

export type FlashMessage = { text: string; type: '' | 'success' | 'error' }

const EMPTY: FlashMessage = { text: '', type: '' }

export function useFlash(durationMs = 6000) {
  const [message, setMessage] = useState<FlashMessage>(EMPTY)

  const flash = useCallback((text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(EMPTY), durationMs)
  }, [durationMs])

  const clearFlash = useCallback(() => setMessage(EMPTY), [])

  return { message, flash, clearFlash, setMessage } as const
}
