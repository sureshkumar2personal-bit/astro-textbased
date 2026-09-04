import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Send, MoreHorizontal, PhoneOff } from 'lucide-react'
import { callTypeMeta } from './meta.jsx'
import AppointmentCompletionNotesModal from './AppointmentCompletionNotesModal.jsx'
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

export default function AppointmentCallScreen({ appointment, onEnd }) {
  const callType = getCallType(appointment.callType || appointment.type)
  const meta = callTypeMeta(callType)
  const Icon = meta.icon
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [messages, setMessages] = useState([
    { id: 1, from: 'them', text: `Hi, I'm ${appointment.customerName}. Ready when you are.` },
  ])
  const [draft, setDraft] = useState('')
  const chatRef = useRef(null)

  useEffect(() => {
    if (callType === 'Text') return undefined
    const timer = window.setTimeout(() => setConnected(true), 1600)
    return () => window.clearTimeout(timer)
  }, [callType])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const sendMessage = (event) => {
    event.preventDefault()
    if (!draft.trim()) return
    setMessages((prev) => [...prev, { id: Date.now(), from: 'me', text: draft.trim() }])
    setDraft('')
  }

  const openEndNotes = () => setNotesOpen(true)
  const closeEndNotes = () => setNotesOpen(false)
  const saveEndNotes = (remedyNotes) => {
    setNotesOpen(false)
    onEnd(appointment, remedyNotes)
  }

  return createPortal(
    <div className={`apt-call-screen apt-call-screen--${callType.toLowerCase()}`}>
      <header className="apt-call-header">
        <div className="apt-call-header-title">
          <Icon size={16} />
          <span>{meta.label}</span>
          <span className="apt-call-header-time">{formatTimeRange(startMin, endMin)}</span>
        </div>
        <div className="apt-call-header-customer">{appointment.customerName}</div>
      </header>

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
                {connected ? (
                  <span className="apt-call-status-live">
                    <span className="apt-call-live-dot" />
                    Connected
                  </span>
                ) : (
                  'Connecting…'
                )}
              </div>
            {callType === 'Audio' && connected && (
              <div className="apt-audio-wave" aria-hidden="true">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            )}
            {!cameraOn && (
              <div className="apt-call-camera-off">Camera off</div>
            )}
          </div>
        )}
      </div>

      <footer className="apt-call-controls">
        {callType !== 'Text' && (
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
              className={`apt-call-control ${!cameraOn ? 'is-active' : ''}`}
              onClick={() => setCameraOn((c) => !c)}
              aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            >
              <span>Camera</span>
            </button>
            <button type="button" className="apt-call-control" aria-label="More options">
              <MoreHorizontal size={18} />
              <span>More</span>
            </button>
          </>
        )}
        <button type="button" className="apt-call-end" onClick={openEndNotes}>
          <PhoneOff size={18} />
          <span>{callType === 'Text' ? 'End Chat' : 'End Call'}</span>
        </button>
      </footer>
      <AppointmentCompletionNotesModal
        appointment={appointment}
        open={notesOpen}
        onCancel={closeEndNotes}
        onSubmit={saveEndNotes}
      />
    </div>,
    document.body,
  )
}
