import { describe, expect, it } from 'vitest'
import {
  MONTHLY_QUESTION_CAPACITY,
  campaignAppliesToMonth,
  canCampaignAcceptNewQuestions,
  confirmDeleteCampaign,
  countCampaignQuestionsInMonth,
  countQuestionsInMonth,
  createCampaignRecord,
  createReusableCampaignDraft,
  doesAllocationSplitMatch,
  filterCampaignsByStatus,
  getCampaignAllocation,
  getCampaignAllowedActions,
  getCampaignCalendarMonth,
  getCampaignDateRange,
  getCampaignDependencyState,
  getCampaignDisplayStatus,
  getCampaignMetricCounts,
  getCampaignQuestionTypes,
  getCampaignRemaining,
  getCampaignUsed,
  getEffectiveCampaignStatus,
  getDiscountPreview,
  getMonthlyCapacitySummary,
  getMonthLabel,
  getOpenQuestionCapacity,
  getReuseCampaignDates,
  shiftMonthKey,
  splitCampaignAllocation,
  sumCampaignAllocations,
  validateCampaignAllocation,
  validateCampaignDateRange,
  validateCapacityAllocation,
} from './questions.js'

describe('monthly question capacity', () => {
  it('defaults to 2,500 questions per astrologer per month', () => {
    expect(MONTHLY_QUESTION_CAPACITY).toBe(2500)
  })

  it('keeps totals inside the monthly limit', () => {
    const summary = getMonthlyCapacitySummary({
      campaigns: [
        { totalLimit: 500 },
        { generalLimit: 350, personalLimit: 350 },
      ],
      openSettings: { capacity: 800 },
      questions: [],
      now: new Date('2026-09-15T10:00:00+05:30'),
    })
    expect(summary.allocated).toBe(2000)
    expect(summary.remainingAllocation).toBe(500)
    expect(summary.used).toBe(0)
    expect(summary.remaining).toBe(500)
  })

  it('shows unallocated Remaining = Total - Allocated (campaign only)', () => {
    const summary = getMonthlyCapacitySummary({
      campaigns: [{ totalLimit: 270 }],
      openSettings: { capacity: 0 },
      questions: [],
      now: new Date('2026-09-15T10:00:00+05:30'),
    })
    expect(summary.allocated).toBe(270)
    expect(summary.openAllocation).toBe(0)
    expect(summary.used).toBe(0)
    expect(summary.remaining).toBe(2500 - 270)
    expect(summary.remaining).toBe(2230)
  })

  it('adds open question allocation into Allocated and Remaining', () => {
    const summary = getMonthlyCapacitySummary({
      campaigns: [{ totalLimit: 270 }],
      openSettings: { capacity: 300 },
      questions: [],
      now: new Date('2026-09-15T10:00:00+05:30'),
    })
    expect(summary.allocated).toBe(570)
    expect(summary.used).toBe(0)
    expect(summary.remaining).toBe(1930)
  })

  it('does not let Used shrink the unallocated Remaining value', () => {
    const questions = Array.from({ length: 50 }, (_, index) => ({
      id: `used-${index}`,
      astrologerId: 'astro-1',
      raisedAt: '2026-09-05T10:00:00+05:30',
    }))
    const summary = getMonthlyCapacitySummary({
      campaigns: [{ totalLimit: 270 }],
      openSettings: { capacity: 300 },
      questions,
      astrologerId: 'astro-1',
      now: new Date('2026-09-15T10:00:00+05:30'),
    })
    expect(summary.allocated).toBe(570)
    expect(summary.used).toBe(50)
    expect(summary.remaining).toBe(1930)
  })

  it('blocks an allocation that exceeds the monthly limit', () => {
    const error = validateCapacityAllocation({ baseAllocation: 2200, proposedAllocation: 400 })
    expect(error).toMatch(/Remaining/i)
  })

  it('allows an allocation that fits exactly', () => {
    expect(validateCapacityAllocation({ baseAllocation: 2200, proposedAllocation: 300 })).toBeNull()
  })

  it('rejects negative allocations', () => {
    expect(validateCapacityAllocation({ proposedAllocation: -1 })).toMatch(/valid|Enter/)
  })

  it('counts only questions received in the current calendar month', () => {
    const questions = [
      { id: 'a', astrologerId: 'astro-1', raisedAt: '2026-09-05T10:00:00+05:30' },
      { id: 'b', astrologerId: 'astro-1', raisedAt: '2026-08-05T10:00:00+05:30' },
      { id: 'c', astrologerId: 'astro-2', raisedAt: '2026-09-06T10:00:00+05:30' },
      { id: 'd', astrologerId: 'astro-1', status: 'Closed', raisedAt: '2026-09-07T10:00:00+05:30' },
    ]
    expect(countQuestionsInMonth(questions, 'astro-1', '2026-09', new Date('2026-09-20T10:00:00+05:30'))).toBe(1)
  })

  it('counts US-date-style seed questions through the display parser', () => {
    const questions = [
      { id: 'e', astrologerId: 'astro-1', raised: '09-Sep-2026 10:30 AM' },
      { id: 'f', astrologerId: 'astro-1', raised: '09-Aug-2026 10:30 AM' },
    ]
    expect(countQuestionsInMonth(questions, 'astro-1', '2026-09', new Date('2026-09-20T10:00:00+05:30'))).toBe(1)
  })

  it('exposes a per-campaign summary on the summary object', () => {
    const summary = getMonthlyCapacitySummary({ campaigns: [], openSettings: {}, questions: [], now: new Date('2026-09-15T10:00:00+05:30') })
    expect(summary).toMatchObject({
      capacity: MONTHLY_QUESTION_CAPACITY,
      campaignAllocation: 0,
      openAllocation: 0,
      allocated: 0,
      used: 0,
      remaining: MONTHLY_QUESTION_CAPACITY,
    })
  })
})

describe('campaign allocation helpers', () => {
  it('derives allocation from totalLimit, falling back to split limits', () => {
    expect(getCampaignAllocation({ totalLimit: 500 })).toBe(500)
    expect(getCampaignAllocation({ generalLimit: 300, personalLimit: 200 })).toBe(500)
    expect(getCampaignAllocation({})).toBe(0)
  })

  it('computes used and remaining per campaign', () => {
    const campaign = { totalLimit: 500, purchasedGeneral: 120, purchasedPersonal: 80 }
    expect(getCampaignUsed(campaign)).toBe(200)
    expect(getCampaignRemaining(campaign)).toBe(300)
  })

  it('sums allocations across campaigns and open settings', () => {
    const campaigns = [{ totalLimit: 500 }, { totalLimit: 700 }]
    expect(sumCampaignAllocations(campaigns)).toBe(1200)
    expect(getOpenQuestionCapacity({ capacity: 800 })).toBe(800)
  })

  it('reads supported question types, honoring the explicit list first', () => {
    expect(getCampaignQuestionTypes({ questionTypes: ['General', 'Personal'] })).toEqual(['General', 'Personal'])
    expect(getCampaignQuestionTypes({ questionTypes: ['General'] })).toEqual(['General'])
    expect(getCampaignQuestionTypes({ personalLimit: 10, generalLimit: 0 })).toEqual(['Personal'])
    expect(getCampaignQuestionTypes({})).toEqual(['General', 'Personal'])
  })

  it('splits allocation between General and Personal types', () => {
    expect(splitCampaignAllocation(500, ['General'])).toEqual({ generalLimit: 500, personalLimit: 0 })
    expect(splitCampaignAllocation(500, ['Personal'])).toEqual({ generalLimit: 0, personalLimit: 500 })
    expect(splitCampaignAllocation(501, ['General', 'Personal'])).toEqual({ generalLimit: 251, personalLimit: 250 })
  })
})

describe('discount preview', () => {
  it('calculates the subscriber offer price from the percentage', () => {
    expect(getDiscountPreview(200, 70)).toEqual({ originalPrice: 200, discountPercent: 70, discountAmount: 140, offerPrice: 60 })
    expect(getDiscountPreview(500, 70)).toEqual({ originalPrice: 500, discountPercent: 70, discountAmount: 350, offerPrice: 150 })
  })

  it('never goes below zero', () => {
    expect(getDiscountPreview(100, 150)).toMatchObject({ offerPrice: 0 })
  })
})

describe('campaign status and metric cards', () => {
  const ref = new Date('2026-09-23T10:00:00+05:30')

  it('does not treat an ended Active campaign as currently active', () => {
    expect(getEffectiveCampaignStatus({ status: 'Active', endDate: '31 Aug 2026' }, ref)).toBe('Expired')
    expect(getEffectiveCampaignStatus({ status: 'Active', endDate: '30 Nov 2026' }, ref)).toBe('Active')
    expect(getEffectiveCampaignStatus({ status: 'Published', endDate: '31 Aug 2026' }, ref)).toBe('Expired')
    expect(getEffectiveCampaignStatus({ status: 'Active' }, ref)).toBe('Active')
    expect(getEffectiveCampaignStatus({ status: 'Draft', endDate: '31 Aug 2026' }, ref)).toBe('Draft')
  })

  it('Total card counts every campaign', () => {
    const campaigns = [
      { id: 'a', month: '2026-09', status: 'Active' },
      { id: 'b', month: '2026-09', status: 'Scheduled' },
      { id: 'c', month: '2026-09', status: 'Draft' },
      { id: 'd', month: '2026-09', status: 'Closed' },
      { id: 'e', month: '2026-09', status: 'Paused' },
    ]
    expect(getCampaignMetricCounts(campaigns, ref).total).toBe(5)
    expect(filterCampaignsByStatus(campaigns, 'All', ref)).toHaveLength(5)
  })

  it('Active card shows only Active/Published campaigns', () => {
    const campaigns = [
      { id: 'a', month: '2026-09', status: 'Active' },
      { id: 'b', month: '2026-09', status: 'Published' },
      { id: 'c', month: '2026-09', status: 'Draft' },
      { id: 'd', month: '2026-09', status: 'Scheduled' },
      { id: 'e', month: '2026-09', status: 'Paused' },
      { id: 'f', month: '2026-09', status: 'Expired' },
      { id: 'g', month: '2026-09', status: 'Completed' },
      { id: 'h', month: '2026-09', status: 'Cancelled' },
      { id: 'i', month: '2026-09', status: 'Closed' },
    ]
    const counts = getCampaignMetricCounts(campaigns, ref)
    expect(counts.active).toBe(2)
    expect(filterCampaignsByStatus(campaigns, 'Active', ref).map((c) => c.status)).toEqual(['Active', 'Published'])
  })

  it('Active card excludes an ended campaign even with a stale stored status', () => {
    const campaigns = [
      { id: 'old', status: 'Active', month: '2026-09', date: '1 Sep 2026', endDate: '10 Sep 2026' },
      { id: 'live', status: 'Active', month: '2026-09', date: '1 Sep 2026', endDate: '30 Sep 2026' },
    ]
    expect(getCampaignMetricCounts(campaigns, ref).active).toBe(1)
    expect(filterCampaignsByStatus(campaigns, 'Active', ref).map((c) => c.id)).toEqual(['live'])
  })

  it('Scheduled card shows only Scheduled campaigns', () => {
    const campaigns = [{ month: '2026-09', status: 'Scheduled' }, { month: '2026-09', status: 'Active' }, { month: '2026-09', status: 'Draft' }]
    expect(getCampaignMetricCounts(campaigns, ref).scheduled).toBe(1)
    expect(filterCampaignsByStatus(campaigns, 'Scheduled', ref)).toHaveLength(1)
  })

  it('Draft card shows only Draft campaigns', () => {
    const campaigns = [{ month: '2026-09', status: 'Draft' }, { month: '2026-09', status: 'Scheduled' }, { month: '2026-09', status: 'Active' }]
    expect(getCampaignMetricCounts(campaigns, ref).draft).toBe(1)
    expect(filterCampaignsByStatus(campaigns, 'Draft', ref)).toHaveLength(1)
  })

  it('status changes move a campaign between the metric buckets', () => {
    const base = { id: 'c1', date: '1 Sep 2026', endDate: '30 Sep 2026' }
    expect(getCampaignMetricCounts([{ ...base, status: 'Draft' }], ref)).toMatchObject({ total: 1, draft: 1, scheduled: 0, active: 0 })
    expect(getCampaignMetricCounts([{ ...base, status: 'Scheduled' }], ref)).toMatchObject({ draft: 0, scheduled: 1, active: 0 })
    expect(getCampaignMetricCounts([{ ...base, status: 'Active' }], ref)).toMatchObject({ scheduled: 0, active: 1 })
    expect(filterCampaignsByStatus([{ ...base, status: 'Scheduled' }], 'Scheduled', ref)).toHaveLength(1)
    expect(filterCampaignsByStatus([{ ...base, status: 'Scheduled' }], 'Draft', ref)).toHaveLength(0)
  })

  it('confirms General + Personal slots equal the campaign allocation', () => {
    expect(doesAllocationSplitMatch(300, 150, 150)).toBe(true)
    expect(doesAllocationSplitMatch(300, 100, 150)).toBe(false)
    expect(doesAllocationSplitMatch(500, 0, 500)).toBe(true)
    expect(splitCampaignAllocation(300, ['General', 'Personal']).generalLimit + splitCampaignAllocation(300, ['General', 'Personal']).personalLimit).toBe(300)
  })
})

describe('campaign creation status placement', () => {
  const base = {
    name: 'Career Guidance',
    month: '2026-09',
    date: '2026-09-01',
    endDate: '2026-09-30',
    totalLimit: 300,
    generalLimit: 150,
    personalLimit: 150,
    questionTypes: ['General', 'Personal'],
    generalPrice: 200,
    personalPrice: 500,
    offerEnabled: false,
    discountPercent: 0,
  }

  it('creates a campaign record and appends it to the existing campaign list', () => {
    const record = createCampaignRecord(base, { id: 'career-guidance' })
    const list = [record, { id: 'existing-1', status: 'Draft' }]
    expect(list).toHaveLength(2)
    expect(list[0]).toBe(record)
    expect(record.status).toBe('Draft')
    expect(record.totalLimit).toBe(300)
  })

  it('Save Draft creates a Draft campaign visible under the Draft card', () => {
    const record = createCampaignRecord({ ...base, status: 'Draft' }, { id: 'draft-1' })
    expect(record.status).toBe('Draft')
    expect(filterCampaignsByStatus([record], 'Draft')).toContain(record)
  })

  it('Schedule creates a Scheduled campaign visible under the Scheduled card', () => {
    const record = createCampaignRecord({
      ...base,
      status: 'Scheduled',
      scheduledPublishAt: '2026-10-01T10:00:00+05:30',
    }, { id: 'scheduled-1' })
    expect(record.status).toBe('Scheduled')
    expect(filterCampaignsByStatus([record], 'Scheduled')).toContain(record)
    expect(filterCampaignsByStatus([record], 'Draft')).not.toContain(record)
  })

  it('Publish Now creates an Active campaign visible under the Active card', () => {
    const record = createCampaignRecord({ ...base, status: 'Active' }, { id: 'active-1' })
    expect(record.status).toBe('Active')
    expect(filterCampaignsByStatus([record], 'Active', new Date('2026-09-23T10:00:00+05:30'))).toContain(record)
    expect(filterCampaignsByStatus([record], 'Scheduled')).not.toContain(record)
  })

  it('zeroes out disabled question slots and prices', () => {
    const record = createCampaignRecord({
      ...base,
      questionTypes: ['General'],
      totalLimit: 300,
      generalLimit: 300,
      personalLimit: 150,
      generalPrice: 200,
      personalPrice: 500,
    }, { id: 'general-only' })
    expect(record.personalLimit).toBe(0)
    expect(record.personalPrice).toBe(0)
    expect(record.generalLimit).toBe(300)
  })
})

describe('month is the source of truth for capacity and usage', () => {
  const healthStreak = {
    id: 'health',
    name: 'Health Campaign',
    date: '31 Jul 2026',
    endDate: '31 Aug 2026',
    totalLimit: 30,
    status: 'Active',
  }

  it('applies a campaign only to months overlapped by its date range', () => {
    expect(campaignAppliesToMonth(healthStreak, '2026-07')).toBe(true)
    expect(campaignAppliesToMonth(healthStreak, '2026-08')).toBe(true)
    expect(campaignAppliesToMonth(healthStreak, '2026-09')).toBe(false)
    expect(campaignAppliesToMonth(healthStreak, '2026-10')).toBe(false)
  })

  it('a July/August campaign does not contribute to September allocation', () => {
    const summary = getMonthlyCapacitySummary({
      campaigns: [healthStreak],
      openSettings: { capacity: 0 },
      questions: [],
      monthKey: '2026-09',
    })
    expect(summary.campaignAllocation).toBe(0)
    expect(summary.allocated).toBe(0)
    expect(summary.remaining).toBe(2500)
  })

  it('the selected month counts only its own applicable allocation', () => {
    const career = { id: 'career', date: '15 Aug 2026', endDate: '20 Sep 2026', totalLimit: 20, status: 'Draft' }
    const vip = { id: 'vip', date: '5 Sep 2026', endDate: '5 Oct 2026', totalLimit: 10, status: 'Closed' }
    const summary = getMonthlyCapacitySummary({
      campaigns: [healthStreak, career, vip],
      openSettings: { capacity: 0 },
      questions: [],
      monthKey: '2026-09',
    })
    expect(summary.campaignAllocation).toBe(30)
    expect(summary.allocated).toBe(30)
    const august = getMonthlyCapacitySummary({
      campaigns: [healthStreak, career, vip],
      openSettings: { capacity: 0 },
      questions: [],
      monthKey: '2026-08',
    })
    expect(august.campaignAllocation).toBe(50)
  })

  it('used questions are month specific and never carried across months', () => {
    const questions = [
      { id: 'jul-1', astrologerId: 'astro-1', campaignId: 'health', raisedAt: '2026-07-18T10:00:00+05:30' },
      { id: 'aug-1', astrologerId: 'astro-1', campaignId: 'health', raisedAt: '2026-08-05T10:00:00+05:30' },
      { id: 'aug-2', astrologerId: 'astro-1', campaignId: 'health', raisedAt: '2026-08-12T10:00:00+05:30' },
      { id: 'sep-1', astrologerId: 'astro-1', campaignId: 'health', raisedAt: '2026-09-02T10:00:00+05:30' },
      { id: 'other', astrologerId: 'astro-2', campaignId: 'health', raisedAt: '2026-08-20T10:00:00+05:30' },
    ]
    const aug = getMonthlyCapacitySummary({ campaigns: [healthStreak], openSettings: {}, questions, astrologerId: 'astro-1', monthKey: '2026-08' })
    const sep = getMonthlyCapacitySummary({ campaigns: [healthStreak], openSettings: {}, questions, astrologerId: 'astro-1', monthKey: '2026-09' })
    const jul = getMonthlyCapacitySummary({ campaigns: [healthStreak], openSettings: {}, questions, astrologerId: 'astro-1', monthKey: '2026-07' })
    expect(aug.used).toBe(2)
    expect(sep.used).toBe(1)
    expect(jul.used).toBe(1)
    expect(countCampaignQuestionsInMonth(healthStreak, questions, '2026-08', 'astro-1')).toBe(2)
    expect(countCampaignQuestionsInMonth(healthStreak, questions, '2026-09', 'astro-1')).toBe(1)
  })

  it('Remaining = 2500 − Allocated and Used does not shrink it', () => {
    const sepCampaign = { id: 'big', date: '1 Sep 2026', endDate: '30 Sep 2026', totalLimit: 570 }
    const questions = Array.from({ length: 50 }, (_, index) => ({
      id: `sep-used-${index}`,
      astrologerId: 'astro-1',
      campaignId: 'big',
      raisedAt: '2026-09-05T10:00:00+05:30',
    }))
    const summary = getMonthlyCapacitySummary({
      campaigns: [sepCampaign],
      openSettings: { capacity: 0 },
      questions,
      astrologerId: 'astro-1',
      monthKey: '2026-09',
    })
    expect(summary.allocated).toBe(570)
    expect(summary.used).toBe(50)
    expect(summary.remaining).toBe(1930)
    expect(summary.remaining).toBe(2500 - summary.allocated)
  })

  it('campaign + open allocation cannot exceed the monthly capacity', () => {
    const sepCampaign = { id: 'a', date: '1 Sep 2026', endDate: '30 Sep 2026', totalLimit: 1700 }
    const second = { id: 'b', date: '1 Sep 2026', endDate: '30 Sep 2026', totalLimit: 800 }
    const summary = getMonthlyCapacitySummary({
      campaigns: [sepCampaign, second],
      openSettings: { capacity: 0 },
      questions: [],
      monthKey: '2026-09',
    })
    expect(summary.allocated).toBe(2500)
    expect(summary.remaining).toBe(0)
    expect(validateCapacityAllocation({ baseAllocation: 1900, proposedAllocation: 700 })).toMatch(/Remaining/i)
    expect(validateCapacityAllocation({ baseAllocation: 1900, proposedAllocation: 600 })).toBeNull()
  })

  it('labels and shifts months for the selector', () => {
    expect(getMonthLabel('2026-09')).toBe('September 2026')
    expect(shiftMonthKey('2026-09', -1)).toBe('2026-08')
    expect(shiftMonthKey('2026-09', 1)).toBe('2026-10')
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12')
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01')
  })
})

describe('month-based campaign status rules', () => {
  const now = '2026-09-23T10:00:00+05:30'

  it('a campaign active during the selected month shows Active', () => {
    const live = { status: 'Active', date: '1 Sep 2026', endDate: '30 Sep 2026' }
    expect(getCampaignDisplayStatus(live, '2026-09', now)).toBe('Active')
  })

  it('an ended campaign stays Closed and never appears in another month', () => {
    const health = { status: 'Active', month: '2026-09', date: '1 Sep 2026', endDate: '10 Sep 2026' }
    expect(getCampaignDisplayStatus(health, '2026-09', now)).toBe('Closed')
    expect(getCampaignMetricCounts([health], '2026-09', now)).toMatchObject({ total: 1, active: 0 })
    expect(getCampaignMetricCounts([health], '2026-10', now)).toMatchObject({ total: 0, active: 0 })
    expect(filterCampaignsByStatus([health], 'All', '2026-10', now)).toHaveLength(0)
  })

  it('every campaign in a past month is treated as Closed (view-only history)', () => {
    for (const status of ['Active', 'Scheduled', 'Draft', 'Closed']) {
      expect(getCampaignDisplayStatus({ status, date: '15 Aug 2026', endDate: '31 Aug 2026' }, '2026-08', now)).toBe('Closed')
    }
    expect(getCampaignDisplayStatus({ status: 'Active', date: '1 Jul 2026', endDate: '31 Jul 2026' }, '2026-07', now)).toBe('Closed')
  })

  it('a historical campaign cannot be reopened: it is never Active/Scheduled/Draft in a past month', () => {
    const past = [{ id: 'aug', status: 'Active', month: '2026-08', date: '5 Aug 2026', endDate: '31 Aug 2026' }]
    expect(getCampaignMetricCounts(past, '2026-08', now)).toEqual({ total: 1, active: 0, scheduled: 0, draft: 0 })
    expect(filterCampaignsByStatus(past, 'Active', '2026-08', now)).toHaveLength(0)
    expect(filterCampaignsByStatus(past, 'Scheduled', '2026-08', now)).toHaveLength(0)
    expect(filterCampaignsByStatus(past, 'Draft', '2026-08', now)).toHaveLength(0)
    expect(filterCampaignsByStatus(past, 'All', '2026-08', now)).toHaveLength(1)
  })

  it('a future campaign never appears Active before its start date', () => {
    const future = { status: 'Active', month: '2026-12', date: '1 Dec 2026', endDate: '31 Dec 2026' }
    expect(getCampaignDisplayStatus(future, '2026-12', now)).toBe('Scheduled')
    expect(getCampaignDisplayStatus(future, '2026-12', '2026-12-10T10:00:00+05:30')).toBe('Active')
    expect(getCampaignMetricCounts([future], '2026-11', now)).toMatchObject({ total: 0 })
    expect(getCampaignMetricCounts([future], '2026-12', now)).toMatchObject({ total: 1, active: 0, scheduled: 1 })
    expect(filterCampaignsByStatus([future], 'All', '2026-11', now)).toHaveLength(0)
    expect(filterCampaignsByStatus([future], 'Scheduled', '2026-12', now)).toHaveLength(1)
  })

  it('Draft and Scheduled stay in their own month buckets', () => {
    const draft = { status: 'Draft', date: '1 Nov 2026', endDate: '30 Nov 2026' }
    const scheduled = { status: 'Scheduled', date: '1 Oct 2026', endDate: '31 Oct 2026' }
    expect(getCampaignDisplayStatus(draft, '2026-11', now)).toBe('Draft')
    expect(getCampaignDisplayStatus(scheduled, '2026-10', now)).toBe('Scheduled')
    expect(getCampaignMetricCounts([draft], '2026-11', now)).toMatchObject({ total: 1, draft: 1, active: 0, scheduled: 0 })
    expect(getCampaignMetricCounts([scheduled], '2026-10', now)).toMatchObject({ total: 1, scheduled: 1 })
  })
})

describe('selected month scopes the overview cards and campaign list', () => {
  const now = '2026-09-23T10:00:00+05:30'
  const campaigns = [
    { id: 'sep-active', status: 'Active', month: '2026-09', date: '1 Sep 2026', endDate: '30 Sep 2026' },
    { id: 'sep-active-2', status: 'Active', month: '2026-09', date: '15 Sep 2026', endDate: '30 Sep 2026' },
    { id: 'sep-scheduled', status: 'Scheduled', month: '2026-09', date: '25 Sep 2026', endDate: '30 Sep 2026' },
    { id: 'sep-draft', status: 'Draft', month: '2026-09', date: '10 Sep 2026', endDate: '30 Sep 2026' },
    { id: 'oct-campaign', status: 'Active', month: '2026-10', date: '5 Oct 2026', endDate: '31 Oct 2026' },
    { id: 'oct-scheduled', status: 'Scheduled', month: '2026-10', date: '15 Oct 2026', endDate: '20 Oct 2026' },
    { id: 'oct-draft', status: 'Draft', month: '2026-10', date: '10 Oct 2026', endDate: '31 Oct 2026' },
    { id: 'aug-historical', status: 'Active', month: '2026-08', date: '5 Aug 2026', endDate: '31 Aug 2026' },
  ]

  it('month selector shows only campaigns belonging to the selected month', () => {
    expect(filterCampaignsByStatus(campaigns, 'All', '2026-09', now).map((c) => c.id)).toEqual([
      'sep-active', 'sep-active-2', 'sep-scheduled', 'sep-draft',
    ])
    expect(filterCampaignsByStatus(campaigns, 'All', '2026-10', now).map((c) => c.id)).toEqual([
      'oct-campaign', 'oct-scheduled', 'oct-draft',
    ])
    expect(filterCampaignsByStatus(campaigns, 'All', '2026-08', now).map((c) => c.id)).toEqual(['aug-historical'])
  })

  it('September counts come only from September campaigns and their status', () => {
    expect(getCampaignMetricCounts(campaigns, '2026-09', now)).toEqual({ total: 4, active: 2, scheduled: 1, draft: 1 })
    expect(filterCampaignsByStatus(campaigns, 'Active', '2026-09', now).map((c) => c.id)).toEqual(['sep-active', 'sep-active-2'])
    expect(filterCampaignsByStatus(campaigns, 'Scheduled', '2026-09', now).map((c) => c.id)).toEqual(['sep-scheduled'])
    expect(filterCampaignsByStatus(campaigns, 'Draft', '2026-09', now).map((c) => c.id)).toEqual(['sep-draft'])
  })

  it('October counts come only from October campaigns (published ones show Scheduled until October arrives)', () => {
    expect(getCampaignMetricCounts(campaigns, '2026-10', now)).toEqual({ total: 3, active: 0, scheduled: 2, draft: 1 })
    expect(filterCampaignsByStatus(campaigns, 'Scheduled', '2026-10', now).map((c) => c.id)).toEqual(['oct-campaign', 'oct-scheduled'])
    expect(filterCampaignsByStatus(campaigns, 'Draft', '2026-10', now).map((c) => c.id)).toEqual(['oct-draft'])
    expect(getCampaignMetricCounts(campaigns, '2026-10', '2026-10-10T10:00:00+05:30')).toEqual({ total: 3, active: 1, scheduled: 1, draft: 1 })
  })

  it('August + Total shows only campaigns that belonged to August (Closed history)', () => {
    const counts = getCampaignMetricCounts(campaigns, '2026-08', now)
    expect(counts.total).toBe(1)
    expect(counts.active).toBe(0)
    expect(counts.scheduled).toBe(0)
    expect(counts.draft).toBe(0)
    expect(filterCampaignsByStatus(campaigns, 'All', '2026-08', now).map((c) => c.id)).toEqual(['aug-historical'])
  })

  it('switching months updates the list and overview counts correctly', () => {
    expect(getCampaignMetricCounts(campaigns, '2026-08', now)).toEqual({ total: 1, active: 0, scheduled: 0, draft: 0 })
    expect(getCampaignMetricCounts(campaigns, '2026-09', now)).toEqual({ total: 4, active: 2, scheduled: 1, draft: 1 })
    expect(getCampaignMetricCounts(campaigns, '2026-10', now)).toEqual({ total: 3, active: 0, scheduled: 2, draft: 1 })
    expect(filterCampaignsByStatus(campaigns, 'All', '2026-10', now).map((c) => c.id)).not.toContain('sep-active')
    expect(filterCampaignsByStatus(campaigns, 'All', '2026-09', now).map((c) => c.id)).not.toContain('oct-campaign')
  })
})

describe('reuse campaign for next month', () => {
  const source = {
    id: 'health',
    name: 'Health Campaign',
    status: 'Active',
    shortDescription: 'Short summary',
    description: 'Long description',
    whatUsersCanAsk: 'Any health question',
    exampleQuestions: ['When to check my health?', 'Is surgery advisable?'],
    questionTypes: ['General', 'Personal'],
    generalPrice: 100,
    personalPrice: 250,
    offerEnabled: true,
    discountPercent: 70,
    templateId: 'health-care',
    totalLimit: 30,
    generalLimit: 18,
    personalLimit: 12,
    purchasedGeneral: 12,
    purchasedPersonal: 6,
  }

  it('creates a NEW campaign draft for the next month with editable configuration', () => {
    const draft = createReusableCampaignDraft(source, '2026-09')
    expect(getReuseCampaignDates('2026-09')).toEqual({ date: '2026-10-01', endDate: '2026-10-31' })
    expect(draft.id).toBeUndefined()
    expect(draft.month).toBe('2026-10')
    expect(draft.status).toBe('Draft')
    expect(draft.name).toBe('Health Campaign')
    expect(draft.shortDescription).toBe('Short summary')
    expect(draft.description).toBe('Long description')
    expect(draft.whatUsersCanAsk).toBe('Any health question')
    expect(draft.exampleQuestions).toEqual(['When to check my health?', 'Is surgery advisable?'])
    expect(draft.questionTypes).toEqual(['General', 'Personal'])
    expect(draft.generalPrice).toBe(100)
    expect(draft.personalPrice).toBe(250)
    expect(draft.offerEnabled).toBe(true)
    expect(draft.discountPercent).toBe(70)
    expect(draft.templateId).toBe('health-care')
    expect(draft.date).toBe('2026-10-01')
    expect(draft.endDate).toBe('2026-10-31')
  })

  it('does not copy the old allocation or usage; capacity stays manual', () => {
    const draft = createReusableCampaignDraft(source, '2026-09')
    expect(draft.totalLimit).toBe(0)
    expect(draft.generalLimit).toBe(0)
    expect(draft.personalLimit).toBe(0)
    expect(draft.purchasedGeneral).toBeUndefined()
    expect(draft.purchasedPersonal).toBeUndefined()
    expect(draft.purchasedGeneral || 0).toBe(0)
    const record = createCampaignRecord(draft)
    expect(getCampaignAllocation(record)).toBe(0)
  })

  it('does not automatically consume the next month capacity', () => {
    const draft = createReusableCampaignDraft(source, '2026-09')
    const record = createCampaignRecord(draft)
    const summary = getMonthlyCapacitySummary({ campaigns: [record], openSettings: { capacity: 0 }, questions: [], monthKey: '2026-10' })
    expect(summary.campaignAllocation).toBe(0)
    expect(summary.allocated).toBe(0)
    expect(summary.remaining).toBe(2500)
  })
})

describe('delete campaign safety', () => {
  it('deletion requires explicit confirmation', () => {
    const result = confirmDeleteCampaign({ id: 'x' }, null, { confirmed: false })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/confirmation/i)
    expect(getCampaignDependencyState({ id: 'x' }, { questions: [], purchasedSlots: [] }).protected).toBe(false)
  })

  it('a campaign with customer questions or purchases is protected from destructive deletion', () => {
    const campaign = { id: 'july-premium' }
    const deps = getCampaignDependencyState(campaign, {
      questions: [{ id: 'q1', campaignId: 'july-premium' }, { id: 'q2', campaign: 'july-premium' }],
      purchasedSlots: [{ id: 's1', campaignId: 'july-premium' }],
    })
    expect(deps.questions).toBe(2)
    expect(deps.purchases).toBe(1)
    expect(deps.protected).toBe(true)
    const result = confirmDeleteCampaign(campaign, deps, { confirmed: true })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/cannot be deleted/i)
  })

  it('a campaign with no dependent records can be deleted once confirmed', () => {
    const deps = getCampaignDependencyState({ id: 'scratch' }, { questions: [], purchasedSlots: [] })
    expect(deps.protected).toBe(false)
    expect(confirmDeleteCampaign({ id: 'scratch' }, deps, { confirmed: true })).toEqual({ ok: true })
  })
})

describe('single-month campaign model', () => {
  const now = '2026-09-23T10:00:00+05:30'
  const source = {
    id: 'health',
    name: 'Health Campaign',
    status: 'Active',
    shortDescription: 'Short summary',
    description: 'Long description',
    whatUsersCanAsk: 'Any health question',
    exampleQuestions: ['When to check my health?', 'Is surgery advisable?'],
    questionTypes: ['General', 'Personal'],
    generalPrice: 100,
    personalPrice: 250,
    offerEnabled: true,
    discountPercent: 70,
    templateId: 'health-care',
    totalLimit: 30,
    generalLimit: 18,
    personalLimit: 12,
    purchasedGeneral: 12,
    purchasedPersonal: 6,
  }

  it('a September campaign cannot have dates beyond September 30', () => {
    expect(validateCampaignDateRange({ date: '2026-09-01', endDate: '2026-10-01', monthKey: '2026-09' })).toMatch(/stay within/i)
    expect(validateCampaignDateRange({ date: '2026-09-01', endDate: '2026-09-30', monthKey: '2026-09' })).toBeNull()
  })

  it('an October campaign cannot start before October 1', () => {
    expect(validateCampaignDateRange({ date: '2026-09-30', endDate: '2026-10-10', monthKey: '2026-10' })).toMatch(/stay within/i)
    expect(validateCampaignDateRange({ date: '2026-10-01', endDate: '2026-10-31', monthKey: '2026-10' })).toBeNull()
  })

  it('September 15 to September 30 is valid', () => {
    expect(validateCampaignDateRange({ date: '2026-09-15', endDate: '2026-09-30', monthKey: '2026-09' })).toBeNull()
  })

  it('September 15 to October 5 is invalid', () => {
    expect(validateCampaignDateRange({ date: '2026-09-15', endDate: '2026-10-05', monthKey: '2026-09' })).toMatch(/stay within/i)
  })

  it('no campaign can have a start and end date in different months', () => {
    expect(validateCampaignDateRange({ date: '2026-08-15', endDate: '2026-09-15', monthKey: '2026-08' })).toMatch(/stay within|another month/i)
    expect(getCampaignCalendarMonth({ date: '15 Aug 2026', endDate: '15 Sep 2026' })).toBe('2026-08')
    expect(getCampaignCalendarMonth({ date: '1 Sep 2026', endDate: '30 Sep 2026' })).toBe('2026-09')
    expect(getCampaignCalendarMonth({ month: '2026-10' })).toBe('2026-10')
  })

  it('exposes the picker bounds for a month', () => {
    expect(getCampaignDateRange('2026-09')).toEqual({ min: '2026-09-01', max: '2026-09-30' })
    expect(getCampaignDateRange('2026-02')).toEqual({ min: '2026-02-01', max: '2026-02-28' })
  })

  it('September and October allocations are independent', () => {
    const september = { id: 'sep', month: '2026-09', date: '1 Sep 2026', endDate: '30 Sep 2026', totalLimit: 500, status: 'Active' }
    const october = { id: 'oct', month: '2026-10', date: '1 Oct 2026', endDate: '31 Oct 2026', totalLimit: 700, status: 'Draft' }
    const sepSummary = getMonthlyCapacitySummary({ campaigns: [september, october], openSettings: { capacity: 200 }, questions: [], monthKey: '2026-09' })
    const octSummary = getMonthlyCapacitySummary({ campaigns: [september, october], openSettings: { capacity: 200 }, questions: [], monthKey: '2026-10' })
    expect(sepSummary.allocated).toBe(700)
    expect(sepSummary.capacity).toBe(2500)
    expect(octSummary.allocated).toBe(900)
    expect(octSummary.capacity).toBe(2500)
    expect(sepSummary.remaining).toBe(1800)
    expect(octSummary.remaining).toBe(1600)
  })

  it('September usage does not reduce October remaining capacity', () => {
    const september = { id: 'sep', month: '2026-09', date: '1 Sep 2026', endDate: '30 Sep 2026', totalLimit: 500, status: 'Active' }
    const questions = Array.from({ length: 300 }, (_, index) => ({
      id: `sep-q-${index}`,
      astrologerId: 'astro-1',
      campaignId: 'sep',
      raisedAt: '2026-09-12T10:00:00+05:30',
    }))
    const sep = getMonthlyCapacitySummary({ campaigns: [september], openSettings: { capacity: 200 }, questions, astrologerId: 'astro-1', monthKey: '2026-09' })
    const oct = getMonthlyCapacitySummary({ campaigns: [september], openSettings: { capacity: 200 }, questions, astrologerId: 'astro-1', monthKey: '2026-10' })
    expect(sep.used).toBe(300)
    expect(sep.allocated).toBe(700)
    expect(oct.used).toBe(0)
    expect(oct.allocated).toBe(200)
    expect(oct.remaining).toBe(2300)
    expect(oct.remaining).toBe(2500 - oct.allocated)
  })

  it('total/active/scheduled/draft counts are calculated only from the selected month', () => {
    const campaigns = [
      { id: 'sep-live', status: 'Active', month: '2026-09', date: '1 Sep 2026', endDate: '30 Sep 2026' },
      { id: 'sep-draft', status: 'Draft', month: '2026-09', date: '10 Sep 2026', endDate: '30 Sep 2026' },
      { id: 'oct-live', status: 'Active', month: '2026-10', date: '5 Oct 2026', endDate: '31 Oct 2026' },
    ]
    expect(getCampaignMetricCounts(campaigns, '2026-09', now)).toEqual({ total: 2, active: 1, scheduled: 0, draft: 1 })
    expect(filterCampaignsByStatus(campaigns, 'All', '2026-09', now).map((c) => c.id)).toEqual(['sep-live', 'sep-draft'])
  })

  it('a published campaign keeps the Edit action (edit, questions, reuse, close)', () => {
    const active = { status: 'Active', month: '2026-09', date: '1 Sep 2026', endDate: '30 Sep 2026' }
    const actions = getCampaignAllowedActions(active, '2026-09', now)
    expect(actions).toContain('edit')
    expect(actions).toContain('questions')
    expect(actions).toContain('reuse')
    expect(actions).toContain('close')
    expect(actions).not.toContain('publish')
    expect(actions).not.toContain('publishNow')
    expect(getCampaignAllowedActions({ status: 'Draft', month: '2026-09' }, '2026-09', now)).toEqual(['edit', 'publish', 'reuse'])
    expect(getCampaignAllowedActions({ status: 'Scheduled', month: '2026-09' }, '2026-09', now)).toEqual(['edit', 'publishNow', 'reuse'])
  })

  it('editing cannot reduce allocation below the already-used quantity', () => {
    expect(validateCampaignAllocation({ total: 120, general: 80, personal: 40, used: 80 })).toBeNull()
    expect(validateCampaignAllocation({ total: 60, general: 40, personal: 20, used: 80 })).toMatch(/below/i)
    expect(validateCampaignAllocation({ total: 200, general: 120, personal: 80, used: 80 })).toBeNull()
    expect(validateCampaignAllocation({ total: 200, general: 120, personal: 100 })).toMatch(/must add up/i)
  })

  it('reuse creates a new campaign ID and never copies usage, questions, payments, or allocation', () => {
    const reusable = createReusableCampaignDraft(source, '2026-09')
    const record = createCampaignRecord(reusable, { id: 'oct-health-2026' })
    expect(record.id).toBe('oct-health-2026')
    expect(record.id).not.toBe(source.id)
    expect(record.month).toBe('2026-10')
    expect(record.status).toBe('Draft')
    expect(record.totalLimit).toBe(0)
    expect(record.generalLimit).toBe(0)
    expect(record.personalLimit).toBe(0)
    expect(record.purchasedGeneral).toBe(0)
    expect(record.purchasedPersonal).toBe(0)
    expect(record.exampleQuestions).toEqual(source.exampleQuestions)
    expect(record.generalPrice).toBe(source.generalPrice)
    expect(record.personalPrice).toBe(source.personalPrice)
  })

  it('reuse lands inside the next calendar month only', () => {
    const reusable = createReusableCampaignDraft(source, '2026-09')
    expect(validateCampaignDateRange({ date: reusable.date, endDate: reusable.endDate, monthKey: '2026-10' })).toBeNull()
    expect(validateCampaignDateRange({ date: reusable.date, endDate: reusable.endDate, monthKey: '2026-09' })).toMatch(/stay within/i)
  })

  it('closing a campaign prevents new questions but preserves existing ones', () => {
    const closed = { id: 'sep-1', status: 'Closed', month: '2026-09', date: '1 Sep 2026', endDate: '30 Sep 2026' }
    const live = { ...closed, status: 'Active' }
    const questions = [
      { id: 'q1', astrologerId: 'astro-1', campaignId: 'sep-1', raisedAt: '2026-09-05T10:00:00+05:30' },
      { id: 'q2', astrologerId: 'astro-1', campaignId: 'sep-1', raisedAt: '2026-09-08T10:00:00+05:30' },
    ]
    expect(canCampaignAcceptNewQuestions(live, now)).toBe(true)
    expect(canCampaignAcceptNewQuestions(closed, now)).toBe(false)
    expect(countCampaignQuestionsInMonth(closed, questions, '2026-09', 'astro-1')).toBe(2)
    expect(countCampaignQuestionsInMonth(live, questions, '2026-09', 'astro-1')).toBe(2)
  })

  it('historical campaigns cannot be reopened through actions', () => {
    const historical = { status: 'Active', month: '2026-08', date: '5 Aug 2026', endDate: '31 Aug 2026' }
    const actions = getCampaignAllowedActions(historical, '2026-08', now)
    expect(actions).not.toContain('edit')
    expect(actions).not.toContain('publish')
    expect(actions).not.toContain('publishNow')
    expect(actions).not.toContain('close')
    expect(actions).toContain('reuse')
  })
})