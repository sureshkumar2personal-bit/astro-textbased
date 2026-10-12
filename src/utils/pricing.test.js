import { describe, expect, it } from 'vitest'
import { getDiscountPreview, getQuestionPricing } from './questions.js'

describe('getQuestionPricing', () => {
  it('matches getDiscountPreview when offerEnabled is true', () => {
    const pricing = getQuestionPricing({ price: 100, discountPercent: 60, offerEnabled: true })
    const preview = getDiscountPreview(100, 60)
    expect(pricing).toEqual({
      originalPrice: preview.originalPrice,
      discountPercent: preview.discountPercent,
      discountAmount: preview.discountAmount,
      payablePrice: preview.offerPrice,
    })
    expect(pricing.payablePrice).toBe(40)
  })

  it('turns the discount off when offerEnabled is false but keeps the price', () => {
    const pricing = getQuestionPricing({ price: 100, discountPercent: 60, offerEnabled: false })
    expect(pricing.originalPrice).toBe(100)
    expect(pricing.discountPercent).toBe(0)
    expect(pricing.discountAmount).toBe(0)
    expect(pricing.payablePrice).toBe(100)
  })

  it('falls back to safe defaults and never produces a negative payable amount', () => {
    expect(getQuestionPricing()).toEqual({
      originalPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      payablePrice: 0,
    })
    const pricing = getQuestionPricing({ price: -5, discountPercent: 130, offerEnabled: true })
    expect(pricing.originalPrice).toBe(0)
    expect(pricing.discountPercent).toBe(100)
    expect(pricing.payablePrice).toBe(0)
  })

  it('rounds the discount once so original price minus discount equals payable', () => {
    const pricing = getQuestionPricing({ price: 149, discountPercent: 33, offerEnabled: true })
    expect(pricing.discountAmount).toBe(49)
    expect(pricing.originalPrice - pricing.discountAmount).toBe(pricing.payablePrice)
  })
})