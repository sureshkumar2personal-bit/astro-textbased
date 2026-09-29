import {
  ArrowDownToLine,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  CalendarClock,
  ChevronRight,
  Clock,
  Download,
  Landmark,
  LayoutDashboard,
  Lock,
  Receipt,
  Repeat,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import '../css/astrologer/wallet-dashboard.css'

// Wallet-specific presentation components for the Astrologer Wallet. They only
// render data handed in by AstrologerWallet.jsx (which owns the wallet state,
// filters and modals), so nothing here duplicates wallet logic.

export const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

const SOURCE_EARNING_LABELS = {
  question: 'Question Earnings',
  appointment: 'Appointment Earnings',
  session: 'Live Session Earnings',
  call: 'Call Earnings',
  subscription: 'Subscription Earnings',
  other: 'Other Earnings',
}

const OTHER_TYPE_LABELS = {
  commission: 'Platform Fee',
  withdrawal: 'Withdrawal',
  refund: 'Refund',
  settlement: 'Settlement',
  adjustment: 'Adjustment',
}

export function txnDisplayType(txn) {
  if (txn.type === 'earning') return SOURCE_EARNING_LABELS[txn.sourceKind] || 'Earnings'
  return OTHER_TYPE_LABELS[txn.type] || txn.type
}

const fmtShortDate = (iso) => {
  if (!iso) return '—'
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const signedInr = (amount) => `${amount < 0 ? '-' : '+'}₹${Math.abs(amount).toLocaleString('en-IN')}`

const statusModifier = (status = '') => String(status).toLowerCase().replace(/\s+/g, '-')

/* ---------------------------------------------------------------- tabs */

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, path: 'overview' },
  { key: 'payouts', label: 'Withdraw Money', icon: Banknote, path: 'withdraw' },
]

export function WalletTabs({ active, walletPath, onNavigate }) {
  return (
    <nav className="wd-tabs" aria-label="Wallet sections">
      {TABS.map(({ key, label, icon: Icon, path }) => (
        <button
          key={key}
          type="button"
          className={`wd-tab${active === key ? ' is-active' : ''}`}
          aria-current={active === key ? 'page' : undefined}
          onClick={() => onNavigate(`${walletPath}/${path}`)}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </nav>
  )
}

/* ------------------------------------------------------------- balance */

export function WalletBalanceHero({ summary, pendingCount, canWithdraw, onWithdraw, onViewTransactions, onOpenHeld, onOpenRefunds }) {
  return (
    <section className="wd-hero" aria-label="Wallet balance">
      <div className="wd-balance">
        <span className="wd-balance__eyebrow"><Wallet size={16} /> Available Balance</span>
        <div className="wd-balance__amount">{inr(summary.availableBalance)}</div>
        <p className="wd-balance__hint">Ready to withdraw to your payout method.</p>
        <div className="wd-balance__actions">
          <button type="button" className="wd-btn wd-btn--light" onClick={onWithdraw} disabled={!canWithdraw}>
            <ArrowDownToLine size={16} /> Request Payout
          </button>
          <button type="button" className="wd-btn wd-btn--outline-light" onClick={onViewTransactions}>
            View transactions
          </button>
        </div>
        <div className="wd-balance__foot">
          <button type="button" className="wd-chip" onClick={onOpenHeld}>
            <Lock size={13} /> Held {inr(summary.heldBalance)}
          </button>
          <button type="button" className="wd-chip" onClick={onOpenRefunds}>
            <Receipt size={13} /> Refunds {inr(summary.refundsTotal)}
          </button>
        </div>
      </div>

      <div className="wd-side">
        <div className="wd-tile wd-tile--pending">
          <span className="wd-tile__icon"><Clock size={18} /></span>
          <div>
            <div className="wd-tile__label">Pending Balance</div>
            <div className="wd-tile__value">{inr(summary.pendingBalance)}</div>
            <div className="wd-tile__note">{pendingCount} payment{pendingCount === 1 ? '' : 's'} · settles within 2-3 days</div>
          </div>
        </div>
        <div className="wd-tile wd-tile--total">
          <span className="wd-tile__icon"><TrendingUp size={18} /></span>
          <div>
            <div className="wd-tile__label">Total Earnings</div>
            <div className="wd-tile__value">{inr(summary.totalEarnings)}</div>
            <div className="wd-tile__note">All-time net earnings</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ earnings */

export function WalletEarningsOverview({ thisMonth, lastMonth, totalEarnings, totalWithdrawn, series, sources, onViewAll }) {
  const delta = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null
  const maxBar = Math.max(1, ...series.map((point) => point.net))
  const sourceTotal = sources.reduce((sum, source) => sum + source.net, 0)
  const activeSources = sources.filter((source) => source.net > 0)

  return (
    <section className="wd-section" aria-label="Earnings overview">
      <header className="wd-section__head">
        <h2>Earnings overview</h2>
        <button type="button" className="wd-link" onClick={onViewAll}>
          Full breakdown <ChevronRight size={15} />
        </button>
      </header>

      <div className="wd-earn">
        <dl className="wd-earn__metrics">
          <div className="wd-metric">
            <dt>This Month</dt>
            <dd>{inr(thisMonth)}</dd>
            {delta !== null && (
              <span className={`wd-delta ${delta >= 0 ? 'wd-delta--up' : 'wd-delta--down'}`}>
                {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(delta)}% vs last month
              </span>
            )}
          </div>
          <div className="wd-metric">
            <dt>Last Month</dt>
            <dd>{inr(lastMonth)}</dd>
          </div>
          <div className="wd-metric">
            <dt>Total Earnings</dt>
            <dd>{inr(totalEarnings)}</dd>
          </div>
          <div className="wd-metric">
            <dt>Total Withdrawn</dt>
            <dd>{inr(totalWithdrawn)}</dd>
          </div>
        </dl>

        <figure className="wd-chart">
          <figcaption>Net earnings · last 6 months</figcaption>
          <div className="wd-chart__bars" role="img" aria-label="Net earnings for the last six months">
            {series.map((point, index) => (
              <div key={point.key} className="wd-chart__col">
                <span className="wd-chart__value">{point.net > 0 ? inr(point.net) : '—'}</span>
                <div className="wd-chart__track">
                  <div
                    className={`wd-chart__bar${index === series.length - 1 ? ' is-current' : ''}`}
                    style={{ height: `${Math.max(point.net > 0 ? 6 : 0, (point.net / maxBar) * 100)}%` }}
                  />
                </div>
                <span className="wd-chart__label">{point.label}</span>
              </div>
            ))}
          </div>
        </figure>
      </div>

      <div className="wd-split">
        <div className="wd-split__title">This month by service</div>
        {sourceTotal > 0 ? (
          <>
            <div className="wd-split__bar">
              {activeSources.map((source) => (
                <span
                  key={source.key}
                  title={`${source.label}: ${inr(source.net)}`}
                  style={{ flexGrow: source.net, background: source.color }}
                />
              ))}
            </div>
            <ul className="wd-split__legend">
              {activeSources.map((source) => (
                <li key={source.key}>
                  <i style={{ background: source.color }} />
                  {source.label}
                  <strong>{inr(source.net)}</strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="wd-empty">No earnings recorded this month yet.</div>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- payout */

export function WalletPayoutCard({ withdrawable, minimum, nextPayoutDate, frequency, methodLabel, onRequest, onManageMethods, onSettlements, canRequest }) {
  const items = [
    { icon: Wallet, label: 'Withdrawable Amount', value: inr(withdrawable), strong: true },
    { icon: Banknote, label: 'Minimum Withdrawal', value: inr(minimum) },
    { icon: CalendarClock, label: 'Next Payout Date', value: nextPayoutDate ? fmtShortDate(nextPayoutDate) : 'On request' },
    { icon: Repeat, label: 'Payout Frequency', value: frequency || 'On request' },
  ]

  return (
    <section className="wd-section" aria-label="Payouts">
      <header className="wd-section__head">
        <h2>Payouts</h2>
        <button type="button" className="wd-link" onClick={onSettlements}>
          Settlement history <ChevronRight size={15} />
        </button>
      </header>

      <div className="wd-payout">
        <dl className="wd-payout__grid">
          {items.map(({ icon: Icon, label, value, strong }) => (
            <div key={label} className="wd-payout__item">
              <span className="wd-payout__icon"><Icon size={16} /></span>
              <div>
                <dt>{label}</dt>
                <dd className={strong ? 'is-strong' : undefined}>{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="wd-payout__method">
          <span className={`wd-payout__icon${methodLabel ? ' is-ok' : ' is-warn'}`}>
            {methodLabel ? <ShieldCheck size={16} /> : <Landmark size={16} />}
          </span>
          <div className="wd-payout__method-text">
            <dt>Bank Account / UPI</dt>
            <dd>{methodLabel || 'No payout method added'}</dd>
            <span className={`wd-status ${methodLabel ? 'wd-status--ok' : 'wd-status--warn'}`}>
              {methodLabel ? 'Default method linked' : 'Action needed'}
            </span>
          </div>
          <button type="button" className="wd-btn wd-btn--ghost" onClick={onManageMethods}>
            {methodLabel ? 'Manage' : 'Add method'}
          </button>
        </div>

        <div className="wd-payout__actions">
          <button type="button" className="wd-btn wd-btn--primary" onClick={onRequest} disabled={!canRequest}>
            <ArrowDownToLine size={16} /> Request Payout
          </button>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- ledger */

export function WalletLedger({ rows, onSelect, emptyText }) {
  if (rows.length === 0) {
    return <div className="wd-empty wd-empty--box">{emptyText}</div>
  }
  return (
    <div className="wd-ledger" role="table" aria-label="Transactions">
      <div className="wd-ledger__head" role="row">
        <span role="columnheader">Date</span>
        <span role="columnheader">Transaction ID</span>
        <span role="columnheader">Type</span>
        <span role="columnheader">Description</span>
        <span role="columnheader" className="is-right">Amount</span>
        <span role="columnheader">Status</span>
      </div>
      {rows.map((txn) => {
        const credit = txn.amount >= 0
        return (
          <button key={txn.id} type="button" className="wd-ledger__row" role="row" onClick={() => onSelect(txn)}>
            <span className="wd-ledger__date" role="cell">{fmtShortDate(txn.date)}</span>
            <span className="wd-ledger__id" role="cell">{txn.id}</span>
            <span className="wd-ledger__type" role="cell">
              <i className={credit ? 'is-credit' : 'is-debit'}>{credit ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}</i>
              {txnDisplayType(txn)}
            </span>
            <span className="wd-ledger__desc" role="cell">{txn.description || txn.sourceSummary || '—'}</span>
            <span className={`wd-ledger__amount ${credit ? 'is-credit' : 'is-debit'}`} role="cell">{signedInr(txn.amount)}</span>
            <span role="cell"><span className={`wallet-txn-status wallet-txn-status--${statusModifier(txn.status)}`}>{txn.status}</span></span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------- filters */

export function WalletTxnFilters({
  search, onSearch,
  dateValue, onDate, dateOptions,
  typeValue, onType, typeOptions,
  statusValue, onStatus, statusOptions,
  customStart, customEnd, onCustomStart, onCustomEnd,
  onDownload, canDownload,
}) {
  return (
    <div className="wd-filters">
      <label className="wd-filters__search">
        <Search size={16} />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search by ID, description or customer"
          aria-label="Search transactions"
        />
      </label>
      <select className="select-input" value={dateValue} onChange={(event) => onDate(event.target.value)} aria-label="Date filter">
        {dateOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select>
      <select className="select-input" value={typeValue} onChange={(event) => onType(event.target.value)} aria-label="Transaction type filter">
        {typeOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select>
      <select className="select-input" value={statusValue} onChange={(event) => onStatus(event.target.value)} aria-label="Status filter">
        {statusOptions.map((option) => <option key={option} value={option}>{option === 'All' ? 'All Statuses' : option}</option>)}
      </select>
      <button type="button" className="wd-btn wd-btn--ghost" onClick={onDownload} disabled={!canDownload}>
        <Download size={15} /> PDF
      </button>
      {dateValue === 'custom' && (
        <div className="wd-filters__range">
          <input type="date" className="text-input" value={customStart} onChange={(event) => onCustomStart(event.target.value)} aria-label="Start date" />
          <span>→</span>
          <input type="date" className="text-input" value={customEnd} onChange={(event) => onCustomEnd(event.target.value)} aria-label="End date" />
        </div>
      )}
    </div>
  )
}
