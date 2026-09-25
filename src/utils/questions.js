import { parseDisplayDate } from './date.js'

export const MONTHLY_QUESTION_CAPACITY = 2500

export function getCampaignAllocation(campaign = {}) {
  const total = Number(campaign.totalLimit)
  if (Number.isFinite(total) && total > 0) return Math.max(total, 0)
  const general = Number(campaign.generalLimit) || 0
  const personal = Number(campaign.personalLimit) || 0
  return Math.max(general + personal, 0)
}

export function getCampaignUsed(campaign = {}) {
  return Math.max((Number(campaign.purchasedGeneral) || 0) + (Number(campaign.purchasedPersonal) || 0), 0)
}

export function getCampaignRemaining(campaign = {}) {
  return Math.max(getCampaignAllocation(campaign) - getCampaignUsed(campaign), 0)
}

export function getCampaignQuestionTypes(campaign = {}) {
  if (Array.isArray(campaign.questionTypes) && campaign.questionTypes.length > 0) {
    return campaign.questionTypes.filter((type) => type === 'General' || type === 'Personal')
  }
  const types = []
  if ((Number(campaign.generalLimit) || 0) > 0) types.push('General')
  if ((Number(campaign.personalLimit) || 0) > 0) types.push('Personal')
  return types.length > 0 ? types : ['General', 'Personal']
}

export function getDiscountPreview(price, percent) {
  const originalPrice = Math.max(Number(price) || 0, 0)
  const discountPercent = Math.min(Math.max(Number(percent) || 0, 0), 100)
  const discountAmount = Math.round((originalPrice * discountPercent) / 100)
  return {
    originalPrice,
    discountPercent,
    discountAmount,
    offerPrice: Math.max(originalPrice - discountAmount, 0),
  }
}

export function sumCampaignAllocations(campaigns = []) {
  return campaigns.reduce((sum, campaign) => sum + getCampaignAllocation(campaign), 0)
}

export function getOpenQuestionCapacity(openSettings = {}) {
  return Math.max(Number(openSettings.capacity) || 0, 0)
}

export function getMonthKeyFromDate(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getQuestionMonthKey(question = {}, fallbackDate = new Date()) {
  const iso = question.raisedAt || question.submittedAt
  const parsed = iso ? new Date(iso) : parseDisplayDate(question.raised)
  const safe = Number.isNaN(parsed.getTime()) ? fallbackDate : parsed
  return getMonthKeyFromDate(safe)
}

export function countQuestionsInMonth(questions = [], astrologerId, monthKey, fallbackDate = new Date()) {
  if (!monthKey) return 0
  return questions.filter((question) => {
    if (astrologerId && (question.astrologerId || 'astrologer-demo') !== astrologerId) return false
    if (question.status === 'Closed') return false
    return getQuestionMonthKey(question, fallbackDate) === monthKey
  }).length
}

export function getMonthlyCapacitySummary({ campaigns = [], openSettings = {}, questions = [], astrologerId, now = new Date(), monthKey = null } = {}) {
  const capacity = MONTHLY_QUESTION_CAPACITY
  const key = monthKey || getMonthKeyFromDate(now) || ''
  const applicableCampaigns = key
    ? campaigns.filter((campaign) => campaignAppliesToMonth(campaign, key))
    : campaigns
  const campaignAllocation = sumCampaignAllocations(applicableCampaigns)
  const openAllocation = getOpenQuestionCapacity(openSettings)
  const allocated = campaignAllocation + openAllocation
  const remaining = Math.max(capacity - allocated, 0)
  const used = countQuestionsInMonth(questions, astrologerId, key, now)
  return {
    capacity,
    campaignAllocation,
    openAllocation,
    allocated,
    remainingAllocation: remaining,
    used,
    remaining,
    monthKey: key,
  }
}

export function getMonthBounds(monthKey) {
  const parts = String(monthKey || '').split('-').map(Number)
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null
  return {
    start: new Date(parts[0], parts[1] - 1, 1),
    end: new Date(parts[0], parts[1], 0, 23, 59, 59, 999),
  }
}

export function getMonthLabel(monthKey) {
  const bounds = getMonthBounds(monthKey)
  if (!bounds) return ''
  return bounds.start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function shiftMonthKey(monthKey, delta) {
  const bounds = getMonthBounds(monthKey)
  if (!bounds) return monthKey
  const shifted = new Date(bounds.start.getFullYear(), bounds.start.getMonth() + Number(delta || 0), 1)
  return getMonthKeyFromDate(shifted)
}

function parseCampaignDate(value) {
  if (value instanceof Date) return new Date(value.getTime())
  const text = String(value == null ? '' : value).trim()
  const isoParts = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/)
  if (isoParts) return new Date(Number(isoParts[1]), Number(isoParts[2]) - 1, Number(isoParts[3]))
  const parsed = parseDisplayDate(text)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() === 0) return null
  return parsed
}

export function getCampaignMonthKey(value) {
  const date = parseCampaignDate(value)
  return date ? getMonthKeyFromDate(date) : null
}

function toMonthIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getCampaignCalendarMonth(campaign = {}) {
  const explicit = campaign.month || campaign.monthKey
  if (explicit) return String(explicit)
  const startMonth = getCampaignMonthKey(campaign.date)
  const endMonth = getCampaignMonthKey(campaign.endDate)
  if (startMonth && endMonth) return startMonth === endMonth ? startMonth : startMonth
  return startMonth || endMonth || null
}

export function getCampaignDateRange(monthKey) {
  const bounds = getMonthBounds(monthKey)
  if (!bounds) return null
  return { min: toMonthIso(bounds.start), max: toMonthIso(bounds.end) }
}

export function validateCampaignDateRange({ date, endDate, monthKey } = {}) {
  if (!monthKey) return 'Choose a campaign month before setting dates.'
  const start = parseCampaignDate(date)
  const end = parseCampaignDate(endDate)
  if (!start || !end) return 'Select a valid start and end date.'
  if (start.getTime() > end.getTime()) return 'End date must be on or after the start date.'
  const startMonth = getMonthKeyFromDate(start)
  const endMonth = getMonthKeyFromDate(end)
  const range = getMonthBounds(monthKey)
  const label = getMonthLabel(monthKey)
  if (startMonth !== monthKey || start.getTime() < range.start.getTime() || start > range.end) {
    return `Campaign dates must stay within ${label}. The start date cannot be before ${toMonthIso(range.start)} or outside the month.`
  }
  if (endMonth !== monthKey || end.getTime() > range.end.getTime()) {
    return `Campaign dates must stay within ${label}. The end date cannot go beyond ${toMonthIso(range.end)} or into another month.`
  }
  return null
}

export function validateCampaignAllocation({ total = 0, general = 0, personal = 0, used = 0 } = {}) {
  const t = Math.max(Number(total) || 0, 0)
  const g = Math.max(Number(general) || 0, 0)
  const p = Math.max(Number(personal) || 0, 0)
  if (t <= 0) return 'Allocate at least one question slot to this campaign.'
  if (g + p !== t) return `General and Personal slots must add up to the campaign allocation (${g} + ${p} = ${g + p}, expected ${t}).`
  if (t < used) return `Allocation cannot be reduced below the ${used} questions already answered through this campaign.`
  return null
}

export function canCampaignAcceptNewQuestions(campaign = {}, nowIso) {
  if (String(campaign.status || '') !== 'Active') return false
  const now = new Date(nowIso || Date.now())
  const start = parseCampaignDate(campaign.date)
  const end = parseCampaignDate(campaign.endDate)
  if (start && now.getTime() < start.getTime()) return false
  if (end) {
    const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
    if (now.getTime() > lastDay.getTime()) return false
  }
  return true
}

export function getCampaignAllowedActions(campaign = {}, monthKey, nowIso) {
  const display = getCampaignDisplayStatus(campaign, monthKey, nowIso)
  const status = String(campaign.status || 'Draft')
  const actions = []
  if (display === 'Active' || display === 'Scheduled' || display === 'Draft') actions.push('edit')
  if (status === 'Draft' && display !== 'Closed') actions.push('publish')
  if (status === 'Scheduled' && display !== 'Closed') actions.push('publishNow')
  if (display === 'Active' && status === 'Active') actions.push('close')
  if (display === 'Active') actions.push('questions')
  actions.push('reuse')
  return actions
}

const CLOSED_CAMPAIGN_STATUSES = new Set(['Closed', 'Completed', 'Cancelled', 'Expired', 'Paused'])

export function getCampaignDisplayStatus(campaign = {}, monthKey, nowIso) {
  const now = new Date(nowIso || Date.now())
  const currentMonth = getMonthKeyFromDate(now)
  if (monthKey && currentMonth && monthKey < currentMonth) return 'Closed'
  const status = String(campaign.status || 'Draft')
  if (status === 'Draft') return 'Draft'
  if (status === 'Scheduled') return 'Scheduled'
  if (CLOSED_CAMPAIGN_STATUSES.has(status)) return 'Closed'
  const start = parseCampaignDate(campaign.date)
  const end = parseCampaignDate(campaign.endDate)
  if (start && now.getTime() < start.getTime()) return 'Scheduled'
  if (end) {
    const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
    if (now.getTime() > lastDay.getTime()) return 'Closed'
  }
  return 'Active'
}

function resolveMonthContext(monthKey, referenceDate = new Date()) {
  if (typeof monthKey === 'string') {
    return { monthKey, now: referenceDate }
  }
  const now = monthKey instanceof Date ? monthKey : referenceDate
  return { monthKey: getMonthKeyFromDate(now) || '', now }
}

export function campaignAppliesToMonth(campaign = {}, monthKey) {
  if (!monthKey) return true
  const bounds = getMonthBounds(monthKey)
  if (!bounds) return true
  const start = parseCampaignDate(campaign.date)
  const end = parseCampaignDate(campaign.endDate)
  if (!start || !end) return true
  return start.getTime() <= bounds.end.getTime() && end.getTime() >= bounds.start.getTime()
}

const ACTIVE_CAMPAIGN_STATUSES = new Set(['Active', 'Published'])

export function getEffectiveCampaignStatus(campaign = {}, referenceDate = new Date()) {
  const status = String(campaign.status || 'Draft')
  if (!ACTIVE_CAMPAIGN_STATUSES.has(status)) return status
  const end = parseCampaignDate(campaign.endDate)
  if (!end) return status
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
  if (lastDay.getTime() < new Date(referenceDate).getTime()) return 'Expired'
  return status
}

function getCampaignsForMonth(campaigns, monthKey) {
  return monthKey ? campaigns.filter((campaign) => getCampaignCalendarMonth(campaign) === monthKey) : campaigns.slice()
}

export function getCampaignMetricCounts(campaigns = [], monthKey, referenceDate = new Date()) {
  const { monthKey: key, now } = resolveMonthContext(monthKey, referenceDate)
  const applicable = getCampaignsForMonth(campaigns, key)
  let active = 0
  let scheduled = 0
  let draft = 0
  applicable.forEach((campaign) => {
    const status = getCampaignDisplayStatus(campaign, key, now)
    if (status === 'Active') active += 1
    else if (status === 'Scheduled') scheduled += 1
    else if (status === 'Draft') draft += 1
  })
  return { total: applicable.length, active, scheduled, draft }
}

export function filterCampaignsByStatus(campaigns = [], filter = 'All', monthKey, referenceDate = new Date()) {
  const { monthKey: key, now } = resolveMonthContext(monthKey, referenceDate)
  const applicable = getCampaignsForMonth(campaigns, key)
  if (filter === 'All') return applicable
  const wanted = filter === 'Active' ? 'Active' : filter === 'Scheduled' ? 'Scheduled' : filter === 'Draft' ? 'Draft' : filter
  return applicable.filter((campaign) => getCampaignDisplayStatus(campaign, key, now) === wanted)
}

export function countCampaignQuestionsInMonth(campaign = {}, questions = [], monthKey, astrologerId) {
  if (!campaign || !campaign.id) return getCampaignUsed(campaign)
  const related = questions.filter((question) => (question.campaignId || question.campaign) === campaign.id)
  return countQuestionsInMonth(related, astrologerId, monthKey)
}

export function doesAllocationSplitMatch(allocated, general, personal) {
  return (Number(general) || 0) + (Number(personal) || 0) === Number(allocated || 0)
}

export function getCampaignDiscountPercent(payload = {}) {
  return payload.discountEnabled
    ? Number(payload.discountPercent) || 0
    : payload.offerEnabled === false
      ? 0
      : Number(payload.discountPercent) || 0
}

export function formatCampaignDate(input) {
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return input
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function createCampaignRecord(payload = {}, options = {}) {
  const questionTypes = (Array.isArray(payload.questionTypes) && payload.questionTypes.length > 0)
    ? payload.questionTypes.filter((type) => type === 'General' || type === 'Personal')
    : getCampaignQuestionTypes(payload)
  const discountPercent = getCampaignDiscountPercent(payload)
  const record = {
    id: options.id || null,
    name: String(payload.name || '').trim(),
    month: payload.month || getCampaignCalendarMonth(payload) || null,
    date: formatCampaignDate(payload.date),
    endDate: formatCampaignDate(payload.endDate),
    priority: payload.priority || 'Medium',
    status: payload.status || 'Draft',
    scheduledPublishAt: payload.scheduledPublishAt || null,
    templateId: payload.templateId || null,
    categories: Array.isArray(options.categories)
      ? options.categories
      : Array.isArray(payload.categories)
        ? payload.categories
        : [],
    shortDescription: String(payload.shortDescription || '').trim(),
    description: String(payload.description || '').trim(),
    whatUsersCanAsk: String(payload.whatUsersCanAsk || '').trim(),
    exampleQuestions: Array.isArray(payload.exampleQuestions)
      ? payload.exampleQuestions.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    questionTypes,
    offerEnabled: payload.offerEnabled !== undefined
      ? Boolean(payload.offerEnabled)
      : Boolean(payload.discountEnabled ?? (Number(payload.discountPercent) > 0)),
    discountPercent,
    generalOffer: payload.offerEnabled !== undefined ? Boolean(payload.offerEnabled) : Boolean(payload.discountEnabled ?? payload.generalOffer),
    personalOffer: payload.offerEnabled !== undefined ? Boolean(payload.offerEnabled) : Boolean(payload.discountEnabled ?? payload.personalOffer),
    generalPrice: Number(payload.generalPrice) || 0,
    personalPrice: Number(payload.personalPrice) || 0,
    packagePrice: Number(payload.packagePrice) || 0,
    purchasedGeneral: 0,
    purchasedPersonal: 0,
    totalLimit: Number(payload.totalLimit) || 0,
    generalLimit: Number(payload.generalLimit) || 0,
    personalLimit: Number(payload.personalLimit) || 0,
  }
  if (!questionTypes.includes('General')) {
    record.generalLimit = 0
    record.generalPrice = 0
  }
  if (!questionTypes.includes('Personal')) {
    record.personalLimit = 0
    record.personalPrice = 0
  }
  return record
}

export function validateCapacityAllocation({ baseAllocation = 0, proposedAllocation = 0, capacity = MONTHLY_QUESTION_CAPACITY } = {}) {
  const base = Math.max(Number(baseAllocation) || 0, 0)
  const proposed = Number(proposedAllocation)
  if (!Number.isFinite(proposed) || proposed < 0) return 'Enter a valid slot allocation.'
  if (proposed > capacity - base) {
    return `Total allocation of ${capacity} slots would be exceeded for the month. Already allocated outside this campaign: ${base}. Remaining available: ${capacity - base}.`
  }
  return null
}

export function splitCampaignAllocation(total, questionTypes) {
  const safe = Math.max(Number(total) || 0, 0)
  const general = questionTypes.includes('General')
  const personal = questionTypes.includes('Personal')
  if (general && !personal) return { generalLimit: safe, personalLimit: 0 }
  if (!general && personal) return { generalLimit: 0, personalLimit: safe }
  const generalLimit = Math.ceil(safe / 2)
  return { generalLimit, personalLimit: safe - generalLimit }
}

export function getReuseCampaignDates(monthKey) {
  const bounds = getMonthBounds(monthKey)
  if (!bounds) return { date: '', endDate: '' }
  const start = new Date(bounds.start.getFullYear(), bounds.start.getMonth() + 1, 1)
  const end = new Date(bounds.start.getFullYear(), bounds.start.getMonth() + 2, 0)
  const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return { date: toIso(start), endDate: toIso(end) }
}

export function createReusableCampaignDraft(campaign = {}, monthKey) {
  const next = getReuseCampaignDates(monthKey)
  return {
    name: String(campaign.name || '').trim(),
    month: shiftMonthKey(monthKey, 1),
    shortDescription: String(campaign.shortDescription || '').trim(),
    description: String(campaign.description || '').trim(),
    whatUsersCanAsk: String(campaign.whatUsersCanAsk || '').trim(),
    exampleQuestions: Array.isArray(campaign.exampleQuestions)
      ? campaign.exampleQuestions.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    questionTypes: getCampaignQuestionTypes(campaign),
    generalPrice: Number(campaign.generalPrice) || 0,
    personalPrice: Number(campaign.personalPrice) || 0,
    offerEnabled: campaign.offerEnabled !== undefined
      ? Boolean(campaign.offerEnabled)
      : Boolean(Number(campaign.discountPercent) > 0),
    discountPercent: Number(campaign.discountPercent) || 0,
    templateId: campaign.templateId || null,
    date: next.date,
    endDate: next.endDate,
    totalLimit: 0,
    generalLimit: 0,
    personalLimit: 0,
    status: 'Draft',
  }
}

export function getCampaignDependencyState(campaign = {}, { questions = [], purchasedSlots = [] } = {}) {
  const id = campaign.id
  const questionCount = questions.filter((question) => (question.campaignId || question.campaign) === id).length
  const purchaseCount = purchasedSlots.filter((slot) => slot.campaignId === id).length
  return {
    questions: questionCount,
    purchases: purchaseCount,
    protected: questionCount + purchaseCount > 0,
  }
}

export function confirmDeleteCampaign(campaign = {}, dependencies = null, { confirmed = false, questions = [], purchasedSlots = [] } = {}) {
  if (!confirmed) return { ok: false, reason: 'Deletion requires confirmation.' }
  const state = dependencies || getCampaignDependencyState(campaign, { questions, purchasedSlots })
  if (state.protected) {
    return {
      ok: false,
      reason: 'This campaign has customer questions or purchases and cannot be deleted. Close the campaign instead.',
    }
  }
  return { ok: true }
}