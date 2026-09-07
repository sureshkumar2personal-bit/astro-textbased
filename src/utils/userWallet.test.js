import { describe, it, expect } from 'vitest'
import {
  parseUserTxnAmount,
  normalizeUserTxnDate,
  getUserTxnCategory,
  getUserTxnTypeLabel,
  parseUserTxn,
  computeUserWalletStats,
  filterUserWalletTransactions,
  getUserWalletSpendingBreakdown,
  USER_SPENDING_CATEGORY_LABELS,
} from './userWallet.js'

const seedTransactions = [
  { id: 'uw1', label: 'Wallet top-up', amount: '+₹5,000', time: '25 Jul 2026', date: '2026-07-25', type: 'topup' },
  { id: 'uw2', label: 'Personal question - Marriage', amount: '-₹250', time: '21 Jul 2026', date: '2026-07-21', type: 'purchase' },
  { id: 'uw3', label: 'Wallet top-up', amount: '+₹5,000', time: '20 Jul 2026', date: '2026-07-20', type: 'topup' },
  { id: 'uw4', label: 'General question - Business', amount: '-₹100', time: '17 Jul 2026', date: '2026-07-17', type: 'purchase' },
]

const seedWallet = { balance: 9650, toppedUp: 10000, spent: 350, refunded: 0, transactions: seedTransactions }

describe('parseUserTxnAmount', () => {
  it('parses INR strings with commas and sign', () => {
    expect(parseUserTxnAmount('+₹5,000')).toBe(5000)
    expect(parseUserTxnAmount('-₹250')).toBe(-250)
    expect(parseUserTxnAmount('₹1,200.5')).toBe(1200.5)
  })

  it('falls back to zero for empty or malformed values', () => {
    expect(parseUserTxnAmount('')).toBe(0)
    expect(parseUserTxnAmount(null)).toBe(0)
    expect(parseUserTxnAmount('not-a-number')).toBe(0)
  })
})

describe('normalizeUserTxnDate', () => {
  it('keeps clean ISO dates and slices down ISO datetimes', () => {
    expect(normalizeUserTxnDate('2026-07-25')).toBe('2026-07-25')
    expect(normalizeUserTxnDate('2026-09-07T14:30:00.000Z')).toBe('2026-09-07')
  })
})

describe('getUserTxnCategory', () => {
  it('derives categories from transaction labels', () => {
    expect(getUserTxnCategory({ label: 'Appointment with Dr. Rani' })).toBe('appointment')
    expect(getUserTxnCategory({ label: 'Call with Dr. Rani' })).toBe('call')
    expect(getUserTxnCategory({ label: 'Audio call with Meena' })).toBe('call')
    expect(getUserTxnCategory({ label: 'Chat with Dr. Rani' })).toBe('chat')
    expect(getUserTxnCategory({ label: 'Personal question - Marriage' })).toBe('question')
    expect(getUserTxnCategory({ label: 'Wallet top-up' })).toBe('other')
  })
})

describe('getUserTxnTypeLabel', () => {
  it('labels top-ups and refunds directly', () => {
    expect(getUserTxnTypeLabel({ type: 'topup', amount: '+₹5,000' })).toBe('Top-up')
    expect(getUserTxnTypeLabel({ type: 'refund', amount: '+₹250' })).toBe('Refund')
  })

  it('distinguishes spending debits from package purchase credits', () => {
    expect(getUserTxnTypeLabel({ type: 'purchase', amount: '-₹250' })).toBe('Spending')
    expect(getUserTxnTypeLabel({ type: 'purchase', amount: '+₹999' })).toBe('Package Purchase')
  })
})

describe('parseUserTxn', () => {
  it('normalizes amount, date and type label', () => {
    const parsed = parseUserTxn({ id: 'uw2', label: 'Personal question - Marriage', amount: '-₹250', time: '21 Jul 2026', date: '2026-07-21T10:00:00.000Z', type: 'purchase' })
    expect(parsed.amount).toBe(-250)
    expect(parsed.date).toBe('2026-07-21')
    expect(parsed.typeLabel).toBe('Spending')
    expect(parsed.time).toBe('')
  })

  it('keeps clock or just-now times', () => {
    expect(parseUserTxn({ time: 'just now', date: '2026-09-07', amount: '+₹100', type: 'topup' }).time).toBe('just now')
    expect(parseUserTxn({ time: '10:30 AM', date: '2026-09-07', amount: '+₹100', type: 'topup' }).time).toBe('10:30 AM')
  })
})

describe('computeUserWalletStats', () => {
  it('reads stored totals when present', () => {
    const stats = computeUserWalletStats(seedWallet)
    expect(stats.balance).toBe(9650)
    expect(stats.toppedUp).toBe(10000)
    expect(stats.spent).toBe(350)
    expect(stats.refunded).toBe(0)
    expect(stats.transactionCount).toBe(4)
  })

  it('derives totals from transactions when stored fields are missing', () => {
    const stats = computeUserWalletStats({ balance: 9650, transactions: seedTransactions })
    expect(stats.toppedUp).toBe(10000)
    expect(stats.spent).toBe(350)
    expect(stats.refunded).toBe(0)
  })
})

describe('filterUserWalletTransactions', () => {
  it('filters by type', () => {
    const rows = filterUserWalletTransactions(seedTransactions, { type: 'topup' })
    expect(rows.length).toBe(2)
    expect(rows.every((txn) => txn.type === 'topup')).toBe(true)
  })

  it('filters by date range using normalized dates', () => {
    const rows = filterUserWalletTransactions(
      [{ id: 'x', label: 'Top-up', amount: '+₹100', date: '2026-07-25T09:00:00.000Z', type: 'topup' }],
      { range: { start: '2026-07-25', end: '2026-07-25' } },
    )
    expect(rows.length).toBe(1)
  })

  it('filters by free-text search', () => {
    const rows = filterUserWalletTransactions(seedTransactions, { search: 'marriage' })
    expect(rows.length).toBe(1)
    expect(rows[0].id).toBe('uw2')
  })

  it('combines multiple filters', () => {
    const rows = filterUserWalletTransactions(seedTransactions, {
      type: 'purchase',
      search: 'question',
      range: { start: '2026-07-01', end: '2026-07-31' },
    })
    expect(rows.length).toBe(2)
  })
})

describe('getUserWalletSpendingBreakdown', () => {
  it('groups debit transactions by category for a period', () => {
    const wallet = seedWallet
    const breakdown = getUserWalletSpendingBreakdown(wallet.transactions, { start: '2026-07-01', end: '2026-07-31' })
    expect(breakdown.count).toBe(2)
    expect(breakdown.total).toBe(350)
    const questions = breakdown.kinds.find((kind) => kind.kind === 'question')
    expect(questions.count).toBe(2)
    expect(questions.amount).toBe(350)
  })

  it('excludes credits such as top-ups from spending', () => {
    const breakdown = getUserWalletSpendingBreakdown(seedWallet.transactions)
    expect(breakdown.count).toBe(2)
  })

  it('exposes a label for every category', () => {
    expect(USER_SPENDING_CATEGORY_LABELS.question).toBe('Astrology Questions')
    expect(Object.keys(USER_SPENDING_CATEGORY_LABELS).sort()).toEqual(['appointment', 'call', 'chat', 'other', 'question'])
  })
})