import { Check, Flame, Landmark, Package, StickyNote } from 'lucide-react'

// One icon per Atonement field, shared by the list cards and the details page.
export const ATONEMENT_ICONS = {
  god: Landmark,
  instruction: Flame,
  things: Package,
  notes: StickyNote,
  completion: Check,
}

// Round status marker used for completion: green check when done, hollow circle while pending (same as the details timeline).
export function CompletionMarker({ done, size = 12 }) {
  const Icon = ATONEMENT_ICONS.completion
  return <span className={`at-marker${done ? ' is-done' : ''}`} aria-hidden="true">{done ? <Icon size={size} /> : null}</span>
}
