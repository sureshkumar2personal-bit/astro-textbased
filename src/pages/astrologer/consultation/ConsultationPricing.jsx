import { useState } from 'react'
import { Check } from 'lucide-react'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getSavedRate, saveConsultationPricing, usePricingVersion } from '../../../utils/consultationPricing.js'

const FIELDS = [
  { key: 'callPricePerMinute', label: 'Instant Call' },
  { key: 'chatPricePerMinute', label: 'Instant Chat' },
]

export default function ConsultationPricing() {
  const { astrologerServices, actions } = useAppData()
  const { currentUser } = useAuth()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  usePricingVersion()
  const current = {
    callPricePerMinute: getSavedRate(astrologerId, 'call') ?? astrologerServices.callPricePerMinute,
    chatPricePerMinute: getSavedRate(astrologerId, 'chat') ?? astrologerServices.chatPricePerMinute,
  }
  const [draft, setDraft] = useState(() => ({ callPricePerMinute: String(current.callPricePerMinute), chatPricePerMinute: String(current.chatPricePerMinute) }))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const change = (key, value) => { setDraft((previous) => ({ ...previous, [key]: value })); setSaved(false); setError('') }
  const save = (event) => {
    event.preventDefault()
    const values = FIELDS.map(({ key }) => draft[key].trim() === '' ? NaN : Number(draft[key]))
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
      setError('Enter a price greater than ₹0 for both call and chat.')
      return
    }
    saveConsultationPricing(astrologerId, { call: values[0], chat: values[1] })
    actions.updateAstrologerServices({ callPricePerMinute: values[0], chatPricePerMinute: values[1] })
    setSaved(true)
  }

  return (
    <form className="rate-card" onSubmit={save} noValidate aria-labelledby="rate-card-title">
      <h2 id="rate-card-title" className="rate-card__title">Consultation Rate Settings</h2>
      <p className="rate-card__desc">Update your per-minute rates for Instant Voice Calls and Instant Chat. Changes apply to new incoming requests immediately.</p>
      <div className="rate-card__row">
        {FIELDS.map(({ key, label }) => (
          <div className="rate-card__field" key={key}>
            <label htmlFor={`rate-${key}`}>{label} Rate (₹ / minute)</label>
            <input id={`rate-${key}`} type="number" min="1" step="1" inputMode="numeric" value={draft[key]} onChange={(event) => change(key, event.target.value)} aria-describedby={`rate-${key}-current`} />
            <small id={`rate-${key}-current`}>Current: ₹{current[key]}/min</small>
          </div>
        ))}
        <button type="submit" className="rate-card__save">Save Rate</button>
      </div>
      {error && <p className="consult-message consult-message--error" role="alert">{error}</p>}
      {saved && <p className="consult-message consult-message--ok" role="status"><Check size={14} /> Rates saved.</p>}
    </form>
  )
}
