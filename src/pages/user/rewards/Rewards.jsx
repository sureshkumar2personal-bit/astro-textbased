import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Gift,
  IndianRupee,
  Info,
  Lock,
  MessageSquareText,
  Newspaper,
  Sparkles,
  Star,
  Ticket,
  TicketPercent,
  UserRoundPlus,
  Video,
  X,
} from 'lucide-react'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { useAuth } from '../../../state/AuthContext.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import StatCard from '../../../components/ui/StatCard.jsx'
import { getAstrologerById, REWARD_STATUS, APPOINTMENT_REWARDS, CONTENT_REWARDS } from './rewardsData.js'

const DAYS_MS = 24 * 60 * 60 * 1000

function formatDay(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const astrologerProfileRoute = (id) => `/user/astrologer/${encodeURIComponent(id)}`
const bookAppointmentRoute = (id) => `/user/appointments/book/${encodeURIComponent(id)}`

const STATE_TABS = [
  { key: 'all', label: 'All Rewards' },
  { key: 'ready', label: 'Ready to Use' },
  { key: 'locked', label: 'Locked' },
  { key: 'used', label: 'Used' },
  { key: 'benefits', label: 'Benefits' },
]

const CATEGORY_META = {
  questions: { label: 'Questions', icon: MessageSquareText, description: 'Discounted question rewards from your subscribed astrologers.' },
  appointments: { label: 'Appointments', icon: CalendarCheck, description: 'Booking discounts and priority slots from your astrologers.' },
  content: { label: 'Content', icon: Newspaper, description: 'Posts, videos, and subscriber-only articles shared by your astrologers.' },
  benefits: { label: 'Benefits', icon: Ticket, description: 'Redeemable perks from your active subscriptions.' },
}

const STATUS_PILL = {
  [REWARD_STATUS.AVAILABLE]: { icon: CheckCircle2, tone: 'success', label: 'Available', hint: 'Ready to use now.' },
  [REWARD_STATUS.EXPIRING]: { icon: AlertTriangle, tone: 'amber', label: 'Expiring Soon', hint: 'Use it before it runs out.' },
  [REWARD_STATUS.USED]: { icon: CheckCircle2, tone: 'muted', label: 'Used', hint: 'You have already used this.' },
  [REWARD_STATUS.LOCKED]: { icon: Lock, tone: 'muted', label: 'Locked', hint: 'Subscribe to unlock this.' },
  [REWARD_STATUS.SUBSCRIBER]: { icon: Lock, tone: 'violet', label: 'Subscriber Only', hint: 'Needs an active subscription.' },
}

function StatusPill({ status }) {
  const meta = STATUS_PILL[status] || STATUS_PILL[REWARD_STATUS.AVAILABLE]
  const Icon = meta.icon
  return (
    <span className="reward-status-wrap">
      <span className={`reward-status-pill reward-status-pill--${meta.tone}`}>
        <Icon size={13} />
        {meta.label}
      </span>
      {meta.hint && <span className="reward-status-hint">{meta.hint}</span>}
    </span>
  )
}

function initialsFor(name) {
  return (name || 'A')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Avatar({ astrologer, name }) {
  return (
    <span className="reward-avatar" aria-hidden="true">
      {astrologer?.initials || initialsFor(name || astrologer?.name)}
    </span>
  )
}

function AstrologerMeta({ astrologer, name }) {
  const displayName = name || astrologer?.name
  return (
    <div className="reward-astro-meta">
      <div className="reward-astro-name">{displayName || 'Astrologer'}<span aria-hidden="true" className="reward-astro-arrow"><ArrowUpRight size={14} /></span></div>
      {(astrologer?.rating || astrologer?.specialty) && (
        <div className="reward-astro-line">
          {astrologer?.rating && <span className="reward-astro-rating"><Star size={12} /> {astrologer.rating}</span>}
          {astrologer?.specialty && <span className="reward-astro-specialty">{astrologer.specialty}</span>}
        </div>
      )}
      {astrologer?.availability && (
        <span className={`reward-astro-status reward-astro-status--${astrologer.availability}`}>
          <span aria-hidden="true" className="reward-astro-status-dot" />
          {astrologer.availability === 'online' ? 'Available' : 'Offline'}
        </span>
      )}
    </div>
  )
}

const HOW_REWARDS_WORK = [
  { key: 'subscribe', icon: UserRoundPlus, title: 'Subscribe', copy: 'Pick an astrologer plan' },
  { key: 'perks', icon: TicketPercent, title: 'Get monthly perks', copy: 'A discount question + benefits' },
  { key: 'save', icon: IndianRupee, title: 'Save on questions', copy: 'Pay less as a subscriber' },
]

// Tiny explainer strip: how rewards accumulate.
function HowRewardsStrip({ onNavigate }) {
  return (
    <div className="reward-how-card">
      <span className="reward-how-icon" aria-hidden="true"><Info size={18} /></span>
      <div className="reward-how-copy">
        <strong>How rewards work</strong>
        <div className="reward-how-steps">
          {HOW_REWARDS_WORK.map((step, index) => (
            <div key={step.key} className="reward-how-step">
              <button type="button" className="reward-how-step-link" onClick={() => onNavigate(step.key)}>
                <span className="reward-how-step-icon"><step.icon size={15} /></span>
                <span className="reward-how-step-text">
                  <span className="reward-how-step-title">{step.title}</span>
                  <span className="reward-how-step-copy">{step.copy}</span>
                </span>
              </button>
              {index < HOW_REWARDS_WORK.length - 1 && <span className="reward-how-arrow" aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExpiringBanner({ items }) {
  const navigate = useNavigate()
  const routes = getRoleRoutes('user')
  if (!items.length) return null
  return (
    <div className="reward-expiring" role="status">
      <div className="reward-expiring-head">
        <AlertTriangle size={18} className="reward-expiring-icon" />
        <strong>{items.length} reward{items.length === 1 ? '' : 's'} expire soon</strong>
      </div>
      <div className="reward-expiring-list">
        {items.map((reward) => {
          const astrologer = getAstrologerById(reward.astrologerId)
          const name = reward.astrologerName || astrologer?.name || (reward.category === 'benefits' ? 'Subscriber' : 'Astrologer')
          return (
            <button
              type="button"
              key={reward.id}
              className="reward-expiring-item"
              onClick={() => {
                if (reward.category === 'questions') navigate(`${routes.discountQuestions}?astrologer=${encodeURIComponent(reward.astrologerId || '')}`)
                else if (reward.category === 'appointments') navigate(bookAppointmentRoute(reward.astrologerId))
                else if (reward.category === 'content') navigate(routes.astrologers)
                else if (reward.category === 'benefits') navigate(`${routes.discountQuestions}`)
              }}
            >
              <span className="reward-expiring-item-name">{name}</span>
              <span className="reward-expiring-item-title">{reward.title}</span>
              <span className="reward-expiring-item-days">{Math.abs(reward.expiresInDays)} days left</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Reveal({ items, render, gridClass, expand = false, onViewMore, viewMoreLabel = 'View More' }) {
  if (!items.length) return null
  const showAll = expand || items.length <= 3
  const visible = showAll ? items : items.slice(0, 3)
  return (
    <div className={`reward-grid ${gridClass}${showAll ? ' reward-grid--full' : ''}`}>
      {visible.map(render)}
      {!showAll && (
        <div className="reward-grid__action">
          <button type="button" className="reward-grid__view-more" onClick={onViewMore}>
            {viewMoreLabel} →
          </button>
        </div>
      )}
    </div>
  )
}

function QuestionSection({ rewards, openDrawer, expand, onViewMore, viewMoreLabel }) {
  const navigate = useNavigate()
  const routes = getRoleRoutes('user')
  const byAstrologer = useMemo(() => {
    const map = new Map()
    rewards.forEach((reward) => {
      if (!map.has(reward.astrologerId)) map.set(reward.astrologerId, [])
      map.get(reward.astrologerId).push(reward)
    })
    return [...map.entries()]
  }, [rewards])

  if (!byAstrologer.length) {
    return (
      <EmptyState icon={MessageSquareText} title="No question rewards yet" detail="Subscribe to an astrologer to unlock discount questions." cta="Explore Astrologers" onCta={() => navigate(routes.astrologers)} />
    )
  }

  return (
    <>
      <div className="reward-section-head">
        <h2 className="reward-section-title"><MessageSquareText size={20} /> {CATEGORY_META.questions.label}</h2>
        <p className="reward-section-desc">{CATEGORY_META.questions.description}</p>
      </div>
      <Reveal
        items={byAstrologer}
        gridClass="reward-astrologer-grid"
        expand={expand}
        onViewMore={onViewMore}
        viewMoreLabel={viewMoreLabel}
        render={([astrologerId, list]) => {
          const astrologer = getAstrologerById(astrologerId)
          const name = list[0]?.astrologerName || astrologer?.name
          const preview = list[0]
          const availableCount = list.length
          return (
            <article key={astrologerId} className="reward-astrologer-card">
              <div className="reward-astrologer-top">
                <Avatar astrologer={astrologer} name={name} />
                <AstrologerMeta astrologer={astrologer} name={name} />
              </div>
              <div className="reward-astrologer-preview">
                <span className="reward-astrologer-count">{availableCount} reward{availableCount === 1 ? '' : 's'} available</span>
                {preview && (
                  <div className="reward-astrologer-preview-row">
                    <span className="reward-astrologer-preview-icon"><Gift size={14} /></span>
                    <div>
                      <div className="reward-astrologer-preview-title">{preview.title}</div>
                      {preview.value && <div className="reward-astrologer-preview-value">{preview.value}</div>}
                      {preview.expiresOn && <div className="reward-astrologer-preview-expiry">Expires {preview.expiresOn}</div>}
                      <StatusPill status={preview.status} />
                    </div>
                  </div>
                )}
              </div>
              <button type="button" className="reward-astrologer-action" onClick={() => openDrawer(preview)}>
                View Rewards
              </button>
            </article>
          )
        }}
      />
    </>
  )
}

function AppointmentSection({ rewards, expand, onViewMore, viewMoreLabel }) {
  const navigate = useNavigate()
  const routes = getRoleRoutes('user')
  if (!rewards.length) {
    return (
      <EmptyState icon={CalendarCheck} title="No appointment rewards yet" detail="Subscribe to an astrologer to unlock exclusive appointment discounts." cta="Explore Astrologers" onCta={() => navigate(routes.astrologers)} />
    )
  }
  return (
    <>
      <div className="reward-section-head">
        <h2 className="reward-section-title"><CalendarCheck size={20} /> {CATEGORY_META.appointments.label}</h2>
        <p className="reward-section-desc">{CATEGORY_META.appointments.description}</p>
      </div>
      <Reveal
        items={rewards}
        gridClass="reward-appointment-grid"
        expand={expand}
        onViewMore={onViewMore}
        viewMoreLabel={viewMoreLabel}
        render={(reward) => {
          const astrologer = getAstrologerById(reward.astrologerId)
          return (
            <article key={reward.id} className="reward-appointment-card">
              <div className="reward-appointment-top">
                <span className="reward-appointment-icon"><TicketPercent size={22} /></span>
                {astrologer && (
                  <div className="reward-appointment-astro">
                    <Avatar astrologer={astrologer} />
                    <span className="reward-appointment-astro-name">{astrologer.name}</span>
                  </div>
                )}
              </div>
              <div className="reward-appointment-value">{reward.value}</div>
              <div className="reward-appointment-title">{reward.title}</div>
              <div className="reward-appointment-desc">{reward.description}</div>
              <div className="reward-appointment-meta">
                {reward.expiresOn && <span className="reward-appointment-expiry">Valid until {reward.expiresOn}</span>}
                <StatusPill status={reward.status} />
              </div>
              <button type="button" className="btn btn-primary reward-appointment-cta" onClick={() => navigate(bookAppointmentRoute(reward.astrologerId))}>
                Book Appointment
              </button>
            </article>
          )
        }}
      />
    </>
  )
}

const CONTENT_ICON = {
  article: BookOpen,
  video: Video,
  post: Newspaper,
}

function ContentSection({ rewards, openContent, expand, onViewMore, viewMoreLabel }) {
  const navigate = useNavigate()
  const routes = getRoleRoutes('user')
  if (!rewards.length) {
    return (
      <EmptyState icon={Newspaper} title="No content rewards yet" detail="Subscribe to an astrologer to unlock exclusive posts, videos, and articles." cta="Explore Astrologers" onCta={() => navigate(routes.astrologers)} />
    )
  }
  return (
    <>
      <div className="reward-section-head">
        <h2 className="reward-section-title"><Newspaper size={20} /> {CATEGORY_META.content.label}</h2>
        <p className="reward-section-desc">{CATEGORY_META.content.description}</p>
      </div>
      <Reveal
        items={rewards}
        gridClass="reward-content-grid"
        expand={expand}
        onViewMore={onViewMore}
        viewMoreLabel={viewMoreLabel}
        render={(reward) => {
          const astrologer = getAstrologerById(reward.astrologerId)
          const ContentIcon = CONTENT_ICON[reward.contentType] || Newspaper
          return (
            <article key={reward.id} className="reward-content-card">
              <div className="reward-content-head">
                <span className="reward-content-thumb"><ContentIcon size={22} /></span>
                {reward.isSubscriberOnly && <span className="reward-subscriber-badge"><Lock size={11} /> Subscriber</span>}
              </div>
              <div className="reward-content-type">{reward.type}</div>
              <div className="reward-content-title">{reward.title}</div>
              {astrologer && <div className="reward-content-astro">{astrologer.name}</div>}
              <div className="reward-content-desc">{reward.description}</div>
              <button type="button" className="reward-content-action" onClick={() => openContent(reward)}>
                View
                <ArrowUpRight size={15} />
              </button>
            </article>
          )
        }}
      />
    </>
  )
}

function BenefitSection({ rewards, expand, onViewMore }) {
  const navigate = useNavigate()
  const routes = getRoleRoutes('user')
  if (!rewards.length) {
    return (
      <EmptyState icon={Ticket} title="No benefits available" detail="Your active subscriptions unlock monthly benefits here." cta="Explore Astrologers" onCta={() => navigate(routes.astrologers)} />
    )
  }
  return (
    <>
      <div className="reward-section-head">
        <h2 className="reward-section-title"><Ticket size={20} /> {CATEGORY_META.benefits.label}</h2>
        <p className="reward-section-desc">{CATEGORY_META.benefits.description}</p>
      </div>
      <Reveal
        items={rewards}
        gridClass="reward-benefit-grid"
        expand={expand}
        onViewMore={onViewMore}
        render={(reward) => (
          <article key={reward.id} className="reward-benefit-card">
            <div className="reward-benefit-top">
              <span className="reward-benefit-icon"><Sparkles size={20} /></span>
              <StatusPill status={reward.status} />
            </div>
            <div className="reward-benefit-title">{reward.title}</div>
            {reward.tiers?.length > 0 && (
              <div className="reward-benefit-tiers">
                {reward.tiers.map((tier) => <span key={tier} className="reward-tier-chip">{tier}</span>)}
              </div>
            )}
            <div className="reward-benefit-value">{reward.value}</div>
            <div className="reward-benefit-desc">{reward.description}</div>
            {reward.expiresOn && <div className="reward-benefit-expiry"><Clock3 size={12} /> Expires {reward.expiresOn}</div>}
            {reward.id === 'benefit-dq' && (
              <button type="button" className="btn btn-primary reward-benefit-cta" onClick={() => navigate(routes.discountQuestions)}>
                Use Discount Question
              </button>
            )}
          </article>
        )}
      />
      <div className="reward-benefit-manage">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(routes.autopay)}>
          Manage Subscriptions <ArrowUpRight size={14} />
        </button>
      </div>
    </>
  )
}

function EmptyState({ icon: Icon, title, detail, cta, onCta }) {
  return (
    <div className="reward-empty">
      <span className="reward-empty-icon"><Icon size={26} /></span>
      <div className="reward-empty-title">{title}</div>
      <div className="reward-empty-detail">{detail}</div>
      {cta && <button type="button" className="btn btn-outline" onClick={onCta}>{cta}</button>}
    </div>
  )
}

// Right-side drawer with reward details for a given astrologer, same category only.
function RewardDrawer({ astrologerId, category, rewards, onClose, onViewContent }) {
  const navigate = useNavigate()
  const routes = getRoleRoutes('user')
  const astrologer = getAstrologerById(astrologerId)
  const categoryLabel = CATEGORY_META[category]?.label || 'Rewards'

  const performAction = (reward) => {
    if (reward.category === 'content') {
      onClose()
      onViewContent(reward)
      return
    }
    onClose()
    if (reward.category === 'questions' || reward.type.includes('Question')) {
      navigate(reward.astrologerId ? `${routes.discountQuestions}?astrologer=${encodeURIComponent(reward.astrologerId)}` : routes.discountQuestions)
    } else if (reward.category === 'appointments' || reward.type.includes('Appointment')) {
      navigate(bookAppointmentRoute(reward.astrologerId))
    } else if (reward.category === 'benefits') {
      navigate(`${routes.discountQuestions}`)
    }
  }

  const ctaLabel = (reward) => {
    if (reward.category === 'appointments' || reward.type.includes('Appointment')) return 'Book Appointment'
    if (reward.category === 'content' || reward.type.includes('Article') || reward.type.includes('Video') || reward.type.includes('Post')) return 'Read'
    if (reward.category === 'benefits') return 'Use Benefit'
    return 'Ask Question'
  }

  return createPortal(
    <div className="reward-drawer-overlay" onClick={onClose}>
      <aside
        className="reward-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reward-drawer-header">
          <button type="button" className="icon-btn" aria-label="Close reward details" onClick={onClose}><X size={18} /></button>
          <h3 id="reward-drawer-title">{categoryLabel}</h3>
        </div>

        <div className="reward-drawer-astrologer">
          {astrologer ? (
            <>
              <Avatar astrologer={astrologer} />
              <div>
                <div className="reward-drawer-astro-name">{astrologer.name}</div>
                <div className="reward-drawer-astro-line">
                  <span className="reward-astro-rating"><Star size={12} /> {astrologer.rating}</span>
                  <span className="reward-drawer-astro-specialty">{astrologer.specialty}</span>
                </div>
                <span className={`reward-astro-status reward-astro-status--${astrologer.availability}`}>
                  <span className="reward-astro-status-dot" />
                  {astrologer.availability === 'online' ? 'Available' : 'Offline'}
                </span>
              </div>
            </>
          ) : (
            <div className="reward-drawer-astro-name">Rewards</div>
          )}
        </div>

        <div className="reward-drawer-count">{rewards.length} {rewards.length === 1 ? categoryLabel.replace(/s$/, '') : categoryLabel}</div>

        <div className="reward-drawer-list">
          {rewards.map((reward) => (
            <div key={reward.id} className="reward-drawer-item">
              <div className="reward-drawer-item-head">
                <div className="reward-drawer-item-title">{reward.title}</div>
                <StatusPill status={reward.status} />
              </div>
              <div className="reward-drawer-item-meta">
                {reward.type && <span className="reward-drawer-item-chip">{reward.type}</span>}
                {reward.value && <span className="reward-drawer-item-chip">{reward.value}</span>}
              </div>
              <div className="reward-drawer-item-desc">{reward.description}</div>
              {reward.expiresOn && (
                <div className="reward-drawer-item-expiry"><Clock3 size={12} /> Valid until {reward.expiresOn}</div>
              )}
              <button type="button" className="btn btn-primary reward-drawer-cta" disabled={reward.status === REWARD_STATUS.USED || reward.status === REWARD_STATUS.LOCKED} onClick={() => performAction(reward)}>
                {ctaLabel(reward)}
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>,
    document.body,
  )
}

// Content reading panel for a single content reward.
function ContentReaderDrawer({ reward, onClose }) {
  const navigate = useNavigate()
  const astrologer = getAstrologerById(reward.astrologerId)
  const ContentIcon = CONTENT_ICON[reward.contentType] || Newspaper
  const name = reward.astrologerName || astrologer?.name
  return createPortal(
    <div className="reward-drawer-overlay" onClick={onClose}>
      <aside
        className="reward-drawer reward-content-reader"
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-reader-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reward-drawer-header">
          <button type="button" className="icon-btn" aria-label="Close content" onClick={onClose}><X size={18} /></button>
          <h3 id="content-reader-title">Content</h3>
        </div>
        <div className="reward-content-reader-hero">
          <span className="reward-content-reader-icon"><ContentIcon size={24} /></span>
          <div className="reward-content-reader-meta">
            <div className="reward-content-reader-type">
              {reward.type}
              {reward.isSubscriberOnly && <span className="reward-subscriber-badge"><Lock size={11} /> Subscriber</span>}
            </div>
            <h4 className="reward-content-reader-title">{reward.title}</h4>
            {name && <div className="reward-content-reader-astro">{name}</div>}
          </div>
        </div>
        <div className="reward-content-reader-body">
          <p>{reward.description}</p>
        </div>
        <div className="reward-content-reader-footer">
          {astrologer && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { onClose(); navigate(astrologerProfileRoute(reward.astrologerId)) }}
            >
              View {name} Profile
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </aside>
    </div>,
    document.body,
  )
}

export default function RewardsPerks() {
  const { currentUser } = useAuth()
  const { campaigns, subscriptions, actions } = useAppData()
  const navigate = useNavigate()
  const routes = getRoleRoutes('user')
  const [filter, setFilter] = useState('all')
  const [expandedSections, setExpandedSections] = useState({})
  const [drawerRewards, setDrawerRewards] = useState(null)
  const [contentReward, setContentReward] = useState(null)
  const rewardsInitialized = useRef(false)

  useEffect(() => {
    if (rewardsInitialized.current || !currentUser?.id) return
    rewardsInitialized.current = true
    actions.markExpiredDiscountQuestions(currentUser.id)
    actions.renewMonthlyDiscountQuestions(currentUser.id)
  }, [currentUser?.id, actions])

  const availableDiscountQuestions = useMemo(
    () => actions.getAvailableDiscountQuestions(currentUser?.id),
    [actions, currentUser?.id],
  )

  const activeSubscriptions = useMemo(
    () => (subscriptions || []).filter(
      (sub) => sub.userId === currentUser?.id && (!sub.expiresAt || sub.expiresAt >= Date.now()),
    ),
    [subscriptions, currentUser?.id],
  )

  const rewardModel = useMemo(() => {
    const questions = availableDiscountQuestions
      .filter((dq) => dq.status === 'Available' && dq.validUntil >= Date.now())
      .map((dq) => {
        const campaign = campaigns.find((c) => c.status === 'Active' && c.astrologerId === dq.astrologerId)
        const price = Number(campaign?.generalPrice) || 0
        const pct = Number(campaign?.discountPercent) || 0
        const savings = Math.round(price * pct / 100)
        const validUntil = Number(dq.validUntil) || 0
        const daysLeft = validUntil ? Math.max(0, Math.ceil((validUntil - Date.now()) / DAYS_MS)) : 0
        const status = daysLeft <= 7 ? REWARD_STATUS.EXPIRING : REWARD_STATUS.AVAILABLE
        return {
          id: `question-${dq.id}`,
          astrologerId: dq.astrologerId,
          astrologerName: dq.astrologerName || dq.astrologerId,
          title: 'Discount Question',
          type: 'Discount',
          value: savings > 0 ? `Save ₹${savings}` : 'Subscriber Discount',
          description: savings > 0
            ? `Your subscriber discount saves ₹${savings} on a general question with ${dq.astrologerName || 'this astrologer'}.`
            : `Use your subscriber discount question with ${dq.astrologerName || 'this astrologer'}.`,
          expiresOn: validUntil ? formatDay(validUntil) : null,
          expiresInDays: daysLeft,
          status,
          savings,
          category: 'questions',
        }
      })

    const appointments = APPOINTMENT_REWARDS.map((reward) => ({ ...reward, category: 'appointments' }))
    const content = CONTENT_REWARDS.map((reward) => ({ ...reward, category: 'content' }))

    const benefits = []
    if (activeSubscriptions.length) {
      const earliestExpiry = Math.min(...activeSubscriptions.map((s) => Number(s.expiresAt) || Date.now()))
      const daysLeft = Math.max(0, Math.ceil((earliestExpiry - Date.now()) / DAYS_MS))
      const tiers = [...new Set(activeSubscriptions.map((sub) => sub.tier).filter(Boolean))]
      const activeAstrologerIds = new Set(activeSubscriptions.map((sub) => sub.astrologerId))
      const maxDiscount = campaigns
        .filter((c) => c.status === 'Active' && activeAstrologerIds.has(c.astrologerId))
        .reduce((max, c) => Math.max(max, Number(c.discountPercent) || 0), 0)
      benefits.push(
        {
          id: 'benefit-dq',
          title: 'Monthly Discount Question',
          type: 'Benefit',
          value: `${activeSubscriptions.length} question${activeSubscriptions.length === 1 ? '' : 's'} / month`,
          tiers,
          description: 'One discounted question is granted every subscription cycle while your subscriptions are active.',
          expiresOn: formatDay(earliestExpiry),
          expiresInDays: daysLeft,
          status: REWARD_STATUS.AVAILABLE,
          category: 'benefits',
        },
        {
          id: 'benefit-pricing',
          title: 'Subscriber Pricing',
          type: 'Benefit',
          value: maxDiscount > 0 ? `Up to ${maxDiscount}% OFF` : 'Subscriber pricing',
          description: 'Reduced question rates across all your subscribed astrologers.',
          expiresOn: formatDay(earliestExpiry),
          expiresInDays: daysLeft,
          status: REWARD_STATUS.AVAILABLE,
          category: 'benefits',
        },
        {
          id: 'benefit-support',
          title: 'Priority Support',
          type: 'Benefit',
          value: 'Priority',
          description: 'Faster responses to your questions and disputes while subscribed.',
          expiresOn: null,
          expiresInDays: null,
          status: REWARD_STATUS.AVAILABLE,
          category: 'benefits',
        },
      )
    }

    return { questions, appointments, content, benefits }
  }, [availableDiscountQuestions, campaigns, activeSubscriptions])

  const summary = useMemo(() => {
    const usable = (status) => status === REWARD_STATUS.AVAILABLE || status === REWARD_STATUS.EXPIRING
    const { questions, appointments, content, benefits } = rewardModel
    const all = [...questions, ...appointments, ...content, ...benefits]
    return {
      available: all.filter((reward) => usable(reward.status)).length,
      questions: questions.length,
      appointments: appointments.length,
      benefits: benefits.length,
      expiring: all.filter((reward) => reward.status === REWARD_STATUS.EXPIRING).length,
      savings: questions.reduce((sum, reward) => sum + (Number(reward.savings) || 0), 0),
    }
  }, [rewardModel])

  const expiringItems = useMemo(
    () => [...rewardModel.questions, ...rewardModel.appointments, ...rewardModel.benefits]
      .filter((reward) => reward.status === REWARD_STATUS.EXPIRING)
      .slice(0, 4),
    [rewardModel],
  )

  const questionRewards = rewardModel.questions
  const appointmentRewards = rewardModel.appointments
  const contentRewards = rewardModel.content
  const benefitRewards = rewardModel.benefits

  const isReady = (reward) => reward.status === REWARD_STATUS.AVAILABLE || reward.status === REWARD_STATUS.EXPIRING
  const isLocked = (reward) => reward.status === REWARD_STATUS.LOCKED || reward.status === REWARD_STATUS.SUBSCRIBER
  const isUsed = (reward) => reward.status === REWARD_STATUS.USED
  const byState = (predicate) => ({
    questions: questionRewards.filter(predicate),
    appointments: appointmentRewards.filter(predicate),
    content: contentRewards.filter(predicate),
    benefits: benefitRewards.filter(predicate),
  })
  const readyGroups = byState(isReady)
  const lockedGroups = byState(isLocked)
  const usedGroups = byState(isUsed)

  const expandSection = (key) => setExpandedSections((prev) => ({ ...prev, [key]: true }))

  const renderStateSections = (groups, title, detail) => {
    const sections = []
    if (groups.questions.length) {
      sections.push(<QuestionSection key="questions" rewards={groups.questions} openDrawer={openDrawer} expand />)
    }
    if (groups.appointments.length) {
      sections.push(<AppointmentSection key="appointments" rewards={groups.appointments} openDrawer={openDrawer} expand />)
    }
    if (groups.content.length) {
      sections.push(<ContentSection key="content" rewards={groups.content} openContent={openContent} expand />)
    }
    if (groups.benefits.length) {
      sections.push(<BenefitSection key="benefits" rewards={groups.benefits} expand />)
    }
    return sections.length
      ? sections
      : <EmptyState icon={Sparkles} title={title} detail={detail} cta="Explore Astrologers" onCta={() => navigate(routes.astrologers)} />
  }

  const openDrawer = (reward) => {
    const pool = reward.category === 'appointments'
      ? rewardModel.appointments
      : reward.category === 'content'
        ? rewardModel.content
        : rewardModel.questions
    const same = pool.filter((item) => item.astrologerId && item.astrologerId === reward.astrologerId)
    setDrawerRewards({ astrologerId: reward.astrologerId, category: reward.category, rewards: same })
  }

  const openContent = (reward) => setContentReward(reward)

  return (
    <div className="rewards-center">
      <PageHeader
        eyebrow="Member Rewards"
        title="Perks & Benefits"
        subtitle="Your subscriber perks, discount questions, and savings — all in one place."
      />

      <ExpiringBanner items={expiringItems} />

      <div className="stat-grid reward-summary-strip">
        <StatCard icon={Gift} value={summary.available} tone="violet" label={<>Available Rewards<br /><span className="reward-summary-hint">Ready to use now</span></>} />
        <StatCard icon={MessageSquareText} value={summary.questions} tone="gold" label={<>Discount Questions<br /><span className="reward-summary-hint">Live from your subscriptions</span></>} />
        <StatCard icon={CalendarCheck} value={summary.appointments} tone="green" label={<>Appointment Rewards<br /><span className="reward-summary-hint">Discounts & priority slots</span></>} />
        <StatCard icon={Ticket} value={summary.benefits} tone="green" label={<>Benefits<br /><span className="reward-summary-hint">From your subscriptions</span></>} />
        <StatCard icon={IndianRupee} value={`₹${summary.savings}`} tone="gold" label={<>Total Savings<br /><span className="reward-summary-hint">With your discount questions</span></>} />
        <StatCard icon={AlertTriangle} value={summary.expiring} tone="red" label={<>Expiring Soon<br /><span className="reward-summary-hint">Use before they are lost</span></>} />
      </div>

      <div className="reward-filter" role="tablist" aria-label="Filter rewards">
        {STATE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            className={`reward-filter-tab${filter === tab.key ? ' is-active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <HowRewardsStrip onNavigate={(key) => {
        if (key === 'subscribe') navigate(routes.astrologers)
        else navigate(routes.discountQuestions)
      }} />

      <div className="reward-results">
        {filter === 'all' && (
          <>
            <QuestionSection rewards={questionRewards} openDrawer={openDrawer} expand={expandedSections.questions} onViewMore={() => expandSection('questions')} viewMoreLabel="View All Questions" />
            <AppointmentSection rewards={appointmentRewards} openDrawer={openDrawer} expand={expandedSections.appointments} onViewMore={() => expandSection('appointments')} viewMoreLabel="View All Appointments" />
            <ContentSection rewards={contentRewards} openContent={openContent} expand={expandedSections.content} onViewMore={() => expandSection('content')} viewMoreLabel="View All Content" />
            <BenefitSection rewards={benefitRewards} expand />
          </>
        )}
        {filter === 'ready' && renderStateSections(readyGroups, 'Nothing ready to use yet', 'Your available rewards will appear here once you subscribe to an astrologer.')}
        {filter === 'locked' && renderStateSections(lockedGroups, 'No locked rewards', 'Rewards you need to unlock will appear here.')}
        {filter === 'used' && renderStateSections(usedGroups, 'No used rewards yet', 'Your used rewards will be listed here.')}
        {filter === 'benefits' && (benefitRewards.length
          ? <BenefitSection rewards={benefitRewards} expand />
          : <EmptyState icon={Ticket} title="No benefits available" detail="Your active subscriptions unlock monthly benefits here." cta="Explore Astrologers" onCta={() => navigate(routes.astrologers)} />
        )}
      </div>

      {drawerRewards && (
        <RewardDrawer
          astrologerId={drawerRewards.astrologerId}
          category={drawerRewards.category}
          rewards={drawerRewards.rewards}
          onClose={() => setDrawerRewards(null)}
          onViewContent={(reward) => { setDrawerRewards(null); setContentReward(reward) }}
        />
      )}

      {contentReward && (
        <ContentReaderDrawer
          reward={contentReward}
          onClose={() => setContentReward(null)}
        />
      )}
    </div>
  )
}


