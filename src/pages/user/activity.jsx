import { useEffect, useMemo, useState } from 'react'
import { Activity as ActivityIcon, CheckCircle2, ChevronRight, CircleHelp, MessageCircle, Search, Sparkles, Wallet, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import { mockAstrologers } from '../../data/notificationData.js'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { getHiddenUserActivityIds, getUserCommunicationActivity } from '../../utils/memberCommunicationActivity.js'
import { getUserActivityLog } from '../../utils/userActivityLog.js'
import './activity.css'

const ACTIVITY_WINDOW_DAYS = 7
const ACTIVITY_WINDOW_MS = ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000

const TYPE_META = {
  question: { label: 'Question', icon: CircleHelp, tone: 'indigo' },
  answer: { label: 'Answer', icon: CheckCircle2, tone: 'indigo' },
  consultation: { label: 'Consultation', icon: MessageCircle, tone: 'blue' },
  dispute: { label: 'Dispute', icon: ActivityIcon, tone: 'red' },
  wallet: { label: 'Wallet', icon: Wallet, tone: 'green' },
  profile: { label: 'Profile', icon: ActivityIcon, tone: 'neutral' },
  horoscope: { label: 'Horoscope', icon: Sparkles, tone: 'amber' },
  'payment-method': { label: 'Payment method', icon: Wallet, tone: 'green' },
  subscription: { label: 'Subscription', icon: Sparkles, tone: 'teal' },
  autopay: { label: 'Autopay', icon: Wallet, tone: 'green' },
  follow: { label: 'Following', icon: ActivityIcon, tone: 'teal' },
  security: { label: 'Security', icon: ActivityIcon, tone: 'violet' },
  review: { label: 'Review', icon: CheckCircle2, tone: 'purple' },
}

function formatDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

function activityType(item) {
  const base = TYPE_META[item.type] || { label: 'Activity', icon: ActivityIcon, tone: 'neutral' }
  if (item.type !== 'consultation') return base
  if (item.sourceType === 'appointment') return { ...base, tone: 'orange' }
  if (item.sourceType === 'chat' || String(item.sessionType || '').toLowerCase().includes('chat')) return { ...base, tone: 'purple' }
  return base
}

function statusTone(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('cancel') || normalized.includes('fail')) return 'is-red'
  if (normalized.includes('resched')) return 'is-blue'
  if (normalized.includes('refund')) return 'is-purple'
  if (normalized.includes('pending')) return 'is-amber'
  if (normalized.includes('book') || normalized.includes('upcoming')) return 'is-orange'
  if (normalized.includes('complete') || normalized.includes('answer') || normalized.includes('success')) return 'is-green'
  return 'is-neutral'
}

function activityAstrologer(activity, appointments, consultationHistory) {
  if (!activity || activity.type !== 'consultation') return ''
  const source = activity.sourceType === 'appointment'
    ? appointments.find((appointment) => appointment.id === activity.sourceId)
    : consultationHistory.find((session) => session.id === activity.sourceId)
  if (!source) return ''
  return source.astrologerName || source.astrologer || mockAstrologers.find((astrologer) => astrologer.id === source.astrologerId)?.name || ''
}

function collapseCompositeActivities(activities) {
  const subscriptions = activities.filter((activity) => activity.type === 'subscription')
  if (!subscriptions.length) return activities

  const isLinked = (activity, subscription) => {
    const activityTime = new Date(activity.occurredAt).getTime()
    const subscriptionTime = new Date(subscription.occurredAt).getTime()
    return Math.abs(subscriptionTime - activityTime) <= 60 * 1000
  }

  const enriched = subscriptions.map((subscription) => {
    const walletPayment = activities.find((activity) => activity.type === 'wallet' && isLinked(activity, subscription))
    const autopay = activities.find((activity) => activity.type === 'autopay' && isLinked(activity, subscription))
    const details = [subscription.metadata, walletPayment && `Wallet payment: ${walletPayment.summary}`, autopay && 'Autopay enabled'].filter(Boolean)
    return {
      ...subscription,
      summary: walletPayment
        ? `${subscription.summary || 'Subscription started'} Payment completed from your wallet.`
        : subscription.summary,
      metadata: [...new Set(details)].join(' · '),
    }
  })

  return activities
    .filter((activity) => {
      if (activity.type === 'subscription') return false
      if (activity.type === 'wallet' || activity.type === 'autopay') {
        return !subscriptions.some((subscription) => isLinked(activity, subscription))
      }
      return true
    })
    .concat(enriched)
}

export default function Activity() {
  const { currentUser } = useAuth()
  const { questions, consultationHistory, appointments, userWallet } = useAppData()
  const [hiddenActivityIds, setHiddenActivityIds] = useState([])
  const [summaryActivity, setSummaryActivity] = useState(null)

  useEffect(() => {
    setHiddenActivityIds(getHiddenUserActivityIds(currentUser?.id))
  }, [currentUser?.id])

  const activities = useMemo(() => {
    const cutoff = Date.now() - ACTIVITY_WINDOW_MS
    const communicationActivities = getUserCommunicationActivity({ questions, consultationHistory, appointments, walletTransactions: userWallet?.transactions, userId: currentUser?.id })
    const accountActivities = getUserActivityLog(currentUser?.id)
    return collapseCompositeActivities([...communicationActivities, ...accountActivities])
      .sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime())
      .filter((activity) => {
        const timestamp = new Date(activity.occurredAt).getTime()
        return !Number.isNaN(timestamp) && timestamp >= cutoff
      })
  }, [appointments, consultationHistory, currentUser?.id, questions, userWallet?.transactions])

  const visibleActivities = useMemo(
    () => activities.filter((item) => !hiddenActivityIds.includes(item.id)),
    [activities, hiddenActivityIds],
  )
  const summaryAstrologer = activityAstrologer(summaryActivity, appointments, consultationHistory)

  const openActivity = (item) => {
    setSummaryActivity(item)
  }

  const handleActivityKeyDown = (event, item) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openActivity(item)
    }
  }

  return (
    <div className="user-activity-page">
      <PageHeader
        eyebrow="User portal"
        title="My Activity"
        subtitle="Review your activity from the last 7 days."
      />

      <Card className="user-activity-card">
        <div className="user-activity-card__heading"><div><span className="user-activity-eyebrow">ACTIVITY TIMELINE</span><h2>Recent Activity</h2><p className="user-activity-card__subtitle">Review your activity from the last 7 days.</p></div><span className="user-activity-count">{visibleActivities.length} {visibleActivities.length === 1 ? 'entry' : 'entries'}</span></div>
        {visibleActivities.length ? (
          <div className="user-activity-list">
            {visibleActivities.map((item) => {
              const meta = activityType(item)
              const Icon = meta.icon
              return <article className="my-activity-card user-activity-item" key={item.id} role="button" tabIndex={0} onClick={() => openActivity(item)} onKeyDown={(event) => handleActivityKeyDown(event, item)}><span className={`my-activity-card__icon user-activity-item__icon activity-tone-${meta.tone}`}><Icon size={20} /></span><div className="my-activity-card__body user-activity-item__body"><div className="my-activity-card__top user-activity-item__top"><span className={`my-activity-badge activity-tone-${meta.tone}`}>{meta.label}</span><span className="my-activity-card__name">{item.title}</span></div><p className="my-activity-card__desc">{item.summary || 'Activity recorded.'}</p><div className="my-activity-card__meta user-activity-item__meta"><span>{formatDate(item.occurredAt)}{formatTime(item.occurredAt) ? ` · ${formatTime(item.occurredAt)}` : ''}</span>{item.metadata && <span>{item.metadata}</span>}</div></div><div className="my-activity-card__right user-activity-item__right">{item.status && <span className={`user-activity-status ${statusTone(item.status)}`}>{item.status}</span>}<ChevronRight size={18} className="my-activity-card__chevron" aria-hidden="true" /></div></article>
            })}
          </div>
        ) : (
          <div className="user-activity-empty"><Search size={24} /><strong>No activity yet</strong><p>Your questions, consultations, and appointments will appear here as you use Astro Connect.</p></div>
        )}
      </Card>
      {summaryActivity && <div className="user-activity-modal-backdrop" role="presentation" onClick={() => setSummaryActivity(null)}><section className="user-activity-summary-modal" role="dialog" aria-modal="true" aria-labelledby="user-activity-summary-title" onClick={(event) => event.stopPropagation()}><header className="user-activity-summary-modal__header"><div><span className="user-activity-eyebrow">ACTIVITY SUMMARY</span><h2 id="user-activity-summary-title">{summaryActivity.title}</h2></div><button type="button" className="icon-btn" aria-label="Close activity summary" onClick={() => setSummaryActivity(null)}><X size={17} /></button></header><div className="user-activity-summary-modal__body"><div className="user-activity-summary-row"><span>Date</span><strong>{formatDate(summaryActivity.occurredAt)}{formatTime(summaryActivity.occurredAt) ? ` · ${formatTime(summaryActivity.occurredAt)}` : ''}</strong></div>{summaryAstrologer && <div className="user-activity-summary-row"><span>Astrologer</span><strong>{summaryAstrologer}</strong></div>}{summaryActivity.status && <div className="user-activity-summary-row"><span>Status</span><strong>{summaryActivity.status}</strong></div>}{summaryActivity.metadata && <div className="user-activity-summary-row"><span>Details</span><strong>{summaryActivity.metadata}</strong></div>}<p className="user-activity-summary-copy">{summaryActivity.summary || 'Activity recorded.'}</p></div></section></div>}
    </div>
  )
}
