import { describe, expect, it } from 'vitest'
import {
  getQuestionPaidAmount,
  getQuestionRefundAmount,
  getQuestionSaleBreakdown,
  getQuestionSaleStatus,
  getSaleRows,
  getSalesReport,
  isSaleQuestion,
  resolveQuestionCampaign,
  resolveQuestionType,
} from './sales.js'

const campaigns = [
  {
    id: 'health',
    name: 'Health Campaign',
    discountPercent: 70,
    categories: [{ name: 'Health', normalPrice: 200, discountPercent: 70 }],
  },
  {
    id: 'wedding',
    name: 'Marriage & Relationship',
    discountPercent: 0,
    categories: [{ name: 'Marriage', normalPrice: 200, discountPercent: 0 }],
  },
]

const astrologerId = 'astrologer-demo'

function makeQuestion(overrides = {}) {
  return {
    id: 'QTN-1',
    userId: 'customer-1',
    user: 'Priya V.',
    astrologerId,
    category: 'Health',
    type: 'Personal',
    purchaseType: 'Paid',
    purchaseAmount: 250,
    refundAmount: 0,
    refundStatus: 'None',
    status: 'Answered',
    campaignId: 'health',
    campaignName: 'Health Campaign',
    raisedAt: '2026-07-18T10:30:00+05:30',
    ...overrides,
  }
}

describe('sales basics', () => {
  it('identifies paid and purchased-slot questions as sales, free questions are not', () => {
    expect(isSaleQuestion(makeQuestion())).toBe(true)
    expect(isSaleQuestion(makeQuestion({ purchaseType: 'Purchased Slot' }))).toBe(true)
    expect(isSaleQuestion(makeQuestion({ purchaseType: 'Free' }))).toBe(false)
    expect(isSaleQuestion(makeQuestion({ purchaseType: '' }))).toBe(false)
  })

  it('reads the paid amount and refund amount from the existing question record', () => {
    expect(getQuestionPaidAmount(makeQuestion())).toBe(250)
    expect(getQuestionPaidAmount(makeQuestion({ purchaseAmount: '0' }))).toBe(0)
    expect(getQuestionRefundAmount(makeQuestion({ refundAmount: 75 }))).toBe(75)
    expect(getQuestionRefundAmount(makeQuestion())).toBe(0)
  })

  it('resolves the question type to General or Personal from the existing type field', () => {
    expect(resolveQuestionType(makeQuestion({ type: 'Personal' }))).toBe('Personal')
    expect(resolveQuestionType(makeQuestion({ type: 'General' }))).toBe('General')
    expect(resolveQuestionType(makeQuestion({ type: 'Individual' }))).toBe('Personal')
    expect(resolveQuestionType(makeQuestion())).toBe('Personal')
  })

  it('matches a question to its campaign by id, then by name', () => {
    expect(resolveQuestionCampaign(makeQuestion(), campaigns)).toEqual(campaigns[0])
    expect(resolveQuestionCampaign(makeQuestion({ campaignId: null, campaignName: 'Marriage & Relationship' }), campaigns)).toEqual(campaigns[1])
    expect(resolveQuestionCampaign(makeQuestion({ campaignId: 'nope', campaignName: 'Nope' }), campaigns)).toBeNull()
  })
})

describe('sale breakdown (original price vs discount)', () => {
  it('keeps the paid amount when no subscriber offer discount applies', () => {
    const breakdown = getQuestionSaleBreakdown(makeQuestion(), campaigns)
    expect(breakdown.paid).toBe(250)
    expect(breakdown.originalPrice).toBe(250)
    expect(breakdown.discount).toBe(0)
  })

  it('derives the offer discount only when the paid amount matches the category subscriber-offer price', () => {
    const health = campaigns[0]
    const offCampaigns = [{ ...health, categories: [{ name: 'Health', normalPrice: 200, discountPercent: 30 }] }]
    expect(getQuestionSaleBreakdown(makeQuestion({ purchaseAmount: 200 }), offCampaigns).discount).toBe(0)
    const discounted = getQuestionSaleBreakdown(makeQuestion({ purchaseAmount: 140 }), offCampaigns)
    expect(discounted.originalPrice).toBe(200)
    expect(discounted.discount).toBe(60)
    expect(discounted.paid).toBe(140)
  })

  it('never invents a discount for regular-price purchases', () => {
    const breakdown = getQuestionSaleBreakdown(makeQuestion({ purchaseAmount: 100 }), campaigns)
    expect(breakdown.discount).toBe(0)
    expect(breakdown.originalPrice).toBe(100)
  })
})

describe('sale status', () => {
  it('reflected statuses reuse existing payment/question statuses', () => {
    expect(getQuestionSaleStatus(makeQuestion())).toBe('Completed')
    expect(getQuestionSaleStatus(makeQuestion({ status: 'Disputed', dispute: { status: 'Open' } }))).toBe('Disputed')
    expect(getQuestionSaleStatus(makeQuestion({ status: 'Disputed', dispute: { status: 'Resolved' } }))).toBe('Disputed')
    expect(getQuestionSaleStatus(makeQuestion({ status: 'Closed' }))).toBe('Cancelled')
    expect(getQuestionSaleStatus(makeQuestion({ refundAmount: 250, refundStatus: 'Completed' }))).toBe('Refunded')
  })
})

describe('getSaleRows', () => {
  it('filters sales by the purchase/transaction month, not the campaign month', () => {
    const rows = getSaleRows({
      questions: [
        makeQuestion({ id: 'a', raisedAt: '2026-07-05T10:00:00+05:30' }),
        makeQuestion({ id: 'b', campaignId: 'health', raisedAt: '2026-08-10T10:00:00+05:30' }),
        makeQuestion({ id: 'c', raisedAt: '2026-09-02T10:00:00+05:30' }),
      ],
      campaigns,
      astrologerId,
      monthKey: '2026-08',
    })
    expect(rows.map((row) => row.id)).toEqual(['b'])
  })

  it('excludes free questions and questions belonging to other astrologers', () => {
    const rows = getSaleRows({
      questions: [
        makeQuestion({ id: 'paid' }),
        makeQuestion({ id: 'free', purchaseType: 'Free' }),
        makeQuestion({ id: 'other-astro', astrologerId: 'acharya-meena' }),
      ],
      campaigns,
      astrologerId,
      monthKey: '2026-07',
    })
    expect(rows.map((row) => row.id)).toEqual(['paid'])
  })

  it('sorts transactions newest first by purchase date', () => {
    const rows = getSaleRows({
      questions: [
        makeQuestion({ id: 'older', raisedAt: '2026-07-02T10:00:00+05:30' }),
        makeQuestion({ id: 'newer', raisedAt: '2026-07-28T10:00:00+05:30' }),
      ],
      campaigns,
      astrologerId,
      monthKey: '2026-07',
    })
    expect(rows.map((row) => row.id)).toEqual(['newer', 'older'])
  })
})

describe('getSalesReport', () => {
  const augustQuestions = [
    makeQuestion({
      id: 'aug-1',
      category: 'Health',
      type: 'General',
      purchaseAmount: 100,
      campaignId: 'health',
      campaignName: 'Health Campaign',
      raisedAt: '2026-08-03T10:00:00+05:30',
      status: 'Answered',
    }),
    makeQuestion({
      id: 'aug-2',
      category: 'Health',
      type: 'Personal',
      purchaseAmount: 250,
      campaignId: 'health',
      campaignName: 'Health Campaign',
      raisedAt: '2026-08-06T10:00:00+05:30',
      status: 'In Progress',
    }),
    makeQuestion({
      id: 'aug-3',
      category: 'Marriage',
      type: 'Personal',
      purchaseAmount: 200,
      campaignId: 'wedding',
      campaignName: 'Marriage & Relationship',
      raisedAt: '2026-08-12T10:00:00+05:30',
      status: 'Answered',
      refundAmount: 200,
      refundStatus: 'Completed',
    }),
    makeQuestion({
      id: 'aug-4',
      category: 'Career',
      type: 'General',
      purchaseAmount: 50,
      campaignId: null,
      campaignName: '',
      raisedAt: '2026-08-20T10:00:00+05:30',
      status: 'Answered',
    }),
    makeQuestion({ id: 'aug-5', category: 'Career', type: 'Personal', purchaseAmount: 300, campaignId: 'wedding', campaignName: 'Marriage & Relationship', raisedAt: '2026-08-25T10:00:00+05:30' }),
    makeQuestion({ id: 'aug-9', category: 'Career', type: 'General', purchaseAmount: 100, campaignId: 'wedding', campaignName: 'Marriage & Relationship', raisedAt: '2026-09-02T10:00:00+05:30' }),
  ]

  const report = getSalesReport({ questions: augustQuestions, campaigns, astrologerId, monthKey: '2026-08' })

  it('sums revenue and sold counts per month', () => {
    expect(report.rows.length).toBe(5)
    expect(report.overview.sold).toBe(5)
    expect(report.overview.revenue).toBe(900)
    expect(report.overview.netRevenue).toBe(700)
    expect(report.overview.refunded).toBe(200)
  })

  it('breaks down General vs Personal using the existing question type', () => {
    expect(report.general.sold).toBe(2)
    expect(report.general.revenue).toBe(150)
    expect(report.personal.sold).toBe(3)
    expect(report.personal.revenue).toBe(750)
  })

  it('groups sales per campaign and separates open questions', () => {
    const health = report.campaignPerformance.find((entry) => entry.campaignId === 'health')
    expect(health.sold).toBe(2)
    expect(health.general).toBe(1)
    expect(health.personal).toBe(1)
    expect(health.revenue).toBe(350)

    const wedding = report.campaignPerformance.find((entry) => entry.campaignId === 'wedding')
    expect(wedding.sold).toBe(2)
    expect(wedding.refunds).toBe(200)
    expect(wedding.revenue).toBe(500) // gross paid: 200 + 300
    expect(wedding.netRevenue).toBe(300) // gross minus the 200 refund

    const open = report.openQuestions
    expect(open.length).toBe(1)
    expect(open[0].sold).toBe(1)
    expect(open[0].revenue).toBe(50)
  })

  it('keeps open question sales separate from campaign sales', () => {
    expect(report.campaignSales.length).toBe(2)
    expect(report.openQuestions[0].isOpenQuestion).toBe(true)
  })

  it('reports subscriber offer performance from actual paid amounts', () => {
    const offer = report.offerSummary
    expect(offer.offerPurchases).toBe(0)
    expect(offer.discountGiven).toBe(0)
    const healthOffer = report.campaignsWithOffers.find((entry) => entry.campaignId === 'health')
    expect(healthOffer.hasSales).toBe(true)
    expect(healthOffer.regularPurchases).toBe(2)
  })

  it('returns an empty report for a month with no sales', () => {
    const empty = getSalesReport({ questions: augustQuestions, campaigns, astrologerId, monthKey: '2026-10' })
    expect(empty.rows).toEqual([])
    expect(empty.overview.sold).toBe(0)
    expect(empty.overview.revenue).toBe(0)
    expect(empty.campaignPerformance).toEqual([])
    expect(empty.offerSummary.offerPurchases).toBe(0)
  })

  it('campaign revenue figures never come from capacity math', () => {
    const health = report.campaignPerformance.find((entry) => entry.campaignId === 'health')
    expect(health.revenue).not.toBe(health.sold * 500)
    expect(health.revenue).toBe(100 + 250)
  })
})