// Purchase records shown on the Purchased Questions tab.
//
// The summary counts and the list filters must classify the same purchase
// records the same way, so both are derived here from one record list. A slot
// card is an entitlement: Available while any purchased slot of that type
// remains, Used only once every purchased slot has been consumed - a partially
// used package stays Available and is never fully Used. A credit keeps the
// Available/Used/Expired status the existing credit model derives from its
// usedAt/expiresAt fields, never a stored display label.

import {
  QUESTION_CREDIT_AVAILABLE,
  QUESTION_CREDIT_EXPIRED,
  QUESTION_CREDIT_USED,
  getQuestionCreditStatus,
} from './questionCredits.js'

export const PURCHASED_FILTERS = ['All', 'Available', 'Used', 'Expired']

// Entitlement status for one slot card, derived from the balance counters
// (remaining = purchased - used, already clamped). Missing or non-numeric
// remaining reads as fully consumed rather than silently Available.
export function getSlotCardStatus(card = {}) {
  const remaining = Number(card?.remaining)
  return Number.isFinite(remaining) && remaining > 0
    ? QUESTION_CREDIT_AVAILABLE
    : QUESTION_CREDIT_USED
}

// One list entry per purchase record: slot cards first (the order the tab
// renders them), then credits. Statuses share one vocabulary so a count and a
// filter can never disagree about the same record.
export function buildPurchasedRecords({ slotCards = [], credits = [] } = {}) {
  const records = (slotCards || []).filter(Boolean).map((card) => ({
    kind: 'slot',
    id: card.key,
    status: getSlotCardStatus(card),
    card,
    credit: null,
  }))

  ;(credits || []).filter(Boolean).forEach((credit) => {
    records.push({
      kind: 'credit',
      id: credit.id,
      status: getQuestionCreditStatus(credit),
      card: null,
      credit,
    })
  })

  return records
}

export function summarizePurchasedRecords(input = {}) {
  const records = buildPurchasedRecords(input)
  const counts = {
    All: records.length,
    [QUESTION_CREDIT_AVAILABLE]: 0,
    [QUESTION_CREDIT_USED]: 0,
    [QUESTION_CREDIT_EXPIRED]: 0,
  }
  records.forEach((record) => {
    counts[record.status] += 1
  })
  return { records, counts }
}

// The exact selection a filter click shows: the same records that were just
// counted, matched against the same status.
export function filterPurchasedRecords(records = [], filter = 'All') {
  if (!filter || filter === 'All') return records
  return records.filter((record) => record.status === filter)
}
