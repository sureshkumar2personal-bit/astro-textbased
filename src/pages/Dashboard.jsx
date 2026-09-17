import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Megaphone,
  MessageCircleReply,
  MessageCircleQuestion,
  MoreVertical,
  MessageCircle,
  PhoneCall,
  ChevronDown,
  CalendarDays,
  Radio,
  Wallet,
  SlidersHorizontal,
  Sparkles,
  HeartPulse,
  HeartHandshake,
  TrendingUp,
  Orbit,
  Zap,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import CreateCampaignModal from '../components/CreateCampaignModal.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const showcaseCampaigns = [
  { id: 'health-wellness', name: 'Health & Wellness', category: 'Vedic Astrology', status: 'Active', sold: 45, target: 100, Icon: HeartPulse, thumb: 'adash-thumb--health' },
  { id: 'love-relationship', name: 'Love & Relationship', category: 'Marriage Astrology', status: 'Active', sold: 32, target: 50, Icon: HeartHandshake, thumb: 'adash-thumb--love' },
  { id: 'career-finance', name: 'Career & Finance', category: 'Numerology', status: 'Active', sold: 20, target: 50, Icon: TrendingUp, thumb: 'adash-thumb--career' },
  { id: 'planetary-guidance', name: 'Planetary Guidance', category: 'General Astrology', status: 'Paused', sold: 10, target: 50, Icon: Orbit, thumb: 'adash-thumb--planetary' },
]

const recentQuestions = [
  { id: 'QTN-2026-000124', user: 'Kannan', category: 'Health', type: 'General', status: 'Pending', raised: '22-Jul-2026 01:15 PM' },
  { id: 'QTN-2026-000123', user: 'Priya V.', category: 'Health', type: 'Personal', status: 'In Progress', raised: '21-Jul-2026 10:30 AM' },
  { id: 'QTN-2026-001245', user: 'Priya V.', category: 'Health', type: 'Personal', status: 'Disputed', raised: '21-Jul-2026 10:30 AM' },
]

export default function Dashboard() {
  const { selectedCampaign, astrologerServices, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false)
  const serviceMenuRef = useRef(null)

  useEffect(() => {
    if (!serviceMenuOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!serviceMenuRef.current?.contains(event.target)) setServiceMenuOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setServiceMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [serviceMenuOpen])

  const quickActions = [
    { icon: Megaphone, label: 'Create Campaign', onClick: () => setCreateOpen(true) },
    { icon: MessageCircleReply, label: 'Answer Questions', route: routes.answerQuestion },
    { icon: CalendarDays, label: 'Manage Appointments', route: routes.appointments },
    { icon: Radio, label: 'Go Live', route: routes.liveSessionSetup },
    { icon: Wallet, label: 'View Earnings', route: routes.walletManagement },
    { icon: SlidersHorizontal, label: 'Profile Settings', route: routes.myAccount },
  ]

  return (
    <div>
      <div className="hero-banner hero-banner-user adash-hero">
        <div className="adash-hero-art" aria-hidden="true">
          <span className="adash-hero-ring adash-hero-ring--1" />
          <span className="adash-hero-ring adash-hero-ring--2" />
          <span className="adash-hero-ring adash-hero-ring--3" />
          <span className="adash-hero-core"><Sparkles size={26} strokeWidth={1.6} /></span>
        </div>
        <div className="hero-banner-content">
          <div className="page-eyebrow" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            Astrologer Portal
          </div>
          <h2>Welcome back, {currentUser?.name || 'Kumar'} 👋</h2>
          <p>Here&apos;s what&apos;s happening with your consultations and campaigns.</p>
        </div>
        <div className="hero-banner-cta adash-hero-cta">
          <div
            className="hero-services-summary"
            ref={serviceMenuRef}
            role="button"
            tabIndex={0}
            aria-label="Service availability"
            aria-expanded={serviceMenuOpen}
            aria-haspopup="menu"
            onClick={() => setServiceMenuOpen((open) => !open)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setServiceMenuOpen((open) => !open)
              }
            }}
          >
            <span className={`hero-services-status ${astrologerServices.available ? 'is-available' : 'is-unavailable'}`}>
              <span className={`service-status-dot${astrologerServices.available ? ' is-available' : ''}`} />
              {astrologerServices.dndEnabled ? 'Dyan / DND' : astrologerServices.isOnline ? 'Online' : 'Offline'}
            </span>
            {!astrologerServices.dndEnabled && (
              <span className="hero-services-modes" aria-label="Enabled service prices">
                {astrologerServices.chatAvailable && <span title="Chat"><MessageCircle size={13} /> ₹{astrologerServices.chatPricePerMinute}/min</span>}
                {astrologerServices.callAvailable && <span title="Call"><PhoneCall size={13} /> ₹{astrologerServices.callPricePerMinute}/min</span>}
              </span>
            )}
            <span className="hero-services-trigger" aria-hidden="true"><ChevronDown size={14} /></span>
            {serviceMenuOpen && (
              <div className="hero-services-menu" role="menu" aria-label="Service availability">
                <div className="hero-services-menu__heading">Service availability</div>
                <label className={`hero-service-option${astrologerServices.dndEnabled ? ' is-locked' : ''}`}>
                  <span>
                    <strong><MessageCircle size={14} /> Chat</strong>
                    <small>{astrologerServices.dndEnabled ? 'Paused' : astrologerServices.chatEnabled ? 'Enabled' : 'Disabled'}</small>
                  </span>
                  <input type="checkbox" checked={astrologerServices.chatEnabled} disabled={astrologerServices.dndEnabled} onChange={(event) => actions.updateAstrologerServices({ chatEnabled: event.target.checked })} aria-label="Enable chat" />
                  <span className="toggle-switch" />
                </label>
                <label className={`hero-service-option${astrologerServices.dndEnabled ? ' is-locked' : ''}`}>
                  <span>
                    <strong><PhoneCall size={14} /> Call</strong>
                    <small>{astrologerServices.dndEnabled ? 'Paused' : astrologerServices.callEnabled ? 'Enabled' : 'Disabled'}</small>
                  </span>
                  <input type="checkbox" checked={astrologerServices.callEnabled} disabled={astrologerServices.dndEnabled} onChange={(event) => actions.updateAstrologerServices({ callEnabled: event.target.checked })} aria-label="Enable call" />
                  <span className="toggle-switch" />
                </label>
                <label className="hero-service-option hero-service-option--dnd">
                  <span>
                    <strong>Dyan / DND</strong>
                    <small>{astrologerServices.dndEnabled ? 'All services paused' : 'Pause all services'}</small>
                  </span>
                  <input type="checkbox" checked={astrologerServices.dndEnabled} onChange={(event) => actions.updateAstrologerServices({ dndEnabled: event.target.checked })} aria-label="Enable Dyan or DND" />
                  <span className="toggle-switch" />
                </label>
              </div>
            )}
          </div>
          <button type="button" className="btn btn-primary hero-banner-button" onClick={() => navigate(routes.appointmentSchedule)}>
            Set Availability
          </button>
        </div>
      </div>

      <Section title="Quick Actions" icon={Zap}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map(({ icon: Icon, label, route, onClick }) => (
            <button
              key={label}
              type="button"
              className="action-card action-card--compact"
              onClick={() => (onClick ? onClick() : route && navigate(route))}
            >
              <div className="action-card-icon"><Icon size={20} /></div>
              <div className="action-card-body"><div className="action-card-title">{label}</div></div>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Your Campaigns"
        icon={Megaphone}
        action={
          <Link to={routes.campaigns} className="text-sm font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary-dark)]">
            View All →
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {showcaseCampaigns.map((campaign) => {
            const pct = Math.min(100, Math.round((campaign.sold / campaign.target) * 100))
            return (
              <article key={campaign.id} className="adash-campaign">
                <div className={`adash-campaign-thumb ${campaign.thumb}`}>
                  <campaign.Icon size={42} strokeWidth={1.4} />
                  <span className="adash-campaign-status"><StatusBadge label={campaign.status} /></span>
                </div>
                <div className="adash-campaign-body">
                  <div className="adash-campaign-category">{campaign.category}</div>
                  <h3 className="adash-campaign-name">{campaign.name}</h3>
                  <div className="adash-campaign-sold">{campaign.sold} / {campaign.target} Questions Sold</div>
                  <div className="adash-campaign-track"><span style={{ width: `${pct}%` }} /></div>
                  <div className="adash-campaign-actions">
                    <button type="button" className="adash-campaign-btn" onClick={() => navigate(`${routes.campaigns}?campaignId=${encodeURIComponent(campaign.id)}`)}>View</button>
                    <button type="button" className="adash-campaign-btn adash-campaign-btn--primary" onClick={() => navigate(routes.campaigns)}>Manage</button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </Section>

      <Section
        title="Recent Questions"
        icon={MessageCircleQuestion}
        subtitle="Latest questions raised by users"
      >
        <div className="adash-questions">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Category</th>
                <th className="adash-q-col-type">Type</th>
                <th>Status</th>
                <th className="adash-q-col-time">Raised</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {recentQuestions.map((question) => {
                const action = question.status === 'Disputed'
                  ? { label: 'Resolve', to: `${routes.disputeManagement}?questionId=${encodeURIComponent(question.id)}` }
                  : { label: question.status === 'Pending' ? 'Open' : 'View', to: `${routes.answerQuestion}?questionId=${encodeURIComponent(question.id)}` }
                return (
                  <tr key={question.id}>
                    <td className="adash-q-id">{question.id}</td>
                    <td>{question.user}</td>
                    <td>{question.category}</td>
                    <td className="adash-q-col-type">{question.type}</td>
                    <td><StatusBadge label={question.status} className="!px-2 !py-0.5 !text-[11px]" /></td>
                    <td className="muted adash-q-col-time" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{question.raised}</td>
                    <td>
                      <div className="adash-q-actions">
                        <button type="button" className="adash-q-btn" onClick={() => navigate(action.to)}>{action.label}</button>
                        <button type="button" className="adash-q-more" aria-label={`More options for ${question.id}`}><MoreVertical size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Link to={routes.answerQuestion} className="adash-q-more-link">
            View More Questions →
          </Link>
        </div>
      </Section>

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} defaultTotalLimit={selectedCampaign?.totalLimit || 30} />
    </div>
  )
}

function Section({ title, icon: Icon, subtitle, action, children }) {
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
      {subtitle && <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>{subtitle}</div>}
      {children}
    </div>
  )
}