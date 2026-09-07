import { describe, it, expect } from 'vitest'
import {
  buildSeedAstrologerWallet,
  computeWalletSummary,
  applyRunningBalances,
  filterWalletTransactions,
  getDateRangeForPeriod,
  getEarningsBreakdown,
  validateWithdrawal,
  getWithdrawalWindow,
  settlementFromLedger,
  maskCard,
  maskAccountNumber,
  round2,
  WALLET_TXN_TYPES,
  WALLET_SOURCE_KINDS,
} from './wallet.js'

const TODAY = '2026-09-06'
const wallet = buildSeedAstrologerWallet()
const summary = computeWalletSummary(wallet)
const ledger = summary.ledger

describe('wallet ledger seed', () => {
  it('generates a ledger with all supported transaction types', () => {
    const types = new Set(ledger.map((txn) => txn.type))
    expect(types).toEqual(new Set(WALLET_TXN_TYPES))
  })

  it('covers every earning source kind with a source reference', () => {
    const earningKinds = new Set(ledger.filter((txn) => txn.type === 'earning').map((txn) => txn.sourceKind))
    expect(earningKinds).toEqual(new Set(WALLET_SOURCE_KINDS))
    for (const txn of ledger.filter((txn) => txn.type === 'earning')) {
      expect(txn.sourceRef).toBeTruthy()
      expect(txn.customerPaid).toBeGreaterThan(0)
      expect(round2(txn.astrologerEarnings)).toBe(round2(txn.customerPaid - txn.platformCommission))
    }
  })

  it('commission rows are negative and reference the same service', () => {
    for (const txn of ledger.filter((txn) => txn.type === 'commission')) {
      expect(txn.amount).toBeLessThan(0)
      expect(Number(txn.platformCommission) > 0).toBe(true)
      expect(txn.sourceRef).toBeTruthy()
    }
  })
})

describe('computeWalletSummary consistency', () => {
  it('exposes the five wallet balances', () => {
    expect(summary.availableBalance).toBeGreaterThan(0)
    expect(summary.pendingBalance).toBe(4799)
    expect(summary.heldBalance).toBe(1200)
    expect(summary.refundsTotal).toBe(450)
    expect(summary.totalEarnings).toBeGreaterThan(summary.availableBalance)
  })

  it('reconciles: available = totalEarnings - refunds - withdrawals + adjustments', () => {
    const expected = round2(summary.totalEarnings - summary.refundsTotal - summary.withdrawalsTotal + summary.otherAdjustments)
    expect(Math.abs(expected - summary.availableBalance)).toBeLessThan(0.001)
  })

  it('refunds match the sum of refund ledger rows only', () => {
    const refundRows = wallet.ledger.filter((txn) => txn.type === 'refund' && txn.status !== 'Failed')
    expect(Math.abs(summary.refundsTotal - refundRows.reduce((t, r) => t + Math.abs(r.amount), 0))).toBeLessThan(0.001)
  })

  it('does not treat all five cards as an additive set', () => {
    const sumOfFour = summary.availableBalance + summary.pendingBalance + summary.heldBalance + summary.refundsTotal
    expect(sumOfFour).not.toBe(summary.totalEarnings)
  })

  it('running balances skip Failed transactions', () => {
    const failed = wallet.ledger.find((txn) => txn.status === 'Failed')
    const rebalanced = applyRunningBalances(wallet.ledger)
    const index = wallet.ledger.indexOf(failed)
    const runningBefore = rebalanced[index - 1].balanceAfter
    expect(rebalanced[index].balanceAfter).toBe(runningBefore)
  })
})

describe('transaction filters', () => {
  it('filters by type', () => {
    const rows = filterWalletTransactions(ledger, { type: 'earning' })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((txn) => txn.type === 'earning')).toBe(true)
  })

  it('filters by status', () => {
    const rows = filterWalletTransactions(ledger, { status: 'Processing' })
    expect(rows.length).toBe(1)
    expect(rows[0].type).toBe('refund')
  })

  it('filters by date range', () => {
    const range = { start: '2026-09-01', end: '2026-09-30' }
    const rows = filterWalletTransactions(ledger, { range })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((txn) => txn.date >= range.start && txn.date <= range.end)).toBe(true)
  })

  it('combines type + date range filters', () => {
    const range = { start: '2026-09-01', end: '2026-09-30' }
    const rows = filterWalletTransactions(ledger, { type: 'earning', range })
    expect(rows.length).toBe(5)
    expect(rows.every((txn) => txn.type === 'earning' && txn.date >= range.start)).toBe(true)
  })
})

describe('date ranges', () => {
  const today = new Date(2026, 8, 6)

  it('today range is a single day', () => {
    expect(getDateRangeForPeriod('today', { today })).toEqual({ start: '2026-09-06', end: '2026-09-06', label: 'Today' })
  })

  it('last 7 days starts six days before today', () => {
    expect(getDateRangeForPeriod('last7days', { today }).start).toBe('2026-08-31')
  })

  it('this month spans from the first of the month', () => {
    expect(getDateRangeForPeriod('thismonth', { today })).toEqual({ start: '2026-09-01', end: '2026-09-06', label: 'This Month' })
  })

  it('last month is the full previous calendar month', () => {
    expect(getDateRangeForPeriod('lastmonth', { today })).toEqual({ start: '2026-08-01', end: '2026-08-31', label: 'Last Month' })
  })

  it('custom range passes through start and end', () => {
    expect(getDateRangeForPeriod('custom', { start: '2026-09-02', end: '2026-09-05' })).toEqual({ start: '2026-09-02', end: '2026-09-05', label: '2026-09-02 → 2026-09-05' })
    expect(getDateRangeForPeriod('custom', {})).toBeNull()
  })
})

describe('earnings breakdown', () => {
  it('groups earnings by source kind for a period', () => {
    const breakdown = getEarningsBreakdown(ledger, { start: '2026-09-01', end: '2026-09-30' })
    expect(breakdown.count).toBe(5)
    expect(Math.abs(breakdown.net - 3103.2)).toBeLessThan(0.001)
    const appointment = breakdown.kinds.find((kind) => kind.kind === 'appointment')
    expect(appointment.net).toBe(719.1)
  })

  it('returns all earnings when no range is given', () => {
    const all = getEarningsBreakdown(ledger, null)
    expect(all.count).toBeGreaterThan(6)
  })
})

describe('withdrawal validation', () => {
  it('rejects zero and negative amounts', () => {
    expect(validateWithdrawal(0, 1000).valid).toBe(false)
    expect(validateWithdrawal(-5, 1000).valid).toBe(false)
    expect(validateWithdrawal('', 1000).valid).toBe(false)
  })

  it('rejects amounts above available balance', () => {
    const result = validateWithdrawal(2000, 1000)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('exceeds')
  })

  it('accepts an amount within available balance', () => {
    const result = validateWithdrawal(500, 6604.2)
    expect(result.valid).toBe(true)
    expect(result.amount).toBe(500)
  })
})

describe('settlement window', () => {
  const schedule = wallet.settlementSchedule

  it('is open when today is on or after the window start', () => {
    const window = getWithdrawalWindow(schedule, '2026-09-06')
    expect(window.enabled).toBe(true)
    expect(window.allowed).toBe(true)
    expect(window.nextSettlementDate).toBe('2026-09-20')
  })

  it('is closed before the window opens', () => {
    const window = getWithdrawalWindow(schedule, '2026-09-01')
    expect(window.allowed).toBe(false)
  })

  it('reports the configured rule', () => {
    const window = getWithdrawalWindow(schedule, TODAY)
    expect(window.frequencyLabel).toBe(schedule.frequencyLabel)
    expect(window.periodDays).toBe(14)
  })

  it('is unrestricted when no periodic schedule is configured', () => {
    const window = getWithdrawalWindow(null, TODAY)
    expect(window.enabled).toBe(false)
    expect(window.allowed).toBe(true)
  })
})

describe('settlement history', () => {
  it('derives monthly settlements from the ledger', () => {
    const settlements = settlementFromLedger(wallet, TODAY)
    expect(settlements.length).toBe(6)
    const aug = settlements.find((s) => s.period.includes('Aug'))
    expect(aug.grossEarnings).toBe(3998)
    expect(aug.platformCommission).toBe(429.8)
    expect(aug.refunds).toBe(250)
    expect(Math.abs(aug.netEarnings - 3318.2)).toBeLessThan(0.001)
    expect(aug.amountSettled).toBe(aug.netEarnings)
    expect(aug.remaining).toBe(0)
    expect(aug.status).toBe('Completed')
  })

  it('excludes the current month from completed settlements', () => {
    const settlements = settlementFromLedger(wallet, TODAY)
    expect(settlements.some((s) => s.period.includes('Sep'))).toBe(false)
  })
})

describe('masking helpers', () => {
  it('masks card numbers', () => {
    expect(maskCard('4111111111111234')).toBe('**** **** **** 1234')
  })

  it('masks bank account numbers', () => {
    expect(maskAccountNumber('458911220459')).toBe('•••• 0459')
  })
})