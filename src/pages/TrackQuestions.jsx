import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, Clock, AlertTriangle, Sparkles, ArrowRight, Star, Gavel, CalendarDays } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import SummaryCard from '../components/ui/SummaryCard.jsx'
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
import {
  QUESTION_CREDIT_AVAILABLE,
  getQuestionCreditDaysRemaining,
  getQuestionCreditOfferLabel,
  getQuestionCreditSourceLabel,
  getQuestionCreditsForUser,
} from '../utils/questionCredits.js'
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

// One active question, shown as a full record: identity, source, type, date,
// the question text, the current lifecycle stage, the answer once it exists and
// the dispute / refund state that belongs to the same question record.
function LifecycleQuestionCard({ question, nowMs, onOpen, onRaiseDispute }) {
  const stage = getQuestionLifecycleStage(question, nowMs)
  const answered = isQuestionAnswered(question)
  const dispute = question.dispute || null
  const refund = getQuestionRefundInfo(question)
  const canRaiseDispute = isDisputeWindowOpen(question, nowMs)
  const astrologerName = mockAstrologers.find((item) => item.id === question.astrologerId)?.name || question.user || 'Astrologer'
  const sourceLabel = isOpenQuestion(question) ? 'Open Question' : getQuestionSourceLabel(question)

  return (
    <Card className="aq-track-card">
      <div className="aq-track-card__head">
        <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{question.id}</div>
        <StatusBadge label={stage} />
      </div>

      <div className="aq-track-card__meta">
        <span>{astrologerName}</span>
        <span>·</span>
        <span>{sourceLabel}</span>
        <span>·</span>
        <span>{getQuestionTypeLabel(question)}</span>
      </div>
      <div className="muted" style={{ fontSize: 12.5 }}>
        Asked: {formatAnswerDate(getQuestionReceivedAt(question)) || question.raised || '—'} · {question.purchaseType}
      </div>

      <div className="aq-track-card__question">{question.question}</div>

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

      <div className="btn-row" style={{ marginTop: 14 }}>
        {answered && <button className="btn btn-outline" onClick={onOpen}>View Answer</button>}
        {!answered && <button className="btn btn-outline" onClick={onOpen}>View Question</button>}
        {canRaiseDispute && (
          <button className="btn aq-track-card__dispute-btn" onClick={(event) => { event.stopPropagation(); onRaiseDispute(question.id) }}>
            <Gavel size={14} aria-hidden="true" />
            Raise a Dispute
          </button>
        )}
      </div>
    </Card>
  )
}

// Month selector. "All" below it means "every active question in this month".
function MonthSelector({ monthKey, options, onChange }) {
  return (
    <label className="aq-track-month">
      <CalendarDays size={15} aria-hidden="true" />
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
    </label>
  )
}

function formatCreditDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
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
// "Pay Now, Ask Later" receipts. These are paid questions that have not been
// written yet, so they are listed here - never as a submitted question - until
// the question is actually sent.
function AvailableQuestionCredits({ credits, onAskNow }) {
  if (credits.length === 0) return null

  return (
    <Section className="!mt-0">
      <Card>
        <div className="section-title">Available Questions</div>
        <div className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
          Paid questions you can submit now or come back to later. A credit expires after 7 days.
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {credits.map((credit) => {
            const isAvailable = credit.status === QUESTION_CREDIT_AVAILABLE
            const offerLabel = getQuestionCreditOfferLabel(credit)
            const daysLeft = getQuestionCreditDaysRemaining(credit)
            return (
              <Card key={credit.id} className="aq-credit-card">
                <div className="aq-credit-card__head">
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{credit.astrologerName}</div>
                  <StatusBadge label={isAvailable ? 'Available' : 'Expired'} />
                </div>
                <div className="muted" style={{ fontSize: 13.5 }}>
                  {getQuestionCreditSourceLabel(credit)} · {credit.questionType} question
                </div>
                {offerLabel ? <span className="aq-credit-card__offer">{offerLabel}</span> : null}
                <div className="aq-credit-card__meta">
                  <span><strong>Purchased</strong> {formatCreditDate(credit.purchasedAt)}</span>
                  <span><strong>Paid</strong> ₹{Number(credit.paidPrice || 0).toLocaleString('en-IN')}</span>
                  <span>
                    <strong>Expires</strong> {formatCreditDate(credit.expiresAt)}
                    {isAvailable ? ` · in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : ''}
                  </span>
                </div>
                {isAvailable ? (
                  <button type="button" className="btn btn-primary aq-credit-card__action" onClick={() => onAskNow(credit)}>
                    Ask Now
                  </button>
                ) : (
                  <div className="aq-credit-card__expired">Expired — this question can no longer be submitted.</div>
                )}
              </Card>
            )
          })}
        </div>
      </Card>
    </Section>
  )
}

export default function TrackQuestions({ embedded = false }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { questions, questionPreviewId, setQuestionPreviewId, purchasedSlots, actions } = useAppData()
  const { currentUser } = useAuth()
  const { allAtonements } = useUserAtonements()
  const routes = getRoleRoutes(currentUser?.role)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
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

    return source.sort((a, b) => new Date(b.raisedAt || b.raised) - new Date(a.raisedAt || a.raised))
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

  // Unused "Pay Now, Ask Later" credits plus the ones whose 7-day window has
  // closed, so the user can see both what they can still use and what expired.
  const questionCredits = useMemo(
    () => getQuestionCreditsForUser(purchasedSlots, currentUser).filter((credit) => credit.status !== 'Used'),
    [purchasedSlots, currentUser],
  )

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
      {/* Month selector. Every record below belongs to the selected month. */}
      {embedded ? (
        <div className="aq-track-head">
          <div className="aq-track-head__title">Track My Questions</div>
          <MonthSelector monthKey={monthKey} options={monthOptions} onChange={handleMonthChange} />
        </div>
      ) : (
        <PageHeader
          eyebrow="User portal"
          title="Track My Questions"
          showBack
          backTo={routes.askQuestion}
          actions={<MonthSelector monthKey={monthKey} options={monthOptions} onChange={handleMonthChange} />}
        />
      )}

      {/* Paid-but-unwritten questions come first: they still need the user to
          write the question, so they are not part of the submitted list. */}
      <AvailableQuestionCredits
        credits={questionCredits}
        onAskNow={(credit) => navigate(`${routes.askQuestion}?redeemCreditId=${encodeURIComponent(credit.id)}`)}
      />

<Section>
        <Card>
          <div className="search-filter-row">
            <div className="search-filter-row__group">
              <div className="search-filter-row__heading">Search</div>
              <div className="search-bar">
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
            </div>
          </div>
        </Card>
      </Section>

      <Section className="!mt-6">
        <div className="grid grid-cols-2 items-stretch gap-4 lg:grid-cols-5" style={{ gridAutoRows: 'minmax(132px, 1fr)' }}>
          {LIFECYCLE_FILTERS.map((filter) => {
            const meta = LIFECYCLE_STAGE_META[filter]
            return (
              <div key={filter} className="h-full" style={{ minHeight: 132 }}>
                <SummaryCard
                  label={filter}
                  value={lifecycleCounts[filter] || 0}
                  hint={meta?.hint || ''}
                  background={meta?.background}
                  color={meta?.color}
                  border={meta?.border}
                  onClick={() => setLifecycleFilter(filter)}
                  active={lifecycleFilter === filter}
                />
              </div>
            )
          })}
        </div>
      </Section>

      <div className="section">
        <Card style={{ marginTop: 0 }}>
          <div className="section-title">{getMonthLabel(monthKey)} · Active Questions</div>
          {visibleQuestions.length === 0 && (
            <div className="mb-4 rounded-[14px] border border-[color:var(--border)] bg-white/90 px-4 py-3 text-sm text-[color:var(--muted)]">
              {lifecycleFilter === 'All'
                ? `No active questions in ${getMonthLabel(monthKey)}. Finished questions are in History.`
                : `No ${lifecycleFilter.toLowerCase()} questions in ${getMonthLabel(monthKey)}.`}
            </div>
           )}
           <div className="track-questions-grid">
             {visibleQuestions.map((question) => (
               <LifecycleQuestionCard
                 key={question.id}
                 question={question}
                 nowMs={nowMs}
                 onOpen={() => openQuestion(question.id)}
                 onRaiseDispute={(id) => navigate(`${routes.raiseDispute}?questionId=${id}`)}
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
                  <div><strong>Target</strong><div className="muted">{selectedQuestion.dispute.target}</div></div>
                  <div><strong>Reason</strong><ContentPreview content={selectedQuestion.dispute.reason} title="Dispute Reason" onViewFull={setFullContent} /></div>
                  {selectedQuestion.dispute.description ? <div><strong>Description</strong><ContentPreview content={selectedQuestion.dispute.description} title="Dispute Description" onViewFull={setFullContent} /></div> : null}
                  <div><strong>Attachment</strong><div className="muted">{selectedQuestion.dispute.attachment || 'Attachment.pdf'}</div></div>
                  <div><strong>Dispute Status</strong><StatusBadge label={selectedQuestion.dispute.status || 'Open'} /></div>
                  <div><strong>Astrologer Response</strong><ContentPreview content={selectedQuestion.dispute.response || 'Waiting for astrologer update.'} title="Astrologer Response" onViewFull={setFullContent} /></div>
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
                <button className="btn btn-primary" onClick={() => navigate(`${routes.raiseDispute}?questionId=${selectedQuestion.id}`)}>
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
    </div>
  )
}
