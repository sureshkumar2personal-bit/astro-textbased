import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Megaphone,
  MessageCircleReply,
  MessageCircle,
  ArrowUp,
  PhoneCall,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Radio,
  Wallet,
  SlidersHorizontal,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import FlipButton from '../components/ui/flip-button.jsx'
import TiltCard from '../components/ui/tilt-card.tsx'
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

// Card look (icon + thumb tint) keyed off the campaign topic; purely presentational.
const CAMPAIGN_CARD_STYLES = [
  { match: /love|marriage|relationship|family/i, image: '/campaigns/marriage-rings-reference.png', thumb: 'adash-thumb--love' },
  { match: /health|well|medical/i, image: '/campaigns/health.png', thumb: 'adash-thumb--health' },
  { match: /career|finance|business|job|money/i, image: '/campaigns/career.png', thumb: 'adash-thumb--career' },
  { match: /education|study|school|learning/i, image: '/campaigns/education.png', thumb: 'adash-thumb--education' },
  { match: /./, image: '/campaigns/education-books.png', thumb: 'adash-thumb--education' },
]
const DASHBOARD_CAMPAIGN_LIMIT = 4

export default function Dashboard() {
  const { astrologerServices, actions, campaigns, appointments } = useAppData()
  const { currentUser } = useAuth()
  const [showInvitedPasswordPopup, setShowInvitedPasswordPopup] = useState(Boolean(currentUser?.requiresPasswordSetup))
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
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
          // Dashboard presentation requested: these two showcase cards are active.
          status: /career|education|study/i.test(label)
            ? 'Active'
            : getCampaignDisplayStatus(campaign, monthKey, now.getTime()),
          sold: getCampaignUsed(campaign),
          target: getCampaignAllocation(campaign),
          image: look.image,
          thumb: look.thumb,
        }
      })
  }, [campaigns])
  const quickActions = [
    { icon: MessageCircleReply, label: 'Answer Questions', route: routes.textBasedQuestions, accent: 'orange' },
    { icon: CalendarDays, label: 'Manage Appointments', route: routes.appointments, accent: 'red' },
    { icon: Radio, label: 'Go Live', route: routes.liveSessionSetup, accent: 'rose' },
    { icon: Wallet, label: 'View Earnings', route: routes.walletManagement, accent: 'amber' },
    { icon: SlidersHorizontal, label: 'Profile Settings', route: routes.myAccount, accent: 'purple' },
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
      {showInvitedPasswordPopup && <InvitedPasswordPopup onComplete={() => setShowInvitedPasswordPopup(false)} />}
      <div className="astrologer-top-hero-image">
        <img
          src="/golden-temple-sunset-banner.png"
          alt="Golden temple at sunset beside a peaceful lake"
        />
        <div className="astrologer-top-hero-image__services">
          <h1>Stay Connected with Your Followers</h1>
          <p>Enable instant call or chat to be available for real time consultations.</p>
          <div className="adash-hero-service-cards" aria-label="Instant services">
            <ServiceToggleCard
              icon={PhoneCall}
              label="Instant Call"
              description="Receive instant calls"
              enabled={astrologerServices.callEnabled && !astrologerServices.dndEnabled}
              onToggle={() => actions.updateAstrologerServices({ callEnabled: !astrologerServices.callEnabled, ...(astrologerServices.dndEnabled ? { dndEnabled: false } : {}) })}
            />
            <ServiceToggleCard
              icon={MessageCircle}
              label="Instant Chat"
              description="Receive instant chats"
              enabled={astrologerServices.chatEnabled && !astrologerServices.dndEnabled}
              onToggle={() => actions.updateAstrologerServices({ chatEnabled: !astrologerServices.chatEnabled, ...(astrologerServices.dndEnabled ? { dndEnabled: false } : {}) })}
            />
          </div>
        </div>
      </div>
      <Section title="Quick Actions" icon={Zap}>
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

      <Section
        title="Your Campaigns"
        icon={Megaphone}
        sectionClassName="adash-campaigns-section"
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
        <div className="adash-campaign-carousel" aria-label="Your campaigns">
          <div className="adash-campaign-carousel__track">
            {[false, true].map((isClone) => (
              <div className={`adash-campaign-carousel__set${isClone ? ' adash-campaign-carousel__set--clone' : ''}`} key={isClone ? 'campaigns-clone' : 'campaigns'} aria-hidden={isClone || undefined}>
                {showcaseCampaigns.map((campaign) => {
                  const pct = campaign.target ? Math.min(100, Math.round((campaign.sold / campaign.target) * 100)) : 0
                  return (
                    <article
                      key={`${isClone ? 'clone-' : ''}${campaign.id}`}
                      className={`adash-campaign${isClone ? ' adash-campaign--clone' : ''}`}
                      role={isClone ? undefined : 'link'}
                      tabIndex={isClone ? -1 : 0}
                      onClick={isClone ? undefined : (event) => {
                        event.stopPropagation()
                        navigate(routes.textBasedQuestions)
                      }}
                      onKeyDown={isClone ? undefined : (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          navigate(routes.textBasedQuestions)
                        }
                      }}
                    >
                      <div className={`adash-campaign-thumb ${campaign.thumb}`}>
                        <img className="adash-campaign-image" src={campaign.image} alt={isClone ? '' : `${campaign.category}: ${campaign.name} illustration`} />
                        <span className="adash-campaign-status"><StatusBadge label={campaign.status} /></span>
                      </div>
                      <div className="adash-campaign-body">
                        <div className="adash-campaign-labels">
                          <div className="adash-campaign-category">{campaign.category}</div>
                          <h3 className="adash-campaign-name">{campaign.name}</h3>
                        </div>
                        <div className="adash-campaign-sold">{campaign.sold} / {campaign.target} Questions Sold</div>
                        <CampaignMonthGraph campaignId={`${campaign.id}${isClone ? '-clone' : ''}`} sold={campaign.sold} target={campaign.target} />
                        <div className="adash-campaign-track"><span style={{ width: `${pct}%` }} /></div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ))}
          </div>
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
                  <th>Customer Name</th>
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

function ServiceToggleCard({ icon: Icon, label, description, enabled, onToggle }) {
  return (
    <TiltCard
      className="adash-hero-service-card__tilt"
      tiltLimit={8}
      scale={1.015}
      perspective={1000}
      effect="evade"
      spotlight
    >
      <div
        role="button"
        tabIndex={0}
        className={`adash-hero-service-card${enabled ? ' is-enabled' : ''}`}
        aria-pressed={enabled}
        aria-label={`${label}: ${enabled ? 'ON' : 'OFF'}. Click to turn ${enabled ? 'off' : 'on'}`}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggle()
          }
        }}
      >
        <span className="adash-hero-service-card__icon"><Icon size={22} /></span>
        <span className="adash-hero-service-card__copy">
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
        <FlipButton
          key={`${label}-${enabled}`}
          text1="ON"
          text2="OFF"
          initialShow={enabled}
          className="adash-hero-service-card__flip"
          aria-label={`${label} ${enabled ? 'ON' : 'OFF'}`}
          aria-pressed={enabled}
          onClick={onToggle}
        />
      </div>
    </TiltCard>
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
  const [animationPhase, setAnimationPhase] = useState(0)
  const svgWidth = 150
  const svgHeight = 60
  const capacity = Number(target) || 1
  const progress = Math.min(Math.max((Number(sold) / capacity) * 100, 0), 100)
  const chartData = useMemo(() => {
    // Keep the card's actual sales value fixed while gently changing the
    // intermediate points so the graph has the same live motion as the
    // supplied stats-widget animation.
    const shapes = [
      [0.35, 0.62, 0.5, 0.78, 0.68, 0.9, 1],
      [0.42, 0.55, 0.66, 0.52, 0.82, 0.74, 1],
      [0.3, 0.7, 0.58, 0.84, 0.6, 0.88, 1],
      [0.48, 0.58, 0.44, 0.72, 0.8, 0.66, 1],
    ]
    const shape = shapes[animationPhase % shapes.length]
    return shape.map((value) => progress * value)
  }, [animationPhase, progress])
  const linePath = useMemo(() => generateSmoothPath(chartData, svgWidth, svgHeight), [chartData])
  const areaPath = useMemo(() => `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`, [linePath])
  const gradientId = `campaign-area-${String(campaignId || 'default').replace(/[^a-zA-Z0-9_-]/g, '-')}`

  useEffect(() => {
    const phaseInterval = window.setInterval(() => {
      setAnimationPhase((phase) => phase + 1)
    }, 3000)
    return () => window.clearInterval(phaseInterval)
  }, [])

  useEffect(() => {
    const animateGraph = () => {
      const path = linePathRef.current
      const area = areaPathRef.current
      if (!path || !area || typeof path.getTotalLength !== 'function') return
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
    }

    animateGraph()
    const intervalId = window.setInterval(animateGraph, 3000)
    return () => window.clearInterval(intervalId)
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
            <stop offset="0%" stopColor="#f1bf25" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#f1bf25" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="adash-campaign-month-graph__area" ref={areaPathRef} d={areaPath} fill={`url(#${gradientId})`} />
        <path className="adash-campaign-month-graph__line" ref={linePathRef} d={linePath} />
      </svg>
    </div>
  )
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
