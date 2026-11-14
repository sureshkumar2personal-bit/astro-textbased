import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { getInstantConsultation, getInstantConsultations, subscribeToInstantConsultations, updateInstantConsultation } from '../utils/instantConsultation.js'
import { SIGNS, computeChart } from '../utils/vedicChart.js'
import { WeeklyTrendChart, ServicesDonut } from '../components/astrologer/AnalyticsCharts.jsx'
import { buildServiceMix, buildWeeklyTrend } from '../utils/dashboardAnalytics.js'
import { useAppData } from '../state/AppDataContext.jsx'
import LiveConsultationWorkspace from './astrologer/consultation/LiveConsultationWorkspace.jsx'

const GREETING_PERIODS = {
  morning: {
    greeting: 'GOOD MORNING',
    quotes: [
      'The stars impel, they do not compel. Guide your seekers with wisdom today.',
      'A new dawn brings a new chart to read, and a new heart to guide.',
      'Begin the day with clarity; the planets favour a calm and focused mind.',
    ],
  },
  afternoon: {
    greeting: 'GOOD AFTERNOON',
    quotes: [
      'Every chart carries a story, and every choice can shape the next chapter.',
      'Let intuition guide the question, and wisdom guide the answer.',
      'Steady guidance at midday can turn a seeker\u2019s doubt into direction.',
    ],
  },
  evening: {
    greeting: 'GOOD EVENING',
    quotes: [
      'As the sky darkens, the stars reveal what daylight cannot.',
      'Reflect on today\u2019s guidance; the planets reward patience and compassion.',
      'Twilight is the hour when insight speaks softly and truth is heard clearly.',
    ],
  },
  night: {
    greeting: 'GOOD NIGHT',
    quotes: [
      'The night sky holds every answer for those who learn to look up.',
      'Rest well; the stars keep watch over every seeker you guided today.',
      'In the quiet of night, the cosmos whispers what the day was too busy to hear.',
    ],
  },
}

function getGreetingPeriod(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

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
  const [greetingPeriod, setGreetingPeriod] = useState(() => getGreetingPeriod())
  const [instantConsultations, setInstantConsultations] = useState([])
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const { hash, key: locationKey } = useLocation()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id

  useEffect(() => {
    const refreshConsultations = () => {
      const now = Date.now()
      const consultations = getInstantConsultations()
      consultations
        .filter((request) => request.type === 'call' && request.status === 'ringing' && !request.isSimulated && now - new Date(request.createdAt).getTime() >= INCOMING_CALL_TIMEOUT_MS)
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

  // Demo/dev test request (flagged isTestRequest, local to this browser, never synced). The Vercel host is a
  // demo site, so this also runs there; set VITE_DEMO_MODE=false to turn it off. See docs/DEMO_DEPLOYMENT.md.
  // Remove with `window.clearTestIncomingCall()` in the console, or delete src/dev and this effect.
  useEffect(() => {
    if (!import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'false') return
    import('../dev/testIncomingCall.js').then((module) => {
      module.seedTestIncomingCall(astrologerId)
    })
  }, [astrologerId])

  const pendingCallRequests = instantConsultations.filter((request) => (
    request.astrologerId === astrologerId
    && request.type === 'call'
    && request.status === 'ringing'
    && (request.isSimulated || Date.now() - new Date(request.createdAt).getTime() < INCOMING_CALL_TIMEOUT_MS)
  ))
  const { questions: allQuestions, consultations: allConsultations, atonements: allAtonements } = useAppData()
  const analyticsSources = { instant: instantConsultations, consultations: allConsultations, questions: allQuestions, astrologerId }
  const weeklyTrend = buildWeeklyTrend(analyticsSources)
  const serviceMix = buildServiceMix({ ...analyticsSources, atonements: allAtonements })
  const activeCallSession = instantConsultations.find((request) => (
    request.astrologerId === astrologerId
    && request.type === 'call'
    && request.status === 'accepted'
  )) || null

  // Re-read the stored request so a request that was already accepted, declined, cancelled or
  // expired can never be accepted (or declined) a second time.
  const acceptCall = (requestId) => {
    const latest = getInstantConsultation(requestId)
    if (!latest || latest.status !== 'ringing') return
    updateInstantConsultation(requestId, { status: 'accepted', startedAt: new Date().toISOString() })
  }
  const declineCall = (requestId) => {
    const latest = getInstantConsultation(requestId)
    if (!latest || latest.status !== 'ringing') return
    updateInstantConsultation(requestId, { status: 'rejected', rejectedAt: new Date().toISOString() })
  }

  const quickActions = [
    { icon: Sparkles, label: 'Answer a Question', route: routes.textBasedQuestions, accent: 'orange' },
    { icon: Flame, label: 'Remedy Process', route: routes.atonement, accent: 'purple' },
    { icon: Radio, label: 'Schedule Live', route: routes.liveSessionSetup, accent: 'rose' },
    { icon: CalendarDays, label: 'Appointment', route: routes.appointments, accent: 'blue' },
    { icon: MessageCircle, label: 'Disputes', route: routes.disputeManagement, accent: 'red' },
  ]

  useEffect(() => {
    // Sidebar "Quick Actions" opens /astrologer#quick-actions: scroll to that section.
    if (hash !== '#quick-actions') return undefined
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('quick-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [hash, locationKey])

  useEffect(() => {
    const updatePeriod = () => {
      const next = getGreetingPeriod()
      setGreetingPeriod((current) => {
        if (current !== next) setGreetingQuoteIndex(0)
        return next
      })
    }
    const timer = setInterval(updatePeriod, 30 * 1000)
    document.addEventListener('visibilitychange', updatePeriod)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', updatePeriod)
    }
  }, [])

  useEffect(() => {
    // Preload alternate theme banner for instant theme switching
    const preloader = new Image()
    preloader.src = isDark ? '/golden-temple-sunset-banner.png' : '/golden-temple-sunset-banner-dark.png'
  }, [isDark])

  const greetingQuotes = GREETING_PERIODS[greetingPeriod].quotes

  return (
    <div>
      {showInvitedPasswordPopup && <InvitedPasswordPopup onComplete={() => setShowInvitedPasswordPopup(false)} />}
      <header className="astrologer-greeting-header">
        <div className="astrologer-greeting-header__mandala" aria-hidden="true" />
        <div className="astrologer-greeting-header__temple" aria-hidden="true" />
        <h1>{GREETING_PERIODS[greetingPeriod].greeting}, {(currentUser?.name || 'Acharya Gurudev').toUpperCase()}! <span aria-hidden="true">✨</span></h1>
        <p><strong>“</strong> <em>{greetingQuotes[greetingQuoteIndex % greetingQuotes.length]}</em> <button type="button" aria-label="Show another greeting" title="Show another greeting" onClick={() => setGreetingQuoteIndex((index) => (index + 1) % greetingQuotes.length)}><RefreshCw size={18} aria-hidden="true" /></button></p>
      </header>
      {pendingCallRequests.length > 0 && (
        <section className="astrologer-consultation-queue" aria-labelledby="consultation-queue-title">
          <div className="astrologer-queue-heading">
            <span id="consultation-queue-title">● LIVE CONSULTATION REQUEST QUEUE</span>
            <small>{pendingCallRequests.length} Incoming Call{pendingCallRequests.length === 1 ? '' : 's'}</small>
          </div>
          {pendingCallRequests.map((request) => {
            // Rashi / Nakshatra are calculated from the caller's real birth details (not stored on the request).
            const queueChart = request.birthDetails ? computeChart(request.birthDetails) : null
            const moon = queueChart?.ok ? queueChart.planets.find((planet) => planet.key === 'moon') : null
            const rashi = moon ? `Rashi: ${SIGNS[moon.sign].sa}` : requestBirthDetail(request, 'rashi', 'rashiName', 'sign')
            const nakshatra = moon ? `Nakshatra: ${moon.nakshatraName}` : requestBirthDetail(request, 'nakshatra', 'nakshatraName')
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
                  <button type="button" className="astrologer-queue-decline" onClick={() => declineCall(request.id)}>Decline</button>
                  <button type="button" className="astrologer-queue-accept" onClick={() => acceptCall(request.id)}>Accept Call (₹{request.pricePerMinute || 0}/min)</button>
                </div>
              </div>
            )
          })}
        </section>
      )}
      {activeCallSession && <LiveConsultationWorkspace key={activeCallSession.id} session={activeCallSession} />}
      <Section id="quick-actions" title="Quick Actions" icon={Zap} sectionClassName="adash-quick-actions-section">
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
        <MetricCard label="Consultations" value="28 Sessions" breakdown={[['Chat', 16], ['Call', 10], ['Appointments', 3], ['Questions', 4]]} tone="blue" />
        <MetricCard label="Avg Rating" value="4.94 ★" note="From 520 reviews" tone="purple" />
        <MetricCard label="Active Talk Time" value="4h 12m" note="Avg 14 mins / call" tone="cyan" />
        <MetricCard label="Pending Questions" value="4 Queries" note="Requires attention" tone="rose" />
      </div>

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
          <WeeklyTrendChart days={weeklyTrend} />
        </section>
        <section className="astrologer-analytics-panel astrologer-services-chart" aria-labelledby="services-mix-title">
          <div className="astrologer-analytics-heading"><h2 id="services-mix-title">CONSULTATION SERVICES MIX</h2></div>
          <ServicesDonut segments={serviceMix} />
          <div className="astrologer-donut-legend"><span><i className="legend-call" />Instant Call</span><span><i className="legend-chat" />Instant Chat</span><span><i className="legend-text" />Text Answers</span><span><i className="legend-pooja" />Atonements</span></div>
        </section>
      </div>

    </div>
  )
}

function MetricCard({ label, value, note, breakdown, tone }) {
  return (
    <article className={`astrologer-metric-card astrologer-metric-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {breakdown ? (
        <small className="astrologer-metric-breakdown">
          {breakdown.map(([name, count]) => <span key={name}>{count} {name}</span>)}
        </small>
      ) : <small>{note}</small>}
    </article>
  )
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

function Section({ id, title, icon: Icon, subtitle, action, onNavigate, sectionClassName = '', children }) {
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
    <div id={id} className={`section${onNavigate ? ' adash-section--clickable' : ''}${sectionClassName ? ` ${sectionClassName}` : ''}`} {...clickableProps}>
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
