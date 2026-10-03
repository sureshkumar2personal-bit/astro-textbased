import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import SummaryCard from '../../../components/ui/SummaryCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { formatAnswerDate, getAnswerSubmittedAtMs, getQuestionReceivedAt, getQuestionTypeLabel, isQuestionAnswered } from '../../../utils/answer.js'
import { getQuestionSourceLabel } from '../../../utils/questions.js'
import { isQuestionCompleted } from '../../../utils/questionLifecycle.js'
import {
  HISTORY_STATUS_FILTERS,
  countHistoryStatuses,
  getHistoryWindowLabel,
  getQuestionPaymentSummary,
  getUserQuestionHistory,
  matchesHistorySearchFilter,
  matchesHistoryStatusFilter,
} from '../../../utils/questionDashboard.js'

// Same title-card treatment as the dispute buckets and the Text-Based Questions
// module summary cards.
const STATUS_CARD_META = {
  All: { background: 'var(--primary-bg)', color: 'var(--primary)', border: 'rgba(91, 33, 182, 0.20)', hint: 'Completed questions' },
  Answered: { background: 'var(--success-bg)', color: 'var(--green-600)', border: 'rgba(16, 185, 129, 0.30)', hint: 'Answer delivered' },
  Disputed: { background: 'var(--danger-bg)', color: 'var(--red-600)', border: 'rgba(239, 68, 68, 0.24)', hint: 'Disputed outcome' },
  Resolved: { background: 'var(--amber-100)', color: 'var(--amber-600)', border: 'rgba(245, 158, 11, 0.30)', hint: 'Dispute resolved' },
  Closed: { background: 'var(--neutral-bg)', color: 'var(--muted)', border: 'rgba(100, 116, 139, 0.24)', hint: 'Closed or cancelled' },
}

const EMPTY_DATE = '—'

function MetaPair({ label, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
      <span className="muted" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', flex: 'none' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{children}</span>
    </span>
  )
}

function askedOn(question) {
  return formatAnswerDate(getQuestionReceivedAt(question)) || EMPTY_DATE
}

function answeredOn(question) {
  const answeredMs = getAnswerSubmittedAtMs(question)
  if (answeredMs) return formatAnswerDate(new Date(answeredMs))
  return isQuestionAnswered(question) ? 'Answered' : EMPTY_DATE
}

function paymentLabel(payment) {
  return `${payment.label} · ₹${payment.paid.toLocaleString('en-IN')}`
}

function questionSnippet(question) {
  const text = String(question.question || '').trim()
  return text.length <= 140 ? text : `${text.slice(0, 140).trimEnd()}...`
}

function HistoryDetailModal({ question, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const payment = getQuestionPaymentSummary(question)

  return createPortal(
    <div className="modal-overlay user-modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll"
        style={{ width: 'min(760px, calc(100vw - 32px))' }}
        role="dialog"
        aria-modal="true"
        aria-label="Question history details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
          <div style={{ minWidth: 0 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Question</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{getQuestionSourceLabel(question)} · {question.id}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <StatusBadge label={question.status} />
            <button type="button" className="icon-btn" aria-label="Close question details" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-card__content user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="field-label-top" style={{ marginBottom: 8 }}>Your Question</div>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14, whiteSpace: 'pre-wrap' }}>
              {question.question || EMPTY_DATE}
            </div>
          </div>

          <div>
            <div className="field-label-top" style={{ marginBottom: 8 }}>Astrologer&apos;s Answer</div>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14, whiteSpace: 'pre-wrap' }}>
              {question.answer || 'No answer was provided for this question.'}
            </div>
          </div>

          <Card style={{ padding: 14, display: 'grid', gap: 10 }}>
            <div className="section-title" style={{ marginBottom: 2 }}>Summary</div>
            <div><strong>Category</strong><div className="muted">{question.category}</div></div>
            <div><strong>Question Type</strong><div className="muted">{getQuestionTypeLabel(question)}</div></div>
            <div><strong>Asked On</strong><div className="muted">{askedOn(question)}</div></div>
            <div><strong>Answered On</strong><div className="muted">{answeredOn(question)}</div></div>
            <div><strong>Payment</strong><div className="muted">{paymentLabel(payment)}</div></div>
          </Card>
        </div>

        <div className="modal-card__footer user-modal-card__footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function QuestionHistory() {
  const { questions } = useAppData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(currentUser?.role)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [openQuestionId, setOpenQuestionId] = useState(null)

  // Intended scope: completed questions from the last six months. A question only
  // arrives here once its lifecycle finished, so nothing can be listed in both
  // Track My Questions and History.
  const history = useMemo(
    () => getUserQuestionHistory(questions, currentUser).filter((question) => isQuestionCompleted(question, Date.now())),
    [questions, currentUser],
  )
  const counts = useMemo(() => countHistoryStatuses(history), [history])

  const visibleHistory = useMemo(
    () => history.filter(
      (question) => matchesHistoryStatusFilter(question, statusFilter) && matchesHistorySearchFilter(question, search),
    ),
    [history, statusFilter, search],
  )
  const openQuestion = useMemo(
    () => history.find((question) => question.id === openQuestionId) || null,
    [history, openQuestionId],
  )

  return (
    <div>
      <Section title="History" titleRight={<span className="muted">Completed questions · {getHistoryWindowLabel()}</span>}>
        <div className="grid grid-cols-2 items-stretch gap-4 lg:grid-cols-5" style={{ gridAutoRows: 'minmax(132px, 1fr)' }}>
          {HISTORY_STATUS_FILTERS.map((filter) => {
            const meta = STATUS_CARD_META[filter]
            return (
              <div key={filter} className="h-full" style={{ minHeight: 132 }}>
                <SummaryCard
                  label={filter}
                  value={counts[filter] || 0}
                  hint={meta.hint}
                  background={meta.background}
                  color={meta.color}
                  border={meta.border}
                  onClick={() => setStatusFilter(statusFilter === filter && filter !== 'All' ? 'All' : filter)}
                  active={statusFilter === filter}
                />
              </div>
            )
          })}
        </div>
      </Section>

      <Section className="!mt-6" title="Completed Questions">
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 16 }}>
          <span className="muted" style={{ fontSize: 13 }}>
            Showing {visibleHistory.length} of {history.length} questions
          </span>
          <div className="search-bar" style={{ maxWidth: 280 }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search question or ID"
              className="text-input search-bar__input"
              aria-label="Search question history"
            />
            <button type="button" className="icon-btn" aria-label="Search" onClick={() => setSearch(search.trim())}>
              <Search size={18} />
            </button>
          </div>
        </div>

        {visibleHistory.length === 0 ? (
          <Card>
            <div className="muted">
              {history.length === 0
                ? 'No question history is available for this period.'
                : `No questions match the ${statusFilter} filter.`}
            </div>
            {history.length === 0 && (
              <button type="button" className="btn btn-outline mt-4" onClick={() => navigate(routes.askQuestion)}>Ask a New Question</button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleHistory.map((question) => (
              <Card key={question.id} className="question-dashboard-row">
                <div className="question-dashboard-row__head">
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{question.id}</div>
                  <StatusBadge label={question.status} />
                </div>
                <div className="muted" style={{ fontSize: 13.5 }}>
                  {getQuestionSourceLabel(question)} · {question.category} · {getQuestionTypeLabel(question)}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{questionSnippet(question)}</div>
                <div className="question-dashboard-row__meta">
                  <MetaPair label="Asked">{askedOn(question)}</MetaPair>
                  <MetaPair label="Answered">{answeredOn(question)}</MetaPair>
                  <MetaPair label="Payment">{paymentLabel(getQuestionPaymentSummary(question))}</MetaPair>
                </div>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setOpenQuestionId(question.id)}>View Details</button>
                  <button type="button" className="btn btn-primary" onClick={() => navigate(`${routes.askQuestion}/my-questions?questionId=${question.id}`)}>
                    Open in My Questions
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {openQuestion && <HistoryDetailModal question={openQuestion} onClose={() => setOpenQuestionId(null)} />}
    </div>
  )
}