import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Check, Download, Eye, FileText, Mic, MicOff, MoreHorizontal, Paperclip, PhoneCall, PhoneOff, Send, Shield, StickyNote, Timer, X } from 'lucide-react'
import { callTypeMeta } from './meta.jsx'
import { getCallType, resolveAppointmentWindow, formatTimeRange } from '../../../utils/appointments.js'

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

export default function AppointmentCallScreen({ appointment, onEnd, onSaveConsultation, onCompleteCall, onSavePrivateNotes, onSavePreCallAnalysis }) {
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

  const [notesDraft, setNotesDraft] = useState(appointment.privateNotes || '')
  const [preCallDraft, setPreCallDraft] = useState(appointment.preCallAnalysis || '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [preCallSaved, setPreCallSaved] = useState(false)

  const [notes, setNotes] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [followupSaved, setFollowupSaved] = useState(false)
  const [followupSent, setFollowupSent] = useState(false)
  const [followupSentAt, setFollowupSentAt] = useState(null)
  const fileRef = useRef(null)

  const [messages, setMessages] = useState([
    { id: 1, from: 'them', text: `Hi, I'm ${appointment.customerName}. Ready when you are.` },
  ])
  const [draft, setDraft] = useState('')
  const chatRef = useRef(null)
  const ended = phase === 'ended'

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
      onCompleteCall(appointment.id, { callDurationSeconds: seconds, privateNotes: notesDraft })
    }
    setPhase('ended')
  }

  const sendMessage = (event) => {
    event.preventDefault()
    if (!draft.trim()) return
    setMessages((prev) => [...prev, { id: Date.now(), from: 'me', text: draft.trim() }])
    setDraft('')
  }

  const handleAttach = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    setAttachment({ name: file.name, type: file.type || 'application/pdf', size: file.size })
  }

  const saveInCallNotes = () => {
    if (typeof onSavePrivateNotes === 'function') onSavePrivateNotes(appointment.id, notesDraft)
    setNotesSaved(true)
  }

  const saveInCallPreCall = () => {
    if (typeof onSavePreCallAnalysis === 'function') onSavePreCallAnalysis(appointment.id, preCallDraft)
    setPreCallSaved(true)
  }

  const openHoroscope = () => {
    setMoreOpen(false)
    setPreviewOpen(true)
  }

  const buildPayload = (send) => ({
    appointmentId: appointment.id,
    notes,
    fileName: attachment?.name || '',
    fileType: attachment?.type || '',
    fileSize: attachment?.size || 0,
    send,
  })

  const handleSaveDraft = () => {
    if (typeof onSaveConsultation === 'function') onSaveConsultation(buildPayload(false))
    setFollowupSaved(true)
  }

  const handleSendFollowup = () => {
    if (typeof onSaveConsultation === 'function') onSaveConsultation(buildPayload(true))
    setFollowupSent(true)
    setFollowupSentAt(new Date().toISOString())
    setFollowupSaved(true)
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
              <StickyNote size={16} /> Add Consultation?
              {followupSent && <span className="apt-consultation-sent-badge"><Check size={12} /> Sent to User</span>}
            </div>
            {followupSent && followupSentAt && (
              <div className="apt-consultation-sent-meta">Sent {formatSentAt(followupSentAt)}</div>
            )}
            <textarea
              className="apt-consultation-notes"
              rows={3}
              placeholder="Enter consultation summary..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <div className="apt-consultation-actions">
              {attachment ? (
                <button type="button" className="apt-consultation-file" onClick={() => fileRef.current && fileRef.current.click()}>
                  <FileText size={14} /> {attachment.name}
                </button>
              ) : (
                <button type="button" className="apt-consultation-attach" onClick={() => fileRef.current && fileRef.current.click()}>
                  <Paperclip size={14} /> Attach PDF
                </button>
              )}
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" hidden onChange={handleAttach} />
              <div className="apt-consultation-action-group">
                <button type="button" className="btn btn-outline" onClick={handleSaveDraft} disabled={followupSent}>
                  {followupSaved && !followupSent ? 'Saved' : 'Save Draft'}
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSendFollowup} disabled={followupSent}>
                  {followupSent ? 'Sent' : 'Send to User'}
                </button>
              </div>
            </div>
            {(followupSaved || followupSent) && (
              <div className="apt-consultation-note">
                Consultation {followupSent ? 'sent to the user' : 'saved as a draft'}. It will appear in the user&rsquo;s profile activity.
              </div>
            )}
            <button type="button" className="btn btn-ghost apt-call-consult-close" onClick={handleEnd}>
              Skip / Close
            </button>
          </div>
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
                  placeholder="Pre-call horoscope analysis…"
                  value={preCallDraft}
                  onChange={(event) => { setPreCallDraft(event.target.value); setPreCallSaved(false) }}
                />
                <button type="button" className="btn btn-outline apt-private-notes-save" onClick={saveInCallPreCall}>
                  {preCallSaved ? 'Saved' : 'Save Analysis'}
                </button>
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
