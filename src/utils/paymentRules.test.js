// Targeted verification of the compliance rules against the real seed data shapes.
// Runs the actual paymentRules.js + adminCompliance.js modules.
import { describe, expect, it } from 'vitest'
import {
  ANSWER_WINDOW_DAYS,
  ASTROLOGER_INACTIVITY_DAYS,
  DISPUTE_RESPONSE_WINDOW_DAYS,
  DISPUTE_STATUS_AWAITING_RESPONSE,
  DISPUTE_STATUS_OVERDUE,
  PAYMENT_STATE_DISPUTED,
  PAYMENT_STATE_HELD,
  PAYMENT_STATE_REFUND_PENDING,
  PAYMENT_STATE_REFUNDED,
  PAYMENT_STATE_RELEASE_ELIGIBLE,
  PAYMENT_STATE_RELEASED,
  addDaysIso,
  getAstrologerDormancy,
  getDisputeResponseDeadline,
  getQuestionPaidAmount,
  getQuestionPaymentState,
  isDisputeOverdue,
  isQuestionAwaitingAnswer,
  isQuestionDueSoon,
  isQuestionOverdue,
} from './paymentRules.js'
import {
  summariseCompliance,
  summariseHeldAmounts,
  summarisePendingRefunds,
} from './adminCompliance.js'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-03T12:00:00Z')
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString()

const base = { purchaseType: 'Paid', purchaseAmount: 250, refundAmount: 0, refundStatus: 'None', history: [] }

describe('rule 1 — the 30-day answer window', () => {
  it('uses a single 30-day definition', () => {
    expect(ANSWER_WINDOW_DAYS).toBe(30)
  })

  it('does not flag a question inside the window', () => {
    expect(isQuestionOverdue({ ...base, status: 'Pending', raisedAt: iso(10) }, NOW)).toBe(false)
    expect(isQuestionOverdue({ ...base, status: 'Pending', raisedAt: iso(29) }, NOW)).toBe(false)
  })

  it('flags a question past 30 days with no answer', () => {
    expect(isQuestionOverdue({ ...base, status: 'Pending', raisedAt: iso(31) }, NOW)).toBe(true)
    expect(isQuestionOverdue({ ...base, status: 'In Progress', raisedAt: iso(45) }, NOW)).toBe(true)
  })

  it('does not flag an answered, expired or disputed question', () => {
    expect(isQuestionOverdue({ ...base, status: 'Answered', raisedAt: iso(90) }, NOW)).toBe(false)
    expect(isQuestionOverdue({ ...base, status: 'Closed', raisedAt: iso(90) }, NOW)).toBe(false)
    expect(isQuestionOverdue({ ...base, status: 'Expired', raisedAt: iso(90) }, NOW)).toBe(false)
    expect(isQuestionOverdue({ ...base, status: 'Disputed', raisedAt: iso(90) }, NOW)).toBe(false)
    expect(isQuestionOverdue({ ...base, status: 'Expired', raisedAt: iso(31), expiredAt: iso(1) }, NOW)).toBe(false)
  })

  it('never expires a question whose answer text already exists', () => {
    // The dashboard's pre-existing rule: a delivered answer means handled, even if
    // the status has not caught up.
    expect(isQuestionAwaitingAnswer({ status: 'Pending', answer: 'Here is your reading.' })).toBe(false)
    expect(isQuestionOverdue({ ...base, status: 'Pending', answer: 'Delivered', raisedAt: iso(90) }, NOW)).toBe(false)
  })

  it('treats a draft answer as still outstanding', () => {
    expect(isQuestionAwaitingAnswer({ status: 'In Progress', answer: '', draftAnswer: 'half written' })).toBe(true)
    expect(isQuestionOverdue({ ...base, status: 'In Progress', draftAnswer: 'wip', raisedAt: iso(31) }, NOW)).toBe(true)
  })

  it('warns inside the final week but not before it', () => {
    expect(isQuestionDueSoon({ ...base, status: 'Pending', raisedAt: iso(26) }, NOW)).toBe(true)
    expect(isQuestionDueSoon({ ...base, status: 'Pending', raisedAt: iso(20) }, NOW)).toBe(false)
  })

  it('reports no deadline rather than guessing when there is no timestamp', () => {
    expect(isQuestionOverdue({ ...base, status: 'Pending' }, NOW)).toBe(false)
    expect(isQuestionDueSoon({ ...base, status: 'Pending' }, NOW)).toBe(false)
  })
})

describe('payment state vocabulary', () => {
  it('holds a paid unanswered question', () => {
    expect(getQuestionPaymentState({ ...base, status: 'Pending' })).toBe(PAYMENT_STATE_HELD)
  })

  it('marks an answered question release eligible', () => {
    expect(getQuestionPaymentState({ ...base, status: 'Answered' })).toBe(PAYMENT_STATE_RELEASE_ELIGIBLE)
  })

  it('keeps a disputed amount held as disputed', () => {
    expect(getQuestionPaymentState({ ...base, status: 'Disputed', dispute: { status: 'Open' } }))
      .toBe(PAYMENT_STATE_DISPUTED)
    expect(getQuestionPaymentState({ ...base, status: 'Disputed', dispute: { status: 'Overdue' } }))
      .toBe(PAYMENT_STATE_DISPUTED)
    expect(getQuestionPaymentState({ ...base, status: 'Disputed', dispute: { status: 'Awaiting Astrologer Response' } }))
      .toBe(PAYMENT_STATE_DISPUTED)
  })

  it('reports refund pending then refunded', () => {
    expect(getQuestionPaymentState({ ...base, status: 'Expired', refundStatus: 'Pending' }))
      .toBe(PAYMENT_STATE_REFUND_PENDING)
    expect(getQuestionPaymentState({ ...base, status: 'Closed', refundStatus: 'Completed', refundAmount: 250 }))
      .toBe(PAYMENT_STATE_REFUNDED)
  })

  it('reports released only when explicitly recorded', () => {
    expect(getQuestionPaymentState({ ...base, status: 'Closed', paymentState: PAYMENT_STATE_RELEASED }))
      .toBe(PAYMENT_STATE_RELEASED)
  })

  it('has no state for a question with no money attached', () => {
    expect(getQuestionPaymentState({ purchaseType: 'Free', status: 'Pending' })).toBeNull()
    expect(getQuestionPaymentState({ purchaseType: 'Paid', status: 'Pending' })).toBeNull()
    expect(getQuestionPaymentState({ purchaseType: 'Paid', purchaseAmount: 0, status: 'Pending' })).toBeNull()
  })

  it('never uses the word escrow', () => {
    expect(PAYMENT_STATE_DISPUTED).not.toMatch(/escrow/i)
  })
})

describe('rule 2 — the 7-day dispute response window', () => {
  it('uses a single 7-day definition', () => {
    expect(DISPUTE_RESPONSE_WINDOW_DAYS).toBe(7)
  })

  it('derives the deadline from raisedAt when none was stored', () => {
    const due = getDisputeResponseDeadline({ raisedAt: iso(3) })
    expect(Date.parse(due)).toBe(NOW - 3 * DAY + 7 * DAY)
  })

  it('prefers a stored deadline, e.g. one an admin request created', () => {
    const stored = '2026-12-25T00:00:00.000Z'
    expect(getDisputeResponseDeadline({ raisedAt: iso(3), responseDueAt: stored })).toBe(stored)
  })

  it('is not overdue inside the window', () => {
    expect(isDisputeOverdue({ status: 'Open', raisedAt: iso(3) }, NOW)).toBe(false)
  })

  it('is overdue past 7 days with no response', () => {
    expect(isDisputeOverdue({ status: 'Open', raisedAt: iso(8) }, NOW)).toBe(true)
    expect(isDisputeOverdue({ status: 'Awaiting Astrologer Response', raisedAt: iso(8) }, NOW)).toBe(true)
  })

  it('is never overdue once resolved or closed, however old', () => {
    expect(isDisputeOverdue({ status: 'Resolved', raisedAt: iso(400) }, NOW)).toBe(false)
    expect(isDisputeOverdue({ status: 'Closed', raisedAt: iso(400) }, NOW)).toBe(false)
  })

  it('does not award the dispute to either side when it goes overdue', () => {
    const overdue = { status: 'Open', raisedAt: iso(30) }
    // Elapsed time only changes the flag. The amount stays withheld, and the
    // payment state is still Disputed rather than released or refunded.
    expect(isDisputeOverdue(overdue, NOW)).toBe(true)
    expect(getQuestionPaymentState({ ...base, dispute: overdue })).toBe(PAYMENT_STATE_DISPUTED)
  })
})

describe('rule 3 — astrologer inactivity', () => {
  const log = [
    { astrologerId: 'a', createdAt: iso(3) },
    { astrologerId: 'b', createdAt: iso(12) },
    { astrologerId: 'c', createdAt: iso(1), },
  ]

  it('uses a single 10-day definition', () => {
    expect(ASTROLOGER_INACTIVITY_DAYS).toBe(10)
  })

  it('marks an astrologer dormant past the window', () => {
    expect(getAstrologerDormancy(log, 'b', NOW)).toEqual({
      known: true, isDormant: true, lastActivityAt: iso(12), daysSinceActivity: 12,
    })
  })

  it('does not mark a recently active astrologer dormant', () => {
    expect(getAstrologerDormancy(log, 'a', NOW).isDormant).toBe(false)
  })

  it('reports no data as unknown, never as dormant', () => {
    expect(getAstrologerDormancy(log, 'never-seen', NOW)).toEqual({
      known: false, isDormant: false, lastActivityAt: null, daysSinceActivity: null,
    })
  })

  it('takes the newest activity for an astrologer only', () => {
    expect(getAstrologerDormancy(log, 'a', NOW).daysSinceActivity).toBe(3)
  })
})

describe('sweep idempotence — no update loop', () => {
  // The compliance sweep runs from a useEffect whose dependency is the `actions` memo.
  // If a sweep rewrites a record on every pass, `questions` gets a new identity, the
  // memo recomputes, the effect re-runs, and the app spins forever
  // ("Maximum update depth exceeded"). Each sweep must therefore be a no-op once it
  // has done its work.
  const now = Date.now()
  const openDispute = { status: 'Open', raisedAt: iso(30) }

  it('reports an overdue dispute as overdue both before and after flagging', () => {
    // This is the crux: 'Overdue' stays in the awaiting-response set, because it must
    // keep showing in the admin queue. So isDisputeOverdue() cannot by itself tell
    // "needs flagging" from "already flagged".
    expect(isDisputeOverdue(openDispute, now)).toBe(true)
    expect(isDisputeOverdue({ ...openDispute, status: DISPUTE_STATUS_OVERDUE }, now)).toBe(true)
  })

  it('leaves an already-flagged dispute untouched, so the sweep converges', () => {
    // Mirrors the guard in AppDataContext.flagOverdueDisputes.
    const alreadyFlagged = { ...openDispute, status: DISPUTE_STATUS_OVERDUE }
    const selected = [
      openDispute,
      alreadyFlagged,
    ].filter((dispute) => {
      if (String(dispute.status || '').trim() === DISPUTE_STATUS_OVERDUE) return false
      return isDisputeOverdue(dispute, now)
    })
    expect(selected).toHaveLength(1)
    expect(selected[0].status).toBe('Open')
  })

  it('flags again after an admin request restarts the window', () => {
    const requested = {
      status: DISPUTE_STATUS_AWAITING_RESPONSE,
      raisedAt: iso(30),
      responseDueAt: iso(1), // a fresh deadline that has now itself elapsed
    }
    expect(isDisputeOverdue(requested, now)).toBe(true)
    expect(String(requested.status).trim() === DISPUTE_STATUS_OVERDUE).toBe(false)
  })

  it('does not re-settle a refund that has already settled', () => {
    const settled = { ...base, status: 'Expired', refundStatus: 'Completed', refundSettledAt: iso(1) }
    const filter = (q) => !q.refundSettledAt && q.refundStatus === 'Pending' && getQuestionPaidAmount(q) !== null
    expect(filter(settled)).toBe(false)
    expect(filter({ ...base, status: 'Expired', refundStatus: 'Pending' })).toBe(true)
  })

  it('does not re-expire a question that already expired', () => {
    const expired = { ...base, status: 'Expired', raisedAt: iso(90), expiredAt: iso(1) }
    expect(isQuestionOverdue(expired, now)).toBe(false)
  })
})

describe('admin visibility totals', () => {
  const questions = [
    { ...base, id: 'Q1', status: 'Pending', raisedAt: iso(40) },
    { ...base, id: 'Q2', status: 'Pending', raisedAt: iso(26) },
    { ...base, id: 'Q3', status: 'Expired', raisedAt: iso(50), refundStatus: 'Pending' },
    { ...base, id: 'Q4', status: 'Disputed', dispute: { status: 'Overdue', raisedAt: iso(20) } },
    { ...base, id: 'Q5', status: 'Answered', raisedAt: iso(60) },
    { purchaseType: 'Free', id: 'Q6', status: 'Pending', raisedAt: iso(90) },
  ]

  it('splits questions into overdue and due soon without double counting', () => {
    const s = summariseCompliance({ questions, astrologers: [], activityLog: [] })
    // Q6 is a Free question. It still needs an answer, so it still expires — it just
    // never carries an amount, which is what the money assertions below check.
    expect(s.overdueQuestions.map((q) => q.id)).toEqual(['Q1', 'Q6'])
    expect(s.dueSoonQuestions.map((q) => q.id)).toEqual(['Q2'])
  })

  it('counts refunds pending and their real amount', () => {
    expect(summarisePendingRefunds(questions)).toEqual({ count: 1, amount: 250 })
  })

  it('keeps refund-pending money out of the held-for-astrologer total', () => {
    const s = summariseHeldAmounts(questions)
    // Held for astrologers: Q1 (250) + Q2 (250). Q3 is refund pending, Q4 disputed.
    expect(s.held).toBe(500)
    expect(s.disputed).toBe(250)
    expect(s.count).toBe(4)
  })

  it('ignores free questions in every money figure', () => {
    const s = summariseHeldAmounts(questions)
    expect(s.held).not.toBe(750)
  })

  it('lists overdue disputes separately from unresolved ones', () => {
    const s = summariseCompliance({ questions, astrologers: [], activityLog: [] })
    expect(s.overdueDisputes.map((q) => q.id)).toEqual(['Q4'])
  })

  it('never fabricates a total when there are no records', () => {
    const s = summariseCompliance({ questions: [], astrologers: [], activityLog: [] })
    expect(s.pendingRefunds).toEqual({ count: 0, amount: 0 })
    expect(s.heldAmounts).toEqual({ count: 0, held: 0, disputed: 0 })
    expect(s.dormantAstrologerCount).toBe(0)
  })

  it('reports dormant astrologers and separately counts unknown ones', () => {
    const activityLog = [{ astrologerId: 'a1', createdAt: iso(30) }]
    const s = summariseCompliance({
      questions: [],
      astrologers: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }],
      activityLog,
    })
    expect(s.dormantAstrologerCount).toBe(1)
    expect(s.unknownActivityAstrologers).toBe(2)
  })

  it('adds days without losing the ISO shape the model already uses', () => {
    expect(addDaysIso('2026-01-01T00:00:00.000Z', 7)).toBe('2026-01-08T00:00:00.000Z')
    expect(addDaysIso(null, 7)).toBeNull()
  })
})