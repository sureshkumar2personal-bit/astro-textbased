import { getQuestionReceivedAt, getQuestionTypeLabel } from './answer.js'
import { getQuestionSourceLabel } from './questions.js'
import { getQuestionPaidAmount, getQuestionRefundAmount } from './sales.js'

// The user "Ask a Question" dashboard is a read-only view over the questions
// that already exist in AppDataContext. Nothing here writes to a record: every
// helper below is a pure selector so the dashboard can never drift away from
// the question purchase / dispute logic it reuses.

// History is scoped to the last six months. The window is calculated from the
// dates already on each record (no new field is stored on a question).
export const QUESTION_HISTORY_MONTHS = 6

// The stored dispute statuses are Open / Resolved / Closed. "Under Review" is
// derived for an open dispute the astrologer has already replied to, so the user
// can tell "waiting for a first reply" apart from "reply received, not settled"
// without introducing a new dispute status.
export const DISPUTE_STAGES = ['All', 'Open', 'Under Review', 'Resolved', 'Closed']

export const HISTORY_STATUS_FILTERS = ['All', 'Answered', 'Disputed', 'Resolved', 'Closed']

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

export function getHistoryWindowStart(now = new Date(), months = QUESTION_HISTORY_MONTHS) {
  const start = new Date(now)
  start.setMonth(start.getMonth() - Number(months || 0))
  start.setHours(0, 0, 0, 0)
  return start
}

export function getHistoryWindowLabel(now = new Date(), months = QUESTION_HISTORY_MONTHS) {
  const start = getHistoryWindowStart(now, months)
  const formatted = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  return `Last ${months} months · from ${formatted}`
}

export function isWithinHistoryWindow(question = {}, now = new Date(), months = QUESTION_HISTORY_MONTHS) {
  const received = receivedAtMs(question)
  if (!received) return false
  return received >= getHistoryWindowStart(now, months).getTime()
}

export function getUserQuestionHistory(questions = [], user, options = {}) {
  const now = options.now || new Date()
  const months = options.months || QUESTION_HISTORY_MONTHS
  return getUserQuestions(questions, user).filter((question) => isWithinHistoryWindow(question, now, months))
}

export function matchesHistoryStatusFilter(question = {}, filter = 'All') {
  if (filter === 'All') return true
  const status = String(question.status || '').trim().toLowerCase()
  if (filter === 'Answered') return status === 'answered'
  if (filter === 'Disputed') return status === 'disputed'
  if (filter === 'Resolved') return status === 'resolved'
  if (filter === 'Closed') return status === 'closed' || status === 'cancelled'
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

export function countHistoryStatuses(questions = []) {
  const counts = { All: questions.length, Answered: 0, Disputed: 0, Resolved: 0, Closed: 0 }
  questions.forEach((question) => {
    HISTORY_STATUS_FILTERS.forEach((filter) => {
      if (filter !== 'All' && matchesHistoryStatusFilter(question, filter)) counts[filter] += 1
    })
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