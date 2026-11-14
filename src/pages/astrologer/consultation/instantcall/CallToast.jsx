import { Info } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const DISMISS_MS = 4000

/** Bottom-right notification (dark card, amber border). Dismisses itself after a few seconds; a new `id` restarts the timer. */
export default function CallToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(onDismiss, DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])
  if (!toast) return null
  return createPortal(
    <div className="icc-toast" role="status" aria-live="polite" key={toast.id}>
      <Info size={20} aria-hidden="true" />
      <span>{toast.message}</span>
    </div>,
    document.body,
  )
}
