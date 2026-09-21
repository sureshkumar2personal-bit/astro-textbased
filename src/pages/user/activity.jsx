import { useEffect, useMemo, useState } from 'react'
import { Activity as ActivityIcon, CheckCircle2, CircleHelp, MessageCircle, Search, Sparkles, Trash2, Wallet, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAuth } from '../../state/AuthContext.jsx'
import { getHiddenUserActivityIds, getUserCommunicationActivity, saveHiddenUserActivityIds } from '../../utils/memberCommunicationActivity.js'
import { getRoleRoutes } from '../../utils/roleRoutes.js'
import './activity.css'

const TYPE_META = {
  question: { label: 'Question', icon: CircleHelp },
  answer: { label: 'Answer', icon: CheckCircle2 },
  consultation: { label: 'Consultation', icon: MessageCircle },
  dispute: { label: 'Dispute', icon: ActivityIcon },
  wallet: { label: 'Wallet', icon: Wallet },
}

const ACTIVITY_FILTERS = [
  { key: 'all', label: 'All Activity' },
  { key: 'questions', label: 'Text Questions' },
  { key: 'chat', label: 'Chat' },
  { key: 'calls', label: 'Calls' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'disputes', label: 'Disputes' },
  { key: 'wallet', label: 'Wallet' },
]

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

function activityMatchesFilter(item, filter) {
  if (filter === 'all') return true
  if (filter === 'questions') return item.type === 'question' || item.type === 'answer'
  if (filter === 'disputes') return item.type === 'dispute'
  if (filter === 'appointments') return item.id.endsWith('-appointment')
  if (filter === 'chat') return item.type === 'consultation' && String(item.sessionType || '').toLowerCase().includes('chat')
  if (filter === 'calls') return item.type === 'consultation' && /(call|audio)/i.test(String(item.sessionType || item.title || ''))
  if (filter === 'wallet') return item.type === 'wallet'
  return true
}

export default function Activity() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { questions, consultationHistory, appointments, userWallet } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const [filter, setFilter] = useState('all')
  const [hiddenActivityIds, setHiddenActivityIds] = useState([])
  const [summaryActivity, setSummaryActivity] = useState(null)

  useEffect(() => {
    setHiddenActivityIds(getHiddenUserActivityIds(currentUser?.id))
  }, [currentUser?.id])

  const activities = useMemo(() => {
    return getUserCommunicationActivity({ questions, consultationHistory, appointments, walletTransactions: userWallet?.transactions, userId: currentUser?.id })
  }, [appointments, consultationHistory, currentUser?.id, questions, userWallet?.transactions])

  const visibleActivities = useMemo(
    () => activities.filter((item) => !hiddenActivityIds.includes(item.id) && activityMatchesFilter(item, filter)),
    [activities, filter, hiddenActivityIds],
  )

  const handleDeleteActivity = (activityId) => {
    setHiddenActivityIds((currentIds) => {
      const nextIds = [...new Set([...currentIds, activityId])]
      saveHiddenUserActivityIds(currentUser?.id, nextIds)
      return nextIds
    })
  }

  const openActivity = (item) => {
    if (item.sourceType === 'call' || item.sourceType === 'wallet' || item.type === 'wallet') {
      setSummaryActivity(item)
      return
    }

    if (item.sourceType === 'appointment') {
      navigate(`${routes.appointmentDetails}?id=${encodeURIComponent(item.sourceId)}`)
      return
    }

    if (item.sourceType === 'chat') {
      navigate(`${routes.chatDetails}?id=${encodeURIComponent(item.sourceId)}`)
      return
    }

    if (item.sourceType === 'dispute') {
      navigate(`${routes.raiseDispute}?questionId=${encodeURIComponent(item.sourceId)}`)
      return
    }

    if (item.sourceType === 'question' || item.sourceType === 'answer') {
      navigate(`${routes.askQuestion}?viewQuestionId=${encodeURIComponent(item.sourceId)}`)
    }
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
        subtitle="Review your questions, answers, consultations, and appointment updates."
      />

      <section className="user-activity-intro">
        <div className="user-activity-intro__icon"><Sparkles size={19} /></div>
        <div><strong>Your recent journey</strong><p>Your activity is collected from your conversations and services across Astro Connect.</p></div>
      </section>

      <Card className="user-activity-card">
        <div className="user-activity-card__heading"><div><span className="user-activity-eyebrow">ACTIVITY TIMELINE</span><h2>Recent activity</h2></div><span className="user-activity-count">{visibleActivities.length} {visibleActivities.length === 1 ? 'entry' : 'entries'}</span></div>
        <div className="user-activity-filters" role="tablist" aria-label="Filter activity">
          {ACTIVITY_FILTERS.map((item) => <button type="button" role="tab" aria-selected={filter === item.key} className={filter === item.key ? 'is-active' : ''} onClick={() => setFilter(item.key)} key={item.key}>{item.label}</button>)}
        </div>
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
