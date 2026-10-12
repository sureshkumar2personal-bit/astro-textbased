// Purchased question slots (quantity packages).
//
// A purchased slot record is the source of truth for a bought question package:
// it carries the General/Personal counters that the Ask Question flow consumes,
// and - from the moment of purchase - a `pricing` snapshot recorded at the time
// the payment happened. The snapshot is deliberately immutable: an existing paid
// package must never be re-priced from whatever the campaign costs today.
//
// Legacy records created before pricing was recorded simply have no `pricing`;
// readers must treat that as "not recorded" rather than as a ₹0 payment.

import { getDiscountPreview } from './questions.js'

export const SLOT_STATUS_AVAILABLE = 'Available'
export const SLOT_STATUS_USED = 'Used'

function toFiniteNumber(value) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// General/Personal purchased, used and remaining counts, clamped so a used count
// can never exceed what was purchased.
export function getSlotTypeTotals(slot = {}) {
  const generalPurchased = Math.max(toFiniteNumber(slot.generalPurchased) || 0, 0)
  const generalUsed = Math.min(Math.max(toFiniteNumber(slot.generalUsed) || 0, 0), generalPurchased)
  const personalPurchased = Math.max(toFiniteNumber(slot.personalPurchased) || 0, 0)
  const personalUsed = Math.min(Math.max(toFiniteNumber(slot.personalUsed) || 0, 0), personalPurchased)

  return {
    generalPurchased,
    generalUsed,
    personalPurchased,
    personalUsed,
    generalRemaining: generalPurchased - generalUsed,
    personalRemaining: personalPurchased - personalUsed,
    totalPurchased: generalPurchased + personalPurchased,
    totalUsed: generalUsed + personalUsed,
    totalRemaining: (generalPurchased - generalUsed) + (personalPurchased - personalUsed),
  }
}

export function getSlotStatus(slot = {}) {
  return getSlotTypeTotals(slot).totalRemaining > 0 ? SLOT_STATUS_AVAILABLE : SLOT_STATUS_USED
}

// Builds the recorded pricing snapshot for one package purchase. Quantity and
// per-question prices build the original amount; the discount rule is the same
// getDiscountPreview every other price in the app uses, so a package is never
// discounted twice. Explicit amounts win so a real receipt can be recorded
// verbatim.
export function buildSlotPricing({
  generalQty = 0,
  personalQty = 0,
  generalPrice = 0,
  personalPrice = 0,
  discountPercent = 0,
  originalAmount = null,
  discountAmount = null,
  paidAmount = null,
  purchasedAt = null,
  packageName = '',
  paymentStatus = 'Paid',
  isDemo = false,
} = {}) {
  const quantityOriginal = (Math.max(toFiniteNumber(generalQty) || 0, 0) * Math.max(toFiniteNumber(generalPrice) || 0, 0))
    + (Math.max(toFiniteNumber(personalQty) || 0, 0) * Math.max(toFiniteNumber(personalPrice) || 0, 0))
  const explicitOriginal = toFiniteNumber(originalAmount)
  const original = explicitOriginal != null ? Math.max(explicitOriginal, 0) : quantityOriginal
  const preview = getDiscountPreview(original, discountPercent)

  return {
    originalAmount: preview.originalPrice,
    discountPercent: preview.discountPercent,
    discountAmount: discountAmount != null ? Math.max(toFiniteNumber(discountAmount) || 0, 0) : preview.discountAmount,
    paidAmount: paidAmount != null ? Math.max(toFiniteNumber(paidAmount) || 0, 0) : preview.offerPrice,
    purchasedAt: purchasedAt || new Date().toISOString(),
    paymentStatus,
    packageName: packageName || '',
    currency: 'INR',
    isDemo: Boolean(isDemo),
  }
}

// Adds a second package purchase onto the same slot record without losing the
// earlier receipt: amounts accumulate and the effective discount is recomputed
// from the combined totals.
export function mergeSlotPricing(existing, next) {
  if (!existing) return next
  if (!next) return existing
  const originalAmount = (toFiniteNumber(existing.originalAmount) || 0) + (toFiniteNumber(next.originalAmount) || 0)
  const discountAmount = (toFiniteNumber(existing.discountAmount) || 0) + (toFiniteNumber(next.discountAmount) || 0)
  const paidAmount = (toFiniteNumber(existing.paidAmount) || 0) + (toFiniteNumber(next.paidAmount) || 0)
  return {
    ...existing,
    ...next,
    originalAmount,
    discountAmount,
    paidAmount,
    discountPercent: originalAmount > 0 ? Math.round((discountAmount / originalAmount) * 100) : 0,
    packageName: next.packageName || existing.packageName || '',
    purchasedAt: next.purchasedAt || existing.purchasedAt || null,
    paymentStatus: next.paymentStatus || existing.paymentStatus || 'Paid',
  }
}

// Normalised, display-ready view of a slot's recorded pricing. Returns null when
// the record has no pricing at all so callers can show "not recorded" instead of
// inventing a ₹0 payment.
export function getSlotPricingView(slot = {}) {
  const pricing = slot && typeof slot.pricing === 'object' && slot.pricing ? slot.pricing : null
  if (!pricing) return null

  const originalAmount = toFiniteNumber(pricing.originalAmount)
  const discountAmount = toFiniteNumber(pricing.discountAmount)
  const paidAmount = toFiniteNumber(pricing.paidAmount)
  if (originalAmount == null && discountAmount == null && paidAmount == null) return null

  return {
    packageName: pricing.packageName || '',
    originalAmount: originalAmount == null ? null : Math.max(originalAmount, 0),
    discountPercent: Math.max(toFiniteNumber(pricing.discountPercent) || 0, 0),
    discountAmount: discountAmount == null ? null : Math.max(discountAmount, 0),
    paidAmount: paidAmount == null ? null : Math.max(paidAmount, 0),
    purchasedAt: pricing.purchasedAt || null,
    paymentStatus: pricing.paymentStatus || 'Paid',
    currency: pricing.currency || 'INR',
    isDemo: Boolean(pricing.isDemo),
  }
}

// Whole-rupee display. Never shows ₹0 for an unknown amount - callers get an
// em dash so a missing value reads as missing, not as free.
export function formatSlotAmount(value) {
  const amount = toFiniteNumber(value)
  if (amount == null) return '—'
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export function formatSlotPurchaseDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function isSlotOwnedByUser(slot = {}, user) {
  if (!user?.id && !user?.email) return false
  if (user.id && slot.userId) return slot.userId === user.id
  if (user.email && slot.userEmail) return slot.userEmail === user.email
  return false
}

export function getPurchasedSlotsForUser(purchasedSlots = [], user) {
  if (!Array.isArray(purchasedSlots)) return []
  return purchasedSlots.filter((slot) => isSlotOwnedByUser(slot, user))
}

// Flattens a user's purchased slots into one card per question type, shared by
// the astrologer-specific slot list, the consolidated dashboard view and the
// Ask Question chooser step. `includeUsed` keeps fully-used slots visible with a
// Used status instead of hiding them.
export function getSlotTypeCards(purchasedSlots = [], user, { campaigns = [], astrologers = [], includeUsed = true } = {}) {
  const campaignById = new Map((campaigns || []).map((campaign) => [campaign.id, campaign]))
  const astrologerById = new Map((astrologers || []).map((astrologer) => [astrologer.id, astrologer]))

  return getPurchasedSlotsForUser(purchasedSlots, user).flatMap((slot) => {
    const totals = getSlotTypeTotals(slot)
    const campaign = campaignById.get(slot.campaignId) || null
    const astrologerName = slot.astrologerName
      || astrologerById.get(slot.astrologerId)?.name
      || campaign?.astrologerName
      || 'Astrologer'
    const campaignName = campaign?.name || slot.campaignName || slot.campaignId || 'Question package'
    const pricing = getSlotPricingView(slot)
    const base = {
      slot,
      campaign,
      campaignId: slot.campaignId,
      campaignName,
      astrologerId: slot.astrologerId || campaign?.astrologerId || null,
      astrologerName,
      pricing,
      demo: Boolean(slot.demo) || Boolean(pricing?.isDemo),
      schedule: campaign ? `${campaign.date} – ${campaign.endDate}` : '',
      status: getSlotStatus(slot),
    }

    const cards = []
    if (totals.generalPurchased > 0 && (includeUsed || totals.generalRemaining > 0)) {
      cards.push({
        ...base,
        key: `${slot.id}-General`,
        type: 'General',
        purchased: totals.generalPurchased,
        used: totals.generalUsed,
        remaining: totals.generalRemaining,
      })
    }
    if (totals.personalPurchased > 0 && (includeUsed || totals.personalRemaining > 0)) {
      cards.push({
        ...base,
        key: `${slot.id}-Individual`,
        type: 'Individual',
        purchased: totals.personalPurchased,
        used: totals.personalUsed,
        remaining: totals.personalRemaining,
      })
    }
    return cards
  })
}
