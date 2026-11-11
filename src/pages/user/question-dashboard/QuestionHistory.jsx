import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Filter, Search, X } from 'lucide-react'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { mockAstrologers } from '../../../data/notificationData.js'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { formatAnswerDate, getAnswerSubmittedAtMs, getQuestionReceivedAt, getQuestionTypeLabel } from '../../../utils/answer.js'
import { getMonthLabel, getQuestionMonthKey, getQuestionSourceLabel } from '../../../utils/questions.js'
import {
  HISTORY_ALL_MONTHS,
  HISTORY_STATUS_FILTERS,
  countHistoryStatuses,
  getHistoryMonthOptions,
  getHistoryStatusLabel,
  getQuestionPaymentSummary,
  getUserQuestionHistory,
  isHistoryCancelled,
  matchesHistorySearchFilter,
  matchesHistoryStatusFilter,
} from '../../../utils/questionDashboard.js'

const EMPTY_DATE = '—'

function askedOn(question) {
  return formatAnswerDate(getQuestionReceivedAt(question)) || EMPTY_DATE
}

function answeredOn(question) {
  const answeredMs = getAnswerSubmittedAtMs(question)
  if (answeredMs) return formatAnswerDate(new Date(answeredMs))
  return isQuestionAnswered(question) ? 'Answered' : EMPTY_DATE
}

// When the record finished: the answer date when one was delivered, otherwise
// the cancellation / closure timestamp the lifecycle already stores.
function completedOn(question) {
  const answeredMs = getAnswerSubmittedAtMs(question)
  if (answeredMs) return formatAnswerDate(new Date(answeredMs))
  if (question.cancelledAt) return formatAnswerDate(question.cancelledAt)
  if (question.closedAt) return formatAnswerDate(question.closedAt)
  return EMPTY_DATE
}

function paymentLabel(payment) {
  return `${payment.label} · ₹${payment.paid.toLocaleString('en-IN')}`
}

function astrologerName(question) {
  return mockAstrologers.find((item) => item.id === question.astrologerId)?.name || question.user || 'Astrologer'
}

function HistoryStatusSelector({ filter, counts, onChange }) {
  return (
    <label className="aq-track-month">
      <Filter size={15} aria-hidden="true" />
      <select
        className="select-input"
        value={filter}
        aria-label="Filter by question status"
        onChange={(event) => onChange(event.target.value)}
      >
        {HISTORY_STATUS_FILTERS.map((stage) => (
          <option key={stage} value={stage}>
            {stage} ({counts[stage] || 0})
          </option>
        ))}
      </select>
      <ChevronDown className="aq-track-month__chevron" size={15} aria-hidden="true" />
    </label>
  )
}

// Month selector, consistent with the My Questions selector, plus an All Months
// option so the whole archive can be reviewed across every available month.
function HistoryMonthSelector({ monthKey, options, onChange }) {
  return (
    <label className="aq-track-month">
      <CalendarDays size={15} aria-hidden="true" />
      <select
        className="select-input"
        value={monthKey}
        aria-label="Select month"
        onChange={(event) => onChange(event.target.value)}
      >
        <option value={HISTORY_ALL_MONTHS}>All Months</option>
        {options.map((key) => (
          <option key={key} value={key}>{getMonthLabel(key)}</option>
        ))}
      </select>
      <ChevronDown className="aq-track-month__chevron" size={15} aria-hidden="true" />
    </label>
  )
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
            <div className="qd-full-content-box">
              {question.question || EMPTY_DATE}
            </div>
          </div>

          <div>
            <div className="field-label-top" style={{ marginBottom: 8 }}>Astrologer&apos;s Answer</div>
            <div className="qd-full-content-box">
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
  const [statusFilter, setStatusFilter] = useState('All')
  const [monthKey, setMonthKey] = useState(HISTORY_ALL_MONTHS)
  const [search, setSearch] = useState('')
  const [openQuestionId, setOpenQuestionId] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Day-based lifecycle changes (an answer's dispute window closing) move a
  // question from My Questions into History; this keeps the archive current.
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Every finished question the user owns, across all months. Read straight from
  // the existing records - no window, no duplicated or fabricated rows.
  const history = useMemo(
    () => getUserQuestionHistory(questions, currentUser, { nowMs }),
    [questions, currentUser, nowMs],
  )

  // Months the selector offers: every month that holds an archived record plus
  // the current month, matching the My Questions selector. All Months stays the
  // first option and carries no extra text.
  const monthOptions = useMemo(
    () => getHistoryMonthOptions(history, { now: new Date(nowMs) }),
    [history, nowMs],
  )

  const monthScoped = useMemo(
    () => (monthKey === HISTORY_ALL_MONTHS
      ? history
      : history.filter((question) => getQuestionMonthKey(question, null) === monthKey)),
    [history, monthKey],
  )

  // Counts follow the selected month, so a count can never include a record its
  // month filter then hides.
  const counts = useMemo(() => countHistoryStatuses(monthScoped, { nowMs }), [monthScoped, nowMs])

  const visibleHistory = useMemo(
    () => monthScoped.filter(
      (question) => matchesHistoryStatusFilter(question, statusFilter, nowMs) && matchesHistorySearchFilter(question, search),
    ),
    [monthScoped, statusFilter, search, nowMs],
  )

  const openQuestion = useMemo(
    () => history.find((question) => question.id === openQuestionId) || null,
    [history, openQuestionId],
  )

  return (
    <div>
      <div className="aq-track-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <HistoryStatusSelector filter={statusFilter} counts={counts} onChange={setStatusFilter} />
        <HistoryMonthSelector monthKey={monthKey} options={monthOptions} onChange={setMonthKey} />
      </div>

      <Section className="!mt-6" title="Archived Questions">
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 16 }}>
          <span className="muted" style={{ fontSize: 13 }}>
            Showing {visibleHistory.length} of {monthScoped.length} questions
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
              {monthScoped.length === 0
                ? (monthKey === HISTORY_ALL_MONTHS
                  ? 'No past questions are available yet.'
                  : `No history records for ${getMonthLabel(monthKey)}.`)
                : `No ${statusFilter.toLowerCase()} questions match the current filters.`}
            </div>
          </Card>
        ) : (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Completed Cycles &amp; Archivals</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {visibleHistory.map((question) => {
                const cancelled = isHistoryCancelled(question, nowMs)
                const payment = getQuestionPaymentSummary(question)
                const typeLabel = getQuestionTypeLabel(question)
                const isPersonal = typeLabel === 'Personal'
                const statusLabel = getHistoryStatusLabel(question, nowMs)
                return (
                  <div key={question.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{question.id}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{question.category || 'General Guidance'}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 dark:text-slate-400">{astrologerName(question)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPersonal
                            ? 'bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {typeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{question.question}</p>
                      <p className="text-[11px] text-slate-400">
                        Asked on {askedOn(question)} • Completed on {completedOn(question)} • {paymentLabel(payment)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                        cancelled
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                      }`}>
                        {statusLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenQuestionId(question.id)}
                        className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs font-semibold transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Section>

      {openQuestion && <HistoryDetailModal question={openQuestion} onClose={() => setOpenQuestionId(null)} />}
    </div>
  )
}
