import { memo, useSyncExternalStore } from 'react'
import { BarChart3, Calendar, Clock, Info, MessageCircle, MessageSquare, Radio, Star, Users, Wallet } from 'lucide-react'
import { NOTIF_URGENT_MS } from '../../utils/notificationLayout.js'

// One shared 1s ticker for the whole screen. Only rows that call
// useNotificationClock() subscribe/re-render on tick; everyone else is untouched.
const clockListeners = new Set()
let clockNow = Date.now()
let clockIntervalId = null

function subscribeClock(listener) {
  clockListeners.add(listener)
  if (clockIntervalId == null) {
    clockIntervalId = setInterval(() => {
      clockNow = Date.now()
      clockListeners.forEach((fn) => fn())
    }, 1000)
  }
  return () => {
    clockListeners.delete(listener)
    if (clockListeners.size === 0 && clockIntervalId != null) {
      clearInterval(clockIntervalId)
      clockIntervalId = null
    }
  }
}

function getClockSnapshot() {
  return clockNow
}

function useNotificationClock() {
  return useSyncExternalStore(subscribeClock, getClockSnapshot)
}

const TYPE_ICON = {
  question_new: MessageSquare,
  question_expiring: MessageSquare,
  booking_new: Calendar,
  booking_cancelled: Calendar,
  live_soon: Radio,
  client_message: MessageCircle,
  payout: Wallet,
  review: Star,
  follower: Users,
  sales_summary: BarChart3,
  system: Info,
}

const TYPE_TONE = {
  question_new: 'tone-amber',
  question_expiring: 'tone-amber',
  booking_new: 'tone-violet',
  booking_cancelled: 'tone-violet',
  live_soon: 'tone-violet',
  client_message: 'tone-violet',
  payout: 'tone-green',
  review: 'tone-neutral',
  follower: 'tone-neutral',
  sales_summary: 'tone-neutral',
  system: 'tone-neutral',
}

const ACTION_LABEL = {
  reply: 'Reply',
  accept: 'Accept',
  decline: 'Decline',
  join: 'Join',
}

function initialsFor(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return 'Expired'
  const totalSeconds = Math.floor(msRemaining / 1000)
  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function formatRelativeTime(iso, now) {
  const diffMs = now - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function CountdownMeta({ expiresAt }) {
  const now = useNotificationClock()
  const msRemaining = new Date(expiresAt).getTime() - now
  return (
    <span className="notif-meta notif-meta-urgent">
      <Clock size={12} />
      {formatCountdown(msRemaining)}
    </span>
  )
}

function RowIcon({ notification }) {
  if (notification.actorName) {
    return (
      <div className="notif-avatar" aria-hidden="true">
        {initialsFor(notification.actorName)}
      </div>
    )
  }
  const Icon = TYPE_ICON[notification.type] || Info
  const tone = TYPE_TONE[notification.type] || 'tone-neutral'
  return (
    <div className={`notif-icon-circle ${tone}`} aria-hidden="true">
      <Icon size={16} />
    </div>
  )
}

function NotificationRow({ notification, sectionKey, now, onPressRow, onPressAction }) {
  const isActionable = sectionKey === 'needs_action'
  const isUrgent = isActionable && notification.expiresAt
    ? new Date(notification.expiresAt).getTime() - now < NOTIF_URGENT_MS
    : false

  const rowClassName = [
    'notif-row',
    isUrgent ? 'notif-row-urgent' : '',
    !isActionable ? 'notif-row-earlier' : '',
  ].filter(Boolean).join(' ')

  const [primaryAction, ...restActions] = notification.actions || []

  return (
    <div
      className={rowClassName}
      style={{ height: '100%', boxSizing: 'border-box' }}
      role="button"
      tabIndex={0}
      onClick={() => onPressRow(notification.id, notification.deepLink)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onPressRow(notification.id, notification.deepLink)
      }}
    >
      <RowIcon notification={notification} />
      <div className="notif-content">
        <div className="notif-line-top">
          <span className="notif-title">
            {!notification.read && <span className="notif-unread-dot" aria-label="Unread" />}
            <span className="notif-title-text">
              {notification.groupCount > 1 ? `${notification.groupCount} new questions` : notification.title}
            </span>
          </span>
          {notification.expiresAt ? (
            <CountdownMeta expiresAt={notification.expiresAt} />
          ) : (
            <span className="notif-meta">{formatRelativeTime(notification.createdAt, now)}</span>
          )}
        </div>

        {notification.subtitle && <div className="notif-subtitle">{notification.subtitle}</div>}

        {(notification.amount != null || primaryAction) && (
          <div className="notif-bottom-row" onKeyDown={(e) => e.stopPropagation()}>
            {notification.amount != null && <span className="notif-amount">₹{notification.amount.toLocaleString('en-IN')}</span>}
            {isActionable && primaryAction && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                aria-label={`${ACTION_LABEL[primaryAction]} to ${notification.title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onPressAction(notification.id, primaryAction)
                }}
              >
                {ACTION_LABEL[primaryAction]}
              </button>
            )}
            {isActionable && restActions.map((action) => (
              <button
                key={action}
                type="button"
                className="btn btn-outline btn-sm"
                aria-label={`${ACTION_LABEL[action]} ${notification.title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onPressAction(notification.id, action)
                }}
              >
                {ACTION_LABEL[action]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(NotificationRow)
