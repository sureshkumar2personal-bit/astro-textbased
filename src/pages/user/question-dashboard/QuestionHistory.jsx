import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  Filter,
  Search,
  X,
  Eye,
  User,
  Sparkles,
  CheckCircle2,
  Clock,
  Wallet,
  HelpCircle,
  FileText,
  AlertCircle,
} from 'lucide-react'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { mockAstrologers } from '../../../data/notificationData.js'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import {
  formatAnswerDate,
  getAnswerSubmittedAtMs,
  getQuestionReceivedAt,
  getQuestionTypeLabel,
  isQuestionAnswered,
} from '../../../utils/answer.js'
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
  const isCancelled = question.status === 'Cancelled' || Boolean(question.cancelledAt)

  return createPortal(
    <div className="modal-overlay user-modal-overlay" onClick={onClose}>
      <div
        className="history-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Question history details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="history-detail-modal__head">
          <div>
            <div className="history-detail-modal__eyebrow">
              <Sparkles size={11} />
              <span>Archived Consultation</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {question.category || 'Astrology Consultation'}
              </h3>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                {question.id}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {getQuestionSourceLabel(question)} · Consultation with {astrologerName(question)}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge label={question.status} />
            <button
              type="button"
              className="icon-btn"
              aria-label="Close question details"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="history-detail-modal__body">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="history-metric-card">
              <span className="history-metric-card__label">
                <User size={12} /> Astrologer
              </span>
              <strong className="history-metric-card__value truncate">{astrologerName(question)}</strong>
            </div>

            <div className="history-metric-card">
              <span className="history-metric-card__label">
                <Sparkles size={12} /> Category
              </span>
              <strong className="history-metric-card__value truncate">{question.category || 'General'}</strong>
            </div>

            <div className="history-metric-card">
              <span className="history-metric-card__label">
                <HelpCircle size={12} /> Type
              </span>
              <strong className="history-metric-card__value">{getQuestionTypeLabel(question)} Q&amp;A</strong>
            </div>

            <div className="history-metric-card">
              <span className="history-metric-card__label">
                <Wallet size={12} /> Payment
              </span>
              <strong className="history-metric-card__value truncate">{paymentLabel(payment)}</strong>
            </div>
          </div>

          {/* User's Question Card */}
          <div className="history-modal-question-card">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/40 dark:border-amber-800/40">
              <div className="flex items-center gap-2">
                <User size={15} className="text-amber-600 dark:text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wide text-amber-900 dark:text-amber-200">
                  Your Submitted Question
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock size={12} /> Asked on {askedOn(question)}
              </span>
            </div>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {question.question || EMPTY_DATE}
            </p>
            {question.attachments && question.attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200/40 dark:border-amber-800/40 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Attachments:</span>
                {question.attachments.map((file, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white/90 dark:bg-slate-800 border border-stone-200 dark:border-stone-700 text-slate-700 dark:text-slate-300">
                    <FileText size={12} className="text-amber-600 dark:text-amber-400" />
                    {file}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Astrologer's Answer Card or Cancellation Banner */}
          {isCancelled ? (
            <div className="history-modal-cancelled-banner">
              <AlertCircle size={20} className="shrink-0 text-rose-500" />
              <div>
                <strong className="block text-rose-900 dark:text-rose-200 font-bold mb-1">
                  Consultation Cancelled
                </strong>
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  This question was not answered within the required window or was cancelled. Any applicable consultation fee has been refunded back to your wallet.
                </p>
              </div>
            </div>
          ) : (
            <div className="history-modal-answer-card">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-200/40 dark:border-emerald-800/40">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-xs uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
                    Astrologer&apos;s Consultation Answer
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} /> Delivered on {completedOn(question)}
                </span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                {question.answer || 'No answer was provided for this question.'}
              </p>
            </div>
          )}

          {/* Consultation Summary & Lifecycle Metadata */}
          <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/60 dark:bg-slate-900/40">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Consultation &amp; Lifecycle Details
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Asked Date</span>
                <strong className="text-slate-700 dark:text-slate-200">{askedOn(question)}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{isCancelled ? 'Cancelled Date' : 'Completed Date'}</span>
                <strong className="text-slate-700 dark:text-slate-200">{completedOn(question)}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Consultation Mode</span>
                <strong className="text-slate-700 dark:text-slate-200">Text-Based Q&amp;A</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Question For</span>
                <strong className="text-slate-700 dark:text-slate-200">{question.questionFor || 'Self'}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-card__footer user-modal-card__footer flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Archived record · Read only
          </span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
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
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Completed Cycles &amp; Archivals
            </h3>
            <div className="space-y-3">
              {visibleHistory.map((question) => {
                const cancelled = isHistoryCancelled(question, nowMs)
                const payment = getQuestionPaymentSummary(question)
                const typeLabel = getQuestionTypeLabel(question)
                const isPersonal = typeLabel === 'Personal'
                const statusLabel = getHistoryStatusLabel(question, nowMs)
                return (
                  <div
                    key={question.id}
                    className="history-row-card p-4 rounded-xl border border-stone-200/90 dark:border-stone-800/90 bg-white/90 dark:bg-slate-900/70 shadow-xs hover:border-amber-400/80 dark:hover:border-amber-600/70 hover:shadow-sm transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60">
                          {question.id}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {question.category || 'General Guidance'}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <User size={12} className="text-slate-400" />
                          {astrologerName(question)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPersonal
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {typeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {question.question}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} className="text-slate-400" /> Asked {askedOn(question)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-slate-400" /> Completed {completedOn(question)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Wallet size={12} className="text-slate-400" /> {paymentLabel(payment)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        cancelled
                          ? 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                      }`}>
                        {statusLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenQuestionId(question.id)}
                        className="px-3 py-1.5 rounded-xl border border-amber-300/80 dark:border-amber-700/80 text-amber-800 dark:text-amber-300 bg-amber-50/50 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <Eye size={13} />
                        <span>View Details</span>
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
