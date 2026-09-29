import { describe, expect, it } from 'vitest'
import {
  ANSWER_CHAR_LIMIT,
  ANSWER_DEADLINE_DAYS,
  ANSWER_DEADLINE_MS,
  ANSWER_EDIT_WINDOW_MS,
  ATTACHMENT_MAX_BYTES,
  applyAnswerEdit,
  applyAnswerSubmit,
  applyQuestionDraft,
  canEditQuestionAnswer,
  DUE_SOON_WINDOW_MS,
  filterAnswerQuestions,
  formatAnswerDate,
  formatFileSize,
  getAnswerDeadlineLabel,
  getAnswerEditUntilMs,
  getAnswerEditWindowLabel,
  getAnswerSummary,
  getQuestionAnswerDeadline,
  getQuestionDueState,
  getQuestionReceivedAt,
  getQuestionTypeLabel,
  hasOpenDispute,
  isQuestionAnswered,
  isQuestionNeedingAnswer,
  sortAnswerQuestionsFifo,
  sortAnswerQueue,
  validateAttachmentFile,
  validateReferenceLink,
} from './answer.js'

const DAY = 24 * 60 * 60 * 1000
const NOW_MS = Date.UTC(2026, 8, 23, 12, 0, 0)

function makeQuestion(overrides = {}) {
  return {
    id: 'QTN-2026-001249',
    user: 'Kannan',
    userId: 'customer-kannan',
    submittedByUserId: 'user-demo',
    category: 'Career',
    type: 'General',
    status: 'Pending',
    priority: 'High',
    campaignId: 'vip-subscribers',
    campaignName: 'VIP Subscribers',
    question: 'Should I switch jobs this month?',
    answer: '',
    draftAnswer: '',
    raisedAt: new Date(NOW_MS - 5 * DAY).toISOString(),
    dispute: null,
    history: [],
    ...overrides,
  }
}

function raisedDaysAgo(days) {
  return new Date(NOW_MS - days * DAY).toISOString()
}

describe('getQuestionReceivedAt', () => {
  it('resolves from receivedAt', () => {
    expect(getQuestionReceivedAt(makeQuestion({ receivedAt: raisedDaysAgo(2) })).getTime()).toBe(NOW_MS - 2 * DAY)
  })

  it('falls back to raisedAt when receivedAt is missing', () => {
    const question = makeQuestion({ receivedAt: null, raisedAt: raisedDaysAgo(3) })
    expect(getQuestionReceivedAt(question).getTime()).toBe(NOW_MS - 3 * DAY)
  })

  it('falls back to the display raised string', () => {
    const question = makeQuestion({ receivedAt: null, raisedAt: null, submittedAt: null, raised: '21-Jul-2026 10:30 AM' })
    const received = getQuestionReceivedAt(question)
    expect(received).not.toBeNull()
    expect(getQuestionAnswerDeadline(question).getTime() - received.getTime()).toBe(ANSWER_DEADLINE_MS)
  })

  it('returns null when no usable timestamp exists', () => {
    expect(getQuestionReceivedAt({ id: 'QTN-x', raised: 'Just now' })).toBeNull()
    expect(getQuestionReceivedAt({})).toBeNull()
  })
})

describe('getQuestionAnswerDeadline', () => {
  it('is received time plus 30 days for General questions', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(0) })
    expect(getQuestionAnswerDeadline(question).getTime()).toBe(NOW_MS + 30 * DAY)
  })

  it('uses the same 30-day deadline for Personal questions', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(0), type: 'Personal' })
    expect(getQuestionAnswerDeadline(question).getTime()).toBe(NOW_MS + 30 * DAY)
  })

  it('ignores campaign month boundaries (25 Sep -> 25 Oct)', () => {
    const receivedAt = '2026-09-25T10:00:00+05:30'
    const question = makeQuestion({ receivedAt })
    const deadline = getQuestionAnswerDeadline(question)
    const expected = new Date(receivedAt).getTime() + ANSWER_DEADLINE_MS
    expect(deadline.getTime()).toBe(expected)
    expect(new Date(expected).toISOString().slice(0, 10)).toBe('2026-10-25')
  })

  it('returns null when the question has no received time', () => {
    expect(getQuestionAnswerDeadline({ id: 'QTN-x' })).toBeNull()
  })

  it('adds exactly 30 calendar days to any received date', () => {
    const examples = [
      ['2026-09-05', '2026-10-05'],
      ['2026-09-07', '2026-10-07'],
      ['2026-09-20', '2026-10-20'],
      ['2026-09-29', '2026-10-29'],
    ]
    for (const [received, expected] of examples) {
      const question = makeQuestion({ receivedAt: `${received}T10:00:00+05:30` })
      expect(getQuestionAnswerDeadline(question).toISOString().slice(0, 10)).toBe(expected)
    }
  })

  it('never ties the deadline to the received date or a campaign availability date', () => {
    const question = makeQuestion({ receivedAt: '2026-09-07T10:00:00+05:30', campaignId: 'vip-subscribers', campaignName: 'VIP Subscribers' })
    const deadline = getQuestionAnswerDeadline(question)
    expect(deadline.getTime() - new Date('2026-09-07T10:00:00+05:30').getTime()).toBe(ANSWER_DEADLINE_MS)
    expect(formatAnswerDate(deadline)).toMatch(/07 Oct 2026/)
  })

  it('shows remaining days from now to the corrected deadline (Sep 7 -> Oct 7)', () => {
    const question = makeQuestion({ receivedAt: '2026-09-07T10:00:00+05:30' })
    const now = new Date('2026-09-25T10:00:00+05:30').getTime()
    expect(getQuestionAnswerDeadline(question).toISOString().slice(0, 10)).toBe('2026-10-07')
    expect(getAnswerDeadlineLabel(question, now)).toEqual({ label: '12 days left', tone: 'pending', days: 12 })
  })

  it('marks Due Soon against the corrected 30-day deadline', () => {
    const question = makeQuestion({ receivedAt: '2026-09-25T10:00:00+05:30' })
    const now = new Date('2026-10-20T10:00:00+05:30').getTime()
    expect(getQuestionAnswerDeadline(question).toISOString().slice(0, 10)).toBe('2026-10-25')
    expect(getQuestionDueState(question, now)).toBe('dueSoon')
  })

  it('never marks a future deadline as Overdue', () => {
    const question = makeQuestion({ receivedAt: '2026-09-25T10:00:00+05:30' })
    const now = new Date('2026-09-30T10:00:00+05:30').getTime()
    expect(getQuestionDueState(question, now)).toBe('pending')
    expect(getAnswerDeadlineLabel(question, now).label).toBe('25 days left')
  })

  it('marks Overdue once the corrected deadline passes', () => {
    const question = makeQuestion({ receivedAt: '2026-09-07T10:00:00+05:30' })
    const now = new Date('2026-10-08T10:00:00+05:30').getTime()
    expect(getQuestionDueState(question, now)).toBe('overdue')
  })

  it('exports the 30-day deadline constant', () => {
    expect(ANSWER_DEADLINE_DAYS).toBe(30)
    expect(ANSWER_DEADLINE_MS).toBe(30 * DAY)
  })
})

describe('getQuestionDueState', () => {
  it('is pending when the deadline is far away', () => {
    expect(getQuestionDueState(makeQuestion({ receivedAt: raisedDaysAgo(5) }), NOW_MS)).toBe('pending')
  })

  it('is dueSoon exactly 7 days before the deadline', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(23) })
    expect(getQuestionDueState(question, NOW_MS)).toBe('dueSoon')
  })

  it('is still pending just past the 7-day due-soon window', () => {
    const question = makeQuestion({ receivedAt: new Date(NOW_MS - 23 * DAY + 1).toISOString() })
    expect(getQuestionDueState(question, NOW_MS)).toBe('pending')
  })

  it('is overdue after the deadline passes', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(31) })
    expect(getQuestionDueState(question, NOW_MS)).toBe('overdue')
  })

  it('is answered once an answer exists', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(40), status: 'Answered', answer: 'Yes, proceed.' })
    expect(getQuestionDueState(question, NOW_MS)).toBe('answered')
  })

  it('is answered even if the deadline passed long ago', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(60), answer: 'Yes.' })
    expect(getQuestionDueState(question, NOW_MS)).toBe('answered')
  })

  it('is disputed when an open dispute exists', () => {
    const question = makeQuestion({
      status: 'Disputed',
      answer: 'Original answer',
      dispute: { status: 'Open', reason: 'Too generic' },
    })
    expect(getQuestionDueState(question, NOW_MS)).toBe('disputed')
  })

  it('falls back to answered when the dispute is resolved', () => {
    const question = makeQuestion({
      status: 'Disputed',
      answer: 'Original answer',
      dispute: { status: 'Resolved', response: 'Clarified.' },
    })
    expect(getQuestionDueState(question, NOW_MS)).toBe('answered')
  })

  it('is closed for closed questions', () => {
    expect(getQuestionDueState(makeQuestion({ status: 'Closed' }), NOW_MS)).toBe('closed')
  })
})

describe('getAnswerDeadlineLabel', () => {
  it('shows remaining days for pending questions', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(5) })
    expect(getAnswerDeadlineLabel(question, NOW_MS)).toEqual({ label: '25 days left', tone: 'pending', days: 25 })
  })

  it('flags a 7-day-until deadline as due soon', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(23) })
    const label = getAnswerDeadlineLabel(question, NOW_MS)
    expect(label.label).toBe('7 days left')
    expect(label.tone).toBe('dueSoon')
  })

  it('shows overdue by the correct number of days', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(32) })
    expect(getAnswerDeadlineLabel(question, NOW_MS)).toEqual({ label: 'Overdue by 2 days', tone: 'overdue', days: -2 })
  })

  it('shows due today on the final day', () => {
    const question = makeQuestion({ receivedAt: raisedDaysAgo(30) })
    const label = getAnswerDeadlineLabel(question, NOW_MS)
    expect(label.label).toBe('Due today')
    expect(label.tone).toBe('dueSoon')
  })

  it('handles questions without a deadline', () => {
    expect(getAnswerDeadlineLabel({ id: 'QTN-x' }, NOW_MS).label).toBe('Deadline not set')
  })
})

describe('isQuestionAnswered / isQuestionNeedingAnswer / hasOpenDispute', () => {
  it('detects answered questions by status or answer text', () => {
    expect(isQuestionAnswered(makeQuestion({ status: 'Answered' }))).toBe(true)
    expect(isQuestionAnswered(makeQuestion({ answer: 'Your answer...' }))).toBe(true)
    expect(isQuestionAnswered(makeQuestion())).toBe(false)
  })

  it('flags questions that still need an answer', () => {
    expect(isQuestionNeedingAnswer(makeQuestion())).toBe(true)
    expect(isQuestionNeedingAnswer(makeQuestion({ status: 'In Progress', draftAnswer: 'Partial' }))).toBe(true)
    expect(isQuestionNeedingAnswer(makeQuestion({ status: 'Answered', answer: 'Done' }))).toBe(false)
    expect(isQuestionNeedingAnswer(makeQuestion({ status: 'Disputed', dispute: { status: 'Open' } }))).toBe(false)
    expect(isQuestionNeedingAnswer(makeQuestion({ status: 'Closed' }))).toBe(false)
  })

  it('distinguishes open and resolved disputes', () => {
    expect(hasOpenDispute(makeQuestion())).toBe(false)
    expect(hasOpenDispute(makeQuestion({ dispute: { status: 'Open' } }))).toBe(true)
    expect(hasOpenDispute(makeQuestion({ dispute: { status: 'Resolved' } }))).toBe(false)
  })
})

describe('FIFO ordering', () => {
  it('sorts oldest received-first for the queue', () => {
    const older = makeQuestion({ id: 'QTN-2026-001251', receivedAt: raisedDaysAgo(20) })
    const middle = makeQuestion({ id: 'QTN-2026-001252', receivedAt: raisedDaysAgo(10) })
    const newest = makeQuestion({ id: 'QTN-2026-001253', receivedAt: raisedDaysAgo(2) })
    expect(sortAnswerQuestionsFifo([newest, older, middle]).map((q) => q.id)).toEqual(['QTN-2026-001251', 'QTN-2026-001252', 'QTN-2026-001253'])
  })

  it('places questions without a timestamp at the end of the FIFO queue', () => {
    const dated = makeQuestion({ id: 'QTN-A', receivedAt: raisedDaysAgo(1) })
    const undated = makeQuestion({ id: 'QTN-B', receivedAt: null, raisedAt: null, submittedAt: null })
    expect(sortAnswerQuestionsFifo([undated, dated]).map((q) => q.id)).toEqual(['QTN-A', 'QTN-B'])
  })

  it('ranks unanswered questions first (FIFO) before answered ones', () => {
    const pendingOld = makeQuestion({ id: 'QTN-P1', receivedAt: raisedDaysAgo(30) })
    const pendingNew = makeQuestion({ id: 'QTN-P2', receivedAt: raisedDaysAgo(1) })
    const answered = makeQuestion({ id: 'QTN-A1', receivedAt: raisedDaysAgo(2), status: 'Answered', answer: 'Ok' })
    const disputed = makeQuestion({ id: 'QTN-D1', receivedAt: raisedDaysAgo(4), status: 'Disputed', dispute: { status: 'Open' } })
    const ordered = sortAnswerQueue([answered, disputed, pendingNew, pendingOld]).map((q) => q.id)
    expect(ordered).toEqual(['QTN-P1', 'QTN-P2', 'QTN-A1', 'QTN-D1'])
  })
})

describe('filterAnswerQuestions', () => {
  const questions = [
    makeQuestion({ id: 'Q1', type: 'General', receivedAt: raisedDaysAgo(23), status: 'Pending' }),
    makeQuestion({ id: 'Q2', type: 'Personal', receivedAt: raisedDaysAgo(31), status: 'Pending' }),
    makeQuestion({ id: 'Q3', type: 'General', receivedAt: raisedDaysAgo(2), status: 'Answered', answer: 'Done' }),
  ]

  it('filters by question type', () => {
    expect(filterAnswerQuestions(questions, { type: 'General' }, NOW_MS).map((q) => q.id)).toEqual(['Q1', 'Q3'])
    expect(filterAnswerQuestions(questions, { type: 'Personal' }, NOW_MS).map((q) => q.id)).toEqual(['Q2'])
  })

  it('filters by due state', () => {
    expect(filterAnswerQuestions(questions, { due: 'dueSoon' }, NOW_MS).map((q) => q.id)).toEqual(['Q1'])
    expect(filterAnswerQuestions(questions, { due: 'overdue' }, NOW_MS).map((q) => q.id)).toEqual(['Q2'])
    expect(filterAnswerQuestions(questions, { due: 'answered' }, NOW_MS).map((q) => q.id)).toEqual(['Q3'])
  })

  it('matches search across id, user, and wording', () => {
    expect(filterAnswerQuestions(questions, { search: 'Q1' }, NOW_MS).map((q) => q.id)).toEqual(['Q1'])
    expect(filterAnswerQuestions(questions, { search: 'kannan' }, NOW_MS).map((q) => q.id)).toEqual(['Q1', 'Q2', 'Q3'])
    expect(filterAnswerQuestions(questions, { search: 'switch jobs' }, NOW_MS).map((q) => q.id)).toEqual(['Q1', 'Q2', 'Q3'])
    expect(filterAnswerQuestions(questions, { search: 'no-such-term' }, NOW_MS)).toEqual([])
  })

  it('returns everything when filtered by All', () => {
    expect(filterAnswerQuestions(questions, {}, NOW_MS).map((q) => q.id)).toEqual(['Q1', 'Q2', 'Q3'])
  })
})

describe('filterAnswerQuestions pending buckets', () => {
  const questions = [
    makeQuestion({ id: 'GP-OUT', type: 'General', receivedAt: raisedDaysAgo(10) }),
    makeQuestion({ id: 'GP-SOON', type: 'General', receivedAt: raisedDaysAgo(25) }),
    makeQuestion({ id: 'PP-OUT', type: 'Personal', receivedAt: raisedDaysAgo(10) }),
    makeQuestion({ id: 'PP-OVER', type: 'Personal', receivedAt: raisedDaysAgo(31) }),
    makeQuestion({ id: 'ANS', type: 'General', receivedAt: raisedDaysAgo(2), status: 'Answered', answer: 'Done' }),
    makeQuestion({ id: 'DISP', type: 'General', status: 'Disputed', dispute: { status: 'Open' } }),
  ]

  it('Pending is the combined needing-answer queue across both question types', () => {
    expect(filterAnswerQuestions(questions, { due: 'pending' }, NOW_MS).map((q) => q.id)).toEqual(['GP-OUT', 'GP-SOON', 'PP-OUT', 'PP-OVER'])
  })

  it('General Pending shows only General questions that need an answer', () => {
    expect(filterAnswerQuestions(questions, { due: 'generalPending' }, NOW_MS).map((q) => q.id)).toEqual(['GP-OUT', 'GP-SOON'])
  })

  it('Personal Pending shows only Personal questions that need an answer', () => {
    expect(filterAnswerQuestions(questions, { due: 'personalPending' }, NOW_MS).map((q) => q.id)).toEqual(['PP-OUT', 'PP-OVER'])
  })

  it('every pending bucket excludes answered and disputed questions', () => {
    for (const due of ['pending', 'generalPending', 'personalPending']) {
      const ids = filterAnswerQuestions(questions, { due }, NOW_MS).map((q) => q.id)
      expect(ids).not.toContain('ANS')
      expect(ids).not.toContain('DISP')
    }
  })

  it('pending buckets survive an explicit type filter without double counting', () => {
    expect(filterAnswerQuestions(questions, { type: 'General', due: 'pending' }, NOW_MS).length).toBe(2)
    expect(filterAnswerQuestions(questions, { type: 'Personal', due: 'pending' }, NOW_MS).length).toBe(2)
  })
})

describe('getAnswerSummary', () => {
  it('counts pending by type plus due soon, overdue, answered and disputed', () => {
    const questions = [
      makeQuestion({ id: 'G1', type: 'General', receivedAt: raisedDaysAgo(5) }),
      makeQuestion({ id: 'G2', type: 'General', receivedAt: raisedDaysAgo(23) }),
      makeQuestion({ id: 'P1', type: 'Personal', receivedAt: raisedDaysAgo(10) }),
      makeQuestion({ id: 'P2', type: 'Personal', receivedAt: raisedDaysAgo(31) }),
      makeQuestion({ id: 'A1', status: 'Answered', answer: 'Done' }),
      makeQuestion({ id: 'D1', status: 'Disputed', dispute: { status: 'Open' } }),
    ]
    const summary = getAnswerSummary(questions, NOW_MS)
    expect(summary.generalPending).toBe(2)
    expect(summary.personalPending).toBe(2)
    expect(summary.pending).toBe(4)
    expect(summary.pending).toBe(summary.generalPending + summary.personalPending)
    expect(summary.dueSoon).toBe(1)
    expect(summary.overdue).toBe(1)
    expect(summary.answered).toBe(1)
    expect(summary.disputed).toBe(1)
    expect(summary.needsAnswer).toBe(4)
    expect(summary.total).toBe(6)
  })

  it('Pending is the combined General + Personal pending queue (6 general + 5 personal = 11)', () => {
    const general = Array.from({ length: 6 }, (_, index) => makeQuestion({ id: `G-P-${index}`, type: 'General', receivedAt: raisedDaysAgo(5 + index) }))
    const personal = Array.from({ length: 5 }, (_, index) => makeQuestion({ id: `P-P-${index}`, type: 'Personal', receivedAt: raisedDaysAgo(8 + index) }))
    const mix = [...general, ...personal, makeQuestion({ id: 'ANSWERED', type: 'General', status: 'Answered', answer: 'Done' })]
    const summary = getAnswerSummary(mix, NOW_MS)
    expect(summary.generalPending).toBe(6)
    expect(summary.personalPending).toBe(5)
    expect(summary.pending).toBe(11)
    expect(filterAnswerQuestions(mix, { due: 'pending' }, NOW_MS)).toHaveLength(11)
    expect(filterAnswerQuestions(mix, { due: 'generalPending' }, NOW_MS)).toHaveLength(6)
    expect(filterAnswerQuestions(mix, { due: 'personalPending' }, NOW_MS)).toHaveLength(5)
  })
})

describe('answer lifecycle reducers', () => {
  it('saves a draft as In Progress without answering', () => {
    const question = makeQuestion()
    const updated = applyQuestionDraft(question, 'Let me review your transits first.')
    expect(updated.status).toBe('In Progress')
    expect(updated.draftAnswer).toBe('Let me review your transits first.')
    expect(updated.answer).toBe('')
    expect(updated.history).toContain('Draft saved')
  })

  it('refuses to draft on an answered question', () => {
    const question = makeQuestion({ status: 'Answered', answer: 'Done' })
    expect(applyQuestionDraft(question, 'x')).toBe(question)
  })

  it('submits an answer directly as Answered (never Under Review)', () => {
    const question = makeQuestion({ status: 'Pending' })
    const updated = applyAnswerSubmit(question, 'Yes, this is a good month to move.', NOW_MS)
    expect(updated.status).toBe('Answered')
    expect(updated.status).not.toBe('Under Review')
    expect(updated.answer).toBe('Yes, this is a good month to move.')
    expect(updated.draftAnswer).toBe('')
    expect(updated.answeredAt).toBe(new Date(NOW_MS).toISOString())
    expect(updated.answerDeliveredAt).toBe(NOW_MS)
    expect(updated.answerEditUntil).toBe(NOW_MS + ANSWER_EDIT_WINDOW_MS)
    expect(updated.answerReviewUntil).toBeNull()
    expect(updated.history).toContain('Answer submitted to user')
  })

  it('opens a 24-hour edit window from submission', () => {
    const question = applyAnswerSubmit(makeQuestion(), 'Answer A', NOW_MS)
    expect(getAnswerEditUntilMs(question)).toBe(NOW_MS + 24 * 60 * 60 * 1000)
  })

  it('allows editing within 24 hours of submission', () => {
    const question = applyAnswerSubmit(makeQuestion(), 'Answer A', NOW_MS)
    const edited = applyAnswerEdit(question, 'Answer A improved', NOW_MS + 60 * 60 * 1000)
    expect(edited.answer).toBe('Answer A improved')
    expect(edited.answerEditUsed).toBe(true)
    expect(edited.history).toContain('Answer corrected')
  })

  it('blocks editing 24 hours after submission', () => {
    const question = applyAnswerSubmit(makeQuestion(), 'Answer A', NOW_MS)
    expect(canEditQuestionAnswer(question, NOW_MS + 24 * 60 * 60 * 1000)).toBe(false)
    const edited = applyAnswerEdit(question, 'Late edit', NOW_MS + 24 * 60 * 60 * 1000 + 1)
    expect(edited).toBe(question)
  })

  it('blocks editing for unanswered or disputed questions', () => {
    expect(canEditQuestionAnswer(makeQuestion(), NOW_MS)).toBe(false)
    const disputed = { ...makeQuestion({ status: 'Disputed', dispute: { status: 'Open' } }), answer: 'A', answeredAt: new Date(NOW_MS).toISOString() }
    expect(canEditQuestionAnswer(disputed, NOW_MS)).toBe(false)
  })

  it('exposes the remaining edit window as a label', () => {
    const question = applyAnswerSubmit(makeQuestion(), 'A', NOW_MS)
    expect(getAnswerEditWindowLabel(question, NOW_MS).label).toBe('Editable for 24 hours')
    expect(getAnswerEditWindowLabel(question, NOW_MS + 24 * 60 * 60 * 1000).label).toBe('Answer locked')
  })
})

describe('formatFileSize', () => {
  it('formats bytes into readable values', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(850 * 1024)).toBe('850 KB')
    expect(formatFileSize(1.2 * 1024 * 1024)).toBe('1.2 MB')
    expect(formatFileSize(ATTACHMENT_MAX_BYTES)).toBe('5 MB')
  })

  it('guards invalid input', () => {
    expect(formatFileSize(undefined)).toBe('0 B')
    expect(formatFileSize(-5)).toBe('0 B')
  })
})

describe('validateAttachmentFile', () => {
  it('accepts PDF files', () => {
    const result = validateAttachmentFile({ name: 'Remedy_Guidelines.pdf', type: 'application/pdf', size: 1024 }, 'pdf')
    expect(result.ok).toBe(true)
  })

  it('accepts PDF files where the browser reports an empty MIME type', () => {
    const result = validateAttachmentFile({ name: 'Remedy_Guidelines.pdf', type: '', size: 1024 }, 'pdf')
    expect(result.ok).toBe(true)
  })

  it('rejects non-PDF files', () => {
    const result = validateAttachmentFile({ name: 'notes.txt', type: 'text/plain', size: 1024 }, 'pdf')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/PDF/i)
  })

  it('accepts JPG, PNG, and WEBP images', () => {
    for (const name of ['pooja.jpg', 'pooja.jpeg', 'pooja.png', 'pooja.webp']) {
      const ext = name.split('.').pop()
      const type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext]
      expect(validateAttachmentFile({ name, type, size: 1024 }, 'image').ok).toBe(true)
    }
  })

  it('rejects unsupported image formats', () => {
    const result = validateAttachmentFile({ name: 'photo.gif', type: 'image/gif', size: 1024 }, 'image')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/JPG, PNG, or WEBP/i)
  })

  it('rejects an uploaded PDF from the image uploader', () => {
    expect(validateAttachmentFile({ name: 'file.pdf', type: 'application/pdf', size: 1024 }, 'image').ok).toBe(false)
  })

  it('rejects files over the size limit with a clear message', () => {
    const result = validateAttachmentFile({ name: 'big.pdf', type: 'application/pdf', size: ATTACHMENT_MAX_BYTES + 1 }, 'pdf')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/too large/i)
    expect(result.error).toMatch(/5 MB/i)
  })

  it('handles missing files', () => {
    expect(validateAttachmentFile(null, 'pdf').ok).toBe(false)
  })
})

describe('validateReferenceLink', () => {
  it('accepts http and https links', () => {
    expect(validateReferenceLink('https://youtube.com/watch?v=abc').ok).toBe(true)
    expect(validateReferenceLink('http://example.com/remedy').ok).toBe(true)
  })

  it('rejects empty links', () => {
    expect(validateReferenceLink('').ok).toBe(false)
    expect(validateReferenceLink('   ').ok).toBe(false)
  })

  it('rejects invalid and unsafe schemes', () => {
    expect(validateReferenceLink('ftp://example.com/file').ok).toBe(false)
    expect(validateReferenceLink('javascript:alert(1)').ok).toBe(false)
  })

  it('rejects structurally invalid URLs', () => {
    expect(validateReferenceLink('not a url').ok).toBe(false)
    expect(validateReferenceLink('https://localhost').ok).toBe(false)
  })
})

describe('answer attachments in the lifecycle', () => {
  const attachments = [
    { id: 'a1', kind: 'pdf', name: 'Remedy_Guidelines.pdf', size: 1024, type: 'application/pdf', dataUrl: 'data:application/pdf;base64,AAA' },
    { id: 'a2', kind: 'image', name: 'pooja_steps.png', size: 2048, type: 'image/png', dataUrl: 'data:image/png;base64,BBB' },
  ]
  const links = [{ id: 'l1', url: 'https://example.com/guide', title: 'Pooja Reference Guide' }]

  it('saves draft attachments and reference links alongside the draft', () => {
    const updated = applyQuestionDraft(makeQuestion(), 'Draft text', attachments, links)
    expect(updated.status).toBe('In Progress')
    expect(updated.draftAnswer).toBe('Draft text')
    expect(updated.draftAttachments).toEqual(attachments)
    expect(updated.draftReferenceLinks).toEqual(links)
  })

  it('moves attachments and links into the submitted answer and clears the draft copies', () => {
    const withDraft = applyQuestionDraft(makeQuestion(), 'Draft', attachments, links)
    const updated = applyAnswerSubmit(withDraft, 'Final answer', NOW_MS, attachments, links)
    expect(updated.answer).toBe('Final answer')
    expect(updated.answerAttachments).toEqual(attachments)
    expect(updated.referenceLinks).toEqual(links)
    expect(updated.draftAnswer).toBe('')
    expect(updated.draftAttachments).toEqual([])
    expect(updated.draftReferenceLinks).toEqual([])
  })

  it('ignores malformed attachment and link entries', () => {
    const updated = applyAnswerSubmit(
      makeQuestion(),
      'A',
      NOW_MS,
      [{ id: 'bad' }, null, attachments[0]],
      [{ id: 'nolink' }, links[0]],
    )
    expect(updated.answerAttachments).toEqual([attachments[0]])
    expect(updated.referenceLinks).toEqual([links[0]])
  })

  it('preserves and updates attachments within the 24-hour edit window', () => {
    const submitted = applyAnswerSubmit(makeQuestion(), 'A', NOW_MS, attachments, links)
    const nextLinks = [...links, { id: 'l2', url: 'https://example.com/video', title: 'Video' }]
    const edited = applyAnswerEdit(submitted, 'A improved', NOW_MS + 60 * 60 * 1000, [attachments[0]], nextLinks)
    expect(edited.answer).toBe('A improved')
    expect(edited.answerAttachments).toEqual([attachments[0]])
    expect(edited.referenceLinks).toEqual(nextLinks)
    expect(edited.answerEditUsed).toBe(true)
  })

  it('does not alter attachments when the edit window has closed', () => {
    const submitted = applyAnswerSubmit(makeQuestion(), 'A', NOW_MS, attachments, links)
    const edited = applyAnswerEdit(submitted, 'Late edit', NOW_MS + 25 * 60 * 60 * 1000, [], [])
    expect(edited).toBe(submitted)
  })
})

describe('labels and constants', () => {
  it('formats dates for display', () => {
    expect(formatAnswerDate('2026-10-25T10:00:00+05:30')).toMatch(/25 Oct 2026/)
  })

  it('resolves question type labels', () => {
    expect(getQuestionTypeLabel(makeQuestion({ type: 'General' }))).toBe('General')
    expect(getQuestionTypeLabel(makeQuestion({ type: 'Personal' }))).toBe('Personal')
    expect(getQuestionTypeLabel({ type: 'individual' })).toBe('Personal')
  })

  it('exports the fixed business constants', () => {
    expect(DUE_SOON_WINDOW_MS).toBe(7 * 24 * 60 * 60 * 1000)
    expect(ANSWER_EDIT_WINDOW_MS).toBe(24 * 60 * 60 * 1000)
    expect(ANSWER_CHAR_LIMIT).toBe(3000)
  })
})