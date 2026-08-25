import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Wallet,
  Clock,
  TrendingUp,
  ArrowDownToLine,
  Download,
  Plus,
  CreditCard,
  Building2,
  Smartphone,
  Star,
  Pencil,
  Trash2,
  X,
  Filter,
  IndianRupee,
  MessageCircle,
  Phone,
  Radio,
  Gift,
  MoreHorizontal,
  FileText,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Section from '../components/ui/Section.jsx'
import Card from '../components/ui/Card.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const PERIOD_OPTIONS = ['This Month', 'Last Month', 'This Year']
const TXN_TYPE_OPTIONS = ['All', 'Earning', 'Withdrawal', 'Platform Commission', 'Refund Adjustment', 'Virtual Gift', 'Settlement']
const STATUS_OPTIONS = ['All', 'Completed', 'Processing', 'Failed']

const EARNINGS_SOURCES = [
  { key: 'consultations', label: 'Consultations / Chat', icon: MessageCircle, color: 'var(--primary)' },
  { key: 'calls', label: 'Calls', icon: Phone, color: 'var(--accent)' },
  { key: 'textQuestions', label: 'Text Questions', icon: FileText, color: 'var(--sky-500)' },
  { key: 'liveSessions', label: 'Live Sessions', icon: Radio, color: 'var(--success)' },
  { key: 'virtualGifts', label: 'Virtual Gifts', icon: Gift, color: '#E879F9' },
  { key: 'other', label: 'Other Earnings', icon: MoreHorizontal, color: 'var(--muted)' },
]

const MOCK_ENRICHED_TRANSACTIONS = [
  { id: 'txn1', date: '2026-07-27 10:30 AM', type: 'Earning', description: 'Chat Consultation with Rahul', amount: 1250, status: 'Completed', balance: 34650 },
  { id: 'txn2', date: '2026-07-26 03:15 PM', type: 'Earning', description: 'Call with Priya', amount: 850, status: 'Completed', balance: 33400 },
  { id: 'txn3', date: '2026-07-25 11:00 AM', type: 'Settlement', description: 'Monthly settlement – Jul 2026', amount: 15725, status: 'Completed', balance: 32550 },
  { id: 'txn4', date: '2026-07-24 02:20 PM', type: 'Earning', description: 'Video Consultation with Kannan', amount: 4000, status: 'Completed', balance: 16825 },
  { id: 'txn5', date: '2026-07-22 02:30 PM', type: 'Withdrawal', description: 'Withdrawal to HDFC Bank •••• 4589', amount: -8000, status: 'Completed', balance: 12825 },
  { id: 'txn6', date: '2026-07-21 10:00 AM', type: 'Platform Commission', description: 'Commission on Chat Consultation – Rahul', amount: -187.50, status: 'Completed', balance: 20825 },
  { id: 'txn7', date: '2026-07-20 04:45 PM', type: 'Virtual Gift', description: 'Virtual Gift from Customer Meena', amount: 300, status: 'Completed', balance: 21012.50 },
  { id: 'txn8', date: '2026-07-18 11:00 AM', type: 'Withdrawal', description: 'Withdrawal to HDFC Bank •••• 4589', amount: -10000, status: 'Completed', balance: 20712.50 },
  { id: 'txn9', date: '2026-07-14 09:30 AM', type: 'Earning', description: 'Chat Consultation with Arjun', amount: 2500, status: 'Completed', balance: 30712.50 },
  { id: 'txn10', date: '2026-07-12 03:00 PM', type: 'Refund Adjustment', description: 'Refund for QTN-2026-000123 dispute', amount: -250, status: 'Completed', balance: 28212.50 },
]

function formatINR(amount) {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-IN')
  return amount < 0 ? `-₹${formatted}` : `+₹${formatted}`
}

function parseAmountFromWallet(str) {
  return Number(String(str).replace(/[^0-9.-]/g, '')) || 0
}

function PayoutMethodIcon({ type }) {
  if (type === 'upi') return <Smartphone size={18} />
  return <Building2 size={18} />
}

export default function AstrologerWallet() {
  const { currentUser } = useAuth()
  const {
    astrologerWallet,
    payoutMethods,
    withdrawalHistory,
    settlementHistory,
    earningsBySource,
    actions,
  } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)

  const [period, setPeriod] = useState('This Month')
  const [txnTypeFilter, setTxnTypeFilter] = useState('All')
  const [txnStatusFilter, setTxnStatusFilter] = useState('All')
  const [showFilters, setShowFilters] = useState(false)

  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState('')

  const [payoutModal, setPayoutModal] = useState(null)
  const [payoutForm, setPayoutForm] = useState({ type: 'bank', bankName: '', accountNumber: '', ifsc: '', accountHolder: '', upiId: '' })
  const [editingMethod, setEditingMethod] = useState(null)

  const [settlementOpen, setSettlementOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const periodKey = period === 'This Month' ? 'thisMonth' : period === 'Last Month' ? 'lastMonth' : 'thisYear'
  const currentEarnings = earningsBySource[periodKey] || earningsBySource.thisMonth

  const totalBalance = parseAmountFromWallet(astrologerWallet.balance || 0)
  const totalEarnings = parseAmountFromWallet(astrologerWallet.earnings || 0)
  const pendingBalance = parseAmountFromWallet(astrologerWallet.escrow || 0)
  const withdrawable = totalBalance

  const defaultPayoutMethod = payoutMethods.find((m) => m.isDefault)

  const filteredTransactions = useMemo(() => {
    return MOCK_ENRICHED_TRANSACTIONS.filter((txn) => {
      if (txnTypeFilter !== 'All' && txn.type !== txnTypeFilter) return false
      if (txnStatusFilter !== 'All' && txn.status !== txnStatusFilter) return false
      return true
    })
  }, [txnTypeFilter, txnStatusFilter])

  const openWithdrawModal = () => {
    setWithdrawAmount('')
    setWithdrawMethod(defaultPayoutMethod?.id || '')
    setWithdrawOpen(true)
  }

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount)
    if (!amount || amount <= 0 || amount > withdrawable || !withdrawMethod) return
    actions.initiateWithdrawal(amount, withdrawMethod)
    setWithdrawOpen(false)
    setSuccessMessage('Withdrawal initiated successfully. It will be processed within 2-3 business days.')
  }

  const openAddPayoutModal = () => {
    setEditingMethod(null)
    setPayoutForm({ type: 'bank', bankName: '', accountNumber: '', ifsc: '', accountHolder: '', upiId: '' })
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
      upiId: method.upiId || '',
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

  return (
    <div>
      <PageHeader
        eyebrow="Astrologer"
        title="Wallet Overview"
        subtitle="Manage your earnings, payouts and transactions"
        showBack
        backTo={routes.dashboard}
        actions={
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setSettlementOpen(true)}>
              <Download size={16} /> Wallet Statement
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="wallet-summary-grid section">
        <div className="wallet-stat-card wallet-stat-card--primary">
          <div className="wallet-stat-card__icon"><Wallet size={22} /></div>
          <div className="wallet-stat-card__body">
            <div className="wallet-stat-card__value">₹{totalBalance.toLocaleString('en-IN')}</div>
            <div className="wallet-stat-card__label">Available Balance</div>
            <div className="wallet-stat-card__meta">
              <span className="wallet-stat-badge wallet-stat-badge--green">Withdrawable</span>
            </div>
          </div>
        </div>

        <div className="wallet-stat-card">
          <div className="wallet-stat-card__icon wallet-stat-card__icon--amber"><Clock size={22} /></div>
          <div className="wallet-stat-card__body">
            <div className="wallet-stat-card__value">₹{pendingBalance.toLocaleString('en-IN')}</div>
            <div className="wallet-stat-card__label">Pending Balance</div>
            <div className="wallet-stat-card__meta">Will be settled within 2-3 days</div>
          </div>
        </div>

        <div className="wallet-stat-card">
          <div className="wallet-stat-card__icon wallet-stat-card__icon--green"><TrendingUp size={22} /></div>
          <div className="wallet-stat-card__body">
            <div className="wallet-stat-card__value">₹{totalEarnings.toLocaleString('en-IN')}</div>
            <div className="wallet-stat-card__label">Total Earnings</div>
            <div className="wallet-stat-card__meta">All time earnings</div>
          </div>
        </div>

        <div className="wallet-stat-card wallet-stat-card--highlight">
          <div className="wallet-stat-card__icon wallet-stat-card__icon--violet"><IndianRupee size={22} /></div>
          <div className="wallet-stat-card__body">
            <div className="wallet-stat-card__value">₹{withdrawable.toLocaleString('en-IN')}</div>
            <div className="wallet-stat-card__label">Withdrawable Amount</div>
            <button type="button" className="btn btn-primary wallet-withdraw-btn" onClick={openWithdrawModal}>
              <ArrowDownToLine size={16} /> Withdraw Now
            </button>
          </div>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <Section title="Earnings Breakdown" icon={TrendingUp}>
        <Card className="wallet-earnings-card">
          <div className="wallet-period-selector">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                className={`wallet-period-btn${period === p ? ' wallet-period-btn--active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="wallet-earnings-list">
            {EARNINGS_SOURCES.map(({ key, label, icon: Icon, color }) => {
              const amount = currentEarnings[key] || 0
              const pct = currentEarnings.total > 0 ? ((amount / currentEarnings.total) * 100).toFixed(1) : '0.0'
              return (
                <div key={key} className="wallet-earnings-row">
                  <div className="wallet-earnings-row__icon" style={{ color }}>{<Icon size={18} />}</div>
                  <div className="wallet-earnings-row__label">{label}</div>
                  <div className="wallet-earnings-row__bar">
                    <div className="wallet-earnings-row__bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="wallet-earnings-row__amount">₹{amount.toLocaleString('en-IN')}</div>
                  <div className="wallet-earnings-row__pct">{pct}%</div>
                </div>
              )
            })}
          </div>

          <div className="wallet-earnings-total">
            <span>Total</span>
            <span>₹{currentEarnings.total.toLocaleString('en-IN')}</span>
          </div>
        </Card>
      </Section>

      {/* Payout Methods + Recent Transactions side by side */}
      <div className="wallet-two-col section">
        {/* Payout Methods */}
        <Section title="Payout Methods" icon={CreditCard}>
          <Card className="wallet-payout-card">
            <div className="wallet-payout-header">
              <span className="muted">Manage your bank accounts and UPI for receiving payouts</span>
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
                      {method.type === 'bank' ? `${method.bankName} •••• ${method.accountNumber}` : `UPI: ${method.upiId}`}
                      {method.isDefault && <span className="wallet-default-badge">Default</span>}
                    </div>
                    {method.type === 'bank' && <div className="wallet-payout-item__detail">IFSC: {method.ifsc} · {method.accountHolder}</div>}
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

        {/* Recent Transactions */}
        <Section title="Recent Transactions" icon={FileText}>
          <Card className="wallet-txn-card">
            <div className="wallet-txn-toolbar">
              <button type="button" className="icon-btn" onClick={() => setShowFilters(!showFilters)} title="Filters">
                <Filter size={18} />
              </button>
              {showFilters && (
                <div className="wallet-txn-filters">
                  <select className="select-input" value={txnTypeFilter} onChange={(e) => setTxnTypeFilter(e.target.value)}>
                    {TXN_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <select className="select-input" value={txnStatusFilter} onChange={(e) => setTxnStatusFilter(e.target.value)}>
                    {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="wallet-txn-table-wrap">
              <table className="wallet-txn-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Transaction Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id}>
                      <td className="wallet-txn-date">{txn.date}</td>
                      <td><span className={`wallet-txn-type wallet-txn-type--${txn.type.toLowerCase().replace(/\s+/g, '-')}`}>{txn.type}</span></td>
                      <td className="wallet-txn-desc">{txn.description}</td>
                      <td className={`wallet-txn-amount ${txn.amount >= 0 ? 'wallet-txn-amount--credit' : 'wallet-txn-amount--debit'}`}>
                        {formatINR(txn.amount)}
                      </td>
                      <td><span className={`wallet-txn-status wallet-txn-status--${txn.status.toLowerCase()}`}>{txn.status}</span></td>
                      <td className="wallet-txn-balance">₹{txn.balance.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTransactions.length === 0 && (
              <div className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No transactions match the selected filters.</div>
            )}

            <div className="wallet-txn-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setSettlementOpen(true)}>View All Transactions</button>
            </div>
          </Card>
        </Section>
      </div>

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
                <strong>₹{withdrawable.toLocaleString('en-IN')}</strong>
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
                  max={withdrawable}
                />
                {Number(withdrawAmount) > withdrawable && (
                  <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>Amount exceeds available balance</div>
                )}
              </div>

              <div className="field-group" style={{ marginTop: 16 }}>
                <label className="field-label-top">Payout Method</label>
                <select className="select-input" value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)}>
                  <option value="">Select payout method</option>
                  {payoutMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.type === 'bank' ? `${m.bankName} •••• ${m.accountNumber}` : `UPI: ${m.upiId}`}
                    </option>
                  ))}
                </select>
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
                disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > withdrawable || !withdrawMethod}
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
                </select>
              </div>

              {payoutForm.type === 'bank' ? (
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
                </>
              ) : (
                <div className="field-group" style={{ marginTop: 14 }}>
                  <label className="field-label-top">UPI ID</label>
                  <input className="text-input" value={payoutForm.upiId} onChange={(e) => setPayoutForm((f) => ({ ...f, upiId: e.target.value }))} placeholder="e.g. name@upi" />
                </div>
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

      {/* Settlement History Modal */}
      {settlementOpen && createPortal((
        <div className="modal-overlay" onClick={() => setSettlementOpen(false)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(900px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <FileText size={20} /> Settlement & Transaction History
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSettlementOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="section-title" style={{ fontSize: 18, marginBottom: 12 }}>Settlement History</div>
              <div className="wallet-txn-table-wrap">
                <table className="wallet-txn-table">
                  <thead>
                    <tr>
                      <th>Settlement ID</th>
                      <th>Date</th>
                      <th>Earnings Period</th>
                      <th>Gross Earnings</th>
                      <th>Platform Commission</th>
                      <th>Net Settlement</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementHistory.map((s) => (
                      <tr key={s.id}>
                        <td className="wallet-txn-date">{s.id}</td>
                        <td>{s.date}</td>
                        <td className="wallet-txn-desc">{s.period}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--credit">₹{s.grossEarnings.toLocaleString('en-IN')}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--debit">-₹{s.platformCommission.toLocaleString('en-IN')}</td>
                        <td className="wallet-txn-amount wallet-txn-amount--credit">₹{s.netSettlement.toLocaleString('en-IN')}</td>
                        <td><span className={`wallet-txn-status wallet-txn-status--${s.status.toLowerCase()}`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="section-title" style={{ fontSize: 18, marginTop: 28, marginBottom: 12 }}>Withdrawal History</div>
              <div className="wallet-txn-table-wrap">
                <table className="wallet-txn-table">
                  <thead>
                    <tr>
                      <th>Withdrawal ID</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Payout Method</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalHistory.map((w) => {
                      const method = payoutMethods.find((m) => m.id === w.payoutMethodId)
                      return (
                        <tr key={w.id}>
                          <td className="wallet-txn-date">{w.id}</td>
                          <td>{w.initiatedAt ? new Date(w.initiatedAt).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="wallet-txn-amount wallet-txn-amount--debit">-₹{w.amount.toLocaleString('en-IN')}</td>
                          <td className="wallet-txn-desc">{method?.type === 'bank' ? `${method.bankName} •••• ${method.accountNumber}` : method?.type === 'upi' ? `UPI: ${method.upiId}` : '—'}</td>
                          <td><span className={`wallet-txn-status wallet-txn-status--${w.status.toLowerCase()}`}>{w.status}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage('')} />}
    </div>
  )
}
