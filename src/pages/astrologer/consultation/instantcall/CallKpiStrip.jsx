import { Check, Clock3, IndianRupee, PencilLine, PhoneCall, PhoneIncoming, Timer, X } from 'lucide-react'
import { useState } from 'react'
import { formatRupees } from '../../../../utils/instantCallConsole.js'

function RateCard({ rate, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const open = () => { setDraft(String(rate)); setError(''); setEditing(true) }
  const submit = (event) => {
    event.preventDefault()
    const value = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(value) || value <= 0) { setError('Enter a rate above ₹0'); return }
    onSave(value)
    setEditing(false)
  }

  return (
    <article className="icc-kpi">
      <span className="icc-kpi__icon"><IndianRupee size={18} /></span>
      <div className="icc-kpi__body">
        <small>Call Rate</small>
        {editing ? (
          <form className="icc-rate-form" onSubmit={submit} noValidate>
            <span>₹</span>
            <input type="number" min="1" step="1" inputMode="numeric" autoFocus value={draft} aria-label="Call rate per minute" aria-invalid={Boolean(error)} onChange={(event) => { setDraft(event.target.value); setError('') }} />
            <button type="submit" className="icc-icon-btn is-ok" aria-label="Save rate"><Check size={14} /></button>
            <button type="button" className="icc-icon-btn" aria-label="Cancel" onClick={() => setEditing(false)}><X size={14} /></button>
          </form>
        ) : (
          <strong>{formatRupees(rate)} <em>/ min</em></strong>
        )}
        {error && <span className="icc-kpi__error" role="alert">{error}</span>}
      </div>
      {!editing && <button type="button" className="icc-icon-btn" aria-label="Edit call rate" title="Edit call rate" onClick={open}><PencilLine size={14} /></button>}
    </article>
  )
}

export default function CallKpiStrip({ rate, onSaveRate, stats, waitingCount, onCall, onSimulate, canSimulate = true }) {
  const queue = onCall ? { tone: 'is-gold', label: waitingCount ? `On a Call • ${waitingCount} waiting` : 'On a Call' } : waitingCount ? { tone: 'is-gold', label: `${waitingCount} ${waitingCount === 1 ? 'Caller' : 'Callers'} Waiting` } : { tone: 'is-green', label: 'Available' }
  return (
    <section className="icc-kpis" aria-label="Instant call summary">
      <RateCard rate={rate} onSave={onSaveRate} />
      <article className="icc-kpi">
        <span className="icc-kpi__icon"><PhoneCall size={18} /></span>
        <div className="icc-kpi__body">
          <small>Today&apos;s Calls</small>
          <strong>{stats.count} {stats.count === 1 ? 'Call' : 'Calls'} <em>• {stats.minutes} {stats.minutes === 1 ? 'min' : 'mins'}</em></strong>
        </div>
      </article>
      <article className="icc-kpi">
        <span className="icc-kpi__icon"><Timer size={18} /></span>
        <div className="icc-kpi__body">
          <small>Avg. Call Duration</small>
          <strong>{stats.avgMinutes == null ? '—' : <>{stats.avgMinutes.toFixed(1)} <em>mins</em></>}</strong>
        </div>
      </article>
      <article className="icc-kpi icc-kpi--queue">
        <span className="icc-kpi__icon"><PhoneIncoming size={18} /></span>
        <div className="icc-kpi__body">
          <small>Queue Status</small>
          <span className={`icc-pill ${queue.tone}${waitingCount && !onCall ? ' is-pulsing' : ''}`} role="status">{queue.label}</span>
        </div>
        <button type="button" className="icc-btn icc-btn--ghost" disabled={!canSimulate} onClick={onSimulate}><Clock3 size={14} /> Simulate Incoming Call</button>
      </article>
    </section>
  )
}
