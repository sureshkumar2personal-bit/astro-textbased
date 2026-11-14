import { PhoneIncoming } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/** "Simulate Incoming Call", rendered in the Consultation tab row (right side) via the shell's slot. */
export default function SimulateCallButton({ onClick }) {
  const [slot, setSlot] = useState(null)
  useEffect(() => { setSlot(document.getElementById('consult-tab-actions')) }, [])
  if (!slot) return null
  return createPortal(
    <button type="button" className="icc-simulate" onClick={onClick}>
      <PhoneIncoming size={20} aria-hidden="true" /> Simulate Incoming Call
    </button>,
    slot,
  )
}
