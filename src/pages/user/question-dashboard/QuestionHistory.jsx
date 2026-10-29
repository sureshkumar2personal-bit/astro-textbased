import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Filter, History, Search, X } from 'lucide-react'
import CampaignCard, { CampaignStatusChip } from '../../../components/campaigns/CampaignCard.jsx'
import { campaignCardStatusStyle, campaignCardToneStyle } from '../../../components/campaigns/campaignCardTokens.js'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { mockAstrologers } from '../../../data/notificationData.js'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { formatAnswerDate, getAnswerSubmittedAtMs, getQuestionReceivedAt, getQuestionTypeLabel, isQuestionAnswered } from '../../../utils/answer.js'
import { getMonthLabel, getQuestionMonthKey, getQuestionSourceLabel, isOpenQuestion } from '../../../utils/questions.js'
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

// Same title-card treatment as the My Questions and Purchased Questions buckets.
const STATUS_CARD_META = {
  All: { background: 'var(--primary-bg)', color: 'var(--primary)', border: 'rgba(91, 33, 182, 0.20)', hint: 'Every archived question' },
  Completed: { background: 'var(--success-bg)', color: 'var(--green-600)', border: 'rgba(16, 185, 129, 0.30)', hint: 'Answered and finished' },
  Cancelled: { background: 'var(--neutral-bg)', color: 'var(--muted)', border: 'rgba(100, 116, 139, 0.24)', hint: 'Cancelled or expired' },
}

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

// The refund status already stored on the record ("Refunded" / "Completed" /
// "None"). A refund is shown on its own row; it is never used to reclassify a
// completed question as cancelled.
function refundStatusLabel(question) {
  const status = String(question.refundStatus || '').trim()
  if (status && status.toLowerCase() !== 'none') return status
  return 'Refunded'
}

function astrologerName(question) {
  return mockAstrologers.find((item) => item.id === question.astrologerId)?.name || question.user || 'Astrologer'
}

// Attachments already stored on the record (read-only). Shown only when the
// existing data actually carries them - nothing is fabricated.
function attachmentCount(question) {
  return Array.isArray(question.attachments) ? question.attachments.length : 0
}

const CHIP_STYLE = { background: 'var(--neutral-bg)', color: 'var(--muted)', border: '1px solid var(--surface-border)' }

// One archived question, using the same CampaignCard design as My Questions. It
// is deliberately read-only: the only action is View Details, which opens the
// existing History details modal. No dispute, edit, submit or purchase actions
// live here - those stay in My Questions.
function HistoryQuestionCard({ question, nowMs, onOpen }) {
  const cancelled = isHistoryCancelled(question, nowMs)
  const tone = cancelled ? 'slate' : 'green'
  const accentStyle = campaignCardToneStyle(tone) || campaignCardStatusStyle('Active')
  const answered = isQuestionAnswered(question)
  const payment = getQuestionPaymentSummary(question)
  const typeLabel = getQuestionTypeLabel(question)
  const sourceLabel = isOpenQuestion(question) ? 'Open Question' : getQuestionSourceLabel(question)
  const files = attachmentCount(question)

  const footer = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {answered ? (
        <div className="aq-track-card__answer">
          <div className="aq-track-card__answer-label">Astrologer&apos;s answer</div>
          {question.answer || 'No answer text recorded.'}
        </div>
      ) : (
        <div className="aq-track-card__note">This question closed without a delivered answer.</div>
      )}
      <div className="btn-row" style={{ marginTop: 4 }}>
        <button type="button" className="btn btn-outline" onClick={onOpen}>View Details</button>
      </div>
    </div>
  )

  return (
    <CampaignCard
      status={getHistoryStatusLabel(question, nowMs)}
      tone={tone}
      icon={<History size={22} aria-hidden="true" />}
      name={question.id}
      subtitle={`${astrologerName(question)} · ${sourceLabel} · ${typeLabel}`}
      description={question.question}
      chips={[
        <CampaignStatusChip key="type" style={{ background: accentStyle.softBg, color: accentStyle.accent, border: `1px solid ${accentStyle.border}` }}>{typeLabel}</CampaignStatusChip>,
        <CampaignStatusChip key="source" style={CHIP_STYLE}>{sourceLabel}</CampaignStatusChip>,
        question.category ? <CampaignStatusChip key="category" style={CHIP_STYLE}>{question.category}</CampaignStatusChip> : null,
        files > 0 ? <CampaignStatusChip key="attachments" style={CHIP_STYLE}>{`${files} attachment${files === 1 ? '' : 's'}`}</CampaignStatusChip> : null,
      ].filter(Boolean)}
      details={[
        { label: 'Asked', value: askedOn(question) },
        { label: 'Completed', value: completedOn(question) },
        { label: 'Payment', value: payment.label },
        { label: 'Paid', value: `₹${payment.paid.toLocaleString('en-IN')}` },
        ...(payment.refunded
          ? [{ label: 'Refund', value: `₹${payment.refund.toLocaleString('en-IN')} · ${refundStatusLabel(question)}` }]
          : []),
      ]}
      footer={footer}
    />
  )
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

  const monthLabelText = monthKey === HISTORY_ALL_MONTHS ? 'All months' : getMonthLabel(monthKey)

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
          <div className="track-questions-grid">
            {visibleHistory.map((question) => (
              <HistoryQuestionCard
                key={question.id}
                question={question}
                nowMs={nowMs}
                onOpen={() => setOpenQuestionId(question.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {openQuestion && <HistoryDetailModal question={openQuestion} onClose={() => setOpenQuestionId(null)} />}
    </div>
  )
}
