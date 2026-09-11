import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  ChevronLeft,
  Clock3,
  Crown,
  Eye,
  Gift,
  Lock,
  MicOff,
  Play,
  Radio,
  Search,
  Send,
  Sparkles,
  Users,
  Video,
} from 'lucide-react'
import './userlive.css'
import Card from '../../../components/ui/Card.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import { mockAstrologers } from '../../../data/notificationData.js'
import { useAuth } from '../../../state/AuthContext.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

const ASTROLOGER_NAMES = Object.fromEntries(mockAstrologers.map((astrologer) => [astrologer.id, astrologer.name]))

const TIER_RANK = { silver: 1, gold: 2, platinum: 3, pro: 3 }
const TIER_LABELS = { silver: 'Silver', gold: 'Gold', pro: 'Pro' }

const INITIAL_CHAT = [
  { id: 'chat-1', time: 'now', name: 'Vikram P.', text: 'Sir, please check my career timing this year.' },
  { id: 'chat-2', time: 'now', name: 'Meera K.', text: 'Loving this session, very clear guidance!' },
  { id: 'chat-3', time: 'now', name: 'Rohit S.', text: 'Is 4th house Saturn affecting marriage?' },
]

function astrologerNameFor(astrologerId) {
  return ASTROLOGER_NAMES[astrologerId] || 'Astrologer'
}

function initials(name) {
  return String(name || 'Astrologer')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatSchedule(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: 'numeric',
  })
}

function startedAgo(value) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1m ago'
  return `${minutes}m ago`
}

function formatDuration(seconds) {
  const safe = Math.max(0, seconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remaining = safe % 60
  return [hours, minutes, remaining].map((part) => String(part).padStart(2, '0')).join(':')
}

function audienceMeta(session) {
  const audience = session.audience || 'public'
  if (audience === 'subscribers') {
    return {
      label: session.subscriberTier ? `Subscribers · ${TIER_LABELS[session.subscriberTier] || session.subscriberTier}` : 'Subscribers only',
      tone: 'subscribers',
    }
  }
  if (audience === 'followers') return { label: 'Followers only', tone: 'followers' }
  return { label: 'Public', tone: 'public' }
}

function resolveAccess(session, { userId, followedAstrologerIds = [], subscriptions = [] } = {}) {
  const audience = session.audience || 'public'
  const activeSub = subscriptions.some(
    (subscription) =>
      subscription.userId === userId &&
      subscription.astrologerId === session.astrologerId &&
      (!subscription.expiresAt || new Date(subscription.expiresAt).getTime() > Date.now()),
  )

  if (audience === 'public') return { allowed: true }

  if (audience === 'followers') {
    const following = followedAstrologerIds.includes(session.astrologerId)
    return following
      ? { allowed: true }
      : { allowed: false, reason: 'This is a followers-only live. Follow the astrologer to join.', cta: 'follow', ctaLabel: 'Follow to Join' }
  }

  if (audience === 'subscribers') {
    if (!activeSub) {
      return { allowed: false, reason: 'This is a subscriber-only live. Subscribe to join this session.', cta: 'subscribe', ctaLabel: 'Subscribe to Join' }
    }
    const required = TIER_RANK[session.subscriberTier] || 1
    const subscription = subscriptions.find(
      (entry) => entry.userId === userId && entry.astrologerId === session.astrologerId,
    )
    const owned = TIER_RANK[(subscription?.tier || 'silver').toLowerCase()] || 1
    if (owned < required) {
      return {
        allowed: false,
        reason: `This session requires a ${TIER_LABELS[session.subscriberTier] || 'higher'} subscription to join.`,
        cta: 'upgrade',
        ctaLabel: `Upgrade to ${TIER_LABELS[session.subscriberTier] || 'Pro'}`,
      }
    }
    return { allowed: true }
  }

  return { allowed: false, reason: 'This session is not available to you.', cta: 'subscribe', ctaLabel: 'Learn More' }
}

function statusMeta(session) {
  if (session.status === 'live') return { label: 'Live now', tone: 'live' }
  if (session.status === 'upcoming') return { label: 'Upcoming', tone: 'upcoming' }
  return { label: 'Past', tone: 'past' }
}

function UserLiveSessionCard({ session, access }) {
  const status = statusMeta(session)
  const audience = audienceMeta(session)
  const astrologerId = session.astrologerId
  const to = `/user/live-session?id=${session.id}`

  let actionLabel
  let actionIcon = null
  if (session.status === 'live') {
    actionLabel = access.allowed ? 'Join Live' : 'View Session'
    actionIcon = access.allowed ? <Play size={15} /> : <Lock size={15} />
  } else if (session.status === 'upcoming') {
    actionLabel = 'Set Reminder'
    actionIcon = <BellRing size={15} />
  } else {
    actionLabel = 'View Replay'
    actionIcon = <Play size={15} />
  }

  return (
    <Link to={to} className={`user-live-card${access.allowed ? '' : ' is-locked'}`}>
      <div className="user-live-card__top">
        <span className={`user-live-status user-live-status--${status.tone}`}><span /> {status.label}</span>
        <span className={`user-live-audience user-live-audience--${audience.tone}`}>
          {audience.tone === 'subscribers' ? <Crown size={12} /> : audience.tone === 'followers' ? <Users size={12} /> : <Radio size={12} />}
          {audience.label}
        </span>
      </div>

      <h3 className="user-live-card__title">{session.title}</h3>

      <div className="user-live-card__astro">
        <span className="user-live-avatar">{initials(astrologerNameFor(astrologerId))}</span>
        <span>
          <strong>{astrologerNameFor(astrologerId)}</strong>
          <small>{session.category}</small>
        </span>
      </div>

      <div className="user-live-card__meta">
        {session.status === 'live' && session.startedAt ? (
          <span><Clock3 size={14} /> Started {startedAgo(session.startedAt)}</span>
        ) : (
          <span><Clock3 size={14} /> {session.status === 'upcoming' ? 'Starts' : 'Held on'} {formatSchedule(session.scheduledStartAt)}</span>
        )}
        <span><Video size={14} /> ₹{session.rate}/min</span>
      </div>

      <div className="user-live-card__footer">
        <span className="user-live-card__hint">
          {!access.allowed && session.status === 'live' ? access.ctaLabel : session.status === 'upcoming' ? 'Free to join' : session.description}
        </span>
        <span className={`user-live-card__action${access.allowed ? '' : ' is-locked'}`}>{actionIcon} {actionLabel} <ArrowRight size={14} /></span>
      </div>
    </Link>
  )
}

function UserLiveRoom({ session, onBack }) {
  const { currentUser } = useAuth()
  const { followedAstrologerIds, subscriptions } = useAppData()

  const isLive = session.status === 'live'
  const isUpcoming = session.status === 'upcoming'
  const access = resolveAccess(session, {
    userId: currentUser?.id,
    followedAstrologerIds,
    subscriptions,
  })

  const astrologerId = session.astrologerId
  const astrologerName = astrologerNameFor(astrologerId)
  const status = statusMeta(session)
  const audience = audienceMeta(session)

  const [nowMs, setNowMs] = useState(Date.now())
  const [viewers, setViewers] = useState(1240 + Math.floor(Math.random() * 180))
  const [chat, setChat] = useState(INITIAL_CHAT)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!isLive) return undefined
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
      setViewers((current) => current + (Math.random() > 0.35 ? 1 : 0) + Math.floor(Math.random() * 2))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isLive])

  const durationSeconds = isLive && session.startedAt
    ? Math.max(0, Math.floor((nowMs - new Date(session.startedAt).getTime()) / 1000))
    : 0

  const submitChat = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setChat((current) => [...current, { id: `mine-${Date.now()}`, time: 'now', name: currentUser?.name || 'You', text, mine: true }])
    setDraft('')
  }

  const ctaHref = access.cta ? `/user/astrologer/${astrologerId}` : null

  return (
    <div className="user-live-room">
      <header className="user-live-room__header">
        <button type="button" className="user-live-back" onClick={onBack}>
          <ChevronLeft size={16} /> Live Sessions
        </button>
        <div className="user-live-room__identity">
          <span className="user-live-room__avatar">{initials(astrologerName)}</span>
          <div>
            <strong>{astrologerName}</strong>
            <small>{session.category}</small>
          </div>
        </div>
        <div className="user-live-room__header-meta">
          <span className={`user-live-status user-live-status--${status.tone}`}><span /> {status.label}</span>
          <span className={`user-live-audience user-live-audience--${audience.tone}`}>
            {audience.tone === 'subscribers' ? <Crown size={12} /> : audience.tone === 'followers' ? <Users size={12} /> : <Radio size={12} />}
            {audience.label}
          </span>
        </div>
      </header>

      <div className="user-live-room__title">
        <h1>{session.title}</h1>
        <p>{session.status === 'live' && session.startedAt ? `Started ${startedAgo(session.startedAt)}` : formatSchedule(session.scheduledStartAt)}</p>
      </div>

      <div className="user-live-room-grid">
        <div className="user-live-room__main">
          <section className="user-live-stage">
            <div className="user-live-stage__feed">
              <div className="user-live-stage__glow" />
              <Radio size={40} className="user-live-stage__icon" />
              {isLive && (
                <span className="user-live-stage__livepill"><span /> LIVE</span>
              )}
              {session.status === 'live' ? (
                <div className="user-live-stage__stats">
                  <span><Eye size={14} /> {viewers.toLocaleString()} watching</span>
                  {durationSeconds > 0 && <span><Clock3 size={14} /> {formatDuration(durationSeconds)}</span>}
                </div>
              ) : (
                <div className="user-live-stage__stats">
                  <span>{isUpcoming ? 'Session has not started yet.' : 'Recording ended.'}</span>
                </div>
              )}
            </div>

            {isLive && !access.allowed && (
              <div className="user-live-stage__lock">
                <span className="user-live-stage__lock-icon"><Lock size={22} /></span>
                <strong>You cannot join this live yet</strong>
                <p>{access.reason}</p>
                {ctaHref && (
                  <Link to={ctaHref} className="btn btn-primary">
                    {access.ctaLabel} <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            )}

            {!isLive && (
              <div className="user-live-stage__notice">
                <Sparkles size={22} />
                <strong>{isUpcoming ? 'Reminder set' : 'Session finished'}</strong>
                <p>{isUpcoming ? 'We will notify you when the astrologer goes live.' : `Replay of this session will be available for ${session.audience === 'public' ? 'everyone' : audience.label}.`}</p>
                <button type="button" className="btn btn-primary">
                  <BellRing size={15} /> {isUpcoming ? 'Set Reminder' : 'Watch Replay'}
                </button>
              </div>
            )}
          </section>

          <Card className="user-live-chat">
            <div className="user-live-panel-heading">
              <span><MessageTarget /> Live chat</span>
              <span className="muted">{chat.length} messages</span>
            </div>
            <div className="user-live-chat__list">
              {chat.map((message) => (
                <div key={message.id} className={`user-live-chat__message${message.mine ? ' is-mine' : ''}`}>
                  <strong>{message.name}:</strong>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
            {session.status === 'live' ? (
              <form className="user-live-chat__composer" onSubmit={submitChat}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask a question in the live chat..."
                  aria-label="Live chat message"
                />
                <button type="submit" className="btn btn-primary" aria-label="Send message" disabled={!draft.trim()}>
                  <Send size={15} />
                </button>
              </form>
            ) : (
              <div className="user-live-chat__closed">Chat opens when the session goes live.</div>
            )}
          </Card>
        </div>

        <aside className="user-live-room__side">
          <Card className="user-live-info">
            <span className="user-live-eyebrow">Session details</span>
            <h2>{session.title}</h2>
            <p>{session.description || 'Join this live session for direct guidance from the astrologer.'}</p>
            <dl className="user-live-info__list">
              <div><dt>Astrologer</dt><dd>{astrologerName}</dd></div>
              <div><dt>Category</dt><dd>{session.category}</dd></div>
              <div><dt>Rate</dt><dd>₹{session.rate}/min</dd></div>
              <div><dt>Audience</dt><dd>{audience.label}</dd></div>
            </dl>
          </Card>

          <Card className="user-live-access">
            <span className="user-live-eyebrow">Your access</span>
            <strong className={`user-live-access__state ${access.allowed ? 'is-allowed' : 'is-blocked'}`}>
              {access.allowed ? 'Unlocked' : 'Locked'}
            </strong>
            <p>{access.allowed ? `You can join this ${status.tone} session.` : access.reason}</p>
            {ctaHref && (
              <Link to={ctaHref} className="btn btn-outline">
                {access.ctaLabel} <ArrowRight size={15} />
              </Link>
            )}
          </Card>

          <Card className="user-live-help">
            <Gift size={17} />
            <div>
              <strong>Send a virtual gift</strong>
              <small>Support the astrologer during the live session.</small>
            </div>
          </Card>

          <Card className="user-live-help">
            <MicOff size={17} />
            <div>
              <strong>Ask a premium question</strong>
              <small>Get a private answer without interrupting the live.</small>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function MessageTarget() {
  return <span className="user-live-message-target">•••</span>
}

export default function LiveSession() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const { astrologerLiveSessions, followedAstrologerIds, subscriptions } = useAppData()

  const sessionId = searchParams.get('id')
  const liveCount = astrologerLiveSessions.filter((session) => session.status === 'live').length
  const upcomingCount = astrologerLiveSessions.filter((session) => session.status === 'upcoming').length
  const pastCount = astrologerLiveSessions.filter((session) => session.status === 'past').length
  const session = useMemo(
    () => astrologerLiveSessions.find((item) => item.id === sessionId) || null,
    [astrologerLiveSessions, sessionId],
  )

  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const availableCategories = useMemo(() => {
    const seen = new Set()
    const list = []
    astrologerLiveSessions.forEach((item) => {
      const name = String(item.category || '').trim()
      if (name && !seen.has(name)) {
        seen.add(name)
        list.push(name)
      }
    })
    return list
  }, [astrologerLiveSessions])

  const visibleSessions = useMemo(() => {
    const rank = { live: 0, upcoming: 1, past: 2 }
    const normalizedQuery = query.trim().toLowerCase()
    return astrologerLiveSessions
      .filter((item) => tab === 'all' || item.status === tab)
      .filter((item) => category === 'all' || String(item.category || '').trim().toLowerCase() === category.toLowerCase())
      .filter((item) => {
        if (!normalizedQuery) return true
        const haystack = [
          item.title,
          item.description,
          item.category,
          astrologerNameFor(item.astrologerId),
        ].join(' ').toLowerCase()
        const words = normalizedQuery.split(/\s+/)
        return words.every((word) => haystack.includes(word))
      })
      .slice()
      .sort((a, b) => {
        const order = rank[a.status] - rank[b.status]
        if (order) return order
        if (a.status === 'upcoming') return new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt)
        return new Date(b.scheduledEndAt || b.scheduledStartAt) - new Date(a.scheduledEndAt || a.scheduledStartAt)
      })
  }, [astrologerLiveSessions, tab, query, category])

  if (session) {
    return <UserLiveRoom session={session} onBack={() => setSearchParams({}, { replace: true })} />
  }

  return (
    <div className="user-live-page">
      <PageHeader eyebrow="User portal" title="Live Sessions" showBack backTo={routes.dashboard} />

      {liveCount > 0 && (
        <div className="user-live-hero">
          <span className="user-live-hero__icon"><Radio size={20} /></span>
          <div>
            <strong>{liveCount} {liveCount === 1 ? 'astrologer is' : 'astrologers are'} live right now</strong>
            <small>Join a session to ask questions and receive guidance in real time.</small>
          </div>
        </div>
      )}

      <div className="user-live-controls">
        <div className="user-live-tabs" role="tablist" aria-label="Filter live sessions">
          {[
            { key: 'all', label: 'All', count: astrologerLiveSessions.length },
            { key: 'live', label: 'Live now', count: liveCount },
            { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
            { key: 'past', label: 'Past', count: pastCount },
          ].map((tabItem) => (
            <button
              key={tabItem.key}
              type="button"
              role="tab"
              aria-selected={tab === tabItem.key}
              className={`user-live-tab${tab === tabItem.key ? ' is-active' : ''}`}
              onClick={() => setTab(tabItem.key)}
            >
              {tabItem.label}
              {tabItem.count > 0 && <span className="user-live-tab__count">{tabItem.count}</span>}
            </button>
          ))}
        </div>

        <div className="user-live-toolbar">
          <label className="user-live-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search live sessions by topic, astrologer, or category..."
              aria-label="Search live sessions"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                ×
              </button>
            )}
          </label>
          {availableCategories.length > 1 && (
            <div className="user-live-chips" role="group" aria-label="Filter by category">
              <button
                type="button"
                className={`user-live-chip${category === 'all' ? ' is-active' : ''}`}
                onClick={() => setCategory('all')}
              >
                All topics
              </button>
              {availableCategories.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`user-live-chip${category === name ? ' is-active' : ''}`}
                  onClick={() => setCategory(category === name ? 'all' : name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {visibleSessions.length ? (
        <div className="user-live-grid">
          {visibleSessions.map((item) => (
            <UserLiveSessionCard
              key={item.id}
              session={item}
              access={resolveAccess(item, { userId: currentUser?.id, followedAstrologerIds, subscriptions })}
            />
          ))}
        </div>
      ) : (
        <Card className="user-live-empty">
          <Search size={22} />
          <strong>No sessions match your filters</strong>
          <p>{query ? `Nothing found for “${query}”.` : 'Try a different category or tab.'}</p>
        </Card>
      )}
    </div>
  )
}