export const WALLET_SOURCE_KINDS = ['appointment', 'call', 'question', 'subscription', 'session', 'other']

export const WALLET_SOURCE_LABELS = {
  appointment: 'Appointments',
  call: 'Audio Calls',
  question: 'Text Questions',
  subscription: 'Subscriptions',
  session: 'Live Sessions',
  other: 'Other',
}

export const WALLET_TXN_TYPES = ['earning', 'commission', 'withdrawal', 'refund', 'settlement', 'adjustment']

export const WALLET_TXN_TYPE_LABELS = {
  earning: 'Earnings',
  commission: 'Platform Commission',
  withdrawal: 'Withdrawal',
  refund: 'Refund / Adjustment',
  settlement: 'Settlement',
  adjustment: 'Other Adjustment',
}

export const DEFAULT_COMMISSION_RATE = 0.1

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function sumAmounts(items, getter = (item) => item.amount) {
  return round2(items.reduce((total, item) => total + (Number(getter(item)) || 0), 0))
}

function toISO(date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toISO(date)
}

export function isWithinRangeISO(dateIso, startIso, endIso) {
  if (!startIso || !endIso) return false
  return dateIso >= startIso && dateIso <= endIso
}

export function getDateRangeForPeriod(period, options = {}) {
  const today = options.today || new Date()
  const todayIso = toISO(today)

  if (period === 'custom') {
    const { start, end } = options
    if (!start || !end) return null
    return { start, end, label: `${start} → ${end}` }
  }

  if (period === 'today') return { start: todayIso, end: todayIso, label: 'Today' }
  if (period === 'last7days') return { start: addDaysISO(todayIso, -6), end: todayIso, label: 'Last 7 Days' }

  const firstOfMonth = (offset) => toISO(new Date(today.getFullYear(), today.getMonth() + offset, 1))
  const lastOfMonth = (offset) => toISO(new Date(today.getFullYear(), today.getMonth() + offset + 1, 0))

  if (period === 'thismonth') return { start: firstOfMonth(0), end: todayIso, label: 'This Month' }
  if (period === 'lastmonth') return { start: firstOfMonth(-1), end: lastOfMonth(-1), label: 'Last Month' }
  if (period === 'last3months') return { start: firstOfMonth(-2), end: todayIso, label: 'Last 3 Months' }
  if (period === 'last6months') return { start: firstOfMonth(-5), end: todayIso, label: 'Last 6 Months' }
  if (period === 'thisyear') return { start: `${today.getFullYear()}-01-01`, end: todayIso, label: 'This Year' }

  return null
}

export function applyRunningBalances(ledger) {
  let running = 0
  return (Array.isArray(ledger) ? ledger : []).map((txn) => {
    if (txn.status !== 'Failed') {
      running = round2(running + (Number(txn.amount) || 0))
    }
    return { ...txn, balanceAfter: running }
  })
}

export function computeWalletSummary(wallet = {}) {
  const ledger = applyRunningBalances(wallet.ledger)
  const last = ledger[ledger.length - 1]
  const availableBalance = last ? last.balanceAfter : 0
  const pendingBalance = sumAmounts(wallet.pendingPayments || [])
  const heldBalance = sumAmounts(wallet.heldPayments || [])
  const refundsTotal = sumAmounts(
    ledger.filter((txn) => txn.type === 'refund' && txn.status !== 'Failed'),
    (txn) => Math.abs(txn.amount || 0),
  )
  const totalEarnings = sumAmounts(
    ledger.filter((txn) => txn.type === 'earning' && txn.status !== 'Failed'),
    (txn) => txn.astrologerEarnings || 0,
  )
  const withdrawalsTotal = sumAmounts(
    ledger.filter((txn) => txn.type === 'withdrawal' && txn.status !== 'Failed'),
    (txn) => Math.abs(txn.amount || 0),
  )
  const otherAdjustments = sumAmounts(
    ledger.filter((txn) => txn.type === 'adjustment' && txn.status !== 'Failed'),
    (txn) => txn.amount || 0,
  )
  return {
    availableBalance,
    pendingBalance,
    heldBalance,
    refundsTotal,
    totalEarnings,
    withdrawalsTotal,
    otherAdjustments,
    ledger,
  }
}

export function filterWalletTransactions(ledger, filters = {}) {
  const { type = 'all', status = 'all', range = null } = filters
  return ledger.filter((txn) => {
    if (type !== 'all' && txn.type !== type) return false
    if (status !== 'all' && txn.status !== status) return false
    if (range && !isWithinRangeISO(txn.date, range.start, range.end)) return false
    return true
  })
}

export function getEarningsBreakdown(ledger, range) {
  const rows = ledger.filter(
    (txn) =>
      txn.type === 'earning' &&
      txn.status !== 'Failed' &&
      (!range || isWithinRangeISO(txn.date, range.start, range.end)),
  )
  const byKind = {}
  for (const row of rows) {
    const kind = row.sourceKind || 'other'
    const entry = byKind[kind] || (byKind[kind] = { kind, count: 0, gross: 0, commission: 0, net: 0 })
    entry.count += 1
    entry.gross = round2(entry.gross + (Number(row.customerPaid) || Number(row.amount) || 0))
    entry.commission = round2(entry.commission + (Number(row.platformCommission) || 0))
    entry.net = round2(entry.net + (Number(row.astrologerEarnings) || 0))
  }
  const kinds = Object.values(byKind)
  return {
    rows,
    kinds,
    gross: round2(kinds.reduce((total, k) => total + k.gross, 0)),
    commission: round2(kinds.reduce((total, k) => total + k.commission, 0)),
    net: round2(kinds.reduce((total, k) => total + k.net, 0)),
    count: rows.length,
  }
}

export function maskAccountNumber(accountNumber) {
  const digits = String(accountNumber || '').replace(/\D/g, '')
  return `•••• ${digits.slice(-4)}`
}

export function maskCard(cardNumber) {
  const digits = String(cardNumber || '').replace(/\D/g, '')
  return `**** **** **** ${digits.slice(-4)}`
}

export function maskUPI(upiId) {
  const parts = String(upiId || '').split('@')
  const handle = parts[0] || ''
  if (!handle) return String(upiId || '')
  const mask = `${handle.slice(0, 2)}•••${handle.slice(-2)}`
  return parts.length > 1 ? `${mask}@${parts[1]}` : mask
}

export function payoutDisplayLabel(method = {}) {
  if (method.type === 'bank') {
    const digits = String(method.accountNumber || '').replace(/\D/g, '')
    return `${method.bankName || 'Bank'} •••• ${digits.slice(-4)}`
  }
  if (method.type === 'upi') return `UPI ${maskUPI(method.upiId)}`
  if (method.type === 'card') return `Card ${maskCard(method.cardNumber)}`
  return 'Saved payment method'
}

export function validateWithdrawal(amount, availableBalance) {
  const value = Number(amount)
  const errors = []
  if (!amount || Number.isNaN(value) || value <= 0) {
    errors.push('amount')
  }
  if (value > availableBalance) {
    errors.push('exceeds')
  }
  return {
    valid: errors.length === 0,
    errors,
    amount: round2(value),
  }
}

export function getWithdrawalWindow(schedule, todayIso) {
  if (!schedule || schedule.mode !== 'periodic') {
    return { enabled: false, allowed: true, nextSettlementDate: null }
  }
  return {
    enabled: true,
    allowed: todayIso >= schedule.windowStartDate,
    windowStartDate: schedule.windowStartDate,
    nextSettlementDate: schedule.nextSettlementDate,
    periodDays: schedule.periodDays,
    frequencyLabel: schedule.frequencyLabel,
  }
}

let seedSeq = 0

function nextTxnId() {
  seedSeq += 1
  return `TXN-2026-${String(seedSeq).padStart(3, '0')}`
}

function seededEarning({ ledger, date, time, kind, ref, summary, customer, customerPaid, commissionRate = DEFAULT_COMMISSION_RATE }) {
  const commission = round2(Number(customerPaid) * commissionRate)
  ledger.push({
    id: nextTxnId(),
    date,
    time,
    type: 'earning',
    status: 'Completed',
    description: `Earning from ${summary}`,
    amount: Number(customerPaid),
    sourceKind: kind,
    sourceRef: ref,
    sourceSummary: summary,
    customer,
    customerPaid: Number(customerPaid),
    platformCommission: commission,
    astrologerEarnings: round2(Number(customerPaid) - commission),
  })
  ledger.push({
    id: nextTxnId(),
    date,
    time,
    type: 'commission',
    status: 'Completed',
    description: `Platform commission (${Math.round(commissionRate * 100)}%) — ${summary}`,
    amount: -commission,
    sourceKind: kind,
    sourceRef: ref,
    sourceSummary: summary,
    customer,
    customerPaid: Number(customerPaid),
    platformCommission: commission,
    astrologerEarnings: null,
  })
}

function seededRefund({ ledger, date, time, id, summary, customer, ref, kind, amount, reason, status }) {
  ledger.push({
    id: nextTxnId(),
    date,
    time,
    type: 'refund',
    status,
    description: `Refund / adjustment — ${summary}`,
    amount: -Number(amount),
    sourceKind: kind,
    sourceRef: ref,
    sourceSummary: summary,
    customer,
    reason,
    refundRef: id,
  })
}

function seededWithdrawal({ ledger, date, time, amount, payoutLabel, status = 'Completed' }) {
  ledger.push({
    id: nextTxnId(),
    date,
    time,
    type: 'withdrawal',
    status,
    description: `Withdrawal to ${payoutLabel}`,
    amount: -Number(amount),
    payoutLabel,
  })
}

function seededAdjustment({ ledger, date, time, amount, reason }) {
  ledger.push({
    id: nextTxnId(),
    date,
    time,
    type: 'adjustment',
    status: 'Completed',
    description: reason,
    amount: Number(amount),
    reason,
  })
}

function seededSettlement({ ledger, date, time, monthLabel, grossEarnings, commission, refunds, otherDeductions, netEarnings, status }) {
  ledger.push({
    id: nextTxnId(),
    date,
    time,
    type: 'settlement',
    status,
    description: `Monthly settlement — ${monthLabel}`,
    amount: 0,
    grossEarnings,
    commission,
    refunds,
    otherDeductions,
    netEarnings,
    amountSettled: netEarnings,
    monthLabel,
  })
}

export function buildSeedAstrologerWallet() {
  seedSeq = 0
  const ledger = []

  seededEarning({ ledger, date: '2026-03-10', time: '11:15 AM', kind: 'appointment', ref: 'AH0163', summary: 'Appointment with Divya', customer: 'Divya', customerPaid: 999 })
  seededEarning({ ledger, date: '2026-03-18', time: '06:40 PM', kind: 'question', ref: 'QTN-2026-000045', summary: 'Text question – Career', customer: 'Vikram', customerPaid: 250 })
  seededEarning({ ledger, date: '2026-04-09', time: '09:30 AM', kind: 'call', ref: 'CL-00881', summary: 'Audio call with Sneha', customer: 'Sneha', customerPaid: 699 })
  seededEarning({ ledger, date: '2026-05-21', time: '04:15 PM', kind: 'subscription', ref: 'SUB-2026-0042', summary: 'Subscription – Silver', customer: 'Divya', customerPaid: 699 })
  seededEarning({ ledger, date: '2026-06-15', time: '08:00 PM', kind: 'session', ref: 'SES-0402', summary: 'Live session – Weekend Darshan', customer: 'Vikram', customerPaid: 899 })
  seededEarning({ ledger, date: '2026-07-12', time: '10:45 AM', kind: 'appointment', ref: 'AH0771', summary: 'Appointment with Kannan', customer: 'Kannan', customerPaid: 1199 })
  seededWithdrawal({ ledger, date: '2026-07-18', time: '11:00 AM', amount: 4000, payoutLabel: 'HDFC Bank •••• 4589' })
  seededEarning({ ledger, date: '2026-07-22', time: '08:30 PM', kind: 'question', ref: 'QTN-2026-000118', summary: 'Text question – Health', customer: 'Lakshmi', customerPaid: 250 })
  seededEarning({ ledger, date: '2026-07-27', time: '10:30 AM', kind: 'call', ref: 'CL-0413', summary: 'Audio call with Rahul', customer: 'Rahul', customerPaid: 850 })
  seededWithdrawal({ ledger, date: '2026-07-29', time: '02:00 PM', amount: 1000, payoutLabel: 'HDFC Bank •••• 4589' })
  seededWithdrawal({ ledger, date: '2026-08-02', time: '12:00 PM', amount: 500, payoutLabel: 'SBI •••• 2567', status: 'Failed' })
  seededEarning({ ledger, date: '2026-08-05', time: '09:15 PM', kind: 'session', ref: 'SES-0707', summary: 'Live session – Festive Pooja', customer: 'Meena', customerPaid: 1200 })
  seededEarning({ ledger, date: '2026-08-12', time: '05:00 PM', kind: 'subscription', ref: 'SUB-2026-0088', summary: 'Subscription – Gold', customer: 'Priya Sharma', customerPaid: 499 })
  seededEarning({ ledger, date: '2026-08-18', time: '01:20 PM', kind: 'appointment', ref: 'AH0891', summary: 'Appointment with Sunil', customer: 'Sunil', customerPaid: 799 })
  seededRefund({ ledger, date: '2026-08-24', time: '03:10 PM', id: 'RFD-2026-0031', summary: 'Refund for disputed question', customer: 'Arjun', ref: 'QTN-2026-000126', kind: 'question', amount: 250, reason: 'Customer disputed the answer. Amount refunded after review.', status: 'Completed' })
  seededEarning({ ledger, date: '2026-08-25', time: '07:45 PM', kind: 'other', ref: 'GFT-0190', summary: 'Virtual gift from customer', customer: 'Meena', customerPaid: 300, commissionRate: 0.2 })
  seededEarning({ ledger, date: '2026-08-28', time: '10:00 AM', kind: 'session', ref: 'SES-0824', summary: 'Live session – Weekly forecast', customer: 'Sneha', customerPaid: 1200 })
  seededSettlement({
    ledger,
    date: '2026-08-31',
    time: '12:00 PM',
    monthLabel: 'Aug 2026',
    grossEarnings: 3998,
    commission: 429.8,
    refunds: 250,
    otherDeductions: 0,
    netEarnings: 3318.2,
    status: 'Completed',
  })
  seededAdjustment({ ledger, date: '2026-09-01', time: '09:00 AM', amount: 122.3, reason: 'Credit correction – live session settlement rounding' })
  seededEarning({ ledger, date: '2026-09-02', time: '04:30 PM', kind: 'subscription', ref: 'SUB-2026-0112', summary: 'Subscription – Silver', customer: 'Priya Sharma', customerPaid: 699 })
  seededEarning({ ledger, date: '2026-09-03', time: '08:10 AM', kind: 'question', ref: 'QTN-2026-000160', summary: 'Text question – Business', customer: 'Rajesh', customerPaid: 250 })
  seededEarning({ ledger, date: '2026-09-04', time: '03:45 PM', kind: 'call', ref: 'CL-0438', summary: 'Audio call with Priya', customer: 'Priya Sharma', customerPaid: 850 })
  seededRefund({ ledger, date: '2026-09-05', time: '11:20 AM', id: 'RFD-2026-0042', summary: 'Refund for interrupted audio call', customer: 'Karthik', ref: 'CL-0455', kind: 'call', amount: 200, reason: 'Call disconnected early. Partial refund approved.', status: 'Processing' })
  seededEarning({ ledger, date: '2026-09-06', time: '10:40 AM', kind: 'call', ref: 'CL-0460', summary: 'Audio call with Meena', customer: 'Meena', customerPaid: 850 })
  seededEarning({ ledger, date: '2026-09-07', time: '09:00 AM', kind: 'appointment', ref: 'AH927', summary: 'Appointment with Meena · 9:00–9:30 AM', customer: 'Meena', customerPaid: 799 })

  return {
    holdDays: 7,
    ledger: applyRunningBalances(ledger),
    pendingPayments: [
      { id: 'PND-2026-0001', sourceKind: 'appointment', sourceRef: 'AH901', customer: 'Karthik', customerPaid: 799, platformCommission: 79.9, astrologerEarnings: 719.1, amount: 719.1, date: '2026-09-06', time: '11:00 AM', reason: 'Awaiting service completion — releases after session end', status: 'Pending', releaseInfo: 'Releases after the appointment session is completed and verified (same day).' },
      { id: 'PND-2026-0002', sourceKind: 'call', sourceRef: 'CL-0462', customer: 'Priya Sharma', customerPaid: 850, platformCommission: 85, astrologerEarnings: 765, amount: 765, date: '2026-09-06', time: '05:15 PM', reason: 'Awaiting settlement (T+2)', status: 'Pending', releaseInfo: 'Settles on T+2 from the transaction date (8 Sep 2026).' },
      { id: 'PND-2026-0003', sourceKind: 'question', sourceRef: 'QTN-2026-000315', customer: 'Lakshmi', customerPaid: 250, platformCommission: 25, astrologerEarnings: 225, amount: 225, date: '2026-09-05', time: '02:40 PM', reason: 'Awaiting settlement (T+2)', status: 'Pending', releaseInfo: 'Settles after the validity window closes (7 Sep 2026).' },
      { id: 'PND-2026-0004', sourceKind: 'subscription', sourceRef: 'SUB-2026-0117', customer: 'Divya', customerPaid: 699, platformCommission: 69.9, astrologerEarnings: 629.1, amount: 629.1, date: '2026-09-04', time: '06:20 PM', reason: 'Awaiting settlement (T+2)', status: 'Pending', releaseInfo: 'Settles with the next subscription cycle (8 Sep 2026).' },
      { id: 'PND-2026-0005', sourceKind: 'session', sourceRef: 'SES-0921', customer: 'Vikram', customerPaid: 1200, platformCommission: 120, astrologerEarnings: 1080, amount: 1080, date: '2026-09-03', time: '08:30 PM', reason: 'Live session payout review', status: 'Pending', releaseInfo: 'Releases after session quality review (est. 10 Sep 2026).' },
      { id: 'PND-2026-0006', sourceKind: 'other', sourceRef: 'GFT-0231', customer: 'Meena', customerPaid: 1726, platformCommission: 345.2, astrologerEarnings: 1380.8, amount: 1380.8, date: '2026-09-02', time: '07:10 PM', reason: 'Virtual gift sweep pending', status: 'Pending', releaseInfo: 'Sweeps into the available balance on the next settlement date (20 Sep 2026).' },
    ],
    heldPayments: [
      { id: 'HLD-2026-0001', sourceKind: 'call', sourceRef: 'CL-0459', customer: 'Priya Sharma', customerPaid: 850, platformCommission: 85, astrologerEarnings: 765, amount: 700, date: '2026-09-02', time: '03:25 PM', reason: 'Dispute under review — refund window open', status: 'Held', disputeInfo: 'Customer raised a dispute (DS-2026-0188). Review in progress; expected decision within 7 days.', releaseInfo: 'If the resolution favours the astrologer, the held amount of ₹700 is released to the available balance; otherwise it is adjusted against the refund.' },
      { id: 'HLD-2026-0002', sourceKind: 'question', sourceRef: 'QTN-2026-000201', customer: 'Arjun', customerPaid: 600, platformCommission: 60, astrologerEarnings: 540, amount: 500, date: '2026-09-01', time: '09:50 AM', reason: 'Quality review — answer disputed', status: 'Held', disputeInfo: 'Quality team review for answer accuracy (case QR-2026-0077).', releaseInfo: 'Releases after the quality review clears (est. 9 Sep 2026).' },
    ],
    settlementSchedule: {
      mode: 'periodic',
      frequencyLabel: 'Fortnightly (every 14 days)',
      periodDays: 14,
      windowStartDate: '2026-09-06',
      nextSettlementDate: '2026-09-20',
      note: 'Withdrawal requests are processed on the settlement date. Requests made outside the settlement window are queued for the next settlement cycle.',
    },
  }
}

export function settlementFromLedger(wallet, todayIso) {
  const ledger = applyRunningBalances(wallet.ledger || [])
  const currentMonth = (todayIso || new Date().toISOString().slice(0, 10)).slice(0, 7)
  const byMonth = new Map()
  for (const txn of ledger) {
    if (!txn.date || txn.status === 'Failed') continue
    const key = txn.date.slice(0, 7)
    if (key >= currentMonth) continue
    const month = byMonth.get(key) || (byMonth.set(key, { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), gross: 0, commission: 0, refunds: 0, otherDeductions: 0, count: 0 }), byMonth.get(key))
    if (txn.type === 'earning') {
      month.gross = round2(month.gross + (Number(txn.customerPaid) || Number(txn.amount) || 0))
      month.commission = round2(month.commission + (Number(txn.platformCommission) || 0))
      month.count += 1
    } else if (txn.type === 'refund') {
      month.refunds = round2(month.refunds + Math.abs(Number(txn.amount) || 0))
    }
  }
  const keys = [...byMonth.keys()].sort()
  return keys.map((key, index) => {
    const month = byMonth.get(key)
    const monthLabel = new Date(month.year, month.month - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    const netEarnings = round2(month.gross - month.commission - month.refunds - month.otherDeductions)
    return {
      id: `STL-${String(index + 1).padStart(3, '0')}`,
      date: `${key}-28`,
      period: monthLabel,
      grossEarnings: month.gross,
      platformCommission: month.commission,
      refunds: month.refunds,
      otherDeductions: month.otherDeductions,
      netEarnings,
      amountSettled: netEarnings,
      remaining: 0,
      status: 'Completed',
      count: month.count,
    }
  })
}