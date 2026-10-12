import {
  getQuestionReceivedAt,
  getQuestionTypeLabel,
  isQuestionAnswered,
  isQuestionCancelled,
  isQuestionDeadlineExceeded,
} from './answer.js'
import { getMonthKeyFromDate, getQuestionMonthKey, getQuestionSourceLabel } from './questions.js'
import { getQuestionPaidAmount, getQuestionRefundAmount } from './sales.js'
import { isQuestionCompleted } from './questionLifecycle.js'

// The user "Ask a Question" dashboard is a read-only view over the questions
// that already exist in AppDataContext. Nothing here writes to a record: every
// helper below is a pure selector so the dashboard can never drift away from
// the question purchase / dispute logic it reuses.

// History is a read-only, all-time archive of the user's finished questions.
// It reuses the question lifecycle's own definition of "finished" (Completed)
// so a question can never appear in both My Questions and History, and it
// applies no artificial date window.
export const HISTORY_STATUS_FILTERS = ['All', 'Completed', 'Cancelled']

// Sentinel for the History month selector: no month restriction.
export const HISTORY_ALL_MONTHS = 'all'

// The stored dispute statuses are Open / Resolved / Closed. "Under Review" is
// derived for an open dispute the astrologer has already replied to, so the user
// can tell "waiting for a first reply" apart from "reply received, not settled"
// without introducing a new dispute status.
export const DISPUTE_STAGES = ['All', 'Open', 'Under Review', 'Resolved', 'Closed']

export function isQuestionOwnedByUser(question = {}, user) {
  if (!user?.id && !user?.email) return false
  if (user.id && question.submittedByUserId === user.id) return true
  if (user.email && question.submittedByEmail === user.email) return true
  return false
}

function receivedAtMs(question) {
  const received = getQuestionReceivedAt(question)
  return received ? received.getTime() : 0
}

export function getUserQuestions(questions = [], user) {
  return questions
    .filter((question) => isQuestionOwnedByUser(question, user))
    .sort((a, b) => receivedAtMs(b) - receivedAtMs(a))
}

// Every finished question the user owns, newest first, with no date window.
// "Finished" is the shared lifecycle rule (answered and past its dispute window,
// resolved, revoked/closed, or auto-cancelled on the 30-day answer deadline),
// plus a question that was answered and whose dispute has since been resolved -
// even when an older record never promoted its own status to "Resolved". History
// and My Questions therefore never contradict each other, and a raised (or
// resolved) dispute never hides a completed question from History.
export function getUserQuestionHistory(questions = [], user, { nowMs = Date.now() } = {}) {
  return getUserQuestions(questions, user).filter(
    (question) => isHistoryCompleted(question, nowMs) || isHistoryCancelled(question, nowMs),
  )
}

// The stored dispute is "Resolved" only when it was actually settled. A refund is
// DELIBERATELY not treated as proof of resolution, and "Open"/"Closed"/missing
// disputes are not treated as resolved.
function isDisputeResolved(question = {}) {
  return Boolean(question.dispute) && String(question.dispute.status || '').trim().toLowerCase() === 'resolved'
}

// Whether a record is a completed consultation. A cancelled/expired record is
// never completed; an answered record is completed when the lifecycle says so or
// when its dispute was resolved.
export function isHistoryCompleted(question = {}, nowMs = Date.now()) {
  if (isHistoryCancelled(question, nowMs)) return false
  if (isQuestionCompleted(question, nowMs)) return true
  return isQuestionAnswered(question) && isDisputeResolved(question)
}

// A finished record that did not end in a delivered answer: revoked/closed,
// cancelled, or auto-cancelled by the shared 30-day answer deadline. This is a
// pure selector over the fields the lifecycle already reads - it introduces no
// new status and changes no rule.
export function isHistoryCancelled(question = {}, nowMs = Date.now()) {
  if (isQuestionCancelled(question)) return true
  if (String(question.status || '').trim() === 'Closed') return true
  return !isQuestionAnswered(question) && isQuestionDeadlineExceeded(question, nowMs)
}

// Display label for an archived record. An expired record that was never
// promoted to a stored "Cancelled" status still reads as Cancelled instead of
// showing its stale "Pending" label. A completed question whose dispute was
// resolved shows "Resolved" so the archive keeps the existing distinction
// between a plain completion and one that followed a resolved dispute.
export function getHistoryStatusLabel(question = {}, nowMs = Date.now()) {
  const status = String(question.status || '').trim()
  if (isHistoryCancelled(question, nowMs)) return isQuestionCancelled(question) || status === 'Closed' ? (status || 'Cancelled') : 'Cancelled'
  if (isDisputeResolved(question)) return 'Resolved'
  return status || 'Completed'
}

// Month keys for the History selector: every month that holds an archived record
// plus the current month, mirroring the My Questions selector so the current
// month is always selectable. Newest first, and never truncated (History is an
// all-time archive).
export function getHistoryMonthOptions(questions = [], { now = new Date() } = {}) {
  const keys = new Set()
  const currentKey = getMonthKeyFromDate(now)
  if (currentKey) keys.add(currentKey)
  questions.forEach((question) => {
    const key = getQuestionMonthKey(question, null)
    if (key) keys.add(key)
  })
  return Array.from(keys).sort((a, b) => b.localeCompare(a))
}

export function matchesHistoryStatusFilter(question = {}, filter = 'All', nowMs = Date.now()) {
  if (filter === 'All') return true
  if (filter === 'Cancelled') return isHistoryCancelled(question, nowMs)
  if (filter === 'Completed') return !isHistoryCancelled(question, nowMs)
  return true
}

export function matchesHistorySearchFilter(question = {}, term = '') {
  const needle = String(term || '').trim().toLowerCase()
  if (!needle) return true
  return [
    question.id,
    question.category,
    getQuestionTypeLabel(question),
    getQuestionSourceLabel(question),
    question.question,
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

export function countHistoryStatuses(questions = [], { nowMs = Date.now() } = {}) {
  const counts = { All: questions.length, Completed: 0, Cancelled: 0 }
  questions.forEach((question) => {
    if (isHistoryCancelled(question, nowMs)) counts.Cancelled += 1
    else counts.Completed += 1
  })
  return counts
}

export function getDisputeStage(question = {}) {
  const dispute = question.dispute
  if (!dispute) return null
  const status = String(dispute.status || 'Open').trim().toLowerCase()
  if (status === 'resolved') return 'Resolved'
  if (status === 'closed') return 'Closed'
  if (String(dispute.response || '').trim()) return 'Under Review'
  return 'Open'
}

function disputeRaisedAtMs(dispute = {}) {
  const parsed = dispute.raisedAt ? new Date(dispute.raisedAt) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0
}

export function getUserDisputes(questions = [], user) {
  return getUserQuestions(questions, user)
    .filter((question) => Boolean(question.dispute))
    .sort((a, b) => {
      const byDispute = disputeRaisedAtMs(b.dispute) - disputeRaisedAtMs(a.dispute)
      return byDispute || receivedAtMs(b) - receivedAtMs(a)
    })
    .map((question) => ({ question, dispute: question.dispute, stage: getDisputeStage(question) }))
}

export function countDisputeStages(disputes = []) {
  const counts = { All: disputes.length, Open: 0, 'Under Review': 0, Resolved: 0, Closed: 0 }
  disputes.forEach((entry) => {
    if (DISPUTE_STAGES.includes(entry.stage) && entry.stage !== 'All') counts[entry.stage] += 1
  })
  return counts
}

// Answered questions that still have no dispute are the ones the user can raise
// a dispute on. Raising stays on the existing Raise Dispute page, which owns the
// dispute form and the raiseDispute action.
export function getDisputeEligibleQuestions(questions = [], user) {
  return getUserQuestions(questions, user).filter(
    (question) => question.status === 'Answered' && !question.dispute,
  )
}

export function getQuestionPaymentSummary(question = {}) {
  const refundAmount = getQuestionRefundAmount(question)
  const refundState = String(question.refundStatus || '').toLowerCase()
  const refunded = refundAmount > 0 || refundState === 'refunded' || refundState === 'completed'
  return {
    paid: getQuestionPaidAmount(question),
    refund: refundAmount,
    refunded,
    label: refunded ? 'Refunded' : String(question.purchaseType || 'Free'),
  }
}