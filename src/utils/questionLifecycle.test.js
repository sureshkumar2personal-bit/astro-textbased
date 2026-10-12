import { describe, expect, it } from 'vitest'
import {
  DISPUTE_WINDOW_DAYS,
  DISPUTE_WINDOW_MS,
  STAGE_ANSWERED,
  STAGE_COMPLETED,
  STAGE_DISPUTED,
  STAGE_RESOLVED,
  STAGE_WAITING,
  countLifecycleFilters,
  getDisputeDaysRemaining,
  getDisputeWindowLabel,
  getQuestionLifecycleStage,
  getQuestionRefundInfo,
  isDisputeWindowOpen,
  isQuestionActive,
  isQuestionCompleted,
  selectActiveQuestionsForMonth,
  selectCompletedQuestions,
  selectTrackedQuestions,
} from './questionLifecycle.js'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-20T10:00:00.000Z')

function question(overrides = {}) {
  return {
    id: 'QTN-1',
    submittedByUserId: 'user-demo',
    status: 'Pending',
    type: 'General',
    question: 'Will my interview go well?',
    raisedAt: '2026-10-05T10:00:00.000Z',
    submittedAt: '2026-10-05T10:00:00.000Z',
    answer: '',
    dispute: null,
    ...overrides,
  }
}

const answered = question({ status: 'Answered', answer: 'Yes, prepare well.', answeredAt: new Date(NOW - 2 * DAY_MS).toISOString() })
const answeredLongAgo = question({ id: 'QTN-2', status: 'Answered', answer: 'Done.', answeredAt: new Date(NOW - 20 * DAY_MS).toISOString() })
const disputed = question({ id: 'QTN-3', status: 'Disputed', answer: 'Answer', answeredAt: new Date(NOW - 3 * DAY_MS).toISOString(), dispute: { target: 'Astrologer', reason: 'Too generic', response: '', status: 'Open' } })
const resolvedNotPromoted = question({ id: 'QTN-4', status: 'Disputed', answer: 'Answer', answeredAt: new Date(NOW - 5 * DAY_MS).toISOString(), dispute: { status: 'Resolved', response: 'Clarified', resolution: 'Explained in detail', resolvedAt: new Date(NOW - DAY_MS).toISOString() } })
const resolvedPromoted = question({ id: 'QTN-5', status: 'Resolved', answer: 'Answer', answeredAt: new Date(NOW - 6 * DAY_MS).toISOString(), dispute: { status: 'Resolved', response: 'Clarified', resolution: 'Explained', resolvedAt: new Date(NOW - 2 * DAY_MS).toISOString() } })
const cancelled = question({ id: 'QTN-6', status: 'Cancelled', refundAmount: 250, refundStatus: 'Completed', cancellationReason: 'Answer deadline exceeded' })

describe('lifecycle stages', () => {
  it('Waiting for Answer while the astrologer has not answered', () => {
    expect(getQuestionLifecycleStage(question(), NOW)).toBe(STAGE_WAITING)
    expect(isQuestionActive(question(), NOW)).toBe(true)
  })

  it('Answered only while the 7-day dispute window is open', () => {
    expect(getQuestionLifecycleStage(answered, NOW)).toBe(STAGE_ANSWERED)
    expect(isDisputeWindowOpen(answered, NOW)).toBe(true)
    expect(getDisputeDaysRemaining(answered, NOW)).toBe(5)
    expect(getDisputeWindowLabel(answered, NOW)).toBe('5 days left to raise a dispute')
  })

  it('leaves Answered and completes once the dispute window closes', () => {
    expect(getQuestionLifecycleStage(answeredLongAgo, NOW)).toBe(STAGE_COMPLETED)
    expect(isDisputeWindowOpen(answeredLongAgo, NOW)).toBe(false)
    expect(getDisputeWindowLabel(answeredLongAgo, NOW)).toBe('0 days left to raise a dispute')
  })

  it('uses a 7-day window', () => {
    expect(DISPUTE_WINDOW_DAYS).toBe(7)
    const boundary = new Date(answered.answeredAt).getTime() + DISPUTE_WINDOW_MS
    expect(isDisputeWindowOpen(answered, boundary - 1)).toBe(true)
    expect(isDisputeWindowOpen(answered, boundary)).toBe(false)
  })

  it('Disputed while the dispute is open', () => {
    expect(getQuestionLifecycleStage(disputed, NOW)).toBe(STAGE_DISPUTED)
  })

  it('Resolved while a settled dispute has not closed the question yet', () => {
    expect(getQuestionLifecycleStage(resolvedNotPromoted, NOW)).toBe(STAGE_RESOLVED)
  })

  it('completes once the resolved question record is promoted', () => {
    expect(getQuestionLifecycleStage(resolvedPromoted, NOW)).toBe(STAGE_COMPLETED)
  })

  it('completes an auto-cancelled question and keeps its refund', () => {
    expect(getQuestionLifecycleStage(cancelled, NOW)).toBe(STAGE_COMPLETED)
    expect(getQuestionRefundInfo(cancelled)).toMatchObject({ amount: 250, status: 'Completed', reason: 'Answer deadline exceeded' })
  })

  it('completes a question whose 30-day answer deadline passed unanswered', () => {
    const stale = question({ id: 'QTN-7', raisedAt: '2026-07-01T10:00:00.000Z', submittedAt: '2026-07-01T10:00:00.000Z' })
    expect(getQuestionLifecycleStage(stale, NOW)).toBe(STAGE_COMPLETED)
  })

  it('returns null refund info when nothing was refunded', () => {
    expect(getQuestionRefundInfo(answered)).toBe(null)
  })
})

describe('month scoping', () => {
  const list = [
    question({ id: 'oct-waiting', raisedAt: '2026-10-02T10:00:00.000Z' }),
    question({ id: 'oct-answered', raisedAt: '2026-10-03T10:00:00.000Z', status: 'Answered', answer: 'Yes', answeredAt: new Date(NOW - DAY_MS).toISOString() }),
    // Raised in September, answered yesterday: still inside its dispute window.
    question({ id: 'sep-answered', raisedAt: '2026-09-25T10:00:00.000Z', status: 'Answered', answer: 'Yes', answeredAt: new Date(NOW - DAY_MS).toISOString() }),
    answeredLongAgo,
  ]

  it('All is scoped to the selected month, not all time', () => {
    const october = selectActiveQuestionsForMonth(list, { monthKey: '2026-10', nowMs: NOW })
    expect(october.map((item) => item.id)).toEqual(['oct-answered', 'oct-waiting'])
    const september = selectActiveQuestionsForMonth(list, { monthKey: '2026-09', nowMs: NOW })
    expect(september.map((item) => item.id)).toEqual(['sep-answered'])
  })

  it('never returns a completed question for any month', () => {
    const all = selectActiveQuestionsForMonth(list, { monthKey: null, nowMs: NOW })
    expect(all.map((item) => item.id)).not.toContain(answeredLongAgo.id)
  })
})

describe('lifecycle filters', () => {
  const list = [question({ id: 'q-waiting' }), answered, disputed, resolvedNotPromoted, resolvedPromoted, cancelled]

  it('each filter returns only its own stage', () => {
    expect(selectTrackedQuestions(list, { filter: STAGE_WAITING, nowMs: NOW }).map((q) => q.id)).toEqual(['q-waiting'])
    expect(selectTrackedQuestions(list, { filter: STAGE_ANSWERED, nowMs: NOW }).map((q) => q.id)).toEqual([answered.id])
    expect(selectTrackedQuestions(list, { filter: STAGE_DISPUTED, nowMs: NOW }).map((q) => q.id)).toEqual([disputed.id])
    expect(selectTrackedQuestions(list, { filter: STAGE_RESOLVED, nowMs: NOW }).map((q) => q.id)).toEqual([resolvedNotPromoted.id])
  })

  it('All contains every active question and nothing completed', () => {
    const all = selectTrackedQuestions(list, { filter: 'All', nowMs: NOW })
    expect(all.map((q) => q.id)).toEqual(['q-waiting', answered.id, disputed.id, resolvedNotPromoted.id])
  })

  it('counts every bucket', () => {
    expect(countLifecycleFilters(list, { nowMs: NOW })).toEqual({
      All: 4,
      'Waiting for Answer': 1,
      Answered: 1,
      Disputed: 1,
      Resolved: 1,
    })
  })
})

describe('Track My Questions and History never overlap', () => {
  const list = [question({ id: 'q1' }), answered, answeredLongAgo, disputed, resolvedNotPromoted, resolvedPromoted, cancelled]

  it('every question is in exactly one place', () => {
    const tracked = new Set(selectActiveQuestionsForMonth(list, { monthKey: null, nowMs: NOW }).map((q) => q.id))
    const completed = new Set(selectCompletedQuestions(list, NOW).map((q) => q.id))

    expect([...tracked].filter((id) => completed.has(id))).toEqual([])
    expect(tracked.size + completed.size).toBe(list.length)
    expect(completed.has(answeredLongAgo.id)).toBe(true)
    expect(completed.has(resolvedPromoted.id)).toBe(true)
    expect(completed.has(cancelled.id)).toBe(true)
    expect(tracked.has(answered.id)).toBe(true)
  })

  it('completes a record exactly once and never re-activates it', () => {
    const settled = { ...answeredLongAgo }
    expect(isQuestionCompleted(settled, NOW)).toBe(true)
    expect(isQuestionCompleted(settled, NOW + 30 * DAY_MS)).toBe(true)
  })
})