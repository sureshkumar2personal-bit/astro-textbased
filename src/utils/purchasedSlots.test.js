import { describe, expect, it } from 'vitest'
import {
  SLOT_STATUS_AVAILABLE,
  SLOT_STATUS_USED,
  buildSlotPricing,
  formatSlotAmount,
  getPurchasedSlotsForUser,
  getSlotPricingView,
  getSlotStatus,
  getSlotTypeCards,
  getSlotTypeTotals,
  mergeSlotPricing,
} from './purchasedSlots.js'

const USER = { id: 'user-demo', email: 'user@astroconnect.com' }

function slot(overrides = {}) {
  return {
    id: 'slot-1',
    userId: USER.id,
    userEmail: USER.email,
    campaignId: 'demo-active-marriage',
    astrologerId: 'astrologer-demo',
    generalPurchased: 5,
    generalUsed: 1,
    personalPurchased: 2,
    personalUsed: 0,
    ...overrides,
  }
}

describe('getSlotTypeTotals / getSlotStatus', () => {
  it('computes remaining counts per type', () => {
    const totals = getSlotTypeTotals(slot())
    expect(totals.generalRemaining).toBe(4)
    expect(totals.personalRemaining).toBe(2)
    expect(totals.totalRemaining).toBe(6)
    expect(getSlotStatus(slot())).toBe(SLOT_STATUS_AVAILABLE)
  })

  it('marks a fully used package as used', () => {
    expect(getSlotStatus(slot({ generalUsed: 5, personalUsed: 2 }))).toBe(SLOT_STATUS_USED)
  })

  it('never counts more used than purchased', () => {
    const totals = getSlotTypeTotals(slot({ generalUsed: 99 }))
    expect(totals.generalUsed).toBe(5)
    expect(totals.generalRemaining).toBe(0)
  })
})

describe('buildSlotPricing', () => {
  it('applies the campaign discount exactly once', () => {
    const pricing = buildSlotPricing({
      generalQty: 5,
      personalQty: 2,
      generalPrice: 100,
      personalPrice: 250,
      discountPercent: 60,
    })
    expect(pricing.originalAmount).toBe(1000)
    expect(pricing.discountAmount).toBe(600)
    expect(pricing.paidAmount).toBe(400)
    expect(pricing.discountPercent).toBe(60)
  })

  it('records a zero-discount package at full price', () => {
    const pricing = buildSlotPricing({ generalQty: 3, personalQty: 0, generalPrice: 120, discountPercent: 0 })
    expect(pricing.originalAmount).toBe(360)
    expect(pricing.discountAmount).toBe(0)
    expect(pricing.paidAmount).toBe(360)
  })

  it('honours explicit recorded amounts verbatim', () => {
    const pricing = buildSlotPricing({ originalAmount: 2000, discountAmount: 750, paidAmount: 1250, discountPercent: 100 })
    expect(pricing.originalAmount).toBe(2000)
    expect(pricing.discountAmount).toBe(750)
    expect(pricing.paidAmount).toBe(1250)
  })
})

describe('mergeSlotPricing', () => {
  it('accumulates amounts across two purchases', () => {
    const first = buildSlotPricing({ originalAmount: 1000, discountAmount: 600, paidAmount: 400 })
    const second = buildSlotPricing({ originalAmount: 500, discountAmount: 0, paidAmount: 500 })
    const merged = mergeSlotPricing(first, second)
    expect(merged.originalAmount).toBe(1500)
    expect(merged.discountAmount).toBe(600)
    expect(merged.paidAmount).toBe(900)
    expect(merged.discountPercent).toBe(40)
  })
})

describe('getSlotPricingView', () => {
  it('returns null for a legacy record without pricing', () => {
    expect(getSlotPricingView(slot())).toBeNull()
  })

  it('never reports a missing paid amount as zero', () => {
    const view = getSlotPricingView(slot({ pricing: { originalAmount: 1000, discountPercent: 60 } }))
    expect(view.paidAmount).toBeNull()
    expect(formatSlotAmount(view.paidAmount)).toBe('—')
  })
})

describe('getSlotTypeCards', () => {
  const campaigns = [{ id: 'demo-active-marriage', name: 'Marriage & Relationships', date: '01 Oct 2026', endDate: '31 Oct 2026', astrologerId: 'astrologer-demo' }]
  const astrologers = [{ id: 'astrologer-demo', name: 'Dr. Rani' }]

  it('flattens a slot into one card per question type', () => {
    const cards = getSlotTypeCards([slot()], USER, { campaigns, astrologers })
    expect(cards).toHaveLength(2)
    expect(cards.map((card) => card.type)).toEqual(['General', 'Individual'])
    expect(cards[0].astrologerName).toBe('Dr. Rani')
    expect(cards[0].campaignName).toBe('Marriage & Relationships')
    expect(cards[0].remaining).toBe(4)
  })

  it('hides fully used types when includeUsed is false', () => {
    const cards = getSlotTypeCards([slot({ generalUsed: 5, personalUsed: 0 })], USER, { campaigns, astrologers, includeUsed: false })
    expect(cards.map((card) => card.type)).toEqual(['Individual'])
  })

  it('only returns slots owned by the user', () => {
    const other = slot({ id: 'slot-2', userId: 'someone-else', userEmail: 'other@astroconnect.com' })
    expect(getPurchasedSlotsForUser([slot(), other], USER)).toHaveLength(1)
    expect(getSlotTypeCards([other], USER, { includeUsed: true })).toHaveLength(0)
  })
})
