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
    <form className="consult-card" onSubmit={save} noValidate>
      <h2 className="consult-card__title">Consultation Pricing</h2>
      <div className="consult-price-grid">
        {FIELDS.map(({ key, label }) => (
          <div className="consult-price" key={key}>
            <h3>{label}</h3>
            <p className="consult-price__current">Current Price: <strong>₹{current[key]}/min</strong></p>
            <label className="consult-price__field">
              <span className="consult-price__prefix">₹</span>
              <input type="number" min="1" step="1" inputMode="numeric" value={draft[key]} onChange={(event) => change(key, event.target.value)} aria-label={`${label} price per minute`} />
              <span className="consult-price__suffix">/ minute</span>
            </label>
          </div>
        ))}
      </div>
      {error && <p className="consult-message consult-message--error" role="alert">{error}</p>}
      {saved && <p className="consult-message consult-message--ok" role="status"><Check size={14} /> Pricing saved.</p>}
      <button type="submit" className="btn btn-primary consult-save">Save Pricing</button>
    </form>
  )
}
