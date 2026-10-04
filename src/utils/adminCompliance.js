import {
  DISPUTE_STATUS_OVERDUE,
  HELD_PAYMENT_STATES,
  PAYMENT_STATE_DISPUTED,
  PAYMENT_STATE_HELD,
  PAYMENT_STATE_REFUND_PENDING,
  PAYMENT_STATE_REFUNDED,
  PAYMENT_STATE_RELEASE_ELIGIBLE,
  PAYMENT_STATE_RELEASED,
  QUESTION_RESOLVED_STATUSES,
  getAstrologerDormancy,
  getDisputeResponseDeadline,
  getMsUntilAnswerDeadline,
  getQuestionPaidAmount,
  getQuestionPaymentState,
  isDisputeOverdue,
  isDisputeUnresolved,
  isQuestionDueSoon,
  isQuestionOverdue,
} from './paymentRules.js'
import { getQuestionAskedAt } from './adminQuestions.js'
import { parseDisplayDate, sortByDateDesc } from './date.js'

// Pure selectors for the admin compliance surfaces.
//
// These read the stores that already exist — the questions store (which is also
// where disputes live) and the astrologer activity log — and turn them into the
// handful of figures the Admin Dashboard needs for questions nearing the 30-day
// answer deadline, questions overdue with a refund pending, disputes approaching
// or past the 7-day response window, refunds awaiting settlement, and held or
// disputed amounts.
//
// Nothing here writes, and no figure is estimated: every count and every total is
// summed from records that exist right now. A source that cannot be attributed
// reports an explicit unavailable reason rather than a zero, so a real zero is
// never confused with a missing measurement.

function asArray(value) {
  return Array.isArray(value) ? value : []
}

// parseDisplayDate yields the epoch for a value it cannot read, so a raw getTime()
// would make an undated dispute look due 56 years ago. Non-positive means unknown.
function deadlineMillis(dispute) {
  const time = parseDisplayDate(getDisputeResponseDeadline(dispute)).getTime()
  return Number.isFinite(time) && time > 0 ? time : null
}

// ---------------------------------------------------------------------------
// Rule 1 — questions against the 30-day answer window
// ---------------------------------------------------------------------------
export function selectQuestionsOverdue(questions, now = Date.now()) {
  return asArray(questions)
    .filter((question) => isQuestionOverdue(question, now))
    .sort((a, b) => sortByDateDesc(a, b, (row) => row.raisedAt || row.raised))
}

export function selectQuestionsDueSoon(questions, now = Date.now()) {
  return asArray(questions)
    .filter((question) => isQuestionDueSoon(question, now))
    .sort((a, b) => {
      const aRemaining = getMsUntilAnswerDeadline(a, now) ?? Number.MAX_SAFE_INTEGER
      const bRemaining = getMsUntilAnswerDeadline(b, now) ?? Number.MAX_SAFE_INTEGER
      return aRemaining - bRemaining
    })
}

// Questions whose answer window has run out. These are the records the expiry sweep
// has not yet moved to Expired — the sweep runs on a timer, so the dashboard shows
// the window between "overdue" and "swept".
export function selectExpiredQuestions(questions) {
  return asArray(questions).filter((question) => question?.expiredAt)
}

// ---------------------------------------------------------------------------
// Refunds
//
// A refund is "pending" while refundStatus is Pending or Processing, or while a
// question is sitting in the Expired state waiting for its refund to settle. The
// amount is the question's own purchaseAmount — the same figure revokeQuestion
// refunds from.
// ---------------------------------------------------------------------------
export function isRefundPending(question) {
  if (!question) return false
  if (getQuestionPaymentState(question) !== PAYMENT_STATE_REFUND_PENDING) return false
  return getQuestionPaidAmount(question) !== null
}

export function selectPendingRefunds(questions) {
  return asArray(questions).filter((question) => isRefundPending(question))
}

export function summarisePendingRefunds(questions) {
  const rows = selectPendingRefunds(questions)
  const amount = rows.reduce((total, question) => total + (getQuestionPaidAmount(question) || 0), 0)
  return { count: rows.length, amount }
}

// ---------------------------------------------------------------------------
// Held and disputed money
//
// The amount sitting with the platform because the astrologer has not yet earned
// it: every question whose payment state is Held / Pending, Refund Pending or
// Disputed. Refund Pending is reported on its own as well, because that money is
// already spoken for — it is going back to the customer, not to the astrologer.
// ---------------------------------------------------------------------------
export function selectHeldAmounts(questions) {
  return asArray(questions).filter((question) => {
    const state = getQuestionPaymentState(question)
    return state !== null && HELD_PAYMENT_STATES.has(state)
  })
}

export function summariseHeldAmounts(questions) {
  const rows = selectHeldAmounts(questions)
  // Each amount is reported exactly once, under the state that actually describes it:
  //   Held / Pending  -> money withheld pending the astrologer earning it
  //   Disputed        -> money withheld until a dispute is resolved
  //   Refund Pending  -> money already owed back to a customer
  // Counting disputed money as "held" as well would double-count it across two tiles.
  const sumFor = (state) => rows.reduce(
    (total, question) => (
      getQuestionPaymentState(question) === state
        ? total + (getQuestionPaidAmount(question) || 0)
        : total
    ),
    0,
  )
  return {
    count: rows.length,
    held: sumFor(PAYMENT_STATE_HELD),
    disputed: sumFor(PAYMENT_STATE_DISPUTED),
  }
}

// ---------------------------------------------------------------------------
// Rule 2 — disputes against the 7-day response window
// ---------------------------------------------------------------------------
export function selectOverdueDisputes(questions, now = Date.now()) {
  return asArray(questions)
    .filter((question) => isDisputeOverdue(question.dispute, now))
    .sort((a, b) => sortByDateDesc(a, b, (row) => row.dispute?.responseDueAt || row.dispute?.raisedAt))
}

// Disputes still waiting on the astrologer but not yet past the window.
export function selectDisputesDueSoon(questions, now = Date.now()) {
  return asArray(questions)
    .filter((question) => {
      const dispute = question?.dispute
      if (!isDisputeUnresolved(dispute)) return false
      if (isDisputeOverdue(dispute, now)) return false
      const due = deadlineMillis(dispute)
      return due !== null && due > now
    })
    .sort((a, b) => {
      const aDue = deadlineMillis(a.dispute) ?? Number.MAX_SAFE_INTEGER
      const bDue = deadlineMillis(b.dispute) ?? Number.MAX_SAFE_INTEGER
      return aDue - bDue
    })
}

// Every unresolved dispute. An overdue dispute is still unresolved: the window
// expiring flags it for an admin, it never decides it.
export function selectUnresolvedDisputes(questions) {
  return asArray(questions).filter((question) => isDisputeUnresolved(question?.dispute))
}

// Overdue disputes are stored with their own status so the flag is visible on the
// record itself and in the audit trail, not only in a derived view.
export const DISPUTE_OVERDUE_STATUS = DISPUTE_STATUS_OVERDUE

// ---------------------------------------------------------------------------
// Active vs historical questions.
//
// This is a DERIVED VIEW over the one existing questions store. Nothing is moved,
// copied, archived or deleted: both lists below are filters over the same records,
// which is what keeps a future backend migration straightforward.
//
// "Historical" means the business flow reached a final outcome. That is decided
// purely from state the model already stores — the payment outcome and the dispute
// state — and never from a date:
//
//   * A live dispute always keeps a question active. Time alone never settles one,
//     so an Answered question whose dispute is still Open stays in the active queue.
//   * A payment outcome that has settled (Release Eligible, Released, Refunded) means
//     the flow finished: answered and answered-for, released, or refunded.
//   * A question with no money attached (state null, a Free question) falls back to
//     its own final status, so a free answered question is not trapped in the active
//     queue forever.
//   * A passed deadline is NOT evidence of completion. Held / Pending, Refund Pending
//     and Disputed are all deliberately excluded, which is exactly the overdue case:
//     an unanswered question past 30 days is still awaiting an answer.
//
// No new question status is introduced and no existing rule is changed.
const SETTLED_PAYMENT_STATES = new Set([
  PAYMENT_STATE_RELEASE_ELIGIBLE,
  PAYMENT_STATE_RELEASED,
  PAYMENT_STATE_REFUNDED,
])

export function isQuestionHistorical(question) {
  if (!question) return false

  const status = String(question.status || '').trim()

  // A dispute that has reached a terminal status is finished work, and this branch
  // exists because of a real, reachable state rather than a hypothetical one: the
  // astrologer-side respondToDispute(..., 'Resolved') path sets the dispute status but
  // never returns question.status to Answered or Closed, so a resolved dispute sits on a
  // question still marked 'Disputed'. Because getQuestionPaymentState() only recognises
  // Answered and Closed as settled, such a question would otherwise report a phantom
  // "Held / Pending" and could never leave the active queue.
  if (question.dispute && !isDisputeUnresolved(question.dispute) && status === 'Disputed') {
    return true
  }

  // An unresolved dispute keeps the question active regardless of anything else.
  if (isDisputeUnresolved(question.dispute)) return false

  const state = getQuestionPaymentState(question)
  if (SETTLED_PAYMENT_STATES.has(state)) return true

  // No money attached (a Free question): fall back to the question's own final
  // status, since there is no payment outcome to read.
  if (state === null) return QUESTION_RESOLVED_STATUSES.has(status)

  // Everything else — Held / Pending, Refund Pending, Disputed — is still in flight.
  return false
}

export function selectHistoricalQuestions(questions) {
  return asArray(questions).filter((question) => isQuestionHistorical(question))
}

export function selectActiveQuestions(questions) {
  return asArray(questions).filter((question) => !isQuestionHistorical(question))
}

// A rolling "last N months" window, used as the default History period so that view
// stays manageable. This is a UI filter only: it hides nothing permanently, records
// outside the window are untouched, and a wider window brings them straight back.
export function selectQuestionsInRecentMonths(questions, months = 6, now = Date.now()) {
  const span = Math.max(1, Number(months) || 1)
  const anchor = new Date(now)
  const cutoff = new Date(anchor.getFullYear(), anchor.getMonth() - (span - 1), 1)
  cutoff.setHours(0, 0, 0, 0)
  const cutoffMs = cutoff.getTime()

  return asArray(questions).filter((question) => {
    const asked = parseDisplayDate(getQuestionAskedAt(question)).getTime()
    // An unreadable date cannot be placed in a window, so it is left out of the
    // window rather than guessed into it.
    if (!Number.isFinite(asked) || asked <= 0) return false
    return asked >= cutoffMs && asked <= now
  })
}

// ---------------------------------------------------------------------------
// Rule 3 — dormant astrologers
// ---------------------------------------------------------------------------
export function selectDormantAstrologers(astrologers, activityLog, now = Date.now()) {
  return asArray(astrologers)
    .map((astrologer) => ({
      astrologer,
      dormancy: getAstrologerDormancy(activityLog, astrologer?.id, now),
    }))
    .filter((row) => row.dormancy.known && row.dormancy.isDormant)
    .sort((a, b) => (b.dormancy.daysSinceActivity || 0) - (a.dormancy.daysSinceActivity || 0))
}

// Astrologers we hold no activity data for. Reported separately and never counted
// as dormant: the activity log starts empty, so "no data" is not "inactive".
export function countAstrologersWithoutActivityData(astrologers, activityLog, now = Date.now()) {
  return asArray(astrologers).filter(
    (astrologer) => !getAstrologerDormancy(activityLog, astrologer?.id, now).known,
  ).length
}

// ---------------------------------------------------------------------------
// One snapshot for the dashboard
// ---------------------------------------------------------------------------
export function summariseCompliance({ questions, astrologers, activityLog, now = Date.now() } = {}) {
  const overdueQuestions = selectQuestionsOverdue(questions, now)
  const dueSoonQuestions = selectQuestionsDueSoon(questions, now)
  const overdueDisputes = selectOverdueDisputes(questions, now)
  const dueSoonDisputes = selectDisputesDueSoon(questions, now)
  const refunds = summarisePendingRefunds(questions)
  const held = summariseHeldAmounts(questions)
  const dormant = selectDormantAstrologers(astrologers, activityLog, now)

  return {
    overdueQuestions,
    dueSoonQuestions,
    overdueDisputes,
    dueSoonDisputes,
    pendingRefunds: refunds,
    heldAmounts: held,
    dormantAstrologers: dormant,
    dormantAstrologerCount: dormant.length,
    unknownActivityAstrologers: countAstrologersWithoutActivityData(astrologers, activityLog, now),
  }
}