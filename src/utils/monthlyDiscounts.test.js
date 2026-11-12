import { describe, expect, it } from 'vitest'
import {
  MONTHLY_DISCOUNT_STATUS,
  firstOfNextMonthMs,
  formatNextMonthName,
  getMonthlyDiscountStatus,
  startOfMonthKey,
  useMonthlyDiscountRecord,
} from './monthlyDiscounts.js'

describe('monthlyDiscounts utility', () => {
  const userId = 'user-test-1'
  const astrologerId = 'astrologer-demo'
  const mockDate = new Date('2026-11-12T10:00:00Z')

  it('formats month key and next month correctly', () => {
    expect(startOfMonthKey(mockDate)).toBe('2026-11')
    expect(formatNextMonthName(mockDate)).toContain('December 2026')
  })

  it('returns NONE if user is not subscribed', () => {
    const status = getMonthlyDiscountStatus([], userId, astrologerId, mockDate)
    expect(status.isSubscribed).toBe(false)
    expect(status.hasAvailableDiscount).toBe(false)
    expect(status.status).toBe(MONTHLY_DISCOUNT_STATUS.NONE)
  })

  it('returns AVAILABLE for a subscribed user on their first question this month', () => {
    const subscriptions = [
      {
        userId,
        astrologerId,
        tier: 'Gold',
        expiresAt: '2026-12-12T10:00:00Z',
        discountQuestions: [],
      },
    ]

    const status = getMonthlyDiscountStatus(subscriptions, userId, astrologerId, mockDate)
    expect(status.isSubscribed).toBe(true)
    expect(status.hasAvailableDiscount).toBe(true)
    expect(status.status).toBe(MONTHLY_DISCOUNT_STATUS.AVAILABLE)
    expect(status.discountPercent).toBe(75) // Gold tier default
  })

  it('marks discount as USED after user utilizes the monthly discount', () => {
    const initialSubs = [
      {
        userId,
        astrologerId,
        tier: 'Silver',
        discountQuestions: [
          {
            id: 'dq-1',
            status: 'Available',
            discountPercent: 60,
            monthKey: '2026-11',
          },
        ],
      },
    ]

    const updatedSubs = useMonthlyDiscountRecord(initialSubs, userId, astrologerId, mockDate)
    const statusAfter = getMonthlyDiscountStatus(updatedSubs, userId, astrologerId, mockDate)

    expect(statusAfter.isSubscribed).toBe(true)
    expect(statusAfter.hasAvailableDiscount).toBe(false)
    expect(statusAfter.status).toBe(MONTHLY_DISCOUNT_STATUS.USED)
  })

  it('subsequent queries in the same month return USED so original rate is charged', () => {
    const usedSubs = [
      {
        userId,
        astrologerId,
        tier: 'Silver',
        discountQuestions: [
          {
            id: 'dq-used-1',
            status: 'Used',
            usedAt: mockDate.getTime(),
            monthKey: '2026-11',
          },
        ],
      },
    ]

    const status = getMonthlyDiscountStatus(usedSubs, userId, astrologerId, mockDate)
    expect(status.hasAvailableDiscount).toBe(false)
    expect(status.status).toBe(MONTHLY_DISCOUNT_STATUS.USED)
    expect(status.nextAvailableMs).toBe(firstOfNextMonthMs(mockDate))
  })
})
