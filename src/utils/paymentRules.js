import { parseDisplayDate } from './date.js'
import { getQuestionResponse } from './adminQuestions.js'

// Payment hold, refund, dispute-deadline and inactivity RULES.
//
// This module is the single source of truth for the platform's money-holding and
// deadline policy. It owns no data and writes nothing: every rule here is a pure
// derivation over records that already exist in the app's stores.
//
// Why one module
// --------------
// The 30-day answer window was previously declared only inside
// pages/admin/AdminDashboard.jsx, as display-only maths. That is the rule this
// feature has to enforce, so the constant and its arithmetic live here and the
// dashboard imports them. That keeps exactly ONE definition of the 30-day window
// rather than a second, competing timer.
//
// What is real here
// -----------------
// Nothing in this file moves money and nothing here is an escrow service. It
// classifies records and computes deadlines against the browser clock, which is the
// same trust level as every other rule in this localStorage application. The
// language used is deliberately "Held / Pending", "Release Eligible" and
// "Disputed" — never "Escrow", because no regulated escrow facility exists here.

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000

// The platform rule: an astrologer has 30 days to answer a text-based question.
// Imported by pages/admin/AdminDashboard.jsx so the display warning and the sweep
// that enforces expiry can never drift apart.
export const ANSWER_WINDOW_DAYS = 30

// The platform rule: an astrologer has 7 days to respond to a raised dispute.
export const DISPUTE_RESPONSE_WINDOW_DAYS = 7

// The platform rule: an astrologer with no qualifying astrologer-side activity for
// 10 days is treated as dormant for admin visibility purposes.
export const ASTROLOGER_INACTIVITY_DAYS = 10

// How close to a deadline the admin dashboard starts warning. Display only.
export const DEADLINE_WARNING_DAYS = 7

// ---------------------------------------------------------------------------
// Payment state vocabulary
//
// These are the states the current model can actually represent. They are stored on
// the question as `paymentState` where a transition happens, and derived everywhere
// else by getQuestionPaymentState() so a record written before this rule existed
// still reports a correct state instead of a blank one.
// ---------------------------------------------------------------------------
export const PAYMENT_STATE_HELD = 'Held / Pending'
export const PAYMENT_STATE_RELEASE_ELIGIBLE = 'Release Eligible'
export const PAYMENT_STATE_RELEASED = 'Released'
export const PAYMENT_STATE_REFUND_PENDING = 'Refund Pending'
export const PAYMENT_STATE_REFUNDED = 'Refunded'
export const PAYMENT_STATE_DISPUTED = 'Disputed'

export const PAYMENT_STATES = [
  PAYMENT_STATE_HELD,
  PAYMENT_STATE_RELEASE_ELIGIBLE,
  PAYMENT_STATE_RELEASED,
  PAYMENT_STATE_REFUND_PENDING,
  PAYMENT_STATE_REFUNDED,
  PAYMENT_STATE_DISPUTED,
]

// States in which an amount is withheld from the astrologer and is not yet payable.
export const HELD_PAYMENT_STATES = new Set([
  PAYMENT_STATE_HELD,
  PAYMENT_STATE_REFUND_PENDING,
  PAYMENT_STATE_DISPUTED,
])

// ---------------------------------------------------------------------------
// Question status vocabulary
//
// Read off question records that already exist. `Expired` is the one status this
// feature introduces, and it is written only by the compliance sweep.
// ---------------------------------------------------------------------------

// Statuses that mean "the astrologer still owes an answer". The 30-day clock runs
// while a question is in one of these and stops the moment it leaves them.
export const QUESTION_AWAITING_ANSWER_STATUSES = new Set([
  'Pending',
  'Queued',
  'In Progress',
  'Under Review',
])

// Statuses that mean the question is finished and the amount may be released.
export const QUESTION_RESOLVED_STATUSES = new Set(['Answered', 'Closed'])

// Added by this feature. A question that ran out its 30-day window unanswered.
export const QUESTION_STATUS_EXPIRED = 'Expired'

// ---------------------------------------------------------------------------
// Dispute status vocabulary
//
// 'Open', 'Resolved' and 'Closed' are already written by the existing dispute flow.
// 'Under Review' already exists as a *question* status and is reused here as the
// dispute status for "an admin has looked at it". 'Awaiting Astrologer Response'
// and 'Overdue' are added by this feature.
// ---------------------------------------------------------------------------
export const DISPUTE_STATUS_OPEN = 'Open'
export const DISPUTE_STATUS_UNDER_REVIEW = 'Under Review'
export const DISPUTE_STATUS_AWAITING_RESPONSE = 'Awaiting Astrologer Response'
export const DISPUTE_STATUS_OVERDUE = 'Overdue'
export const DISPUTE_STATUS_RESOLVED = 'Resolved'
export const DISPUTE_STATUS_CLOSED = 'Closed'

// A dispute stays unresolved — and its amount stays withheld — until one of these
// terminal statuses is actually written. Time alone never resolves a dispute.
export const DISPUTE_RESOLVED_STATUSES = new Set([DISPUTE_STATUS_RESOLVED, DISPUTE_STATUS_CLOSED])

// Statuses that still expect the astrologer to answer.
export const DISPUTE_AWAITING_RESPONSE_STATUSES = new Set([
  DISPUTE_STATUS_OPEN,
  DISPUTE_STATUS_UNDER_REVIEW,
  DISPUTE_STATUS_AWAITING_RESPONSE,
  DISPUTE_STATUS_OVERDUE,
])

// How a dispute was finally decided.
export const DISPUTE_OUTCOME_CUSTOMER = 'customer'
export const DISPUTE_OUTCOME_ASTROLOGER = 'astrologer'
export const DISPUTE_OUTCOME_PARTIAL = 'partial'

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------
// parseDisplayDate returns the epoch for any value it cannot read, which would make
// "unknown" indistinguishable from 1970 and quietly expire or dormancy-flag every
// record that lacks a timestamp. A non-positive time therefore means "no usable
// timestamp" and every caller treats it as unknown rather than guessing.
function toMillis(value) {
  const parsed = parseDisplayDate(value)
  const time = parsed.getTime()
  if (!Number.isFinite(time) || time <= 0) return null
  return time
}

export function addDaysIso(value, days) {
  const time = toMillis(value)
  if (time === null) return null
  return new Date(time + days * DAY_MS).toISOString()
}

export function daysBetween(fromValue, toValue = Date.now()) {
  const from = toMillis(fromValue)
  const to = toMillis(toValue)
  if (from === null || to === null) return null
  return Math.floor((to - from) / DAY_MS)
}

// The amount a question actually cost the customer, read the way revokeQuestion
// already reads it. Returns null when the record carries no usable amount, so a
// missing figure is never treated as zero money.
export function getQuestionPaidAmount(question) {
  const raw = question?.purchaseAmount
  if (raw === null || raw === undefined || raw === '') return null
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}

// Whether any money is attached to the question at all.
export function isPaidQuestion(question) {
  if (String(question?.purchaseType || '').trim().toLowerCase() === 'paid') {
    // A Paid question with no amount recorded cannot produce a real refund, so it is
    // reported as unpaid rather than as a ₹0 refund.
    return getQuestionPaidAmount(question) !== null
  }
  return getQuestionPaidAmount(question) !== null
}

// ---------------------------------------------------------------------------
// Rule 1 — the 30-day answer window
// ---------------------------------------------------------------------------

// When the astrologer's answer is due. Derived from the question's own asked-at
// timestamp plus the 30-day rule; no deadline is stored, so a stale persisted
// deadline can never disagree with the rule.
export function getAnswerDeadlineAt(question) {
  const askedAt = question?.raisedAt || question?.raised || question?.submittedAt
  const asked = toMillis(askedAt)
  if (asked === null) return null
  return new Date(asked + ANSWER_WINDOW_DAYS * DAY_MS).toISOString()
}

export function getMsUntilAnswerDeadline(question, now = Date.now()) {
  const deadline = toMillis(getAnswerDeadlineAt(question))
  if (deadline === null) return null
  return deadline - now
}

// True only while the question is still awaiting an answer AND the window has run
// out. A question that was answered, expired or is in dispute is never overdue.
//
// The delivered-answer check is not redundant with the status set: it preserves the
// rule the Admin Dashboard already applied, where a question carrying an answer is
// treated as handled even if its status has not caught up. getQuestionResponse()
// deliberately ignores draftAnswer, so a half-written draft never counts as an
// answer and never expires in the astrologer's absence.
export function isQuestionAwaitingAnswer(question) {
  if (!QUESTION_AWAITING_ANSWER_STATUSES.has(String(question?.status || '').trim())) return false
  return !getQuestionResponse(question)
}

export function isQuestionOverdue(question, now = Date.now()) {
  if (!isQuestionAwaitingAnswer(question)) return false
  if (question?.expiredAt) return false
  const remaining = getMsUntilAnswerDeadline(question, now)
  return remaining !== null && remaining <= 0
}

// Questions due inside the warning window but not yet overdue.
export function isQuestionDueSoon(question, now = Date.now()) {
  if (!isQuestionAwaitingAnswer(question)) return false
  if (question?.expiredAt) return false
  const remaining = getMsUntilAnswerDeadline(question, now)
  if (remaining === null || remaining <= 0) return false
  return remaining <= DEADLINE_WARNING_DAYS * DAY_MS
}

// ---------------------------------------------------------------------------
// Rule 1 — the payment state of a question
//
// Derived, not stored, for every existing record. This is what makes the feature
// safe to ship against data created before it existed: an old paid, unanswered
// question reports "Held / Pending" without anything having been written to it.
// ---------------------------------------------------------------------------
export function isDisputeUnresolved(dispute) {
  if (!dispute) return false
  const status = String(dispute.status || '').trim()
  if (!status) return true
  return !DISPUTE_RESOLVED_STATUSES.has(status)
}

export function getQuestionPaymentState(question) {
  if (!isPaidQuestion(question)) return null

  const refundStatus = String(question.refundStatus || '').trim()
  const paidAmount = getQuestionPaidAmount(question)

  // A live dispute withholds the amount regardless of anything else.
  if (isDisputeUnresolved(question.dispute)) return PAYMENT_STATE_DISPUTED

  if (refundStatus === 'Completed' && paidAmount !== null && Number(question.refundAmount) > 0) {
    return PAYMENT_STATE_REFUNDED
  }
  if (refundStatus === 'Pending') return PAYMENT_STATE_REFUND_PENDING
  if (refundStatus === 'Processing') return PAYMENT_STATE_REFUND_PENDING

  // Expired without an answer: the amount is on its way back to the customer and is
  // never released to the astrologer.
  if (question.expiredAt || String(question.status || '').trim() === QUESTION_STATUS_EXPIRED) {
    return PAYMENT_STATE_REFUND_PENDING
  }

  // An explicit release, written when an admin or settlement releases the amount.
  if (String(question.paymentState || '').trim() === PAYMENT_STATE_RELEASED) {
    return PAYMENT_STATE_RELEASED
  }

  if (QUESTION_RESOLVED_STATUSES.has(String(question.status || '').trim())) {
    return PAYMENT_STATE_RELEASE_ELIGIBLE
  }

  return PAYMENT_STATE_HELD
}

// ---------------------------------------------------------------------------
// Rule 2 — the 7-day dispute response window
// ---------------------------------------------------------------------------

// A dispute is unresolved until a real resolution action writes Resolved or Closed.
// Elapsed time alone never resolves one, and never awards it to either side.
export function isDisputeOverdue(dispute, now = Date.now()) {
  if (!isDisputeUnresolved(dispute)) return false
  if (!DISPUTE_AWAITING_RESPONSE_STATUSES.has(String(dispute?.status || '').trim())) return false
  const due = toMillis(getDisputeResponseDeadline(dispute))
  if (due === null) return false
  return due <= now
}

// The response deadline. An admin-requested response stores its own deadline in the
// same ISO shape the rest of the dispute model already uses (raisedAt). When no
// deadline was stored, it is derived from raisedAt plus the 7-day rule so a dispute
// raised before this feature existed still gets a window instead of none.
export function getDisputeResponseDeadline(dispute) {
  const stored = dispute?.responseDueAt
  if (stored) return stored
  return addDaysIso(dispute?.raisedAt, DISPUTE_RESPONSE_WINDOW_DAYS)
}

export function isDisputeAwaitingResponse(dispute) {
  return DISPUTE_AWAITING_RESPONSE_STATUSES.has(String(dispute?.status || '').trim())
}

// ---------------------------------------------------------------------------
// Rule 3 — astrologer inactivity
//
// Derived from the astrologer activity log that already exists
// (AppDataContext.activityLog, storage key astroconnect-astrologer-activity-log),
// where every entry carries a reliable ISO createdAt.
//
// There is deliberately NO persisted lastActivityAt field. No astrologer record —
// not in AuthContext, not in the catalog — carries any timestamp, so writing one
// would be inventing persistence the data model does not have. Absence of activity
// is reported as "unknown", never as "inactive": the activity log starts empty and
// an astrologer who has simply never acted on this device must not be punished for
// it.
//
// Availability is never consulted here. Online/Offline is service presence, and a
// temporarily Offline astrologer is not an inactive one.
export function getAstrologerLastActivityAt(activityLog, astrologerId) {
  const rows = Array.isArray(activityLog) ? activityLog : []
  let newest = null
  for (const entry of rows) {
    if (entry?.astrologerId !== astrologerId) continue
    const at = toMillis(entry.createdAt)
    if (at === null) continue
    if (newest === null || at > newest) newest = at
  }
  return newest === null ? null : new Date(newest).toISOString()
}

export function getAstrologerInactivityDays(activityLog, astrologerId, now = Date.now()) {
  const last = toMillis(getAstrologerLastActivityAt(activityLog, astrologerId))
  if (last === null) return null
  return Math.floor((now - last) / DAY_MS)
}

// Dormant means "we can prove there has been no qualifying astrologer-side activity
// for at least the inactivity window". `known: false` means we have no activity data
// at all, which is a different and much weaker statement.
export function getAstrologerDormancy(activityLog, astrologerId, now = Date.now()) {
  const days = getAstrologerInactivityDays(activityLog, astrologerId, now)
  if (days === null) {
    return { known: false, isDormant: false, lastActivityAt: null, daysSinceActivity: null }
  }
  return {
    known: true,
    isDormant: days >= ASTROLOGER_INACTIVITY_DAYS,
    lastActivityAt: getAstrologerLastActivityAt(activityLog, astrologerId),
    daysSinceActivity: days,
  }
}