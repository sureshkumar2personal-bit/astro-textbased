import { round2, isWithinRangeISO } from './wallet.js'

export const USER_WALLET_TXN_TYPES = ['topup', 'purchase', 'refund']

export const USER_TXN_TYPE_LABELS = {
  topup: 'Top-up',
  purchase: 'Spending',
  refund: 'Refund',
}

export const USER_SPENDING_CATEGORY_LABELS = {
  appointment: 'Appointments',
  call: 'Audio Calls',
  chat: 'Chat & Messaging',
  question: 'Astrology Questions',
  other: 'Other',
}

export function parseUserTxnAmount(amountStr) {
  const value = Number(String(amountStr ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(value) ? value : 0
}

export function normalizeUserTxnDate(dateValue) {
  return String(dateValue || '').slice(0, 10)
}

export function getUserTxnTypeLabel(txn) {
  if (txn.type === 'topup') return USER_TXN_TYPE_LABELS.topup
  if (txn.type === 'refund') return USER_TXN_TYPE_LABELS.refund
  if (txn.type === 'purchase') {
    return parseUserTxnAmount(txn.amount) < 0 ? 'Spending' : 'Package Purchase'
  }
  return txn.type || 'Transaction'
}

export function getUserTxnCategory(txn) {
  const label = String(txn.label || '')
  if (/appointment/i.test(label)) return 'appointment'
  if (/call/i.test(label)) return 'call'
  if (/chat/i.test(label)) return 'chat'
  if (/question/i.test(label)) return 'question'
  return 'other'
}

export function parseUserTxn(txn) {
  const amount = parseUserTxnAmount(txn.amount)
  const rawTime = String(txn.time || '')
  const looksLikeClock = /(AM|PM)/i.test(rawTime) || /^\d{1,2}:\d{2}/.test(rawTime)
  const time = rawTime === 'just now' || looksLikeClock ? rawTime : ''
  return {
    ...txn,
    amount,
    date: normalizeUserTxnDate(txn.date),
    time,
    typeLabel: getUserTxnTypeLabel(txn),
    category: getUserTxnCategory(txn),
  }
}

export function computeUserWalletStats(wallet = {}) {
  const transactions = Array.isArray(wallet.transactions) ? wallet.transactions : []
  const stored = (value) => Number(value) || 0
  const summedTopUps = round2(
    transactions.filter((txn) => txn.type === 'topup').reduce((total, txn) => total + parseUserTxnAmount(txn.amount), 0),
  )
  const summedSpend = round2(
    transactions
      .filter((txn) => parseUserTxnAmount(txn.amount) < 0)
      .reduce((total, txn) => total + Math.abs(parseUserTxnAmount(txn.amount)), 0),
  )
  const summedRefunds = round2(
    transactions.filter((txn) => txn.type === 'refund').reduce((total, txn) => total + parseUserTxnAmount(txn.amount), 0),
  )
  return {
    balance: stored(wallet.balance),
    toppedUp: stored(wallet.toppedUp) || summedTopUps,
    spent: stored(wallet.spent) || summedSpend,
    refunded: stored(wallet.refunded) || summedRefunds,
    transactionCount: transactions.length,
  }
}

export function filterUserWalletTransactions(transactions, filters = {}) {
  const { type = 'all', range = null, search = '' } = filters
  const query = String(search || '').trim().toLowerCase()
  return (Array.isArray(transactions) ? transactions : []).filter((txn) => {
    if (type !== 'all' && txn.type !== type) return false
    if (range && !isWithinRangeISO(normalizeUserTxnDate(txn.date), range.start, range.end)) return false
    if (
      query &&
      !String(txn.label || '').toLowerCase().includes(query) &&
      !String(txn.id || '').toLowerCase().includes(query)
    ) {
      return false
    }
    return true
  })
}

export function getUserWalletSpendingBreakdown(transactions, range = null) {
  const rows = (Array.isArray(transactions) ? transactions : [])
    .filter((txn) => parseUserTxnAmount(txn.amount) < 0)
    .filter((txn) => !range || isWithinRangeISO(normalizeUserTxnDate(txn.date), range.start, range.end))
  const byCategory = {}
  for (const row of rows) {
    const category = getUserTxnCategory(row)
    const entry = byCategory[category] || (byCategory[category] = { kind: category, count: 0, amount: 0 })
    entry.count += 1
    entry.amount = round2(entry.amount + Math.abs(parseUserTxnAmount(row.amount)))
  }
  const kinds = Object.values(byCategory)
  return {
    rows,
    kinds,
    total: round2(kinds.reduce((total, kind) => total + kind.amount, 0)),
    count: rows.length,
  }
}