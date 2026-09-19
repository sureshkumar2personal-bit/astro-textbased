import { ArrowLeft, Check, ChevronDown, Clock3, LockKeyhole, X } from 'lucide-react'
import { useState } from 'react'
import StatusBadge from '../StatusBadge.jsx'
import { formatRemedyHour } from '../../utils/remedyNotes.js'
import { getAtonementProgress, getFirstIncompleteAtonementDay, isAtonementDayActionable, isAtonementDayLocked } from '../../utils/atonements.js'

function formatLongDate(value) {
  if (!value) return 'Date not set'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function ProcessItem({ number, label, value, description }) {
  return <div className="atonement-process-item"><span className="atonement-process-check" aria-hidden="true"><Check size={12} /></span><div><strong>{number}. {label}:</strong><p>{value || 'Not provided.'}</p>{description && <small>{description}</small>}</div></div>
}

function ProcessSection({ day, summary }) {
  return <section className="atonement-process-section"><div className="atonement-detail-eyebrow">TODAY&apos;S POOJA PROCESS</div><div className="atonement-process-list"><ProcessItem number="1" label="God" value={day.god || day.deity} description={summary} /><ProcessItem number="2" label="Process" value={day.poojas} /><ProcessItem number="3" label="Things" value={day.things} /></div></section>
}

export default function AtonementDetailsPanel({ atonement, onClose, onToggleDay }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  if (!atonement) return null
  const progress = getAtonementProgress(atonement)
  const current = getFirstIncompleteAtonementDay(atonement)
  const currentDay = current?.day || atonement.days.at(-1)
  const actionable = current ? isAtonementDayActionable(atonement, current.index) : false

  return <aside className="atonement-details-panel" aria-label="Atonement details">
    <div className="atonement-details-header"><button type="button" className="icon-btn atonement-details-close" aria-label="Close details" onClick={onClose}><X size={17} /></button><div className="atonement-details-identity"><span className="atonement-avatar">{String(atonement.astrologerName || 'A').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><div><strong>{atonement.astrologerName}</strong><span>{atonement.sourceLabel}</span></div></div><StatusBadge label={atonement.status === 'completed' ? 'Completed' : 'Pending'} /></div>
    <div className="atonement-details-title"><span className="badge badge-violet">{atonement.sourceType === 'question' ? 'Text' : atonement.sourceType}</span><h2>{atonement.summary}</h2></div>
    <div className="atonement-summary-grid"><div><small>Consultation date</small><strong>{formatLongDate(atonement.createdAt?.slice(0, 10))}</strong></div><div><small>Current day</small><strong>{current ? `Day ${current.index + 1}` : 'Completed'}</strong></div><div><small>Total days</small><strong>{progress.total}</strong></div></div>
    {currentDay && <><div className="atonement-selected-date"><Clock3 size={15} /><span>{formatLongDate(currentDay.date)} · {formatRemedyHour(currentDay.hour) || 'Time not set'}</span></div><ProcessSection day={currentDay} summary={atonement.summary} />{atonement.status !== 'completed' ? <label className={`atonement-details-complete${actionable ? '' : ' is-disabled'}`}><input type="checkbox" checked={false} disabled={!actionable} onChange={() => onToggleDay?.(current.index, true)} /><span>I have completed today&apos;s pooja</span></label> : <div className="atonement-details-completed"><Check size={16} /> All pooja days completed</div>}{!actionable && current && <div className="atonement-availability-note">Available only on {formatLongDate(currentDay.date)}</div>}</>}
    <button type="button" className="atonement-collapse-toggle" onClick={() => setDetailsOpen((open) => !open)}><span>Pooja Details</span><ChevronDown size={16} className={detailsOpen ? 'is-open' : ''} /></button>
    {detailsOpen && <div className="atonement-supporting-details"><div><span>Place</span><strong>{currentDay?.place || 'Not provided'}</strong></div><div><span>Pooja hour</span><strong>{formatRemedyHour(currentDay?.hour) || 'Not provided'}</strong></div><div><span>Pooja instructions</span><strong>{currentDay?.poojas || 'Not provided'}</strong></div><div><span>Extra notes</span><strong>{currentDay?.extraNotes || 'No extra notes'}</strong></div></div>}
    <div className="atonement-detail-progress"><div className="atonement-detail-eyebrow">ATONEMENT PROGRESS</div>{atonement.days.map((day, index) => { const locked = isAtonementDayLocked(atonement, index); return <div className={`atonement-progress-item${day.completed ? ' is-completed' : ''}${locked ? ' is-locked' : ''}`} key={`${atonement.id}-progress-${index}`}><span>{day.completed ? <Check size={13} /> : locked ? <LockKeyhole size={13} /> : '○'}</span><strong>Day {index + 1}</strong><small>{day.completed ? 'Completed' : locked ? 'Locked' : 'In Progress'}</small><em>{day.completed ? formatLongDate(day.date) : ''}</em></div> })}</div>
    <button type="button" className="btn btn-ghost atonement-details-back" onClick={onClose}><ArrowLeft size={15} /> Back to atonements</button>
  </aside>
}

