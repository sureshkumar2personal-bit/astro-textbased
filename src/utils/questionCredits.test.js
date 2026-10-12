import { describe, expect, it } from 'vitest'
import {
  QUESTION_CREDIT_AVAILABLE,
  QUESTION_CREDIT_EXPIRED,
  QUESTION_CREDIT_USED,
  QUESTION_CREDIT_WINDOW_DAYS,
  consumeQuestionCreditInSlots,
  createQuestionCreditRecord,
  findQuestionCreditForSubmission,
  getAvailableQuestionCredits,
  getQuestionCreditDaysRemaining,
  getQuestionCreditOfferLabel,
  getQuestionCreditSourceLabel,
  getQuestionCreditStatus,
  getQuestionCreditsForUser,
  getQuestionCreditsFromSlots,
  isQuestionCreditRedeemable,
  markQuestionCreditUsed,
  upsertQuestionCreditInSlots,
} from './questionCredits.js'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-03T10:00:00.000Z')
const USER = { id: 'user-demo', email: 'user@astroconnect.com', role: 'user' }

function credit(overrides = {}) {
  return {
    id: 'QCR-1',
    userId: USER.id,
    userEmail: USER.email,
    astrologerId: 'astrologer-demo',
    astrologerName: 'Dr. Rani',
    subscriptionId: 'demo-subscription-astrologer-demo',
    campaignId: 'demo-active-marriage',
    campaignName: 'Marriage & Relationships',
    isOpenQuestion: false,
    questionType: 'Personal',
    originalPrice: 250,
    paidPrice: 250,
    offerEnabled: true,
    discountPercent: 0,
    discountAmount: 0,
    purchasedAt: new Date(NOW).toISOString(),
    expiresAt: new Date(NOW + QUESTION_CREDIT_WINDOW_DAYS * DAY_MS).toISOString(),
    status: QUESTION_CREDIT_AVAILABLE,
    usedAt: null,
    questionId: null,
    ...overrides,
  }
}

describe('credit creation (Pay Now, Ask Later)', () => {
  it('stores the paid amount, the offer and a 7-day window', () => {
    const record = createQuestionCreditRecord({
      userId: USER.id,
      astrologerId: 'astrologer-demo',
      astrologerName: 'Dr. Rani',
      subscriptionId: 'sub-1',
      campaignId: 'demo-active-marriage',
      campaignName: 'Marriage & Relationships',
      questionType: 'Personal',
      originalPrice: 250,
      paidPrice: 50,
      offerEnabled: true,
      discountPercent: 80,
      discountAmount: 200,
    }, { nowMs: NOW, id: 'QCR-offer' })

    expect(record.id).toBe('QCR-offer')
    expect(record.status).toBe(QUESTION_CREDIT_AVAILABLE)
    expect(record.originalPrice).toBe(250)
    expect(record.paidPrice).toBe(50)
    expect(record.discountPercent).toBe(80)
    expect(record.purchasedAt).toBe('2026-10-03T10:00:00.000Z')
    expect(record.expiresAt).toBe('2026-10-10T10:00:00.000Z')
    expect(record.usedAt).toBe(null)
    expect(record.questionId).toBe(null)
  })

  it('works without an offer and keeps campaignId null for Open Question', () => {
    const open = createQuestionCreditRecord({
      userId: USER.id,
      astrologerId: 'astrologer-demo',
      astrologerName: 'Dr. Rani',
      campaignId: null,
      questionType: 'General',
      originalPrice: 100,
      paidPrice: 100,
      offerEnabled: false,
    }, { nowMs: NOW, id: 'QCR-open' })

    expect(open.campaignId).toBe(null)
    expect(open.isOpenQuestion).toBe(true)
    expect(open.paidPrice).toBe(100)
    expect(open.discountPercent).toBe(0)
    expect(getQuestionCreditSourceLabel(open)).toBe('Open Question')
    expect(getQuestionCreditOfferLabel(open)).toBe('')
  })

  it('normalises Individual to Personal', () => {
    expect(createQuestionCreditRecord({ questionType: 'Individual' }, { nowMs: NOW }).questionType).toBe('Personal')
    expect(createQuestionCreditRecord({ questionType: 'General' }, { nowMs: NOW }).questionType).toBe('General')
  })
})

describe('7-day expiry', () => {
  it('is Available inside the window', () => {
    expect(getQuestionCreditStatus(credit(), NOW)).toBe(QUESTION_CREDIT_AVAILABLE)
    expect(getQuestionCreditStatus(credit(), NOW + 6 * DAY_MS)).toBe(QUESTION_CREDIT_AVAILABLE)
    expect(isQuestionCreditRedeemable(credit(), NOW + 6 * DAY_MS)).toBe(true)
    expect(getQuestionCreditDaysRemaining(credit(), NOW + DAY_MS)).toBe(6)
  })

  it('is Expired on and after the expiry boundary', () => {
    const boundary = NOW + QUESTION_CREDIT_WINDOW_DAYS * DAY_MS
    expect(getQuestionCreditStatus(credit(), boundary)).toBe(QUESTION_CREDIT_EXPIRED)
    expect(getQuestionCreditStatus(credit(), boundary + 1)).toBe(QUESTION_CREDIT_EXPIRED)
    expect(isQuestionCreditRedeemable(credit(), boundary)).toBe(false)
    expect(getQuestionCreditDaysRemaining(credit(), boundary)).toBe(0)
  })
})

describe('Available -> Used on submission', () => {
  it('is only marked Used by an actual submission', () => {
    const used = markQuestionCreditUsed(credit(), 'QTN-20261030001', NOW + DAY_MS)
    expect(used.status).toBe(QUESTION_CREDIT_USED)
    expect(used.questionId).toBe('QTN-20261030001')
    expect(getQuestionCreditStatus(used, NOW + 2 * DAY_MS)).toBe(QUESTION_CREDIT_USED)
  })

  it('matches the credit a submission should consume and refuses expired ones', () => {
    const credits = [credit()]
    const match = findQuestionCreditForSubmission(credits, {
      userId: USER.id,
      campaignId: 'demo-active-marriage',
      questionType: 'Personal',
      nowMs: NOW,
    })
    expect(match?.id).toBe('QCR-1')

    const expiredMatch = findQuestionCreditForSubmission(credits, {
      userId: USER.id,
      campaignId: 'demo-active-marriage',
      questionType: 'Personal',
      nowMs: NOW + 8 * DAY_MS,
    })
    expect(expiredMatch).toBe(null)

    const otherType = findQuestionCreditForSubmission(credits, {
      userId: USER.id,
      campaignId: 'demo-active-marriage',
      questionType: 'General',
      nowMs: NOW,
    })
    expect(otherType).toBe(null)
  })

  it('prefers an explicit creditId but still only while available', () => {
    const credits = [credit({ id: 'QCR-old' }), credit({ id: 'QCR-new', purchasedAt: new Date(NOW + DAY_MS).toISOString(), expiresAt: new Date(NOW + 8 * DAY_MS).toISOString() })]
    expect(findQuestionCreditForSubmission(credits, { userId: USER.id, campaignId: 'demo-active-marriage', questionType: 'Personal', creditId: 'QCR-new', nowMs: NOW + DAY_MS })?.id).toBe('QCR-new')
    expect(findQuestionCreditForSubmission(credits, { userId: USER.id, campaignId: 'demo-active-marriage', questionType: 'Personal', creditId: 'QCR-new', nowMs: NOW + 9 * DAY_MS })).toBe(null)
  })
})

describe('credits stored on purchased-slot records', () => {
  const slots = [
    { id: 'slot-1', userId: USER.id, campaignId: 'demo-active-marriage', credits: [credit()] },
    { id: 'slot-2', userId: 'user-other', campaignId: 'demo-active-marriage', credits: [credit({ id: 'QCR-other', userId: 'user-other' })] },
    { id: 'slot-3', userId: USER.id, campaignId: null },
  ]

  it('flattens credits and keeps the owning slot id', () => {
    const all = getQuestionCreditsFromSlots(slots)
    expect(all).toHaveLength(2)
    expect(all[0].slotId).toBe('slot-1')
  })

  it('returns only the current user records', () => {
    expect(getQuestionCreditsForUser(slots, USER).map((item) => item.id)).toEqual(['QCR-1'])
  })

  it('lists only redeemable credits as available', () => {
    const expiredSlot = [{ id: 'slot-4', userId: USER.id, campaignId: 'c', credits: [credit({ expiresAt: new Date(NOW - 1).toISOString() })] }]
    expect(getAvailableQuestionCredits(expiredSlot, USER, NOW)).toHaveLength(0)
    expect(getAvailableQuestionCredits(slots, USER, NOW)).toHaveLength(1)
  })
})
describe('credits on the purchased-slot records (integration)', () => {
  const purchase = ({ id = 'QCR-int-1', ...overrides } = {}) => createQuestionCreditRecord({
    userId: USER.id,
    userEmail: USER.email,
    astrologerId: 'astrologer-demo',
    astrologerName: 'Dr. Rani',
    subscriptionId: 'sub-1',
    campaignId: 'demo-active-marriage',
    campaignName: 'Marriage & Relationships',
    questionType: 'Personal',
    originalPrice: 250,
    paidPrice: 50,
    offerEnabled: true,
    discountPercent: 80,
    discountAmount: 200,
    ...overrides,
  }, { nowMs: NOW, id: 'QCR-int-1' })

  it('Pay & Ask Later with an offer stores the credit and moves the balance', () => {
    const slots = upsertQuestionCreditInSlots([], purchase())
    expect(slots).toHaveLength(1)
    expect(slots[0].personalPurchased).toBe(1)
    expect(slots[0].personalUsed).toBe(0)
    expect(slots[0].credits[0]).toMatchObject({
      status: QUESTION_CREDIT_AVAILABLE,
      originalPrice: 250,
      paidPrice: 50,
      discountPercent: 80,
      subscriptionId: 'sub-1',
      campaignId: 'demo-active-marriage',
    })
    expect(getQuestionCreditOfferLabel(slots[0].credits[0])).toBe('80% OFF')
    // Payment alone never marks it Used.
    expect(slots[0].credits[0].usedAt).toBe(null)
  })

  it('Pay & Ask Later without an offer behaves identically', () => {
    const slots = upsertQuestionCreditInSlots([], purchase({ id: 'QCR-int-2', offerEnabled: false, discountPercent: 0, discountAmount: 0, originalPrice: 100, paidPrice: 100, questionType: 'General' }))
    expect(slots[0].generalPurchased).toBe(1)
    expect(slots[0].credits[0].paidPrice).toBe(100)
    expect(getQuestionCreditOfferLabel(slots[0].credits[0])).toBe('')
    expect(getQuestionCreditStatus(slots[0].credits[0], NOW + 6 * DAY_MS)).toBe(QUESTION_CREDIT_AVAILABLE)
  })

  it('adds to an existing package record instead of creating a second one', () => {
    const base = [{ id: 'slot-1', userId: USER.id, campaignId: 'demo-active-marriage', astrologerId: 'astrologer-demo', generalPurchased: 3, generalUsed: 1, personalPurchased: 2, personalUsed: 1 }]
    const slots = upsertQuestionCreditInSlots(base, purchase())
    expect(slots).toHaveLength(1)
    expect(slots[0].generalPurchased).toBe(3)
    expect(slots[0].personalPurchased).toBe(3)
    expect(slots[0].credits).toHaveLength(1)
  })

  it('submitting the question moves Available -> Used and stamps the questionId', () => {
    const slots = upsertQuestionCreditInSlots([], purchase())
    const after = consumeQuestionCreditInSlots(slots, {
      creditId: 'QCR-int-1',
      userId: USER.id,
      campaignId: 'demo-active-marriage',
      questionType: 'Personal',
      questionId: 'QTN-20261030001',
      nowMs: NOW + DAY_MS,
    })
    expect(after[0].credits[0].status).toBe(QUESTION_CREDIT_USED)
    expect(after[0].credits[0].questionId).toBe('QTN-20261030001')
    expect(after[0].credits[0].usedAt).not.toBe(null)
    // The purchase record is kept for audit / history.
    expect(getQuestionCreditsFromSlots(after)).toHaveLength(1)
  })

  it('cannot be redeemed twice', () => {
    let slots = upsertQuestionCreditInSlots([], purchase())
    slots = consumeQuestionCreditInSlots(slots, { creditId: 'QCR-int-1', userId: USER.id, campaignId: 'demo-active-marriage', questionType: 'Personal', questionId: 'QTN-1', nowMs: NOW })
    slots = consumeQuestionCreditInSlots(slots, { creditId: 'QCR-int-1', userId: USER.id, campaignId: 'demo-active-marriage', questionType: 'Personal', questionId: 'QTN-2', nowMs: NOW + DAY_MS })
    expect(slots[0].credits[0].questionId).toBe('QTN-1')
    expect(slots[0].credits[0].status).toBe(QUESTION_CREDIT_USED)
  })

  it('an expired credit is never consumed and the record is kept', () => {
    const slots = upsertQuestionCreditInSlots([], purchase())
    const after = consumeQuestionCreditInSlots(slots, {
      creditId: 'QCR-int-1',
      userId: USER.id,
      campaignId: 'demo-active-marriage',
      questionType: 'Personal',
      questionId: 'QTN-3',
      nowMs: NOW + 8 * DAY_MS,
    })
    expect(after[0].credits[0].status).toBe(QUESTION_CREDIT_AVAILABLE)
    expect(after[0].credits[0].questionId).toBe(null)
    expect(getQuestionCreditStatus(after[0].credits[0], NOW + 8 * DAY_MS)).toBe(QUESTION_CREDIT_EXPIRED)
  })

  it('auto-matches the oldest available credit when no creditId is given', () => {
    let slots = upsertQuestionCreditInSlots([], purchase())
    // A second, later purchase whose 7-day window is still open.
    const later = createQuestionCreditRecord({
      userId: USER.id,
      astrologerId: 'astrologer-demo',
      campaignId: 'demo-active-marriage',
      questionType: 'Personal',
      originalPrice: 250,
      paidPrice: 50,
    }, { nowMs: NOW + DAY_MS, id: 'QCR-int-2' })
    slots = upsertQuestionCreditInSlots(slots, later)
    const after = consumeQuestionCreditInSlots(slots, { userId: USER.id, campaignId: 'demo-active-marriage', questionType: 'Personal', questionId: 'QTN-4', nowMs: NOW + 2 * DAY_MS })
    expect(after[0].credits.map((item) => item.status)).toEqual([QUESTION_CREDIT_USED, QUESTION_CREDIT_AVAILABLE])
  })

  it('leaves the list untouched for a slot-only submission with no credit', () => {
    const base = [{ id: 'slot-1', userId: USER.id, campaignId: 'demo-active-marriage', generalPurchased: 2, generalUsed: 0, personalPurchased: 0, personalUsed: 0 }]
    const after = consumeQuestionCreditInSlots(base, { userId: USER.id, campaignId: 'demo-active-marriage', questionType: 'General', questionId: 'QTN-5', nowMs: NOW })
    expect(after).toBe(base)
  })

  it('keeps an Open Question credit on a null-campaign slot record', () => {
    const slots = upsertQuestionCreditInSlots([], purchase({ id: 'QCR-open', campaignId: null, campaignName: null, questionType: 'General', originalPrice: 100, paidPrice: 100 }))
    expect(slots[0].campaignId).toBe(null)
    const after = consumeQuestionCreditInSlots(slots, { creditId: 'QCR-open', userId: USER.id, campaignId: null, questionType: 'General', questionId: 'QTN-open', nowMs: NOW })
    expect(after[0].credits[0].status).toBe(QUESTION_CREDIT_USED)
  })
})