import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, Hourglass, MessageCircle, Search, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import { parseDisplayDate } from '../../utils/date.js'
import {
  filterAdminQuestions,
  getQuestionAskedAt,
  getQuestionAstrologerName,
  getQuestionUserName,
  selectQuestionStatusFilters,
} from '../../utils/adminQuestions.js'
import {
  ANSWER_WINDOW_DAYS,
  DEADLINE_WARNING_DAYS,
  PAYMENT_STATE_DISPUTED,
  PAYMENT_STATE_HELD,
  PAYMENT_STATE_REFUND_PENDING,
  PAYMENT_STATE_REFUNDED,
  PAYMENT_STATE_RELEASE_ELIGIBLE,
  PAYMENT_STATE_RELEASED,
  getMsUntilAnswerDeadline,
  getQuestionPaidAmount,
  getQuestionPaymentState,
  isQuestionAwaitingAnswer,
} from '../../utils/paymentRules.js'
import {
  selectActiveQuestions,
  selectExpiredQuestions,
  selectHistoricalQuestions,
  selectPendingRefunds,
  selectQuestionsDueSoon,
  selectQuestionsInRecentMonths,
  selectQuestionsOverdue,
  selectUnresolvedDisputes,
} from '../../utils/adminCompliance.js'

// Admin -> Text-Based Questions list.
//
// Reads the existing questions store from AppDataContext. Still read-only: there is
// no answer, refund, resolve or cancel action here.
//
// What this page adds is visibility, not new rules. Every figure below comes from a
// selector that already exists and is already covered by utils/paymentRules.test.js:
//
//   * the 30-day answer window comes from getMsUntilAnswerDeadline() /
//     isQuestionAwaitingAnswer(), the same rule the compliance sweep in AppDataContext
//     enforces with. No second deadline or timer is introduced here.
//   * the queue buckets (overdue, due soon, expired, refund pending, unresolved
//     dispute) are the selectors from utils/adminCompliance.js, reused as-is.
//   * payment state comes from getQuestionPaymentState().
//
// Payment state is DERIVED, not persisted. getQuestionPaymentState() computes the
// state from the question's own refund fields, its dispute and its status, because no
// `paymentState` field is written for a normal answered question. The column is
// therefore labelled and footnoted as derived so it is never read as a ledger
// transaction state.
const DAY_MS = 24 * 60 * 60 * 1000

// Small pill for labels that StatusBadge does not know, built from the same tones and
// the same token pairs StatusBadge uses, so it is visually identical to a status badge.
const PILL_TONES = {
  amber: 'bg-[color:var(--warning-bg)] text-[color:var(--amber-600)]',
  blue: 'bg-[color:var(--sky-bg)] text-[color:var(--sky-600)]',
  green: 'bg-[color:var(--success-bg)] text-[color:var(--green-600)]',
  red: 'bg-[color:var(--danger-bg)] text-[color:var(--red-600)]',
  gray: 'bg-[color:var(--neutral-bg)] text-[color:var(--muted)]',
  violet: 'bg-[color:var(--primary-bg)] text-[color:var(--primary)]',
}

// `compact` tightens only the pill's own chrome — the horizontal padding and the
// vertical inset. The label, the dot and the text size are untouched, so a compact
// pill still reads at the same 12px as a normal one and no state text is abbreviated.
export function Pill({ tone = 'gray', compact = false, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full text-xs font-bold whitespace-nowrap ${compact ? 'px-2 py-0.5' : 'px-3 py-1'} ${PILL_TONES[tone] || PILL_TONES.gray}`}
    >
      <span className="h-[7px] w-[7px] rounded-full bg-current" />
      {children}
    </span>
  )
}

// Deadline indicator. Uses only the existing 30-day rule:
//   getMsUntilAnswerDeadline() for the countdown, isQuestionAwaitingAnswer() to decide
//   whether a deadline still applies, and the sweep's own expiredAt marker for the
//   Expired case. A record with no parseable ask time reports "Not available" rather
//   than inventing a date.
export function DeadlineCell({ question, isExpired, isOverdue, now }) {
  if (isExpired) return <Pill tone="violet">Expired</Pill>

  // Answered, closed and disputed questions are past the deadline question, so they
  // show a dash rather than a countdown that no longer means anything.
  if (!isQuestionAwaitingAnswer(question)) return <span className="muted">—</span>

  if (isOverdue) return <Pill tone="red">Overdue</Pill>

  const remaining = getMsUntilAnswerDeadline(question, now)
  if (remaining === null) return <span className="muted">Not available</span>

  // Bucketed by real elapsed time rather than by a rounded day count, so anything
  // inside the next 24 hours reads "Due today" and the following 24 read "Due
  // tomorrow". Rounding first would report 26 hours as "in 2 days".
  if (remaining < DAY_MS) return <Pill tone="amber" compact>Due today</Pill>
  if (remaining < 2 * DAY_MS) return <Pill tone="amber" compact>Due tomorrow</Pill>

  const days = Math.ceil(remaining / DAY_MS)
  if (days <= DEADLINE_WARNING_DAYS) return <Pill tone="amber" compact>Due in {days} days</Pill>
  return <span className="muted" style={{ whiteSpace: 'nowrap' }}>Due in {days} days</span>
}

// Payment cell. The amount is the question's own purchaseAmount; the state is the
// derived payment state. A free question, or one with no amount recorded, shows a dash
// for both rather than a fabricated zero.
export function PaymentCell({ question }) {
  const amount = getQuestionPaidAmount(question)
  const state = getQuestionPaymentState(question)

  if (amount === null && !state) {
    return <span className="muted" style={{ fontSize: 12.5 }}>—</span>
  }

  const tones = {
    [PAYMENT_STATE_HELD]: 'amber',
    [PAYMENT_STATE_RELEASE_ELIGIBLE]: 'blue',
    [PAYMENT_STATE_RELEASED]: 'green',
    [PAYMENT_STATE_REFUND_PENDING]: 'violet',
    [PAYMENT_STATE_REFUNDED]: 'green',
    [PAYMENT_STATE_DISPUTED]: 'red',
  }

  return (
    <span className="flex flex-col" style={{ gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
        {amount === null ? '—' : `₹${amount.toLocaleString('en-IN')}`}
      </span>
      {state
        ? <Pill tone={tones[state] || 'gray'} compact>{state}</Pill>
        : <span className="muted" style={{ fontSize: 11.5 }}>No state recorded</span>}
    </span>
  )
}

// Dispute cell. Reports the dispute's own status verbatim. A dispute with no
// raisedAt simply has no 7-day window to show, and none is invented here — the
// deadline is not displayed on this row at all.
export function DisputeCell({ question }) {
  const dispute = question?.dispute
  if (!dispute) return <span className="muted" style={{ fontSize: 12.5 }}>None</span>

  const status = String(dispute.status || '').trim()
  return (
    <span className="flex flex-col" style={{ gap: 3 }}>
      {status ? <StatusBadge label={status} /> : <span className="muted" style={{ fontSize: 12.5 }}>—</span>}
      {dispute.raisedAt ? null : (
        <span className="muted" style={{ fontSize: 11 }}>No raised date</span>
      )}
    </span>
  )
}

// One queue figure, doubling as a shortcut into the same filter the Status Queue uses.
// It sets local filter state rather than navigating, so the URL is untouched and no new
// route is introduced. Clicking a metric also clears the separate question-status
// refinement, because a shortcut has to show exactly the set it advertises.
function QueueTile({ icon: Icon, tone, label, count, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="flex w-full flex-col text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--primary)]"
      style={{
        padding: '13px 16px',
        border: 0,
        font: 'inherit',
        cursor: 'pointer',
        background: active ? 'var(--primary-bg)' : 'var(--surface)',
        // Active state is carried by the ring plus the tint above, both from tokens
        // already in use elsewhere in the admin workspace.
        boxShadow: active ? 'inset 0 0 0 1px var(--primary)' : 'none',
      }}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`stat-icon tone-${tone}`}
          style={{
            width: 26,
            height: 26,
            borderRadius: 'var(--radius-xs)',
            flex: 'none',
            boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 16%, transparent)',
          }}
        >
          <Icon size={13} />
        </span>
        <span className="muted" style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em' }}>
          {label}
        </span>
      </span>
      <span
        style={{
          marginTop: 8,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-primary)',
        }}
      >
        {count}
      </span>
    </button>
  )
}

// A Status Queue option. Shows the live size of its bucket so the queue is readable
// before anything is clicked, and every figure comes from the same selector-backed
// buckets the summary tiles use.
function QueuePill({ active, count, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex items-center gap-2 rounded-full text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]"
      style={{
        padding: '7px 13px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--surface-border)'}`,
        background: active ? 'var(--primary-bg)' : 'var(--surface)',
        color: active ? 'var(--primary)' : 'var(--body)',
      }}
    >
      {children}
      {count != null && (
        <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>{count}</span>
      )}
    </button>
  )
}

// The queue buckets offered by the second filter. Every entry is backed by an existing
// selector or rule, so no filter state here can match nothing by construction.
// "All" is always present; the rest are fixed rather than derived so the dropdown does
// not change shape as data changes.
const QUEUE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'awaiting', label: 'Awaiting Answer' },
  { key: 'dueSoon', label: 'Due Soon' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'expired', label: 'Expired' },
  { key: 'refundPending', label: 'Refund Pending' },
  { key: 'disputed', label: 'Disputed' },
]

// Cell padding for this table only.
//
// The global sheet sets `th, td { padding: 16px 18px }`, so every column was paying
// 36px of horizontal padding before a single character was drawn. Across nine columns
// that is ~324px of the row width, which is what pushed Actions off the right edge.
// These two objects narrow the inline gutters and trim the vertical rhythm for this
// table only. Nothing global changes, and no value is hidden to achieve it.
//
// Declared above both style objects below, because ROW appears earlier in the file
// than TH and a `const` is in its temporal dead zone until its own line runs.
const CELL_PADDING_X = 10

const ROW = {
  paddingTop: 12,
  paddingBottom: 12,
  paddingLeft: CELL_PADDING_X,
  paddingRight: CELL_PADDING_X,
}

// Width budget for the table. `table` is width:100% with no min-width of its own, so
// the columns simply share whatever the container gives them. This floor only stops
// the table being crushed into unreadable slivers on a narrow viewport, where
// `.table-wrap` is expected to scroll rather than to squeeze the text.
const TABLE_MIN_WIDTH = 680

// Records shown per page. Pagination slices the already-filtered list; it never
// removes anything from the data.
const PAGE_SIZE = 10

// A month is held as a 'YYYY-MM' key rather than a Date so it is a stable, comparable
// value for state and memo dependencies.
function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthDateFromKey(key) {
  const [year, month] = String(key).split('-').map(Number)
  return new Date(year, (month || 1) - 1, 1)
}

// Steps a month key forwards or backwards. Built from the 1st of the month so a
// 31st can never skip a month when JavaScript rolls the date over.
function shiftMonthKey(key, delta) {
  const base = monthDateFromKey(key)
  base.setMonth(base.getMonth() + delta)
  return monthKeyOf(base)
}

function monthLabel(key) {
  return monthDateFromKey(key).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

// Rolling windows the History view can offer. Module scope because the values never
// change: keeping them here means the option list is a stable identity, so the memo
// that reasons over them is not invalidated by every render.
const HISTORY_RANGE_OPTIONS = [3, 6, 12, 24]

// Day count for the selected month, honouring leap years. The day filter lists
// exactly these, so a day outside the month cannot be selected.
function daysInMonth(key) {
  const base = monthDateFromKey(key)
  return new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
}

// Page numbers to show around the current page, with ellipses standing in for gaps.
// Keeps the control compact when a period holds a lot of records.
function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const wanted = new Set([1, total, current - 1, current, current + 1])
  const pages = []
  for (let page = 1; page <= total; page += 1) {
    if (wanted.has(page)) pages.push(page)
    else if (pages[pages.length - 1] !== '…') pages.push('…')
  }
  return pages
}

// Column headings. There is no `.table-wrap th` rule in the stylesheet, so headings
// were inheriting the muted body tone and reading as flat as the data. These use the
// same near-black ink token the rest of the admin workspace uses for emphasis, plus a
// weight bump and a hairline rule. Family and size are unchanged.
const TH = {
  color: 'var(--ink)',
  fontWeight: 700,
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--divider)',
  whiteSpace: 'nowrap',
  paddingLeft: CELL_PADDING_X,
  paddingRight: CELL_PADDING_X,
}

// Row tints: an extremely light violet / blue / green / teal cycle, purely so
// consecutive records separate visually. They never encode status — every status,
// payment and dispute badge keeps its own colour on top of them.
//
// The first three reuse the same theme-aware surface tokens the sibling admin pages
// already tint rows with, so they re-tint correctly in dark mode. There is no
// theme-aware teal surface token — `--teal-100` is a light-mode-only pale green and
// would read as a pale band in dark mode — so the teal step is derived from
// `--teal-500` at a much lower alpha, which composites as a subtle tint over both
// light and dark surfaces. No gradients, no new tokens, no global CSS.
const ROW_TINTS = [
  'color-mix(in srgb, var(--primary-bg) 70%, transparent)',
  'color-mix(in srgb, var(--sky-bg) 70%, transparent)',
  'color-mix(in srgb, var(--success-bg) 70%, transparent)',
  'color-mix(in srgb, var(--teal-500) 8%, transparent)',
]

export default function AdminQuestions() {
  const { questions } = useAppData()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [queue, setQueue] = useState('all')

  // Period. The month is the primary control; the day is an optional refinement
  // inside it and is reset whenever the month moves. Defaults to the current month.
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(new Date()))
  const [selectedDay, setSelectedDay] = useState('all')
  const [page, setPage] = useState(1)

  // Active Questions is the default view. Questions History is the same list narrowed
  // to questions whose flow already reached a final outcome — a presentation layer
  // over the same records, not a second store and not an archive.
  const [view, setView] = useState('active')
  // History defaults to a six-month window purely to keep that view manageable. It is
  // a display filter: nothing is deleted, and a wider window restores older records.
  const [historyMonths, setHistoryMonths] = useState(6)

  const isHistory = view === 'history'

  // Any change to the view, period, search, status or queue returns to page 1.
  // Adjusted during render rather than in an effect so the list is never briefly
  // painted with a stale page index.
  const filterSignature = [view, historyMonths, monthKey, selectedDay, query, status, queue].join('|')
  const [lastSignature, setLastSignature] = useState(filterSignature)
  if (lastSignature !== filterSignature) {
    setLastSignature(filterSignature)
    setPage(1)
  }

  // Deadlines are relative to when this page was opened. Held in state rather than read
  // from Date.now() during render so the countdown does not change on every keystroke
  // and the memos below stay stable.
  const [now] = useState(() => Date.now())

  const statusFilters = useMemo(() => selectQuestionStatusFilters(questions), [questions])

  // Active vs historical is derived, never moved. Both lists are filters over the
  // same records in the same store, so switching tabs cannot lose or duplicate a
  // question and every field below stays exactly as it was.
  const scopedQuestions = useMemo(
    () => (isHistory ? selectHistoricalQuestions(questions) : selectActiveQuestions(questions)),
    [questions, isHistory],
  )

  // ---------------------------------------------------------------------------
  // Period filter.
  //
  // Active Questions browses one month at a time. History browses a rolling window,
  // because its default is "Last 6 Months" rather than a single named month.
  //
  // Both read the same field the table already displays, getQuestionAskedAt(),
  // which resolves to the question's ISO `raisedAt`. No second date field and no new
  // date helper is introduced.
  //
  // parseDisplayDate returns the epoch for a value it cannot read, so a non-positive
  // time is treated as "no usable date" and the record is left out rather than being
  // guessed into a month.
  // ---------------------------------------------------------------------------
  const periodQuestions = useMemo(() => {
    if (isHistory) return selectQuestionsInRecentMonths(scopedQuestions, historyMonths, now)

    const month = monthDateFromKey(monthKey)
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const day = selectedDay === 'all' ? null : Number(selectedDay)

    return scopedQuestions.filter((question) => {
      const asked = parseDisplayDate(getQuestionAskedAt(question)).getTime()
      if (!Number.isFinite(asked) || asked <= 0) return false
      const date = new Date(asked)
      if (date.getFullYear() !== year || date.getMonth() !== monthIndex) return false
      if (day !== null && date.getDate() !== day) return false
      return true
    })
  }, [scopedQuestions, isHistory, historyMonths, now, monthKey, selectedDay])

  // An empty period is ambiguous on its own: it can mean "nothing in this range" or
  // "you are looking in the wrong range". Only the second is worth offering a way out
  // of, so a suggestion is only produced when this scope genuinely holds records and
  // the current period is simply not covering them.
  //
  // Both branches only ever propose a value the visible control already offers, so
  // the change stays inspectable and reversible: for Active, the nearest month that
  // actually holds questions; for History, the narrowest window that reaches at least
  // one. Neither guesses where records live beyond "there is at least one".
  const suggestedPeriod = useMemo(() => {
    if (periodQuestions.length > 0) return null

    if (isHistory) {
      const wider = HISTORY_RANGE_OPTIONS.find((option) =>
        option !== historyMonths && selectQuestionsInRecentMonths(scopedQuestions, option, now).length > 0)
      return wider ? { kind: 'range', value: wider, label: `Last ${wider} Months` } : null
    }

    const months = new Set()
    scopedQuestions.forEach((question) => {
      const asked = parseDisplayDate(getQuestionAskedAt(question)).getTime()
      if (!Number.isFinite(asked) || asked <= 0) return
      months.add(monthKeyOf(new Date(asked)))
    })
    const nearest = [...months].sort().reverse().find((key) => key !== monthKey)
    return nearest ? { kind: 'month', value: nearest, label: monthLabel(nearest) } : null
  }, [periodQuestions.length, isHistory, historyMonths, scopedQuestions, monthKey, now])

  // Every bucket is precomputed once as a Set of question ids, straight from the
  // existing selectors. Filtering is then a membership test rather than a second
  // implementation of the same rule. Scoped to the selected period so the summary
  // metrics describe the period actually on screen.
  const buckets = useMemo(() => {
    const ids = (rows) => new Set(rows.map((question) => question.id))
    return {
      awaiting: new Set(periodQuestions.filter(isQuestionAwaitingAnswer).map((question) => question.id)),
      dueSoon: ids(selectQuestionsDueSoon(periodQuestions, now)),
      overdue: ids(selectQuestionsOverdue(periodQuestions, now)),
      expired: ids(selectExpiredQuestions(periodQuestions)),
      refundPending: ids(selectPendingRefunds(periodQuestions)),
      disputed: ids(selectUnresolvedDisputes(periodQuestions)),
    }
  }, [periodQuestions, now])

  // The existing search + status filter is untouched, and now runs over the selected
  // period; the queue filter is layered on top of that.
  const searchedQuestions = useMemo(
    () => filterAdminQuestions(periodQuestions, { query, status }),
    [periodQuestions, query, status],
  )

  const filteredQuestions = useMemo(() => {
    if (queue === 'all') return searchedQuestions
    const bucket = buckets[queue]
    return bucket ? searchedQuestions.filter((question) => bucket.has(question.id)) : searchedQuestions
  }, [searchedQuestions, queue, buckets])

  // Pagination slices the filtered list only.
  const pageCount = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, page), pageCount)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageRows = filteredQuestions.slice(startIndex, startIndex + PAGE_SIZE)
  const visibleQuestions = pageRows

  const rangeLabel = filteredQuestions.length === 0
    ? 'No matching questions'
    : `Showing ${startIndex + 1}–${startIndex + pageRows.length} of ${filteredQuestions.length} question${filteredQuestions.length === 1 ? '' : 's'}`

  const openQuestion = (questionId) => navigate(`${routes.base}/text-based-questions/${questionId}`)

  // Summary metrics and the Status Queue pills are two controls over one piece of
  // state. A metric is a shortcut, so it also clears the question-status refinement to
  // guarantee it shows the set it advertises; a pill is a plain bucket choice and leaves
  // that refinement alone so the two can still be combined deliberately.
  const selectQueueFromSummary = (queueKey) => {
    setQueue(queueKey)
    setStatus('All')
  }

  // Moving the month always clears the day, because the two are only meaningful
  // together: a day from the previous month cannot be kept.
  const changeMonth = (delta) => {
    setMonthKey((current) => shiftMonthKey(current, delta))
    setSelectedDay('all')
  }

  // Applies the suggested period. The day is cleared for a month jump for the same
  // reason changeMonth clears it: a day from another month cannot be kept. Page
  // resets on its own because the filter signature already tracks the period.
  const jumpToSuggestedPeriod = () => {
    if (!suggestedPeriod) return
    if (suggestedPeriod.kind === 'range') setHistoryMonths(suggestedPeriod.value)
    else {
      setMonthKey(suggestedPeriod.value)
      setSelectedDay('all')
    }
  }

const isFiltered = query.trim().length > 0 || status !== 'All' || queue !== 'all'
  const periodLabel = isHistory
    ? `Last ${historyMonths} Months`
    : selectedDay === 'all'
      ? monthLabel(monthKey)
      : `${Number(selectedDay)} ${monthLabel(monthKey)}`

  const scopeCounts = useMemo(() => ({
    active: selectActiveQuestions(questions).length,
    history: selectHistoricalQuestions(questions).length,
  }), [questions])

  // Live size for each Status Queue option, scoped to the selected period. 'all' is
  // the period's unfiltered list; every other figure is a bucket size from the
  // selectors above.
  const queueCounts = {
    all: periodQuestions.length,
    awaiting: buckets.awaiting.size,
    dueSoon: buckets.dueSoon.size,
    overdue: buckets.overdue.size,
    expired: buckets.expired.size,
    refundPending: buckets.refundPending.size,
    disputed: buckets.disputed.size,
  }

  const summaryTiles = [
    {
      icon: MessageCircle,
      tone: 'violet',
      label: 'Total Questions',
      count: periodQuestions.length,
      queueKey: 'all',
    },
    {
      icon: Hourglass,
      tone: 'amber',
      label: 'Awaiting Answer',
      count: buckets.awaiting.size,
      queueKey: 'awaiting',
    },
    {
      icon: AlertTriangle,
      tone: 'red',
      label: 'Overdue',
      count: buckets.overdue.size,
      queueKey: 'overdue',
    },
    {
      icon: Wallet,
      tone: 'violet',
      label: 'Refund Pending',
      count: buckets.refundPending.size,
      queueKey: 'refundPending',
    },
    {
      icon: AlertTriangle,
      tone: 'rose',
      label: 'Disputed',
      count: buckets.disputed.size,
      queueKey: 'disputed',
    },
  ]

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Text-Based Questions"
        subtitle="Every question raised through the text question flow. Open a question to review its details."
      />

      {/* Active Questions / Questions History.
          A presentation split over the one existing questions store — no record is
          moved, copied or deleted, and both tabs read the same records through the
          same selectors. */}
      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 16 }} role="tablist" aria-label="Question views">
        {[
          { key: 'active', label: 'Active Questions', count: scopeCounts.active },
          { key: 'history', label: 'History', count: scopeCounts.history },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={view === tab.key}
            onClick={() => setView(tab.key)}
            className="inline-flex items-center gap-2 rounded-full text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]"
            style={{
              padding: '8px 15px',
              cursor: 'pointer',
              border: `1px solid ${view === tab.key ? 'var(--primary)' : 'var(--surface-border)'}`,
              background: view === tab.key ? 'var(--primary-bg)' : 'var(--surface)',
              color: view === tab.key ? 'var(--primary)' : 'var(--body)',
            }}
          >
            {tab.label}
            <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Queue summary. Doubles as the primary navigation for this page: each metric selects
          the matching Status Queue bucket. Figures come from the same selectors that drive
          the Deadline, Payment and Dispute columns, so tiles and rows cannot disagree. */}
      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 1,
            background: 'var(--divider)',
          }}
        >
          {summaryTiles.map((tile) => (
            <QueueTile
              key={tile.label}
              icon={tile.icon}
              tone={tile.tone}
              label={tile.label}
              count={tile.count}
              active={queue === tile.queueKey}
              onSelect={() => selectQueueFromSummary(tile.queueKey)}
            />
          ))}
        </div>
      </Card>

      {/* Controls, stacked as two clearly separate labelled blocks: Search on its own
          row, then Status Queue beneath it. Nothing in the Status Queue block sits
          beside the Search label, so the two can no longer be read as one row. */}
      <Section className="!mt-4">
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* Period. Active browses one month with two arrows and a "Month Year" label.
              History browses a rolling window instead, because its default period is
              "Last 6 Months" rather than one named month. Neither branch uses a
              dropdown for the month, a popup, or a calendar grid. */}
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-3"
            style={{ padding: '14px 18px' }}
          >
            <span
              className="muted"
              style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Period
            </span>

            {isHistory ? (
              <div className="flex items-center gap-2">
                <span
                  aria-live="polite"
                  style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}
                >
                  Last {historyMonths} Months
                </span>
                <label className="muted" htmlFor="admin-history-range" style={{ fontSize: 12, fontWeight: 600 }}>
                  Show
                </label>
                <select
                  id="admin-history-range"
                  className="select-input"
                  value={String(historyMonths)}
                  onChange={(event) => setHistoryMonths(Number(event.target.value))}
                  style={{ width: 'auto', minWidth: 132 }}
                >
                  {HISTORY_RANGE_OPTIONS.map((option) => (
                    <option key={option} value={String(option)}>Last {option} Months</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center" style={{ gap: 4 }}>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous month"
                  style={{ width: 34, height: 34, borderRadius: 'var(--radius-s)' }}
                >
                  <ChevronLeft size={17} />
                </button>
                <span
                  aria-live="polite"
                  style={{
                    minWidth: 148,
                    textAlign: 'center',
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {monthLabel(monthKey)}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => changeMonth(1)}
                  aria-label="Next month"
                  style={{ width: 34, height: 34, borderRadius: 'var(--radius-s)' }}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            )}

            {/* Day refinement, Active only: inside a rolling window a single day would be
                ambiguous, so the control is not offered there. Options are exactly the days
                of the selected month, so a day from another month cannot be chosen. */}
            {!isHistory && (
              <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
                <label
                  className="muted"
                  htmlFor="admin-question-day"
                  style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}
                >
                  Date
                </label>
                <select
                  id="admin-question-day"
                  className="select-input"
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  style={{ width: 'auto', minWidth: 104 }}
                >
                  <option value="all">All</option>
                  {Array.from({ length: daysInMonth(monthKey) }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={String(day)}>{day}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div aria-hidden="true" style={{ height: 1, background: 'var(--divider)' }} />

          <div style={{ padding: '14px 18px' }}>
            <label
              className="muted block"
              htmlFor="admin-question-search"
              style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Search
            </label>
            <div className="search-bar" style={{ marginTop: 9, width: '100%', maxWidth: 520 }}>
              <input
                id="admin-question-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by user, astrologer, or question ID"
                className="text-input search-bar__input"
                aria-label="Search questions by user, astrologer, or question ID"
              />
              <button type="button" className="icon-btn" aria-label="Search">
                <Search size={18} />
              </button>
            </div>
          </div>

          <div aria-hidden="true" style={{ height: 1, background: 'var(--divider)' }} />

          <div style={{ padding: '14px 18px 16px' }}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="muted"
                style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
              >
                Status Queue
              </span>
              <span className="muted" style={{ fontSize: 11.5 }}>
                Derived from the {ANSWER_WINDOW_DAYS}-day answer window, refunds and open disputes
              </span>
            </div>

            {/* Wraps naturally on narrow screens, so nothing overlaps or overflows. */}
            <div className="flex flex-wrap" style={{ gap: 8, marginTop: 10 }}>
              {QUEUE_FILTERS.map((option) => (
                <QueuePill
                  key={option.key}
                  active={queue === option.key}
                  count={queueCounts[option.key]}
                  onClick={() => setQueue(option.key)}
                >
                  {option.label}
                </QueuePill>
              ))}
            </div>

            {/* The data-derived question.status filter, kept as its own labelled control
                inside this block. It is a different axis from the derived buckets above,
                so it gets its own label rather than being merged into the pill row. */}
            <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 14 }}>
              <label
                className="muted"
                htmlFor="admin-question-status"
                style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}
              >
                Question status
              </label>
              <select
                id="admin-question-status"
                className="select-input"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                style={{ width: 'auto', minWidth: 150 }}
              >
                {statusFilters.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Questions"
        icon={MessageCircle}
        className="!mt-5"
        titleRight={(
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1" style={{ fontSize: 13, fontWeight: 500 }}>
            <span className="muted">{periodLabel}</span>
            {isFiltered && <span className="muted">· filtered</span>}
          </span>
        )}
      >
        <div className="table-wrap">
          {!questions.length ? (
            <p className="muted">No questions found.</p>
          ) : visibleQuestions.length === 0 ? (
            /* Three distinct empty states, because "nothing here" has three very
               different causes and an admin should not have to guess which one they
               are looking at. */
            <div style={{ padding: '28px 4px', maxWidth: 520 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                {isHistory && scopedQuestions.length === 0
                  ? 'No questions have reached a final outcome yet, so there is nothing in History. Questions appear here once their answer, dispute or refund flow has finished.'
                  : periodQuestions.length === 0
                    ? `There are no ${isHistory ? 'completed' : 'active'} questions in ${periodLabel}. Use the Period arrows to move to another ${isHistory ? 'window' : 'month'}.`
                    : 'No questions match the current search and filters.'}
              </p>
              {periodQuestions.length === 0 && scopedQuestions.length > 0 && (
                <>
                  <p className="muted" style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6 }}>
                    {scopedQuestions.length} {isHistory ? 'historical' : 'active'} question
                    {scopedQuestions.length === 1 ? '' : 's'} {scopedQuestions.length === 1 ? 'is' : 'are'} recorded outside this period.
                  </p>
                  {suggestedPeriod && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ marginTop: 12 }}
                      onClick={jumpToSuggestedPeriod}
                    >
                      Jump to {suggestedPeriod.label}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <table style={{ minWidth: TABLE_MIN_WIDTH }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)' }}>
                  <th style={{ ...TH, width: '20%' }}>Question / User</th>
                  <th style={{ ...TH, width: '14%' }}>Astrologer</th>
                  <th style={{ ...TH, width: '10%' }}>Asked</th>
                  <th style={{ ...TH, width: '13%' }}>Deadline</th>
                  <th style={{ ...TH, width: '12%' }}>Status</th>
                  <th style={{ ...TH, width: '14%' }}>Payment</th>
                  <th style={{ ...TH, width: '11%' }}>Dispute</th>
                  <th style={{ ...TH, width: '6%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleQuestions.map((question, index) => (
                  <tr key={question.id} style={{ background: ROW_TINTS[index % ROW_TINTS.length] }}>
                    {/* Question ID and User share one cell: the person is what an admin
                        reads first, the identifier sits under it rather than in a column
                        of its own. Both values are rendered verbatim from the same
                        record — nothing is derived, truncated or looked up elsewhere. */}
                    <td style={ROW}>
                      <span className="flex flex-col" style={{ gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--ink)' }}>
                          {getQuestionUserName(question) || '—'}
                        </span>
                        <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                          {question.id || '—'}
                        </span>
                      </span>
                    </td>
                    <td style={{ ...ROW, fontSize: 13 }}>{getQuestionAstrologerName(question) || question.astrologerId || '—'}</td>
                    <td className="muted" style={{ ...ROW, fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      {formatDisplayDate(getQuestionAskedAt(question))}
                    </td>
                    <td style={ROW}>
                      <DeadlineCell
                        question={question}
                        isExpired={buckets.expired.has(question.id)}
                        isOverdue={buckets.overdue.has(question.id)}
                        now={now}
                      />
                    </td>
                    <td style={{ ...ROW, whiteSpace: 'nowrap' }}>
                      <StatusBadge label={question.status} />
                    </td>
                    <td style={ROW}>
                      <PaymentCell question={question} />
                    </td>
                    <td style={ROW}>
                      <DisputeCell question={question} />
                    </td>
                    {/* A single existing action, so it stays a single control: a labelled
                        icon button rather than a one-item overflow menu, which would be
                        more markup and one more click for the same destination. The
                        handler, the route and the behaviour are unchanged; the text label
                        moved into the accessible name and the tooltip. */}
                    <td style={{ ...ROW, textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openQuestion(question.id)}
                        title="View question"
                        aria-label={`View question ${question.id}`}
                        style={{ padding: '0 9px', height: 30 }}
                      >
                        <Eye size={15} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Result range and pagination. Both describe the filtered list the table is
            actually showing, so they can never disagree with the rows on screen. */}
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          style={{ marginTop: 14 }}
        >
          <span className="muted" style={{ fontSize: 12.5, fontWeight: 500 }} aria-live="polite">
            {rangeLabel}
          </span>

          {pageCount > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={currentPage === 1 ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              {pageWindow(currentPage, pageCount).map((entry, index) => (
                entry === '…'
                  ? (
                    <span
                      key={`gap-${index}`}
                      className="muted"
                      style={{ padding: '0 4px', fontSize: 12.5 }}
                      aria-hidden="true"
                    >
                      …
                    </span>
                  )
                  : (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setPage(entry)}
                      aria-current={entry === currentPage ? 'page' : undefined}
                      aria-label={`Page ${entry}`}
                      className="btn btn-sm"
                      style={
                        entry === currentPage
                          ? { background: 'var(--primary-bg)', color: 'var(--primary)', borderColor: 'var(--primary)', fontWeight: 700, minWidth: 34 }
                          : { background: 'var(--surface)', color: 'var(--body)', borderColor: 'var(--surface-border)', minWidth: 34 }
                      }
                    >
                      {entry}
                    </button>
                  )
              ))}

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage === pageCount}
                style={currentPage === pageCount ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* States the limits of the current model rather than hiding them. */}
        <p className="muted" style={{ margin: '14px 0 0', fontSize: 12, lineHeight: 1.6 }}>
          Deadline uses the {ANSWER_WINDOW_DAYS}-day answer window from the question&apos;s own ask
          timestamp; it is derived, not stored, and a question with no readable ask time shows
          &ldquo;Not available&rdquo;. Payment amount is the question&apos;s recorded
          purchaseAmount, and the payment state beside it is derived from that amount, the refund
          fields and any dispute — it is not a persisted ledger state, and answering a question
          does not yet move money. No verification, escrow or real payment provider is involved
          anywhere on this page.
          {isHistory && (
            <>
              {' '}History is a filtered view of the same records, not an archive: nothing is
              moved, copied or deleted, and it defaults to a rolling six-month window purely to
              keep the list manageable. Use the Show control to widen it.
            </>
          )}
        </p>
      </Section>
    </div>
  )
}