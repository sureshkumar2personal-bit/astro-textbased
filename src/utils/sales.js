import { getQuestionMonthKey } from './questions.js'

export function isSaleQuestion(question = {}) {
  const purchaseType = String(question.purchaseType || '').trim()
  return purchaseType === 'Paid' || purchaseType === 'Purchased Slot'
}

export function getQuestionPaidAmount(question = {}) {
  return Number(question.purchaseAmount) || 0
}

export function getQuestionRefundAmount(question = {}) {
  return Number(question.refundAmount) || 0
}

export function resolveQuestionCampaign(question = {}, campaigns = []) {
  if (!Array.isArray(campaigns)) return null
  const byId = question.campaignId ? campaigns.find((campaign) => campaign.id === question.campaignId) : null
  if (byId) return byId
  if (question.campaignName) {
    return campaigns.find((campaign) => campaign.name === question.campaignName) || null
  }
  return null
}

export function resolveQuestionType(question = {}) {
  const raw = String(question.type || question.questionType || '').trim().toLowerCase()
  if (raw.includes('personal') || raw === 'individual') return 'Personal'
  return 'General'
}

export function getQuestionSaleBreakdown(question = {}, campaigns = []) {
  const paid = getQuestionPaidAmount(question)
  const campaign = resolveQuestionCampaign(question, campaigns)
  const category = String(question.category || '').trim()
  let originalPrice = paid
  let discount = 0
  if (paid > 0 && campaign && Array.isArray(campaign.categories)) {
    const config = campaign.categories.find((item) => String(item.name || '').trim() === category)
    const normalPrice = config ? Number(config.normalPrice) || 0 : 0
    const discountPercent = config
      ? Number(config.discountPercent != null ? config.discountPercent : campaign.discountPercent) || 0
      : Number(campaign.discountPercent) || 0
    if (normalPrice > 0 && discountPercent > 0) {
      const discountAmount = Math.round((normalPrice * discountPercent) / 100)
      const youPay = normalPrice - discountAmount
      if (paid === youPay) {
        originalPrice = normalPrice
        discount = discountAmount
      }
    }
  }
  return { paid, originalPrice, discount }
}

export function getQuestionSaleStatus(question = {}) {
  const refunded = getQuestionRefundAmount(question) > 0 || String(question.refundStatus || '').toLowerCase() === 'completed'
  if (refunded) return 'Refunded'
  if (question.status === 'Disputed' || (question.dispute && String(question.dispute.status || '').toLowerCase() === 'open')) return 'Disputed'
  if (question.status === 'Closed') return 'Cancelled'
  return 'Completed'
}

export function getSaleRows({ questions = [], campaigns = [], astrologerId, monthKey }) {
  return questions
    .filter((question) => {
      if (!isSaleQuestion(question)) return false
      if (astrologerId && (question.astrologerId || 'astrologer-demo') !== astrologerId) return false
      if (monthKey && getQuestionMonthKey(question) !== monthKey) return false
      return true
    })
    .map((question) => {
      const { paid, originalPrice, discount } = getQuestionSaleBreakdown(question, campaigns)
      const campaign = resolveQuestionCampaign(question, campaigns)
      return {
        id: question.id,
        question,
        customer: question.user || question.userName || 'Customer',
        campaignId: campaign ? campaign.id : null,
        campaignName: campaign ? campaign.name : (question.campaignName || 'Open Question'),
        isOpenQuestion: !campaign,
        category: question.category || 'Others',
        type: resolveQuestionType(question),
        originalPrice,
        discount,
        paid,
        refund: getQuestionRefundAmount(question),
        dateISO: question.raisedAt || question.submittedAt || '',
        dateLabel: question.raised || '',
        status: getQuestionSaleStatus(question),
      }
    })
    .sort((a, b) => new Date(b.dateISO || 0) - new Date(a.dateISO || 0))
}

function sumRows(rows) {
  let revenue = 0
  let sold = 0
  let general = 0
  let personal = 0
  let refunded = 0
  let gross = 0
  let discounts = 0
  for (const row of rows) {
    sold += 1
    revenue += row.paid
    refunded += row.refund
    gross += row.originalPrice
    discounts += row.discount
    if (row.type === 'Personal') personal += 1
    else general += 1
  }
  return {
    revenue,
    sold,
    general,
    personal,
    refunded,
    gross,
    discounts,
    netRevenue: Math.max(revenue - refunded, 0),
  }
}

export function getSalesReport({ questions = [], campaigns = [], astrologerId, monthKey }) {
  const rows = getSaleRows({ questions, campaigns, astrologerId, monthKey })
  const overview = sumRows(rows)
  const typeBreakdown = {
    general: sumRows(rows.filter((row) => row.type === 'General')),
    personal: sumRows(rows.filter((row) => row.type === 'Personal')),
  }

  const byCampaign = new Map()
  for (const row of rows) {
    const key = row.campaignId || '__open__'
    if (!byCampaign.has(key)) {
      byCampaign.set(key, {
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        isOpenQuestion: row.isOpenQuestion,
        rows: [], // eslint-disable-line sonarjs
      })
    }
    byCampaign.get(key).rows.push(row)
  }
  const campaignPerformance = [...byCampaign.values()]
    .map((entry) => {
      const summary = sumRows(entry.rows)
      return { campaignId: entry.campaignId, campaignName: entry.campaignName, isOpenQuestion: entry.isOpenQuestion, refunds: summary.refunded, ...summary }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const offerRows = rows.filter((row) => row.discount > 0)
  const regularRows = rows.filter((row) => row.discount === 0)
  const campaignsWithOffers = (Array.isArray(campaigns) ? campaigns : [])
    .filter((campaign) => Number(campaign.discountPercent) > 0)
    .map((campaign) => {
      const campaignRows = rows.filter((row) => row.campaignId === campaign.id)
      const offerPurchases = campaignRows.filter((row) => row.discount > 0)
      const regularPurchases = campaignRows.filter((row) => row.discount === 0)
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        discountPercent: Number(campaign.discountPercent) || 0,
        offerPurchases: offerPurchases.length,
        discountGiven: offerPurchases.reduce((sum, row) => sum + row.discount, 0),
        offerRevenue: offerPurchases.reduce((sum, row) => sum + row.paid, 0),
        regularPurchases: regularPurchases.length,
        revenue: campaignRows.reduce((sum, row) => sum + row.paid, 0),
        hasSales: campaignRows.length > 0,
      }
    })

  return {
    monthKey,
    rows,
    overview,
    typeBreakdown,
    general: typeBreakdown.general,
    personal: typeBreakdown.personal,
    campaignSales: campaignPerformance.filter((entry) => !entry.isOpenQuestion),
    openQuestions: campaignPerformance.filter((entry) => entry.isOpenQuestion),
    campaignPerformance,
    campaignsWithOffers,
    offerSummary: {
      campaigns: campaignsWithOffers.filter((entry) => entry.hasSales).length,
      offerPurchases: offerRows.length,
      regularPurchases: regularRows.length,
      discountGiven: offerRows.reduce((sum, row) => sum + row.discount, 0),
      offerRevenue: offerRows.reduce((sum, row) => sum + row.paid, 0),
    },
  }
}