// "Pay Now, Ask Later" question credits.
//
// A credit is the receipt for a question the user has already paid for but has
// not written yet. Credits are not a second purchase system: each one is stored
// on the existing purchased-slot record for that campaign (see
// purchasedSlots[].credits), so the balance counters and the credit records
// always describe the same purchase.
//
// Status lifecycle:
//   Available -> Used     once the question is actually submitted
//   Available -> Expired  when the 7-day redemption window closes
// A credit is never marked Used just because payment succeeded.

export const QUESTION_CREDIT_WINDOW_DAYS = 7

export const QUESTION_CREDIT_AVAILABLE = 'Available'
export const QUESTION_CREDIT_USED = 'Used'
export const QUESTION_CREDIT_EXPIRED = 'Expired'

const DAY_MS = 24 * 60 * 60 * 1000

// The slot balances in the app already use these two values, so a credit's
// question type can be compared with a slot balance without translation.
export function normalizeQuestionCreditType(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'general') return 'General'
  return 'Personal'
}

export function getSlotTypeForQuestionType(value) {
  return normalizeQuestionCreditType(value)
}

function toMs(value) {
  if (value == null || value === '') return NaN
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? NaN : parsed
}

export function getQuestionCreditExpiryMs(purchasedAt, windowDays = QUESTION_CREDIT_WINDOW_DAYS) {
  const start = toMs(purchasedAt)
  if (!Number.isFinite(start)) return null
  const days = Math.max(Number(windowDays) || 0, 0)
  return start + days * DAY_MS
}

// Builds the credit record for a paid-but-unwritten question. campaignId stays
// null for Open Question, which is exactly how Open Question is modelled on a
// question record, so nothing new is introduced for that case.
export function createQuestionCreditRecord(payload = {}, { nowMs = Date.now(), id = null } = {}) {
  const originalPrice = Math.max(Number(payload.originalPrice) || 0, 0)
  const paidPriceRaw = Number(payload.paidPrice)
  const paidPrice = Number.isFinite(paidPriceRaw) ? Math.max(paidPriceRaw, 0) : originalPrice
  const expiresAtMs = getQuestionCreditExpiryMs(nowMs, payload.windowDays ?? QUESTION_CREDIT_WINDOW_DAYS)

  return {
    id: id || `QCR-${String(nowMs).slice(-8)}-${Math.max(Math.floor(Math.random() * 90) + 10, 10)}`,
    userId: payload.userId || '',
    userEmail: payload.userEmail || '',
    astrologerId: payload.astrologerId || null,
    astrologerName: payload.astrologerName || 'Astrologer',
    subscriptionId: payload.subscriptionId || '',
    campaignId: payload.campaignId || null,
    campaignName: payload.campaignName || null,
    isOpenQuestion: !payload.campaignId,
    questionType: normalizeQuestionCreditType(payload.questionType),
    originalPrice,
    paidPrice,
    offerEnabled: payload.offerEnabled !== false,
    discountPercent: Math.max(Number(payload.discountPercent) || 0, 0),
    discountAmount: Math.max(Number(payload.discountAmount) || 0, 0),
    purchasedAt: new Date(nowMs).toISOString(),
    expiresAt: expiresAtMs == null ? null : new Date(expiresAtMs).toISOString(),
    status: QUESTION_CREDIT_AVAILABLE,
    usedAt: null,
    questionId: null,
  }
}

// Derived status: the stored status is never rewritten on a timer, the expiry
// boundary is simply evaluated whenever the credit is read.
export function getQuestionCreditStatus(credit = {}, nowMs = Date.now()) {
  if (!credit) return null
  if (credit.usedAt || credit.status === QUESTION_CREDIT_USED) return QUESTION_CREDIT_USED
  const expiresMs = toMs(credit.expiresAt)
  if (Number.isFinite(expiresMs) && nowMs >= expiresMs) return QUESTION_CREDIT_EXPIRED
  return QUESTION_CREDIT_AVAILABLE
}

export function isQuestionCreditRedeemable(credit, nowMs = Date.now()) {
  return getQuestionCreditStatus(credit, nowMs) === QUESTION_CREDIT_AVAILABLE
}

export function getQuestionCreditDaysRemaining(credit = {}, nowMs = Date.now()) {
  const expiresMs = toMs(credit.expiresAt)
  if (!Number.isFinite(expiresMs)) return 0
  return Math.max(0, Math.ceil((expiresMs - nowMs) / DAY_MS))
}

// Offer chips stay visible for an unused credit so the user can see what they
// paid for. discountPercent is copied from the live campaign at purchase time,
// so the offer is never recalculated and never consumed early.
export function getQuestionCreditOfferLabel(credit = {}) {
  if (!(Number(credit.discountPercent) > 0)) return ''
  return `${Number(credit.discountPercent)}% OFF`
}

export function getQuestionCreditTitle(credit = {}) {
  return credit.isOpenQuestion || !credit.campaignId ? 'Purchased Question · Open Question' : 'Purchased Question'
}

export function getQuestionCreditSourceLabel(credit = {}) {
  if (!credit.campaignId) return 'Open Question'
  return credit.campaignName || credit.campaignId
}

// Flattens the credits that already live on the purchased-slot records.
export function getQuestionCreditsFromSlots(purchasedSlots = []) {
  if (!Array.isArray(purchasedSlots)) return []
  return purchasedSlots.flatMap((slot) => (
    (Array.isArray(slot?.credits) ? slot.credits : []).map((credit) => ({ ...credit, slotId: slot.id }))
  ))
}

export function isQuestionCreditOwnedByUser(credit = {}, user) {
  if (!user?.id && !user?.email) return false
  if (user.id && credit.userId) return credit.userId === user.id
  if (user.email && credit.userEmail) return credit.userEmail === user.email
  return false
}

export function getQuestionCreditsForUser(purchasedSlots = [], user, nowMs = Date.now()) {
  return getQuestionCreditsFromSlots(purchasedSlots)
    .filter((credit) => isQuestionCreditOwnedByUser(credit, user))
    .map((credit) => ({ ...credit, status: getQuestionCreditStatus(credit, nowMs) }))
    .sort((a, b) => toMs(a.expiresAt) - toMs(b.expiresAt))
}

export function getAvailableQuestionCredits(purchasedSlots = [], user, nowMs = Date.now()) {
  return getQuestionCreditsForUser(purchasedSlots, user, nowMs)
    .filter((credit) => credit.status === QUESTION_CREDIT_AVAILABLE)
}

// Finds the credit that a submission should consume: an explicit creditId wins,
// otherwise the oldest still-available credit for the same campaign and question
// type. Only Available credits match, so an expired credit can never be used.
export function findQuestionCreditForSubmission(credits = [], { userId, campaignId = null, questionType, creditId = null, nowMs = Date.now() } = {}) {
  const available = credits.filter((credit) => isQuestionCreditRedeemable(credit, nowMs))
  const byId = creditId ? available.find((credit) => credit.id === creditId) : null
  if (byId) return byId

  const wantedType = normalizeQuestionCreditType(questionType)
  return available.find((credit) => (
    (credit.userId || '') === (userId || '')
    && (credit.campaignId || null) === (campaignId || null)
    && credit.questionType === wantedType
  )) || null
}

export function markQuestionCreditUsed(credit = {}, questionId = null, nowMs = Date.now()) {
  return {
    ...credit,
    status: QUESTION_CREDIT_USED,
    usedAt: new Date(nowMs).toISOString(),
    questionId: questionId || credit.questionId || null,
  }
}

function isSameSlot(a, b) {
  return (a.userId || '') === (b.userId || '') && (a.campaignId || null) === (b.campaignId || null)
}

// Stores a credit on the purchased-slot record that already owns this campaign
// for this user, creating that record when the user has no package yet. The
// existing General/Personal balance counters move with the credit, so the slot
// cards and the credit list always describe the same purchase.
export function upsertQuestionCreditInSlots(list = [], credit) {
  if (!credit) return list
  const index = list.findIndex((slot) => isSameSlot(slot, credit))
  const nextCredits = [...(list[index]?.credits || []), credit]

  if (index === -1) {
    return [...list, {
      id: credit.slotId || `slot-${credit.id}`,
      userId: credit.userId,
      campaignId: credit.campaignId,
      astrologerId: credit.astrologerId || 'astrologer-demo',
      generalPurchased: credit.questionType === 'General' ? 1 : 0,
      generalUsed: 0,
      personalPurchased: credit.questionType === 'Personal' ? 1 : 0,
      personalUsed: 0,
      credits: nextCredits,
    }]
  }

  return list.map((slot, position) => {
    if (position !== index) return slot
    return {
      ...slot,
      ...(credit.questionType === 'General'
        ? { generalPurchased: (Number(slot.generalPurchased) || 0) + 1 }
        : { personalPurchased: (Number(slot.personalPurchased) || 0) + 1 }),
      credits: nextCredits,
    }
  })
}

// Marks the credit a submission consumed as Used and stamps the resulting
// questionId. Expired or already-used credits are never matched, so an expired
// purchase can never be redeemed. Returns the list unchanged when nothing
// matched, which keeps a slot-only submission working exactly as before.
export function consumeQuestionCreditInSlots(list = [], { creditId = null, userId, campaignId = null, questionType, questionId, nowMs = Date.now() } = {}) {
  const match = findQuestionCreditForSubmission(getQuestionCreditsFromSlots(list), {
    userId,
    campaignId,
    questionType,
    creditId,
    nowMs,
  })
  if (!match) return list

  return list.map((slot) => {
    if (slot.id !== match.slotId) return slot
    return {
      ...slot,
      credits: (slot.credits || []).map((credit) => (
        credit.id === match.id ? markQuestionCreditUsed(credit, questionId, nowMs) : credit
      )),
    }
  })
}