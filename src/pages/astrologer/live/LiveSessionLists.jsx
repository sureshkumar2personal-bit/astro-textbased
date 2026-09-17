import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  Clock3,
  Crown,
  Globe,
  History,
  IndianRupee,
  Lock,
  Pencil,
  Play,
  Radio,
  Users,
  Video,
  X,
} from 'lucide-react'
import Card from '../../../components/ui/Card.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { sessionAudiences, useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

const SCHEDULE_CATEGORIES = ['Vedic Astrology', 'Tarot Card Reading', 'Numerology', 'Other']
const SCHEDULE_AUDIENCE = [
  { value: 'public', label: 'Public', hint: 'Anyone can join' },
  { value: 'followers', label: 'Followers', hint: 'Only users following you' },
  { value: 'subscribers', label: 'Subscribers', hint: 'Only paid subscribers' },
]
const SCHEDULE_TIERS = ['Silver', 'Gold', 'Pro']
const SCHEDULE_DEFAULT_RATE = '45'

function localDateTime(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}

const AUDIENCE_LABELS = {
  public: 'Public',
  followers: 'Followers only',
  subscribers: 'Subscribers',
}

function audienceEntries(session) {
  const list = sessionAudiences(session)
  const labelFor = (audience) => {
    if (audience === 'subscribers') {
      const tier = String(session.subscriberTier || '').trim()
      return `Subscribers${tier ? ` · ${tier[0].toUpperCase()}${tier.slice(1)}` : ''}`
    }
    return AUDIENCE_LABELS[audience] || AUDIENCE_LABELS.public
  }
  return list.map((audience) => ({ audience, label: labelFor(audience) }))
}

function audienceLabel(session) {
  const entries = audienceEntries(session)
  if (entries.length === 1 && entries[0].audience === 'followers') return 'Followers only'
  return entries.map((entry) => entry.label).join(' + ')
}

function AudienceIcon({ session, size = 14 }) {
  const list = sessionAudiences(session)
  const restrictive = list.includes('subscribers') ? 'subscribers' : list.includes('followers') ? 'followers' : 'public'
  if (restrictive === 'subscribers') return <Crown size={size} />
  if (restrictive === 'followers') return <Users size={size} />
  return <Radio size={size} />
}

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatTimeRange(start, end, fallback) {
  const startTime = formatTime(start)
  const endTime = formatTime(end === start ? fallback : end)
  if (startTime === '—' && endTime === '—') return '—'
  return `${startTime} – ${endTime}`
}

function formatRupees(value) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
}

function sessionJoined(session) {
  return {
    publicCount: Number(session.joinedPublic) || 0,
    followerCount: Number(session.joinedFollowers) || 0,
    subscriberCount: Number(session.joinedSubscribers) || 0,
  }
}

function durationMinutes(startedAt, endedAt) {
  const start = startedAt ? new Date(startedAt).getTime() : NaN
  const end = endedAt ? new Date(endedAt).getTime() : NaN
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null
  return Math.max(1, Math.round((end - start) / 60000))
}

function upcomingScheduleStatus(scheduledStartAt) {
  const days = (new Date(scheduledStartAt).getTime() - Date.now()) / 86400000
  if (days > 5) return { label: 'Ready', tone: 'green' }
  if (days > 2) return { label: 'Coming soon', tone: 'yellow' }
  return { label: 'Starts soon', tone: 'red' }
}

function scheduleAction(scheduledStartAt) {
  const now = Date.now()
  const start = new Date(scheduledStartAt).getTime()
  if (!Number.isFinite(start)) return { label: 'Edit', disabled: false }
  const sessionDay = new Date(start)
  sessionDay.setHours(0, 0, 0, 0)
  if (now >= start) return { label: 'Start Live', disabled: false }
  if (now >= sessionDay.getTime()) return { label: 'Edit', disabled: true }
  return { label: 'Edit', disabled: false }
}

function useMyLiveSessions() {
  const { currentUser } = useAuth()
  const { astrologerLiveSessions, actions } = useAppData()

  const astrologerIds = useMemo(() => {
    const ids = new Set()
    if (currentUser?.id) ids.add(currentUser.id)
    if (currentUser?.id === 'astrologer-demo-alias') ids.add('astrologer-demo')
    return ids
  }, [currentUser?.id])

  return { astrologerLiveSessions, astrologerIds, actions }
}

function UpcomingLiveCard({ session, onEdit, onGoLive }) {
  const status = upcomingScheduleStatus(session.scheduledStartAt)
  const action = scheduleAction(session.scheduledStartAt)
  return (
    <Card className={`live-list-card live-list-card--${status.tone}`}>
      <div className="live-list-card__top">
        <span className={`live-list-bubble live-list-bubble--${status.tone}`}>
          <span className="live-list-bubble__dot" />
          {status.label}
        </span>
        <span className="live-list-audience">
          <AudienceIcon session={session} />
          {audienceLabel(session)}
        </span>
      </div>
      <h3>{session.title}</h3>
      <p className="live-list-card__desc">{session.description || 'Live astrology guidance session.'}</p>
      <dl className="live-list-details">
        <div>
          <dt>Starts</dt>
          <dd><Clock3 size={13} /> {formatWhen(session.scheduledStartAt)}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{session.category}</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd><Video size={13} /> ₹{session.rate}/min</dd>
        </div>
      </dl>
      <div className="live-list-card__actions">
        {action.label === 'Start Live' ? (
          <button type="button" className="btn btn-primary" onClick={onGoLive}>
            <Play size={15} /> Start Live
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            disabled={action.disabled}
            onClick={onEdit}
            title={action.disabled ? 'Editing locks once the session day starts.' : 'Edit session'}
          >
            <Pencil size={15} /> Edit
          </button>
        )}
      </div>
    </Card>
  )
}

function PastLiveCard({ session, onClick }) {
  const heldOn = session.endedAt || session.scheduledEndAt
  const joined = sessionJoined(session)
  const joinedTotal = joined.publicCount + joined.followerCount + joined.subscriberCount

  return (
    <Card
      as="button"
      type="button"
      className="live-list-card live-list-card--past live-list-card--clickable"
      onClick={onClick}
      title="View full details"
    >
      <div className="live-list-card__top">
        <StatusBadge label="Completed" />
        <span className="live-list-audience">
          <AudienceIcon session={session} />
          {audienceLabel(session)}
        </span>
      </div>
      <span className="live-list-card__title">{session.title}</span>
      <p className="live-list-card__date"><CalendarClock size={13} /> {formatDate(heldOn)}</p>
      <div className="live-list-card__footer">
        <span className="live-list-card__viewers"><Users size={13} /> {joinedTotal} viewers</span>
        <span className="live-list-card__more">View details <ChevronRight size={14} /></span>
      </div>
    </Card>
  )
}

function PastLiveDetailsModal({ session, onClose, onReplay }) {
  const minutes = durationMinutes(session.startedAt, session.endedAt)
  const heldOn = session.endedAt || session.scheduledEndAt
  const startedOn = session.startedAt || session.scheduledStartAt
  const joined = sessionJoined(session)
  const joinedTotal = joined.publicCount + joined.followerCount + joined.subscriberCount

  return createPortal(
    <div className="live-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="live-config-modal" role="dialog" aria-modal="true" aria-label="Past live session details">
        <div className="live-config-header">
          <div>
            <span className="live-eyebrow">Live history details</span>
            <h2>{session.title}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="live-config-body">
          {session.description ? (
            <p className="live-list-card__desc">{session.description}</p>
          ) : null}
          <dl className="live-list-details live-detail-grid">
            <div>
              <dt>Date</dt>
              <dd><CalendarClock size={13} /> {formatDate(heldOn)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd><Clock3 size={13} /> {formatTimeRange(startedOn, heldOn, session.scheduledEndAt)}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd><Video size={13} /> {minutes ? `${minutes} min` : '—'}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{session.category || 'Vedic Astrology'}</dd>
            </div>
            <div>
              <dt>Audience</dt>
              <dd className="live-list-audience"><AudienceIcon session={session} /> {audienceLabel(session)}</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>₹{session.rate || '—'}/min</dd>
            </div>
          </dl>

          <fieldset className="live-fieldset">
            <legend>Viewers joined</legend>
            <div className="live-detail-joined">
              <div><Globe size={16} /> {joined.publicCount}<small>Public</small></div>
              <div><Users size={16} /> {joined.followerCount}<small>Followers</small></div>
              <div><Crown size={16} /> {joined.subscriberCount}<small>Subscribers</small></div>
              <div className="is-total"><Users size={16} /> {joinedTotal}<small>Total viewers</small></div>
            </div>
          </fieldset>

          <div className="live-detail-earnings">
            <span>Money earned from this live</span>
            <strong><IndianRupee size={18} /> {formatRupees(session.earnings)}</strong>
          </div>
        </div>

        <div className="live-config-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary" onClick={onReplay}><Play size={15} /> View Replay</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ScheduleLiveModal({ onClose, onCreate }) {
  const [formError, setFormError] = useState('')
  const [tierError, setTierError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(SCHEDULE_CATEGORIES[0])
  const [freeQuestions, setFreeQuestions] = useState(true)
  const [premiumQueue, setPremiumQueue] = useState(true)
  const [rate, setRate] = useState(SCHEDULE_DEFAULT_RATE)
  const [audiences, setAudiences] = useState(['public'])
  const [subscriberTier, setSubscriberTier] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [scheduledStartAt, setScheduledStartAt] = useState(() => localDateTime(new Date(Date.now() + 60 * 60 * 1000)))
  const [duration, setDuration] = useState('1')
  const [accessOpen, setAccessOpen] = useState(false)
  const [commentAccess, setCommentAccess] = useState([])
  const [recordAccess, setRecordAccess] = useState([])

  const accessOptionsFor = (selected) => {
    const list = Array.isArray(selected) ? selected : [selected || 'public']
    const hasPublic = list.includes('public')
    const hasFollowers = list.includes('followers')
    const hasSubscribers = list.includes('subscribers')
    const options = []
    if (hasPublic) options.push({ value: 'public', label: 'Public' })
    if (hasPublic || hasFollowers) options.push({ value: 'followers', label: 'Followers' })
    if (hasPublic || hasFollowers || hasSubscribers) options.push({ value: 'subscribers', label: 'Subscribers' })
    if (hasSubscribers) {
      SCHEDULE_TIERS.forEach((tier) => options.push({ value: tier.toLowerCase(), label: tier }))
    }
    return options
  }

  const subscribersOnly = audiences.length === 1 && audiences[0] === 'subscribers'

  const accessComplete = Boolean(
    audiences.length > 0 &&
    (!audiences.includes('subscribers') || subscriberTier) &&
    commentAccess.length > 0 &&
    recordAccess.length > 0,
  )

  const toggleAccess = (setter, protectedValue) => (value) => {
    setter((prev) => {
      if (prev.includes(value)) {
        return value === protectedValue ? prev : prev.filter((item) => item !== value)
      }
      return [...prev, value]
    })
  }

  const accessGroup = (group, setter, protectedValue) => (
    <div className="live-access-options live-access-options--multi">
      {accessOptionsFor(audiences).map((option) => (
        <button
          type="button"
          key={option.value}
          className={`live-access-option${group.includes(option.value) ? ' is-selected' : ''}${protectedValue === option.value ? ' is-locked' : ''}`}
          onClick={() => toggleAccess(setter, protectedValue)(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )

  const handleJoinTier = (tier) => {
    const value = tier.toLowerCase()
    const previous = subscriberTier
    setSubscriberTier(value)
    setTierError('')
    setCommentAccess((prev) => Array.from(new Set(prev.filter((item) => item !== previous).concat(value))))
    setRecordAccess((prev) => Array.from(new Set(prev.filter((item) => item !== previous).concat(value))))
  }

  const handleAudience = (value) => {
    setTierError('')
    const next = audiences.includes(value) ? audiences.filter((item) => item !== value) : [...audiences, value]
    const effective = next.length ? next : ['public']
    if (!next.includes('subscribers')) setSubscriberTier('')
    const valid = accessOptionsFor(effective).map((option) => option.value)
    setCommentAccess((prev) => prev.filter((item) => valid.includes(item)))
    setRecordAccess((prev) => prev.filter((item) => valid.includes(item)))
    setAudiences(effective)
  }

  const submit = (event) => {
    event.preventDefault()
    setFormError('')
    if (!title.trim()) {
      setFormError('Add a title for this scheduled live session.')
      return
    }
    if (audiences.includes('subscribers') && !subscriberTier) {
      setTierError('Select a subscription tier for this live session.')
      return
    }
    if (!accessComplete) {
      setFormError('Choose who can comment and who can record the live session.')
      return
    }
    const start = new Date(scheduledStartAt)
    const hours = Number(duration)
    if (Number.isNaN(start.getTime())) {
      setFormError('Choose the start date and time for the session.')
      return
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      setFormError('Enter the duration of the session in hours.')
      return
    }
    if (start <= Date.now()) {
      setFormError('The scheduled start time should be in the future.')
      return
    }
    if (category === 'Other' && !customCategory.trim()) {
      setFormError('Name your custom category before scheduling the live.')
      return
    }
    onCreate({
      title: title.trim(),
      description: description.trim(),
      category: category === 'Other' ? customCategory.trim() : category,
      freeQuestions,
      premiumQueue,
      rate,
      audiences,
      audience: audiences[0],
      subscriberTier: audiences.includes('subscribers') ? subscriberTier : '',
      scheduledStartAt: start.toISOString(),
      scheduledEndAt: new Date(start.getTime() + hours * 60 * 60 * 1000).toISOString(),
      commentAccess,
      recordAccess,
    })
  }

  return createPortal(
    <div className="live-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="live-config-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Schedule live session">
        <div className="live-config-header">
          <div>
            <span className="live-eyebrow">Schedule a live session</span>
            <h2>Plan your broadcast</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="live-config-body">
          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Stream title</span>
            <input
              className="text-input"
              value={title}
              onChange={(event) => { setFormError(''); setTitle(event.target.value) }}
              placeholder="Career & Marriage Remedies: Scheduled Q&A"
            />
          </label>

          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Description <span className="muted">(optional)</span></span>
            <textarea
              className="text-input"
              rows="2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What will you cover in this live?"
            />
          </label>

          <fieldset className="live-fieldset">
            <legend>Primary category</legend>
            <div className="live-category-grid">
              {SCHEDULE_CATEGORIES.map((name) => (
                <label key={name} className={`live-category-option${category === name ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="schedule-category"
                    value={name}
                    checked={category === name}
                    onChange={() => setCategory(name)}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
            {category === 'Other' && (
              <label className="field-group live-custom-category" style={{ margin: 0 }}>
                <span className="field-label-top">Custom category name</span>
                <input
                  className="text-input"
                  value={customCategory}
                  onChange={(event) => { setFormError(''); setCustomCategory(event.target.value) }}
                  placeholder="e.g. Palm Reading, Gemstone Advice"
                  maxLength={40}
                />
              </label>
            )}
          </fieldset>

          <label className="field-group" style={{ margin: 0 }}>
            <span className="field-label-top">Scheduled start <span className="muted">(required)</span></span>
            <input
              type="datetime-local"
              className="text-input"
              value={scheduledStartAt}
              onChange={(event) => { setFormError(''); setScheduledStartAt(event.target.value) }}
            />
          </label>

          <label className="field-group live-duration-field" style={{ margin: 0 }}>
            <span className="field-label-top">Duration</span>
            <select
              className="select-input"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            >
              <option value="0.5">30 minutes</option>
              <option value="1">1 hour</option>
              <option value="1.5">1 hour 30 minutes</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
            </select>
          </label>

          <fieldset className="live-fieldset">
            <legend>Live consultation mode</legend>
            <label className="live-toggle-row">
              <span>
                <strong>Enable free mini-questions</strong>
                <small>Let new viewers ask a short public question.</small>
              </span>
              <input type="checkbox" checked={freeQuestions} onChange={(event) => setFreeQuestions(event.target.checked)} />
            </label>
            <label className="live-toggle-row">
              <span>
                <strong>Enable premium queue</strong>
                <small>Paid consultations are added to your priority queue.</small>
              </span>
              <input type="checkbox" checked={premiumQueue} onChange={(event) => setPremiumQueue(event.target.checked)} />
            </label>
            {premiumQueue && (
              <label className="field-group live-rate-field">
                <span className="field-label-top">Premium rate (₹ / min)</span>
                <input
                  type="number"
                  min="1"
                  className="text-input"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                />
              </label>
            )}
          </fieldset>

          <fieldset className="live-fieldset">
            <legend>Who can join <span className="muted">(choose many)</span></legend>
            {SCHEDULE_AUDIENCE.map((option) => (
              <label key={option.value} className={`live-audience-option${audiences.includes(option.value) ? ' is-selected' : ''}`}>
                <input
                  type="checkbox"
                  value={option.value}
                  checked={audiences.includes(option.value)}
                  onChange={() => handleAudience(option.value)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
              </label>
            ))}
            {audiences.includes('subscribers') && (
              <div className="live-audience-tiers">
                {SCHEDULE_TIERS.map((tier) => (
                  <button
                    type="button"
                    key={tier}
                    className={`live-audience-tier${subscriberTier === tier.toLowerCase() ? ' is-selected' : ''}`}
                    onClick={() => handleJoinTier(tier)}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            )}
            {tierError && <div className="live-audience-error">{tierError}</div>}
          </fieldset>

          {formError && <div className="profile-message profile-message--error">{formError}</div>}
        </div>

        <div className="live-config-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <div className="live-config-actions">
            <div className="live-access-anchor">
              <button
                type="button"
                className={`btn btn-outline${accessComplete ? ' is-complete' : ''}`}
                onClick={() => setAccessOpen((open) => !open)}
              >
                <Lock size={16} /> Access
              </button>
              {accessOpen && (
                <div className="live-access-popover" role="dialog" aria-label="Session access">
                  {audiences.includes('subscribers') && subscriberTier && (
                    <span className="live-access-note">
                      Join tier <strong>{subscriberTier}</strong> is always included in comment &amp; recording access.
                    </span>
                  )}
                  <div className="live-access-group">
                    <strong>Comment</strong>
                    <span className="live-access-hint">
                      {subscribersOnly ? 'Which subscriber tiers can comment (choose many)' : 'Who can comment (choose many)'}
                    </span>
                    {accessGroup(commentAccess, setCommentAccess, audiences.includes('subscribers') ? subscriberTier : null)}
                  </div>
                  <div className="live-access-divider" />
                  <div className="live-access-group">
                    <strong>Record Live</strong>
                    <span className="live-access-hint">
                      {subscribersOnly ? 'Which subscriber tiers can watch the recording (choose many)' : 'Who can watch the recording (choose many)'}
                    </span>
                    {accessGroup(recordAccess, setRecordAccess, audiences.includes('subscribers') ? subscriberTier : null)}
                  </div>
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={!accessComplete}>
              <CalendarPlus size={16} /> Schedule Live
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  )
}

export function ScheduledLive() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { astrologerLiveSessions, astrologerIds, actions } = useMyLiveSessions()
  const routes = getRoleRoutes(currentUser?.role)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const upcoming = useMemo(
    () => astrologerLiveSessions
      .filter((session) => astrologerIds.has(session.astrologerId) && session.status === 'upcoming')
      .sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt)),
    [astrologerLiveSessions, astrologerIds],
  )

  const handleSchedule = (payload) => {
    actions.createLiveSession({ ...payload, astrologerId: currentUser?.id })
    setScheduleOpen(false)
  }

  return (
    <div className="live-list-page">
      <PageHeader
        eyebrow="Astrologer portal"
        title="Scheduled Live"
        subtitle="Plan upcoming live broadcasts and set the details for each session."
        showBack
        backTo={routes.dashboard}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setScheduleOpen(true)}>
            <CalendarPlus size={16} /> Schedule Live
          </button>
        }
      />

      <div className="live-list-section">
        <div className="live-list-section__title">
          <h2>Upcoming broadcasts</h2>
          <span>{upcoming.length} scheduled</span>
        </div>
        {upcoming.length ? (
          <div className="live-list-grid">
            {upcoming.map((session) => (
              <UpcomingLiveCard
                key={session.id}
                session={session}
                onEdit={() => navigate(`${routes.liveSessionSetup}?sessionId=${encodeURIComponent(session.id)}`)}
                onGoLive={() => navigate(`${routes.liveSessionSetup}?sessionId=${encodeURIComponent(session.id)}`)}
              />
            ))}
          </div>
        ) : (
          <Card className="live-list-empty">
            <CalendarClock size={22} />
            <strong>No upcoming live sessions</strong>
            <p>Use “Schedule Live” to plan a broadcast, or revisit past sessions in Live History.</p>
          </Card>
        )}
      </div>

      {scheduleOpen && (
        <ScheduleLiveModal
          onClose={() => setScheduleOpen(false)}
          onCreate={handleSchedule}
        />
      )}
    </div>
  )
}

export function LiveHistory() {
  const { currentUser } = useAuth()
  const { astrologerLiveSessions, astrologerIds } = useMyLiveSessions()
  const routes = getRoleRoutes(currentUser?.role)

  const [detailsSession, setDetailsSession] = useState(null)

  const past = useMemo(
    () => astrologerLiveSessions
      .filter((session) => astrologerIds.has(session.astrologerId) && session.status === 'past')
      .sort((a, b) => new Date(b.endedAt || b.scheduledEndAt) - new Date(a.endedAt || a.scheduledEndAt)),
    [astrologerLiveSessions, astrologerIds],
  )

  return (
    <div className="live-list-page">
      <PageHeader
        eyebrow="Astrologer portal"
        title="Live History"
        subtitle="Review your past live broadcasts and held session details."
        showBack
        backTo={routes.dashboard}
      />

      <div className="live-list-section">
        <div className="live-list-section__title">
          <h2>Past broadcasts</h2>
          <span>{past.length} sessions</span>
        </div>
        {past.length ? (
          <div className="live-list-grid">
            {past.map((session) => (
              <PastLiveCard
                key={session.id}
                session={session}
                onClick={() => setDetailsSession(session)}
              />
            ))}
          </div>
        ) : (
          <Card className="live-list-empty">
            <History size={22} />
            <strong>No past broadcasts yet</strong>
            <p>Finish a live session and it will appear here with its recorded details.</p>
          </Card>
        )}
      </div>

      {detailsSession && (
        <PastLiveDetailsModal
          session={detailsSession}
          onClose={() => setDetailsSession(null)}
          onReplay={() => window.alert('Replay will be available once recording is enabled for past sessions.')}
        />
      )}
    </div>
  )
}