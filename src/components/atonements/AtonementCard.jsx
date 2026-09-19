import { Check, Clock3, UserRound } from 'lucide-react'
import StatusBadge from '../StatusBadge.jsx'
import { formatRemedyHour } from '../../utils/remedyNotes.js'
import { getAtonementProgress, getFirstIncompleteAtonementDay, isAtonementDayActionable, sourceLabel } from '../../utils/atonements.js'

function formatLongDate(value) {
  if (!value) return 'Date not set'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function ProcessItem({ number, label, value }) {
  return <div className="atonement-process-item"><span className="atonement-process-check" aria-hidden="true"><Check size={12} /></span><div><strong>{number}. {label}:</strong><p>{value || 'Not provided.'}</p></div></div>
}

export default function AtonementCard({ atonement, selected = false, onSelect, onToggleDay }) {
  const progress = getAtonementProgress(atonement)
  const current = getFirstIncompleteAtonementDay(atonement)
  const day = current?.day || atonement.days.at(-1)
  const actionable = current ? isAtonementDayActionable(atonement, current.index) : false
  return <article className={`atonement-card${selected ? ' is-selected' : ''}`}>
    <div className="atonement-card-head"><div className="atonement-card-identity"><span className="atonement-avatar"><UserRound size={17} /></span><div><strong>{atonement.astrologerName}</strong><span>{sourceLabel(atonement.sourceType)} · {atonement.id}</span></div></div><StatusBadge label={atonement.status === 'completed' ? 'Completed' : 'Pending'} /></div>
    <div className="atonement-card-title-row"><h2>{atonement.summary}</h2><span className="atonement-day-badge">{current ? `Day ${current.index + 1}` : 'Completed'}</span></div>
    <div className="atonement-card-schedule"><span>{formatLongDate(day?.date)}</span><span><Clock3 size={14} /> {formatRemedyHour(day?.hour) || 'Time not set'}</span></div>
    {current ? <section className="atonement-process-section atonement-process-section--card"><div className="atonement-detail-eyebrow">TODAY&apos;S POOJA PROCESS</div><div className="atonement-process-list"><ProcessItem number="1" label="God" value={day.god || day.deity} /><ProcessItem number="2" label="Process" value={day.poojas} /><ProcessItem number="3" label="Things" value={day.things} /></div></section> : <div className="atonement-card-completed"><Check size={16} /> All pooja days completed</div>}
    {current && <div className={`atonement-card-completion${actionable ? '' : ' is-disabled'}`} onClick={(event) => event.stopPropagation()}><label><input type="checkbox" checked={false} disabled={!actionable} onChange={() => onToggleDay?.(current.index, true)} /><span>I have completed today&apos;s pooja</span></label><small>Available only on {formatLongDate(day.date)}</small></div>}
    <div className="atonement-card-footer"><span>Progress {progress.completed} / {progress.total}</span><button type="button" className="atonement-view-details" onClick={onSelect}>View details <span aria-hidden="true">→</span></button></div>
  </article>
}
