import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Search,
  Download,
  X,
  Building2,
  Smartphone,
  CreditCard,
  RefreshCw,
  CircleHelp,
  MoreHorizontal,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Section from '../../../components/ui/Section.jsx'
import Card from '../../../components/ui/Card.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { downloadPdf } from '../../../utils/pdfReport.js'
import {
  parseUserTxn,
  getUserTxnCategory,
  USER_SPENDING_CATEGORY_LABELS,
} from '../../../utils/userWallet.js'
import { getDateRangeForPeriod } from '../../../utils/wallet.js'

const DIRECTION_OPTIONS = [
  { key: 'all', label: 'All Directions' },
  { key: 'inflow', label: 'Money In' },
  { key: 'outflow', label: 'Money Out' },
]

const CATEGORY_OPTIONS = [
  { key: 'all', label: 'All Categories' },
  { key: 'bank-to-wallet', label: 'Bank → Wallet' },
  { key: 'wallet-to-bank', label: 'Wallet → Bank' },
  { key: 'wallet-to-astrologer', label: 'Wallet → Astrologer' },
  { key: 'topup', label: 'Top-up' },
  { key: 'refund', label: 'Refund' },
  { key: 'withdrawal', label: 'Withdrawal' },
  { key: 'autopay', label: 'Autopay' },
  { key: 'purchase', label: 'Purchase' },
]

const DATE_OPTIONS = [
  { key: 'all', label: 'All Dates' },
  { key: 'today', label: 'Today' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'thismonth', label: 'This Month' },
  { key: 'last3months', label: 'Last 3 Months' },
  { key: 'custom', label: 'Custom Range' },
]

const STATUS_OPTIONS = ['All', 'Completed', 'Processing', 'Pending', 'Failed']

const CATEGORY_ICONS = {
  'bank-to-wallet': Building2,
  'wallet-to-bank': Building2,
  'wallet-to-astrologer': CreditCard,
  topup: Smartphone,
  refund: RefreshCw,
  withdrawal: ArrowUpRight,
  autopay: RefreshCw,
  purchase: CircleHelp,
  other: MoreHorizontal,
}

const STATUS_COLORS = {
  Completed: { color: 'var(--success)', bg: 'var(--success-bg)' },
  Processing: { color: 'var(--amber-600)', bg: 'var(--warning-bg)' },
  Pending: { color: 'var(--sky-600)', bg: 'var(--sky-bg)' },
  Failed: { color: 'var(--danger, #b91c1c)', bg: 'var(--danger-bg)' },
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

function groupByDate(txns) {
  const groups = {}
  txns.forEach((txn) => {
    const key = txn.date || 'Unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(txn)
  })
  return Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
}

function buildLedgerEntry(txn) {
  const category = getUserTxnCategory(txn)
  const amount = Number(String(txn.amount || '').replace(/[^0-9.-]/g, '')) || 0
  const direction = amount >= 0 ? 'inflow' : 'outflow'

  let ledgerCategory = category
  if (category === 'topup') ledgerCategory = 'topup'
  else if (category === 'refund') ledgerCategory = 'refund'
  else if (category === 'purchase') ledgerCategory = 'purchase'
  else if (/withdrawal|bank/i.test(txn.label)) ledgerCategory = 'withdrawal'
  else if (/autopay|auto/i.test(txn.label)) ledgerCategory = 'autopay'

  return {
    ...txn,
    amount,
    direction,
    ledgerCategory,
    status: txn.status || 'Completed',
  }
}

export default function TransactionHistory() {
  const { currentUser } = useAuth()
  const { userWallet, withdrawals } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)

  const [showFilters, setShowFilters] = useState(false)
  const [directionFilter, setDirectionFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedTxn, setSelectedTxn] = useState(null)

  const today = useMemo(() => new Date(), [])

  const allTxns = useMemo(() => {
    const walletTxns = (userWallet?.transactions || []).map(parseUserTxn).map(buildLedgerEntry)
    const withdrawTxns = (withdrawals || []).map((w) => ({
      id: w.id || `WD-${Date.now().toString(36)}`,
      date: w.date || new Date().toISOString().slice(0, 10),
      time: w.time || '',
      label: `Withdrawal to ${w.destinationLabel || 'bank account'}`,
      amount: -(w.amount || 0),
      type: 'withdrawal',
      status: w.status || 'Processing',
      direction: 'outflow',
      ledgerCategory: 'withdrawal',
      fee: w.fee || 0,
      netAmount: w.netAmount || 0,
    }))
    return [...walletTxns, ...withdrawTxns]
  }, [userWallet, withdrawals])

  const dateRange = useMemo(() => {
    if (dateFilter === 'custom') {
      if (!customStart || !customEnd) return null
      return { start: customStart, end: customEnd, label: `${customStart} → ${customEnd}` }
    }
    if (dateFilter === 'all') return null
    return getDateRangeForPeriod(dateFilter, { today })
  }, [dateFilter, customStart, customEnd, today])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return allTxns.filter((txn) => {
      if (directionFilter !== 'all' && txn.direction !== directionFilter) return false
      if (categoryFilter !== 'all' && txn.ledgerCategory !== categoryFilter) return false
      if (statusFilter !== 'All' && txn.status !== statusFilter) return false
      if (dateRange) {
        const d = (txn.date || '').slice(0, 10)
        if (d < dateRange.start || d > dateRange.end) return false
      }
      if (query) {
        const searchable = `${txn.id || ''} ${txn.label || ''} ${txn.type || ''}`.toLowerCase()
        if (!searchable.includes(query)) return false
      }
      return true
    }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [allTxns, directionFilter, categoryFilter, statusFilter, dateRange, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const downloadAllPdf = () => {
    downloadPdf({
      title: 'Transaction History',
      subtitle: `Direction: ${DIRECTION_OPTIONS.find((o) => o.key === directionFilter)?.label || 'All'} · Category: ${CATEGORY_OPTIONS.find((o) => o.key === categoryFilter)?.label || 'All'}`,
      columns: ['Transaction ID', 'Date', 'Category', 'Description', 'Direction', 'Amount', 'Status'],
      rows: filtered.map((txn) => [
        txn.id,
        `${txn.date}${txn.time ? ` ${txn.time}` : ''}`,
        USER_SPENDING_CATEGORY_LABELS[txn.ledgerCategory] || txn.ledgerCategory,
        txn.label || '—',
        txn.direction === 'inflow' ? 'Inflow' : 'Outflow',
        formatINR(txn.amount),
        txn.status,
      ]),
      filename: 'transaction-history',
      brand: 'AstroConnect',
    })
  }

  return (
    <div>
      <PageHeader
        eyebrow="User portal"
        title="Transaction History"
        subtitle="Complete record of all wallet movements."
        showBack
        backTo={routes.dashboard}
        actions={
          <button type="button" className="btn btn-ghost" onClick={downloadAllPdf} disabled={filtered.length === 0}>
            <Download size={16} /> Export PDF
          </button>
        }
      />

      <Section title="All Transactions" icon={History}>
        <Card className="txn-history-card">
          <div className="txn-toolbar">
            <button type="button" className="icon-btn" onClick={() => setShowFilters(!showFilters)} title="Filters">
              <Filter size={18} />
            </button>
            <label className="txn-search">
              <Search size={15} />
              <input type="text" className="text-input" placeholder="Search by ID or description..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>

          {showFilters && (
            <div className="txn-filters">
              <select className="select-input" value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)}>
                {DIRECTION_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <select className="select-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {CATEGORY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <select className="select-input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                {DATE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {dateFilter === 'custom' && (
                <div className="txn-custom-range">
                  <input type="date" className="text-input" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                  <span className="txn-custom-range__arrow">→</span>
                  <input type="date" className="text-input" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <div className="txn-groups">
            {grouped.length === 0 ? (
              <div className="txn-empty">
                <History size={32} style={{ color: 'var(--muted)' }} />
                <div style={{ fontWeight: 600, fontSize: 14 }}>No transactions found</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Try adjusting your filters or search.</div>
              </div>
            ) : (
              grouped.map(([date, txns]) => (
                <div key={date} className="txn-group">
                  <div className="txn-date-header">{fmtDate(date)}</div>
                  {txns.map((txn) => {
                    const CatIcon = CATEGORY_ICONS[txn.ledgerCategory] || MoreHorizontal
                    const statusStyle = STATUS_COLORS[txn.status] || STATUS_COLORS.Completed
                    return (
                      <button key={txn.id} type="button" className="txn-row" onClick={() => setSelectedTxn(txn)}>
                        <div className="txn-row__direction">
                          {txn.direction === 'inflow' ? (
                            <ArrowDownLeft size={16} style={{ color: 'var(--success)' }} />
                          ) : (
                            <ArrowUpRight size={16} style={{ color: 'var(--danger, #b91c1c)' }} />
                          )}
                        </div>
                        <div className="txn-row__icon">
                          <CatIcon size={16} />
                        </div>
                        <div className="txn-row__info">
                          <div className="txn-row__label">{txn.label || 'Transaction'}</div>
                          <div className="txn-row__meta">{txn.id}{txn.time ? ` · ${txn.time}` : ''}</div>
                        </div>
                        <div className="txn-row__right">
                          <div className={`txn-row__amount ${txn.direction === 'inflow' ? 'txn-row__amount--credit' : 'txn-row__amount--debit'}`}>
                            {formatINR(txn.amount)}
                          </div>
                          <span className="txn-status-chip" style={{ color: statusStyle.color, background: statusStyle.bg }}>
                            {txn.status}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          <div className="txn-footer">
            <span className="muted">{filtered.length} transaction{filtered.length === 1 ? '' : 's'} found</span>
          </div>
        </Card>
      </Section>

      {/* Transaction Detail Modal */}
      {selectedTxn && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="modal-card" style={{ width: 'min(520px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}><History size={20} /> Transaction Details</div>
              <button type="button" className="icon-btn" onClick={() => setSelectedTxn(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="txn-detail-grid">
                <div className="txn-detail-row"><span>Transaction ID</span><strong>{selectedTxn.id}</strong></div>
                <div className="txn-detail-row"><span>Date</span><strong>{fmtDate(selectedTxn.date)}</strong></div>
                <div className="txn-detail-row"><span>Time</span><strong>{selectedTxn.time || '—'}</strong></div>
                <div className="txn-detail-row"><span>Direction</span><strong>{selectedTxn.direction === 'inflow' ? '← Inflow' : '→ Outflow'}</strong></div>
                <div className="txn-detail-row"><span>Category</span><strong>{USER_SPENDING_CATEGORY_LABELS[selectedTxn.ledgerCategory] || selectedTxn.ledgerCategory}</strong></div>
                <div className="txn-detail-row"><span>Status</span><strong>
                  <span className="txn-status-chip" style={{ color: STATUS_COLORS[selectedTxn.status]?.color, background: STATUS_COLORS[selectedTxn.status]?.bg }}>{selectedTxn.status}</span>
                </strong></div>
                {selectedTxn.fee > 0 && <div className="txn-detail-row"><span>Fee</span><strong>₹{Number(selectedTxn.fee).toLocaleString('en-IN')}</strong></div>}
                {selectedTxn.netAmount != null && <div className="txn-detail-row"><span>Net Amount</span><strong>₹{Number(selectedTxn.netAmount).toLocaleString('en-IN')}</strong></div>}
              </div>
              <div className="txn-detail-amount">
                <span>Amount</span>
                <span className={selectedTxn.direction === 'inflow' ? 'txn-row__amount--credit' : 'txn-row__amount--debit'} style={{ fontWeight: 700, fontSize: 18 }}>
                  {formatINR(selectedTxn.amount)}
                </span>
              </div>
              <div className="txn-detail-desc">
                <span>Description</span>
                <span>{selectedTxn.label || '—'}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
