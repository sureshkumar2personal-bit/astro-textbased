import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronRight, Clock3, Download, Eye, FileText, Hash, Languages, NotebookPen, Phone, PhoneCall, Shield, Timer, UserRound, Wallet, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import SavedAtonementDetails from '../atonement/SavedAtonementDetails.jsx'
import StatusBadge from '../StatusBadge.jsx'
import { formatDisplayDate, formatTimeRange, getAppointmentDisplayStatus, resolveAppointmentWindow } from '../../utils/appointments.js'
import { useAppData } from '../../state/AppDataContext.jsx'
import useUserAtonements from '../../state/useUserAtonements.js'
import { mergeAstrologerNotes } from '../../data/mockAstrologerNotes.js'

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

function mapHistory(consultation) {
  const source = Array.isArray(consultation.consultationHistory)
    ? consultation.consultationHistory
    : Array.isArray(consultation.history)
      ? consultation.history
      : Array.isArray(consultation.historyEntries)
        ? consultation.historyEntries
        : []
  const history = source.map((item) => typeof item === 'string'
    ? { text: cleanText(item), date: '' }
    : { text: cleanText(item?.title || item?.description || item?.text || item?.event), date: formatDate(item?.date || item?.completedAt || item?.createdAt || item?.timestamp) })
    .filter((item) => item.text)
  const historyDate = consultation.sentAt || consultation.completedAt
  if (historyDate && !history.length) history.push({ text: 'Consultation shared', date: formatDate(historyDate) })
  return history
}

function toDateIso(value) {
  const date = calendarDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function mapPariharamDays(consultation, appointment) {
  const atonement = consultation.atonement && typeof consultation.atonement === 'object' ? consultation.atonement : {}
  const progress = consultation.pariharamProgress && typeof consultation.pariharamProgress === 'object' ? consultation.pariharamProgress : {}
  const startAt = atonement.startAt || progress.startAt || consultation.startDate || appointment.completedAt || appointment.dateIso
  const start = calendarDate(startAt)
  const totalDays = Number.parseInt(String(atonement.completionDays || consultation.validity || 7).match(/\d+/)?.[0] || '7', 10)
  if (!start || !totalDays) return []
  const progressDays = progress.days && typeof progress.days === 'object' ? progress.days : {}
  return Array.from({ length: totalDays }, (_, index) => {
    const dayDate = new Date(start)
    dayDate.setDate(dayDate.getDate() + index)
    const id = `day-${index + 1}`
    const dateIso = toDateIso(dayDate)
    const saved = progressDays[id]
    return {
      id,
      dayNumber: index + 1,
      dateIso,
      date: formatDate(dayDate),
      completed: Boolean(saved?.completed && (!saved.date || saved.date === dateIso)),
    }
  })
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

function mapConsultationForUser(consultation, appointment) {
  if (!consultation) return null
  const atonement = consultation.atonement && typeof consultation.atonement === 'object' ? consultation.atonement : {}
  const content = atonement.content && typeof atonement.content === 'object' ? atonement.content : {}
  const title = cleanText(atonement.title || consultation.title || consultation.consultationTitle || appointment?.topic || appointment?.type || 'Consultation')
  const startedDate = formatDate(consultation.startDate || atonement.startAt || consultation.sentAt || appointment?.completedAt || appointment?.dateIso)
  const dueDate = formatDate(consultation.dueDate || atonement.dueAt)
  const validityValue = cleanText(consultation.validity || atonement.completionDays)
  const completionText = validityValue ? `Complete within ${validityValue}${consultation.validity ? '' : ' days'}` : ''
  const summary = cleanText(consultation.summary || consultation.notes || consultation.content || content.summary || content.remedySummary)
  const instructions = [...mapInstructions({ instructions: consultation.instructions || consultation.instruction }), ...mapInstructions(content)]
  const pariharamId = cleanText(atonement.pariharamId || atonement.id || content.recordId || content.id || content.sourceDefaultId || title || consultation.id)
  const rawAttachments = Array.isArray(consultation.attachments)
    ? consultation.attachments
    : consultation.fileName ? [{ name: consultation.fileName, type: consultation.fileType, url: '' }] : []
  const attachments = rawAttachments.map((item) => ({
    name: cleanText(typeof item === 'string' ? item : item?.name || item?.fileName),
    type: cleanText(typeof item === 'string' ? '' : item?.type || item?.fileType || item?.mimeType) || 'File',
    viewUrl: cleanText(typeof item === 'string' ? item : item?.url || item?.preview || item?.dataUrl || item?.contentUrl),
    savedContent: item?.type === 'Saved Content' && item?.content && typeof item.content === 'object'
      ? {
          title: cleanText(item.content.title || item.content.name || item.name),
          description: cleanText(item.content.detailedDescription || item.content.shortDescription || item.content.description),
          instructions: mapInstructions(item.content),
          content: item.content,
        }
      : null,
  })).filter((item) => item.name)
  const history = mapHistory(consultation)
  const days = mapPariharamDays(consultation, appointment)
  const statusLabel = pariharamStatusLabel(atonement.dueAt, atonement.completedAt, atonement.status || (consultation.sent || consultation.sentToUser || consultation.completedAt ? 'Completed' : null))
  return {
    title,
    statusLabel,
    completionText,
    startedDate,
    dueDate,
    summary,
    instructions,
    attachments,
    history,
    days,
    pariharamId,
    progress: consultation.pariharamProgress && typeof consultation.pariharamProgress === 'object' ? consultation.pariharamProgress : {},
    duration: validityValue,
    pariharamDateIso: atonement.dueAt || null,
    pariharamCompletedAtIso: atonement.completedAt || null,
  }
}

function getPariharamDateState(dueAtIso, completedAtIso) {
  const dueDay = calendarDate(dueAtIso)
  if (!dueDay) return null
  if (completedAtIso) return { state: 'completed' }
  const today = calendarDate(new Date())
  if (today.getTime() > dueDay.getTime()) return { state: 'missed' }
  if (today.getTime() === dueDay.getTime()) return { state: 'today' }
  return { state: 'upcoming' }
}

function pariharamStatusLabel(dueAtIso, completedAtIso, fallbackStatus) {
  const dateState = getPariharamDateState(dueAtIso, completedAtIso)
  if (dateState) {
    if (dateState.state === 'completed') return 'Completed'
    if (dateState.state === 'missed') return 'Missed'
    if (dateState.state === 'today') return 'Due Today'
    return 'Pending'
  }
  return cleanText(fallbackStatus) || null
}

function AttachmentViewer({ attachment, onClose, completedDays, currentDayNumber, onToggleDay }) {
  if (!attachment) return null
  if (attachment.savedContent?.content) {
    return <SavedAtonementDetails name={attachment.savedContent.title || attachment.name} content={attachment.savedContent.content} duration={attachment.savedContent.content?.duration || attachment.savedContent.content?.templateDuration} preview={attachment.viewUrl} completedDays={completedDays} currentDayNumber={currentDayNumber} onToggleDay={onToggleDay} onClose={onClose} />
  }
  const type = attachment.type.toLowerCase()
  const isImage = type.startsWith('image') || attachment.viewUrl?.startsWith('data:image/')
  const isPdf = type.includes('pdf') || attachment.viewUrl?.startsWith('data:application/pdf')
  return (
    <div className="apt-user-attachment-viewer-overlay user-shell-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
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

function ConsultationNotesContent({ mapped, onUpdateProgress, appointmentId, appointment, currentUser, onOpenAtonement }) {
  const navigate = useNavigate()
  const { actions } = useAppData()
  const { allAtonements, toggleDay } = useUserAtonements()

  // The Atonement record is the single source of truth for this Pariharam's progress.
  const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const savedTitles = (mapped?.attachments || []).filter((item) => item.savedContent).map((item) => item.savedContent.title || item.name)
  const candidateTitles = [mapped?.title, ...savedTitles].filter(Boolean)
  const findRecord = (titles = candidateTitles) => allAtonements
    .filter((record) => record.sourceId === appointmentId || record.appointmentId === appointmentId)
    .find((candidate) => titles.some((title) => [candidate.summary, candidate.method?.title].includes(title)))
  const relatedRecord = mapped ? findRecord() : null

  // Finds the record for this Pariharam, creating it from the astrologer's saved content when it does not exist yet.
  const ensureRecord = (title, content = {}) => {
    const found = findRecord([title]) || (relatedRecord && candidateTitles.includes(title) ? relatedRecord : null)
    if (found) return found
    return actions.createAtonement({
      id: `ATN-${appointmentId}-${slugify(title)}`,
      category: 'atonement',
      userId: currentUser?.id,
      astrologerId: appointment?.astrologerId,
      astrologerName: appointment?.astrologer || 'Astrologer',
      sourceType: 'appointment',
      sourceId: appointmentId,
      appointmentId,
      sourceLabel: `Appointment ${appointmentId}`,
      summary: title,
      method: Object.keys(content).length ? { ...content, title } : null,
      days: mapped.days.map(() => ({
        date: '',
        hour: content.hour || '',
        place: content.place || '',
        god: content.god || content.deity || '',
        things: content.things || '',
        poojas: content.poojas || '',
        extraNotes: content.extraNotes || '',
      })).map((day, index) => ({ ...day, date: mapped.days[index].dateIso })),
    })
  }

  const openRelatedAtonement = (item) => {
    const title = item.savedContent.title || item.name
    const record = ensureRecord(title, item.savedContent.content || {})
    onOpenAtonement?.()
    navigate(`/user/atonements/${encodeURIComponent(record.id)}`, { state: appointmentId ? { from: `/user/appointment-details?id=${encodeURIComponent(appointmentId)}` } : undefined })
  }
  const [attachmentViewer, setAttachmentViewer] = useState(null)
  if (!mapped) return null
  const today = calendarDate(new Date())
  const currentDayNumber = mapped.days.find((day) => calendarDate(day.dateIso)?.getTime() === today?.getTime())?.dayNumber || null
  const isDayCompleted = (day) => Boolean(relatedRecord?.days?.[day.dayNumber - 1]?.completed)
  const arePreviousDaysComplete = (day) => mapped.days.slice(0, day.dayNumber - 1).every(isDayCompleted)
  const updateDay = (day) => {
    if (day.dayNumber !== currentDayNumber || !arePreviousDaysComplete(day) || isDayCompleted(day)) return
    const record = relatedRecord || ensureRecord(mapped.title || savedTitles[0] || 'Pariharam', (mapped.attachments.find((item) => item.savedContent)?.savedContent.content) || {})
    toggleDay(record, day.dayNumber - 1, true)
  }
  const completedCount = mapped.days.filter(isDayCompleted).length
  const overallStatus = mapped.days.length > 0 && completedCount === mapped.days.length ? 'Completed' : 'Pending'
  const completedDays = Object.fromEntries(mapped.days.filter(isDayCompleted).map((day) => [day.id, { completed: true }]))
  const updateViewerDay = (dayId) => {
    const day = mapped.days.find((item) => item.id === dayId)
    if (day) updateDay(day)
  }
  return (
    <>
      {(mapped.title || mapped.statusLabel || mapped.completionText || mapped.startedDate || mapped.dueDate) && (
        <div className="apt-user-consultation-header">
          {(mapped.title || mapped.statusLabel) && (
            <div className="apt-user-consultation-header-top">
              {mapped.title && <strong>{mapped.title}</strong>}
              {mapped.statusLabel && <StatusBadge label={mapped.days.length ? overallStatus : mapped.statusLabel} />}
            </div>
          )}
          {mapped.completionText && <span>{mapped.completionText}</span>}
          {(mapped.startedDate || mapped.dueDate) && <small>Started: {mapped.startedDate || '—'} · Due: {mapped.dueDate || '—'}</small>}
        </div>
      )}
      {mapped.days.length > 0 && (
        <div className="apt-user-astrologer-notes-group apt-user-astrologer-notes-group--progress">
          <div className="apt-user-pariharam-progress-head"><strong>PARIHARAM PROGRESS</strong><span>{completedCount} of {mapped.days.length} days completed</span></div>
          <div className="apt-user-pariharam-progress-bar" aria-label={`${completedCount} of ${mapped.days.length} Pariharam days completed`}><span style={{ width: `${(completedCount / mapped.days.length) * 100}%` }} /></div>
          <div className="apt-user-pariharam-task-list">
            {mapped.days.map((day) => {
              const completed = isDayCompleted(day)
              const available = day.dayNumber === currentDayNumber && arePreviousDaysComplete(day) && !completed
              return (
                <label className={`apt-user-pariharam-task${completed ? ' is-completed' : ''}${!available && !completed ? ' is-locked' : ''}`} key={day.id}>
                  <input type="checkbox" checked={completed} disabled={!available} onChange={() => updateDay(day)} />
                  <span><strong>Day {day.dayNumber} — {day.date}</strong>{completed && <small>Completed</small>}{available && <small>Available today</small>}{!available && !completed && <small>{day.dayNumber <= (currentDayNumber || 0) ? 'Complete the previous day first' : `Available on ${day.date}`}</small>}</span>
                </label>
              )
            })}
          </div>
          {completedCount === mapped.days.length && <div className="apt-user-pariharam-complete">Pariharam Completed ✓</div>}
        </div>
      )}
      {mapped.summary && <div className="apt-user-astrologer-notes-group apt-user-astrologer-notes-group--summary"><strong>SUMMARY</strong><p>{mapped.summary}</p></div>}
      {mapped.attachments.length > 0 && (
        <div className="apt-user-astrologer-notes-group apt-user-astrologer-notes-group--attachments">
          <strong>ATTACHMENTS ({mapped.attachments.length})</strong>
          <div>
            {mapped.attachments.map((item, index) => (
              <div className="apt-user-astrologer-notes-attachment" key={`${item.name}-${index}`}>
                <span className="apt-user-astrologer-notes-attachment-icon"><FileText size={14} /></span>
                <div><strong>{item.name}</strong><small>{item.type}</small></div>
                <button className="btn btn-outline" type="button" onClick={() => { if (item.savedContent && appointmentId && mapped.days.length) openRelatedAtonement(item); else setAttachmentViewer(item) }}><Eye size={13} /> {item.viewUrl ? 'View' : 'Open'}</button>
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
      <AttachmentViewer attachment={attachmentViewer} completedDays={completedDays} currentDayNumber={currentDayNumber} onToggleDay={updateViewerDay} onClose={() => setAttachmentViewer(null)} />
    </>
  )
}

export default function UserAppointmentDetailsDrawer({ appointment, consultation, currentUser, onClose, onBookAgain, onUpdatePariharamProgress }) {
  const [showAstrologerNotes, setShowAstrologerNotes] = useState(false)

  useEffect(() => {
    setShowAstrologerNotes(false)
  }, [appointment?.id])

  if (!appointment) return null
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const displayStatus = getAppointmentDisplayStatus(appointment)
  const customerName = appointment.customerName || currentUser?.name || 'Not available'
  const astrologerName = appointment.astrologer || customerName
  const paymentStatus = appointment.paymentStatus || (appointment.status?.toLowerCase().includes('cancel') ? appointment.refundStatus || 'Refunded' : 'Paid')
  const amount = appointment.amount ?? appointment.price
  const bookingDate = appointment.bookingDate || (appointment.bookedAt ? new Date(appointment.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
  const consultationWithFallback = displayStatus === 'Completed' ? mergeAstrologerNotes(consultation, appointment) : null
  const mappedConsultation = consultationWithFallback ? mapConsultationForUser(consultationWithFallback, appointment) : null
  const hasSharedNotes = Boolean(mappedConsultation && (
    mappedConsultation.summary ||
    mappedConsultation.instructions.length ||
    mappedConsultation.attachments.length ||
    mappedConsultation.history.length ||
    consultationWithFallback?.atonement
  ))

  return createPortal(
    <div className="apt-drawer-overlay user-shell-overlay" onClick={onClose}>
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

          {displayStatus === 'Completed' && (
            <>
              <button
                type="button"
                className="apt-user-astrologer-notes-option"
                aria-expanded={showAstrologerNotes}
                onClick={() => setShowAstrologerNotes((visible) => !visible)}
              >
                <span className="apt-user-astrologer-notes-option-icon"><NotebookPen size={17} /></span>
                <span className="apt-user-astrologer-notes-option-copy">
                  <strong>Astrologer Notes</strong>
                  <small>Notes and consultation shared by your astrologer</small>
                </span>
                <ChevronRight size={18} className={`apt-user-astrologer-notes-option-arrow${showAstrologerNotes ? ' is-open' : ''}`} />
              </button>

              {showAstrologerNotes && (
                <section className="apt-detail-card apt-user-astrologer-notes">
                  <div className="apt-private-notes-head">
                    <NotebookPen size={15} /> Astrologer Notes
                    <span className="apt-private-notes-private"><Shield size={11} /> Only you can see</span>
                  </div>
                  <div className="apt-user-astrologer-notes-content">
                    {hasSharedNotes
                      ? <ConsultationNotesContent
                          mapped={mappedConsultation}
                          appointmentId={appointment.id}
                          appointment={appointment}
                          currentUser={currentUser}
                          onOpenAtonement={onClose}
                          onUpdateProgress={onUpdatePariharamProgress ? (pariharamId, dayId, dateIso, dayNumber, completed) => onUpdatePariharamProgress(appointment.id, pariharamId, dayId, dateIso, dayNumber, completed) : undefined}
                        />
                      : <p className="apt-user-astrologer-notes-empty">No astrologer notes have been shared for this appointment yet.</p>}
                  </div>
                </section>
              )}
            </>
          )}

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
