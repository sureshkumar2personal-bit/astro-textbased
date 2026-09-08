import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  TrendingUp,
  Plus,
  X,
  Filter,
  Download,
  History,
  ChevronRight,
  ArrowUpRight,
  Receipt,
  Search,
  CalendarDays,
  Phone,
  MessageCircle,
  CircleHelp,
  MoreHorizontal,
  ArrowDownLeft,
  Building2,
  Smartphone,
  Check,
  CreditCard,
  Info,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Section from '../../../components/ui/Section.jsx'
import Card from '../../../components/ui/Card.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import BackButton from '../../../components/BackButton.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { getDateRangeForPeriod } from '../../../utils/wallet.js'
import { downloadPdf } from '../../../utils/pdfReport.js'
import {
  computeUserWalletStats,
  parseUserTxn,
  filterUserWalletTransactions,
  getUserWalletSpendingBreakdown,
  getUserTxnTypeLabel,
  USER_SPENDING_CATEGORY_LABELS,
} from '../../../utils/userWallet.js'

const TXN_TYPE_FILTER_OPTIONS = [
  { key: 'all', label: 'All Types' },
  { key: 'topup', label: 'Top-ups' },
  { key: 'purchase', label: 'Spending' },
  { key: 'refund', label: 'Refunds' },
]

const TXN_DATE_OPTIONS = [
  { key: 'all', label: 'All Dates' },
  { key: 'today', label: 'Today' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'thismonth', label: 'This Month' },
  { key: 'last3months', label: 'Last 3 Months' },
  { key: 'custom', label: 'Custom Range' },
]

const SPENDING_PERIOD_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'thismonth', label: 'This Month' },
  { key: 'lastmonth', label: 'Last Month' },
  { key: 'thisyear', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

const SPENDING_SOURCE_OPTIONS = [
  { key: 'appointment', icon: CalendarDays, color: 'var(--primary)' },
  { key: 'call', icon: Phone, color: 'var(--accent)' },
  { key: 'chat', icon: MessageCircle, color: 'var(--sky-500)' },
  { key: 'question', icon: CircleHelp, color: 'var(--violet-600)' },
  { key: 'other', icon: MoreHorizontal, color: 'var(--muted)' },
]

const QUICK_TOP_UP_AMOUNTS = [100, 250, 500, 1000, 2000]

const TOPUP_METHOD_ICONS = { bank: Building2, upi: Smartphone, card: CreditCard }

function maskMethod(method) {
  if (!method) return 'Saved method'
  if (method.type === 'bank') return `${method.bankName || 'Bank'} ****${String(method.accountNumber || '').slice(-4)}`
  if (method.type === 'upi') return method.upiId
  if (method.type === 'card') return `${method.cardNetwork || 'Card'} ****${String(method.cardNumber || '').slice(-4)}`
  return 'Saved method'
}

function formatINR(amount) {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-IN')
  return amount < 0 ? `-₹${formatted}` : `+₹${formatted}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function typeChipClass(txn) {
  const label = getUserTxnTypeLabel(txn)
  const slug = label.toLowerCase().replace(/\s+/g, '-')
  return `wallet-txn-type wallet-txn-type--${slug}`
}

export default function UserWallet({ section = 'overview' }) {
  const { currentUser } = useAuth()
  const { userWallet, userPaymentMethods, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const walletPath = routes.walletManagement

  const [showFilters, setShowFilters] = useState(false)
  const [txnTypeFilter, setTxnTypeFilter] = useState('all')
  const [txnDateFilter, setTxnDateFilter] = useState('all')
  const [txnSearch, setTxnSearch] = useState('')
  const [txnCustomStart, setTxnCustomStart] = useState('')
  const [txnCustomEnd, setTxnCustomEnd] = useState('')

  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpMethodId, setTopUpMethodId] = useState('')
  const [topUpConfirmOpen, setTopUpConfirmOpen] = useState(false)
  const [categoryDetailKind, setCategoryDetailKind] = useState(null)
  const [selectedTxn, setSelectedTxn] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const [spendPeriod, setSpendPeriod] = useState('thismonth')
  const [spendCustomStart, setSpendCustomStart] = useState('')
  const [spendCustomEnd, setSpendCustomEnd] = useState('')

  const today = useMemo(() => new Date(), [])
  const stats = useMemo(() => computeUserWalletStats(userWallet), [userWallet])
  const transactions = useMemo(() => (userWallet.transactions || []).map(parseUserTxn), [userWallet])

  const defaultTopUpMethod = userPaymentMethods.find((m) => m.isDefault)
  const selectedTopUpMethod = userPaymentMethods.find((m) => m.id === topUpMethodId) || (userPaymentMethods.length === 1 ? userPaymentMethods[0] : null) || defaultTopUpMethod

  const dateRange = useMemo(() => {
    if (spendPeriod === 'custom') {
      if (!spendCustomStart || !spendCustomEnd) return null
      return { start: spendCustomStart, end: spendCustomEnd, label: `${spendCustomStart} → ${spendCustomEnd}` }
    }
    return getDateRangeForPeriod(spendPeriod, { today })
  }, [spendPeriod, spendCustomStart, spendCustomEnd, today])

  const spendingBreakdown = useMemo(() => getUserWalletSpendingBreakdown(transactions, dateRange), [transactions, dateRange])

  const recentTxns = useMemo(
    () => transactions.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 5),
    [transactions],
  )
  const topUpTxns = useMemo(
    () => transactions.filter((txn) => txn.type === 'topup').slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [transactions],
  )
  const refundTxns = useMemo(
    () => transactions.filter((txn) => txn.type === 'refund').slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [transactions],
  )

  const categoryEarnings = useMemo(() => {
    if (!categoryDetailKind) return { kind: categoryDetailKind, rows: [], total: 0 }
    const rows = spendingBreakdown.rows
      .filter((row) => row.category === categoryDetailKind)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    const total = rows.reduce((sum, row) => sum + Math.abs(row.amount), 0)
    return { kind: categoryDetailKind, rows, total }
  }, [categoryDetailKind, spendingBreakdown])

  const txnRange = useMemo(() => {
    if (txnDateFilter === 'custom') {
      return txnCustomStart && txnCustomEnd ? { start: txnCustomStart, end: txnCustomEnd } : null
    }
    if (txnDateFilter === 'all') return null
    return getDateRangeForPeriod(txnDateFilter, { today })
  }, [txnDateFilter, txnCustomStart, txnCustomEnd, today])

  const filteredTxns = useMemo(
    () =>
      filterUserWalletTransactions(transactions, {
        type: txnTypeFilter,
        range: txnRange,
        search: txnSearch,
      })
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [transactions, txnTypeFilter, txnRange, txnSearch],
  )

  const txnDateLabel = txnRange
    ? txnRange.label
    : TXN_DATE_OPTIONS.find((option) => option.key === txnDateFilter)?.label || 'All Dates'
  const txnTypeLabel = TXN_TYPE_FILTER_OPTIONS.find((option) => option.key === txnTypeFilter)?.label || 'All Types'

  const openTopUpModal = () => {
    setTopUpAmount('')
    setTopUpMethodId('')
    setTopUpConfirmOpen(false)
    setTopUpOpen(true)
  }

  const handleTopUpSubmit = () => {
    const value = Number(topUpAmount)
    if (!value || value <= 0) return
    setTopUpConfirmOpen(true)
  }

  const handleTopUp = () => {
    const value = Number(topUpAmount)
    if (!value || value <= 0) return
    actions.topUpUserWallet(value)
    setTopUpConfirmOpen(false)
    setTopUpOpen(false)
    setSuccessMessage(`₹${value.toLocaleString('en-IN')} has been added to your wallet via ${selectedTopUpMethod ? maskMethod(selectedTopUpMethod) : 'your selected method'}.`)
  }

  const topUpError = topUpAmount && Number(topUpAmount) <= 0 ? 'Enter an amount greater than zero' : null

  const downloadTransactionsPdf = () => {
    downloadPdf({
      title: 'Wallet Statement',
      subtitle: `${txnTypeLabel} · ${txnDateLabel}${txnSearch ? ` · Search: ${txnSearch}` : ''}`,
      columns: ['Transaction ID', 'Date', 'Type', 'Description', 'Amount'],
      rows: filteredTxns.map((txn) => [
        txn.id,
        `${txn.date}${txn.time ? ` ${txn.time}` : ''}`,
        getUserTxnTypeLabel(txn),
        txn.label || '—',
        formatINR(txn.amount),
      ]),
      filename: `wallet-statement-${txnTypeLabel}-${txnDateLabel}`,
      brand: 'AstroConnect User Wallet',
    })
  }

  const downloadCategoryPdf = () => {
    downloadPdf({
      title: `${USER_SPENDING_CATEGORY_LABELS[categoryEarnings.kind]} Spending`,
      subtitle: `Period: ${dateRange?.label || 'Selected period'} · Records: ${categoryEarnings.rows.length}`,
      columns: ['Transaction ID', 'Date', 'Description', 'Amount'],
      rows: categoryEarnings.rows.map((row) => [
        row.id,
        `${row.date}${row.time ? ` ${row.time}` : ''}`,
        row.label || '—',
        formatINR(row.amount),
      ]),
      footnote: `Total spent ₹${categoryEarnings.total.toLocaleString('en-IN')}`,
      filename: `wallet-${categoryEarnings.kind}-spending-this-month`,
      brand: 'AstroConnect User Wallet',
    })
  }

  const renderTxnRows = (rows, showType = true) =>
    rows.map((txn) => (
      <tr key={txn.id} className="wallet-txn-row" onClick={() => setSelectedTxn(txn)}>
        <td className="wallet-txn-date">{txn.id}</td>
        <td className="wallet-txn-date">{fmtDate(txn.date)}{txn.time ? ` · ${txn.time}` : ''}</td>
        {showType ? <td><span className={typeChipClass(txn)}>{getUserTxnTypeLabel(txn)}</span></td> : null}
        <td className="wallet-txn-desc">{txn.label || '—'}</td>
        <td className={`wallet-txn-amount ${txn.amount >= 0 ? 'wallet-txn-amount--credit' : 'wallet-txn-amount--debit'}`}>
          {formatINR(txn.amount)}
        </td>
      </tr>
    ))

  const renderTopUpMethodPicker = () => {
    if (userPaymentMethods.length === 0) {
      return (
        <div style={{ padding: '8px 0 4px' }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            No payment methods saved yet. Add one to top up your wallet.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(routes?.paymentMethods || `${walletPath}/payment-methods`)}
          >
            <CreditCard size={16} /> Add Payment Method
          </button>
        </div>
      )
    }
    return (
      <div className="field-group" style={{ marginTop: 18 }}>
        <label className="field-label-top">Pay Using</label>
        <div className="withdraw-methods">
          {userPaymentMethods.map((method) => {
            const Icon = TOPUP_METHOD_ICONS[method.type] || CreditCard
            const selected = selectedTopUpMethod?.id === method.id
            return (
              <button
                key={method.id}
                type="button"
                className={`withdraw-method-option ${selected ? 'is-selected' : ''}`}
                onClick={() => setTopUpMethodId(method.id)}
              >
                <div className="withdraw-method-left">
                  <Icon size={18} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{maskMethod(method)}</div>
                    {method.isDefault && <div style={{ color: 'var(--muted)', fontSize: 11 }}>Default</div>}
                  </div>
                </div>
                <div className={`withdraw-method-check ${selected ? 'is-visible' : ''}`}>
                  <Check size={14} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      {section === 'overview' && (
        <>
          <PageHeader
            eyebrow="User portal"
            title="Wallet"
            subtitle="Manage your balance, top-ups, spending and refunds."
            showBack
            backTo={routes.dashboard}
            actions={
              <div className="wallet-header-actions">
                <button type="button" className="btn btn-primary" onClick={openTopUpModal}>
                  <Plus size={16} /> Add Money
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={downloadTransactionsPdf}
                  disabled={filteredTxns.length === 0}
                >
                  <Download size={16} /> Download Statement
                </button>
              </div>
            }
          />

          {/* Summary Cards */}
          <div className="wallet-summary-grid section">
            <button type="button" className="wallet-stat-card wallet-stat-card--primary" onClick={openTopUpModal}>
              <div className="wallet-stat-card__icon"><Wallet size={22} /></div>
              <div className="wallet-stat-card__body">
                <div className="wallet-stat-card__value">₹{stats.balance.toLocaleString('en-IN')}</div>
                <div className="wallet-stat-card__label">Available Balance</div>
                <div className="wallet-stat-card__meta"><span className="wallet-stat-badge wallet-stat-badge--green">Spendable</span></div>
              </div>
            </button>

            <button type="button" className="wallet-stat-card" onClick={() => navigate(`${walletPath}/topups`)}>
              <div className="wallet-stat-card__icon wallet-stat-card__icon--green"><TrendingUp size={22} /></div>
              <div className="wallet-stat-card__body">
                <div className="wallet-stat-card__value">₹{stats.toppedUp.toLocaleString('en-IN')}</div>
                <div className="wallet-stat-card__label">Total Topped Up</div>
                <div className="wallet-stat-card__meta">Money added to your wallet</div>
              </div>
            </button>

            <button type="button" className="wallet-stat-card" onClick={() => navigate(`${walletPath}/transactions`)}>
              <div className="wallet-stat-card__icon wallet-stat-card__icon--red"><ArrowUpRight size={22} /></div>
              <div className="wallet-stat-card__body">
                <div className="wallet-stat-card__value">₹{stats.spent.toLocaleString('en-IN')}</div>
                <div className="wallet-stat-card__label">Total Spent</div>
                <div className="wallet-stat-card__meta">Spent on consultations</div>
              </div>
            </button>

            <button type="button" className="wallet-stat-card" onClick={() => navigate(`${walletPath}/refunds`)}>
              <div className="wallet-stat-card__icon wallet-stat-card__icon--sky"><Receipt size={22} /></div>
              <div className="wallet-stat-card__body">
                <div className="wallet-stat-card__value">₹{stats.refunded.toLocaleString('en-IN')}</div>
                <div className="wallet-stat-card__label">Total Refunded</div>
                <div className="wallet-stat-card__meta">Refunds back to your wallet</div>
              </div>
            </button>
          </div>

          {/* Spending This Month */}
          <Section title="Spending This Month" icon={ArrowDownLeft}>
            <Card className="wallet-earnings-card">
              <div className="wallet-period-field">
                <label className="field-label-top" htmlFor="wallet-spending-period">Spending Period</label>
                <select
                  id="wallet-spending-period"
                  className="select-input wallet-period-select"
                  value={spendPeriod}
                  onChange={(e) => setSpendPeriod(e.target.value)}
                >
                  {SPENDING_PERIOD_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </div>

              {spendPeriod === 'custom' && (
                <div className="wallet-custom-range">
                  <div>
                    <label className="field-label-top">Start Date</label>
                    <input type="date" className="text-input" value={spendCustomStart} onChange={(e) => setSpendCustomStart(e.target.value)} />
                  </div>
                  <span className="wallet-custom-range__arrow">→</span>
                  <div>
                    <label className="field-label-top">End Date</label>
                    <input type="date" className="text-input" value={spendCustomEnd} onChange={(e) => setSpendCustomEnd(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="wallet-earnings-list">
                {SPENDING_SOURCE_OPTIONS.map(({ key, icon: Icon, color }) => {
                  const kind = spendingBreakdown.kinds.find((item) => item.kind === key)
                  const amount = kind ? kind.amount : 0
                  const pct = spendingBreakdown.total > 0 ? ((amount / spendingBreakdown.total) * 100).toFixed(1) : '0.0'
                  return (
                    <button
                      key={key}
                      type="button"
                      className="wallet-earnings-row"
                      onClick={() => setCategoryDetailKind(key)}
                    >
                      <div className="wallet-earnings-row__icon" style={{ color }}>{<Icon size={18} />}</div>
                      <div className="wallet-earnings-row__label">{USER_SPENDING_CATEGORY_LABELS[key]}</div>
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
                <span>Total Spent ₹{spendingBreakdown.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="wallet-earnings-hint">Click a category to view the individual transactions in this period.</div>
            </Card>
          </Section>

          {/* Recent Transactions Preview */}
          <Section title="Recent Transactions" icon={History}>
            <Card className="wallet-txn-card">
              <div className="wallet-txn-table-wrap">
                <table className="wallet-txn-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>{renderTxnRows(recentTxns)}</tbody>
                </table>
              </div>

              {recentTxns.length === 0 && (
                <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No transactions yet.</div>
              )}

              <div className="wallet-txn-footer">
                <span className="muted">{transactions.length} transaction{transactions.length === 1 ? '' : 's'} in total</span>
                <button type="button" className="btn btn-primary" onClick={() => navigate(`${walletPath}/transactions`)}>View All Transactions</button>
              </div>
            </Card>
          </Section>
        </>
      )}

      {section === 'transactions' && (
        <>
          <PageHeader
            eyebrow="User portal"
            title="Transactions"
            subtitle="Browse and export your wallet transaction statement."
          />
          <div className="wallet-page-back"><BackButton to={`${walletPath}/overview`} /></div>

          <Section title="All Transactions" icon={History}>
            <Card className="wallet-txn-card">
              <div className="wallet-txn-toolbar">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowFilters(!showFilters)}
                  title="Filters"
                >
                  <Filter size={18} />
                </button>
                <button type="button" className="btn btn-ghost" onClick={downloadTransactionsPdf} disabled={filteredTxns.length === 0}>
                  <Download size={16} /> Download PDF
                </button>
              </div>

              {showFilters && (
                <div className="wallet-txn-filters">
                  <select className="select-input" value={txnTypeFilter} onChange={(e) => setTxnTypeFilter(e.target.value)}>
                    {TXN_TYPE_FILTER_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                  <select className="select-input" value={txnDateFilter} onChange={(e) => setTxnDateFilter(e.target.value)}>
                    {TXN_DATE_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                  <label className="wallet-txn-search">
                    <Search size={15} />
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Search transactions…"
                      value={txnSearch}
                      onChange={(e) => setTxnSearch(e.target.value)}
                    />
                  </label>
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
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>{renderTxnRows(filteredTxns)}</tbody>
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

      {section === 'topups' && (
        <>
          <PageHeader
            eyebrow="User portal"
            title="Top-ups"
            subtitle="Add money to your wallet and review your top-up history."
          />
          <div className="wallet-page-back"><BackButton to={`${walletPath}/overview`} /></div>

          <Section title="Add Money" icon={Plus}>
            <Card>
              <div className="wallet-withdraw-info">
                <div>Available Balance</div>
                <strong>₹{stats.balance.toLocaleString('en-IN')}</strong>
              </div>

              <div className="field-group" style={{ marginTop: 18 }}>
                <label className="field-label-top">Amount</label>
                <input
                  type="number"
                  className="text-input"
                  placeholder="Enter amount"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  min={1}
                />
                {topUpError && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{topUpError}</div>}
              </div>

              <div className="wallet-quick-amounts">
                {QUICK_TOP_UP_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`wallet-quick-amount${Number(topUpAmount) === amount ? ' is-active' : ''}`}
                    onClick={() => setTopUpAmount(String(amount))}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>

              {renderTopUpMethodPicker()}

              <div className="wallet-withdraw-summary">
                <div><span>Amount</span><strong>₹{Number(topUpAmount || 0).toLocaleString('en-IN')}</strong></div>
                <div><span>Platform Fee</span><strong>₹0</strong></div>
                <div className="wallet-withdraw-summary__total"><span>Will be added</span><strong>₹{Number(topUpAmount || 0).toLocaleString('en-IN')}</strong></div>
              </div>

              <div className="wallet-modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!topUpAmount || Number(topUpAmount) <= 0 || !selectedTopUpMethod}
                  onClick={handleTopUpSubmit}
                >
                  <Plus size={16} /> Continue to Confirm
                </button>
              </div>
            </Card>
          </Section>

          <Section title="Top-up History" icon={History}>
            <Card>
              {topUpTxns.length === 0 ? (
                <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No top-ups yet.</div>
              ) : (
                <div className="wallet-txn-table-wrap">
                  <table className="wallet-txn-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>{renderTxnRows(topUpTxns, false)}</tbody>
                  </table>
                </div>
              )}
            </Card>
          </Section>
        </>
      )}

      {section === 'refunds' && (
        <>
          <PageHeader
            eyebrow="User portal"
            title="Refunds"
            subtitle="Money refunded back to your wallet."
          />
          <div className="wallet-page-back"><BackButton to={`${walletPath}/overview`} /></div>

          <Section title="Refund History" icon={Receipt}>
            <Card>
              {refundTxns.length === 0 ? (
                <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No refunds yet.</div>
              ) : (
                <div className="wallet-txn-table-wrap">
                  <table className="wallet-txn-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>{renderTxnRows(refundTxns, false)}</tbody>
                  </table>
                </div>
              )}
            </Card>
          </Section>
        </>
      )}

      {/* Top Up Modal */}
      {topUpOpen && createPortal((
        <div className="modal-overlay" onClick={() => setTopUpOpen(false)}>
          <div className="modal-card" style={{ width: 'min(480px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <Wallet size={20} /> Add Money
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setTopUpOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="wallet-withdraw-info">
                <div>Available Balance</div>
                <strong>₹{stats.balance.toLocaleString('en-IN')}</strong>
              </div>

              <div className="field-group" style={{ marginTop: 18 }}>
                <label className="field-label-top">Amount</label>
                <input
                  type="number"
                  className="text-input"
                  placeholder="Enter amount"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  min={1}
                />
                {topUpError && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{topUpError}</div>}
              </div>

              <div className="wallet-quick-amounts">
                {QUICK_TOP_UP_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`wallet-quick-amount${Number(topUpAmount) === amount ? ' is-active' : ''}`}
                    onClick={() => setTopUpAmount(String(amount))}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>

              {renderTopUpMethodPicker()}

              <div className="wallet-withdraw-summary">
                <div><span>Amount</span><strong>₹{Number(topUpAmount || 0).toLocaleString('en-IN')}</strong></div>
                <div><span>Platform Fee</span><strong>₹0</strong></div>
                <div className="wallet-withdraw-summary__total"><span>Will be added</span><strong>₹{Number(topUpAmount || 0).toLocaleString('en-IN')}</strong></div>
              </div>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setTopUpOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!topUpAmount || Number(topUpAmount) <= 0 || !selectedTopUpMethod}
                onClick={handleTopUpSubmit}
              >
                <Plus size={16} /> Continue to Confirm
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Top Up Confirm Modal */}
      {topUpConfirmOpen && createPortal((
        <div className="modal-overlay" onClick={() => setTopUpConfirmOpen(false)}>
          <div className="modal-card" style={{ width: 'min(440px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <Wallet size={20} /> Confirm Top-Up
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setTopUpConfirmOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="withdraw-review">
                <div className="withdraw-review-row">
                  <span>Amount to add</span>
                  <strong>₹{Number(topUpAmount || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="withdraw-review-row">
                  <span>Pay using</span>
                  <strong>{selectedTopUpMethod ? maskMethod(selectedTopUpMethod) : '—'}</strong>
                </div>
                <div className="withdraw-review-row">
                  <span>Platform Fee</span>
                  <strong>₹0</strong>
                </div>
                <div className="withdraw-review-row withdraw-review-total">
                  <span>Total to charge</span>
                  <strong>₹{Number(topUpAmount || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="withdraw-review-note">
                  <Info size={14} /> Amount is added to your wallet immediately.
                </div>
              </div>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setTopUpConfirmOpen(false)}>Back</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!topUpAmount || Number(topUpAmount) <= 0 || !selectedTopUpMethod}
                onClick={handleTopUp}
              >
                <Plus size={16} /> Confirm & Add Money
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Spending Category Detail Modal */}
      {categoryDetailKind && createPortal((
        <div className="modal-overlay" onClick={() => setCategoryDetailKind(null)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(760px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                {USER_SPENDING_CATEGORY_LABELS[categoryDetailKind]} — {dateRange ? dateRange.label : 'Selected period'}
                <span className="wallet-modal-count">{categoryEarnings.rows.length} records · ₹{categoryEarnings.total.toLocaleString('en-IN')}</span>
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setCategoryDetailKind(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              {categoryEarnings.rows.length === 0 ? (
                <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No spending in this category this month.</div>
              ) : (
                <div className="wallet-earnings-detail__list">
                  {categoryEarnings.rows.map((row) => (
                    <button key={row.id} type="button" className="wallet-earning-row" onClick={() => setSelectedTxn(row)}>
                      <div className="wallet-earning-row__main">
                        <div className="wallet-earning-row__title">{row.label || row.id}</div>
                        <div className="wallet-earning-row__meta">{row.id} · {fmtDate(row.date)}{row.time ? ` · ${row.time}` : ''}</div>
                      </div>
                      <div className="wallet-earning-row__right">
                        <div className="wallet-earning-row__amount">-₹{Math.abs(row.amount).toLocaleString('en-IN')}</div>
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
                  onClick={downloadCategoryPdf}
                  disabled={categoryEarnings.rows.length === 0}
                >
                  <Download size={16} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Transaction Detail Modal */}
      {selectedTxn && createPortal((
        <div className="modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="modal-card" style={{ width: 'min(520px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <History size={20} /> Transaction Details
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSelectedTxn(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="wallet-detail-grid">
                <div><span>Transaction ID</span><strong>{selectedTxn.id}</strong></div>
                <div><span>Date</span><strong>{fmtDate(selectedTxn.date)}</strong></div>
                <div><span>Time</span><strong>{selectedTxn.time || '—'}</strong></div>
                <div><span>Type</span><strong><span className={typeChipClass(selectedTxn)}>{getUserTxnTypeLabel(selectedTxn)}</span></strong></div>
                {selectedTxn.duration && <div><span>Duration</span><strong>{selectedTxn.duration}</strong></div>}
              </div>

              <div className="wallet-earnings-summary" style={{ marginTop: 16 }}>
                <div><span>Description</span><span>{selectedTxn.label || '—'}</span></div>
                <div><span>Amount</span><span className={selectedTxn.amount >= 0 ? 'wallet-txn-amount--credit' : 'wallet-txn-amount--debit'} style={{ fontWeight: 700 }}>{formatINR(selectedTxn.amount)}</span></div>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage('')} />}
    </div>
  )
}

export function UserWalletOverview() {
  return <UserWallet section="overview" />
}

export function UserWalletTransactions() {
  return <UserWallet section="transactions" />
}

export function UserWalletTopUps() {
  return <UserWallet section="topups" />
}

export function UserWalletRefunds() {
  return <UserWallet section="refunds" />
}