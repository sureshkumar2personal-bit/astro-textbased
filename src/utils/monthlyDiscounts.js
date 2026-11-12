// Monthly one-question discount for subscribed astrologers.
//
// Core Business Rules:
// 1. A user subscribed to an astrologer is entitled to 1 question discount per month
//    for that subscribed astrologer.
// 2. Once used, the discount is marked as Used for the current month.
// 3. Next time the user buys or asks questions with that astrologer, they are charged
//    at the original rate (no discount re-applying).
// 4. "With many purchasing" (multi-slot packages / package purchases):
//    Slot packages are priced at standard original rates. The 1-question monthly
//    discount applies to a single-question booking only.

export const MONTHLY_DISCOUNT_STATUS = {
  AVAILABLE: 'Available',
  USED: 'Used',
  NONE: 'None',
}

export function startOfMonthKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function firstOfNextMonthMs(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const y = Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear()
  const m = Number.isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth()
  return new Date(y, m + 1, 1).getTime()
}

export function formatNextMonthName(date = new Date()) {
  const nextMs = firstOfNextMonthMs(date)
  return new Date(nextMs).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Derives the user's monthly discount entitlement for an astrologer.
 */
export function getMonthlyDiscountStatus(subscriptions = [], userId, astrologerId, now = new Date()) {
  if (!userId || !astrologerId) {
    return {
      isSubscribed: false,
      status: MONTHLY_DISCOUNT_STATUS.NONE,
      hasAvailableDiscount: false,
      discountPercent: 0,
      monthKey: startOfMonthKey(now),
    }
  }

  const sub = (subscriptions || []).find((s) => s.userId === userId && s.astrologerId === astrologerId)
  if (!sub) {
    return {
      isSubscribed: false,
      status: MONTHLY_DISCOUNT_STATUS.NONE,
      hasAvailableDiscount: false,
      discountPercent: 0,
      monthKey: startOfMonthKey(now),
    }
  }

  const monthKey = startOfMonthKey(now)
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const questions = Array.isArray(sub.discountQuestions) ? sub.discountQuestions : []

  // 1. Check if the user already used their monthly discount for this astrologer in this month
  const usedThisMonth = questions.find((dq) => (
    dq.status === 'Used' &&
    (!dq.monthKey || dq.monthKey === monthKey)
  ))
  if (usedThisMonth) {
    return {
      isSubscribed: true,
      status: MONTHLY_DISCOUNT_STATUS.USED,
      hasAvailableDiscount: false,
      usedAt: usedThisMonth.usedAt,
      monthKey,
      discountPercent: Number(usedThisMonth.discountPercent) || 0,
      nextAvailableMs: firstOfNextMonthMs(now),
      subscription: sub,
    }
  }

  // 2. Check for an explicit Available discount question for this month
  const available = questions.find((dq) => (
    dq.status === 'Available' &&
    (!dq.validUntil || dq.validUntil >= nowMs) &&
    (!dq.monthKey || dq.monthKey === monthKey)
  ))
  if (available) {
    return {
      isSubscribed: true,
      status: MONTHLY_DISCOUNT_STATUS.AVAILABLE,
      hasAvailableDiscount: true,
      discountPercent: Number(available.discountPercent) || (sub.tier === 'Gold' ? 75 : 60),
      discountQuestionId: available.id,
      monthKey,
      validUntil: available.validUntil,
      subscription: sub,
    }
  }

  // 3. Subscribed user without explicit record: eligible for 1 monthly discount question
  const defaultDiscount = sub.tier === 'Gold' ? 75 : 60
  return {
    isSubscribed: true,
    status: MONTHLY_DISCOUNT_STATUS.AVAILABLE,
    hasAvailableDiscount: true,
    discountPercent: defaultDiscount,
    discountQuestionId: `monthly-dq-${sub.astrologerId}-${monthKey}`,
    monthKey,
    validUntil: sub.expiresAt,
    subscription: sub,
  }
}

/**
 * Returns an updated subscriptions list with the monthly discount marked Used for this astrologer.
 */
export function useMonthlyDiscountRecord(subscriptions = [], userId, astrologerId, now = new Date()) {
  if (!userId || !astrologerId) return subscriptions
  const monthKey = startOfMonthKey(now)
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()

  return (subscriptions || []).map((sub) => {
    if (sub.userId !== userId || sub.astrologerId !== astrologerId) return sub
    const questions = Array.isArray(sub.discountQuestions) ? sub.discountQuestions : []
    const existing = questions.find((dq) => (
      dq.status === 'Available' && (!dq.monthKey || dq.monthKey === monthKey)
    ))

    if (existing) {
      return {
        ...sub,
        discountQuestions: questions.map((dq) => (
          dq.id === existing.id ? { ...dq, status: 'Used', usedAt: nowMs, monthKey } : dq
        )),
      }
    }

    // If no record existed yet, create one stamped Used
    const newUsed = {
      id: `dq-used-${astrologerId}-${monthKey}-${nowMs}`,
      status: 'Used',
      grantedAt: nowMs,
      usedAt: nowMs,
      monthKey,
      discountPercent: sub.tier === 'Gold' ? 75 : 60,
    }
    return {
      ...sub,
      discountQuestions: [...questions, newUsed],
    }
  })
}
