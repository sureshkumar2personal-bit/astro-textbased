import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  Camera,
  Check,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Copy,
  Eye,
  Gift,
  Headphones,
  Mic,
  MicOff,
  Play,
  Radio,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react'
import Card from '../../../components/ui/Card.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes, ROLES } from '../../../utils/roleRoutes.js'

const CATEGORIES = ['Vedic Astrology', 'Tarot Card Reading', 'Numerology']

const INITIAL_CHAT = [
  { id: 'chat-1', time: '10:51', name: 'Amit', text: 'Sir, check job prospects?' },
  { id: 'chat-2', time: '10:52', name: 'Priya12', text: 'Subscribed! 🙌' },
  { id: 'chat-3', time: '10:52', name: 'SYSTEM', text: 'Neha sent a Crystal gift', system: true },
  { id: 'chat-4', time: '10:53', name: 'Raj_V', text: 'Delayed marriage cure?' },
]

const INITIAL_QUEUE = [
  { id: 'queue-1', name: 'Rohan Sharma', status: 'Active', type: 'Premium', birth: '14 Aug 1995 · 14:25', place: 'New Delhi, India' },
  { id: 'queue-2', name: 'Vikram Patel', status: 'Paid', type: 'Premium', birth: '22 Nov 1991 · 09:10', place: 'Mumbai, India' },
  { id: 'queue-3', name: 'Anjali Das', status: 'In Queue', type: 'Free', birth: '06 Feb 1998 · 18:45', place: 'Kolkata, India' },
]

const INITIAL_CHART = [
  ['Mo-4', 'Su-5', 'Me-6'],
  ['Ve-3', 'Asc', 'Ma-7'],
  ['Ju-2', 'Sa-1', 'Ra-12'],
]

function formatDuration(seconds) {
  const safe = Math.max(0, seconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remaining = safe % 60
  return [hours, minutes, remaining].map((part) => String(part).padStart(2, '0')).join(':')
}

function localDateTime(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}

function CameraPreview({ videoRef, streamReady, audioReady, permissionWarning, compact = false }) {
  return (
    <div className={`live-camera-preview${compact ? ' live-camera-preview--compact' : ''}`}>
      <video ref={videoRef} autoPlay muted playsInline className={streamReady ? 'is-live' : ''} />
      {!streamReady && <div className="live-camera-placeholder"><Camera size={compact ? 28 : 42} /><strong>{permissionWarning ? 'Preview unavailable' : 'Camera preview'}</strong><span>{permissionWarning || 'Allow camera access to test your video.'}</span></div>}
      {streamReady && <div className="live-camera-label"><Video size={13} /> Astrologer feed</div>}
      <div className="live-camera-status"><span className={streamReady ? 'is-good' : 'is-warning'}><Video size={13} /> {streamReady ? 'Camera active' : 'Camera pending'}</span><span className={audioReady ? 'is-good' : 'is-warning'}>{audioReady ? <Mic size={13} /> : <MicOff size={13} />} {audioReady ? 'Audio input OK' : 'Audio pending'}</span></div>
    </div>
  )
}

function SetupChecklist({ onClose, onContinue, videoRef, streamReady, audioReady, permissionWarning, onRequestMedia }) {
  return (
    <div className="live-workspace live-workspace--setup">
      <div className="live-workspace-topbar">
        <button type="button" className="live-text-button" onClick={onClose}><X size={17} /> Close</button>
        <button type="button" className="live-text-button"><CircleHelp size={17} /> Help &amp; Support</button>
      </div>
      <div className="live-setup-content">
        <CameraPreview videoRef={videoRef} streamReady={streamReady} audioReady={audioReady} permissionWarning={permissionWarning} />
        <button type="button" className="live-test-button" onClick={onRequestMedia}><Settings2 size={16} /> Tap to test mic &amp; video</button>
        <div className="live-ready-banner"><span className="live-eyebrow">Astrologer broadcast studio</span><h1>Ready to engage users?</h1><p>Your guidance can reach viewers looking for clarity right now.</p></div>
        <Card className="live-guidelines-card">
          <div className="live-section-heading"><ShieldCheck size={20} /><h2>Guidelines reminders</h2></div>
          <div className="live-guidelines"><span>Maintain an ethical code of conduct.</span><span>Do not share personal contact or bank details.</span><span>Ensure lighting is bright and your audio is clear.</span></div>
          {(permissionWarning || !streamReady || !audioReady) && <div className="live-warning"><AlertTriangle size={16} /><span>{permissionWarning || 'You can continue, but checking your camera and microphone is recommended.'}</span></div>}
        </Card>
        <button type="button" className="btn btn-primary live-go-button" onClick={onContinue}><Radio size={18} /> Go Live Now</button>
      </div>
    </div>
  )
}

function ConfigurationModal({ form, setForm, onClose, onStart, error, streamReady, audioReady }) {
  return (
    <div className="live-modal-overlay">
      <div className="live-config-modal" role="dialog" aria-modal="true" aria-labelledby="live-config-title">
        <div className="live-config-header"><div><span className="live-eyebrow">Step 2 of 4</span><h2 id="live-config-title">Live broadcast configuration</h2></div><button type="button" className="icon-btn" aria-label="Close configuration" onClick={onClose}><X size={17} /></button></div>
        <div className="live-config-body">
          <label className="field-group"><span className="field-label-top">Stream title</span><input className="text-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Career & Marriage Remedies: Solutions Today!" /></label>
          <fieldset className="live-fieldset"><legend>Primary category</legend><div className="live-category-grid">{CATEGORIES.map((category) => <label key={category} className={`live-category-option${form.category === category ? ' is-selected' : ''}`}><input type="radio" name="live-category" value={category} checked={form.category === category} onChange={(event) => setForm({ ...form, category: event.target.value })} /><span>{category}</span></label>)}</div></fieldset>
          <fieldset className="live-fieldset"><legend>Live consultation mode rates</legend><label className="live-toggle-row"><span><strong>Enable free mini-questions</strong><small>Let new viewers ask a short public question.</small></span><input type="checkbox" checked={form.freeQuestions} onChange={(event) => setForm({ ...form, freeQuestions: event.target.checked })} /></label><label className="live-toggle-row"><span><strong>Enable premium queue</strong><small>Paid consultations are added to your priority queue.</small></span><input type="checkbox" checked={form.premiumQueue} onChange={(event) => setForm({ ...form, premiumQueue: event.target.checked })} /></label>{form.premiumQueue && <label className="field-group live-rate-field"><span className="field-label-top">Premium rate (₹ / min)</span><input type="number" min="1" className="text-input" value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} /></label>}</fieldset>
          <div className="live-verification"><div className="live-section-heading"><Zap size={18} /><h3>System verification</h3></div><span><Check size={14} /> Camera {streamReady ? 'active' : 'fallback ready'}</span><span><Check size={14} /> Audio {audioReady ? 'input OK' : 'fallback ready'}</span><span><Check size={14} /> Ping speed: 15ms</span></div>
          {error && <div className="profile-message profile-message--error">{error}</div>}
        </div>
        <div className="live-config-footer"><button type="button" className="btn btn-ghost" onClick={onClose}>Back</button><button type="button" className="btn btn-primary" onClick={onStart}><Radio size={16} /> Start Broadcast</button></div>
      </div>
    </div>
  )
}

function CustomerPanel({ customer }) {
  return <Card className="live-tool-card"><div className="live-tool-heading"><div><span className="live-eyebrow">Customer data feed</span><h2>{customer.name}</h2></div><StatusBadge label={customer.status} /></div><div className="live-customer-details"><span><strong>Gender</strong> Male</span><span><strong>DOB</strong> {customer.birth.split(' · ')[0]}</span><span><strong>TOB</strong> {customer.birth.split(' · ')[1]}</span><span><strong>POB</strong> {customer.place}</span></div></Card>
}

function KundliPanel() {
  return <Card className="live-tool-card"><div className="live-tool-heading"><div><span className="live-eyebrow">Automated Kundli generation</span><h2>D1 Chart</h2></div><Sparkles size={18} /></div><div className="live-kundli-chart">{INITIAL_CHART.flat().map((cell, index) => <div key={`${cell}-${index}`} className={cell === 'Asc' ? 'is-ascendant' : ''}>{cell}</div>)}</div><div className="muted live-chart-note">Calculated from customer birth details · ready to discuss</div></Card>
}

function QueuePanel({ queue, activeId, onSelect, onRemove }) {
  return <Card className="live-tool-card live-queue-card"><div className="live-tool-heading"><div><span className="live-eyebrow">Priority line</span><h2>Waiting consultation queue</h2></div><Users size={18} /></div><div className="live-queue-list">{queue.map((customer, index) => <button type="button" key={customer.id} className={`live-queue-item${activeId === customer.id ? ' is-active' : ''}`} onClick={() => onSelect(customer.id)}><span className="live-queue-number">{index + 1}</span><span className="live-queue-person"><strong>{customer.name}</strong><small>{customer.type} · {customer.status}</small></span>{customer.status === 'Active' ? <span className="live-queue-action" onClick={(event) => { event.stopPropagation(); onRemove(customer.id) }}><MicOff size={14} /> Disconnect</span> : <span className="live-queue-action"><Play size={14} /> Next Up</span>}</button>)}</div><button type="button" className="btn btn-ghost live-add-queue"><Copy size={14} /> Drag user from free chat to queue</button></Card>
}

function ActiveDashboard({ title, timer, viewerCount, earnings, videoRef, streamReady, audioReady, chat, setChat, draft, setDraft, queue, activeCustomer, setActiveCustomer, onEnd, onSendAnnouncement }) {
  const [announcement, setAnnouncement] = useState('')
  const customer = queue.find((item) => item.id === activeCustomer) || queue[0]
  const submitChat = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setChat((current) => [...current, { id: `chat-${Date.now()}`, time: 'Now', name: 'You', text }])
    setDraft('')
  }
  const submitAnnouncement = (event) => {
    event.preventDefault()
    if (!announcement.trim()) return
    onSendAnnouncement(announcement.trim())
    setAnnouncement('')
  }

  return <div className="live-workspace live-workspace--active">
    <header className="live-active-header"><div className="live-active-title"><span className="live-live-pill"><span /> LIVE</span><strong>{title}</strong></div><div className="live-active-metrics"><span><Clock3 size={15} /> {formatDuration(timer)}</span><span><Eye size={15} /> {viewerCount.toLocaleString()} viewers</span><span><Gift size={15} /> ₹{earnings.toLocaleString()} est.</span></div><button type="button" className="btn btn-danger" onClick={onEnd}><Square size={15} /> End Session</button></header>
    <div className="live-active-grid">
      <section className="live-active-left"><Card className="live-feed-card"><div className="live-panel-heading"><span><Video size={16} /> Camera &amp; audio</span><span className={streamReady || audioReady ? 'is-good' : 'is-warning'}>{streamReady && audioReady ? 'Verified' : 'Fallback mode'}</span></div><CameraPreview videoRef={videoRef} streamReady={streamReady} audioReady={audioReady} compact /></Card><Card className="live-chat-card"><div className="live-panel-heading"><span><MessageCircleIcon /> Public live chat feed</span><span className="live-muted-count">{chat.length} messages</span></div><div className="live-chat-list">{chat.map((message) => <div key={message.id} className={`live-chat-message${message.system ? ' is-system' : ''}`}><span>[{message.time}]</span><strong>{message.name}:</strong><p>{message.text}</p></div>)}</div><form className="live-chat-form" onSubmit={submitAnnouncement}><input value={announcement} onChange={(event) => setAnnouncement(event.target.value)} placeholder="Send global announcement message..." /><button type="submit" className="btn btn-primary" aria-label="Send announcement"><Send size={15} /></button></form><form className="live-chat-form live-chat-form--secondary" onSubmit={submitChat}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Reply in public chat..." /><button type="submit" className="btn btn-ghost" aria-label="Send chat message"><Send size={15} /></button></form></Card></section>
      <section className="live-active-right"><CustomerPanel customer={customer} /><KundliPanel /><QueuePanel queue={queue} activeId={activeCustomer} onSelect={setActiveCustomer} onRemove={(id) => setActiveCustomer(queue.find((item) => item.id !== id)?.id || id)} /></section>
    </div>
  </div>
}

function MessageCircleIcon() {
  return <span className="live-message-icon">•••</span>
}

function SummaryScreen({ title, duration, viewerCount, chatCount, earnings, onHome, onReviews, onInvoice }) {
  return <div className="live-workspace live-workspace--summary"><div className="live-summary-icon"><Radio size={28} /></div><span className="live-eyebrow">Broadcast disconnected</span><h1>{title}</h1><p className="live-summary-intro">Great job! Here is your live summary data from today&apos;s session.</p><div className="live-summary-stats"><div><Clock3 size={20} /><strong>{Math.max(1, Math.ceil(duration / 60))} mins</strong><span>Total time</span></div><div><Users size={20} /><strong>{viewerCount.toLocaleString()}</strong><span>Net views</span></div><div><Headphones size={20} /><strong>{chatCount}</strong><span>Chat enquiries answered</span></div></div><div className="live-rating"><Sparkles size={18} /> New ratings companion tracker: <strong>4.86</strong> (12 reviews)</div><Card className="live-earnings-card"><div><span>Estimated session earnings</span><strong>₹{earnings.toLocaleString()}.00</strong></div><div><span>Queue consulting minutes</span><b>₹{Math.round(earnings * 0.81).toLocaleString()}.00</b></div><div><span>Virtual gifts received</span><b>₹{Math.round(earnings * 0.19).toLocaleString()}.00</b></div></Card><div className="live-summary-actions"><button type="button" className="btn btn-outline" onClick={onReviews}><Sparkles size={15} /> View Reviews Breakdown</button><button type="button" className="btn btn-outline" onClick={onInvoice}><BarChart3 size={15} /> Export Detailed Invoice Log</button></div><button type="button" className="btn btn-primary live-home-button" onClick={onHome}><ChevronLeft size={16} /> Return to Home Portal</button></div>
}

export default function AstrologerLiveSession() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { astrologerLiveSessions, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const sessionId = searchParams.get('sessionId')
  const existingSession = useMemo(() => astrologerLiveSessions.find((session) => session.id === sessionId) || null, [astrologerLiveSessions, sessionId])
  const [stage, setStage] = useState('offline')
  const [form, setForm] = useState({ title: '', description: '', category: CATEGORIES[0], freeQuestions: true, premiumQueue: true, rate: '45', visibility: 'public', scheduledStartAt: localDateTime(), scheduledEndAt: localDateTime(new Date(Date.now() + 60 * 60 * 1000)) })
  const [formError, setFormError] = useState('')
  const [stream, setStream] = useState(null)
  const [mediaStatus, setMediaStatus] = useState({ camera: false, audio: false, warning: '' })
  const [timer, setTimer] = useState(0)
  const [viewerCount, setViewerCount] = useState(1240)
  const [earnings, setEarnings] = useState(3450)
  const [chat, setChat] = useState(INITIAL_CHAT)
  const [draft, setDraft] = useState('')
  const [queue] = useState(INITIAL_QUEUE)
  const [activeCustomer, setActiveCustomer] = useState(INITIAL_QUEUE[0].id)
  const videoRef = useRef(null)
  const activeStartedAt = useRef(null)

  useEffect(() => {
    if (!existingSession) return
    setForm({ title: existingSession.title, description: existingSession.description, category: CATEGORIES[0], freeQuestions: true, premiumQueue: true, rate: '45', visibility: existingSession.visibility, scheduledStartAt: localDateTime(existingSession.scheduledStartAt), scheduledEndAt: localDateTime(existingSession.scheduledEndAt) })
  }, [existingSession])

  const requestMedia = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaStatus({ camera: false, audio: false, warning: 'Camera and microphone preview is unavailable in this browser.' })
      return
    }
    try {
      if (stream) stream.getTracks().forEach((track) => track.stop())
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(nextStream)
      setMediaStatus({ camera: nextStream.getVideoTracks().length > 0, audio: nextStream.getAudioTracks().length > 0, warning: '' })
    } catch {
      setMediaStatus({ camera: false, audio: false, warning: 'Camera or microphone permission was denied. You can continue in fallback mode.' })
    }
  }

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream, stage])

  useEffect(() => () => {
    if (stream) stream.getTracks().forEach((track) => track.stop())
  }, [stream])

  useEffect(() => {
    if (stage !== 'active') return undefined
    activeStartedAt.current = Date.now()
    const timerId = window.setInterval(() => {
      setTimer(Math.floor((Date.now() - activeStartedAt.current) / 1000))
      setViewerCount((current) => current + (Math.random() > 0.65 ? 1 : 0))
      setEarnings((current) => current + (Math.random() > 0.8 ? 5 : 0))
    }, 1000)
    return () => window.clearInterval(timerId)
  }, [stage])

  const closeWorkspace = () => {
    if (stream) stream.getTracks().forEach((track) => track.stop())
    navigate(routes.profile)
  }

  const startBroadcast = () => {
    if (!form.title.trim()) {
      setFormError('Add a stream title before starting the broadcast.')
      return
    }
    const payload = { title: form.title.trim(), description: form.description.trim() || 'Live astrology guidance session.', visibility: form.visibility, scheduledStartAt: new Date(form.scheduledStartAt).toISOString(), scheduledEndAt: new Date(form.scheduledEndAt).toISOString(), astrologerId: currentUser?.id }
    if (existingSession) actions.startLiveSession(existingSession.id)
    else {
      const session = actions.createLiveSession(payload)
      if (session?.id) actions.startLiveSession(session.id)
    }
    setFormError('')
    setStage('active')
  }

  const endBroadcast = () => {
    if (existingSession) actions.endLiveSession(existingSession.id)
    if (stream) stream.getTracks().forEach((track) => track.stop())
    setStage('summary')
  }

  const sendAnnouncement = (text) => setChat((current) => [...current, { id: `announcement-${Date.now()}`, time: 'Now', name: 'SYSTEM', text, system: true }])
  const toastAction = (message) => window.alert(message)

  if (currentUser?.role !== ROLES.ASTROLOGER) return null

  if (stage === 'offline') return <SetupChecklist onClose={closeWorkspace} onContinue={() => setStage('configuration')} videoRef={videoRef} streamReady={mediaStatus.camera} audioReady={mediaStatus.audio} permissionWarning={mediaStatus.warning} onRequestMedia={requestMedia} />
  if (stage === 'configuration') return <><SetupChecklist onClose={closeWorkspace} onContinue={() => setStage('configuration')} videoRef={videoRef} streamReady={mediaStatus.camera} audioReady={mediaStatus.audio} permissionWarning={mediaStatus.warning} onRequestMedia={requestMedia} /><ConfigurationModal form={form} setForm={setForm} onClose={() => setStage('offline')} onStart={startBroadcast} error={formError} streamReady={mediaStatus.camera} audioReady={mediaStatus.audio} /></>
  if (stage === 'active') return <ActiveDashboard title={form.title || existingSession?.title || 'Astrology Live Session'} timer={timer} viewerCount={viewerCount} earnings={earnings} videoRef={videoRef} streamReady={mediaStatus.camera} audioReady={mediaStatus.audio} chat={chat} setChat={setChat} draft={draft} setDraft={setDraft} queue={queue} activeCustomer={activeCustomer} setActiveCustomer={setActiveCustomer} onEnd={endBroadcast} onSendAnnouncement={sendAnnouncement} />
  return <SummaryScreen title={form.title || existingSession?.title || 'Astrology Live Session'} duration={timer} viewerCount={viewerCount} chatCount={chat.length} earnings={earnings} onHome={() => navigate(routes.dashboard)} onReviews={() => toastAction('Reviews breakdown will be available when review data is connected.')} onInvoice={() => toastAction('Invoice export will be available when billing data is connected.')} />
}
