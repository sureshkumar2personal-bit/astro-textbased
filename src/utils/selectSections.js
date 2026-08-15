export const TABS = ['all', 'work', 'money', 'clients', 'system']

export const TAB_TYPES = {
  all: null,
  work: ['question_new', 'question_expiring', 'booking_new', 'booking_cancelled', 'live_soon'],
  money: ['payout', 'sales_summary'],
  clients: ['client_message', 'review', 'follower'],
  system: ['system'],
}

// Only these types ever contribute to a tab's red count badge.
export const BADGE_TYPES = ['question_new', 'question_expiring', 'booking_new', 'live_soon', 'client_message']

function toTime(value) {
  return value ? new Date(value).getTime() : null
}

function hasActions(notification) {
  return Array.isArray(notification.actions) && notification.actions.length > 0
}

function isPastDeadline(notification, now) {
  const expiry = toTime(notification.expiresAt)
  return expiry != null && expiry <= now
}

function byNeedsActionOrder(a, b) {
  const aExpiry = toTime(a.expiresAt) ?? Infinity
  const bExpiry = toTime(b.expiresAt) ?? Infinity
  if (aExpiry !== bExpiry) return aExpiry - bExpiry
  return toTime(b.createdAt) - toTime(a.createdAt)
}

function byNewestFirst(a, b) {
  return toTime(b.createdAt) - toTime(a.createdAt)
}

/**
 * Pure selector: splits/filters/sorts notifications for a given tab into
 * the "Needs Action" and "Earlier" sections. Component-free, fully testable.
 *
 * @param {import('../data/mockNotifications.js').Notification[]} notifications
 * @param {string} activeTab one of TABS
 * @param {number} now Date.now()-style timestamp, used to demote items whose
 *   expiresAt has already passed out of "Needs Action"
 * @returns {{ key: string, title: string, data: object[] }[]}
 */
export function selectSections(notifications, activeTab, now) {
  const allowedTypes = TAB_TYPES[activeTab]
  const scoped = allowedTypes ? notifications.filter((n) => allowedTypes.includes(n.type)) : notifications

  const needsAction = []
  const earlier = []

  for (const notification of scoped) {
    if (hasActions(notification) && !isPastDeadline(notification, now)) {
      needsAction.push(notification)
    } else {
      earlier.push(notification)
    }
  }

  needsAction.sort(byNeedsActionOrder)
  earlier.sort(byNewestFirst)

  const sections = []
  if (needsAction.length > 0) {
    sections.push({ key: 'needs_action', title: 'Needs Action', data: needsAction })
  }
  if (earlier.length > 0) {
    sections.push({ key: 'earlier', title: 'Earlier', data: earlier })
  }
  return sections
}

/**
 * Pure selector: unread, actionable-type count per tab, for the tab bar badges.
 * @param {import('../data/mockNotifications.js').Notification[]} notifications
 * @returns {Record<string, number>}
 */
export function selectTabBadgeCounts(notifications) {
  const counts = { all: 0, work: 0, money: 0, clients: 0, system: 0 }

  for (const notification of notifications) {
    if (notification.read || !BADGE_TYPES.includes(notification.type)) continue
    counts.all += 1
    for (const tab of TABS) {
      const types = TAB_TYPES[tab]
      if (types && types.includes(notification.type)) counts[tab] += 1
    }
  }

  return counts
}
