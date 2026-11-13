import { Mic, MicOff, NotebookPen, Pause, PhoneOff, Play, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { updateInstantConsultation } from '../../../../utils/instantConsultation.js'
import { billableSeconds, earningsForSeconds, formatClock, formatRupees, maxMinutesForWallet } from '../../../../utils/instantCallConsole.js'
import KundliSnapshot from './KundliSnapshot.jsx'
import { birthLine } from './IncomingCallCard.jsx'

export default function ActiveCallWorkspace({ request, now, saving, onEnd }) {
  const [muted, setMuted] = useState(false)
  const [notes, setNotes] = useState(request.notes || '')
  const [noteState, setNoteState] = useState('saved')
  const notesRef = useRef(notes)
  const onHold = Boolean(request.holdSince)

  // Notes autosave shortly after typing stops, so nothing is lost if the page is closed mid-call.
  useEffect(() => {
    notesRef.current = notes
    if (notes === (request.notes || '')) { setNoteState('saved'); return undefined }
    setNoteState('saving')
    const timer = window.setTimeout(() => { updateInstantConsultation(request.id, { notes }); setNoteState('saved') }, 500)
    return () => window.clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, request.id])

  const seconds = billableSeconds(request, now)
  const earnings = earningsForSeconds(seconds, request.pricePerMinute)
  const capMinutes = maxMinutesForWallet(request.walletBalance, request.pricePerMinute)
  const capped = capMinutes != null && seconds >= capMinutes * 60

  const toggleHold = () => {
    const at = Date.now()
    updateInstantConsultation(request.id, onHold
      ? { holdSince: null, heldMs: (Number(request.heldMs) || 0) + Math.max(0, at - new Date(request.holdSince).getTime()) }
      : { holdSince: new Date(at).toISOString() })
  }

  return (
    <section className="icc-card icc-active" aria-label="Active call workspace">
      <header className="icc-active__head">
        <div className="icc-caller">
          <span className="icc-avatar" aria-hidden="true">{String(request.userName || '?').slice(0, 2).toUpperCase()}</span>
          <div>
            <strong data-testid="active-caller">{request.userName}</strong>
            <small>{[request.topic, birthLine(request.birthDetails)].filter(Boolean).join(' • ')}</small>
          </div>
          <span className={`icc-pill ${onHold ? 'is-gold' : 'is-green'}`}>{onHold ? 'On Hold' : 'Live'}</span>
        </div>
        <div className="icc-meters">
          <div><small>Duration</small><strong data-testid="call-timer">{formatClock(seconds)}</strong></div>
          <div><small>Earnings</small><strong className="is-gold" data-testid="call-earnings">{formatRupees(earnings, { decimals: 2 })}</strong></div>
        </div>
      </header>

      <div className="icc-controls">
        <button type="button" className={`icc-btn icc-btn--ghost${muted ? ' is-on' : ''}`} aria-pressed={muted} onClick={() => setMuted((value) => !value)}>
          {muted ? <MicOff size={15} /> : <Mic size={15} />} {muted ? 'Unmute Mic' : 'Mute Mic'}
        </button>
        <button type="button" className={`icc-btn icc-btn--ghost${onHold ? ' is-on' : ''}`} aria-pressed={onHold} onClick={toggleHold}>
          {onHold ? <Play size={15} /> : <Pause size={15} />} {onHold ? 'Resume' : 'Hold'}
        </button>
        <button type="button" className="icc-btn icc-btn--end" disabled={saving} onClick={() => onEnd(notesRef.current)}><PhoneOff size={15} /> {saving ? 'Saving…' : 'End & Save Call'}</button>
      </div>
      {onHold && <p className="icc-hint">Call is on hold — the timer and earnings are paused.</p>}
      {capped && <p className="icc-hint">The caller&apos;s wallet covers {capMinutes} minutes; billing has reached that limit.</p>}

      <div className="icc-active__grid">
        <section className="icc-panel" aria-label="Quick Kundli snapshot">
          <h3><Sparkles size={15} /> Quick Kundli Snapshot</h3>
          <KundliSnapshot details={request.birthDetails} />
        </section>
        <section className="icc-panel" aria-label="Live consultation notes">
          <h3><NotebookPen size={15} /> Live Consultation Notes <small className="icc-muted">{noteState === 'saving' ? 'Saving…' : 'Saved'}</small></h3>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Jot down remedies, observations and follow-ups…" rows={5} aria-label="Consultation notes" maxLength={4000} />
        </section>
      </div>
    </section>
  )
}
