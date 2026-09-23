import { useEffect, useMemo, useState } from 'react'
import { Activity as ActivityIcon, CheckCircle2, CircleHelp, MessageCircle, Search, Sparkles, Trash2, Wallet, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { getHiddenUserActivityIds, getUserCommunicationActivity, saveHiddenUserActivityIds } from '../../utils/memberCommunicationActivity.js'
import { getUserActivityLog } from '../../utils/userActivityLog.js'
import './activity.css'

const ACTIVITY_WINDOW_DAYS = 7
const ACTIVITY_WINDOW_MS = ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000

const TYPE_META = {
  question: { label: 'Question', icon: CircleHelp },
  answer: { label: 'Answer', icon: CheckCircle2 },
  consultation: { label: 'Consultation', icon: MessageCircle },
  dispute: { label: 'Dispute', icon: ActivityIcon },
  wallet: { label: 'Wallet', icon: Wallet },
  profile: { label: 'Profile', icon: ActivityIcon },
  horoscope: { label: 'Horoscope', icon: Sparkles },
  'payment-method': { label: 'Payment method', icon: Wallet },
  subscription: { label: 'Subscription', icon: Sparkles },
  autopay: { label: 'Autopay', icon: Wallet },
  follow: { label: 'Following', icon: ActivityIcon },
  security: { label: 'Security', icon: ActivityIcon },
  review: { label: 'Review', icon: CheckCircle2 },
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
  return TYPE_META[item.type] || { label: 'Activity', icon: ActivityIcon }
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

  const handleDeleteActivity = (activityId) => {
    setHiddenActivityIds((currentIds) => {
      const nextIds = [...new Set([...currentIds, activityId])]
      saveHiddenUserActivityIds(currentUser?.id, nextIds)
      return nextIds
    })
  }

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

      <section className="user-activity-intro">
        <div className="user-activity-intro__icon"><Sparkles size={19} /></div>
        <div><strong>Only the last 7 days of your activity are shown</strong><p>Your recent conversations and services appear here for seven days.</p></div>
      </section>

      <Card className="user-activity-card">
        <div className="user-activity-card__heading"><div><span className="user-activity-eyebrow">ACTIVITY TIMELINE</span><h2>Recent activity</h2></div><span className="user-activity-count">{visibleActivities.length} {visibleActivities.length === 1 ? 'entry' : 'entries'}</span></div>
        {visibleActivities.length ? (
          <div className="user-activity-list">
            {visibleActivities.map((item) => {
              const meta = activityType(item)
              const Icon = meta.icon
              return <article className="user-activity-item" key={item.id} role="button" tabIndex={0} onClick={() => openActivity(item)} onKeyDown={(event) => handleActivityKeyDown(event, item)}><span className="user-activity-item__icon"><Icon size={17} /></span><div className="user-activity-item__body"><div className="user-activity-item__top"><strong>{item.title}</strong><span>{formatDate(item.occurredAt)}{formatTime(item.occurredAt) ? ` · ${formatTime(item.occurredAt)}` : ''}</span></div><p>{item.summary || 'Activity recorded.'}</p><div className="user-activity-item__meta"><span>{meta.label}</span>{item.status && <span>{item.status}</span>}{item.metadata && <span>{item.metadata}</span>}</div></div><button type="button" className="user-activity-delete" aria-label={`Delete ${item.title}`} title="Delete activity" onClick={(event) => { event.stopPropagation(); handleDeleteActivity(item.id) }} onKeyDown={(event) => event.stopPropagation()}><Trash2 size={15} /></button></article>
            })}
          </div>
        ) : (
          <div className="user-activity-empty"><Search size={24} /><strong>No activity yet</strong><p>Your questions, consultations, and appointments will appear here as you use Astro Connect.</p></div>
        )}
      </Card>
      {summaryActivity && <div className="user-activity-modal-backdrop" role="presentation" onClick={() => setSummaryActivity(null)}><section className="user-activity-summary-modal" role="dialog" aria-modal="true" aria-labelledby="user-activity-summary-title" onClick={(event) => event.stopPropagation()}><header className="user-activity-summary-modal__header"><div><span className="user-activity-eyebrow">ACTIVITY SUMMARY</span><h2 id="user-activity-summary-title">{summaryActivity.title}</h2></div><button type="button" className="icon-btn" aria-label="Close activity summary" onClick={() => setSummaryActivity(null)}><X size={17} /></button></header><div className="user-activity-summary-modal__body"><div className="user-activity-summary-row"><span>Date</span><strong>{formatDate(summaryActivity.occurredAt)}{formatTime(summaryActivity.occurredAt) ? ` · ${formatTime(summaryActivity.occurredAt)}` : ''}</strong></div>{summaryActivity.status && <div className="user-activity-summary-row"><span>Status</span><strong>{summaryActivity.status}</strong></div>}{summaryActivity.metadata && <div className="user-activity-summary-row"><span>Details</span><strong>{summaryActivity.metadata}</strong></div>}<p className="user-activity-summary-copy">{summaryActivity.summary || 'Activity recorded.'}</p></div></section></div>}
    </div>
  )
}
