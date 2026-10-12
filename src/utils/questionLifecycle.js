// Question lifecycle used by the user-side Track My Questions screen.
//
// It adds no new status system: every rule here is derived from the question /
// dispute fields that already exist (status, dispute.status, answeredAt, the
// shared 30-day answer deadline, refund fields). Track My Questions shows only
// questions whose lifecycle is still active; a finished question is reported as
// Completed and therefore belongs to History.

import {
  ANSWER_DEADLINE_DAYS,
  getAnswerSubmittedAtMs,
  isQuestionAnswered,
  isQuestionCancelled,
  isQuestionDeadlineExceeded,
  hasOpenDispute,
} from './answer.js'
import { getQuestionMonthKey } from './questions.js'
import { parseDisplayDate } from './date.js'

// A dispute can be raised for 7 days from the moment the answer arrived.
export const DISPUTE_WINDOW_DAYS = 7
export const DISPUTE_WINDOW_MS = DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000

export const STAGE_WAITING = 'Waiting for Answer'
export const STAGE_ANSWERED = 'Answered'
export const STAGE_DISPUTED = 'Disputed'
export const STAGE_RESOLVED = 'Resolved'
export const STAGE_COMPLETED = 'Completed'

// All / Waiting for Answer / Answered / Disputed / Resolved. "All" is scoped to
// the selected month and only ever contains ACTIVE questions.
export const LIFECYCLE_FILTERS = ['All', STAGE_WAITING, STAGE_ANSWERED, STAGE_DISPUTED, STAGE_RESOLVED]

function parseMs(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

// Display dates such as "18-Jul-2026 06:45 PM" are parsed with the app's shared
// display-date parser, the same helper the answer helpers use.
function parseDisplayMs(value) {
  if (value == null || value === '') return null
  const parsed = parseDisplayDate(value).getTime()
  return Number.isNaN(parsed) || parsed === 0 ? null : parsed
}

// When the answer reached the user. Field order matches the answer view first
// (answeredAt / answerDeliveredAt / answerReviewStartedAt), then falls back to
// when the question itself arrived for older records that never stored an
// explicit answer timestamp, so those records still get a real 7-day window
// instead of being treated as instantly finished.
export function getQuestionAnsweredAtMs(question = {}) {
  return getAnswerSubmittedAtMs(question)
    ?? parseMs(question.submittedAt)
    ?? parseDisplayMs(question.raisedAt)
    ?? parseDisplayMs(question.raised)
}

export function getDisputeWindowDeadlineMs(question = {}) {
  const answeredMs = getQuestionAnsweredAtMs(question)
  return answeredMs == null ? null : answeredMs + DISPUTE_WINDOW_MS
}

// The dispute window is only relevant while the question is answered and no
// dispute has been raised yet.
export function isDisputeWindowOpen(question = {}, nowMs = Date.now()) {
  if (!isQuestionAnswered(question) || hasOpenDispute(question)) return false
  const deadline = getDisputeWindowDeadlineMs(question)
  return deadline != null && nowMs < deadline
}

export function getDisputeDaysRemaining(question = {}, nowMs = Date.now()) {
  const deadline = getDisputeWindowDeadlineMs(question)
  if (deadline == null) return 0
  return Math.max(0, Math.ceil((deadline - nowMs) / (24 * 60 * 60 * 1000)))
}

export function getDisputeWindowLabel(question = {}, nowMs = Date.now()) {
  const days = getDisputeDaysRemaining(question, nowMs)
  return days === 1 ? '1 day left to raise a dispute' : `${days} days left to raise a dispute`
}

// The single source of truth for where a question sits in its lifecycle.
// Completed means "finished": History owns it and Track My Questions must not
// list it again.
export function getQuestionLifecycleStage(question = {}, nowMs = Date.now()) {
  if (!question) return STAGE_COMPLETED

  const status = String(question.status || '').trim()

  // Already finished: revoked, closed, or auto-cancelled by the shared 30-day
  // answer deadline (AppDataContext.cancelExpiredQuestions applies that and the
  // refund, this only reads it).
  if (isQuestionCancelled(question) || status === 'Closed') return STAGE_COMPLETED
  if (!isQuestionAnswered(question) && isQuestionDeadlineExceeded(question, nowMs)) return STAGE_COMPLETED

  if (question.dispute) {
    // Open (or otherwise unsettled) dispute: still in progress.
    if (hasOpenDispute(question)) return STAGE_DISPUTED
    // A resolved dispute finishes the lifecycle only once the question record
    // itself has been promoted to Resolved. A record where the dispute settled
    // but the promotion never happened stays here as Resolved until it closes.
    if (String(question.dispute.status || '').toLowerCase() === 'resolved' && status === 'Resolved') return STAGE_COMPLETED
    return STAGE_RESOLVED
  }

  if (isQuestionAnswered(question)) {
    return isDisputeWindowOpen(question, nowMs) ? STAGE_ANSWERED : STAGE_COMPLETED
  }

  return STAGE_WAITING
}

export function isQuestionCompleted(question = {}, nowMs = Date.now()) {
  return getQuestionLifecycleStage(question, nowMs) === STAGE_COMPLETED
}

export function isQuestionActive(question = {}, nowMs = Date.now()) {
  return !isQuestionCompleted(question, nowMs)
}

export function matchesLifecycleFilter(question = {}, filter = 'All', nowMs = Date.now()) {
  if (filter === 'All') return true
  return getQuestionLifecycleStage(question, nowMs) === filter
}

// Refund facts already on the record - no new refund mechanism is introduced.
export function getQuestionRefundInfo(question = {}) {
  const amount = Number(question.refundAmount) || 0
  const status = String(question.refundStatus || 'None')
  if (amount <= 0 && status === 'None') return null
  const processedAt = parseMs(question.refundProcessedAt)
    || parseMs(question.answeredAt)
    || null
  return {
    amount,
    status: status === 'None' ? 'Refunded' : status,
    processedAt,
    reason: question.cancellationReason || null,
  }
}

function receivedAtMs(question) {
  const raw = question.receivedAt || question.raisedAt || question.submittedAt || question.raised
  if (raw == null || raw === '') return 0
  const parsed = new Date(raw).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

// Track My Questions is scoped to one month. "All" never means all time.
export function selectActiveQuestionsForMonth(questions = [], { monthKey = null, nowMs = Date.now() } = {}) {
  return questions
    .filter((question) => isQuestionActive(question, nowMs))
    .filter((question) => (monthKey ? getQuestionMonthKey(question, null) === monthKey : true))
    .sort((a, b) => receivedAtMs(b) - receivedAtMs(a))
}

export function selectTrackedQuestions(questions = [], { monthKey = null, filter = 'All', nowMs = Date.now() } = {}) {
  return selectActiveQuestionsForMonth(questions, { monthKey, nowMs })
    .filter((question) => matchesLifecycleFilter(question, filter, nowMs))
}

export function countLifecycleFilters(questions = [], { monthKey = null, nowMs = Date.now() } = {}) {
  const active = selectActiveQuestionsForMonth(questions, { monthKey, nowMs })
  const counts = { All: active.length, [STAGE_WAITING]: 0, [STAGE_ANSWERED]: 0, [STAGE_DISPUTED]: 0, [STAGE_RESOLVED]: 0 }
  LIFECYCLE_FILTERS.forEach((filter) => {
    if (filter === 'All') return
    counts[filter] += active.filter((question) => matchesLifecycleFilter(question, filter, nowMs)).length
  })
  return counts
}

// History owns everything that is finished. Used by the user History screen so a
// question can never appear in both places.
export function selectCompletedQuestions(questions = [], nowMs = Date.now()) {
  return questions
    .filter((question) => isQuestionCompleted(question, nowMs))
    .sort((a, b) => receivedAtMs(b) - receivedAtMs(a))
}

export { ANSWER_DEADLINE_DAYS }