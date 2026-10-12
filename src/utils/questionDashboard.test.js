import { describe, expect, it } from 'vitest'
import {
  DISPUTE_STAGES,
  HISTORY_ALL_MONTHS,
  HISTORY_STATUS_FILTERS,
  countDisputeStages,
  countHistoryStatuses,
  getDisputeStage,
  getHistoryMonthOptions,
  getHistoryStatusLabel,
  getUserDisputes,
  getUserQuestions,
  getUserQuestionHistory,
  isHistoryCancelled,
  isHistoryCompleted,
  isQuestionOwnedByUser,
  matchesHistoryStatusFilter,
} from './questionDashboard.js'

const NOW = new Date('2026-09-15T12:00:00.000Z')

const USER = { id: 'user-demo', email: 'user@astroconnect.com', role: 'user' }

function makeQuestion(overrides = {}) {
  return {
    id: 'QTN-2026-000001',
    submittedByUserId: USER.id,
    submittedByEmail: USER.email,
    category: 'Career',
    type: 'General',
    status: 'Pending',
    question: 'Will my interview go well?',
    campaignName: 'Career Campaign',
    purchaseType: 'Free',
    purchaseAmount: 0,
    dispute: null,
    raisedAt: '2026-09-10T10:30:00.000Z',
    ...overrides,
  }
}

describe('question ownership', () => {
  it('matches a question by user id or email', () => {
    expect(isQuestionOwnedByUser(makeQuestion(), USER)).toBe(true)
    expect(isQuestionOwnedByUser(makeQuestion({ submittedByUserId: '', submittedByEmail: 'user@astroconnect.com' }), USER)).toBe(true)
  })

  it('rejects another user and a missing user', () => {
    expect(isQuestionOwnedByUser(makeQuestion({ submittedByUserId: 'user-other', submittedByEmail: 'other@astroconnect.com' }), USER)).toBe(false)
    expect(isQuestionOwnedByUser(makeQuestion(), null)).toBe(false)
  })

  it('sorts the user questions newest first', () => {
    const questions = [
      makeQuestion({ id: 'old', raisedAt: '2026-09-01T10:00:00.000Z' }),
      makeQuestion({ id: 'new', raisedAt: '2026-09-12T10:00:00.000Z' }),
    ]
    expect(getUserQuestions(questions, USER).map((question) => question.id)).toEqual(['new', 'old'])
  })
})

describe('history archive', () => {
  it('returns every finished question with no date window', () => {
    const questions = [
      makeQuestion({ id: 'answered', status: 'Answered', answer: 'A', raisedAt: '2026-09-01T10:00:00.000Z' }),
      makeQuestion({ id: 'cancelled', status: 'Cancelled', raisedAt: '2026-08-05T10:00:00.000Z' }),
      makeQuestion({ id: 'answered-old', status: 'Answered', answer: 'A', raisedAt: '2024-01-05T10:00:00.000Z' }),
      makeQuestion({ id: 'active-pending', status: 'Pending', raisedAt: '2026-09-14T10:00:00.000Z' }),
      makeQuestion({ id: 'someone-else', submittedByUserId: 'user-other', submittedByEmail: 'other@astroconnect.com', status: 'Answered', answer: 'A' }),
    ]
    expect(getUserQuestionHistory(questions, USER, { nowMs: NOW }).map((question) => question.id))
      .toEqual(['answered', 'cancelled', 'answered-old'])
  })

  it('treats an expired unanswered question as a finished record', () => {
    const expired = makeQuestion({ status: 'Pending', raisedAt: '2020-01-01T10:00:00.000Z' })
    expect(getUserQuestionHistory([expired], USER, { nowMs: NOW }).map((question) => question.id)).toEqual([expired.id])
    expect(isHistoryCancelled(expired, NOW)).toBe(true)
    expect(getHistoryStatusLabel(expired, NOW)).toBe('Cancelled')
  })

  it('keeps an answered question with a resolved dispute in Completed history', () => {
    // Answered by the astrologer, disputed, then resolved - but the older record
    // never promoted its own status to "Resolved".
    const resolvedDispute = makeQuestion({
      id: 'answered-disputed-resolved',
      status: 'Answered',
      answer: 'A',
      refundStatus: 'None',
      refundAmount: 0,
      dispute: { status: 'Resolved', response: 'Revised the answer.', resolvedAt: '2026-09-12T10:00:00.000Z' },
      raisedAt: '2026-09-01T10:00:00.000Z',
    })
    expect(isHistoryCompleted(resolvedDispute, NOW)).toBe(true)
    expect(getUserQuestionHistory([resolvedDispute], USER, { nowMs: NOW }).map((q) => q.id))
      .toEqual(['answered-disputed-resolved'])
    expect(matchesHistoryStatusFilter(resolvedDispute, 'Completed', NOW)).toBe(true)
    expect(matchesHistoryStatusFilter(resolvedDispute, 'Cancelled', NOW)).toBe(false)
    expect(getHistoryStatusLabel(resolvedDispute, NOW)).toBe('Resolved')
  })

  it('does not treat an open dispute or a refund as completion or cancellation', () => {
    const openDispute = makeQuestion({
      status: 'Answered',
      answer: 'A',
      dispute: { status: 'Open', response: '' },
    })
    expect(isHistoryCompleted(openDispute, NOW)).toBe(false)

    // Refunded but not cancelled: still a completed record, never Cancelled.
    const refundedCompleted = makeQuestion({
      id: 'refunded-completed',
      status: 'Answered',
      answer: 'A',
      refundStatus: 'Refunded',
      refundAmount: 200,
      raisedAt: '2026-09-01T10:00:00.000Z',
    })
    expect(isHistoryCompleted(refundedCompleted, NOW)).toBe(true)
    expect(matchesHistoryStatusFilter(refundedCompleted, 'Cancelled', NOW)).toBe(false)

    const cancelledRefunded = makeQuestion({ status: 'Cancelled', refundStatus: 'Refunded', refundAmount: 799 })
    expect(isHistoryCompleted(cancelledRefunded, NOW)).toBe(false)
    expect(matchesHistoryStatusFilter(cancelledRefunded, 'Cancelled', NOW)).toBe(true)
  })

  it('offers the current month alongside every archived month', () => {
    const history = [
      makeQuestion({ id: 'sep', status: 'Answered', answer: 'A', raisedAt: '2026-09-01T10:00:00.000Z' }),
      makeQuestion({ id: 'jul', status: 'Answered', answer: 'A', raisedAt: '2026-07-01T10:00:00.000Z' }),
    ]
    expect(getHistoryMonthOptions(history, { now: NOW })).toEqual(['2026-09', '2026-07'])
    expect(getHistoryMonthOptions(history, { now: new Date('2026-10-05T12:00:00.000Z') }))
      .toEqual(['2026-10', '2026-09', '2026-07'])
  })
})

describe('history status buckets', () => {
  it('maps finished records onto Completed and Cancelled', () => {
    expect(matchesHistoryStatusFilter({ status: 'Answered', answer: 'A' }, 'Completed', NOW)).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Resolved', answer: 'A' }, 'Completed', NOW)).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Closed' }, 'Cancelled', NOW)).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Cancelled' }, 'Cancelled', NOW)).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Answered', answer: 'A' }, 'Cancelled', NOW)).toBe(false)
    expect(matchesHistoryStatusFilter({ status: 'Pending', raisedAt: '2020-01-01T00:00:00.000Z' }, 'Cancelled', NOW)).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Answered', answer: 'A' }, 'All', NOW)).toBe(true)
  })

  it('counts Completed and Cancelled including the all total', () => {
    const questions = [
      makeQuestion({ id: 'completed', status: 'Answered', answer: 'A' }),
      makeQuestion({ id: 'cancelled', status: 'Cancelled' }),
      makeQuestion({ id: 'closed', status: 'Closed' }),
    ]
    expect(countHistoryStatuses(questions, { nowMs: NOW })).toEqual({ All: 3, Completed: 1, Cancelled: 2 })
    expect(HISTORY_STATUS_FILTERS).toEqual(['All', 'Completed', 'Cancelled'])
    expect(HISTORY_ALL_MONTHS).toBe('all')
  })
})

describe('dispute stages', () => {
  it('derives the stage from the stored dispute', () => {
    expect(getDisputeStage(makeQuestion({ dispute: { status: 'Open', response: '' } }))).toBe('Open')
    expect(getDisputeStage(makeQuestion({ dispute: { status: 'Open', response: 'Clarified with the chart.' } }))).toBe('Under Review')
    expect(getDisputeStage(makeQuestion({ dispute: { status: 'Resolved', response: 'Done' } }))).toBe('Resolved')
    expect(getDisputeStage(makeQuestion({ dispute: { status: 'Closed', response: '' } }))).toBe('Closed')
    expect(getDisputeStage(makeQuestion())).toBe(null)
  })

  it('collects only the user questions that carry a dispute', () => {
    const questions = [
      makeQuestion({ id: 'with-dispute', dispute: { status: 'Open', response: '' } }),
      makeQuestion({ id: 'without-dispute' }),
      makeQuestion({ id: 'someone-else', submittedByUserId: 'user-other', submittedByEmail: 'other@astroconnect.com', dispute: { status: 'Open' } }),
    ]
    const disputes = getUserDisputes(questions, USER)
    expect(disputes.map((entry) => entry.question.id)).toEqual(['with-dispute'])
    expect(disputes[0].stage).toBe('Open')
  })

  it('counts each stage for the summary cards', () => {
    const disputes = [
      { stage: 'Open' },
      { stage: 'Open' },
      { stage: 'Under Review' },
      { stage: 'Resolved' },
      { stage: 'Closed' },
    ]
    expect(countDisputeStages(disputes)).toEqual({ All: 5, Open: 2, 'Under Review': 1, Resolved: 1, Closed: 1 })
    expect(DISPUTE_STAGES).toEqual(['All', 'Open', 'Under Review', 'Resolved', 'Closed'])
  })
})