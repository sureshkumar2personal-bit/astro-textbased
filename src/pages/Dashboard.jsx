import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../state/ThemeContext.jsx'
import {
  MessageCircle,
  ChevronRight,
  CalendarDays,
  Radio,
  Zap,
  Sparkles,
  Flame,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { getInstantConsultations, subscribeToInstantConsultations, updateInstantConsultation } from '../utils/instantConsultation.js'

const ASTROLOGER_GREETING_QUOTES = [
  'The stars impel, they do not compel. Guide your seekers with wisdom today.',
  'Every chart carries a story, and every choice can shape the next chapter.',
  'Let intuition guide the question, and wisdom guide the answer.',
]
const INCOMING_CALL_TIMEOUT_MS = 60 * 1000

function requestInitials(name) {
  return String(name || 'User').split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function requestBirthDetail(request, ...keys) {
  for (const key of keys) {
    if (request?.birthDetails?.[key]) return request.birthDetails[key]
  }
  return ''
}

export default function Dashboard() {
  const { isDark } = useTheme()
  const { currentUser } = useAuth()
  const [showInvitedPasswordPopup, setShowInvitedPasswordPopup] = useState(Boolean(currentUser?.requiresPasswordSetup))
  const [greetingQuoteIndex, setGreetingQuoteIndex] = useState(0)
  const [instantConsultations, setInstantConsultations] = useState([])
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id

  useEffect(() => {
    const refreshConsultations = () => {
      const now = Date.now()
      const consultations = getInstantConsultations()
      consultations
        .filter((request) => request.type === 'call' && request.status === 'ringing' && now - new Date(request.createdAt).getTime() >= INCOMING_CALL_TIMEOUT_MS)
        .forEach((request) => updateInstantConsultation(request.id, { status: 'expired', expiredAt: new Date().toISOString() }))
      setInstantConsultations(getInstantConsultations())
    }

    refreshConsultations()
    const unsubscribe = subscribeToInstantConsultations(refreshConsultations)
    const timer = window.setInterval(refreshConsultations, 1000)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [])

  const pendingCallRequests = instantConsultations.filter((request) => (
    request.astrologerId === astrologerId
    && request.type === 'call'
    && request.status === 'ringing'
    && Date.now() - new Date(request.createdAt).getTime() < INCOMING_CALL_TIMEOUT_MS
  ))
  const quickActions = [
    { icon: Sparkles, label: 'Generate Kundli', route: routes.myAccount, accent: 'orange' },
    { icon: Flame, label: 'Send Remedy', route: routes.atonement, accent: 'purple' },
    { icon: Radio, label: 'Schedule Live', route: routes.liveSessionSetup, accent: 'rose' },
    { icon: CalendarDays, label: 'Add Slot', route: routes.appointments, accent: 'blue' },
    { icon: MessageCircle, label: 'Dispute Note', route: routes.disputeManagement, accent: 'red' },
  ]

  useEffect(() => {
    // Preload alternate theme banner for instant theme switching
    const preloader = new Image()
    preloader.src = isDark ? '/golden-temple-sunset-banner.png' : '/golden-temple-sunset-banner-dark.png'
  }, [isDark])

  return (
    <div>
      {showInvitedPasswordPopup && <InvitedPasswordPopup onComplete={() => setShowInvitedPasswordPopup(false)} />}
      <header className="astrologer-greeting-header">
        <div className="astrologer-greeting-header__mandala" aria-hidden="true" />
        <div className="astrologer-greeting-header__temple" aria-hidden="true" />
        <h1>GOOD AFTERNOON, {(currentUser?.name || 'Acharya Gurudev').toUpperCase()}! <span aria-hidden="true">✨</span></h1>
        <p><strong>“</strong> <em>{ASTROLOGER_GREETING_QUOTES[greetingQuoteIndex]}</em> <button type="button" aria-label="Show another greeting" title="Show another greeting" onClick={() => setGreetingQuoteIndex((index) => (index + 1) % ASTROLOGER_GREETING_QUOTES.length)}><RefreshCw size={18} aria-hidden="true" /></button></p>
      </header>
      <Section title="Quick Actions" icon={Zap} sectionClassName="adash-quick-actions-section" action={<span className="adash-quick-actions-caption">Fast Shortcuts</span>}>
        <div className="adash-quick-actions">
          {quickActions.map(({ icon: Icon, label, route, onClick, accent }) => (
            <button
              key={label}
              type="button"
              className={`action-card adash-quick-action adash-quick-action--${accent}`}
              onClick={() => (onClick ? onClick() : route && navigate(route))}
            >
              <span className="adash-quick-action-icon"><Icon size={20} /></span>
              <span className="adash-quick-action-label">{label}</span>
              <ChevronRight className="adash-quick-action-arrow" size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </Section>

      <div className="astrologer-dashboard-metrics" aria-label="Dashboard metrics">
        <MetricCard label="Today's Revenue" value="₹5,420" note="↑ +18% from yesterday" tone="gold" />
        <MetricCard label="Consultations" value="28 Sessions" note="16 Chats  •  10 Calls  •  2 Reports" tone="blue" />
        <MetricCard label="Avg Rating" value="4.94 ★" note="From 520 reviews" tone="purple" />
        <MetricCard label="Active Talk Time" value="4h 12m" note="Avg 14 mins / call" tone="cyan" />
        <MetricCard label="Pending Questions" value="4 Queries" note="Requires attention" tone="rose" />
      </div>

      {pendingCallRequests.length > 0 && (
        <section className="astrologer-consultation-queue" aria-labelledby="consultation-queue-title">
          <div className="astrologer-queue-heading">
            <span id="consultation-queue-title">● LIVE CONSULTATION REQUEST QUEUE</span>
            <small>{pendingCallRequests.length} Incoming Call{pendingCallRequests.length === 1 ? '' : 's'}</small>
          </div>
          {pendingCallRequests.map((request) => {
            const rashi = requestBirthDetail(request, 'rashi', 'rashiName', 'sign')
            const nakshatra = requestBirthDetail(request, 'nakshatra', 'nakshatraName')
            const details = [rashi, nakshatra].filter(Boolean).join('  •  ')
            const avatar = request.userAvatar || request.userPhoto || request.profileImage
            return (
              <div className="astrologer-queue-content" key={request.id}>
                <div className="astrologer-queue-avatar">
                  {avatar ? <img src={avatar} alt="" /> : requestInitials(request.userName)}
                </div>
                <div className="astrologer-queue-person">
                  <strong>{request.userName || 'Astro Connect user'}</strong>
                  <small>{details || 'Birth details not available'}  •  Instant Call</small>
                  <span><b>Incoming:</b> {request.topic || 'Astrology consultation request'}  •  <b>Status:</b> Ringing</span>
                </div>
                <div className="astrologer-queue-actions">
                  <button type="button" className="astrologer-queue-decline" onClick={() => updateInstantConsultation(request.id, { status: 'rejected', rejectedAt: new Date().toISOString() })}>Decline</button>
                  <button type="button" className="astrologer-queue-accept" onClick={() => updateInstantConsultation(request.id, { status: 'accepted', startedAt: new Date().toISOString() })}>Accept Call (₹{request.pricePerMinute || 0}/min)</button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      <div className="astrologer-reference-grid">
        <section className="astrologer-reference-panel" aria-labelledby="work-events-title">
          <div className="astrologer-reference-panel__heading">
            <h2 id="work-events-title"><span aria-hidden="true">▣</span> APPOINTMENTS</h2>
            <button type="button" onClick={() => navigate(routes.appointments)}>View All</button>
          </div>
          <div className="astrologer-work-event">
            <div><strong>Meera Kulkarni</strong><small>Vedic Chart Consultation</small></div>
            <span className="astrologer-event-time">In 25 Mins</span>
            <div className="astrologer-event-meta"><span>◷ 12:30 PM (45m)</span><button type="button" onClick={() => navigate(routes.appointments)}>Start Session</button></div>
          </div>
          <div className="astrologer-work-event">
            <div><strong>Karthik Raja</strong><small>Pariharam Video Call</small></div>
            <span className="astrologer-event-time">02:15 PM</span>
            <div className="astrologer-event-meta"><span>◷ 02:15 PM (30m)</span><button type="button" onClick={() => navigate(routes.appointments)}>View Details</button></div>
          </div>
          <div className="astrologer-work-event">
            <div><strong>Ananya V.</strong><small>Career Guidance Chat</small></div>
            <span className="astrologer-event-time">04:00 PM</span>
            <div className="astrologer-event-meta"><span>◷ 04:00 PM (30m)</span><button type="button" onClick={() => navigate(routes.appointments)}>View Details</button></div>
          </div>
        </section>

        <section className="astrologer-reference-panel" aria-labelledby="activity-feed-title">
          <div className="astrologer-reference-panel__heading">
            <h2 id="activity-feed-title"><span aria-hidden="true">☷</span> RECENT ACTIVITY FEED</h2>
            <span className="astrologer-live-updates"><i /> Live Updates</span>
          </div>
          <div className="astrologer-activity-item"><span className="astrologer-activity-icon">☎</span><div><strong>Completed Instant Call with <b>Ramesh Kumar</b> (12 mins)</strong><small>10 mins ago  •  Rate: ₹40/min</small></div><em>+₹480</em></div>
          <div className="astrologer-activity-item"><span className="astrologer-activity-icon">★</span><div><strong>Received 5★ Rating &amp; Review from <b>Ananya V.</b></strong><small>28 mins ago  •  “Very accurate Rahu Dasha remedies!”</small></div><em className="activity-stars">★★★★★</em></div>
          <div className="astrologer-activity-item"><span className="astrologer-activity-icon">●</span><div><strong>Instant Chat Session ended with <b>Siddharth N.</b> (18 mins)</strong><small>42 mins ago  •  Career consultation completed</small></div><em>+₹540</em></div>
        </section>
      </div>

      <div className="astrologer-analytics-grid">
        <section className="astrologer-analytics-panel" aria-labelledby="revenue-trend-title">
          <div className="astrologer-analytics-heading"><h2 id="revenue-trend-title">WEEKLY REVENUE &amp; SESSION TRENDS</h2><small>Updated Realtime</small></div>
          <div className="astrologer-trend-chart">
            <div className="astrologer-chart-y-axis"><span>7,500</span><span>6,000</span><span>4,500</span><span>3,000</span></div>
            <div className="astrologer-chart-plot"><svg viewBox="0 0 700 230" preserveAspectRatio="none" role="img" aria-label="Weekly revenue trend"><path className="trend-area" d="M0 188 C50 169 90 128 145 142 C190 153 222 160 270 126 C320 92 360 90 410 61 C458 32 508 1 560 18 C610 34 655 94 700 74 L700 220 L0 220 Z" /><path className="trend-line" d="M0 188 C50 169 90 128 145 142 C190 153 222 160 270 126 C320 92 360 90 410 61 C458 32 508 1 560 18 C610 34 655 94 700 74" /></svg><div className="astrologer-chart-x-axis"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div>
          </div>
        </section>
        <section className="astrologer-analytics-panel astrologer-services-chart" aria-labelledby="services-mix-title">
          <div className="astrologer-analytics-heading"><h2 id="services-mix-title">CONSULTATION SERVICES MIX</h2></div>
          <div className="astrologer-donut" role="img" aria-label="Consultation services mix chart"><span /></div>
          <div className="astrologer-donut-legend"><span><i className="legend-call" />Instant Call</span><span><i className="legend-chat" />Instant Chat</span><span><i className="legend-text" />Text Answers</span><span><i className="legend-pooja" />Atonements</span></div>
        </section>
      </div>

    </div>
  )
}

function MetricCard({ label, value, note, tone }) {
  return <article className={`astrologer-metric-card astrologer-metric-card--${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
}

function InvitedPasswordPopup({ onComplete }) {
  const { currentUser, setInvitedAstrologerPassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = () => {
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (!/[0-9]/.test(password)) return setError('Password must include at least one number.')
    if (!/[^A-Za-z0-9]/.test(password)) return setError('Password must include at least one special character.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    try {
      setInvitedAstrologerPassword({ email: currentUser.email, name: currentUser.name, password })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your password.')
    }
  }

  return <div className="invited-password-overlay" role="dialog" aria-modal="true" aria-labelledby="invited-password-title"><div className="invited-password-modal"><div className="invited-password-modal__eyebrow">SECURE YOUR ACCOUNT</div><h2 id="invited-password-title">Set Your Password</h2><p>Create a password before continuing.</p><label><span>New Password</span><div className="invited-password-input"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /><button type="button" aria-label={showPassword ? 'Hide new password' : 'Show new password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><label><span>Confirm Password</span><div className="invited-password-input"><input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /><button type="button" aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'} onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{error && <p className="invited-password-error">{error}</p>}<button type="button" className="invited-password-button" onClick={handleSubmit}>Set Password</button></div></div>
}

function Section({ title, icon: Icon, subtitle, action, onNavigate, sectionClassName = '', children }) {
  const clickableProps = onNavigate
    ? {
        role: 'link',
        tabIndex: 0,
        onClick: (event) => {
          if (event.target.closest('a, button')) return
          onNavigate()
        },
        onKeyDown: (event) => {
          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            onNavigate()
          }
        },
      }
    : {}
  return (
    <div className={`section${onNavigate ? ' adash-section--clickable' : ''}${sectionClassName ? ` ${sectionClassName}` : ''}`} {...clickableProps}>
      {title && (
        <div className="section-title">
          <span className="flex items-center gap-2.5">
            {Icon && <Icon size={20} />}
            {title}
          </span>
          {action && <span className="ml-auto">{action}</span>}
        </div>
      )}
      {subtitle && <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>{subtitle}</div>}
      {children}
    </div>
  )
}
