import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getSavedRate, saveConsultationPricing, usePricingVersion } from '../../../utils/consultationPricing.js'

export default function ConsultationPricing() {
  const { astrologerServices, actions } = useAppData()
  const { currentUser } = useAuth()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  usePricingVersion()
  const currentCall = getSavedRate(astrologerId, 'call') ?? astrologerServices.callPricePerMinute
  // The chat price is not edited here; it is written back unchanged because pricing is stored per astrologer as one pair.
  const currentChat = getSavedRate(astrologerId, 'chat') ?? astrologerServices.chatPricePerMinute
  const [draft, setDraft] = useState(() => String(currentCall))
  const { hash } = useLocation()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Arriving from the Call Rate card's pencil (#call-rate): put the cursor in the Instant Call rate field.
  useEffect(() => {
    if (hash !== '#call-rate') return
    const input = document.getElementById('rate-call')
    if (!input) return
    input.scrollIntoView({ block: 'center' })
    input.focus()
    input.select()
  }, [hash])

  const change = (value) => { setDraft(value); setSaved(false); setError('') }
  const save = (event) => {
    event.preventDefault()
    const value = draft.trim() === '' ? NaN : Number(draft)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a price greater than ₹0.')
      return
    }
    saveConsultationPricing(astrologerId, { call: value, chat: currentChat })
    actions.updateAstrologerServices({ callPricePerMinute: value })
    setSaved(true)
  }

  return (
    <form className="rate-card" onSubmit={save} noValidate aria-labelledby="rate-card-title">
      <h2 id="rate-card-title" className="rate-card__title">Consultation Rate Settings</h2>
      <div className="rate-card__row">
        <div className="rate-card__field">
          <label htmlFor="rate-call">Instant Call Rate (₹ / minute)</label>
          <input id="rate-call" type="number" min="1" step="1" inputMode="numeric" value={draft} onChange={(event) => change(event.target.value)} aria-describedby="rate-call-current" />
          <small id="rate-call-current">Current: ₹{currentCall}/min</small>
        </div>
        <button type="submit" className="rate-card__save">Save Rate</button>
      </div>
      {error && <p className="consult-message consult-message--error" role="alert">{error}</p>}
      {saved && <p className="consult-message consult-message--ok" role="status"><Check size={14} /> Rate saved.</p>}
    </form>
  )
}
