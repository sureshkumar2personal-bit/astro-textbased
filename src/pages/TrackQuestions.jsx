import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, Clock, AlertTriangle, Sparkles, ArrowRight, Star, Gavel, CircleHelp, ChevronDown, ChevronRight, List, Grid2X2, Filter } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import CampaignCard, { CampaignStatusChip } from '../components/campaigns/CampaignCard.jsx'
import { campaignCardStatusStyle, campaignCardToneStyle } from '../components/campaigns/campaignCardTokens.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import SummaryCard from '../components/ui/SummaryCard.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import RaiseDisputeModal from '../components/user/RaiseDisputeModal.jsx'
import { mockAstrologers } from '../data/notificationData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { formatAnswerDate, getQuestionReceivedAt, getQuestionTypeLabel, isQuestionAnswered } from '../utils/answer.js'
import { getMonthKeyFromDate, getMonthLabel, getQuestionMonthKey, getQuestionSourceLabel, isOpenQuestion } from '../utils/questions.js'
import {
  LIFECYCLE_FILTERS,
  STAGE_ANSWERED,
  STAGE_DISPUTED,
  STAGE_RESOLVED,
  STAGE_WAITING,
  countLifecycleFilters,
  getDisputeWindowLabel,
  getQuestionLifecycleStage,
  getQuestionRefundInfo,
  isDisputeWindowOpen,
  selectTrackedQuestions,
} from '../utils/questionLifecycle.js'
import { getAtonementProgress } from '../utils/atonements.js'
import useUserAtonements from '../state/useUserAtonements.js'
import '../css/user/question-tracking.css'

const EDIT_TIME_LIMIT_MS = 30 * 60 * 1000
const DELETE_TIME_LIMIT_MS = 60 * 60 * 1000
// Months offered by the selector. Track My Questions is always scoped to one
// selected month, so this is a bounded navigation, not a history list.
const MONTH_OPTION_LIMIT = 12

// Stages that describe where a question sits right now. These are the app's own
// lifecycle words; question.status and dispute.status remain the stored truth.
const LIFECYCLE_STAGE_META = {
  [STAGE_WAITING]: { background: 'var(--sky-bg)', color: 'var(--sky-600)', border: 'rgba(14, 165, 233, 0.28)', hint: 'Submitted, waiting for the astrologer' },
  [STAGE_ANSWERED]: { background: 'var(--success-bg)', color: 'var(--green-600)', border: 'rgba(16, 185, 129, 0.30)', hint: 'Answered, within the dispute window' },
  [STAGE_DISPUTED]: { background: 'var(--danger-bg)', color: 'var(--red-600)', border: 'rgba(239, 68, 68, 0.24)', hint: 'Dispute in progress' },
  [STAGE_RESOLVED]: { background: 'var(--amber-100)', color: 'var(--amber-600)', border: 'rgba(245, 158, 11, 0.30)', hint: 'Dispute resolved, closing soon' },
  All: { background: 'var(--primary-bg)', color: 'var(--primary)', border: 'rgba(91, 33, 182, 0.20)', hint: 'Active questions this month' },
}

// Maps a lifecycle stage onto the CampaignCard tone palette for this screen.
const STAGE_CARD_TONE = {
  [STAGE_WAITING]: 'sky',
  [STAGE_ANSWERED]: 'green',
  [STAGE_DISPUTED]: 'rose',
  [STAGE_RESOLVED]: 'teal',
}

const DAY_MS = 24 * 60 * 60 * 1000

// Presentation-only demo questions for the My Questions screen. They live only
// in this page's render data - they are never added to AppDataContext or
// localStorage, never touch a real question record, and are rebuilt on every
// load so their dates always land in the current month. The `demo` flag and the
// `QTN-DEMO-` id prefix keep them clearly identifiable. They are merged into the
// same dataset used for both the summary counts and the filtered lists below.
const DEMO_QUESTION_BASE = {
  astrologerId: 'astrologer-demo',
  submittedByUserId: 'user-demo',
  submittedByEmail: 'user@astroconnect.com',
  purchaseType: 'Paid',
  refundAmount: 0,
  refundStatus: 'None',
  language: 'English',
  priority: 'Medium',
  demo: true,
  attachments: [],
  previousQuestions: [],
  history: ['Presentation-only demo record'],
  dispute: null,
}

// Runtime-relative timestamp that is always inside the current month. Small
// "days ago" offsets can slip into the previous month when the screen is opened
// near the start of a month, so the result is clamped to the 1st of the month.
function demoQuestionWhen(daysAgo, hour = 10, minute = 30) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const target = new Date(now.getTime() - daysAgo * DAY_MS)
  target.setHours(hour, minute, 0, 0)
  if (target.getTime() > now.getTime()) return new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  return (target.getTime() < monthStart.getTime() ? monthStart : target).toISOString()
}

function buildDemoQuestions() {
  return [
    // Waiting for Answer
    {
      ...DEMO_QUESTION_BASE,
      id: 'QTN-DEMO-900001',
      userId: 'customer-demo-1',
      user: 'Priya V.',
      category: 'Health',
      type: 'Personal',
      questionFor: 'Self',
      priority: 'High',
      status: 'Pending',
      campaignId: 'july-premium',
      campaignName: 'Health Campaign',
      raised: 'Demo record',
      raisedAt: demoQuestionWhen(1, 9, 15),
      question: 'I have been feeling low on energy for a few weeks. Does my chart show a favourable window for recovery?',
      answer: '',
      draftAnswer: '',
      horoscopeMode: 'Use Saved Horoscope',
    },
    {
      ...DEMO_QUESTION_BASE,
      id: 'QTN-DEMO-900002',
      userId: 'customer-demo-2',
      user: 'Kannan',
      category: 'Career',
      type: 'General',
      questionFor: 'Self',
      status: 'In Progress',
      campaignId: 'festival-special',
      campaignName: 'Career Campaign',
      raised: 'Demo record',
      raisedAt: demoQuestionWhen(3, 13, 5),
      question: 'Is this a good month to negotiate a salary revision with my manager?',
      answer: '',
      draftAnswer: 'Reviewing your current transit before the detailed reading.',
      horoscopeMode: 'Continue Without Horoscope',
    },
    // Answered (inside the 7-day dispute window)
    {
      ...DEMO_QUESTION_BASE,
      id: 'QTN-DEMO-900003',
      userId: 'customer-demo-3',
      user: 'Meena R.',
      category: 'Marriage',
      type: 'Personal',
      questionFor: 'Self',
      priority: 'High',
      status: 'Answered',
      raised: 'Demo record',
      raisedAt: demoQuestionWhen(2, 11, 20),
      question: 'When is a favourable time for my marriage discussions to move forward?',
      answer: 'The coming weeks favour a calm, well-prepared family conversation. Early mornings on a weekday are the most supportive for this.',
      answeredAt: demoQuestionWhen(1, 16, 40),
      draftAnswer: '',
      horoscopeMode: 'Use Saved Horoscope',
    },
    {
      ...DEMO_QUESTION_BASE,
      id: 'QTN-DEMO-900004',
      userId: 'customer-demo-4',
      user: 'Arun',
      category: 'Business',
      type: 'General',
      questionFor: 'Business',
      status: 'Answered',
      campaignId: 'vip-subscribers',
      campaignName: 'VIP Subscribers',
      raised: 'Demo record',
      raisedAt: demoQuestionWhen(5, 10, 10),
      question: 'Should I sign the new vendor agreement before the end of this month?',
      answer: 'Yes, the timing is supportive. Read the renewal clauses once more and confirm before the final week of the month.',
      answeredAt: demoQuestionWhen(4, 18, 5),
      draftAnswer: '',
      horoscopeMode: 'Continue Without Horoscope',
    },
    // Disputed
    {
      ...DEMO_QUESTION_BASE,
      id: 'QTN-DEMO-900005',
      userId: 'customer-demo-5',
      user: 'Devi',
      category: 'Health',
      type: 'Personal',
      questionFor: 'Self',
      priority: 'High',
      status: 'Disputed',
      campaignId: 'july-premium',
      campaignName: 'Health Campaign',
      raised: 'Demo record',
      raisedAt: demoQuestionWhen(6, 17, 25),
      question: 'Does my chart indicate a long-term recovery path for my health, or should I seek a second opinion?',
      answer: 'Your chart shows gradual improvement. Follow the suggested remedies for at least two months before reassessing.',
      answeredAt: demoQuestionWhen(5, 12, 0),
      draftAnswer: '',
      horoscopeMode: 'Use Saved Horoscope',
      dispute: {
        target: 'Astrologer',
        reason: 'The response feels too generic for a personal health question.',
        description: 'I expected the answer to relate more directly to my chart and to explain the recovery timeline clearly.',
        response: '',
        status: 'Open',
      },
    },
    {
      ...DEMO_QUESTION_BASE,
      id: 'QTN-DEMO-900006',
      userId: 'customer-demo-6',
      user: 'Arjun D.',
      category: 'Career',
      type: 'General',
      questionFor: 'Self',
      status: 'Disputed',
      campaignId: 'festival-special',
      campaignName: 'Career Campaign',
      raised: 'Demo record',
      raisedAt: demoQuestionWhen(7, 14, 45),
      question: 'Is this the right time to accept the new role I was offered?',
      answer: 'The opportunity looks promising, but review the responsibilities carefully before deciding.',
      answeredAt: demoQuestionWhen(6, 9, 30),
      draftAnswer: '',
      horoscopeMode: 'Continue Without Horoscope',
      dispute: {
        target: 'Astrologer',
        reason: 'Please clarify the timing and the responsibilities.',
        description: 'The answer was helpful but I would like more specific guidance about the joining window.',
        response: '',
        status: 'Open',
      },
    },
    // Resolved
    {
      ...DEMO_QUESTION_BASE,
      id: 'QTN-DEMO-900007',
      userId: 'customer-demo-7',
      user: 'Lakshmi',
      category: 'Career',
      type: 'Personal',
      questionFor: 'Self',
      priority: 'High',
      status: 'Answered',
      raised: 'Demo record',
      raisedAt: demoQuestionWhen(5, 9, 5),
      question: 'Will my interview next week go well, and how should I prepare?',
      answer: 'The interview window is favourable. Revise your key projects and keep the first half of the week free for preparation.',
      answeredAt: demoQuestionWhen(4, 15, 0),
      draftAnswer: '',
      horoscopeMode: 'Continue Without Horoscope',
      dispute: {
        target: 'Astrologer',
        reason: 'The answer did not mention how to handle a delayed response.',
        description: 'I wanted clarity on what to do if the result is delayed beyond a week.',
        response: 'If the result is delayed, follow up politely after one full week and avoid over-preparing for a rejection scenario.',
        status: 'Resolved',
        raisedAt: demoQuestionWhen(3, 10, 0),
        resolvedAt: demoQuestionWhen(1, 12, 0),
        resolution: 'The answer was revised with a clear follow-up timeline and the customer confirmed it resolved the concern.',
      },
    },
  ]
}

// One active question, shown as a full record: identity, source, type, date,
// the question text, the current lifecycle stage, the answer once it exists and
// the dispute / refund state that belongs to the same question record.
function LifecycleQuestionCard({ question, nowMs, onOpen, onRaiseDispute }) {
  const stage = getQuestionLifecycleStage(question, nowMs)
  const answered = isQuestionAnswered(question)
  const dispute = question.dispute || null
  const refund = getQuestionRefundInfo(question)
  // Eligibility is the shared dispute rule: the question is answered, still
  // inside its 7-day window, and does not already have an open dispute.
  const canRaiseDispute = isDisputeWindowOpen(question, nowMs)
  const astrologerName = mockAstrologers.find((item) => item.id === question.astrologerId)?.name || question.user || 'Astrologer'
  const sourceLabel = isOpenQuestion(question) ? 'Open Question' : getQuestionSourceLabel(question)
  const typeLabel = getQuestionTypeLabel(question)
  const tone = STAGE_CARD_TONE[stage]
  const accentStyle = campaignCardToneStyle(tone) || campaignCardStatusStyle('Active')
  const chipStyle = { background: 'var(--neutral-bg)', color: 'var(--muted)', border: '1px solid var(--surface-border)' }

  const footer = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {answered && (
        <div className="aq-track-card__answer">
          <div className="aq-track-card__answer-label">Astrologer&apos;s answer</div>
          {question.answer || 'No answer text yet.'}
        </div>
      )}

      {dispute && (
        <div className="aq-track-card__dispute">
          <div className="aq-track-card__answer-label">Dispute · {dispute.status || 'Open'}</div>
          <div>{dispute.reason || '—'}</div>
          {dispute.description ? <div className="muted" style={{ fontSize: 12.5 }}>{dispute.description}</div> : null}
          {dispute.response ? <div className="muted" style={{ fontSize: 12.5 }}>Astrologer: {dispute.response}</div> : null}
          {dispute.resolution ? <div style={{ fontSize: 12.5 }}>Resolution: {dispute.resolution}</div> : null}
          {dispute.resolvedAt ? <div className="muted" style={{ fontSize: 12.5 }}>Resolved on {formatAnswerDate(dispute.resolvedAt)}</div> : null}
        </div>
      )}

      {refund && (
        <div className="aq-track-card__refund">
          Refund ₹{refund.amount.toLocaleString('en-IN')} · {refund.status}
          {refund.processedAt ? ` · ${formatAnswerDate(refund.processedAt)}` : ''}
        </div>
      )}

      {stage === STAGE_WAITING && (
        <div className="aq-track-card__note">Waiting for the astrologer to answer.</div>
      )}

      {canRaiseDispute && (
        <div className="aq-track-card__window">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>You can raise a dispute within 7 days of receiving this answer · {getDisputeWindowLabel(question, nowMs)}</span>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 4 }}>
        {answered && <button className="btn btn-outline" onClick={onOpen}>View Answer</button>}
        {!answered && <button className="btn btn-outline" onClick={onOpen}>View Question</button>}
        {canRaiseDispute && (
          <button className="btn aq-track-card__dispute-btn" onClick={(event) => { event.stopPropagation(); onRaiseDispute(question.id) }}>
            <Gavel size={14} aria-hidden="true" />
            Raise a Dispute
          </button>
        )}
      </div>
    </div>
  )

  return (
    <CampaignCard
      status={stage}
      tone={tone}
      icon={<CircleHelp size={22} aria-hidden="true" />}
      name={question.id}
      subtitle={`${astrologerName} · ${sourceLabel} · ${typeLabel}`}
      description={question.question}
      chips={[
        <CampaignStatusChip key="type" style={{ background: accentStyle.softBg, color: accentStyle.accent, border: `1px solid ${accentStyle.border}` }}>{typeLabel}</CampaignStatusChip>,
        <CampaignStatusChip key="source" style={chipStyle}>{sourceLabel}</CampaignStatusChip>,
        <CampaignStatusChip key="purchase" style={chipStyle}>{question.purchaseType}</CampaignStatusChip>,
      ]}
      details={[
        { label: 'Asked', value: formatAnswerDate(getQuestionReceivedAt(question)) || question.raised || '—' },
        { label: 'Purchase', value: question.purchaseType || '—' },
        { label: 'Stage', value: stage },
      ]}
      footer={footer}
    />
  )
}

function LifecycleQuestionListRow({ question, nowMs, onOpen, onRaiseDispute }) {
  const stage = getQuestionLifecycleStage(question, nowMs)
  const answered = isQuestionAnswered(question)
  const canRaiseDispute = isDisputeWindowOpen(question, nowMs)
  const astrologerName = mockAstrologers.find((item) => item.id === question.astrologerId)?.name || question.user || 'Astrologer'
  const sourceLabel = isOpenQuestion(question) ? 'Open Question' : getQuestionSourceLabel(question)
  const typeLabel = getQuestionTypeLabel(question)
  const openFromKeyboard = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article className="aq-question-list-row" role="button" tabIndex={0} onClick={onOpen} onKeyDown={openFromKeyboard}>
      <span className="aq-question-list-row__icon" aria-hidden="true"><CircleHelp size={20} /></span>
      <div className="aq-question-list-row__body">
        <div className="aq-question-list-row__top">
          <strong>{question.id}</strong>
          <span className="aq-question-list-row__meta">{astrologerName} · {sourceLabel} · {typeLabel}</span>
        </div>
        <p>{question.question}</p>
        <div className="aq-question-list-row__details">
          <span>{formatAnswerDate(getQuestionReceivedAt(question)) || question.raised || '—'}</span>
          <span>{question.purchaseType || '—'}</span>
          <span>{typeLabel}</span>
        </div>
      </div>
      <div className="aq-question-list-row__right">
        <span className={`aq-question-list-row__status aq-question-list-row__status--${stage.toLowerCase().replaceAll(' ', '-')}`}>{stage}</span>
        <div className="aq-question-list-row__actions">
          <button type="button" className="btn btn-outline" onClick={(event) => { event.stopPropagation(); onOpen() }}>
            {answered ? 'View Answer' : 'View Question'}
          </button>
          {canRaiseDispute && <button type="button" className="btn aq-track-card__dispute-btn" onClick={(event) => { event.stopPropagation(); onRaiseDispute(question.id) }}><Gavel size={14} /> Raise a Dispute</button>}
        </div>
        <ChevronRight className="aq-question-list-row__chevron" size={18} aria-hidden="true" />
      </div>
    </article>
  )
}

// Month selector. "All" below it means "every active question in this month".
function MonthSelector({ monthKey, options, onChange }) {
  return (
    <label className="aq-track-month">
      <select
        className="select-input"
        value={monthKey}
        aria-label="Select month"
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((key) => (
          <option key={key} value={key}>{getMonthLabel(key)}</option>
        ))}
      </select>
      <ChevronDown className="aq-track-month__chevron" size={15} aria-hidden="true" />
    </label>
  )
}

function StatusSelector({ filter, counts, onChange }) {
  return (
    <label className="aq-track-month">
      <Filter size={15} aria-hidden="true" />
      <select
        className="select-input"
        value={filter}
        aria-label="Filter by question status"
        onChange={(event) => onChange(event.target.value)}
      >
        {LIFECYCLE_FILTERS.map((stage) => (
          <option key={stage} value={stage}>
            {stage} ({counts[stage] || 0})
          </option>
        ))}
      </select>
      <ChevronDown className="aq-track-month__chevron" size={15} aria-hidden="true" />
    </label>
  )
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// Short "See more…" preview: only the first few words are shown inline, and the
// rest is revealed in the full-content modal. Shared by every field the details
// view trims (question, answer, dispute reason/description/response).
function getWordPreview(content) {
  const text = String(content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 4) return { preview: text, isTruncated: false }

  return {
    preview: words.slice(0, 4).join(' '),
    isTruncated: true,
  }
}

function ContentPreview({ content, title, onViewFull, quoted = false, className = 'muted' }) {
  const { preview, isTruncated } = getWordPreview(content)

  return (
    <div className={className}>
      {quoted ? `\u201C${preview}\u201D` : preview}
      {isTruncated && <button type="button" className="link-btn ml-1" aria-label={`See full ${title.toLowerCase()}`} onClick={() => onViewFull({ title, content })}>See more…</button>}
    </div>
  )
}

function TimeLimitBadge({ label, timeRemaining, tooltip, isEnabled }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
          isEnabled
            ? 'bg-[color:var(--primary-bg)] text-[color:var(--primary)]'
            : 'bg-[color:var(--surface-soft)] text-[color:var(--text-muted)]'
        }`}
      >
        <Clock size={12} />
        {label}: {formatTimeRemaining(timeRemaining)}
      </span>
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[color:var(--ink)] px-3 py-2 text-xs text-white shadow-lg"
          style={{ pointerEvents: 'none' }}
        >
          {tooltip}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[color:var(--ink)]" />
        </div>
      )}
    </div>
  )
}

// `embedded` renders this page as a section of the Ask a Question dashboard,
// where the dashboard already shows the page header and the section tabs.
export default function TrackQuestions({ embedded = false }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { questions, questionPreviewId, setQuestionPreviewId, actions } = useAppData()
  const { currentUser } = useAuth()
  const { allAtonements } = useUserAtonements()
  const routes = getRoleRoutes(currentUser?.role)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef(null)
  const searchContainerRef = useRef(null)

  useEffect(() => {
    if (!isSearchOpen) return
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        if (!search.trim()) {
          setIsSearchOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSearchOpen, search])
  // Lifecycle filter. "All" is scoped to the selected month, never all time.
  const [lifecycleFilter, setLifecycleFilter] = useState(() => {
    const requested = searchParams.get('status')
    return LIFECYCLE_FILTERS.includes(requested) ? requested : 'All'
  })
  // Month selector. Defaults to the current month so Track My Questions never
  // opens on an unbounded list.
  const [monthKey, setMonthKey] = useState(() => getMonthKeyFromDate(new Date()))
  const [nowMs, setNowMs] = useState(() => Date.now())
  // Coming back from Atonement Details (?questionId=...): start with the modal already open so the
  // list never paints first and the modal never flashes open/closed/open.
  const [initialPreviewId, setInitialPreviewId] = useState(() => {
    const id = searchParams.get('questionId')
    return id && questions.some((question) => question.id === id) ? id : null
  })
  const [detailsOpen, setDetailsOpen] = useState(() => Boolean(initialPreviewId))
  const [timeElapsed, setTimeElapsed] = useState(0)

  const matchesSearchFilter = useCallback((question) => {
    const term = appliedSearch.trim().toLowerCase()
    if (!term) return true
    if (term.includes('paid')) return question.purchaseType === 'Paid'
    if (term.includes('individual') || term.includes('personal')) return question.type === 'Personal'
    if (term.includes('general')) return question.type === 'General'
    return false
  }, [appliedSearch])
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [ratingSaved, setRatingSaved] = useState(false)
  const [fullContent, setFullContent] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  // Raise Dispute opens inline on this screen. It is keyed by question id so the
  // same modal serves the lifecycle card button and the details-modal button.
  const [disputeQuestionId, setDisputeQuestionId] = useState(null)
  const [disputeSubmitted, setDisputeSubmitted] = useState(false)

  const myQuestions = useMemo(() => {
    const scope = questions.filter((question) => {
      const isOwnQuestion =
        currentUser?.role !== 'user' ||
        (!currentUser?.id && !currentUser?.email) ||
        (currentUser?.id && question.submittedByUserId === currentUser.id) ||
        !question.submittedByEmail ||
        question.submittedByEmail === currentUser.email
      return isOwnQuestion
    })

    const source = currentUser?.role === 'user' && scope.length === 0 ? questions : scope

    // Presentation-only demo records are merged here, upstream of both the
    // summary counts and the filtered lists, so they always read the exact same
    // dataset. They are never written back to AppDataContext / localStorage.
    const merged = [...source, ...buildDemoQuestions()]

    return merged.sort((a, b) => new Date(b.raisedAt || b.raised) - new Date(a.raisedAt || a.raised))
  }, [currentUser?.email, currentUser?.id, currentUser?.role, questions])

  // Only questions whose lifecycle is still active, scoped to the selected month.
  const visibleQuestions = useMemo(
    () => selectTrackedQuestions(myQuestions, { monthKey, filter: lifecycleFilter, nowMs })
      .filter((question) => matchesSearchFilter(question)),
    [myQuestions, monthKey, lifecycleFilter, matchesSearchFilter, nowMs],
  )

  const lifecycleCounts = useMemo(
    () => countLifecycleFilters(myQuestions, { monthKey, nowMs }),
    [myQuestions, monthKey, nowMs],
  )

  // Bounded month navigation built from the user's own questions.
  const monthOptions = useMemo(() => {
    const keys = new Set([getMonthKeyFromDate(new Date())])
    myQuestions.forEach((question) => {
      const key = getQuestionMonthKey(question, null)
      if (key) keys.add(key)
    })
    return Array.from(keys).sort((a, b) => b.localeCompare(a)).slice(0, MONTH_OPTION_LIMIT)
  }, [myQuestions])

  // Arriving on Track My Questions defaults to the current month, but an empty
  // screen is unhelpful, so it falls back once to the most recent month that
  // actually holds an active question. A month the user picks by hand is never
  // overridden.
  const monthTouched = useRef(false)
  useEffect(() => {
    if (monthTouched.current) return
    if (countLifecycleFilters(myQuestions, { monthKey, nowMs }).All > 0) return
    const latest = monthOptions.find((key) => countLifecycleFilters(myQuestions, { monthKey: key, nowMs }).All > 0)
    if (latest && latest !== monthKey) setMonthKey(latest)
  }, [monthKey, monthOptions, myQuestions, nowMs])

  const handleMonthChange = (nextMonthKey) => {
    monthTouched.current = true
    setMonthKey(nextMonthKey)
  }

  // Day-based lifecycle changes (dispute window closing) are picked up here.
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Deep links (?questionId=...) can point at a record outside the current month or
// filter, so the detail lookup uses the user's own questions, not the filtered
// list.
const selectedQuestion = detailsOpen
    ? myQuestions.find((question) => question.id === (questionPreviewId || initialPreviewId)) || null
    : null

  const recommendedAtonement = selectedQuestion
    ? (allAtonements.find((item) => item.id === selectedQuestion.recommendedAtonementId) || allAtonements.find((item) => item.sourceType === 'question' && item.sourceId === selectedQuestion.id))
    : null
  const selectedDisputeStatus = selectedQuestion?.dispute?.status || null
  // A dispute can only be raised inside the 7-day window that opens when the
// answer arrives, which is the same rule the lifecycle card uses.
  const showRaiseDispute = Boolean(selectedQuestion) && isDisputeWindowOpen(selectedQuestion, nowMs)
  const showViewDispute = selectedDisputeStatus === 'Resolved'
  const ratingMode =
    selectedQuestion?.dispute?.status === 'Resolved'
      ? 'dispute'
      : selectedQuestion?.status === 'Answered'
        ? 'answer'
        : null

  const getQuestionTimeLimits = useCallback((question) => {
    if (!question.submittedAt) return { editTimeRemaining: 0, deleteTimeRemaining: 0, isEditEnabled: false, isDeleteEnabled: false }
    const submittedAt = new Date(question.submittedAt).getTime()
    const editTimeRemaining = Math.max(0, EDIT_TIME_LIMIT_MS - (Date.now() - submittedAt))
    const deleteTimeRemaining = Math.max(0, DELETE_TIME_LIMIT_MS - (Date.now() - submittedAt))
    return {
      editTimeRemaining,
      deleteTimeRemaining,
      isEditEnabled: editTimeRemaining > 0,
      isDeleteEnabled: deleteTimeRemaining > 0,
    }
  }, [])

  useEffect(() => {
    if (!visibleQuestions.some((q) => q.status === 'Pending' && q.submittedAt)) return
    const interval = setInterval(() => {
      setTimeElapsed(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [visibleQuestions])

  useEffect(() => {
    if (!selectedQuestion) {
      setRating(0)
      setReview('')
      setRatingSaved(false)
      return
    }

    if (selectedQuestion.dispute?.status === 'Resolved') {
      setRating(selectedQuestion.dispute.rating || selectedQuestion.disputeRating || 0)
      setReview('')
      setRatingSaved(Boolean(selectedQuestion.dispute.rating || selectedQuestion.disputeRating))
      return
    }

    if (selectedQuestion.status === 'Answered') {
      setRating(selectedQuestion.answerRating || 0)
      setReview(selectedQuestion.answerReview || '')
      setRatingSaved(Boolean(selectedQuestion.answerRating))
      return
    }

    setRating(0)
    setReview('')
    setRatingSaved(false)
  }, [selectedQuestion, selectedQuestion?.answerRating, selectedQuestion?.answerReview, selectedQuestion?.dispute?.rating, selectedQuestion?.dispute?.status, selectedQuestion?.disputeRating, selectedQuestion?.id, selectedQuestion?.status])

  const openQuestion = (questionId) => {
    setQuestionPreviewId(questionId)
    setFullContent(null)
    setDetailsOpen(true)
  }

  const requestedQuestionId = searchParams.get('questionId')
  useEffect(() => {
    if (!requestedQuestionId || detailsOpen) return
    if (questions.some((question) => question.id === requestedQuestionId)) openQuestion(requestedQuestionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedQuestionId, questions.length])

  const closeQuestion = useCallback(() => {
    setInitialPreviewId(null)
    setDetailsOpen(false)
    setQuestionPreviewId(null)
    setFullContent(null)
  }, [setQuestionPreviewId])

  // Open the inline dispute form. When it is launched from the details modal,
  // close that modal first so the two overlays never stack.
  const openRaiseDispute = (questionId) => {
    setDisputeQuestionId(questionId)
    if (detailsOpen) closeQuestion()
  }
  const disputeQuestion = disputeQuestionId
    ? myQuestions.find((question) => question.id === disputeQuestionId) || null
    : null

  const confirmDelete = (questionId) => {
    actions.revokeQuestion(questionId)
    setDeleteConfirmId(null)
  }

  useEffect(() => {
    if (!detailsOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (fullContent) {
        setFullContent(null)
        return
      }
      closeQuestion()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closeQuestion, detailsOpen, fullContent, selectedQuestion])

  return (
    <div>
      {/* Status dropdown on the left, Search & Month selector on the right */}
      {embedded ? (
        <div className="aq-track-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <StatusSelector filter={lifecycleFilter} counts={lifecycleCounts} onChange={setLifecycleFilter} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
            <div ref={searchContainerRef} className="search-filter-row__group" style={{ margin: 0, gap: 0, display: 'flex', alignItems: 'center' }}>
              <div className="search-filter-row__heading"></div>
              <div
                className="search-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isSearchOpen ? 6 : 0,
                  width: isSearchOpen ? 280 : 40,
                  height: 40,
                  transition: 'width 360ms cubic-bezier(0.16, 1, 0.3, 1), gap 360ms ease',
                  overflow: 'hidden',
                  flexShrink: 0,
                  margin: 0,
                  position: 'relative',
                  justifyContent: 'flex-end',
                }}
              >
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Paid / Individual / General"
                  className="text-input search-bar__input"
                  style={{
                    width: isSearchOpen ? '100%' : 0,
                    minWidth: 0,
                    height: 40,
                    opacity: isSearchOpen ? 1 : 0,
                    padding: isSearchOpen ? (search ? '0 32px 0 12px' : '0 12px') : 0,
                    borderWidth: isSearchOpen ? 1 : 0,
                    pointerEvents: isSearchOpen ? 'auto' : 'none',
                    transition: 'width 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease, padding 360ms ease, border-width 360ms ease',
                    margin: 0,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setAppliedSearch(search)
                    } else if (e.key === 'Escape') {
                      setIsSearchOpen(false)
                      setSearch('')
                      setAppliedSearch('')
                    }
                  }}
                />
                {isSearchOpen && search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSearch('')
                      setAppliedSearch('')
                      searchInputRef.current?.focus()
                    }}
                    style={{
                      position: 'absolute',
                      right: 44,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 4,
                      zIndex: 2,
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={isSearchOpen ? 'Search' : 'Open search'}
                  style={{
                    flex: '0 0 40px',
                    width: 40,
                    height: 40,
                    cursor: 'pointer',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSearchOpen ? 'var(--primary-bg)' : undefined,
                    color: isSearchOpen ? 'var(--primary)' : undefined,
                    transition: 'background 240ms ease, color 240ms ease',
                  }}
                  onClick={() => {
                    if (!isSearchOpen) {
                      setIsSearchOpen(true)
                      setTimeout(() => searchInputRef.current?.focus(), 80)
                    } else {
                      if (search.trim()) {
                        setAppliedSearch(search)
                      } else {
                        setIsSearchOpen(false)
                      }
                    }
                  }}
                >
                  <Search size={18} />
                </button>
              </div>
            </div>
            <MonthSelector monthKey={monthKey} options={monthOptions} onChange={handleMonthChange} />
          </div>
        </div>
      ) : (
        <PageHeader
          eyebrow="User portal"
          title="Track My Questions"
          showBack
          backTo={routes.askQuestion}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <StatusSelector filter={lifecycleFilter} counts={lifecycleCounts} onChange={setLifecycleFilter} />
              <div className="search-bar" style={{ width: 280 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Paid / Individual / General"
                  className="text-input search-bar__input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setAppliedSearch(search)
                    }
                  }}
                />
                <button type="button" className="icon-btn" aria-label="Search" onClick={() => setAppliedSearch(search)}>
                  <Search size={18} />
                </button>
              </div>
              <MonthSelector monthKey={monthKey} options={monthOptions} onChange={handleMonthChange} />
            </div>
          }
        />
      )}

      <div className="section">
        <Card style={{ marginTop: 0 }}>
          <div className="section-title track-questions-toolbar">
            <span>{getMonthLabel(monthKey)} · Active Questions ({visibleQuestions.length})</span>
            <div className="track-questions-view-toggle" role="group" aria-label="Question view">
              <button
                type="button"
                className={`track-questions-view-toggle__button${viewMode === 'list' ? ' is-active' : ''}`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                <List size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`track-questions-view-toggle__button${viewMode === 'grid' ? ' is-active' : ''}`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <Grid2X2 size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          {visibleQuestions.length === 0 && (
            <div className="mb-4 rounded-[14px] border border-[color:var(--border)] bg-white/90 px-4 py-3 text-sm text-[color:var(--muted)]">
              {lifecycleFilter === 'All'
                ? `No active questions in ${getMonthLabel(monthKey)}. Finished questions are in History.`
                : `No ${lifecycleFilter.toLowerCase()} questions in ${getMonthLabel(monthKey)}.`}
            </div>
           )}
           <div className={`track-questions-grid${viewMode === 'list' ? ' is-list' : ' is-grid'}`}>
             {visibleQuestions.map((question) => viewMode === 'list' ? (
               <LifecycleQuestionListRow
                 key={question.id}
                 question={question}
                 nowMs={nowMs}
                 onOpen={() => openQuestion(question.id)}
                 onRaiseDispute={(id) => openRaiseDispute(id)}
               />
             ) : (
               <LifecycleQuestionCard
                 key={question.id}
                 question={question}
                 nowMs={nowMs}
                 onOpen={() => openQuestion(question.id)}
                 onRaiseDispute={(id) => openRaiseDispute(id)}
               />
             ))}
           </div>
        </Card>
      </div>

      {detailsOpen && selectedQuestion && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={closeQuestion}>
          <div
            className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll qd-modal"
            style={{ width: 'min(820px, calc(100vw - 32px))' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="qd-header-copy">
                <div className="section-title qd-title">Question Details</div>
                <div className="muted qd-subtitle">
                  {selectedQuestion.campaignName || 'User question'} · {selectedQuestion.id}
                </div>
              </div>
              <div className="qd-header-actions">
                <StatusBadge label={selectedQuestion.status} />
                <button type="button" className="icon-btn qd-close" aria-label="Close question details" onClick={closeQuestion}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="modal-card__content user-modal-card__content qd-body">
              <div>
                <div className="field-label-top qd-section-label">Question Details</div>
                <div className="qd-info">
                  <div><strong>ID</strong><div className="muted">{selectedQuestion.id}</div></div>
                  <div><strong>User</strong><div className="muted">{selectedQuestion.user}</div></div>
                  <div><strong>Campaign</strong><div className="muted">{selectedQuestion.campaignName || 'No campaign'}</div></div>
                  <div><strong>Category</strong><div className="muted">{selectedQuestion.category}</div></div>
                  <div><strong>Type</strong><div className="muted">{selectedQuestion.type}</div></div>
                  <div><strong>Status</strong><div className="muted">{selectedQuestion.status}</div></div>
                </div>
              </div>

              <div>
                <div className="field-label-top qd-section-label">Your Question</div>
                <div className="qd-content qd-content--question">
                  <ContentPreview content={selectedQuestion.question} title="Your Question" quoted className="text-[color:var(--ink)]" onViewFull={setFullContent} />
                </div>
              </div>

              {selectedQuestion.status === 'Answered' && (
                <div>
                  <div className="field-label-top qd-section-label">Astrologer's Answer</div>
                  <div className="qd-content qd-content--answer">
                    <ContentPreview content={selectedQuestion.answer || 'No answer yet.'} title="Astrologer's Answer" quoted className="text-[color:var(--ink)]" onViewFull={setFullContent} />
                  </div>
                </div>
              )}

              {selectedQuestion.status === 'Answered' && recommendedAtonement && (() => {
                const progress = getAtonementProgress(recommendedAtonement)
                const statusLabel = progress.total && progress.completed === progress.total ? 'Completed' : progress.completed > 0 ? 'In Progress' : 'Not Started'
                return (
                  <div>
                    <div className="qd-atonement">
                      <div className="qd-atonement-head">
                        <span className="qd-atonement-icon" aria-hidden="true"><Sparkles size={16} /></span>
                        <div className="qd-atonement-heading">
                          <div className="qd-atonement-kicker">Recommended Atonement</div>
                          <div className="qd-atonement-hint">Your astrologer has recommended the following atonement for you.</div>
                        </div>
                        <StatusBadge label={statusLabel} />
                      </div>
                      <div className="qd-atonement-title">
                        <strong>{recommendedAtonement.title || recommendedAtonement.summary}</strong>
                        <span>{progress.total}-Day Remedy</span>
                      </div>
                      <div className="qd-atonement-progress">
                        <div className="qd-atonement-progress-row">
                          <span className="qd-atonement-progress-label">Progress</span>
                          <span className="qd-atonement-progress-count">{progress.completed} of {progress.total} days completed</span>
                          <strong>{progress.percent}%</strong>
                        </div>
                        <div className="atonement-progress"><span style={{ width: `${progress.percent}%` }} /></div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm qd-atonement-action"
                        onClick={() => navigate(`/user/atonements/${recommendedAtonement.id}`, { state: { from: `${routes.trackQuestions || '/user/track-questions'}?questionId=${selectedQuestion.id}` } })}
                      >
                        View Atonement Details <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )
              })()}

              {selectedQuestion.status === 'Pending' && selectedQuestion.submittedAt && (
                <div>
                  <div className="field-label-top" style={{ marginBottom: 8 }}>Time Limits</div>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const { editTimeRemaining, deleteTimeRemaining, isEditEnabled, isDeleteEnabled } = getQuestionTimeLimits(selectedQuestion)
                      return (
                        <>
                          <TimeLimitBadge
                            label="Edit"
                            timeRemaining={editTimeRemaining}
                            tooltip="You can edit this question within 30 minutes."
                            isEnabled={isEditEnabled}
                          />
                          <TimeLimitBadge
                            label="Delete"
                            timeRemaining={deleteTimeRemaining}
                            tooltip="You can delete this question within 1 hour."
                            isEnabled={isDeleteEnabled}
                          />
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              {selectedQuestion.dispute && (
                <Card style={{ padding: 14, display: 'grid', gap: 10 }}>
                  <div className="section-title" style={{ marginBottom: 2 }}>Dispute</div>
                  <div><strong>Target</strong><div className="muted">{selectedQuestion.dispute.target || '—'}</div></div>
                  <div><strong>Reason</strong><ContentPreview content={selectedQuestion.dispute.reason} title="Dispute Reason" onViewFull={setFullContent} /></div>
                  {selectedQuestion.dispute.description ? <div><strong>Description</strong><ContentPreview content={selectedQuestion.dispute.description} title="Dispute Description" onViewFull={setFullContent} /></div> : null}
                  <div><strong>Attachment</strong><div className="muted">{selectedQuestion.dispute.attachment || '—'}</div></div>
                  <div><strong>Dispute Status</strong><StatusBadge label={selectedQuestion.dispute.status || 'Open'} /></div>
                  <div><strong>{selectedQuestion.dispute.target === 'AstroConnect Platform' ? 'Platform Response' : 'Astrologer Response'}</strong><ContentPreview content={selectedQuestion.dispute.response || (selectedQuestion.dispute.target === 'AstroConnect Platform' ? 'Waiting for platform review.' : 'Waiting for astrologer update.')} title="Dispute Response" onViewFull={setFullContent} /></div>
                </Card>
              )}

              {ratingMode && (
                <Card className="qd-rating">
                  <div className="section-title qd-rating-title">
                    {ratingMode === 'dispute' ? 'Rate Dispute Resolution' : 'Rate & Review the Astrologer'}
                  </div>
                  <div className="qd-stars">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`qd-star${rating >= value ? ' is-active' : ''}`}
                        onClick={() => setRating(value)}
                        aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      >
                        <Star size={15} fill={rating >= value ? 'currentColor' : 'none'} /> {value}
                      </button>
                    ))}
                  </div>
                  <div className="muted qd-rating-hint">
                    {rating ? `Selected rating: ${rating} star${rating === 1 ? '' : 's'}` : 'Select a star rating and save it.'}
                  </div>
                  {ratingMode === 'answer' && (
                    <div className="field-group qd-feedback">
                      <label className="field-label-top">Your Feedback (Optional)</label>
                      <textarea
                        className="textarea-box"
                        placeholder="Share your experience with the astrologer's answer..."
                        maxLength={500}
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="btn-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        if (!rating) return
                        if (ratingMode === 'dispute') {
                          actions.rateDisputeResolution(selectedQuestion.id, rating)
                        } else {
                          actions.rateQuestionAnswer(selectedQuestion.id, rating, review)
                        }
                        setRatingSaved(true)
                      }}
                    >
                      Save Rating
                    </button>
                  </div>
                  {ratingSaved && (
                    <div className="badge badge-green" style={{ width: 'fit-content' }}>
                      {ratingMode === 'answer' ? 'Rating & feedback saved successfully' : 'Rating saved successfully'}
                    </div>
                  )}
                </Card>
              )}
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              {selectedQuestion.status === 'Pending' && selectedQuestion.submittedAt && (() => {
                const { isEditEnabled, isDeleteEnabled } = getQuestionTimeLimits(selectedQuestion)
                return (
                  <>
                    {isEditEnabled && (
                      <button className="btn btn-outline" onClick={() => { closeQuestion(); navigate(`${routes.askQuestion}?editQuestionId=${selectedQuestion.id}`) }}>
                        Edit
                      </button>
                    )}
                    {isDeleteEnabled && (
                      <button className="btn btn-danger" onClick={() => setDeleteConfirmId(selectedQuestion.id)}>
                        Delete
                      </button>
                    )}
                  </>
                )
              })()}
              {showRaiseDispute && (
                <button className="btn btn-primary" onClick={() => openRaiseDispute(selectedQuestion.id)}>
                  Raise Dispute
                </button>
              )}
              {showViewDispute && (
                <button className="btn btn-primary" onClick={() => openQuestion(selectedQuestion.id)}>
                  View
                </button>
              )}
              <button className="btn btn-ghost" onClick={closeQuestion}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {deleteConfirmId && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div
            className="modal-card user-modal-card"
            style={{ width: 'min(400px, calc(100vw - 32px))' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-modal-card__header flex items-center justify-between gap-4">
              <div id="delete-confirm-title" className="section-title" style={{ marginBottom: 0 }}>Delete Question?</div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setDeleteConfirmId(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="user-modal-card__content">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-[color:var(--red-500)] mt-0.5" />
                <div>
                  <div>Are you sure you want to delete this question?</div>
                  <div className="muted text-sm" style={{ marginTop: 8 }}>This action cannot be undone.</div>
                </div>
              </div>
            </div>
            <div className="user-modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => confirmDelete(deleteConfirmId)}>Delete Question</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {fullContent && createPortal(
        <div className="modal-overlay user-modal-overlay" style={{ zIndex: 10000 }} onClick={() => setFullContent(null)}>
          <div className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll" style={{ width: 'min(640px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>{fullContent.title}</div>
              <button type="button" className="icon-btn" aria-label="Close full content" onClick={() => setFullContent(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14, whiteSpace: 'pre-wrap' }}>{fullContent.content}</div>
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              <button type="button" className="btn btn-primary" onClick={() => setFullContent(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {disputeQuestion && (
        <RaiseDisputeModal
          question={disputeQuestion}
          onClose={() => setDisputeQuestionId(null)}
          onSubmitted={() => setDisputeSubmitted(true)}
        />
      )}

      {disputeSubmitted && (
        <SuccessAlert variant="user" message="Dispute submitted successfully." onDismiss={() => setDisputeSubmitted(false)} />
      )}
    </div>
  )
}
