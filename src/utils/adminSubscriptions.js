import { mockAstrologers } from '../data/notificationData.js'

// Pure selectors for the Admin -> Subscriptions module.
//
// Reads the subscriptions collection already exposed by AppDataContext, the same
// one the user subscription pages use. Nothing here creates a subscription record
// or reimplements subscribe, renew, cancel or discount-question behaviour.

// Subscription records always carry the astrologer name, but the catalog is used
// as a fallback so a record saved without one still shows a real name.
const ASTROLOGER_NAMES = new Map(mockAstrologers.map((astrologer) => [astrologer.id, astrologer.name]))

export function getSubscriptionUserName(subscription) {
  return subscription?.userName || subscription?.userId || ''
}

export function getSubscriptionAstrologerName(subscription) {
  return subscription?.astrologerName || ASTROLOGER_NAMES.get(subscription?.astrologerId) || ''
}

export function getSubscriptionPlan(subscription) {
  return subscription?.tier || ''
}

// Subscription records carry no lifecycle status field, so nothing is derived
// here. A value is returned only when the record actually has one.
export function getSubscriptionStatus(subscription) {
  return String(subscription?.status || '').trim()
}

// Filter options are derived from the records that actually exist, so the filter
// can only ever offer a status the data already contains.
export function selectSubscriptionStatusFilters(subscriptions) {
  const statuses = new Set()
  for (const subscription of Array.isArray(subscriptions) ? subscriptions : []) {
    const status = getSubscriptionStatus(subscription)
    if (status) statuses.add(status)
  }
  return ['All', ...Array.from(statuses).sort((a, b) => a.localeCompare(b))]
}

export function matchesSubscriptionQuery(subscription, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  return [getSubscriptionUserName(subscription), getSubscriptionAstrologerName(subscription)].some((field) =>
    String(field || '').toLowerCase().includes(search),
  )
}

export function filterAdminSubscriptions(subscriptions, { query = '', status = 'All' } = {}) {
  return (Array.isArray(subscriptions) ? subscriptions : []).filter((subscription) => {
    if (!matchesSubscriptionQuery(subscription, query)) return false
    if (status && status !== 'All' && getSubscriptionStatus(subscription) !== status) return false
    return true
  })
}

export function findAdminSubscription(subscriptions, subscriptionId) {
  return (Array.isArray(subscriptions) ? subscriptions : []).find((subscription) => subscription.id === subscriptionId) || null
}

// Subscriptions are keyed by userId + astrologerId, and the seeded entries have
// no `id` field, so the route param is resolved through this instead.
export function matchesSubscriptionKey(subscription, key) {
  if (!key) return false
  return subscription.id === key || `${subscription.userId}::${subscription.astrologerId}` === key
}

export function findAdminSubscriptionByKey(subscriptions, key) {
  return (Array.isArray(subscriptions) ? subscriptions : []).find((subscription) => matchesSubscriptionKey(subscription, key)) || null
}

export function getSubscriptionKey(subscription) {
  return subscription?.id || `${subscription?.userId}::${subscription?.astrologerId}`
}

export function getSubscriptionDiscountQuestionCount(subscription) {
  return Array.isArray(subscription?.discountQuestions) ? subscription.discountQuestions.length : 0
}
