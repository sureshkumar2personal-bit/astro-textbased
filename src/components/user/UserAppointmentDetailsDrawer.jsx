import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, Clock3, Download, Eye, FileText, Hash, Languages, Phone, PhoneCall, Timer, UserRound, Wallet, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import SavedAtonementDetails from '../atonement/SavedAtonementDetails.jsx'
import StatusBadge from '../StatusBadge.jsx'
import { formatDisplayDate, formatTimeRange, getAppointmentDisplayStatus, resolveAppointmentWindow } from '../../utils/appointments.js'
import { useAppData } from '../../state/AppDataContext.jsx'

function initials(name = '') {
  return String(name).split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AS'
}

function UserDetailRow({ icon: Icon, label, value }) {
  return (
    <div className="apt-detail-row">
      <span className="apt-detail-label"><Icon size={14} /> {label}</span>
      <span className="apt-detail-value">{value == null || value === '' ? 'Not available' : value}</span>
    </div>
  )
}

function UserHoroscopeSection({ appointment }) {
  const horoscope = appointment.horoscope
  if (!horoscope) {
    return (
      <section className="apt-detail-card apt-horoscope-section">
        <div className="apt-detail-row">
          <span className="apt-detail-label"><FileText size={14} /> Horoscope</span>
          <span className="apt-detail-value apt-horoscope-empty">Horoscope not uploaded yet</span>
        </div>
      </section>
    )
  }

  const uploadedDate = horoscope.uploadedAt
    ? new Date(horoscope.uploadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  return (
    <section className="apt-detail-card apt-horoscope-section">
      <div className="apt-detail-row">
        <span className="apt-detail-label"><FileText size={14} /> Horoscope</span>
        <span className="apt-detail-value apt-horoscope-file">{horoscope.name || 'Uploaded horoscope'}</span>
      </div>
      <div className="apt-detail-row"><span className="apt-detail-label">Type</span><span className="apt-detail-value">{horoscope.type}</span></div>
      <div className="apt-detail-row"><span className="apt-detail-label">Size</span><span className="apt-detail-value">{horoscope.size || `${horoscope.sizeBytes || 0} KB`}</span></div>
      <div className="apt-detail-row"><span className="apt-detail-label">Uploaded</span><span className="apt-detail-value">{uploadedDate || 'Not available'}</span></div>
      <div className="apt-horoscope-actions">
        {horoscope.dataUrl && <a className="btn btn-outline" href={horoscope.dataUrl} target="_blank" rel="noreferrer"><Eye size={14} /> View</a>}
        {horoscope.dataUrl && <a className="btn btn-outline" href={horoscope.dataUrl} download={horoscope.name || 'horoscope'} rel="noreferrer"><Download size={14} /> Download</a>}
      </div>
    </section>
  )
}

function cleanText(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim()
    return text || ''
  }
  return ''
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDayDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function calendarDate(value) {
  if (!value) return null
  const text = String(value)
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/)
  const date = isoMatch ? new Date(`${isoMatch[1]}T00:00:00`) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addCalendarDays(value, days) {
  const date = calendarDate(value)
  if (!date || !Number.isFinite(days)) return null
  date.setDate(date.getDate() + days)
  return date
}

function mapInstructions(content = {}) {
  if (!content || typeof content !== 'object') return []
  const instructions = []
  const add = (value) => {
    if (Array.isArray(value)) {
      value.forEach(add)
      return
    }
    const text = cleanText(value)
    if (text && !instructions.includes(text)) instructions.push(text)
  }

  if (content.instructions && typeof content.instructions === 'object' && !Array.isArray(content.instructions)) {
    add(content.instructions.before)
    add(content.instructions.during)
    add(content.instructions.after)
  } else {
    add(content.instructions)
  }
  add(content.poojas)
  add(content.things)
  add(content.extraNotes)
  add(content.detailedDescription || content.shortDescription || content.description)

  if (Array.isArray(content.rituals)) {
    content.rituals.forEach((ritual) => {
      if (!ritual || typeof ritual !== 'object' || ritual.enabled === false) return
      const details = cleanText(ritual.instructions || ritual.description || ritual.steps || ritual.config?.instructions || ritual.config?.description)
      add(details)
    })
  }
  return instructions
}

function mapConfiguredPariharamDays(content = {}, atonement = {}, pariharamId, progress) {
  const rangeStart = calendarDate(atonement.startAt)
  const rangeEnd = calendarDate(atonement.dueAt)
  const configuredDays = [content.days, content.dayByDay, content.procedureDays, content.schedule, atonement.days].find(Array.isArray) || []
  const storedDays = progress.pariharamId === pariharamId && progress.days && typeof progress.days === 'object' ? progress.days : {}
  if (rangeStart && rangeEnd && rangeEnd >= rangeStart) {
    const days = []
    for (const cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
      const dayNumber = days.length + 1
      const dateIso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      const id = `day-${dayNumber}`
      days.push({ id, dayNumber, dateIso, label: `Day ${dayNumber}`, date: formatDayDate(cursor), completed: Boolean(storedDays[id]?.completed && storedDays[id]?.date === dateIso) })
    }
    return days
  }
  const ritualDays = configuredDays.length
    ? configuredDays
    : (Array.isArray(content.rituals) ? content.rituals.filter((ritual) => ritual && (ritual.dayNumber || ritual.day || ritual.date || ritual.dateIso)) : [])
  return ritualDays.map((item, index) => {
    const dayNumberMatch = String(item?.dayNumber ?? item?.day ?? item?.number ?? '').match(/\d+/)
    const dayNumber = dayNumberMatch ? Number(dayNumberMatch[0]) : index + 1
    const id = cleanText(item?.id || item?.instanceId || item?.ritualId) || `day-${dayNumber}`
    const dateIso = cleanText(item?.dateIso || item?.date || item?.scheduledDate || item?.startDate)
    const date = formatDayDate(dateIso)
    return { id, dayNumber, dateIso, label: `Day ${dayNumber}`, date, completed: Boolean(storedDays[id]?.completed && (!storedDays[id]?.date || storedDays[id]?.date === dateIso)) }
  }).filter((day, index, days) => days.findIndex((candidate) => candidate.id === day.id) === index)
}

function mapConsultationForUser(consultation) {
  if (!consultation) return null
  const atonement = consultation.atonement && typeof consultation.atonement === 'object' ? consultation.atonement : {}
  const content = atonement.content && typeof atonement.content === 'object' ? atonement.content : {}
  const title = cleanText(atonement.title || consultation.title || (consultation.consultationTitle !== consultation.consultationType ? consultation.consultationTitle : ''))
  const startedDate = formatDate(consultation.startDate || atonement.startAt)
  const dueDate = formatDate(consultation.dueDate || atonement.dueAt)
  const validityValue = cleanText(consultation.validity || atonement.completionDays)
  const completionText = validityValue ? `Complete within ${validityValue}${consultation.validity ? '' : ' days'}` : ''
  const summary = cleanText(consultation.summary || consultation.notes || content.summary)
  const instructions = [...mapInstructions({ instructions: consultation.instructions }), ...mapInstructions(content)]
  const progress = consultation.pariharamProgress && typeof consultation.pariharamProgress === 'object' ? consultation.pariharamProgress : {}
  const pariharamId = cleanText(atonement.pariharamId || atonement.id || content.recordId || content.id || content.sourceDefaultId || title || consultation.id)
  const progressStart = atonement.startAt || consultation.startDate
  const explicitProgressEnd = atonement.endDate || atonement.endAt || consultation.endDate || consultation.dueDate
  const completionDays = Number.parseInt(String(atonement.completionDays || '').match(/\d+/)?.[0] || '', 10)
  const inclusiveProgressEnd = explicitProgressEnd || (progressStart && completionDays > 0 ? addCalendarDays(progressStart, completionDays - 1) : atonement.dueAt || consultation.dueDate)
  const days = mapConfiguredPariharamDays(content, { ...atonement, startAt: progressStart, dueAt: inclusiveProgressEnd }, pariharamId, progress)
  const rawAttachments = Array.isArray(consultation.attachments)
    ? consultation.attachments
    : consultation.fileName ? [{ name: consultation.fileName, type: consultation.fileType, url: '' }] : []
  const attachments = rawAttachments.map((item) => ({
    name: cleanText(item?.name),
    type: cleanText(item?.type || item?.fileType) || 'File',
    viewUrl: cleanText(item?.url || item?.preview || item?.dataUrl),
    savedContent: item?.type === 'Saved Content' && item?.content && typeof item.content === 'object'
      ? {
          title: cleanText(item.content.title || item.content.name || item.name),
          description: cleanText(item.content.detailedDescription || item.content.shortDescription || item.content.description),
          instructions: mapInstructions(item.content),
          content: item.content,
        }
      : null,
  })).filter((item) => item.name)
  const history = Array.isArray(consultation.consultationHistory)
    ? consultation.consultationHistory.map((item) => typeof item === 'string' ? { text: cleanText(item), date: '' } : { text: cleanText(item?.title || item?.description), date: formatDate(item?.date || item?.completedAt || item?.createdAt) }).filter((item) => item.text)
    : Array.isArray(consultation.history)
      ? consultation.history.map((item) => typeof item === 'string' ? { text: cleanText(item), date: '' } : { text: cleanText(item?.title || item?.description), date: formatDate(item?.date || item?.completedAt || item?.createdAt) }).filter((item) => item.text)
      : []
  const historyDate = consultation.sentAt || consultation.completedAt
  if (historyDate && !history.length) history.push({ text: 'Consultation shared', date: formatDate(historyDate) })
  return { title, completionText, startedDate, dueDate, summary, instructions, attachments, history, days, pariharamId, progress, duration: validityValue }
}

function AttachmentViewer({ attachment, onClose, duration, completedDays, onToggleDay }) {
  if (!attachment) return null
  if (attachment.savedContent?.content) {
    return <SavedAtonementDetails name={attachment.savedContent.title || attachment.name} content={attachment.savedContent.content} duration={duration} preview={attachment.viewUrl} completedDays={completedDays} onToggleDay={onToggleDay} onClose={onClose} />
  }
  const type = attachment.type.toLowerCase()
  const isImage = type.startsWith('image') || attachment.viewUrl?.startsWith('data:image/')
  const isPdf = type.includes('pdf') || attachment.viewUrl?.startsWith('data:application/pdf')
  return (
    <div className="apt-user-attachment-viewer-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="apt-user-attachment-viewer" role="dialog" aria-modal="true" aria-labelledby="apt-user-attachment-viewer-title">
        <header className="apt-user-attachment-viewer-head">
          <div><span>Attachment</span><h2 id="apt-user-attachment-viewer-title">{attachment.name}</h2></div>
          <button type="button" className="icon-btn" aria-label="Close attachment viewer" onClick={onClose}>×</button>
        </header>
        <div className="apt-user-attachment-viewer-body">
          {isImage && attachment.viewUrl ? (
            <img className="apt-user-attachment-viewer-image" src={attachment.viewUrl} alt={attachment.name} />
          ) : isPdf && attachment.viewUrl ? (
            <iframe className="apt-user-attachment-viewer-pdf" src={attachment.viewUrl} title={attachment.name} />
          ) : attachment.viewUrl ? (
            <a className="btn btn-primary" href={attachment.viewUrl} target="_blank" rel="noreferrer">Open attachment</a>
          ) : (
            <p className="muted">A preview is not available for this attachment.</p>
          )}
        </div>
        <footer className="apt-user-attachment-viewer-footer"><span>{attachment.type}</span><button type="button" className="btn btn-outline" onClick={onClose}>Close</button></footer>
      </section>
    </div>
  )
}

function ConsultationNotesContent({ mapped, onUpdatePariharamProgress }) {
  const [attachmentViewer, setAttachmentViewer] = useState(null)
  const [dayProgress, setDayProgress] = useState(() => mapped?.progress || {})

  useEffect(() => {
    setDayProgress(mapped?.progress || {})
  }, [mapped?.progress])

  if (!mapped) return null
  const isDayCompleted = (day) => Boolean(dayProgress.days?.[day.id]?.completed && (!day.dateIso || !dayProgress.days[day.id]?.date || dayProgress.days[day.id].date === day.dateIso))
  const completedCount = mapped.days.filter(isDayCompleted).length
  const updateDay = (day) => {
    const completed = !isDayCompleted(day)
    const nextProgress = { ...dayProgress, pariharamId: mapped.pariharamId, days: { ...(dayProgress.days || {}), [day.id]: { date: day.dateIso, dayNumber: day.dayNumber, completed, completedAt: completed ? new Date().toISOString() : null } } }
    setDayProgress(nextProgress)
    onUpdatePariharamProgress?.(mapped.pariharamId, day.id, day.dateIso, day.dayNumber, completed)
  }
  const updateViewerDay = (dayId) => {
    const day = mapped.days.find((item) => item.id === dayId || item.id === `day-${String(dayId).replace('day-', '')}`)
    if (day) updateDay(day)
  }
  return (
    <>
      {(mapped.title || mapped.completionText || mapped.startedDate || mapped.dueDate) && (
        <div className="apt-user-consultation-header">
          {mapped.title && <strong>{mapped.title}</strong>}
          {mapped.completionText && <span>{mapped.completionText}</span>}
          {(mapped.startedDate || mapped.dueDate) && <small>Started: {mapped.startedDate || '—'} · Due: {mapped.dueDate || '—'}</small>}
        </div>
      )}
      {mapped.summary && <div className="apt-user-astrologer-notes-group apt-user-astrologer-notes-group--summary"><strong>SUMMARY</strong><p>{mapped.summary}</p></div>}
      {mapped.instructions.length > 0 && (
        <div className="apt-user-astrologer-notes-group apt-user-astrologer-notes-group--instructions">
          <strong>INSTRUCTIONS</strong>
          <div>{mapped.instructions.map((item, index) => <div key={`instruction-${index}`}>{item}</div>)}</div>
        </div>
      )}
      {mapped.days.length > 0 && (
        <div className="apt-user-astrologer-notes-group apt-user-astrologer-notes-group--progress">
          <div className="apt-user-pariharam-progress-head"><strong>PARIHARAM PROGRESS</strong><span>{completedCount} of {mapped.days.length} {mapped.days.length === 1 ? 'day' : 'days'} completed</span></div>
          <div className="apt-user-pariharam-progress-bar" aria-label={`${completedCount} of ${mapped.days.length} Pariharam days completed`}><span style={{ width: `${(completedCount / mapped.days.length) * 100}%` }} /></div>
          <div className="apt-user-pariharam-task-list">
            {mapped.days.map((day) => {
              const completed = isDayCompleted(day)
              return <label className={`apt-user-pariharam-task${completed ? ' is-completed' : ''}`} key={day.id}><input type="checkbox" checked={completed} onChange={() => updateDay(day)} /><span><strong>{day.label}{day.date ? ` — ${day.date}` : ''}</strong></span></label>
            })}
          </div>
          {completedCount === mapped.days.length && <div className="apt-user-pariharam-complete">✓ Pariharam Completed</div>}
        </div>
      )}
      {mapped.attachments.length > 0 && (
        <div className="apt-user-astrologer-notes-group apt-user-astrologer-notes-group--attachments">
          <strong>ATTACHMENTS ({mapped.attachments.length})</strong>
          <div>
            {mapped.attachments.map((item, index) => (
              <div className="apt-user-astrologer-notes-attachment" key={`${item.name}-${index}`}>
                <span className="apt-user-astrologer-notes-attachment-icon"><FileText size={14} /></span>
                <div><strong>{item.name}</strong><small>{item.type}</small></div>
                <button className="btn btn-outline" type="button" onClick={() => setAttachmentViewer(item)}><Eye size={13} /> {item.viewUrl ? 'View' : 'Open'}</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {mapped.history.length > 0 && (
        <div className="apt-user-astrologer-notes-group apt-user-astrologer-notes-group--history">
          <strong>CONSULTATION HISTORY</strong>
          <div>{mapped.history.map((item, index) => <div className={`apt-user-astrologer-notes-history-row${index === mapped.history.length - 1 ? ' is-current' : ''}`} key={`history-${index}`}><span>{item.text}</span><small>{item.date}</small></div>)}</div>
        </div>
      )}
      <AttachmentViewer attachment={attachmentViewer} duration={mapped.duration} completedDays={dayProgress.days || {}} onToggleDay={updateViewerDay} onClose={() => setAttachmentViewer(null)} />
    </>
  )
}

export default function UserAppointmentDetailsDrawer({ appointment, consultation, currentUser, onClose, onBookAgain, onUpdatePariharamProgress }) {
  if (!appointment) return null
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const displayStatus = getAppointmentDisplayStatus(appointment)
  const customerName = appointment.customerName || currentUser?.name || 'Not available'
  const astrologerName = appointment.astrologer || customerName
  const paymentStatus = appointment.paymentStatus || (appointment.status?.toLowerCase().includes('cancel') ? appointment.refundStatus || 'Refunded' : 'Paid')
  const amount = appointment.amount ?? appointment.price
  const bookingDate = appointment.bookingDate || (appointment.bookedAt ? new Date(appointment.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
<<<<<<< HEAD
  const { atonements, consultations } = useAppData()
  const hasPariharam = (() => {
    const direct = atonements.some((a) => (a.sourceId === appointment.id || a.appointmentId === appointment.id))
    if (direct) return true
    return consultations.some((c) => c.appointmentId === appointment.id && c.atonement && c.sent)
  })()
=======
  const hasSharedConsultation = Boolean(consultation && (consultation.sent || consultation.sentToUser || consultation.completedAt))
  const notes = hasSharedConsultation ? consultation : null
  const mappedNotes = notes ? mapConsultationForUser(notes) : null
  const hasCustomerFacingNotes = Boolean(mappedNotes && (mappedNotes.title || mappedNotes.summary || mappedNotes.instructions.length || mappedNotes.days.length || mappedNotes.attachments.length || mappedNotes.history.length || mappedNotes.completionText || mappedNotes.startedDate || mappedNotes.dueDate))
>>>>>>> main

  return createPortal(
    <div className="apt-drawer-overlay" onClick={onClose}>
      <aside className="apt-drawer" role="dialog" aria-modal="true" aria-labelledby="user-apt-drawer-title" onClick={(event) => event.stopPropagation()}>
        <header className="apt-drawer-head">
          <div className="apt-drawer-head-copy">
            <h2 id="user-apt-drawer-title">Appointment Details</h2>
            <StatusBadge label={displayStatus} className="apt-drawer-status" />
          </div>
          <button type="button" className="icon-btn" aria-label="Close appointment details" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="apt-drawer-body">
          <div className="apt-customer">
            <span className="user-appointment-avatar user-appointment-avatar--large">{initials(customerName)}</span>
            <div className="apt-customer-copy">
              <div className="apt-customer-name">
                {appointment.astrologerId ? <Link className="apt-customer-name--link" to={`/user/astrologer/${appointment.astrologerId}`}>{astrologerName}</Link> : astrologerName}
              </div>
              <div className="apt-customer-order">Booking ID: {appointment.orderId || appointment.id}</div>
            </div>
          </div>

          <section className="apt-drawer-summary">
            <div className="apt-drawer-summary-time">{formatTimeRange(startMin, endMin)}</div>
            <div className="apt-drawer-summary-calltype"><PhoneCall size={14} /> {appointment.type || 'Audio Call'}</div>
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={UserRound} label="Customer" value={customerName} />
            <UserDetailRow icon={Phone} label="Phone" value={appointment.customerPhone || currentUser?.phone} />
            <UserDetailRow icon={Languages} label="Language" value={appointment.language || appointment.lang} />
            <UserDetailRow icon={Hash} label="Topic" value={appointment.topic} />
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={CalendarDays} label="Date" value={formatDisplayDate(appointment.dateIso, true)} />
            <UserDetailRow icon={Clock3} label="Time" value={formatTimeRange(startMin, endMin)} />
            <UserDetailRow icon={PhoneCall} label="Appointment Type" value={appointment.type || 'Audio Call'} />
            <UserDetailRow icon={Timer} label="Duration" value={appointment.duration || `${endMin - startMin} Minutes`} />
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={Wallet} label="Payment" value={paymentStatus} />
            <UserDetailRow icon={Wallet} label="Amount" value={amount == null ? '' : `₹${Number(amount).toLocaleString('en-IN')}`} />
            <UserDetailRow icon={Wallet} label="Payment Method" value={appointment.paymentMethod} />
            <UserDetailRow icon={Hash} label="Transaction ID" value={appointment.transactionId} />
          </section>

          <section className="apt-detail-card">
            <UserDetailRow icon={CalendarDays} label="Booking Date" value={bookingDate} />
            <UserDetailRow icon={Wallet} label="Current Status" value={displayStatus} />
          </section>

          <UserHoroscopeSection appointment={appointment} />

<<<<<<< HEAD
          {hasPariharam && (
            <Link to={`/user/atonements?appointmentId=${appointment.id}`} onClick={onClose} className="apt-drawer-pariharam-link">🪔 View Pariharam →</Link>
          )}
=======
          <section className="apt-detail-card apt-detail-card--notes apt-user-astrologer-notes">
            <div className="apt-private-notes-head"><span>Astrologer Notes</span><span className="apt-private-notes-private">ONLY YOU CAN SEE</span></div>
            <div className="apt-user-astrologer-notes-content" aria-readonly="true">
              {hasCustomerFacingNotes
                ? <ConsultationNotesContent mapped={mappedNotes} onUpdatePariharamProgress={(pariharamId, dayId, completed) => onUpdatePariharamProgress?.(appointment.id, pariharamId, dayId, completed)} />
                : 'No astrologer notes are available for this appointment.'}
            </div>
          </section>
>>>>>>> main

          {displayStatus === 'Completed' && appointment.astrologerId && onBookAgain && (
            <div className="apt-drawer-actions">
              <button type="button" className="btn btn-primary" onClick={() => onBookAgain(appointment)}>
                Book Again
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  )
}
