import { createPortal } from 'react-dom'
import { X, Clock, Calendar as CalIcon, Timer, Languages, Hash, Phone, Wallet, UserRound, CalendarX2, StickyNote, Paperclip, Send, FileText, Eye, Download, NotebookPen, Shield, Check, CalendarCheck2 } from 'lucide-react'
import { useRef, useState } from 'react'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { callTypeMeta } from './meta.jsx'
import {
  resolveAppointmentWindow,
  formatTimeRange,
  formatDisplayDate,
  canStartCall,
} from '../../../utils/appointments.js'


function Avatar({ name }) {
  const initials = String(name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const hue = [...String(name || '')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
  return (
    <div
      className="apt-avatar"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 70% 52%))` }}
    >
      {initials}
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  const resolvedValue = value == null || value === '' ? 'Not available' : value
  return (
    <div className="apt-detail-row">
      <span className="apt-detail-label">
        <Icon size={14} /> {label}
      </span>
      <span className="apt-detail-value">{resolvedValue}</span>
    </div>
  )
}

function formatSentAt(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function ConsultationSection({ appointment, consultation, onSave, onOpen }) {
  const [notes, setNotes] = useState(consultation?.notes || '')
  const [attached, setAttached] = useState(consultation?.fileName ? { name: consultation.fileName, type: consultation.fileType, size: consultation.fileSize } : null)
  const [saved, setSaved] = useState(false)
  const [sent, setSent] = useState(Boolean(consultation?.sent))
  const [sentAt, setSentAt] = useState(consultation?.sentAt || null)
  const fileRef = useRef(null)
  const hasConsultation = Boolean(consultation)

  const handleAttach = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    setAttached({ name: file.name, type: file.type || 'application/pdf', size: file.size })
  }

  const handleSave = () => {
    if (typeof onSave === 'function') {
      onSave({ appointmentId: appointment.id, notes, fileName: attached?.name || '', fileType: attached?.type || '', fileSize: attached?.size || 0, send: false })
    }
    setSaved(true)
  }

  const handleSend = () => {
    const payload = { appointmentId: appointment.id, notes, fileName: attached?.name || '', fileType: attached?.type || '', fileSize: attached?.size || 0, send: true }
    if (typeof onSave === 'function') onSave(payload)
    else if (typeof onOpen === 'function') onOpen(appointment.id)
    setSent(true)
    setSentAt(new Date().toISOString())
    setSaved(true)
  }

  return (
    <section className="apt-consultation">
      <div className="apt-consultation-head">
        <StickyNote size={16} /> Consultation
        {sent && (
          <span className="apt-consultation-sent-badge">Sent to user</span>
        )}
      </div>
      {sent && sentAt && (
        <div className="apt-consultation-sent-meta">Sent {formatSentAt(sentAt)}</div>
      )}
      <textarea
        className="apt-consultation-notes"
        rows={3}
        placeholder="Add consultation notes for this user…"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <div className="apt-consultation-actions">
        {attached ? (
          <button type="button" className="apt-consultation-file" onClick={() => fileRef.current && fileRef.current.click()}>
            <FileText size={14} /> {attached.name}
          </button>
        ) : (
          <button type="button" className="apt-consultation-attach" onClick={() => fileRef.current && fileRef.current.click()}>
            <Paperclip size={14} /> Attach PDF
          </button>
        )}
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" hidden onChange={handleAttach} />
        <div className="apt-consultation-action-group">
          <button type="button" className="btn btn-outline" onClick={handleSave} disabled={saved && !hasConsultation}>
            {saved ? 'Saved' : 'Save Draft'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSend} disabled={sent}>
            <Send size={14} /> {sent ? 'Sent' : 'Send to User'}
          </button>
        </div>
      </div>
      {saved && <div className="apt-consultation-note">Consultation {sent ? 'sent to the user' : 'saved as a draft'}. It will appear in the user&rsquo;s profile activity.</div>}
    </section>
  )
}

function HoroscopePreview({ horoscope, onClose, customerName }) {
  const url = horoscope?.dataUrl || ''
  const isImage = url && /^data:image\//.test(url)
  return createPortal(
    <div className="apt-drawer-overlay apt-horoscope-overlay" onClick={onClose}>
      <div className="apt-horoscope-preview" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="apt-horoscope-preview-head">
          <div>
            <h2>Horoscope</h2>
            <span>{horoscope?.name} · {horoscope?.type}</span>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="apt-horoscope-preview-body">
          {isImage ? (
            <img src={url} alt={`Horoscope for ${customerName || 'the user'}`} className="apt-horoscope-preview-img" />
          ) : (
            <div className="apt-horoscope-preview-doc">
              <FileText size={40} />
              <strong>Document preview</strong>
              <span>{horoscope?.name} ({horoscope?.size})</span>
              <p>A downloadable document attachment. In a production deployment this would render the actual PDF/image from your file storage.</p>
            </div>
          )}
        </div>
        {url && (
          <footer className="apt-horoscope-preview-foot">
            <a className="btn btn-primary" href={url} download={horoscope?.name || 'horoscope'} rel="noreferrer">
              <Download size={15} /> Download
            </a>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

function HoroscopeSection({ appointment, onView, onDownload }) {
  const horoscope = appointment.horoscope
  if (!horoscope) {
    return (
      <section className="apt-detail-card apt-horoscope-section">
        <div className="apt-detail-row">
          <span className="apt-detail-label"><FileText size={14} /> Horoscope</span>
          <span className="apt-detail-value apt-horoscope-empty">No horoscope attached</span>
        </div>
      </section>
    )
  }
  return (
    <section className="apt-detail-card apt-horoscope-section">
      <div className="apt-detail-row">
        <span className="apt-detail-label"><FileText size={14} /> Horoscope</span>
        <span className="apt-detail-value apt-horoscope-file">{horoscope.name}</span>
      </div>
      <div className="apt-detail-row">
        <span className="apt-detail-label">Type</span>
        <span className="apt-detail-value">{horoscope.type}</span>
      </div>
      <div className="apt-detail-row">
        <span className="apt-detail-label">Size</span>
        <span className="apt-detail-value">{horoscope.size || `${horoscope.sizeBytes || 0} KB`}</span>
      </div>
      {horoscope.uploadedAt && (
        <div className="apt-detail-row">
          <span className="apt-detail-label">Uploaded</span>
          <span className="apt-detail-value">
            {new Date(horoscope.uploadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )}
      <div className="apt-horoscope-actions">
        <button type="button" className="btn btn-outline" onClick={onView}>
          <Eye size={14} /> View / Open
        </button>
        {onDownload && horoscope.dataUrl && (
          <a className="btn btn-outline" href={horoscope.dataUrl} download={horoscope.name} rel="noreferrer">
            <Download size={14} /> Download
          </a>
        )}
      </div>
    </section>
  )
}

function PrivateNotesSection({ appointment, onSavePreCall, onSaveNotes }) {
  const [preCall, setPreCall] = useState(appointment.preCallAnalysis || '')
  const [notes, setNotes] = useState(appointment.privateNotes || '')
  const [preSaved, setPreSaved] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  const savePreCall = () => {
    if (typeof onSavePreCall === 'function') onSavePreCall(appointment.id, preCall)
    setPreSaved(true)
  }
  const saveNotes = () => {
    if (typeof onSaveNotes === 'function') onSaveNotes(appointment.id, notes)
    setNotesSaved(true)
  }

  return (
    <section className="apt-detail-card apt-private-notes">
      <div className="apt-private-notes-head">
        <NotebookPen size={15} /> Private Astrologer Notes
        <span className="apt-private-notes-private"><Shield size={11} /> Only you can see</span>
      </div>
      <div className="apt-private-notes-group">
        <label className="apt-private-notes-label" htmlFor={`precall-${appointment.id}`}>Pre-Call Analysis</label>
        <textarea
          id={`precall-${appointment.id}`}
          className="apt-consultation-notes"
          rows={3}
          placeholder="Review the horoscope and jot notes before the call…"
          value={preCall}
          onChange={(event) => { setPreCall(event.target.value); setPreSaved(false) }}
        />
        <button type="button" className="btn btn-outline apt-private-notes-save" onClick={savePreCall}>
          {preSaved ? 'Saved' : 'Save Pre-Call Analysis'}
        </button>
      </div>
      <div className="apt-private-notes-group">
        <label className="apt-private-notes-label" htmlFor={`privnotes-${appointment.id}`}>Private Call Notes</label>
        <textarea
          id={`privnotes-${appointment.id}`}
          className="apt-consultation-notes"
          rows={3}
          placeholder="Observations, points to discuss, things to remember…"
          value={notes}
          onChange={(event) => { setNotes(event.target.value); setNotesSaved(false) }}
        />
        <button type="button" className="btn btn-outline apt-private-notes-save" onClick={saveNotes}>
          {notesSaved ? 'Saved' : 'Save Notes'}
        </button>
      </div>
    </section>
  )
}

export default function AppointmentDetailsDrawer({ appointment, appointments = [], inProgress, consultation, onClose, onStartCall, onCancel, onViewProfile, onSaveConsultation, onOpenConsultation, onSavePrivateNotes, onSavePreCallAnalysis, onReschedule }) {
  const [horoscopeOpen, setHoroscopeOpen] = useState(false)
  if (!appointment) return null
  const meta = callTypeMeta(appointment.callType)
  const Icon = meta.icon
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const durationMin = endMin - startMin
  const customerName = appointment.customerName || 'Not available'
  const orderId = appointment.orderId != null && appointment.orderId !== '' ? appointment.orderId : 'Not available'
  const hasAmount = appointment.amount != null && appointment.amount !== '' && Number.isFinite(Number(appointment.amount))
  const amountLabel = hasAmount ? `₹${Number(appointment.amount).toLocaleString('en-IN')}` : 'Not available'
  const linkedLabel = (id) => {
    const linked = appointments.find((item) => item.id === id)
    if (!linked) return '—'
    if (linked.dateIso) {
      const dateText = formatDisplayDate(linked.dateIso, true)
      return linked.time ? `${dateText} · ${linked.time}` : dateText
    }
    return linked.date || '—'
  }
  const hasCancelHandler = typeof onCancel === 'function'
  const isCancelled = /cancelled/i.test(String(appointment.status || ''))
  const isBooked = /booked/i.test(String(appointment.status || ''))
  const isCompleted = /completed/i.test(String(appointment.status || ''))
  const isNoShow = /no-show|no show/i.test(String(appointment.status || ''))
  const showCancelButton = hasCancelHandler && isBooked
  const showCall = typeof onStartCall === 'function' && canStartCall(appointment, new Date()) && !inProgress
  const hasRescheduleHandler = typeof onReschedule === 'function'
  const showReschedule = hasRescheduleHandler && isBooked && !appointment.rescheduledTo && !appointment.rescheduledFrom
  const customerId = appointment.userId || null
  const showConsultation = typeof onSaveConsultation === 'function' && !isCancelled

  return (
    <>
      {createPortal(
        <div className="apt-drawer-overlay" onClick={onClose}>
          <aside
            className="apt-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apt-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="apt-drawer-head">
              <div className="apt-drawer-head-copy">
                <h2 id="apt-drawer-title">Appointment Details</h2>
                <StatusBadge label={appointment.status || 'Not available'} className="apt-drawer-status" />
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
                <X size={18} />
              </button>
            </header>

            <div className="apt-drawer-body">
              <div className="apt-customer">
                <Avatar name={customerName} />
                <div className="apt-customer-copy">
                  {typeof onViewProfile === 'function' && customerId ? (
                    <button type="button" className="apt-customer-name apt-customer-name--link" onClick={() => onViewProfile(customerId)}>
                      {customerName}
                    </button>
                  ) : (
                    <div className="apt-customer-name">{customerName}</div>
                  )}
                  <div className="apt-customer-order">Order ID: {orderId}</div>
                </div>
              </div>

              <section className="apt-drawer-summary">
                <div className="apt-drawer-summary-time">{formatTimeRange(startMin, endMin)}</div>
                <div className="apt-drawer-summary-calltype">
                  <Icon size={14} /> {meta.label}
                </div>
              </section>

              <section className="apt-detail-card">
                <DetailRow icon={UserRound} label="Customer" value={typeof onViewProfile === 'function' && customerId ? (
                  <button type="button" className="apt-customer-name apt-customer-name--link" onClick={() => onViewProfile(customerId)}>{customerName}</button>
                ) : customerName} />
                <DetailRow icon={Phone} label="Phone" value={appointment.customerPhone} />
                <DetailRow icon={Languages} label="Language" value={appointment.language} />
                <DetailRow icon={Hash} label="Topic" value={appointment.topic} />
              </section>

              <section className="apt-detail-card">
                <DetailRow icon={CalIcon} label="Date" value={formatDisplayDate(appointment.dateIso, true)} />
                <DetailRow icon={Clock} label="Time" value={formatTimeRange(startMin, endMin)} />
                <DetailRow
                  icon={Icon}
                  label="Appointment Type"
                  value={
                    <span className="apt-inline-calltype">
                      <Icon size={14} /> {meta.label}
                    </span>
                  }
                />
                <DetailRow icon={Timer} label="Duration" value={`${durationMin} Minutes`} />
              </section>

              <HoroscopeSection appointment={appointment} onView={() => setHoroscopeOpen(true)} onDownload />

              <section className="apt-detail-card">
                <DetailRow icon={Wallet} label="Payment" value={appointment.paymentStatus || 'Paid'} />
                <DetailRow icon={Wallet} label="Amount" value={amountLabel} />
                <DetailRow icon={Wallet} label="Method" value={appointment.paymentMethod || 'Wallet'} />
                <DetailRow icon={Hash} label="Transaction" value={appointment.transactionId} />
              </section>

              <section className="apt-detail-card">
                <DetailRow icon={CalIcon} label="Booking Date" value={appointment.bookingDate || (appointment.bookedAt ? new Date(appointment.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not available')} />
                <DetailRow icon={Wallet} label="Current Status" value={appointment.status || 'Booked'} />
                {appointment.rescheduledFrom && (
                  <DetailRow icon={CalIcon} label="Rescheduled From" value={linkedLabel(appointment.rescheduledFrom)} />
                )}
                {appointment.rescheduledTo && (
                  <DetailRow icon={CalIcon} label="Rescheduled To" value={linkedLabel(appointment.rescheduledTo)} />
                )}
                {(appointment.rescheduleNote || appointment.note) && (
                  <DetailRow icon={CalIcon} label="Note" value={appointment.rescheduleNote || appointment.note} />
                )}
              </section>

              {(typeof onSavePrivateNotes === 'function' || typeof onSavePreCallAnalysis === 'function') && (
                <PrivateNotesSection
                  appointment={appointment}
                  onSavePreCall={onSavePreCallAnalysis}
                  onSaveNotes={onSavePrivateNotes}
                />
              )}

              <div className={`apt-drawer-call${(showCall || showCancelButton || showReschedule) ? ' apt-drawer-call--split' : ''}`}>
                {showCall && (
                  <button type="button" className="btn btn-primary apt-drawer-startcall" onClick={onStartCall}>
                    <Phone size={15} /> Start {meta.label}
                  </button>
                )}
                {showReschedule && (
                  <button type="button" className="btn btn-outline apt-drawer-reschedule" onClick={onReschedule}>
                    <CalendarCheck2 size={15} /> Reschedule
                  </button>
                )}
                {showCancelButton && (
                  <button type="button" className="btn btn-danger apt-drawer-cancel" onClick={onCancel}>
                    <CalendarX2 size={15} /> Cancel Appointment
                  </button>
                )}
                {showCancelButton && (
                  <div className="apt-drawer-cancel-hint">Cancelling preserves the original appointment and does not require a new date or time.</div>
                )}
                {isCancelled && (
                  <div className="apt-drawer-note">This appointment has been cancelled and is preserved in history.</div>
                )}
                {isCompleted && (
                  <div className="apt-drawer-status-callout apt-drawer-status-callout--completed">This appointment has been completed. Consultation notes and any attached file are shown below.</div>
                )}
                {isCompleted && (
                  <div className={`apt-consult-follow-up${consultation?.sent ? ' is-resolved' : ''}`}>
                    {consultation?.sent ? (
                      <>
                        <Check size={14} />
                        Consultation follow-up sent{consultation.sentAt ? ` ${formatSentAt(consultation.sentAt)}` : ''}
                      </>
                    ) : (
                      <>
                        <StickyNote size={14} />
                        Consultation follow-up required — send the consultation summary to resolve it.
                      </>
                    )}
                  </div>
                )}
                {isNoShow && (
                  <div className="apt-drawer-status-callout">This appointment was marked as a no-show and is preserved in history.</div>
                )}
              </div>

              {showConsultation && (
                <ConsultationSection
                  appointment={appointment}
                  consultation={consultation}
                  onSave={onSaveConsultation}
                  onOpen={onOpenConsultation}
                />
              )}
            </div>
          </aside>
        </div>,
        document.body,
      )}
      {horoscopeOpen && appointment.horoscope && (
        <HoroscopePreview horoscope={appointment.horoscope} onClose={() => setHoroscopeOpen(false)} customerName={customerName} />
      )}
    </>
  )
}
