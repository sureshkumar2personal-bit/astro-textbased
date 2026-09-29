import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import BackButton from '../components/BackButton.jsx'
import SummaryCard from '../components/ui/SummaryCard.jsx'
import AnswerAttachmentPanel from '../components/AnswerAttachmentPanel.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { useTheme } from '../state/ThemeContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { getMonthBounds, getMonthKeyFromDate, getMonthLabel, getQuestionSourceLabel, isOpenQuestion, shiftMonthKey } from '../utils/questions.js'
import {
  formatAnswerDate,
  getAnswerSubmittedAtMs,
  getQuestionAnswerDeadline,
  getQuestionReceivedAt,
  getQuestionTypeLabel,
  isQuestionCancelled,
  isQuestionNeedingAnswer,
} from '../utils/answer.js'
import { getQuestionPaidAmount, getQuestionRefundAmount, isSaleQuestion } from '../utils/sales.js'
import { TempleReturnIcon } from '../components/TempleIcons.jsx'

// History only ever reports an outcome: answered, auto-cancelled after the
// shared 30-day deadline, or a dispute that was resolved.
const STATUS_FILTERS = ['All', 'Completed', 'Cancelled', 'Resolved']

// Same coloured title-card design used by the Questions page.
const STATUS_CARD_META = {
  All: { background: 'var(--primary-bg)', color: 'var(--primary)', border: 'rgba(91, 33, 182, 0.20)', hint: 'All history records' },
  Completed: { background: 'var(--success-bg)', color: 'var(--green-600)', border: 'rgba(16, 185, 129, 0.30)', hint: 'Answered within 30 days' },
  Cancelled: { background: 'var(--danger-bg)', color: 'var(--red-600)', border: 'rgba(239, 68, 68, 0.24)', hint: 'Answer deadline exceeded' },
  Resolved: { background: 'var(--amber-100)', color: 'var(--amber-600)', border: 'rgba(245, 158, 11, 0.30)', hint: 'Dispute resolved' },
}

const HISTORY_PAGE_SIZE = 8

// Same ellipsis page-token algorithm used by the Questions page.
function buildPageTokens(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const tokens = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) tokens.push('start-ellipsis')
  for (let value = start; value <= end; value += 1) tokens.push(value)
  if (end < totalPages - 1) tokens.push('end-ellipsis')
  tokens.push(totalPages)
  return tokens
}

function inr(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function getHistoryStatus(question = {}) {
  const disputeStatus = String((question.dispute && question.dispute.status) || '').toLowerCase()
  if (disputeStatus === 'resolved') return 'Resolved'
  const answered = String(question.status || '') === 'Answered' || Boolean(String(question.answer || '').trim())
  if (!answered || isQuestionCancelled(question) || String(question.status || '') === 'Closed') return 'Cancelled'
  return 'Completed'
}

function getHistorySource(question = {}) {
  return isOpenQuestion(question) ? 'Open Question' : 'Campaign'
}

function getHistorySourceText(question = {}) {
  if (getHistorySource(question) === 'Open Question') return 'Source: Open Question'
  return `Source: Campaign · ${getQuestionSourceLabel(question)}`
}

function getHistorySnippet(question = {}) {
  const text = String(question.question || '').replace(/\s+/g, ' ').trim()
  if (text.length <= 140) return text
  return `${text.slice(0, 140).trimEnd()}…`
}

function getPaymentStatus(question = {}) {
  const refundState = String(question.refundStatus || '').toLowerCase()
  if (getQuestionRefundAmount(question) > 0 || refundState === 'refunded' || refundState === 'completed') return 'Refunded'
  if (isSaleQuestion(question)) return 'Paid'
  return 'Free'
}

function askedOnLabel(question = {}) {
  const received = getQuestionReceivedAt(question)
  return received ? formatAnswerDate(received) : String(question.raised || '')
}

function deadlineLabel(question = {}) {
  const deadline = getQuestionAnswerDeadline(question)
  return deadline ? formatAnswerDate(deadline) : '—'
}

function completedOnLabel(question = {}) {
  const submittedMs = getAnswerSubmittedAtMs(question)
  return submittedMs ? formatAnswerDate(new Date(submittedMs)) : ''
}

// One record = one complete bordered box. Every card renders the exact same
// three bands (identity → question → metadata), so no card grows or shrinks
// differently because of its content.
const RECORD_CARD_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: '100%',
  padding: '16px 18px',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--radius-l)',
  boxShadow: 'var(--shadow-card)',
}

// Four pastel tints applied by record index (1 green, 2 blue, 3 lavender,
// 4 peach, then repeating) so each question card reads as its own item while
// the list still looks like one calm, consistent set.
//
// These are direct hex values on purpose. The previous attempt blended the
// theme's soft tokens into white, which resolved to within ~10/255 of pure
// white (imperceptible), and it also broke whenever a token was missing from
// the active theme block. Direct hex always renders, and both sets are chosen
// so the existing text colours stay highly readable.
//
// Only the background varies - border, radius, shadow, spacing and typography
// stay shared via RECORD_CARD_STYLE.
const RECORD_CARD_TONES_LIGHT = ['#DFF3E7', '#DDEBFA', '#EAE2F8', '#FBEADA']
const RECORD_CARD_TONES_DARK = ['#12261E', '#121E2E', '#1E1A2F', '#2A2018']

// Small "Label  value" pair used by the metadata band.
function RecordMeta({ label, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
      <span
        className="muted"
        style={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          flex: 'none',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{children}</span>
    </span>
  )
}

function HistoryRecordCard({ question, onOpenDetails, index, isDark }) {
  const status = getHistoryStatus(question)
  const paymentStatus = getPaymentStatus(question)
  const refunded = paymentStatus === 'Refunded'
  const userName = question.user || question.userName
  // Real identifier already present on the record (same field order the
  // detail view and the search box use). Nothing is invented here.
  const userId = question.userId || question.submittedByUserId || ''
  const paidAmount = getQuestionPaidAmount(question)
  const tones = isDark ? RECORD_CARD_TONES_DARK : RECORD_CARD_TONES_LIGHT
  const cardStyle = { ...RECORD_CARD_STYLE, background: tones[index % tones.length] }

  return (
    <div style={cardStyle}>
      {/* Band 1 - who and where the question came from */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
              overflowWrap: 'anywhere',
            }}
          >
            {userName || 'Unknown user'}
          </span>
          {userId ? (
            <span
              className="muted"
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                overflowWrap: 'anywhere',
              }}
            >
              User ID: {userId}
            </span>
          ) : null}
        </div>
        <span
          className="muted"
          style={{
            flex: 'none',
            padding: '4px 11px',
            borderRadius: 999,
            border: '1px solid var(--surface-border)',
            background: 'var(--surface-soft)',
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {getHistorySourceText(question)}
        </span>
      </div>

      {/* Band 2 - the question itself is the main content */}
      <div
        style={{
          fontSize: 14.5,
          fontWeight: 600,
          lineHeight: 1.5,
          color: 'var(--text-primary)',
          overflowWrap: 'anywhere',
        }}
      >
        {getHistorySnippet(question)}
      </div>

      {/* Band 3 - Asked, then Paid, then Status last on the right */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          paddingTop: 12,
          borderTop: '1px solid var(--surface-border)',
        }}
      >
        <RecordMeta label="Asked">{askedOnLabel(question)}</RecordMeta>
        <RecordMeta label="Paid">₹{inr(paidAmount)}</RecordMeta>
        {refunded ? (
          <RecordMeta label="Refunded">₹{inr(getQuestionRefundAmount(question))}</RecordMeta>
        ) : (
          <RecordMeta label="Payment">{paymentStatus}</RecordMeta>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span
            className="muted"
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Status
          </span>
          <StatusBadge label={status} />
        </span>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onOpenDetails(question.id)}>
          View Details
        </button>
      </div>
    </div>
  )
}

// Month is the PRIMARY selection: History is always scoped to a whole month.
// The arrows move month to month and the label always reflects the active
// month + year. The day box is an OPTIONAL numeric narrowing - clearing it
// goes back to the full month.
function HistoryPeriodControls({ monthKey, day, onMonthChange, onDayChange }) {
  const [dayDraft, setDayDraft] = useState(day == null ? '' : String(day))

  useEffect(() => {
    setDayDraft(day == null ? '' : String(day))
  }, [day])

  const daysInMonth = (() => {
    const bounds = getMonthBounds(monthKey)
    return bounds ? bounds.end.getDate() : 31
  })()

  const commitDay = (value) => {
    setDayDraft(value)
    const trimmed = value.trim()
    if (!trimmed) {
      onDayChange(null)
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > daysInMonth) return
    onDayChange(parsed)
  }

  const step = (delta) => {
    onMonthChange(shiftMonthKey(monthKey, delta))
    onDayChange(null)
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {/* Compact month pill: arrows and the month label share the same optical
          row so "September 2026" sits centred with equal padding all round. */}
      <div
        className="flex items-center"
        style={{
          padding: 4,
          borderRadius: 999,
          border: '1px solid var(--surface-border)',
          background: 'var(--surface-strong)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous month"
          onClick={() => step(-1)}
          style={{ width: 34, height: 34, borderRadius: '50%' }}
        >
          <ChevronLeft size={16} />
        </button>
        <div
          aria-live="polite"
          style={{
            minWidth: 150,
            height: 34,
            padding: '0 8px',
            margin: '0 2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          {getMonthLabel(monthKey)}
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Next month"
          onClick={() => step(1)}
          style={{ width: 34, height: 34, borderRadius: '50%' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <label
        className="field-group"
        style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span className="muted" style={{ fontSize: 12.5, fontWeight: 700, flex: 'none' }}>Date</span>
        <input
          className="text-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={daysInMonth}
          step={1}
          value={dayDraft}
          onChange={(event) => commitDay(event.target.value)}
          placeholder="All"
          aria-label={`Day of ${getMonthLabel(monthKey)}`}
          style={{ width: 104, height: 44, minHeight: 44, padding: '0 12px', textAlign: 'center' }}
        />
      </label>
    </div>
  )
}

// "View Details" opens this overlay on the SAME History page. Nothing is
// navigated and the URL/route is left untouched, so the list, its filters and
// the month/date selection all stay exactly as the user left them behind it.
// It reuses the same record fields the previous detail page showed.
function HistoryDetailModal({ question, onClose }) {
  const status = getHistoryStatus(question)
  const dispute = question.dispute || null
  const attachments = Array.isArray(question.answerAttachments) ? question.answerAttachments : []
  const links = Array.isArray(question.referenceLinks) ? question.referenceLinks : []
  const userId = question.userId || question.submittedByUserId || ''
  const completedOn = completedOnLabel(question)
  const paymentStatus = getPaymentStatus(question)
  const paidAmount = getQuestionPaidAmount(question)
  const refundAmount = getQuestionRefundAmount(question)
  const refundState = String(question.refundStatus || '').toLowerCase()
  const refunded = refundAmount > 0 || refundState === 'refunded' || refundState === 'completed'
  const answered = Boolean(String(question.answer || '').trim())

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 70 }} onClick={onClose}>
      <div
        className="modal-card modal-card--scroll"
        style={{ width: 'min(720px, calc(100vw - 32px))', maxHeight: 'min(86vh, 900px)' }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Question Details"
      >
        <div className="modal-card__header flex items-center justify-between gap-4">
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div className="astrologer-modal-title">Question Details</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {question.campaignName || getHistorySource(question)} · {question.id}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
            <StatusBadge label={status} />
            <button type="button" className="icon-btn" aria-label="Close question details" onClick={onClose} style={{ width: 32, height: 32, minWidth: 32 }}><X size={16} /></button>
          </div>
        </div>

        <div className="modal-card__content astrologer-modal-content" style={{ display: 'grid', gap: 18 }}>
          <div className="astrologer-modal-section">
            <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Question Summary</div>
            <div className="astrologer-modal-highlight astrologer-modal-details-grid">
              <div><strong>User Name</strong><div className="muted">{question.user || question.userName || '—'}</div></div>
              <div><strong>User ID</strong><div className="muted">{userId || '—'}</div></div>
              <div><strong>Source</strong><div className="muted">{getHistorySourceText(question).replace(/^Source: /, '')}</div></div>
              <div><strong>Campaign</strong><div className="muted">{question.campaignName || '—'}</div></div>
              <div><strong>Question Type</strong><div className="muted">{getQuestionTypeLabel(question)}</div></div>
              <div><strong>Status</strong><div className="muted">{status}</div></div>
              <div><strong>Asked On</strong><div className="muted">{askedOnLabel(question)}</div></div>
              {completedOn ? <div><strong>Completed On</strong><div className="muted">{completedOn}</div></div> : null}
            </div>
          </div>

          <div className="astrologer-modal-section">
            <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Question</div>
            <div className="astrologer-modal-highlight" style={{ whiteSpace: 'pre-wrap', fontSize: 14.5, lineHeight: 1.6 }}>
              {question.question || '—'}
            </div>
          </div>

          <div className="astrologer-modal-section">
            <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Answer</div>
            <div className="astrologer-modal-highlight" style={{ whiteSpace: 'pre-wrap', fontSize: 14.5, lineHeight: 1.6 }}>
              {answered ? question.answer : 'No answer was provided.'}
            </div>
            {attachments.length || links.length ? (
              <div style={{ marginTop: 12 }}>
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>Attachments &amp; References</div>
                <AnswerAttachmentPanel attachments={attachments} links={links} readOnly />
              </div>
            ) : null}
          </div>

          <div className="astrologer-modal-section">
            <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Payment</div>
            <div className="astrologer-modal-highlight astrologer-modal-details-grid">
              <div><strong>Paid Amount</strong><div className="muted">{`₹${inr(paidAmount)}`}</div></div>
              <div><strong>Payment Status</strong><div className="muted">{paymentStatus}</div></div>
              {refunded ? (
                <>
                  <div><strong>Refund Amount</strong><div className="muted">{`₹${inr(refundAmount)}`}</div></div>
                  <div><strong>Refund Status</strong><div className="muted">{question.refundStatus || 'Refunded'}</div></div>
                </>
              ) : null}
            </div>
          </div>

          {status === 'Cancelled' ? (
            <div className="astrologer-modal-section">
              <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Cancellation</div>
              <div className="astrologer-modal-highlight astrologer-modal-details-grid">
                <div><strong>Reason</strong><div className="muted">{question.cancellationReason || 'Answer deadline exceeded'}</div></div>
                <div><strong>Deadline</strong><div className="muted">{deadlineLabel(question)}</div></div>
              </div>
            </div>
          ) : null}

          {dispute ? (
            <div className="astrologer-modal-section">
              <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Dispute</div>
              <div className="astrologer-modal-highlight astrologer-modal-details-grid">
                <div><strong>Status</strong><div className="muted">{dispute.status || '—'}</div></div>
                <div><strong>Raised On</strong><div className="muted">{dispute.raisedAt ? formatAnswerDate(dispute.raisedAt) : '—'}</div></div>
                <div><strong>Resolved On</strong><div className="muted">{dispute.resolvedAt ? formatAnswerDate(dispute.resolvedAt) : '—'}</div></div>
                <div><strong>Target</strong><div className="muted">{dispute.target || '—'}</div></div>
                {dispute.reason ? <div><strong>Reason</strong><div className="muted">{dispute.reason}</div></div> : null}
                {dispute.response ? <div><strong>Astrologer Response</strong><div className="muted">{dispute.response}</div></div> : null}
                {dispute.resolution ? <div><strong>Resolution</strong><div className="muted">{dispute.resolution}</div></div> : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-card__footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function TextBasedQuestionHistory() {
  const { questions } = useAppData()
  const { isDark } = useTheme()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [searchParams] = useSearchParams()

  const astrologerId = currentUser?.id || 'astrologer-demo'

  const myQuestions = useMemo(
    () => questions.filter((question) => (question.astrologerId || 'astrologer-demo') === astrologerId),
    [questions, astrologerId],
  )

  // History only holds settled questions: answered, disputed/resolved or
  // auto-cancelled once the shared 30-day deadline passed unanswered.
  const historyRecords = useMemo(() => myQuestions.filter((question) => !isQuestionNeedingAnswer(question)), [myQuestions])

  const focusId = searchParams.get('questionId') || null
  const [detailsId, setDetailsId] = useState(focusId)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  // Month is primary; the day is an optional secondary narrowing (null = whole month).
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => getMonthKeyFromDate(new Date()))
  const [selectedDay, setSelectedDay] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!focusId) return
    const focused = historyRecords.find((question) => question.id === focusId)
    if (!focused) return
    const received = getQuestionReceivedAt(focused)
    if (received) setSelectedMonthKey(getMonthKeyFromDate(received))
    setDetailsId(focusId)
  }, [focusId, historyRecords])

  const monthRecords = useMemo(() => {
    const base = historyRecords.filter((question) => {
      const received = getQuestionReceivedAt(question)
      if (!received) return false
      if (getMonthKeyFromDate(received) !== selectedMonthKey) return false
      if (selectedDay != null && received.getDate() !== selectedDay) return false
      return true
    })
    const term = String(search).trim().toLowerCase()
    return base.filter((question) => {
      if (statusFilter !== 'All' && getHistoryStatus(question) !== statusFilter) return false
      if (!term) return true
      const searchable = [
        question.id,
        question.user,
        question.userName,
        question.userId,
        question.submittedByUserId,
        question.category,
        getQuestionTypeLabel(question),
        getQuestionSourceLabel(question),
        question.question,
      ]
        .join(' ')
        .toLowerCase()
      return searchable.includes(term)
    })
  }, [historyRecords, selectedMonthKey, selectedDay, statusFilter, search])

  // Pagination is applied last, after month / day / status / search filtering.
  const totalPages = Math.max(1, Math.ceil(monthRecords.length / HISTORY_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRecords = monthRecords.slice(
    (currentPage - 1) * HISTORY_PAGE_SIZE,
    currentPage * HISTORY_PAGE_SIZE,
  )

  useEffect(() => {
    setPage(1)
  }, [selectedMonthKey, selectedDay, statusFilter, search])

  const summary = useMemo(() => {
    const counts = { Completed: 0, Cancelled: 0, Resolved: 0 }
    const monthAll = historyRecords.filter((question) => {
      const received = getQuestionReceivedAt(question)
      return received ? getMonthKeyFromDate(received) === selectedMonthKey : false
    })
    for (const question of monthAll) {
      const label = getHistoryStatus(question)
      if (counts[label] != null) counts[label] += 1
    }
    return { total: monthAll.length, ...counts }
  }, [historyRecords, selectedMonthKey])

  const selectedRecord = detailsId
    ? historyRecords.find((question) => question.id === detailsId) || null
    : null

  // "View Details" now opens an overlay on this same page. It deliberately does
  // NOT write to the query string or navigate, so the route, the list state and
  // every filter stay exactly as they were.
  const openDetails = (id) => {
    setDetailsId(id)
  }

  const closeDetails = () => {
    setDetailsId(null)
  }

  // Escape closes the overlay and the page behind it stops scrolling, matching
  // the other modals in the app.
  useEffect(() => {
    if (!selectedRecord) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setDetailsId(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [selectedRecord])

  const monthName = getMonthLabel(selectedMonthKey)

  // The month / date controls now sit on the same row as the "History" heading
  // (see PageHeader.actions below), so no separate control section is needed.
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined

  return (
    <div className="tbh-history-page">
      <PageHeader
        eyebrow="Astrologer workspace"
        title="History"
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-3">
            <BackButton to={routes.textBasedQuestions} label="Back" icon={backIcon} />
            <HistoryPeriodControls
              monthKey={selectedMonthKey}
              day={selectedDay}
              onMonthChange={setSelectedMonthKey}
              onDayChange={setSelectedDay}
            />
          </div>
        )}
      />

      <Section className="!mt-4">
        <div className="grid grid-cols-2 items-stretch gap-4 lg:grid-cols-4" style={{ gridAutoRows: 'minmax(132px, 1fr)' }}>
          {STATUS_FILTERS.map((label) => {
            const meta = STATUS_CARD_META[label]
            return (
              <div key={label} className="h-full" style={{ minHeight: 132 }}>
                <SummaryCard
                  label={label}
                  value={label === 'All' ? summary.total : summary[label]}
                  hint={meta.hint}
                  background={meta.background}
                  color={meta.color}
                  border={meta.border}
                  onClick={() => setStatusFilter(statusFilter === label && label !== 'All' ? 'All' : label)}
                  active={statusFilter === label}
                />
              </div>
            )
          })}
        </div>
      </Section>

      <Card className="section !mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 14 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Records in {monthName}</div>
          <label className="field-group" style={{ marginBottom: 0, position: 'relative', flex: '0 1 220px', maxWidth: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input className="text-input" style={{ paddingLeft: 34 }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" aria-label="Search records" />
          </label>
        </div>

        {pagedRecords.length === 0 ? (
          <div className="muted" style={{ padding: '16px 0' }}>No question records found{selectedDay != null ? ` for ${monthName} ${selectedDay}` : ` for ${monthName}`}.</div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {pagedRecords.map((question, index) => (
              <HistoryRecordCard key={question.id} question={question} onOpenDetails={openDetails} index={index} isDark={isDark} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div
            className="flex flex-wrap items-center justify-center gap-2"
            style={{ marginTop: 20 }}
            role="navigation"
            aria-label="History pagination"
          >
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            {buildPageTokens(currentPage, totalPages).map((token) => {
              if (typeof token === 'string') {
                return <span key={token} className="muted" style={{ padding: '0 4px', fontSize: 13 }}>&hellip;</span>
              }
              const isCurrent = token === currentPage
              return (
                <button
                  key={token}
                  type="button"
                  className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-outline'}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  style={{ minWidth: 34, justifyContent: 'center' }}
                  onClick={() => setPage(token)}
                >
                  {token}
                </button>
              )
            })}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div className="muted" style={{ marginTop: 10, textAlign: 'center', fontSize: 12.5 }}>
          Showing {pagedRecords.length} of {monthRecords.length} questions
          {' · '}
          Page {currentPage} of {totalPages}
        </div>
      </Card>

      {selectedRecord ? <HistoryDetailModal question={selectedRecord} onClose={closeDetails} /> : null}
    </div>
  )
}
