import { describe, expect, it } from 'vitest'
import {
  DISPUTE_STAGES,
  HISTORY_STATUS_FILTERS,
  QUESTION_HISTORY_MONTHS,
  countDisputeStages,
  countHistoryStatuses,
  getDisputeStage,
  getHistoryWindowStart,
  getUserDisputes,
  getUserQuestions,
  getUserQuestionHistory,
  isQuestionOwnedByUser,
  isWithinHistoryWindow,
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

describe('history window', () => {
  it('starts the window six months back at the start of that day', () => {
    expect(QUESTION_HISTORY_MONTHS).toBe(6)
    const start = getHistoryWindowStart(NOW)
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([2026, 2, 15, 0])
  })

  it('keeps questions inside the window and drops older ones', () => {
    expect(isWithinHistoryWindow(makeQuestion({ raisedAt: '2026-04-01T10:00:00.000Z' }), NOW)).toBe(true)
    expect(isWithinHistoryWindow(makeQuestion({ raisedAt: '2026-03-01T10:00:00.000Z' }), NOW)).toBe(false)
  })

  it('ignores questions with no usable date', () => {
    expect(isWithinHistoryWindow(makeQuestion({ raisedAt: '', submittedAt: '', receivedAt: '', raised: '' }), NOW)).toBe(false)
  })

  it('returns only the user questions inside the window', () => {
    const questions = [
      makeQuestion({ id: 'recent', raisedAt: '2026-09-01T10:00:00.000Z' }),
      makeQuestion({ id: 'ancient', raisedAt: '2025-01-01T10:00:00.000Z' }),
      makeQuestion({ id: 'someone-else', submittedByUserId: 'user-other', submittedByEmail: 'other@astroconnect.com' }),
    ]
    expect(getUserQuestionHistory(questions, USER, { now: NOW }).map((question) => question.id)).toEqual(['recent'])
  })
})

describe('history status buckets', () => {
  it('maps statuses onto the displayed filters', () => {
    expect(matchesHistoryStatusFilter({ status: 'Answered' }, 'Answered')).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Disputed' }, 'Disputed')).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Resolved' }, 'Resolved')).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Closed' }, 'Closed')).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Cancelled' }, 'Closed')).toBe(true)
    expect(matchesHistoryStatusFilter({ status: 'Answered' }, 'All')).toBe(true)
  })

  it('counts every bucket including the all total', () => {
    const questions = [
      makeQuestion({ status: 'Answered' }),
      makeQuestion({ status: 'Disputed' }),
      makeQuestion({ status: 'Resolved' }),
      makeQuestion({ status: 'Closed' }),
    ]
    expect(countHistoryStatuses(questions)).toEqual({ All: 4, Answered: 1, Disputed: 1, Resolved: 1, Closed: 1 })
    expect(HISTORY_STATUS_FILTERS).toHaveLength(5)
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