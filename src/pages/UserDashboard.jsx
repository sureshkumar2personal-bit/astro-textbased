import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, CalendarDays, Check, CircleHelp, Clock3, Compass, Gem,
  History, MessageCircle, Moon, Radio, Sparkles, Star, Sun,
} from 'lucide-react'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { getHiddenUserActivityIds, getUserCommunicationActivity } from '../utils/memberCommunicationActivity.js'
import { getPublicAstrologers } from '../utils/publicAstrologerProfile.js'
import AstrologerCard from '../components/AstrologerCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useInstantCall } from '../state/InstantCallContext.jsx'

function formatActivityDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function truncateWords(value, limit = 8) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean)
  return words.length > limit ? `${words.slice(0, limit).join(' ')}…` : words.join(' ')
}

function displayDate() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())
}

function signName(user) {
  return String(user?.rasi || 'Rashi').replace(/\s*\([^)]*\)/, '')
}

function zodiacGlyph(user) {
  const normalized = signName(user).toLowerCase()
  const glyphs = { mesham: '♈', aries: '♈', rishabam: '♉', taurus: '♉', mithunam: '♊', gemini: '♊', kadakam: '♋', cancer: '♋', simham: '♌', leo: '♌', kanni: '♍', virgo: '♍', thulam: '♎', libra: '♎', vrischikam: '♏', scorpio: '♏', dhanusu: '♐', sagittarius: '♐', makaram: '♑', capricorn: '♑', kumbham: '♒', aquarius: '♒', meenam: '♓', pisces: '♓' }
  return glyphs[normalized] || '✦'
}

export default function UserDashboard() {
  const { currentUser } = useAuth()
  const { openInstantCall, openInstantChat } = useInstantCall()
  const { questions, consultationHistory, appointments, userWallet, astrologerLiveSessions, atonements, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !currentUser?.id) return
    initialized.current = true
    actions.markExpiredDiscountQuestions(currentUser.id)
    actions.renewMonthlyDiscountQuestions(currentUser.id)
  }, [currentUser?.id, actions])

  const recentActivities = useMemo(() => getUserCommunicationActivity({ questions, consultationHistory, appointments, walletTransactions: userWallet?.transactions, userId: currentUser?.id })
    .filter((activity) => !getHiddenUserActivityIds(currentUser?.id).includes(activity.id)).slice(0, 3), [appointments, consultationHistory, currentUser?.id, questions, userWallet?.transactions])
  const upcomingAppointments = useMemo(() => appointments.filter((apt) => apt.status === 'Confirmed' || apt.status === 'Pending'), [appointments])
  const liveSessions = useMemo(() => astrologerLiveSessions.filter((session) => session.status === 'Live now' || session.status === 'Upcoming').slice(0, 3), [astrologerLiveSessions])
  const userAtonementEvents = useMemo(() => atonements.filter((item) => (!item.userId || item.userId === currentUser?.id) && !/gemstone/i.test(item.title || item.name || '')).slice(0, 1), [atonements, currentUser?.id])
  const recommendedAstrologers = useMemo(() => {
    const preferred = ['Meera Desai', 'Ishita Sen', 'Aditi Menon', 'Bhavana Joshi']
    const byName = new Map(getPublicAstrologers().map((astrologer) => [astrologer.name, astrologer]))
    return preferred.map((name) => byName.get(name)).filter(Boolean).slice(0, 3)
  }, [])

  const handleViewAstrologer = (id) => navigate(`${routes.base}/astrologer/${id}?from=dashboard`)
  const horoscopeText = truncateWords(currentUser?.horoscopeDetails || '', 28)
  const horoscopeTitle = currentUser?.horoscopeTitle || signName(currentUser)

  return (
    <div className="user-dashboard-page">
      <section className="dashboard-welcome-banner">
        <div><span className="dashboard-eyebrow">JUPITER TRANSIT FAVORABILITY: <strong>88%</strong></span><h1>Welcome, <em>{currentUser?.name || 'Priya V.'}</em> 🙏</h1></div>
        <div className="dashboard-diya" aria-hidden="true">🪔</div>
      </section>

      <div className="dashboard-info-grid">
        <section className="dashboard-card panchang-card"><CardHeading icon={Sun} title="Today's Panchang" /><p className="dashboard-date">{displayDate()}</p><div className="panchang-grid"><InfoTile label="Tithi" value="Shukla Ekadashi" icon={Moon} /><InfoTile label="Nakshatra" value={currentUser?.nakshatra || 'Rohini'} icon={Star} /><InfoTile label="Shubh Muhurat" value="11:45 AM – 12:30 PM" icon={Check} /><InfoTile label="Rahukalam" value="01:30 PM – 03:00 PM" icon={Clock3} /></div></section>
        <section className="dashboard-card lucky-card"><CardHeading icon={Sparkles} title="Lucky Indicators" /><span className="dashboard-card-corner-label">{signName(currentUser)} Zodiac</span><div className="lucky-list"><span><i className="dot dot-yellow" />Auspicious Color <b>Golden Yellow</b></span><span><i className="dot dot-orange" />Lucky Numbers <b>3, 7, 9</b></span><span><i className="dot dot-blue" />Favorable Direction <b>North-East</b></span></div></section>
        <section className="dashboard-card advice-card"><CardHeading icon={Compass} title="Daily Advice" /><span className="dashboard-label">TODAY'S HOROSCOPE</span><div className="advice-sign"><span className="advice-orb">{zodiacGlyph(currentUser)}</span><div><strong>{horoscopeTitle}</strong><p>{horoscopeText}</p></div></div><button type="button" className="dashboard-outline-button" onClick={() => navigate(routes.rewards)}>Read Full Horoscope <ArrowRight size={15} /></button></section>
      </div>

      <DashboardSection title="Quick Actions" icon={Sparkles}>
        <div className="quick-actions-grid">
          <QuickAction icon={MessageCircle} tone="green" title="Instant Chat" subtitle="Live Chart & Chat (60s)" onClick={() => navigate('/user/instantchat')} />
          <QuickAction icon={CircleHelp} tone="purple" title="Ask a Question" subtitle="Detailed Text Reply" onClick={() => navigate(routes.askQuestion, { state: { from: 'dashboard' } })} />
          <QuickAction icon={Gem} tone="orange" title="Remedies (Atonement)" subtitle="Pooja" onClick={() => navigate(`${routes.base}/atonements`)} />
          <QuickAction icon={CalendarDays} tone="blue" title="Schedule Slot" subtitle="Book Specific Time" onClick={() => navigate(routes.appointmentBook, { state: { from: 'dashboard' } })} />
        </div>
      </DashboardSection>

      {recommendedAstrologers.length > 0 && <DashboardSection title="TOP RECOMMENDED ASTROLOGERS" subtitle="Verified experts ready to guide your spiritual journey" action={<Link to={routes.astrologers}>View All (42) <ArrowRight size={14} /></Link>}>
        <div className="dashboard-recommended-grid">{recommendedAstrologers.map((astrologer) => <div key={astrologer.id} role="button" tabIndex={0} onClick={() => handleViewAstrologer(astrologer.id)} onKeyDown={(event) => { if (event.key === 'Enter') handleViewAstrologer(astrologer.id) }}><AstrologerCard astrologer={astrologer} onCall={(id) => openInstantCall(id)} onChat={(id) => openInstantChat(id)} /></div>)}</div>
      </DashboardSection>}

      <div className="dashboard-bottom-grid">
        <DashboardSection title="Upcoming Schedule & Atonements" icon={CalendarDays} subtitle="Next 3 Events" action={<Link to={routes.myAppointments}>View All <ArrowRight size={14} /></Link>}>
          <div className="dashboard-event-list">{upcomingAppointments.slice(0, 1).map((apt) => <EventRow key={apt.id} date={apt.date} title={apt.type || 'Career Alignment Consultation'} detail={apt.astrologer} meta={`${apt.time || '04:30 PM'} · ${apt.duration || 30} Mins`} status={apt.status} onClick={() => navigate(`${routes.myAppointments}?id=${encodeURIComponent(apt.id)}`)} />)}{userAtonementEvents.map((item) => <EventRow key={item.id} date={item.startDate || item.date || '—'} title={item.title || item.name || 'Atonement'} detail={item.serviceName || 'Temple Stream & Prasad Dispatch'} meta="Remedy" status="Remedy" />)}{liveSessions.slice(0, 1).map((session) => <EventRow key={session.id} date="LIVE" title={`Live Session – ${session.title}`} detail={session.astrologer || 'Planetary Transit Insights'} meta={session.time || 'Join the live session'} status="LIVE" />)}{!upcomingAppointments.length && !userAtonementEvents.length && !liveSessions.length && <p className="dashboard-empty">No upcoming events.</p>}</div>
        </DashboardSection>
        <DashboardSection title="Recent Activity Log" icon={History} action={<Link to={routes.activity}>Full History <ArrowRight size={14} /></Link>}>
          <div className="dashboard-activity-list">{recentActivities.map((activity) => { const questionActivity = ['question', 'answer', 'dispute'].includes(activity.type); const target = questionActivity ? `${routes.askQuestion}?viewQuestionId=${encodeURIComponent(activity.metadata)}` : routes.activity; return <div key={activity.id} className="dashboard-activity-row" role="button" tabIndex={0} onClick={() => navigate(target)}><span className="activity-icon"><Clock3 size={15} /></span><div><strong>{truncateWords(activity.title)}</strong><p>{truncateWords(activity.summary || 'Activity recorded.')}</p></div><time>{formatActivityDate(activity.occurredAt)}</time></div> })}</div>
        </DashboardSection>
      </div>
    </div>
  )
}

function CardHeading({ icon: Icon, title }) { return <div className="dashboard-card-heading"><span className="dashboard-icon"><Icon size={17} /></span><h2>{title}</h2></div> }
function InfoTile({ icon: Icon, label, value }) { return <div className="panchang-tile"><Icon size={15} /><small>{label}</small><strong>{value}</strong></div> }
function QuickAction({ icon: Icon, tone, title, subtitle, onClick }) { return <button type="button" className={`quick-action quick-action--${tone}`} onClick={onClick}><span className="quick-action-icon"><Icon size={20} /></span><span><strong>{title}</strong><small>{subtitle}</small></span><ArrowRight size={15} /></button> }
function DashboardSection({ title, subtitle, icon: Icon, action, children }) { return <section className="dashboard-section"><div className="dashboard-section-heading"><div>{Icon && <span className="section-heading-icon"><Icon size={16} /></span>}<div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>{action}</div>{children}</section> }
function EventRow({ date, title, detail, meta, status, onClick }) { return <div className="dashboard-event-row" role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick}><span className={`event-date ${date === 'LIVE' ? 'is-live' : ''}`}>{date === 'LIVE' ? <Radio size={14} /> : String(date || '—').split(' ').slice(0, 2).join(' ')}</span><div><strong>{title}</strong><p>{detail}</p><small>{meta}</small></div><StatusBadge label={status || 'Scheduled'} /></div> }
