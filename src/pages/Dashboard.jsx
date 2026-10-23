import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Megaphone,
  MessageCircleReply,
  MessageCircle,
  ArrowUp,
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
import { useAppData } from '../state/AppDataContext.jsx'
import {
  filterCampaignsByStatus,
  getCampaignAllocation,
  getCampaignDisplayStatus,
  getCampaignQuestionTypes,
  getCampaignUsed,
  getMonthKeyFromDate,
} from '../utils/questions.js'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { useGlobalHeaderActions } from '../contexts/GlobalHeaderActionsContext.jsx'

// Card look (icon + thumb tint) keyed off the campaign topic; purely presentational.
const CAMPAIGN_CARD_STYLES = [
  { match: /health|well|medical/i, Icon: HeartPulse, thumb: 'adash-thumb--health' },
  { match: /love|marriage|relationship|family/i, Icon: HeartHandshake, thumb: 'adash-thumb--love' },
  { match: /career|finance|business|job|money/i, Icon: TrendingUp, thumb: 'adash-thumb--career' },
  { match: /./, Icon: Orbit, thumb: 'adash-thumb--planetary' },
]
const DASHBOARD_CAMPAIGN_LIMIT = 4

export default function Dashboard() {
  const { astrologerServices, actions, campaigns, appointments } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const globalHeader = useGlobalHeaderActions()

  // The welcome panel hosts the global actions, so the layout must not render
  // its own fallback topbar on this route.
  useEffect(() => {
    if (globalHeader?.setHasPageHeader) {
      globalHeader.setHasPageHeader(true)
      return () => globalHeader.setHasPageHeader(false)
    }
  }, [globalHeader])

  // Same source and rules as Text-Based Questions → Campaigns (current month, "All"), so both always agree.
  const showcaseCampaigns = useMemo(() => {
    const now = new Date()
    const monthKey = getMonthKeyFromDate(now)
    return filterCampaignsByStatus(campaigns, 'All', monthKey, now)
      .slice(0, DASHBOARD_CAMPAIGN_LIMIT)
      .map((campaign, index) => {
        const label = `${campaign.name || ''} ${campaign.category || ''} ${campaign.categories?.[0]?.name || ''}`
        const look = CAMPAIGN_CARD_STYLES.find((style, i) => (i === CAMPAIGN_CARD_STYLES.length - 1 ? false : style.match.test(label))) || CAMPAIGN_CARD_STYLES[index % CAMPAIGN_CARD_STYLES.length]
        return {
          id: campaign.id,
          name: campaign.name,
          category: campaign.category || campaign.categories?.[0]?.name || getCampaignQuestionTypes(campaign).join(' · '),
          status: getCampaignDisplayStatus(campaign, monthKey, now.getTime()),
          sold: getCampaignUsed(campaign),
          target: getCampaignAllocation(campaign),
          Icon: look.Icon,
          thumb: look.thumb,
        }
      })
  }, [campaigns])
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
    { icon: MessageCircleReply, label: 'Answer Questions', route: routes.answerQuestion },
    { icon: CalendarDays, label: 'Manage Appointments', route: routes.appointments },
    { icon: Radio, label: 'Go Live', route: routes.liveSessionSetup },
    { icon: Wallet, label: 'View Earnings', route: routes.walletManagement },
    { icon: SlidersHorizontal, label: 'Profile Settings', route: routes.myAccount },
  ]

  const upcomingAppointments = useMemo(() => {
    const astrologerId = currentUser?.id || 'astrologer-demo'
    const now = Date.now()
    return appointments
      .filter((appointment) => {
        if (appointment.astrologerId !== astrologerId || /cancelled|completed|no-show|refunded/i.test(appointment.status || '')) return false
        const timestamp = new Date(`${appointment.dateIso || appointment.date}T${appointment.start || '00:00'}`).getTime()
        return Number.isFinite(timestamp) && timestamp >= now
      })
      .sort((a, b) => new Date(`${a.dateIso || a.date}T${a.start || '00:00'}`).getTime() - new Date(`${b.dateIso || b.date}T${b.start || '00:00'}`).getTime())
      .slice(0, 3)
  }, [appointments, currentUser?.id])

  return (
    <div>
      <div className="hero-banner hero-banner-user adash-hero">
        <div className="adash-hero-art" aria-hidden="true">
          <span className="adash-hero-ring adash-hero-ring--1" />
          <span className="adash-hero-ring adash-hero-ring--2" />
          <span className="adash-hero-ring adash-hero-ring--3" />
          <span className="adash-hero-core"><Sparkles size={26} strokeWidth={1.6} /></span>
        </div>
        <div className="adash-hero-layout">
          <div className="hero-banner-content">
            <div className="adash-hero-titlerow">
              <h2>Welcome back, {currentUser?.name || 'Kumar'} 👋</h2>
            </div>
            <p>Here&apos;s what&apos;s happening with your consultations and campaigns.</p>
          </div>
          <div className="adash-hero-controls">
            {globalHeader?.actions && (
              <div className="adash-hero-topbar-actions">
                {globalHeader.actions}
              </div>
            )}
            <div className="adash-hero-service-row">
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
                  <div
                    className="hero-services-menu"
                    role="menu"
                    aria-label="Service availability"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
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
            </div>
          </div>
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
        onNavigate={() => navigate(`${routes.textBasedQuestions}?view=campaigns`)}
        action={
          <Link
            to={`${routes.textBasedQuestions}?view=campaigns`}
            className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-[color:var(--primary)] transition-colors hover:text-[color:var(--primary-dark)] hover:underline"
          >
            View All →
          </Link>
        }
      >
        {!showcaseCampaigns.length && <p className="muted" style={{ margin: 0, fontSize: 14 }}>No campaigns yet. Use Create Campaign to add one.</p>}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {showcaseCampaigns.map((campaign) => {
            const pct = campaign.target ? Math.min(100, Math.round((campaign.sold / campaign.target) * 100)) : 0
            return (
              <article
                key={campaign.id}
                className="adash-campaign"
                role="link"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation()
                  navigate(routes.textBasedQuestions)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    navigate(routes.textBasedQuestions)
                  }
                }}
              >
                <div className={`adash-campaign-thumb ${campaign.thumb}`}>
                  <campaign.Icon size={42} strokeWidth={1.4} />
                  <span className="adash-campaign-status"><StatusBadge label={campaign.status} /></span>
                </div>
                <div className="adash-campaign-body">
                  <div className="adash-campaign-category">{campaign.category}</div>
                  <h3 className="adash-campaign-name">{campaign.name}</h3>
                  <div className="adash-campaign-sold">{campaign.sold} / {campaign.target} Questions Sold</div>
                  <CampaignMonthGraph campaignId={campaign.id} sold={campaign.sold} target={campaign.target} />
                  <div className="adash-campaign-track"><span style={{ width: `${pct}%` }} /></div>
                </div>
              </article>
            )
          })}
        </div>
      </Section>

      <Section
        title="Upcoming Appointments"
        icon={CalendarDays}
        subtitle="Your next three scheduled appointments"
      >
        <div className="adash-questions">
          {upcomingAppointments.length ? (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th className="adash-q-col-time">Date</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="adash-q-id">{appointment.id}</td>
                    <td>{appointment.customerName || appointment.userName || 'Customer'}</td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-[color:var(--primary)]" />
                        {appointment.type || 'Appointment'}
                      </span>
                    </td>
                    <td>{appointment.topic || appointment.category || 'Consultation'}</td>
                    <td><StatusBadge label={appointment.status || 'Booked'} className="!px-2 !py-0.5 !text-[11px]" /></td>
                    <td className="muted adash-q-col-time" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{appointment.date} · {appointment.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted" style={{ margin: 0, fontSize: 14 }}>No upcoming appointments.</p>}
          <Link to={routes.appointments} className="adash-q-more-link">
            Manage Appointments →
          </Link>
        </div>
      </Section>
    </div>
  )
}

function generateSmoothPath(values, width, height) {
  if (!values || values.length < 2) return `M 0 ${height}`
  const xStep = width / (values.length - 1)
  const points = values.map((value, index) => [
    index * xStep,
    height - (value / 100) * (height * 0.8) - (height * 0.1),
  ])
  let path = `M ${points[0][0]} ${points[0][1]}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index]
    const [x2, y2] = points[index + 1]
    const midX = (x1 + x2) / 2
    path += ` C ${midX},${y1} ${midX},${y2} ${x2},${y2}`
  }
  return path
}

function CampaignMonthGraph({ campaignId, sold, target }) {
  const linePathRef = useRef(null)
  const areaPathRef = useRef(null)
  const svgWidth = 150
  const svgHeight = 60
  const capacity = Number(target) || 1
  const progress = Math.min(Math.max((Number(sold) / capacity) * 100, 0), 100)
  const chartData = useMemo(() => [
    progress * 0.35,
    progress * 0.62,
    progress * 0.5,
    progress * 0.78,
    progress * 0.68,
    progress * 0.9,
    progress,
  ], [progress])
  const linePath = useMemo(() => generateSmoothPath(chartData, svgWidth, svgHeight), [chartData])
  const areaPath = useMemo(() => `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`, [linePath])
  const gradientId = `campaign-area-${String(campaignId || 'default').replace(/[^a-zA-Z0-9_-]/g, '-')}`

  useEffect(() => {
    const path = linePathRef.current
    const area = areaPathRef.current
    if (!path || !area || typeof path.getTotalLength !== 'function') return undefined
    const length = path.getTotalLength()
    path.style.transition = 'none'
    path.style.strokeDasharray = `${length} ${length}`
    path.style.strokeDashoffset = `${length}`
    area.style.transition = 'none'
    area.style.opacity = '0'
    path.getBoundingClientRect()
    path.style.transition = 'stroke-dashoffset 0.8s ease-in-out'
    path.style.strokeDashoffset = '0'
    area.style.transition = 'opacity 0.8s ease-in-out 0.2s'
    area.style.opacity = '1'
    return undefined
  }, [linePath])

  return (
    <div className="adash-campaign-month-graph">
      <div className="adash-campaign-month-graph__summary">
        <span>This Month</span>
        <strong>{Math.round(progress)}% {progress > 0 && <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" />}</strong>
        <b>{sold} sold</b>
      </div>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} role="img" aria-label={`One-month sales graph: ${sold} of ${target} questions sold`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="adash-campaign-month-graph__area" ref={areaPathRef} d={areaPath} fill={`url(#${gradientId})`} />
        <path className="adash-campaign-month-graph__line" ref={linePathRef} d={linePath} />
      </svg>
    </div>
  )
}

function Section({ title, icon: Icon, subtitle, action, onNavigate, children }) {
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
    <div className={`section${onNavigate ? ' adash-section--clickable' : ''}`} {...clickableProps}>
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
