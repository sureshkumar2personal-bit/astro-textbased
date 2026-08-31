import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
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

const LIVE_FLOW_STORAGE_KEY = 'astroconnect-live-session-flow'
const DEFAULT_RATE = '45'
const INITIAL_TIMER = 0
const INITIAL_VIEWERS = 1240
const INITIAL_EARNINGS = 3450

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

const DEFAULT_DRAFT = {
  title: '',
  description: '',
  category: CATEGORIES[0],
  freeQuestions: true,
  premiumQueue: true,
  rate: DEFAULT_RATE,
  visibility: 'public',
  scheduledStartAt: localDateTime(),
  scheduledEndAt: localDateTime(new Date(Date.now() + 60 * 60 * 1000)),
}

const LiveSessionFlowContext = createContext(null)

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

function readFlowStorage() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(LIVE_FLOW_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveFlowStorage(value) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(LIVE_FLOW_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Ignore storage failures and keep the in-memory flow active.
  }
}

function clearFlowStorage() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(LIVE_FLOW_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

function buildSessionUrl(path, sessionId) {
  return sessionId ? `${path}?sessionId=${encodeURIComponent(sessionId)}` : path
}

function initialDraft(existingSession) {
  if (!existingSession) return { ...DEFAULT_DRAFT }

  return {
    ...DEFAULT_DRAFT,
    title: existingSession.title || '',
    description: existingSession.description || '',
    category: existingSession.category || CATEGORIES[0],
    freeQuestions: existingSession.freeQuestions !== false,
    premiumQueue: existingSession.premiumQueue !== false,
    rate: String(existingSession.rate || DEFAULT_RATE),
    visibility: existingSession.visibility || 'public',
    scheduledStartAt: localDateTime(existingSession.startedAt || existingSession.scheduledStartAt),
    scheduledEndAt: localDateTime(existingSession.endedAt || existingSession.scheduledEndAt),
  }
}

function requestInitials(name) {
  return String(name || 'User')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function requestAudienceLabel(request) {
  if (request.relationship === 'subscriber') {
    return `${request.subscriberTier || 'Subscriber'} subscriber${request.subscriptionPrice ? ` · ₹${request.subscriptionPrice}/month` : ''}`
  }

  return request.relationship || 'User'
}

function CameraPreview({ videoRef, streamReady, audioReady, permissionWarning, compact = false }) {
  return (
    <div className={`live-camera-preview${compact ? ' live-camera-preview--compact' : ''}`}>
      <video ref={videoRef} autoPlay muted playsInline className={streamReady ? 'is-live' : ''} />
      {!streamReady && (
        <div className="live-camera-placeholder">
          <Camera size={compact ? 28 : 42} />
          <strong>{permissionWarning ? 'Preview unavailable' : 'Camera preview'}</strong>
          <span>{permissionWarning || 'Allow camera access to test your video.'}</span>
        </div>
      )}
      {streamReady && (
        <div className="live-camera-label">
          <div>Astrologer feed</div>
        </div>
      )}
      <div className="live-camera-status">
        <span className={streamReady ? 'is-good' : 'is-warning'}>
          {streamReady ? 'Camera active' : 'Camera pending'}
        </span>
        <span className={audioReady ? 'is-good' : 'is-warning'}>
          {audioReady ? <Mic size={13} /> : <MicOff size={13} />} {audioReady ? 'Audio input OK' : 'Audio pending'}
        </span>
      </div>
    </div>
  )
}

function CustomerPanel({ customer }) {
  return (
    <Card className="live-tool-card">
      <div className="live-tool-heading">
        <div>
          <span className="live-eyebrow">Customer data feed</span>
          <h2>{customer.name}</h2>
        </div>
        <StatusBadge label={customer.status} />
      </div>
      <div className="live-customer-details">
        <span><strong>Gender</strong> Male</span>
        <span><strong>DOB</strong> {customer.birth.split(' · ')[0]}</span>
        <span><strong>TOB</strong> {customer.birth.split(' · ')[1]}</span>
        <span><strong>POB</strong> {customer.place}</span>
      </div>
    </Card>
  )
}

function KundliPanel() {
  return (
    <Card className="live-tool-card">
      <div className="live-tool-heading">
        <div>
          <span className="live-eyebrow">Automated Kundli generation</span>
          <h2>D1 Chart</h2>
        </div>
        <Sparkles size={18} />
      </div>
      <div className="live-kundli-chart">
        {INITIAL_CHART.flat().map((cell, index) => (
          <div key={`${cell}-${index}`} className={cell === 'Asc' ? 'is-ascendant' : ''}>
            {cell}
          </div>
        ))}
      </div>
      <div className="muted live-chart-note">Calculated from customer birth details · ready to discuss</div>
    </Card>
  )
}

function QueuePanel({ queue, activeId, onSelect, onRemove }) {
  return (
    <Card className="live-tool-card live-queue-card">
      <div className="live-tool-heading">
        <div>
          <span className="live-eyebrow">Priority line</span>
          <h2>Waiting consultation queue</h2>
        </div>
        <Users size={18} />
      </div>
      <div className="live-queue-list">
        {queue.map((customer, index) => (
          <button
            type="button"
            key={customer.id}
            className={`live-queue-item${activeId === customer.id ? ' is-active' : ''}`}
            onClick={() => onSelect(customer.id)}
          >
            <span className="live-queue-number">{index + 1}</span>
            <span className="live-queue-person">
              <strong>{customer.name}</strong>
              <small>{customer.type} · {customer.status}</small>
            </span>
            {customer.status === 'Active' ? (
              <span className="live-queue-action" onClick={(event) => { event.stopPropagation(); onRemove(customer.id) }}>
                <MicOff size={14} /> Disconnect
              </span>
            ) : (
              <span className="live-queue-action"><Play size={14} /> Next Up</span>
            )}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-ghost live-add-queue">
        <Copy size={14} /> Drag user from free chat to queue
      </button>
    </Card>
  )
}

function MessageCircleIcon() {
  return <span className="live-message-icon">•••</span>
}

function useLiveSessionFlow() {
  const value = useContext(LiveSessionFlowContext)
  if (!value) {
    throw new Error('useLiveSessionFlow must be used within AstrologerLiveSessionShell')
  }
  return value
}

function LiveSessionShellInner({ children }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { astrologerLiveSessions, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role || ROLES.ASTROLOGER)
  const [searchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('sessionId')

  const existingSession = useMemo(
    () => astrologerLiveSessions.find((session) => session.id === sessionIdFromUrl) || null,
    [astrologerLiveSessions, sessionIdFromUrl],
  )

  const storedFlow = useMemo(() => readFlowStorage(), [])

  const [draft, setDraft] = useState(() => {
    if (existingSession) return initialDraft(existingSession)
    if (storedFlow?.draft) return { ...DEFAULT_DRAFT, ...storedFlow.draft }
    return { ...DEFAULT_DRAFT }
  })
  const [flowSessionId, setFlowSessionId] = useState(() => existingSession?.id || storedFlow?.sessionId || null)
  const [summarySnapshot, setSummarySnapshot] = useState(() => storedFlow?.summarySnapshot || null)
  const [stream, setStream] = useState(null)
  const [mediaStatus, setMediaStatus] = useState({ camera: false, audio: false, warning: '' })
  const [timer, setTimer] = useState(INITIAL_TIMER)
  const [viewerCount, setViewerCount] = useState(INITIAL_VIEWERS)
  const [earnings, setEarnings] = useState(INITIAL_EARNINGS)
  const [chat, setChat] = useState(INITIAL_CHAT)
  const [announcementDraft, setAnnouncementDraft] = useState('')
  const [replyDraft, setReplyDraft] = useState('')
  const [queue] = useState(INITIAL_QUEUE)
  const [activeCustomer, setActiveCustomer] = useState(INITIAL_QUEUE[0].id)
  const [sessionStartedAt, setSessionStartedAt] = useState(existingSession?.startedAt || null)
  const [formError, setFormError] = useState('')
  const videoRef = useRef(null)

  useEffect(() => {
    if (!existingSession) return
    setFlowSessionId(existingSession.id)
    setDraft(initialDraft(existingSession))
  }, [existingSession?.id])

  useEffect(() => {
    saveFlowStorage({
      draft,
      sessionId: flowSessionId,
      summarySnapshot,
    })
  }, [draft, flowSessionId, summarySnapshot])

  useEffect(() => () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
  }, [stream])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  const resetFlow = () => {
    stopStream()
    setDraft({ ...DEFAULT_DRAFT })
    setFlowSessionId(null)
    setSummarySnapshot(null)
    setSessionStartedAt(null)
    setTimer(INITIAL_TIMER)
    setViewerCount(INITIAL_VIEWERS)
    setEarnings(INITIAL_EARNINGS)
    setChat(INITIAL_CHAT)
    setAnnouncementDraft('')
    setReplyDraft('')
    setActiveCustomer(INITIAL_QUEUE[0].id)
    setMediaStatus({ camera: false, audio: false, warning: '' })
    setFormError('')
    clearFlowStorage()
  }

  const goTo = (path, sessionId = flowSessionId) => {
    navigate(buildSessionUrl(path, sessionId))
  }

  const requestMedia = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaStatus({ camera: false, audio: false, warning: 'Camera and microphone preview is unavailable in this browser.' })
      return
    }

    try {
      stopStream()
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(nextStream)
      setMediaStatus({
        camera: false,
        audio: nextStream.getAudioTracks().length > 0,
        warning: '',
      })
    } catch {
      setMediaStatus({
        camera: false,
        audio: false,
        warning: 'Camera or microphone permission was denied. You can continue in fallback mode.',
      })
    }
  }

  const closeWorkspace = () => {
    resetFlow()
    navigate(routes.profile)
  }

  const goToSetup = () => goTo(routes.liveSessionSetup)
  const goToConfigure = () => goTo(routes.liveSessionConfigure)
  const goToRoom = (sessionId) => goTo(routes.liveSessionRoom, sessionId)
  const goToSummary = (sessionId) => goTo(routes.liveSessionSummary, sessionId)

  const startBroadcast = () => {
    setFormError('')

    if (!draft.title.trim()) {
      setFormError('Add a stream title before starting the broadcast.')
      return
    }

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || 'Live astrology guidance session.',
      category: draft.category,
      freeQuestions: draft.freeQuestions,
      premiumQueue: draft.premiumQueue,
      rate: draft.rate,
      visibility: draft.visibility,
      scheduledStartAt: new Date(draft.scheduledStartAt).toISOString(),
      scheduledEndAt: new Date(draft.scheduledEndAt).toISOString(),
      astrologerId: currentUser?.id,
    }

    let session = existingSession
    if (session) {
      actions.updateLiveSession(session.id, payload)
      actions.startLiveSession(session.id)
    } else {
      session = actions.createLiveSession(payload)
      actions.startLiveSession(session.id)
    }

    const startedAt = new Date().toISOString()
    setFlowSessionId(session.id)
    setSessionStartedAt(startedAt)
    setSummarySnapshot(null)
    setTimer(INITIAL_TIMER)
    setViewerCount(INITIAL_VIEWERS)
    setEarnings(INITIAL_EARNINGS)
    setChat(INITIAL_CHAT)
    setAnnouncementDraft('')
    setReplyDraft('')
    setActiveCustomer(INITIAL_QUEUE[0].id)
    setMediaStatus((current) => ({ ...current, warning: current.warning || '' }))
    goToRoom(session.id)
  }

  const endBroadcast = () => {
    const liveSessionId = flowSessionId || existingSession?.id
    if (!liveSessionId) {
      goToSummary()
      return
    }

    actions.endLiveSession(liveSessionId)
    setSummarySnapshot({
      duration: timer,
      viewerCount,
      chatCount: chat.length,
      earnings,
    })
    stopStream()
    goToSummary(liveSessionId)
  }

  const sendAnnouncement = (text) => {
    setChat((current) => [
      ...current,
      {
        id: `announcement-${Date.now()}`,
        time: 'Now',
        name: 'SYSTEM',
        text,
        system: true,
      },
    ])
  }

  const value = useMemo(() => ({
    routes,
    existingSession,
    draft,
    setDraft,
    flowSessionId,
    setFlowSessionId,
    summarySnapshot,
    setSummarySnapshot,
    stream,
    setStream,
    mediaStatus,
    setMediaStatus,
    timer,
    setTimer,
    viewerCount,
    setViewerCount,
    earnings,
    setEarnings,
    chat,
    setChat,
    announcementDraft,
    setAnnouncementDraft,
    replyDraft,
    setReplyDraft,
    queue,
    activeCustomer,
    setActiveCustomer,
    sessionStartedAt,
    setSessionStartedAt,
    formError,
    setFormError,
    videoRef,
    requestMedia,
    stopStream,
    resetFlow,
    closeWorkspace,
    goToSetup,
    goToConfigure,
    goToRoom,
    goToSummary,
    startBroadcast,
    endBroadcast,
    sendAnnouncement,
  }), [
    routes,
    existingSession,
    draft,
    flowSessionId,
    summarySnapshot,
    stream,
    mediaStatus,
    timer,
    viewerCount,
    earnings,
    chat,
    announcementDraft,
    replyDraft,
    queue,
    activeCustomer,
    sessionStartedAt,
    formError,
    requestMedia,
    resetFlow,
    closeWorkspace,
    goToSetup,
    goToConfigure,
    goToRoom,
    goToSummary,
    startBroadcast,
    endBroadcast,
    sendAnnouncement,
  ])

  return <LiveSessionFlowContext.Provider value={value}>{children}</LiveSessionFlowContext.Provider>
}

function LivePageHeader({ step, title, subtitle, onClose, onBack, backLabel = 'Back' }) {
  return (
    <div className="live-workspace-topbar">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button type="button" className="live-text-button" onClick={onBack}>
            <ChevronLeft size={17} /> {backLabel}
          </button>
        ) : (
          <button type="button" className="live-text-button" onClick={onClose}>
            <X size={17} /> Close
          </button>
        )}
        <span className="live-eyebrow">{step}</span>
      </div>
      <div className="text-right">
        <strong>{title}</strong>
        <div className="muted" style={{ fontSize: 13 }}>{subtitle}</div>
      </div>
    </div>
  )
}

export function AstrologerLiveSessionSetup() {
  const { draft, mediaStatus, requestMedia, closeWorkspace, goToConfigure, videoRef } = useLiveSessionFlow()

  return (
    <div className="live-workspace live-workspace--setup">
      <LivePageHeader
        step="Step 01 of 04"
        title="Broadcast studio setup"
        subtitle="Check your camera and microphone before you continue"
        onClose={closeWorkspace}
      />
      <div className="live-setup-content">
        <CameraPreview
          videoRef={videoRef}
          streamReady={mediaStatus.camera}
          audioReady={mediaStatus.audio}
          permissionWarning={mediaStatus.warning}
        />
        <button type="button" className="live-test-button" onClick={requestMedia}>
          <Settings2 size={16} /> Tap to test mic &amp; video
        </button>
        <div className="live-ready-banner">
          <span className="live-eyebrow">Astrologer broadcast studio</span>
          <h1>Ready to engage users?</h1>
          <p>
            Your guidance can reach viewers looking for clarity right now.
            {draft.title ? ` Draft title: ${draft.title}` : ''}
          </p>
        </div>
        <Card className="live-guidelines-card">
          <div className="live-section-heading">
            <ShieldCheck size={20} />
            <h2>Guidelines reminders</h2>
          </div>
          <div className="live-guidelines">
            <span>Maintain an ethical code of conduct.</span>
            <span>Do not share personal contact or bank details.</span>
            <span>Ensure lighting is bright and your audio is clear.</span>
          </div>
          {(mediaStatus.warning || !mediaStatus.camera || !mediaStatus.audio) && (
            <div className="live-warning">
              <AlertTriangle size={16} />
              <span>{mediaStatus.warning || 'You can continue, but checking your camera and microphone is recommended.'}</span>
            </div>
          )}
        </Card>
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn btn-outline" onClick={closeWorkspace}>
            Back to Profile
          </button>
          <button type="button" className="btn btn-primary live-go-button" onClick={goToConfigure}>
            <Radio size={18} /> Next
          </button>
        </div>
      </div>
    </div>
  )
}

export function AstrologerLiveSessionConfigure() {
  const {
    draft,
    setDraft,
    mediaStatus,
    formError,
    setFormError,
    closeWorkspace,
    goToSetup,
    startBroadcast,
  } = useLiveSessionFlow()

  return (
    <div className="live-workspace live-workspace--setup">
      <LivePageHeader
        step="Step 02 of 04"
        title="Live broadcast configuration"
        subtitle="Set the title, audience mode, and rate before you go live"
        onClose={closeWorkspace}
        onBack={goToSetup}
      />
      <Card style={{ display: 'grid', gap: 20, padding: 24 }}>
        <label className="field-group" style={{ margin: 0 }}>
          <span className="field-label-top">Stream title</span>
          <input
            className="text-input"
            value={draft.title}
            onChange={(event) => {
              setFormError('')
              setDraft({ ...draft, title: event.target.value })
            }}
            placeholder="Career & Marriage Remedies: Solutions Today!"
          />
        </label>

        <fieldset className="live-fieldset">
          <legend>Primary category</legend>
          <div className="live-category-grid">
            {CATEGORIES.map((category) => (
              <label
                key={category}
                className={`live-category-option${draft.category === category ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="live-category"
                  value={category}
                  checked={draft.category === category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                />
                <span>{category}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="live-fieldset">
          <legend>Live consultation mode rates</legend>
          <label className="live-toggle-row">
            <span>
              <strong>Enable free mini-questions</strong>
              <small>Let new viewers ask a short public question.</small>
            </span>
            <input
              type="checkbox"
              checked={draft.freeQuestions}
              onChange={(event) => setDraft({ ...draft, freeQuestions: event.target.checked })}
            />
          </label>
          <label className="live-toggle-row">
            <span>
              <strong>Enable premium queue</strong>
              <small>Paid consultations are added to your priority queue.</small>
            </span>
            <input
              type="checkbox"
              checked={draft.premiumQueue}
              onChange={(event) => setDraft({ ...draft, premiumQueue: event.target.checked })}
            />
          </label>
          {draft.premiumQueue && (
            <label className="field-group live-rate-field">
              <span className="field-label-top">Premium rate (₹ / min)</span>
              <input
                type="number"
                min="1"
                className="text-input"
                value={draft.rate}
                onChange={(event) => setDraft({ ...draft, rate: event.target.value })}
              />
            </label>
          )}
        </fieldset>

        <div className="live-verification">
          <div className="live-section-heading">
            <Zap size={18} />
            <h3>System verification</h3>
          </div>
          <span><Check size={14} /> Camera {mediaStatus.camera ? 'active' : 'fallback ready'}</span>
          <span><Check size={14} /> Audio {mediaStatus.audio ? 'input OK' : 'fallback ready'}</span>
          <span><Check size={14} /> Ping speed: 15ms</span>
        </div>

        {formError && <div className="profile-message profile-message--error">{formError}</div>}

        <div className="live-config-footer">
          <button type="button" className="btn btn-ghost" onClick={goToSetup}>
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={startBroadcast}>
            <Radio size={16} /> Start Broadcast
          </button>
        </div>
      </Card>
    </div>
  )
}

export function AstrologerLiveSessionRoom() {
  const {
    routes,
    existingSession,
    draft,
    flowSessionId,
    sessionStartedAt,
    timer,
    setTimer,
    viewerCount,
    setViewerCount,
    earnings,
    setEarnings,
    chat,
    setChat,
    announcementDraft,
    setAnnouncementDraft,
    replyDraft,
    setReplyDraft,
    queue,
    activeCustomer,
    setActiveCustomer,
    closeWorkspace,
    endBroadcast,
    videoRef,
    mediaStatus,
  } = useLiveSessionFlow()

  const startedAt = sessionStartedAt || existingSession?.startedAt

  useEffect(() => {
    if (!startedAt) {
      setTimer(0)
      return undefined
    }

    const tick = () => {
      setTimer(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)))
    }

    tick()
    const timerId = window.setInterval(() => {
      tick()
      setViewerCount((current) => current + (Math.random() > 0.65 ? 1 : 0))
      setEarnings((current) => current + (Math.random() > 0.8 ? 5 : 0))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [startedAt, setEarnings, setTimer, setViewerCount])

  if (!flowSessionId && !existingSession) {
    return <Navigate to={routes.liveSessionSetup} replace />
  }

  const title = draft.title || existingSession?.title || 'Astrology Live Session'

  const submitChat = (event) => {
    event.preventDefault()
    const text = replyDraft.trim()
    if (!text) return
    setChat((current) => [...current, { id: `chat-${Date.now()}`, time: 'Now', name: 'You', text }])
    setReplyDraft('')
  }

  const sendAnnouncement = (event) => {
    event.preventDefault()
    if (!announcementDraft.trim()) return
    setChat((current) => [...current, { id: `announcement-${Date.now()}`, time: 'Now', name: 'SYSTEM', text: announcementDraft.trim(), system: true }])
    setAnnouncementDraft('')
  }

  const customer = queue.find((item) => item.id === activeCustomer) || queue[0]

  return (
    <div className="live-workspace live-workspace--active">
      <header className="live-active-header">
        <div className="live-active-title">
          <span className="live-live-pill"><span /> LIVE</span>
          <strong>{title}</strong>
        </div>
        <div className="live-active-metrics">
          <span><Clock3 size={15} /> {formatDuration(timer)}</span>
          <span><Eye size={15} /> {viewerCount.toLocaleString()} viewers</span>
          <span><Gift size={15} /> ₹{earnings.toLocaleString()} est.</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-outline" onClick={closeWorkspace}>
            <ChevronLeft size={15} /> Exit
          </button>
          <button type="button" className="btn btn-danger" onClick={endBroadcast}>
            <Square size={15} /> End Session
          </button>
        </div>
      </header>
      <div className="live-active-grid">
        <section className="live-active-left">
          <Card className="live-feed-card">
            <div className="live-panel-heading">
              <span><Video size={16} /> Camera &amp; audio</span>
              <span className={mediaStatus.camera || mediaStatus.audio ? 'is-good' : 'is-warning'}>
                {mediaStatus.camera && mediaStatus.audio ? 'Verified' : 'Fallback mode'}
              </span>
            </div>
            <CameraPreview
              videoRef={videoRef}
              streamReady={mediaStatus.camera}
              audioReady={mediaStatus.audio}
              compact
              permissionWarning={mediaStatus.warning}
            />
          </Card>
          <Card className="live-chat-card">
            <div className="live-panel-heading">
              <span><MessageCircleIcon /> Public live chat feed</span>
              <span className="live-muted-count">{chat.length} messages</span>
            </div>
            <div className="live-chat-list">
              {chat.map((message) => (
                <div key={message.id} className={`live-chat-message${message.system ? ' is-system' : ''}`}>
                  <span>[{message.time}]</span>
                  <strong>{message.name}:</strong>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
            <form className="live-chat-form" onSubmit={sendAnnouncement}>
              <input
                value={announcementDraft}
                onChange={(event) => setAnnouncementDraft(event.target.value)}
                placeholder="Send global announcement message..."
              />
              <button type="submit" className="btn btn-primary" aria-label="Send announcement">
                <Send size={15} />
              </button>
            </form>
            <form className="live-chat-form live-chat-form--secondary" onSubmit={submitChat}>
              <input
                value={replyDraft}
                onChange={(event) => setReplyDraft(event.target.value)}
                placeholder="Reply in public chat..."
              />
              <button type="submit" className="btn btn-ghost" aria-label="Send chat message">
                <Send size={15} />
              </button>
            </form>
          </Card>
        </section>
        <section className="live-active-right">
          <CustomerPanel customer={customer} />
          <KundliPanel />
          <QueuePanel
            queue={queue}
            activeId={activeCustomer}
            onSelect={setActiveCustomer}
            onRemove={(id) => setActiveCustomer(queue.find((item) => item.id !== id)?.id || id)}
          />
        </section>
      </div>
    </div>
  )
}

export function AstrologerLiveSessionSummary() {
  const { routes, existingSession, summarySnapshot, resetFlow } = useLiveSessionFlow()
  const navigate = useNavigate()

  if (!existingSession && !summarySnapshot) {
    return <Navigate to={routes.liveSessionSetup} replace />
  }

  const durationSeconds = summarySnapshot?.duration ?? (() => {
    if (!existingSession?.startedAt || !existingSession?.endedAt) return 0
    return Math.max(0, Math.floor((new Date(existingSession.endedAt).getTime() - new Date(existingSession.startedAt).getTime()) / 1000))
  })()
  const viewerTotal = summarySnapshot?.viewerCount ?? 0
  const chatCount = summarySnapshot?.chatCount ?? 0
  const totalEarnings = summarySnapshot?.earnings ?? 0
  const title = existingSession?.title || 'Astrology Live Session'

  const goHome = () => {
    resetFlow()
    navigate(routes.dashboard)
  }

  return (
    <div className="live-workspace live-workspace--summary">
      <div className="live-summary-icon"><Radio size={28} /></div>
      <span className="live-eyebrow">Broadcast disconnected</span>
      <h1>{title}</h1>
      <p className="live-summary-intro">Great job! Here is your live summary data from today&apos;s session.</p>
      <div className="live-summary-stats">
        <div>
          <Clock3 size={20} />
          <strong>{Math.max(1, Math.ceil(durationSeconds / 60))} mins</strong>
          <span>Total time</span>
        </div>
        <div>
          <Users size={20} />
          <strong>{viewerTotal.toLocaleString()}</strong>
          <span>Net views</span>
        </div>
        <div>
          <Headphones size={20} />
          <strong>{chatCount}</strong>
          <span>Chat enquiries answered</span>
        </div>
      </div>
      <div className="live-rating">
        <Sparkles size={18} /> New ratings companion tracker: <strong>4.86</strong> (12 reviews)
      </div>
      <Card className="live-earnings-card">
        <div>
          <span>Estimated session earnings</span>
          <strong>₹{totalEarnings.toLocaleString()}.00</strong>
        </div>
        <div>
          <span>Queue consulting minutes</span>
          <b>₹{Math.round(totalEarnings * 0.81).toLocaleString()}.00</b>
        </div>
        <div>
          <span>Virtual gifts received</span>
          <b>₹{Math.round(totalEarnings * 0.19).toLocaleString()}.00</b>
        </div>
      </Card>
      <div className="live-summary-actions">
        <button type="button" className="btn btn-outline" onClick={() => window.alert('Reviews breakdown will be available when review data is connected.')}>
          <Sparkles size={15} /> View Reviews Breakdown
        </button>
        <button type="button" className="btn btn-outline" onClick={() => window.alert('Invoice export will be available when billing data is connected.')}>
          <BarChart3 size={15} /> Export Detailed Invoice Log
        </button>
      </div>
      <button type="button" className="btn btn-primary live-home-button" onClick={goHome}>
        <ChevronLeft size={16} /> Return to Home Portal
      </button>
    </div>
  )
}

function AstrologerLiveSessionShell() {
  return (
    <LiveSessionShellInner>
      <Outlet />
    </LiveSessionShellInner>
  )
}

export default AstrologerLiveSessionShell
