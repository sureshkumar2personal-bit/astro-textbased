import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  Clock,
  TrendingUp,
  ArrowDownToLine,
  Plus,
  CreditCard,
  Building2,
  Smartphone,
  Star,
  Pencil,
  Trash2,
  X,
  Filter,
  Phone,
  Radio,
  MoreHorizontal,
  FileText,
  CalendarDays,
  Lock,
  History,
  ChevronRight,
  ChevronDown,
  Receipt,
  Download,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import Card from '../components/ui/Card.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import BackButton from '../components/BackButton.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import {
  computeWalletSummary,
  getDateRangeForPeriod,
  getEarningsBreakdown,
  filterWalletTransactions,
  maskAccountNumber,
  maskCard,
  maskUPI,
  payoutDisplayLabel,
  validateWithdrawal,
  getWithdrawalWindow,
  settlementFromLedger,
  WALLET_SOURCE_LABELS,
  WALLET_TXN_TYPE_LABELS,
} from '../utils/wallet.js'
import { downloadPdf } from '../utils/pdfReport.js'

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'thismonth', label: 'This Month' },
  { key: 'lastmonth', label: 'Last Month' },
  { key: 'thisyear', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

const TXN_DATE_OPTIONS = [
  { key: 'all', label: 'All Dates' },
  { key: 'today', label: 'Today' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'thismonth', label: 'This Month' },
  { key: 'last3months', label: 'Last 3 Months' },
  { key: 'last6months', label: 'Last 6 Months' },
  { key: 'custom', label: 'Custom Range' },
]

const TXN_TYPE_FILTER_OPTIONS = [
  { key: 'all', label: 'All Types' },
  { key: 'earning', label: 'Earnings' },
  { key: 'withdrawal', label: 'Withdrawal' },
  { key: 'commission', label: 'Platform Commission' },
  { key: 'refund', label: 'Refund / Adjustment' },
  { key: 'settlement', label: 'Settlement' },
  { key: 'adjustment', label: 'Other Adjustment' },
]

const STATUS_OPTIONS = ['All', 'Completed', 'Processing', 'Failed']

const EARNINGS_SOURCE_OPTIONS = [
  { key: 'appointment', label: 'Appointments', icon: CalendarDays, color: 'var(--primary)' },
  { key: 'call', label: 'Audio Calls', icon: Phone, color: 'var(--accent)' },
  { key: 'question', label: 'Text Questions', icon: FileText, color: 'var(--sky-500)' },
  { key: 'subscription', label: 'Subscriptions', icon: Star, color: 'var(--violet-600)' },
  { key: 'session', label: 'Live Sessions', icon: Radio, color: 'var(--success)' },
  { key: 'other', label: 'Other', icon: MoreHorizontal, color: 'var(--muted)' },
]

function formatINR(amount) {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-IN')
  return amount < 0 ? `-₹${formatted}` : `+₹${formatted}`
}

function statusClass(status = '') {
  return `wallet-txn-status--${String(status).toLowerCase().replace(/\s+/g, '-')}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PayoutMethodIcon({ type }) {
  if (type === 'upi') return <Smartphone size={18} />
  if (type === 'card') return <CreditCard size={18} />
  return <Building2 size={18} />
}

function txnService(txn) {
  if (txn.sourceSummary) return txn.sourceSummary
  if (txn.type === 'withdrawal') return txn.payoutLabel || 'Withdrawal'
  return txn.description || '—'
}

function downloadTransactionsPdf(txns, { typeLabel = 'All Transactions', dateLabel = 'All Dates', statusFilter = 'All' }) {
  const subtitleParts = [typeLabel, dateLabel]
  if (statusFilter && statusFilter !== 'All') subtitleParts.push(`Status: ${statusFilter}`)
  downloadPdf({
    title: 'Transaction Statement',
    subtitle: subtitleParts.join(' · '),
    columns: ['Transaction ID', 'Date', 'Transaction Type', 'Service', 'Amount', 'Status', 'Balance'],
    rows: txns.map((t) => [
      t.id,
      `${t.date}${t.time ? ` ${t.time}` : ''}`,
      WALLET_TXN_TYPE_LABELS[t.type] || t.type,
      txnService(t),
      formatINR(t.amount),
      t.status,
      `₹${t.balanceAfter.toLocaleString('en-IN')}`,
    ]),
    filename: `astrologer-transaction-statement-${typeLabel}-${dateLabel}`,
  })
}

function downloadCategoryEarningsPdf(kind, rows, label, rangeLabel, totals) {
  downloadPdf({
    title: `${label} Earnings`,
    subtitle: `Period: ${rangeLabel} · Records: ${rows.length}`,
    columns: ['Transaction ID', 'Date', 'Customer', 'Service / Reference', 'Customer Paid (₹)', 'Commission (₹)', 'Astrologer Earnings (₹)', 'Status'],
    rows: rows.map((r) => [
      r.id,
      r.date,
      r.customer || '—',
      `${r.sourceRef || '—'}${r.sourceSummary ? ` · ${r.sourceSummary}` : ''}`,
      `₹${r.customerPaid.toLocaleString('en-IN')}`,
      `₹${r.platformCommission.toLocaleString('en-IN')}`,
      `₹${r.astrologerEarnings.toLocaleString('en-IN')}`,
      r.status,
    ]),
    footnote: `Gross ₹${totals.gross.toLocaleString('en-IN')} · Platform Commission ₹${totals.commission.toLocaleString('en-IN')} · Astrologer Earnings ₹${totals.net.toLocaleString('en-IN')}`,
    filename: `astrologer-${kind}-earnings-${rangeLabel}`,
  })
}

function paymentServiceLabel(payment) {
  const kind = WALLET_SOURCE_LABELS[payment.sourceKind] || payment.sourceKind || 'Payment'
  return `${kind}${payment.sourceRef ? ` · ${payment.sourceRef}` : ''}`
}

function paymentNumbers(payment) {
  const customerPaid = Number(payment.customerPaid) || 0
  const platformCommission = Number(payment.platformCommission) || 0
  const astrologerEarnings = Number(payment.astrologerEarnings) || 0
  const amount = Number(payment.amount) || customerPaid || 0
  const pct = customerPaid > 0
    ? Math.round((platformCommission / customerPaid) * 100)
    : payment.commissionRate
      ? Math.round(Number(payment.commissionRate) * 100)
      : 10
  return { customerPaid, platformCommission, astrologerEarnings, amount, pct }
}

function downloadPaymentPdf(payment) {
  const label = paymentServiceLabel(payment)
  const numbers = paymentNumbers(payment)
  downloadPdf({
    title: `${payment.status} Payment`,
    subtitle: `${label} · ${payment.customer}`,
    columns: ['Field', 'Value'],
    rows: [
      ['Payment ID', payment.id],
      ['Customer', payment.customer || '—'],
      ['Service', label],
      ['Reference', payment.sourceRef || '—'],
      ['Date', payment.date],
      ['Time', payment.time || '—'],
      ['Customer Paid', `₹${numbers.customerPaid.toLocaleString('en-IN')}`],
      ['Platform Commission', `₹${numbers.platformCommission.toLocaleString('en-IN')}`],
      ['Astrologer Earnings', `₹${numbers.astrologerEarnings.toLocaleString('en-IN')}`],
      ['Amount', `₹${numbers.amount.toLocaleString('en-IN')}`],
      ['Status', payment.status],
      ['Reason', payment.reason || '—'],
      ['Release / Resolution', payment.releaseInfo || payment.disputeInfo || '—'],
    ],
    filename: `astrologer-${payment.status.toLowerCase()}-payment-${payment.id}`,
  })
}

export default function AstrologerWallet({ section = 'overview' }) {
  const { currentUser } = useAuth()
  const { astrologerWallet, payoutMethods, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const walletPath = routes.walletManagement

  const [period, setPeriod] = useState('thismonth')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [categoryDetailKind, setCategoryDetailKind] = useState(null)
  const [selectedEarning, setSelectedEarning] = useState(null)
  const [heldModalOpen, setHeldModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [selectedSettlement, setSelectedSettlement] = useState(null)

  const [txnTypeFilter, setTxnTypeFilter] = useState('all')
  const [txnStatusFilter, setTxnStatusFilter] = useState('All')
  const [txnDateFilter, setTxnDateFilter] = useState('all')
  const [txnCustomStart, setTxnCustomStart] = useState('')
  const [txnCustomEnd, setTxnCustomEnd] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState('')

  const [payoutModal, setPayoutModal] = useState(null)
  const [payoutForm, setPayoutForm] = useState({ type: 'bank', bankName: '', accountNumber: '', ifsc: '', accountHolder: '', accountType: 'Savings', upiId: '', cardNumber: '', cardHolder: '' })
  const [editingMethod, setEditingMethod] = useState(null)

  const [refundsOpen, setRefundsOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [pendingOpen, setPendingOpen] = useState(true)
  const [heldOpen, setHeldOpen] = useState(true)

  const today = useMemo(() => new Date(), [])
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const summary = useMemo(() => computeWalletSummary(astrologerWallet), [astrologerWallet])
  const ledger = summary.ledger
  const pendingList = astrologerWallet.pendingPayments || []
  const heldList = astrologerWallet.heldPayments || []

  const dateRange = useMemo(() => {
    if (period === 'custom') {
      return customStart && customEnd ? { start: customStart, end: customEnd, label: `${customStart} → ${customEnd}` } : null
    }
    return getDateRangeForPeriod(period, { today })
  }, [period, customStart, customEnd, today])

  const breakdown = useMemo(() => getEarningsBreakdown(ledger, dateRange), [ledger, dateRange])
  const overviewBreakdown = useMemo(() => getEarningsBreakdown(ledger, getDateRangeForPeriod('thismonth', { today })), [ledger, today])
  const categoryEarnings = useMemo(() => {
    if (!categoryDetailKind) return { rows: [], gross: 0, commission: 0, net: 0 }
    const rows = breakdown.rows
      .filter((row) => row.sourceKind === categoryDetailKind)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    const kind = breakdown.kinds.find((item) => item.kind === categoryDetailKind)
    return { rows, gross: kind?.gross || 0, commission: kind?.commission || 0, net: kind?.net || 0 }
  }, [categoryDetailKind, breakdown])

  const txnRange = useMemo(() => {
    if (txnDateFilter === 'custom') {
      return txnCustomStart && txnCustomEnd ? { start: txnCustomStart, end: txnCustomEnd } : null
    }
    if (txnDateFilter === 'all') return null
    return getDateRangeForPeriod(txnDateFilter, { today })
  }, [txnDateFilter, txnCustomStart, txnCustomEnd, today])

  const filteredTxns = useMemo(() => {
    const rows = filterWalletTransactions(ledger, {
      type: txnTypeFilter === 'all' ? 'all' : txnTypeFilter,
      status: txnStatusFilter === 'All' ? 'all' : txnStatusFilter,
      range: txnRange,
    })
    return rows.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [ledger, txnTypeFilter, txnStatusFilter, txnRange])

  const recentTxns = filteredTxns.slice(0, 5)

  const settlementRows = useMemo(() => settlementFromLedger(astrologerWallet, todayIso), [astrologerWallet, todayIso])
  const refunds = useMemo(() => ledger.filter((txn) => txn.type === 'refund'), [ledger])
  const withdrawals = useMemo(() => ledger.filter((txn) => txn.type === 'withdrawal').slice().sort((a, b) => (a.date < b.date ? 1 : -1)), [ledger])

  const withdrawalWindow = getWithdrawalWindow(astrologerWallet.settlementSchedule, todayIso)
  const defaultPayoutMethod = payoutMethods.find((m) => m.isDefault)
  const selectedPaymentNumbers = selectedPayment ? paymentNumbers(selectedPayment) : null
  const txnTypeLabel = TXN_TYPE_FILTER_OPTIONS.find((option) => option.key === txnTypeFilter)?.label || 'All Transactions'
  const txnDateLabel = txnRange ? txnRange.label : TXN_DATE_OPTIONS.find((option) => option.key === txnDateFilter)?.label || 'All Dates'
  const breakdownRangeLabel = dateRange ? dateRange.label : 'Selected period'

  const openWithdrawModal = () => {
    setWithdrawAmount('')
    setWithdrawMethod(defaultPayoutMethod?.id || '')
    setWithdrawOpen(true)
  }

  const handleWithdraw = () => {
    const validation = validateWithdrawal(withdrawAmount, summary.availableBalance)
    if (!validation.valid || !withdrawMethod) return
    const txn = actions.initiateWithdrawal(validation.amount, withdrawMethod)
    if (txn) {
      setWithdrawOpen(false)
      setSuccessMessage('Withdrawal initiated successfully. It will be processed on the next settlement date.')
    }
  }

  const openAddPayoutModal = () => {
    setEditingMethod(null)
    setPayoutForm({ type: 'bank', bankName: '', accountNumber: '', ifsc: '', accountHolder: '', accountType: 'Savings', upiId: '', cardNumber: '', cardHolder: '' })
    setPayoutModal('add')
  }

  const openEditPayoutModal = (method) => {
    setEditingMethod(method)
    setPayoutForm({
      type: method.type,
      bankName: method.bankName || '',
      accountNumber: method.accountNumber || '',
      ifsc: method.ifsc || '',
      accountHolder: method.accountHolder || '',
      accountType: method.accountType || 'Savings',
      upiId: method.upiId || '',
      cardNumber: method.cardNumber || '',
      cardHolder: method.cardHolder || '',
    })
    setPayoutModal('edit')
  }

  const savePayoutMethod = () => {
    if (editingMethod) {
      actions.updatePayoutMethod(editingMethod.id, payoutForm)
      setSuccessMessage('Payout method updated successfully.')
    } else {
      actions.addPayoutMethod(payoutForm)
      setSuccessMessage('Payout method added successfully.')
    }
    setPayoutModal(null)
  }

  const withdrawalAmountError = useMemo(() => {
    if (!withdrawAmount) return null
    const validation = validateWithdrawal(withdrawAmount, summary.availableBalance)
    return validation.errors.includes('exceeds')
      ? 'Amount exceeds your available balance'
      : validation.errors.length
        ? 'Enter a valid amount greater than zero'
        : null
  }, [withdrawAmount, summary.availableBalance])

  const commissionPercent = (row) => {
    const paid = Number(row.customerPaid) || 0
    const comm = Number(row.platformCommission) || 0
    if (paid > 0) return Math.round((comm / paid) * 100)
    return row.commissionRate ? Math.round(Number(row.commissionRate) * 100) : 10
  }

  return (
    <div>
      {section === 'overview' && (
        <>
          <PageHeader
            eyebrow="Astrologer"
            title="Wallet"
            subtitle="Manage your earnings, pending payments, settlements and withdrawals."
            showBack
            backTo={routes.dashboard}
            actions={
              <div className="wallet-header-actions">
                <button type="button" className="btn btn-primary" onClick={() => navigate(`${walletPath}/withdraw`)}>
                  <ArrowDownToLine size={16} /> Withdraw Money
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => navigate(`${walletPath}/transactions`)}>
                  <FileText size={16} /> Transactions
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => navigate(`${walletPath}/settlements`)}>
                  <History size={16} /> Settlements
                </button>
              </div>
            }
          />

          {/* Summary Cards */}
          <div className="wallet-summary-grid section">
            <button type="button" className="wallet-stat-card wallet-stat-card--primary" onClick={openWithdrawModal}>
              <div className="wallet-stat-card__icon"><Wallet size={22} /></div>
              <div className="wallet-stat-card__body">
                <div className="wallet-stat-card__value">₹{summary.availableBalance.toLocaleString('en-IN')}</div>
                <div className="wallet-stat-card__label">Available Balance</div>
                <div className="wallet-stat-card__meta"><span className="wallet-stat-badge wallet-stat-badge--green">Withdrawable</span></div>
              </div>
            </button>

            <div className="wallet-stat-card">
              <div className="wallet-stat-card__icon wallet-stat-card__icon--amber"><Clock size={22} /></div>
              <div className="wallet-stat-card__body">
                <div className="wallet-stat-card__value">₹{summary.pendingBalance.toLocaleString('en-IN')}</div>
                <div className="wallet-stat-card__label">Pending Balance</div>
                <div className="wallet-stat-card__meta">Will be settled within 2-3 days</div>
              </div>
            </div>

            <button type="button" className="wallet-stat-card" onClick={() => setHeldModalOpen(true)}>
              <div className="wallet-stat-card__icon wallet-stat-card__icon--sky"><Lock size={22} /></div>
              <div className="wallet-stat-card__body">
                <div className="wallet-stat-card__value">₹{summary.heldBalance.toLocaleString('en-IN')}</div>
                <div className="wallet-stat-card__label">Held Amount</div>
                <div className="wallet-stat-card__meta">Held during the refund review window</div>
              </div>
            </button>

            <button type="button" className="wallet-stat-card" onClick={() => setRefundsOpen(true)}>
              <div className="wallet-stat-card__icon wallet-stat-card__icon--red"><Receipt size={22} /></div>
              <div className="wallet-stat-card__body">
                <div className="wallet-stat-card__value">₹{summary.refundsTotal.toLocaleString('en-IN')}</div>
                <div className="wallet-stat-card__label">Refunds</div>
                <div className="wallet-stat-card__meta">Refunded from your earnings</div>
              </div>
            </button>

            <div className="wallet-stat-card">
              <div className="wallet-stat-card__icon wallet-stat-card__icon--green"><TrendingUp size={22} /></div>
              <div className="wallet-stat-card__body">
                <div className="wallet-stat-card__value">₹{summary.totalEarnings.toLocaleString('en-IN')}</div>
                <div className="wallet-stat-card__label">Total Earnings</div>
                <div className="wallet-stat-card__meta">All time earnings</div>
              </div>
            </div>
          </div>

          {/* Earnings Preview */}
          <Section title="Earnings This Month" icon={TrendingUp}>
            <Card className="wallet-earnings-card">
              <div className="wallet-earnings-list">
                {EARNINGS_SOURCE_OPTIONS.map(({ key, label, icon: Icon, color }) => {
                  const kind = overviewBreakdown.kinds.find((item) => item.kind === key)
                  const amount = kind ? kind.net : 0
                  const pct = overviewBreakdown.net > 0 ? ((amount / overviewBreakdown.net) * 100).toFixed(1) : '0.0'
                  return (
                    <button
                      key={key}
                      type="button"
                      className="wallet-earnings-row"
                      onClick={() => navigate(`${walletPath}/earnings`)}
                    >
                      <div className="wallet-earnings-row__icon" style={{ color }}>{<Icon size={18} />}</div>
                      <div className="wallet-earnings-row__label">{label}</div>
                      <div className="wallet-earnings-row__bar">
                        <div className="wallet-earnings-row__bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="wallet-earnings-row__amount">₹{amount.toLocaleString('en-IN')}</div>
                      <div className="wallet-earnings-row__pct">{pct}%</div>
                      <ChevronRight size={16} className="wallet-earnings-row__arrow" />
                    </button>
                  )
                })}
              </div>

              <div className="wallet-earnings-total">
                <span>This Month</span>
                <span>Net Earnings ₹{overviewBreakdown.net.toLocaleString('en-IN')}</span>
              </div>
              <div className="wallet-earnings-hint">Click a category or view the full earnings page for a complete period breakdown.</div>
              <div className="wallet-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => navigate(`${walletPath}/earnings`)}>
                  <TrendingUp size={16} /> View Full Earnings
                </button>
              </div>
            </Card>
          </Section>

          {/* Pending & Held Payments */}
          <Section title="Pending & Held Payments" icon={Clock}>
            <Card className="wallet-pending-card">
              <div className="wallet-pending-group">
                <button type="button" className="wallet-pending-group__head" onClick={() => setPendingOpen((value) => !value)}>
                  <span className="wallet-pending-group__title">Pending Payments</span>
                  <span className="wallet-pending-group__total">₹{summary.pendingBalance.toLocaleString('en-IN')} · {pendingList.length} payments</span>
                  <ChevronDown size={16} className={`wallet-accordion-chevron${pendingOpen ? ' wallet-accordion-chevron--open' : ''}`} />
                </button>
                {pendingOpen && (
                  <div className="wallet-pending-list">
                    {pendingList.map((payment) => (
                      <button key={payment.id} type="button" className="wallet-pending-item" onClick={() => setSelectedPayment(payment)}>
                        <div className="wallet-pending-item__info">
                          <div className="wallet-pending-item__name">{WALLET_SOURCE_LABELS[payment.sourceKind] || payment.sourceKind} · {payment.customer}</div>
                          <div className="wallet-pending-item__meta">{payment.id} · {fmtDate(payment.date)}{payment.sourceRef ? ` · Ref ${payment.sourceRef}` : ''}</div>
                          <div className="wallet-pending-item__reason">{payment.reason}</div>
                        </div>
                        <div className="wallet-pending-item__right">
                          <div className="wallet-pending-item__amount">₹{paymentNumbers(payment).amount.toLocaleString('en-IN')}</div>
                          <span className={`wallet-txn-status ${statusClass(payment.status)}`}>{payment.status}</span>
                          <ChevronRight size={16} className="wallet-pending-item__arrow" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="wallet-pending-group">
                <button type="button" className="wallet-pending-group__head" onClick={() => setHeldOpen((value) => !value)}>
                  <span className="wallet-pending-group__title">Held Payments</span>
                  <span className="wallet-pending-group__total">₹{summary.heldBalance.toLocaleString('en-IN')} · {heldList.length} payments</span>
                  <ChevronDown size={16} className={`wallet-accordion-chevron${heldOpen ? ' wallet-accordion-chevron--open' : ''}`} />
                </button>
                {heldOpen && (
                  <div className="wallet-pending-list">
                    {heldList.map((payment) => (
                      <button key={payment.id} type="button" className="wallet-pending-item" onClick={() => setSelectedPayment(payment)}>
                        <div className="wallet-pending-item__info">
                          <div className="wallet-pending-item__name">{WALLET_SOURCE_LABELS[payment.sourceKind] || payment.sourceKind} · {payment.customer}</div>
                          <div className="wallet-pending-item__meta">{payment.id} · {fmtDate(payment.date)}{payment.sourceRef ? ` · Ref ${payment.sourceRef}` : ''}</div>
                          <div className="wallet-pending-item__reason">{payment.reason}</div>
                        </div>
                        <div className="wallet-pending-item__right">
                          <div className="wallet-pending-item__amount">₹{paymentNumbers(payment).amount.toLocaleString('en-IN')}</div>
                          <span className={`wallet-txn-status ${statusClass(payment.status)}`}>{payment.status}</span>
                          <ChevronRight size={16} className="wallet-pending-item__arrow" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </Section>

          {/* Recent Transactions Preview */}
          <Section title="Recent Transactions" icon={FileText}>
            <Card className="wallet-txn-card">
              <div className="wallet-txn-table-wrap">
                <table className="wallet-txn-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTxns.map((txn) => (
                      <tr key={txn.id} className="wallet-txn-row" onClick={() => setSelectedEarning(txn)}>
                        <td className="wallet-txn-date">{txn.id}</td>
                        <td className="wallet-txn-date">{fmtDate(txn.date)}</td>
                        <td><span className={`wallet-txn-type wallet-txn-type--${txn.type}`}>{WALLET_TXN_TYPE_LABELS[txn.type] || txn.type}</span></td>
                        <td className={`wallet-txn-amount ${txn.amount >= 0 ? 'wallet-txn-amount--credit' : 'wallet-txn-amount--debit'}`}>
                          {formatINR(txn.amount)}
                        </td>
                        <td><span className={`wallet-txn-status ${statusClass(txn.status)}`}>{txn.status}</span></td>
                        <td className="wallet-txn-balance">₹{txn.balanceAfter.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {recentTxns.length === 0 && (
                <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No transactions yet.</div>
              )}

              <div className="wallet-txn-footer">
                <span className="muted">{filteredTxns.length} transaction{filteredTxns.length === 1 ? '' : 's'} in total</span>
                <button type="button" className="btn btn-primary" onClick={() => navigate(`${walletPath}/transactions`)}>View All Transactions</button>
              </div>
            </Card>
          </Section>
        </>
      )}

      {section === 'earnings' && (
        <>
          <PageHeader
            eyebrow="Astrologer"
            title="Earnings"
            subtitle="Your earnings breakdown by service category for the selected period."
          />
          <div className="wallet-page-back"><BackButton to={`${walletPath}/overview`} /></div>

          <Section title="Earnings Breakdown" icon={TrendingUp}>
            <Card className="wallet-earnings-card">
              <div className="wallet-period-field">
                <label className="field-label-top" htmlFor="wallet-earnings-period">Earnings Period</label>
                <select
                  id="wallet-earnings-period"
                  className="select-input wallet-period-select"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  {PERIOD_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </div>

              {period === 'custom' && (
                <div className="wallet-custom-range">
                  <div>
                    <label className="field-label-top">Start Date</label>
                    <input type="date" className="text-input" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                  </div>
                  <span className="wallet-custom-range__arrow">→</span>
                  <div>
                    <label className="field-label-top">End Date</label>
                    <input type="date" className="text-input" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="wallet-earnings-list">
                {EARNINGS_SOURCE_OPTIONS.map(({ key, label, icon: Icon, color }) => {
                  const kind = breakdown.kinds.find((item) => item.kind === key)
                  const amount = kind ? kind.net : 0
                  const pct = breakdown.net > 0 ? ((amount / breakdown.net) * 100).toFixed(1) : '0.0'
                  return (
                    <button
                      key={key}
                      type="button"
                      className="wallet-earnings-row"
                      onClick={() => setCategoryDetailKind(key)}
                    >
                      <div className="wallet-earnings-row__icon" style={{ color }}>{<Icon size={18} />}</div>
                      <div className="wallet-earnings-row__label">{label}</div>
                      <div className="wallet-earnings-row__bar">
                        <div className="wallet-earnings-row__bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="wallet-earnings-row__amount">₹{amount.toLocaleString('en-IN')}</div>
                      <div className="wallet-earnings-row__pct">{pct}%</div>
                      <ChevronRight size={16} className="wallet-earnings-row__arrow" />
                    </button>
                  )
                })}
              </div>

              <div className="wallet-earnings-total">
                <span>{dateRange ? dateRange.label : 'Selected period'}</span>
                <span>Net Earnings ₹{breakdown.net.toLocaleString('en-IN')}</span>
              </div>
              <div className="wallet-earnings-hint">Click a category to view its earnings in this period.</div>
            </Card>
          </Section>
        </>
      )}

      {section === 'transactions' && (
        <>
          <PageHeader
            eyebrow="Astrologer"
            title="Transactions"
            subtitle="Browse your wallet transactions and download a statement."
          />
          <div className="wallet-page-back"><BackButton to={`${walletPath}/overview`} /></div>

          <Section title="All Transactions" icon={FileText}>
            <Card className="wallet-txn-card">
              <div className="wallet-txn-toolbar">
                <button type="button" className="icon-btn" onClick={() => setShowFilters(!showFilters)} title="Filters">
                  <Filter size={18} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => downloadTransactionsPdf(filteredTxns, { typeLabel: txnTypeLabel, dateLabel: txnDateLabel, statusFilter: txnStatusFilter })}
                  disabled={filteredTxns.length === 0}
                >
                  <Download size={16} /> Download PDF
                </button>
              </div>

              {showFilters && (
                <div className="wallet-txn-filters">
                  <select className="select-input" value={txnTypeFilter} onChange={(e) => setTxnTypeFilter(e.target.value)}>
                    {TXN_TYPE_FILTER_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                  <select className="select-input" value={txnStatusFilter} onChange={(e) => setTxnStatusFilter(e.target.value)}>
                    {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <select className="select-input" value={txnDateFilter} onChange={(e) => setTxnDateFilter(e.target.value)}>
                    {TXN_DATE_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                  {txnDateFilter === 'custom' && (
                    <div className="wallet-custom-range">
                      <input type="date" className="text-input" value={txnCustomStart} onChange={(e) => setTxnCustomStart(e.target.value)} />
                      <span className="wallet-custom-range__arrow">→</span>
                      <input type="date" className="text-input" value={txnCustomEnd} onChange={(e) => setTxnCustomEnd(e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              <div className="wallet-txn-table-wrap">
                <table className="wallet-txn-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxns.map((txn) => (
                      <tr key={txn.id} className="wallet-txn-row" onClick={() => setSelectedEarning(txn)}>
                        <td className="wallet-txn-date">{txn.id}</td>
                        <td className="wallet-txn-date">{fmtDate(txn.date)}</td>
                        <td><span className={`wallet-txn-type wallet-txn-type--${txn.type}`}>{WALLET_TXN_TYPE_LABELS[txn.type] || txn.type}</span></td>
                        <td className={`wallet-txn-amount ${txn.amount >= 0 ? 'wallet-txn-amount--credit' : 'wallet-txn-amount--debit'}`}>
                          {formatINR(txn.amount)}
                        </td>
                        <td><span className={`wallet-txn-status ${statusClass(txn.status)}`}>{txn.status}</span></td>
                        <td className="wallet-txn-balance">₹{txn.balanceAfter.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredTxns.length === 0 && (
                <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No transactions match the selected filters.</div>
              )}

              <div className="wallet-txn-footer">
                <span className="muted">{filteredTxns.length} transaction{filteredTxns.length === 1 ? '' : 's'} found</span>
              </div>
            </Card>
          </Section>
        </>
      )}

      {section === 'withdraw' && (
        <>
          <PageHeader
            eyebrow="Astrologer"
            title="Withdraw Money"
            subtitle="Request a withdrawal to your preferred payout method."
          />
          <div className="wallet-page-back"><BackButton to={`${walletPath}/overview`} /></div>

          <Section title="Withdraw Money" icon={ArrowDownToLine}>
            <Card>
              <div className="wallet-withdraw-info">
                <div>Available Balance</div>
                <strong>₹{summary.availableBalance.toLocaleString('en-IN')}</strong>
              </div>

              <div className="field-group" style={{ marginTop: 18 }}>
                <label className="field-label-top">Withdrawal Amount</label>
                <input
                  type="number"
                  className="text-input"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min={1}
                  max={summary.availableBalance}
                />
                {withdrawalAmountError && (
                  <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{withdrawalAmountError}</div>
                )}
              </div>

              <div className="field-group" style={{ marginTop: 16 }}>
                <label className="field-label-top">Payout Method</label>
                <select className="select-input" value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)}>
                  <option value="">Select payout method</option>
                  {payoutMethods.map((method) => (
                    <option key={method.id} value={method.id}>{payoutDisplayLabel(method)}</option>
                  ))}
                </select>
                {!withdrawMethod && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>Select a payout method to continue.</div>}
              </div>

              <div className="wallet-settlement-note">
                <Clock size={16} />
                <span>
                  {withdrawalWindow.enabled
                    ? withdrawalWindow.allowed
                      ? `Withdrawals are processed on the settlement date (${withdrawalWindow.nextSettlementDate}).`
                      : `The settlement window opens on ${withdrawalWindow.windowStartDate}. Your request will be queued and processed on the next settlement date (${withdrawalWindow.nextSettlementDate}).`
                    : 'No settlement restriction is currently configured.'}
                </span>
              </div>

              <div className="wallet-withdraw-summary">
                <div><span>Amount</span><strong>₹{Number(withdrawAmount || 0).toLocaleString('en-IN')}</strong></div>
                <div><span>Platform Fee</span><strong>₹0</strong></div>
                <div className="wallet-withdraw-summary__total"><span>You will receive</span><strong>₹{Number(withdrawAmount || 0).toLocaleString('en-IN')}</strong></div>
              </div>

              <div className="wallet-modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > summary.availableBalance || !withdrawMethod}
                  onClick={handleWithdraw}
                >
                  <ArrowDownToLine size={16} /> Confirm Withdrawal
                </button>
              </div>
            </Card>
          </Section>

          <Section title="Withdrawal History" icon={History}>
            <Card>
              <div className="wallet-txn-table-wrap">
                <table className="wallet-txn-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Payout Method</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td className="wallet-txn-date">{w.id}</td>
                        <td className="wallet-txn-date">{fmtDate(w.date)}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--debit">{formatINR(w.amount)}</td>
                        <td className="wallet-txn-desc">{w.payoutLabel || '—'}</td>
                        <td><span className={`wallet-txn-status ${statusClass(w.status)}`}>{w.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Section>
        </>
      )}

      {section === 'settlements' && (
        <>
          <PageHeader
            eyebrow="Astrologer"
            title="Settlement History"
            subtitle="Monthly settlements and payout records."
          />
          <div className="wallet-page-back"><BackButton to={`${walletPath}/overview`} /></div>

          <Section title="Monthly Settlements" icon={History}>
            <Card>
              <div className="wallet-txn-table-wrap">
                <table className="wallet-txn-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Period</th>
                      <th>Gross Earnings</th>
                      <th>Commission</th>
                      <th>Refunds</th>
                      <th>Other Deductions</th>
                      <th>Net Earnings</th>
                      <th>Amount Settled</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementRows.map((s) => (
                      <tr key={s.id} className="wallet-txn-row" onClick={() => setSelectedSettlement(s)}>
                        <td className="wallet-txn-date">{s.id}</td>
                        <td className="wallet-txn-date">{s.date}</td>
                        <td className="wallet-txn-desc">{s.period}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--credit">₹{s.grossEarnings.toLocaleString('en-IN')}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--debit">-₹{s.platformCommission.toLocaleString('en-IN')}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--debit">{s.refunds ? `-₹${s.refunds.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--debit">{s.otherDeductions ? `-₹${s.otherDeductions.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--credit">₹{s.netEarnings.toLocaleString('en-IN')}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--credit">₹{s.amountSettled.toLocaleString('en-IN')}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--debit">{s.remaining ? `₹${s.remaining.toLocaleString('en-IN')}` : '₹0'}</td>
                        <td><span className={`wallet-txn-status ${statusClass(s.status)}`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Section>
        </>
      )}

      {section === 'payment-methods' && (
        <>
          <PageHeader
            eyebrow="Astrologer"
            title="Payment Methods"
            subtitle="Manage your bank, UPI and card payout details."
          />
          <div className="wallet-page-back"><BackButton to={`${walletPath}/overview`} /></div>

          <Section title="Payout Methods" icon={CreditCard}>
            <Card className="wallet-payout-card">
              <div className="wallet-payout-header">
                <span className="muted">Bank, UPI and card details for receiving payouts</span>
                <button type="button" className="btn btn-outline" onClick={openAddPayoutModal}>
                  <Plus size={16} /> Add New
                </button>
              </div>

              <div className="wallet-payout-list">
                {payoutMethods.map((method) => (
                  <div key={method.id} className={`wallet-payout-item${method.isDefault ? ' wallet-payout-item--default' : ''}`}>
                    <div className="wallet-payout-item__icon">
                      <PayoutMethodIcon type={method.type} />
                    </div>
                    <div className="wallet-payout-item__info">
                      <div className="wallet-payout-item__name">
                        {method.type === 'bank' ? `${method.bankName || 'Bank'} ${maskAccountNumber(method.accountNumber)}` : method.type === 'upi' ? `UPI: ${maskUPI(method.upiId)}` : `Card ${maskCard(method.cardNumber)}`}
                        {method.isDefault && <span className="wallet-default-badge">Default</span>}
                      </div>
                      {method.type === 'bank' && (
                        <div className="wallet-payout-item__detail">IFSC: {method.ifsc || '—'} · {method.accountHolder || '—'}{method.accountType ? ` · ${method.accountType}` : ''}</div>
                      )}
                      {method.type === 'card' && <div className="wallet-payout-item__detail">{method.cardHolder || '—'}</div>}
                    </div>
                    <div className="wallet-payout-item__actions">
                      {!method.isDefault && (
                        <button type="button" className="icon-btn" title="Set as default" onClick={() => actions.setDefaultPayoutMethod(method.id)}>
                          <Star size={16} />
                        </button>
                      )}
                      <button type="button" className="icon-btn" title="Edit" onClick={() => openEditPayoutModal(method)}>
                        <Pencil size={16} />
                      </button>
                      {payoutMethods.length > 1 && (
                        <button type="button" className="icon-btn danger" title="Remove" onClick={() => actions.removePayoutMethod(method.id)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Section>
        </>
      )}

      {/* Withdraw Modal */}
      {withdrawOpen && createPortal((
        <div className="modal-overlay" onClick={() => setWithdrawOpen(false)}>
          <div className="modal-card" style={{ width: 'min(480px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <ArrowDownToLine size={20} /> Withdraw Funds
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setWithdrawOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="wallet-withdraw-info">
                <div>Available Balance</div>
                <strong>₹{summary.availableBalance.toLocaleString('en-IN')}</strong>
              </div>

              <div className="field-group" style={{ marginTop: 18 }}>
                <label className="field-label-top">Withdrawal Amount</label>
                <input
                  type="number"
                  className="text-input"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min={1}
                  max={summary.availableBalance}
                />
                {withdrawalAmountError && (
                  <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{withdrawalAmountError}</div>
                )}
              </div>

              <div className="field-group" style={{ marginTop: 16 }}>
                <label className="field-label-top">Payout Method</label>
                <select className="select-input" value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)}>
                  <option value="">Select payout method</option>
                  {payoutMethods.map((method) => (
                    <option key={method.id} value={method.id}>{payoutDisplayLabel(method)}</option>
                  ))}
                </select>
                {!withdrawMethod && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>Select a payout method to continue.</div>}
              </div>

              <div className="wallet-settlement-note">
                <Clock size={16} />
                <span>
                  {withdrawalWindow.enabled
                    ? withdrawalWindow.allowed
                      ? `Withdrawals are processed on the settlement date (${withdrawalWindow.nextSettlementDate}).`
                      : `The settlement window opens on ${withdrawalWindow.windowStartDate}. Your request will be queued and processed on the next settlement date (${withdrawalWindow.nextSettlementDate}).`
                    : 'No settlement restriction is currently configured.'}
                </span>
              </div>

              <div className="wallet-withdraw-summary">
                <div><span>Amount</span><strong>₹{Number(withdrawAmount || 0).toLocaleString('en-IN')}</strong></div>
                <div><span>Platform Fee</span><strong>₹0</strong></div>
                <div className="wallet-withdraw-summary__total"><span>You will receive</span><strong>₹{Number(withdrawAmount || 0).toLocaleString('en-IN')}</strong></div>
              </div>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setWithdrawOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > summary.availableBalance || !withdrawMethod}
                onClick={handleWithdraw}
              >
                <ArrowDownToLine size={16} /> Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Add/Edit Payout Method Modal */}
      {payoutModal && createPortal((
        <div className="modal-overlay" onClick={() => setPayoutModal(null)}>
          <div className="modal-card" style={{ width: 'min(520px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                {editingMethod ? 'Edit Payout Method' : 'Add Payout Method'}
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setPayoutModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="field-group">
                <label className="field-label-top">Method Type</label>
                <select className="select-input" value={payoutForm.type} onChange={(e) => setPayoutForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="bank">Bank Account</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {payoutForm.type === 'bank' && (
                <>
                  <div className="field-group" style={{ marginTop: 14 }}>
                    <label className="field-label-top">Bank Name</label>
                    <input className="text-input" value={payoutForm.bankName} onChange={(e) => setPayoutForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="e.g. HDFC Bank" />
                  </div>
                  <div className="field-group" style={{ marginTop: 14 }}>
                    <label className="field-label-top">Account Number</label>
                    <input className="text-input" value={payoutForm.accountNumber} onChange={(e) => setPayoutForm((f) => ({ ...f, accountNumber: e.target.value }))} placeholder="Enter account number" />
                  </div>
                  <div className="field-group" style={{ marginTop: 14 }}>
                    <label className="field-label-top">IFSC Code</label>
                    <input className="text-input" value={payoutForm.ifsc} onChange={(e) => setPayoutForm((f) => ({ ...f, ifsc: e.target.value }))} placeholder="e.g. HDFC0001234" />
                  </div>
                  <div className="field-group" style={{ marginTop: 14 }}>
                    <label className="field-label-top">Account Holder Name</label>
                    <input className="text-input" value={payoutForm.accountHolder} onChange={(e) => setPayoutForm((f) => ({ ...f, accountHolder: e.target.value }))} placeholder="Enter name" />
                  </div>
                  <div className="field-group" style={{ marginTop: 14 }}>
                    <label className="field-label-top">Account Type</label>
                    <select className="select-input" value={payoutForm.accountType} onChange={(e) => setPayoutForm((f) => ({ ...f, accountType: e.target.value }))}>
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                    </select>
                  </div>
                </>
              )}

              {payoutForm.type === 'upi' && (
                <div className="field-group" style={{ marginTop: 14 }}>
                  <label className="field-label-top">UPI ID</label>
                  <input className="text-input" value={payoutForm.upiId} onChange={(e) => setPayoutForm((f) => ({ ...f, upiId: e.target.value }))} placeholder="e.g. name@upi" />
                </div>
              )}

              {payoutForm.type === 'card' && (
                <>
                  <div className="field-group" style={{ marginTop: 14 }}>
                    <label className="field-label-top">Card Number</label>
                    <input className="text-input" value={payoutForm.cardNumber} onChange={(e) => setPayoutForm((f) => ({ ...f, cardNumber: e.target.value }))} placeholder="Enter card number" />
                  </div>
                  <div className="field-group" style={{ marginTop: 14 }}>
                    <label className="field-label-top">Card Holder Name</label>
                    <input className="text-input" value={payoutForm.cardHolder} onChange={(e) => setPayoutForm((f) => ({ ...f, cardHolder: e.target.value }))} placeholder="Enter name" />
                  </div>
                </>
              )}
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setPayoutModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={savePayoutMethod}>
                {editingMethod ? 'Save Changes' : 'Add Method'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Refunds Modal */}
      {refundsOpen && createPortal((
        <div className="modal-overlay" onClick={() => setRefundsOpen(false)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(860px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <Receipt size={20} /> Refunds & Adjustments
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setRefundsOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="wallet-txn-table-wrap">
                <table className="wallet-txn-table">
                  <thead>
                    <tr>
                      <th>Refund ID</th>
                      <th>Date</th>
                      <th>Related Transaction</th>
                      <th>Related Service</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((refund) => (
                      <tr key={refund.id}>
                        <td className="wallet-txn-date">{refund.refundRef || refund.id}</td>
                        <td className="wallet-txn-date">{fmtDate(refund.date)}</td>
                        <td className="wallet-txn-date">{refund.id}</td>
                        <td className="wallet-txn-desc">{refund.sourceSummary || refund.description || '—'}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--debit">{formatINR(refund.amount)}</td>
                        <td className="wallet-txn-desc">{refund.reason || '—'}</td>
                        <td><span className={`wallet-txn-status ${statusClass(refund.status)}`}>{refund.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {refunds.length === 0 && <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No refunds recorded.</div>}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Transaction / Earning Detail Modal */}
      {selectedEarning && createPortal((
        <div className="modal-overlay" onClick={() => setSelectedEarning(null)}>
          <div className="modal-card" style={{ width: 'min(520px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                {selectedEarning.type === 'earning' ? 'Earning Details' : 'Transaction Details'}
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSelectedEarning(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="wallet-detail-grid">
                <div><span>Transaction ID</span><strong>{selectedEarning.id}</strong></div>
                <div><span>Date</span><strong>{fmtDate(selectedEarning.date)}</strong></div>
                <div><span>Time</span><strong>{selectedEarning.time || '—'}</strong></div>
                <div><span>Type</span><strong>{WALLET_TXN_TYPE_LABELS[selectedEarning.type] || selectedEarning.type}</strong></div>
                <div><span>Status</span><strong><span className={`wallet-txn-status ${statusClass(selectedEarning.status)}`}>{selectedEarning.status}</span></strong></div>
                {selectedEarning.sourceKind && (
                  <div><span>Source</span><strong>{WALLET_SOURCE_LABELS[selectedEarning.sourceKind] || selectedEarning.sourceKind}</strong></div>
                )}
                {selectedEarning.customer && <div><span>Customer</span><strong>{selectedEarning.customer}</strong></div>}
                {(selectedEarning.sourceSummary || selectedEarning.description) && (
                  <div><span>Related Service</span><strong>{selectedEarning.sourceSummary || selectedEarning.description}</strong></div>
                )}
                {selectedEarning.sourceRef && <div><span>Reference</span><strong>{selectedEarning.sourceRef}</strong></div>}
                {selectedEarning.reason && <div><span>Reason</span><strong>{selectedEarning.reason}</strong></div>}
              </div>

              <div className="wallet-earnings-summary" style={{ marginTop: 16 }}>
                {selectedEarning.type === 'earning' ? (
                  <>
                    <div><span>Customer Paid</span><span>₹{selectedEarning.customerPaid.toLocaleString('en-IN')}</span></div>
                    <div><span>Platform Commission ({commissionPercent(selectedEarning)}%)</span><span>-₹{selectedEarning.platformCommission.toLocaleString('en-IN')}</span></div>
                    <div className="wallet-earnings-summary__total"><span>Astrologer Earnings</span><span>₹{selectedEarning.astrologerEarnings.toLocaleString('en-IN')}</span></div>
                  </>
                ) : (
                  <>
                    <div><span>Amount</span><span>{formatINR(selectedEarning.amount)}</span></div>
                    <div><span>Balance After</span><span>₹{selectedEarning.balanceAfter.toLocaleString('en-IN')}</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Category Earnings Detail Modal */}
      {categoryDetailKind && createPortal((
        <div className="modal-overlay" onClick={() => setCategoryDetailKind(null)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(760px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                {WALLET_SOURCE_LABELS[categoryDetailKind]} — {breakdownRangeLabel}
                <span className="wallet-modal-count">{categoryEarnings.rows.length} records · Net ₹{categoryEarnings.net.toLocaleString('en-IN')}</span>
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setCategoryDetailKind(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              {categoryEarnings.rows.length === 0 ? (
                <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No earnings in this category for the selected period.</div>
              ) : (
                <div className="wallet-earnings-detail__list">
                  {categoryEarnings.rows.map((row) => (
                    <button key={row.id} type="button" className="wallet-earning-row" onClick={() => setSelectedEarning(row)}>
                      <div className="wallet-earning-row__main">
                        <div className="wallet-earning-row__title">{row.customer}{row.sourceSummary ? ` · ${row.sourceSummary}` : ''}</div>
                        <div className="wallet-earning-row__meta">{row.id} · {fmtDate(row.date)}{row.time ? ` · ${row.time}` : ''} · Status: {row.status}</div>
                      </div>
                      <div className="wallet-earning-row__right">
                        <div className="wallet-earning-row__amount">+₹{row.astrologerEarnings.toLocaleString('en-IN')}</div>
                        <div className="wallet-earning-row__meta">Paid ₹{row.customerPaid.toLocaleString('en-IN')} · Commission ₹{row.platformCommission.toLocaleString('en-IN')}</div>
                      </div>
                      <ChevronRight size={16} className="wallet-earning-row__arrow" />
                    </button>
                  ))}
                </div>
              )}
              <div className="wallet-modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => downloadCategoryEarningsPdf(categoryDetailKind, categoryEarnings.rows, WALLET_SOURCE_LABELS[categoryDetailKind], breakdownRangeLabel, categoryEarnings)}
                  disabled={categoryEarnings.rows.length === 0}
                >
                  <Download size={16} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Held Payments Detail Modal */}
      {heldModalOpen && createPortal((
        <div className="modal-overlay" onClick={() => setHeldModalOpen(false)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(760px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <Lock size={20} /> Held Payments
                <span className="wallet-modal-count">{heldList.length} payments · ₹{summary.heldBalance.toLocaleString('en-IN')}</span>
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setHeldModalOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              {heldList.length === 0 ? (
                <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No payments are currently held.</div>
              ) : (
                <div className="wallet-earnings-detail__list">
                  {heldList.map((payment) => (
                    <button key={payment.id} type="button" className="wallet-earning-row" onClick={() => setSelectedPayment(payment)}>
                      <div className="wallet-earning-row__main">
                        <div className="wallet-earning-row__title">{WALLET_SOURCE_LABELS[payment.sourceKind] || payment.sourceKind} · {payment.customer}</div>
                        <div className="wallet-earning-row__meta">{payment.id} · {fmtDate(payment.date)}{payment.time ? ` · ${payment.time}` : ''}{payment.reason ? ` · ${payment.reason}` : ''}</div>
                      </div>
                      <div className="wallet-earning-row__right">
                        <div className="wallet-earning-row__amount">₹{payment.amount.toLocaleString('en-IN')}</div>
                        <span className={`wallet-txn-status ${statusClass(payment.status)}`}>{payment.status}</span>
                      </div>
                      <ChevronRight size={16} className="wallet-earning-row__arrow" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Pending / Held Payment Detail Modal */}
      {selectedPayment && createPortal((
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal-card" style={{ width: 'min(520px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                {selectedPayment.status === 'Held' ? 'Held Payment Details' : 'Pending Payment Details'}
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSelectedPayment(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="wallet-detail-grid">
                <div><span>Payment ID</span><strong>{selectedPayment.id}</strong></div>
                <div><span>Status</span><strong><span className={`wallet-txn-status ${statusClass(selectedPayment.status)}`}>{selectedPayment.status}</span></strong></div>
                <div><span>Customer</span><strong>{selectedPayment.customer || '—'}</strong></div>
                <div><span>Service</span><strong>{paymentServiceLabel(selectedPayment)}</strong></div>
                <div><span>Date</span><strong>{fmtDate(selectedPayment.date)}</strong></div>
                <div><span>Time</span><strong>{selectedPayment.time || '—'}</strong></div>
                <div><span>Reference</span><strong>{selectedPayment.sourceRef || '—'}</strong></div>
                <div><span>Amount</span><strong>₹{selectedPaymentNumbers.amount.toLocaleString('en-IN')}</strong></div>
              </div>

              <div className="wallet-earnings-summary" style={{ marginTop: 16 }}>
                <div><span>Customer Paid</span><span>₹{selectedPaymentNumbers.customerPaid.toLocaleString('en-IN')}</span></div>
                <div><span>Platform Commission ({selectedPaymentNumbers.pct}%)</span><span>-₹{selectedPaymentNumbers.platformCommission.toLocaleString('en-IN')}</span></div>
                <div className="wallet-earnings-summary__total"><span>Astrologer Earnings</span><span>₹{selectedPaymentNumbers.astrologerEarnings.toLocaleString('en-IN')}</span></div>
              </div>

              {selectedPayment.reason && (
                <div className="wallet-hint-block">
                  <strong>Reason</strong>
                  <p>{selectedPayment.reason}</p>
                </div>
              )}
              {selectedPayment.disputeInfo && (
                <div className="wallet-hint-block">
                  <strong>Dispute / Review Info</strong>
                  <p>{selectedPayment.disputeInfo}</p>
                </div>
              )}
              {(selectedPayment.releaseInfo || selectedPayment.disputeInfo) && (
                <div className="wallet-hint-block">
                  <strong>Release / Resolution</strong>
                  <p>{selectedPayment.releaseInfo || selectedPayment.disputeInfo}</p>
                </div>
              )}

              <div className="wallet-modal-actions">
                <button type="button" className="btn btn-primary" onClick={() => downloadPaymentPdf(selectedPayment)}>
                  <Download size={16} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Settlement Detail Modal */}
      {selectedSettlement && createPortal((
        <div className="modal-overlay" onClick={() => setSelectedSettlement(null)}>
          <div className="modal-card" style={{ width: 'min(520px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <History size={20} /> Settlement Details
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSelectedSettlement(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="wallet-detail-grid">
                <div><span>Settlement ID</span><strong>{selectedSettlement.id}</strong></div>
                <div><span>Period</span><strong>{selectedSettlement.period}</strong></div>
                <div><span>Date</span><strong>{fmtDate(selectedSettlement.date)}</strong></div>
                <div><span>Status</span><strong><span className={`wallet-txn-status ${statusClass(selectedSettlement.status)}`}>{selectedSettlement.status}</span></strong></div>
              </div>

              <div className="wallet-earnings-summary" style={{ marginTop: 16 }}>
                <div><span>Gross Earnings</span><span>₹{selectedSettlement.grossEarnings.toLocaleString('en-IN')}</span></div>
                <div><span>Platform Commission</span><span>-₹{selectedSettlement.platformCommission.toLocaleString('en-IN')}</span></div>
                <div><span>Refunds</span><span>{selectedSettlement.refunds ? `-₹${selectedSettlement.refunds.toLocaleString('en-IN')}` : '—'}</span></div>
                <div><span>Other Deductions</span><span>{selectedSettlement.otherDeductions ? `-₹${selectedSettlement.otherDeductions.toLocaleString('en-IN')}` : '—'}</span></div>
                <div className="wallet-earnings-summary__total"><span>Net Earnings</span><span>₹{selectedSettlement.netEarnings.toLocaleString('en-IN')}</span></div>
                <div><span>Amount Settled</span><span>₹{selectedSettlement.amountSettled.toLocaleString('en-IN')}</span></div>
                <div><span>Remaining</span><span>₹{selectedSettlement.remaining.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage('')} />}
    </div>
  )
}

export function WalletOverview() {
  return <AstrologerWallet section="overview" />
}

export function WalletEarnings() {
  return <AstrologerWallet section="earnings" />
}

export function WalletTransactions() {
  return <AstrologerWallet section="transactions" />
}

export function WalletWithdraw() {
  return <AstrologerWallet section="withdraw" />
}

export function WalletSettlements() {
  return <AstrologerWallet section="settlements" />
}

export function WalletPaymentMethods() {
  return <AstrologerWallet section="payment-methods" />
}