import { describe, expect, it } from 'vitest'
import {
  PURCHASED_FILTERS,
  buildPurchasedRecords,
  filterPurchasedRecords,
  getSlotCardStatus,
  summarizePurchasedRecords,
} from './purchasedQuestionRecords.js'
import {
  QUESTION_CREDIT_AVAILABLE,
  QUESTION_CREDIT_EXPIRED,
  QUESTION_CREDIT_USED,
} from './questionCredits.js'
import { getSlotTypeCards } from './purchasedSlots.js'

const USER = { id: 'user-demo', email: 'user@astroconnect.com' }
const CAMPAIGNS = [{ id: 'demo-active-marriage', name: 'Marriage & Relationships', date: '01 Oct 2026', endDate: '31 Oct 2026', astrologerId: 'astrologer-demo' }]
const ASTROLOGERS = [{ id: 'astrologer-demo', name: 'Dr. Rani' }]

function slot(overrides = {}) {
  return {
    id: 'slot-1',
    userId: USER.id,
    userEmail: USER.email,
    campaignId: 'demo-active-marriage',
    astrologerId: 'astrologer-demo',
    generalPurchased: 14,
    generalUsed: 3,
    personalPurchased: 7,
    personalUsed: 2,
    demo: true,
    ...overrides,
  }
}

function cardsFor(slots) {
  return getSlotTypeCards(slots, USER, { campaigns: CAMPAIGNS, astrologers: ASTROLOGERS, includeUsed: true })
}

function credit(overrides = {}) {
  return {
    id: 'credit-1',
    userId: USER.id,
    campaignId: 'demo-active-marriage',
    questionType: 'General',
    paidPrice: 400,
    status: QUESTION_CREDIT_AVAILABLE,
    usedAt: null,
    expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

function expectCountsMatchFilter(records, counts) {
  PURCHASED_FILTERS.forEach((filter) => {
    expect(filterPurchasedRecords(records, filter)).toHaveLength(counts[filter])
  })
  expect(counts.All).toBe(counts.Available + counts.Used + counts.Expired)
}

describe('getSlotCardStatus', () => {
  it('keeps a partially used package Available', () => {
    expect(getSlotCardStatus({ purchased: 14, used: 3, remaining: 11 })).toBe(QUESTION_CREDIT_AVAILABLE)
  })

  it('marks a package Used only once every purchased slot is consumed', () => {
    expect(getSlotCardStatus({ purchased: 14, used: 14, remaining: 0 })).toBe(QUESTION_CREDIT_USED)
  })

  it('reads missing or string balances without inventing an Available status', () => {
    expect(getSlotCardStatus({ remaining: '4' })).toBe(QUESTION_CREDIT_AVAILABLE)
    expect(getSlotCardStatus({ remaining: '0' })).toBe(QUESTION_CREDIT_USED)
    expect(getSlotCardStatus({})).toBe(QUESTION_CREDIT_USED)
    expect(getSlotCardStatus()).toBe(QUESTION_CREDIT_USED)
  })

  it('does not vary between real and demo records', () => {
    expect(getSlotCardStatus({ demo: true, remaining: 2 })).toBe(getSlotCardStatus({ remaining: 2 }))
    expect(getSlotCardStatus({ demo: true, remaining: 0 })).toBe(getSlotCardStatus({ remaining: 0 }))
  })
})

describe('summarizePurchasedRecords', () => {
  it('never counts a partially used package as Used (Used count == Used list)', () => {
    const slotCards = cardsFor([slot()])
    const { records, counts } = summarizePurchasedRecords({ slotCards, credits: [] })

    expect(counts.Used).toBe(0)
    expect(filterPurchasedRecords(records, 'Used')).toHaveLength(0)
    expect(counts.Available).toBe(slotCards.length)
    expect(counts.All).toBe(slotCards.length)
    expectCountsMatchFilter(records, counts)
  })

  it('shows a fully consumed package under Used exactly once', () => {
    const slotCards = cardsFor([slot({ generalUsed: 14, personalUsed: 7 })])
    const { records, counts } = summarizePurchasedRecords({ slotCards, credits: [] })

    expect(counts.Used).toBe(slotCards.length)
    const usedRecords = filterPurchasedRecords(records, 'Used')
    expect(usedRecords).toHaveLength(counts.Used)
    usedRecords.forEach((record) => {
      expect(record.kind).toBe('slot')
      expect(record.card.remaining).toBe(0)
    })
    expect(counts.Available).toBe(0)
  })

  it('keeps counts and filters in agreement for a mixed set of records', () => {
    const slotCards = cardsFor([
      slot(),
      slot({ id: 'slot-2', generalUsed: 14, personalUsed: 7 }),
      slot({ id: 'slot-3', generalUsed: 14, personalPurchased: 0, personalUsed: 0 }),
    ])
    const credits = [
      credit(),
      credit({ id: 'credit-2', status: QUESTION_CREDIT_USED, usedAt: new Date().toISOString() }),
      credit({ id: 'credit-3', expiresAt: new Date(Date.now() - 1000).toISOString() }),
    ]
    const { records, counts } = summarizePurchasedRecords({ slotCards, credits })

    expect(counts.All).toBe(slotCards.length + credits.length)
    expectCountsMatchFilter(records, counts)
    expect(filterPurchasedRecords(records, 'Expired')).toHaveLength(1)
    expect(filterPurchasedRecords(records, 'Used')).toHaveLength(4)
    expect(filterPurchasedRecords(records, 'Available')).toHaveLength(3)
  })

  it('derives credit status from entitlement fields, not a stale stored label', () => {
    const expiredWithStaleLabel = credit({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      status: QUESTION_CREDIT_AVAILABLE,
    })
    const missingLabel = credit({ id: 'credit-4' })
    delete missingLabel.status

    const { records, counts } = summarizePurchasedRecords({
      slotCards: [],
      credits: [expiredWithStaleLabel, missingLabel],
    })

    expect(records.map((record) => record.status)).toEqual([QUESTION_CREDIT_EXPIRED, QUESTION_CREDIT_AVAILABLE])
    expect(counts.Expired).toBe(1)
    expect(counts.Available).toBe(1)
    expectCountsMatchFilter(records, counts)
  })

  it('treats a used credit as Used regardless of its stored status', () => {
    const usedCredit = credit({ status: 'available', usedAt: new Date().toISOString() })
    const { counts } = summarizePurchasedRecords({ slotCards: [], credits: [usedCredit] })
    expect(counts.Used).toBe(1)
    expect(counts.Available).toBe(0)
  })

  it('counts demo and real records through the same classification', () => {
    const demoCards = cardsFor([slot()])
    const realCards = cardsFor([slot({ id: 'slot-9', demo: false })])
    const demo = summarizePurchasedRecords({ slotCards: demoCards, credits: [credit({ demo: true })] })
    const real = summarizePurchasedRecords({ slotCards: realCards, credits: [credit({ id: 'credit-9', demo: false })] })

    expect(demo.counts).toEqual(real.counts)
    expect(demo.records.map((record) => record.status)).toEqual(real.records.map((record) => record.status))
    expectCountsMatchFilter(demo.records, demo.counts)
    expectCountsMatchFilter(real.records, real.counts)
  })
})

describe('buildPurchasedRecords / filterPurchasedRecords', () => {
  it('lists slot cards before credits and keeps All in that order', () => {
    const records = buildPurchasedRecords({ slotCards: cardsFor([slot()]), credits: [credit()] })
    expect(records.map((record) => record.kind)).toEqual(['slot', 'slot', 'credit'])
    expect(filterPurchasedRecords(records, 'All')).toBe(records)
  })

  it('returns every record under All and nothing unknown under a status nobody has', () => {
    const records = buildPurchasedRecords({ slotCards: cardsFor([slot()]), credits: [] })
    expect(filterPurchasedRecords(records, 'All')).toHaveLength(records.length)
    expect(filterPurchasedRecords(records, 'Expired')).toHaveLength(0)
  })
})
