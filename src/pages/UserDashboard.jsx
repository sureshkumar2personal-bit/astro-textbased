import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingBag,
  MessagesSquare,
  Clock3,
  Sparkles,
  MessageCircle,
  PhoneCall,
  CalendarDays,
  Radio,
  Users,
} from 'lucide-react'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { getHiddenUserActivityIds, getUserCommunicationActivity } from '../utils/memberCommunicationActivity.js'
import { getPublicAstrologers } from '../utils/publicAstrologerProfile.js'
import AstrologerCard from '../components/AstrologerCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

function formatActivityDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function truncateWords(value, limit = 5) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean)
  return words.length > limit ? `${words.slice(0, limit).join(' ')}…` : words.join(' ')
}

export default function UserDashboard() {
  const { currentUser } = useAuth()
  const { questions, consultationHistory, appointments, userWallet, astrologerLiveSessions, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()

  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !currentUser?.id) return
    initialized.current = true
    actions.markExpiredDiscountQuestions(currentUser.id)
    actions.renewMonthlyDiscountQuestions(currentUser.id)
  }, [currentUser?.id, actions])

  const recentActivities = useMemo(
    () => getUserCommunicationActivity({ questions, consultationHistory, appointments, walletTransactions: userWallet?.transactions, userId: currentUser?.id })
      .filter((activity) => !getHiddenUserActivityIds(currentUser?.id).includes(activity.id))
      .slice(0, 3),
    [appointments, consultationHistory, currentUser?.id, questions, userWallet?.transactions],
  )

  const upcomingAppointments = useMemo(
    () => appointments.filter((apt) => apt.status === 'Confirmed' || apt.status === 'Pending'),
    [appointments],
  )

  const liveSessions = useMemo(
    () => astrologerLiveSessions.filter((s) => s.status === 'Live now' || s.status === 'Upcoming').slice(0, 3),
    [astrologerLiveSessions],
  )

  const recommendedAstrologers = useMemo(() => {
    const requestedNames = ['Meera Desai', 'Ishita Sen', 'Aditi Menon', 'Bhavana Joshi']
    const displayOverrides = {
      'Meera Desai': { expertise: ['Love', 'Career', 'Personal Growth'], languages: ['English', 'Gujarati', 'Hindi'], followers: 2500, photo: '/astrologer-photos/dashboard-reference/meera-desai.png' },
      'Ishita Sen': { expertise: ['Career', 'Education', 'Timing'], languages: ['English', 'Bengali', 'Hindi'], followers: 2900, photo: '/astrologer-photos/dashboard-reference/ishita-sen.png' },
      'Aditi Menon': { expertise: ['Relationship', 'Confidence', 'Clarity'], languages: ['English', 'Malayalam', 'Hindi'], followers: 2100, photo: '/astrologer-photos/dashboard-reference/aditi-menon.png' },
      'Bhavana Joshi': { expertise: ['Career', 'Finance', 'Life Changes'], languages: ['English', 'Kannada', 'Hindi'], followers: 2500, photo: '/astrologer-photos/dashboard-reference/bhavana-j.png' },
    }
    const byName = new Map(getPublicAstrologers().map((astrologer) => [astrologer.name, astrologer]))
    return requestedNames
      .map((name) => byName.get(name))
      .filter(Boolean)
      .map((astrologer) => ({
        ...astrologer,
        ...displayOverrides[astrologer.name],
        name: astrologer.name === 'Bhavana Joshi' ? 'Bhavana J.' : astrologer.name,
      }))
  }, [])

  const handleViewAstrologer = (astrologerId) => navigate(`${routes.base}/astrologer/${astrologerId}?from=dashboard`)
  const handleCallAstrologer = (astrologerId) => navigate(`/call-booking/${astrologerId}?from=dashboard`)
  const handleChatAstrologer = (astrologerId) => navigate(`/chat-booking/${astrologerId}?from=dashboard`)

  return (
    <div className="user-dashboard-page">
      <div className="hero-banner hero-banner-user">
        <div className="hero-banner-content">
          <div className="page-eyebrow" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            User portal
          </div>
          <h2>Welcome back, {currentUser?.name || 'User'} 👋</h2>
          <p>Here's what's happening with your consultations and questions.</p>
        </div>
        <div className="hero-banner-cta">
          <button
            type="button"
            className="btn btn-primary hero-banner-button"
            onClick={() => navigate(routes.askQuestion, { state: { from: 'dashboard' } })}
          >
            Ask a Question
          </button>
        </div>
      </div>

      <Section title="Quick Actions" icon={Sparkles}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: MessagesSquare, label: 'Ask Question', route: routes.askQuestion, fromDashboard: true },
            { icon: CalendarDays, label: 'Book Appointment', route: routes.appointmentBook, fromDashboard: true },
            { icon: MessageCircle, label: 'Chat with Astrologer', route: routes.chatAstrologers, badge: '14 online' },
            { icon: PhoneCall, label: 'Call with Astrologer', route: routes.callAstrologers, badge: '14 online' },
            { icon: ShoppingBag, label: 'Purchase Package', route: routes.purchasePackage, fromDashboard: true },
            { icon: Radio, label: 'Join Live', route: routes.liveSession, fromDashboard: true },
          ].map(({ icon: Icon, label, route, badge, fromDashboard }) => (
            <button
              key={label}
              type="button"
              className="action-card action-card--compact"
              onClick={() => navigate(route, fromDashboard ? { state: { from: 'dashboard' } } : undefined)}
            >
              <div className="action-card-icon">
                <Icon size={20} />
              </div>
              <div className="action-card-body">
                <div className="action-card-title">{label}</div>
                {badge && <div className="action-card-desc">{badge}</div>}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {recommendedAstrologers.length > 0 && (
        <Section
          title="Recommended Astrologers"
          icon={Users}
          action={
            <Link to={routes.astrologers} className="text-sm font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary-dark)]">
              View All →
            </Link>
          }
        >
          <div className="dashboard-recommended-grid grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recommendedAstrologers.map((astrologer) => (
              <div
                key={astrologer.id}
                role="button"
                tabIndex={0}
                title={`View ${astrologer.name}'s profile`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleViewAstrologer(astrologer.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleViewAstrologer(astrologer.id)
                  }
                }}
              >
                <AstrologerCard astrologer={astrologer} onCall={handleCallAstrologer} onChat={handleChatAstrologer} />
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="section grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="section-title"><CalendarDays size={20} />Upcoming Appointments</div>
          {upcomingAppointments.length > 0 ? (
            <div className="activity-list">
              {upcomingAppointments.slice(0, 3).map((apt) => (
                <div
                  key={apt.id}
                  className="activity-row"
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  title={`View appointment ${apt.astrologer}`}
                  onClick={() => navigate(`${routes.myAppointments}?id=${encodeURIComponent(apt.id)}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`${routes.myAppointments}?id=${encodeURIComponent(apt.id)}`)
                    }
                  }}
                >
                  <div>
                    <div className="activity-id">{apt.astrologer}</div>
                    <div className="activity-meta">{apt.type} · {apt.date} · {apt.time}</div>
                  </div>
                  <StatusBadge label={apt.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ padding: '16px 0' }}>No upcoming appointments.</p>
          )}
          {upcomingAppointments.length > 3 && (
            <Link to={routes.myAppointments} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary-dark)]">
              See More →
            </Link>
          )}
        </div>

        <div>
          <div className="section-title"><Clock3 size={20} />Recent Activity</div>
          <div className="activity-list">
            {recentActivities.map((activity) => {
              const questionActivity = activity.type === 'question' || activity.type === 'answer' || activity.type === 'dispute'
              const activityTarget = questionActivity
                ? `${routes.askQuestion}?viewQuestionId=${encodeURIComponent(activity.metadata)}`
                : routes.activity
              return (
              <div
                key={activity.id}
                className="activity-row"
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                title={questionActivity ? 'View question activity' : 'View all activity'}
                onClick={() => navigate(activityTarget)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(activityTarget)
                  }
                }}
                >
                <div>
                  <div className="activity-id">{truncateWords(activity.title)}</div>
                  <div className="activity-meta activity-meta--compact">{truncateWords(activity.summary || 'Activity recorded.')} · {formatActivityDate(activity.occurredAt)}</div>
                </div>
                <StatusBadge label={activity.status || 'Recorded'} />
              </div>
              )
            })}
          </div>
          {recentActivities.length > 0 && (
            <Link to={routes.activity} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary-dark)]">
              See More →
            </Link>
          )}
        </div>
      </div>

      {liveSessions.length > 0 && (
        <Section title="Live Now" icon={Radio}>
          <div className="activity-list">
            {liveSessions.map((session) => (
              <div key={session.id} className="activity-row">
                <div>
                  <div className="activity-id">{session.title}</div>
                  <div className="activity-meta">{session.astrologer} · {session.time}</div>
                </div>
                <StatusBadge label={session.status} />
              </div>
            ))}
          </div>
        </Section>
      )}

      </div>
  )
}

function Section({ title, icon: Icon, action, children }) {
  return (
    <div className="section">
      {title && (
        <div className="section-title">
          <span className="flex items-center gap-2.5">
            {Icon && <Icon size={20} />}
            {title}
          </span>
          {action && <span className="ml-auto">{action}</span>}
        </div>
      )}
      {children}
    </div>
  )
}
