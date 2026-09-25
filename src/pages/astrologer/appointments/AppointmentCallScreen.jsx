import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Check, Download, Eye, FileText, Image as ImageIcon, Link as LinkIcon, Mic, MicOff, MoreHorizontal, Pencil, PhoneCall, PhoneOff, Send, Shield, StickyNote, Timer, Upload, X } from 'lucide-react'
import { callTypeMeta } from './meta.jsx'
import { getCallType, resolveAppointmentWindow, formatTimeRange } from '../../../utils/appointments.js'
import { useAuth } from '../../../state/AuthContext.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useToast } from '../../../components/Toast.jsx'
import SavedAtonementDetails from '../../../components/atonement/SavedAtonementDetails.jsx'

function Avatar({ name, size = 96 }) {
  const initials = String(name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const hue = [...String(name || '')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
  return (
    <div
      className="apt-call-avatar"
      style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 70% 52%))` }}
    >
      {initials}
    </div>
  )
}

function formatSentAt(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AppointmentCallScreen({ appointment, consultation, onEnd, onSaveConsultation, onCompleteCall, onSavePrivateCallNotes }) {
  const { currentUser } = useAuth()
  const { appointmentCalls } = useAppData()
  const { success } = useToast()
  const callType = getCallType(appointment.callType || appointment.type)
  const meta = callTypeMeta(callType)
  const Icon = meta.icon
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const [phase, setPhase] = useState(callType === 'Text' ? 'connected' : 'ringing')
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [moreTab, setMoreTab] = useState('call')

  const [notesDraft, setNotesDraft] = useState(appointment.privateCallNotes || '')
  const [preCallDraft] = useState(appointment.preCallAnalysis || '')
  const [notesSaved, setNotesSaved] = useState(false)

  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState([])
  const [linkDraft, setLinkDraft] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [savedPickerOpen, setSavedPickerOpen] = useState(false)
  const [selectedSavedIds, setSelectedSavedIds] = useState([])
  const [savedPreview, setSavedPreview] = useState(null)
  const [completionPeriod, setCompletionPeriod] = useState('7')
  const [customCompletionDays, setCustomCompletionDays] = useState('')
  const [followupSaved, setFollowupSaved] = useState(false)
  const [followupSent, setFollowupSent] = useState(false)
  const [followupSentAt, setFollowupSentAt] = useState(null)
  const [editingSent, setEditingSent] = useState(false)
  const [consultationEdited, setConsultationEdited] = useState(Boolean(consultation?.consultationEdited))
  const [savingFollowup, setSavingFollowup] = useState(false)
  const [confirmResendOpen, setConfirmResendOpen] = useState(false)
  const [sentSnapshot, setSentSnapshot] = useState(null)
  const savingFollowupRef = useRef(false)
  const imageRef = useRef(null)
  const pdfRef = useRef(null)

  const [messages, setMessages] = useState([
    { id: 1, from: 'them', text: `Hi, I'm ${appointment.customerName}. Ready when you are.` },
  ])
  const [draft, setDraft] = useState('')
  const chatRef = useRef(null)
  const ended = phase === 'ended'

  useEffect(() => {
    if (!consultation || consultation.appointmentId !== appointment.id || !consultation.sent) return
    setFollowupSent(true)
    setFollowupSentAt(consultation.sentAt || null)
    setConsultationEdited(Boolean(consultation.consultationEdited))
    setNotes(consultation.notes || '')
    setAttachments(consultation.attachments || (consultation.fileName ? [{ id: consultation.id, name: consultation.fileName, type: consultation.fileType, size: consultation.fileSize }] : []))
    setSentSnapshot({
      notes: consultation.notes || '',
      attachments: consultation.attachments || [],
      completionPeriod: consultation.atonement?.completionDays ? String(consultation.atonement.completionDays) : '7',
      customCompletionDays: '',
      sentAt: consultation.sentAt || null,
    })
  }, [appointment.id, consultation])

  useEffect(() => {
    if (callType === 'Text') return undefined
    const timer = window.setTimeout(() => setPhase('connected'), 1600)
    return () => window.clearTimeout(timer)
  }, [callType])

  useEffect(() => {
    if (phase !== 'connected' || callType === 'Text') return undefined
    const interval = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(interval)
  }, [phase, callType])

  useEffect(() => {
    const call = appointmentCalls.find((c) => c.appointmentId === appointment.id)
    if (call && (call.status === 'ended' || call.status === 'declined') && phase !== 'ended') setPhase('ended')
  }, [appointmentCalls, appointment.id, phase])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const durationLabel = () => {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s ? `${m}m ${s}s` : `${m}m`
  }

  const handleEnd = () => {
    if (ended) {
      if (typeof onEnd === 'function') onEnd(appointment)
      return
    }
    if (typeof onCompleteCall === 'function') {
      onCompleteCall(appointment.id, { callDurationSeconds: seconds })
    }
    setPhase('ended')
  }

  const sendMessage = (event) => {
    event.preventDefault()
    if (!draft.trim()) return
    setMessages((prev) => [...prev, { id: Date.now(), from: 'me', text: draft.trim() }])
    setDraft('')
  }

  const addFile = (event, kind) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    const attachment = { id: `${Date.now()}-${file.name}`, name: file.name, type: kind, mimeType: file.type, size: file.size }
    if (kind === 'Image') {
      const reader = new FileReader()
      reader.onload = () => setAttachments((items) => [...items, { ...attachment, preview: reader.result }])
      reader.readAsDataURL(file)
    } else {
      setAttachments((items) => [...items, attachment])
    }
    event.target.value = ''
  }

  const savedContent = (() => {
    if (typeof window === 'undefined') return []
    try {
      const userId = currentUser?.id || 'guest'
      const records = JSON.parse(window.localStorage.getItem(`astroconnect:atonement:${userId}:records`) || '[]')
      return records.map((record) => {
        const form = record.form || {}
        const item = form.attachment || form.content || {}
        const type = item.type || (item.url ? 'Link' : item.name ? (item.mimeType?.startsWith('image/') ? 'Image' : 'PDF') : 'Text')
        return { id: record.id, name: item.name || form.name || 'Untitled Atonement', type, date: record.updatedAt || record.createdAt, preview: item.preview || item.dataUrl || '', url: item.url || '', content: form }
      })
    } catch {
      return []
    }
  })()

  const addLink = () => {
    const url = linkDraft.trim()
    if (!url) return
    const name = (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } })()
    setAttachments((items) => [...items, { id: `${Date.now()}-${url}`, name, type: 'Link', url }])
    setLinkDraft('')
    setLinkOpen(false)
  }

  const attachSaved = () => {
    const selected = savedContent.filter((item) => selectedSavedIds.includes(item.id))
    setAttachments((items) => [...items, ...selected.filter((item) => !items.some((attached) => attached.savedId === item.id)).map((item) => ({ ...item, id: `saved-${item.id}`, savedId: item.id, originalType: item.type, type: 'Saved Content' }))])
    setSavedPickerOpen(false)
    setSelectedSavedIds([])
  }

  const saveInCallNotes = () => {
    if (typeof onSavePrivateCallNotes === 'function') onSavePrivateCallNotes(appointment.id, notesDraft)
    setNotesSaved(true)
  }

  const openHoroscope = () => {
    setMoreOpen(false)
    setPreviewOpen(true)
  }

  const buildPayload = (send) => ({
    appointmentId: appointment.id,
    notes,
    fileName: attachments[0]?.name || '',
    fileType: attachments[0]?.type || '',
    fileSize: attachments[0]?.size || 0,
    attachments,
    atonement: attachments.some((item) => item.type === 'Saved Content') ? {
      title: attachments.find((item) => item.type === 'Saved Content')?.name || 'Atonement',
      content: attachments.find((item) => item.type === 'Saved Content')?.content || {},
      completionDays: completionPeriod === 'custom' ? Number(customCompletionDays) || 0 : Number(completionPeriod),
      startAt: send ? new Date().toISOString() : null,
    } : null,
    send,
  })

  const handleSaveDraft = () => {
    if (typeof onSaveConsultation === 'function') onSaveConsultation(buildPayload(false))
    setFollowupSaved(true)
  }

  const commitSendFollowup = () => {
    if (savingFollowupRef.current || (editingSent && consultationEdited)) return
    const isEdit = editingSent
    savingFollowupRef.current = true
    setSavingFollowup(true)
    const saved = typeof onSaveConsultation === 'function'
      ? onSaveConsultation({ ...buildPayload(true), isEdit })
      : null
    if (isEdit && saved?.consultationEdited !== true) {
      savingFollowupRef.current = false
      setSavingFollowup(false)
      return
    }
    const sentTimestamp = new Date().toISOString()
    setFollowupSent(true)
    setFollowupSentAt(sentTimestamp)
    setFollowupSaved(true)
    setSentSnapshot({ notes, attachments, completionPeriod, customCompletionDays, sentAt: sentTimestamp })
    setConsultationEdited(Boolean(isEdit || saved?.consultationEdited))
    setEditingSent(false)
    setConfirmResendOpen(false)
    savingFollowupRef.current = false
    setSavingFollowup(false)
    success('Sent Successfully')
  }

  const handleSendFollowup = () => {
    if (followupSent) {
      setConfirmResendOpen(true)
      return
    }
    commitSendFollowup()
  }

  const cancelEditSent = () => {
    if (sentSnapshot) {
      setNotes(sentSnapshot.notes)
      setAttachments(sentSnapshot.attachments)
      setCompletionPeriod(sentSnapshot.completionPeriod)
      setCustomCompletionDays(sentSnapshot.customCompletionDays)
    }
    setEditingSent(false)
  }

  return (
    <>
    {createPortal(
    <div className={`apt-call-screen apt-call-screen--${callType.toLowerCase()}`}>
      <header className="apt-call-header">
        <div className="apt-call-header-title">
          <Icon size={16} />
          <span>{meta.label}</span>
          <span className="apt-call-header-time">{formatTimeRange(startMin, endMin)}</span>
        </div>
        <div className="apt-call-header-customer">{appointment.customerName}</div>
      </header>

      {ended ? (
        <div className="apt-call-ended-with-consult">
          <div className="apt-call-ended">
            <PhoneOff size={40} />
            <h2>Call Ended</h2>
            <p>Your call with {appointment.customerName} has ended.</p>
            <div className="apt-call-ended-duration">
              <Timer size={18} />
              <span>Duration</span>
              <strong>{durationLabel()}</strong>
            </div>
          </div>

          <div className="apt-call-consult follow-up">
            <div className="apt-call-consult-head">
              <StickyNote size={16} /> {followupSent && !editingSent ? 'Consultation' : 'Add Consultation?'}
              {followupSent && <span className="apt-consultation-sent-badge"><Check size={12} /> Sent to User</span>}
            </div>
            {followupSent && followupSentAt && (
              <div className="apt-consultation-sent-meta">Sent {formatSentAt(editingSent ? followupSentAt : sentSnapshot?.sentAt || followupSentAt)}</div>
            )}
            {followupSent && !editingSent ? (
              <div className="apt-consultation-readonly">
                <div className="apt-consultation-readonly-block">
                  <label>Consultation Summary</label>
                  <p>{sentSnapshot?.notes || 'No summary was added.'}</p>
                </div>
                {(sentSnapshot?.attachments || []).length > 0 && (
                  <div className="apt-consultation-attachment-list">
                    {sentSnapshot.attachments.map((item) => (
                      <div className="apt-consultation-attachment-card apt-consultation-attachment-card--readonly" key={item.id}>
                        {item.type === 'Image' && item.preview ? <img src={item.preview} alt="Attachment preview" /> : <span className="apt-consultation-attachment-icon">{item.type === 'Link' ? <LinkIcon size={14} /> : <FileText size={14} />}</span>}
                        <span><strong>{item.name}</strong><small>{item.type}{item.url ? ` · ${item.url}` : ''}</small></span>
                      </div>
                    ))}
                  </div>
                )}
                {(sentSnapshot?.attachments || []).some((item) => item.type === 'Saved Content') && (() => {
                  const days = sentSnapshot.completionPeriod === 'custom' ? Number(sentSnapshot.customCompletionDays) : Number(sentSnapshot.completionPeriod)
                  const start = new Date(sentSnapshot.sentAt || followupSentAt)
                  const due = new Date(start)
                  due.setDate(due.getDate() + (days || 0))
                  return (
                    <div className="apt-atonement-duration apt-atonement-duration--readonly">
                      <label>Completion Period</label>
                      <strong>{sentSnapshot.completionPeriod === 'custom' ? `${days || 0} Days (Custom)` : `${days} Days`}</strong>
                      <small>Start Date: {start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · Due Date: {days ? due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</small>
                    </div>
                  )
                })()}
                <div className="apt-consultation-footer">
                  <div className="apt-consultation-action-group">
                    {!consultationEdited && <button type="button" className="btn btn-outline" onClick={() => { if (!consultationEdited) setEditingSent(true) }}><Pencil size={14} /> Edit</button>}
                    <button type="button" className="btn btn-primary" onClick={handleEnd}>Close</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  className="apt-consultation-notes"
                  rows={3}
                  placeholder="Enter consultation summary..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <div className="apt-consultation-attachments">
                  <span className="apt-consultation-attachments-label">Attachments</span>
                  <div className="apt-consultation-attachment-controls">
                    <button type="button" className="apt-consultation-attach" onClick={() => imageRef.current?.click()}><ImageIcon size={14} /> Upload Image</button>
                    <button type="button" className="apt-consultation-attach" onClick={() => pdfRef.current?.click()}><Upload size={14} /> Upload PDF</button>
                    <button type="button" className="apt-consultation-attach" onClick={() => setLinkOpen((open) => !open)}><LinkIcon size={14} /> Add Link</button>
                    <button type="button" className="apt-consultation-attach" onClick={() => setSavedPickerOpen(true)}><FileText size={14} /> Saved</button>
                  </div>
                  <input ref={imageRef} type="file" accept="image/*" hidden onChange={(event) => addFile(event, 'Image')} />
                  <input ref={pdfRef} type="file" accept=".pdf,application/pdf" hidden onChange={(event) => addFile(event, 'PDF')} />
                  {linkOpen && <div className="apt-consultation-link-entry"><input type="url" autoFocus placeholder="Paste a URL" value={linkDraft} onChange={(event) => setLinkDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addLink() } }} /><button type="button" className="btn btn-primary btn-sm" onClick={addLink}>Add</button></div>}
                  {attachments.length > 0 && <div className="apt-consultation-attachment-list">
                    {attachments.map((item) => <div className="apt-consultation-attachment-card" key={item.id}>
                      {item.type === 'Image' && item.preview ? <img src={item.preview} alt="Attachment preview" /> : <span className="apt-consultation-attachment-icon">{item.type === 'Link' ? <LinkIcon size={14} /> : <FileText size={14} />}</span>}
                      <span><strong>{item.name}</strong><small>{item.type}{item.url ? ` · ${item.url}` : ''}</small></span>
                      <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setAttachments((items) => items.filter((attachment) => attachment.id !== item.id))}><X size={14} /></button>
                    </div>)}
                  </div>}
                  {attachments.some((item) => item.type === 'Saved Content') && <div className="apt-atonement-duration"><label>Completion Period</label><select value={completionPeriod} onChange={(event) => setCompletionPeriod(event.target.value)}><option value="1">1 Day</option><option value="3">3 Days</option><option value="5">5 Days</option><option value="7">7 Days</option><option value="15">15 Days</option><option value="21">21 Days</option><option value="30">30 Days</option><option value="custom">Custom</option></select>{completionPeriod === 'custom' && <input type="number" min="1" placeholder="Days" value={customCompletionDays} onChange={(event) => setCustomCompletionDays(event.target.value)} />}{(() => { const days = completionPeriod === 'custom' ? Number(customCompletionDays) : Number(completionPeriod); const due = new Date(); due.setDate(due.getDate() + (days || 0)); return <small>Start Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · Due Date: {days ? due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select days'}</small> })()}</div>}
                </div>
                <div className="apt-consultation-footer">
                  <div className="apt-consultation-action-group">
                    {!followupSent && (
                      <button type="button" className="btn btn-outline" onClick={handleSaveDraft}>
                        {followupSaved ? 'Saved' : 'Save Draft'}
                      </button>
                    )}
                    {followupSent && (
                      <button type="button" className="btn btn-outline" onClick={cancelEditSent}>
                        Cancel
                      </button>
                    )}
                    <button type="button" className="btn btn-primary" onClick={handleSendFollowup} disabled={savingFollowup || (attachments.some((item) => item.type === 'Saved Content') && completionPeriod === 'custom' && !Number(customCompletionDays))}>
                      {followupSent ? 'Update & Resend' : 'Send to User'}
                    </button>
                  </div>
                  {(followupSaved && !followupSent) && (
                    <div className="apt-consultation-note">
                      Consultation saved as a draft. It will appear in the user&rsquo;s profile activity.
                    </div>
                  )}
                  <button type="button" className="btn btn-ghost apt-call-consult-close" onClick={handleEnd}>
                    Skip / Close
                  </button>
                </div>
              </>
            )}
          </div>
          {confirmResendOpen && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="resend-confirm-title" onClick={() => setConfirmResendOpen(false)}>
              <div className="modal-card apt-consultation-confirm" onClick={(event) => event.stopPropagation()}>
                <h3 id="resend-confirm-title">Update sent consultation?</h3>
                <p>This consultation was already sent to {appointment.customerName}. Sending again will replace what they see and notify them that it was updated.</p>
                <div className="apt-consultation-action-group apt-consultation-confirm-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmResendOpen(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={commitSendFollowup} disabled={savingFollowup}>Confirm & Resend</button>
                </div>
              </div>
            </div>
          )}
          {savedPickerOpen && <div className="apt-saved-content-backdrop" role="dialog" aria-modal="true" aria-labelledby="saved-content-title" onClick={() => setSavedPickerOpen(false)}>
            <div className="apt-saved-content-modal" onClick={(event) => event.stopPropagation()}>
              <div className="apt-saved-content-head"><div><h3 id="saved-content-title">Saved Atonement Content</h3><p>Select one or more saved items to attach.</p></div><button type="button" className="icon-btn" aria-label="Close saved content" onClick={() => setSavedPickerOpen(false)}><X size={16} /></button></div>
              <div className="apt-saved-content-list">
                {savedContent.length ? savedContent.map((item) => <label className="apt-saved-content-item" key={item.id}><input type="checkbox" checked={selectedSavedIds.includes(item.id)} onChange={() => setSelectedSavedIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} /><span className="apt-saved-content-type">{item.type}</span><span><strong>{item.name}</strong><small>{item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Saved content'}</small></span><button type="button" className="apt-saved-view" onClick={(event) => { event.preventDefault(); setSavedPreview(item) }}>View</button></label>) : <div className="apt-saved-content-empty">No saved Atonement content yet.</div>}
              </div>
              <div className="apt-saved-content-actions"><button type="button" className="btn btn-ghost" onClick={() => setSavedPickerOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" disabled={!selectedSavedIds.length} onClick={attachSaved}>Attach Selected</button></div>
            </div>
          </div>}
          {savedPreview && <SavedAtonementDetails name={savedPreview.name} content={savedPreview.content} preview={savedPreview.preview} onClose={() => setSavedPreview(null)} onAttach={() => { setSelectedSavedIds((ids) => ids.includes(savedPreview.id) ? ids : [...ids, savedPreview.id]); setSavedPreview(null) }} />}
        </div>
      ) : (
      <>
      <div className="apt-call-stage">
        {callType === 'Text' ? (
          <div className="apt-chat">
            <div className="apt-chat-head">
              <Avatar name={appointment.customerName} size={40} />
              <div>
                <div className="apt-chat-name">{appointment.customerName}</div>
                <div className="apt-chat-sub">Text consultation · {appointment.topic}</div>
              </div>
            </div>
            <div className="apt-chat-messages" ref={chatRef}>
              {messages.map((message) => (
                <div key={message.id} className={`apt-chat-bubble apt-chat-bubble--${message.from}`}>
                  {message.text}
                </div>
              ))}
            </div>
            <form className="apt-chat-composer" onSubmit={sendMessage}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type a message…"
                aria-label="Message customer"
              />
              <button type="submit" className="apt-chat-send" aria-label="Send">
                <Send size={16} />
              </button>
            </form>
          </div>
        ) : (
            <div className="apt-call-video">
              <Avatar name={appointment.customerName} size={140} />
              <div className="apt-call-customer-name">{appointment.customerName}</div>
              <div className="apt-call-status">
                {phase === 'ringing' ? (
                  <span className="apt-call-status-ringing">
                    <PhoneCall size={14} /> Ringing…
                  </span>
                ) : (
                  <span className="apt-call-status-live">
                    <span className="apt-call-live-dot" />
                    Connected
                  </span>
                )}
              </div>
              {phase === 'connected' && (
                <div className="apt-call-timer">
                  <Timer size={14} /> {durationLabel()}
                </div>
              )}
            {callType === 'Audio' && phase === 'connected' && (
              <div className="apt-audio-wave" aria-hidden="true">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {moreOpen && phase !== 'ended' && (
        <div className="apt-call-more">
          <div className="apt-call-more-tabs">
            <button type="button" className={moreTab === 'call' ? 'is-active' : ''} onClick={() => setMoreTab('call')}>Call</button>
            <button type="button" className={moreTab === 'private' ? 'is-active' : ''} onClick={() => setMoreTab('private')}>Private Notes</button>
            {appointment.horoscope && (
              <button type="button" className={moreTab === 'horoscope' ? 'is-active' : ''} onClick={() => setMoreTab('horoscope')}>Horoscope</button>
            )}
          </div>
          <div className="apt-call-more-body">
            {moreTab === 'call' && (
              <div className="apt-call-more-info">
                <div><span>Call</span><strong>{meta.label}</strong></div>
                <div><span>Duration</span><strong>{durationLabel()}</strong></div>
                <div><span>Status</span><strong>{phase === 'ringing' ? 'Ringing…' : 'Connected'}</strong></div>
                <div><span>User</span><strong>{appointment.customerName}</strong></div>
              </div>
            )}
            {moreTab === 'private' && (
              <div className="apt-call-more-private">
                <label className="apt-private-notes-label" htmlFor={`callprecall-${appointment.id}`}>Pre-Call Analysis</label>
                <textarea
                  id={`callprecall-${appointment.id}`}
                  className="apt-consultation-notes"
                  rows={2}
                  placeholder="No pre-call notes saved."
                  value={preCallDraft}
                  readOnly
                  aria-readonly="true"
                />
                <label className="apt-private-notes-label" htmlFor={`callnotes-${appointment.id}`}>Private Call Notes</label>
                <textarea
                  id={`callnotes-${appointment.id}`}
                  className="apt-consultation-notes"
                  rows={2}
                  placeholder="Notes while talking with the user…"
                  value={notesDraft}
                  onChange={(event) => { setNotesDraft(event.target.value); setNotesSaved(false) }}
                />
                <button type="button" className="btn btn-outline apt-private-notes-save" onClick={saveInCallNotes}>
                  {notesSaved ? 'Saved' : 'Save Notes'}
                </button>
                <span className="apt-call-more-private-note"><Shield size={11} /> Private — only the astrologer can see these notes.</span>
              </div>
            )}
            {moreTab === 'horoscope' && (
              <div className="apt-call-more-horoscope">
                {appointment.horoscope ? (
                  <>
                    <FileText size={22} />
                    <strong>{appointment.horoscope.name}</strong>
                    <span>{appointment.horoscope.type} · {appointment.horoscope.size}</span>
                    <div className="apt-horoscope-actions">
                      <button type="button" className="btn btn-outline" onClick={openHoroscope}>
                        <Eye size={14} /> View Horoscope
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <FileText size={22} />
                    <span>No horoscope attached</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="apt-call-controls">
        {callType !== 'Text' && phase !== 'ended' && (
          <>
            <button
              type="button"
              className={`apt-call-control ${muted ? 'is-active' : ''}`}
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <MicOff size={18} /> : <Mic size={18} />}
              <span>{muted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button
              type="button"
              className={`apt-call-control${moreOpen ? ' is-active' : ''}`}
              onClick={() => setMoreOpen((open) => !open)}
              aria-label="More options"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal size={18} />
              <span>More</span>
            </button>
          </>
        )}
        <button type="button" className={`apt-call-end${ended ? ' apt-call-end--done' : ''}`} onClick={handleEnd}>
          <PhoneOff size={18} />
          <span>{ended ? 'Close' : 'End Call'}</span>
        </button>
      </footer>
      </>
      )}
    </div>,
    document.body,
    )}
    {previewOpen && appointment.horoscope && (
      <CallHoroscopePreview horoscope={appointment.horoscope} onClose={() => setPreviewOpen(false)} customerName={appointment.customerName} />
    )}
    </>
  )
}

function CallHoroscopePreview({ horoscope, onClose, customerName }) {
  const url = horoscope.dataUrl || ''
  const isImage = url && /^data:image\//.test(url)
  return createPortal(
    <div className="apt-drawer-overlay apt-horoscope-overlay" onClick={onClose}>
      <div className="apt-horoscope-preview" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="apt-horoscope-preview-head">
          <div>
            <h2>Horoscope</h2>
            <span>{horoscope.name} · {horoscope.type}</span>
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
              <span>{horoscope.name} ({horoscope.size})</span>
              <p>A downloadable document attachment. In a production deployment this would render the actual PDF/image from your file storage.</p>
            </div>
          )}
        </div>
        {url && (
          <footer className="apt-horoscope-preview-foot">
            <a className="btn btn-primary" href={url} download={horoscope.name || 'horoscope'} rel="noreferrer">
              <Download size={15} /> Download
            </a>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
