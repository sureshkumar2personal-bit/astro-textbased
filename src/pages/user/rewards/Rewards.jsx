import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Gift,
  Lock,
  MessageSquareText,
  Newspaper,
  Sparkles,
  Star,
  Ticket,
  TicketPercent,
  Video,
  X,
} from 'lucide-react'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { getAstrologerById, REWARD_STATUS, ALL_REWARDS, QUESTION_REWARDS, APPOINTMENT_REWARDS, BENEFIT_REWARDS } from './rewardsData.js'

const FILTER_TABS = [
  { key: 'all', label: 'All Rewards' },
  { key: 'questions', label: 'Questions' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'content', label: 'Content' },
]

const CATEGORY_META = {
  questions: { label: 'Questions', icon: MessageSquareText, description: 'Free and discounted question rewards from your subscribed astrologers.' },
  appointments: { label: 'Appointments', icon: CalendarCheck, description: 'Booking discounts and priority slots from your astrologers.' },
  content: { label: 'Content', icon: Newspaper, description: 'Posts, videos, and subscriber-only articles shared by your astrologers.' },
  benefits: { label: 'Benefits', icon: Ticket, description: 'Redeemable perks from your active subscriptions.' },
}

const STATUS_PILL = {
  [REWARD_STATUS.AVAILABLE]: { icon: CheckCircle2, tone: 'success', label: 'Available', title: 'This reward is ready to use.' },
  [REWARD_STATUS.EXPIRING]: { icon: AlertTriangle, tone: 'amber', label: 'Expiring Soon', title: 'This reward expires soon. Use it before it is lost.' },
  [REWARD_STATUS.USED]: { icon: CheckCircle2, tone: 'muted', label: 'Used', title: 'This reward has already been used.' },
  [REWARD_STATUS.LOCKED]: { icon: Lock, tone: 'muted', label: 'Locked', title: 'This reward is locked. Complete the requirement to unlock it.' },
  [REWARD_STATUS.SUBSCRIBER]: { icon: Lock, tone: 'violet', label: 'Subscriber Only', title: 'Only active subscribers can access this reward.' },
}

function StatusPill({ status }) {
  const meta = STATUS_PILL[status] || STATUS_PILL[REWARD_STATUS.AVAILABLE]
  const Icon = meta.icon
  return (
    <span
      className={`reward-status-pill reward-status-pill--${meta.tone}`}
      title={meta.title}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  )
}

function Avatar({ astrologer }) {
  return (
    <span className="reward-avatar" aria-hidden="true">
      {astrologer.initials}
    </span>
  )
}

function AstrologerMeta({ astrologer }) {
  return (
    <div className="reward-astro-meta">
      <div className="reward-astro-name">{astrologer.name}<span aria-hidden="true" className="reward-astro-arrow"><ArrowUpRight size={14} /></span></div>
      <div className="reward-astro-line">
        <span className="reward-astro-rating"><Star size={12} /> {astrologer.rating}</span>
        <span className="reward-astro-specialty">{astrologer.specialty}</span>
      </div>
      <span className={`reward-astro-status reward-astro-status--${astrologer.availability}`}>
        <span aria-hidden="true" className="reward-astro-status-dot" />
        {astrologer.availability === 'online' ? 'Available' : 'Offline'}
      </span>
    </div>
  )
}

function SummaryCard({ icon: Icon, value, label, hint, tone = 'violet' }) {
  return (
    <div className={`reward-summary-card reward-summary-card--${tone}`}>
      <span className="reward-summary-icon"><Icon size={20} /></span>
      <div className="reward-summary-body">
        <div className="reward-summary-value">{value}</div>
        <div className="reward-summary-label">{label}</div>
        {hint && <div className="reward-summary-hint">{hint}</div>}
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
          const name = astrologer?.name || (reward.category === 'benefits' ? 'Subscriber' : 'Astrologer')
          return (
            <button
              type="button"
              key={reward.id}
              className="reward-expiring-item"
              onClick={() => {
                if (reward.category === 'questions') navigate(`${routes.askQuestion}`)
                else if (reward.category === 'appointments') navigate(`${routes.appointmentDetails}`)
                else if (reward.category === 'content') navigate(`${routes.astrologers}`)
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

function QuestionSection({ rewards, openDrawer, expand, onViewMore }) {
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
      <EmptyState icon={MessageSquareText} title="No question rewards yet" detail="Subscribe to an astrologer to unlock free and discounted questions." cta="Explore Astrologers" onCta={() => navigate(routes.astrologers)} />
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
        render={([astrologerId, list]) => {
          const astrologer = getAstrologerById(astrologerId)
          if (!astrologer) return null
          const preview = list[0]
          const availableCount = list.length
          return (
            <article key={astrologerId} className="reward-astrologer-card">
              <div className="reward-astrologer-top">
                <Avatar astrologer={astrologer} />
                <AstrologerMeta astrologer={astrologer} />
              </div>
              <div className="reward-astrologer-preview">
                <span className="reward-astrologer-count">{availableCount} reward{availableCount === 1 ? '' : 's'} available</span>
                {preview && (
                  <div className="reward-astrologer-preview-row">
                    <span className="reward-astrologer-preview-icon"><Gift size={14} /></span>
                    <div>
                      <div className="reward-astrologer-preview-title">{preview.title}</div>
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

function AppointmentSection({ rewards, expand, onViewMore }) {
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
              <button type="button" className="btn btn-primary reward-appointment-cta" onClick={() => navigate(`${routes.appointmentDetails}`)}>
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

function ContentSection({ rewards, openDrawer, expand, onViewMore }) {
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
              <button type="button" className="reward-content-action" onClick={() => openDrawer(reward)}>
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
            <div className="reward-benefit-value">{reward.value}</div>
            <div className="reward-benefit-desc">{reward.description}</div>
            {reward.expiresOn && <div className="reward-benefit-expiry"><Clock3 size={12} /> Expires {reward.expiresOn}</div>}
          </article>
        )}
      />
    </>
  )
}

function EmptyState({ icon: Icon, title, detail, cta, onCta }) {
  return (
    <div className="reward-empty">
      <span className="reward-empty-icon"><Icon size={26} /></span>
      <div className="reward-empty-title">{title}</div>
      <div className="reward-empty-detail">{detail}</div>
      <button type="button" className="btn btn-outline" onClick={onCta}>{cta}</button>
    </div>
  )
}

// Right-side drawer with reward details for a given astrologer.
function RewardDrawer({ astrologerId, rewards, onClose }) {
  const navigate = useNavigate()
  const routes = getRoleRoutes('user')
  const astrologer = getAstrologerById(astrologerId)

  const performAction = (reward) => {
    onClose()
    if (reward.category === 'questions' || reward.type.includes('Question')) {
      navigate(`${routes.askQuestion}?campaignId=${reward.campaignId || ''}`)
    } else if (reward.category === 'appointments' || reward.type.includes('Appointment')) {
      navigate(`${routes.appointmentDetails}`)
    } else if (reward.category === 'content') {
      navigate(`${routes.astrologers}`)
    } else if (reward.category === 'benefits') {
      navigate(`${routes.discountQuestions}`)
    }
  }

  const ctaLabel = (reward) => {
    if (reward.category === 'appointments' || reward.type.includes('Appointment')) return 'Book Appointment'
    if (reward.category === 'content') return 'View Content'
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
          <h3 id="reward-drawer-title">Rewards</h3>
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

        <div className="reward-drawer-count">{rewards.length} reward{rewards.length === 1 ? '' : 's'}</div>

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

export function RewardsPerks() {
  const [filter, setFilter] = useState('all')
  const [drawerRewards, setDrawerRewards] = useState(null)

  const summary = useMemo(() => {
    const available = ALL_REWARDS.filter((reward) => reward.status === REWARD_STATUS.AVAILABLE || reward.status === REWARD_STATUS.EXPIRING).length
    const questions = QUESTION_REWARDS.filter((reward) => reward.status === REWARD_STATUS.AVAILABLE || reward.status === REWARD_STATUS.EXPIRING).length
    const appointments = APPOINTMENT_REWARDS.filter((reward) => reward.status === REWARD_STATUS.AVAILABLE || reward.status === REWARD_STATUS.EXPIRING).length
    const expiring = ALL_REWARDS.filter((reward) => reward.status === REWARD_STATUS.EXPIRING).length
    return { available, questions, appointments, expiring }
  }, [])

  const expiringItems = useMemo(
    () => ALL_REWARDS.filter((reward) => reward.status === REWARD_STATUS.EXPIRING).slice(0, 4),
    [],
  )

  const filtered = useMemo(
    () => (filter === 'all' ? ALL_REWARDS : ALL_REWARDS.filter((reward) => reward.category === filter)),
    [filter],
  )
  const questionRewards = filtered.filter((reward) => reward.category === 'questions')
  const appointmentRewards = filtered.filter((reward) => reward.category === 'appointments')
  const contentRewards = filtered.filter((reward) => reward.category === 'content')

  const openDrawer = (reward) => {
    const all = ALL_REWARDS.filter((item) => item.astrologerId === reward.astrologerId)
    setDrawerRewards({ astrologerId: reward.astrologerId, rewards: all })
  }

  return (
    <div className="rewards-center">
      <ExpiringBanner items={expiringItems} />

      <div className="reward-summary-grid">
        <SummaryCard icon={Gift} value={summary.available} label="Available Rewards" hint="Ready to use" tone="violet" />
        <SummaryCard icon={MessageSquareText} value={summary.questions} label="Free Questions" hint="Including discount questions" tone="gold" />
        <SummaryCard icon={CalendarCheck} value={summary.appointments} label="Appointment Rewards" hint="Discounts & priority slots" tone="green" />
        <SummaryCard icon={AlertTriangle} value={summary.expiring} label="Expiring Soon" hint="Use before they are lost" tone="red" />
      </div>

      <div className="reward-filter" role="tablist" aria-label="Filter rewards">
        {FILTER_TABS.map((tab) => (
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

      <div className="reward-results">
        {filter === 'all' && (
          <>
            <QuestionSection rewards={questionRewards} openDrawer={openDrawer} onViewMore={() => setFilter('questions')} />
            <AppointmentSection rewards={appointmentRewards} openDrawer={openDrawer} onViewMore={() => setFilter('appointments')} />
            <ContentSection rewards={contentRewards} openDrawer={openDrawer} onViewMore={() => setFilter('content')} />
          </>
        )}
        {filter === 'questions' && <QuestionSection rewards={questionRewards} openDrawer={openDrawer} expand />}
        {filter === 'appointments' && <AppointmentSection rewards={appointmentRewards} openDrawer={openDrawer} expand />}
        {filter === 'content' && <ContentSection rewards={contentRewards} openDrawer={openDrawer} expand />}
      </div>

      {drawerRewards && (
        <RewardDrawer
          astrologerId={drawerRewards.astrologerId}
          rewards={drawerRewards.rewards}
          onClose={() => setDrawerRewards(null)}
        />
      )}
    </div>
  )
}

export function RewardsBenefits() {
  const summary = useMemo(() => {
    const available = BENEFIT_REWARDS.filter((reward) => reward.status === REWARD_STATUS.AVAILABLE || reward.status === REWARD_STATUS.EXPIRING).length
    const subscriber = BENEFIT_REWARDS.filter((reward) => reward.status === REWARD_STATUS.SUBSCRIBER || reward.status === REWARD_STATUS.LOCKED).length
    const expiring = BENEFIT_REWARDS.filter((reward) => reward.status === REWARD_STATUS.EXPIRING).length
    return { available, subscriber, expiring }
  }, [])

  const expiringItems = useMemo(
    () => BENEFIT_REWARDS.filter((reward) => reward.status === REWARD_STATUS.EXPIRING).slice(0, 4),
    [],
  )

  return (
    <div className="rewards-center">
      <ExpiringBanner items={expiringItems} />
      <div className="reward-summary-grid">
        <SummaryCard icon={Ticket} value={summary.available} label="Active Benefits" hint="Ready to redeem" tone="violet" />
        <SummaryCard icon={Sparkles} value={summary.subscriber} label="Subscriber Perks" hint="Unlocked with your subscription" tone="gold" />
        <SummaryCard icon={MessageSquareText} value={1} label="Monthly Question" hint="Every subscription cycle" tone="green" />
        <SummaryCard icon={AlertTriangle} value={summary.expiring} label="Expiring Soon" hint="Redeem before they are lost" tone="red" />
      </div>
      <BenefitSection rewards={BENEFIT_REWARDS} expand />
    </div>
  )
}

export function RewardsShell() {
  return (
    <div>
      <PageHeader
        eyebrow="User portal"
        title="Rewards Center"
        subtitle="Your exclusive rewards from the astrologers you follow and subscribe to."
      />
      <Outlet />
    </div>
  )
}

export default RewardsShell
