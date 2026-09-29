import { useMemo, useState } from 'react'
import { Eye, Search, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  filterAdminTransactions,
  getTransactionStatus,
  getTransactionUserName,
  getUserTxnTypeLabel,
  selectTransactionStatusFilters,
  selectUserLinkedTransactions,
} from '../../utils/adminPayments.js'

// Admin -> Payments & Finance list.
//
// Read-only. A transaction is attributed to a user only when it records that
// user's own id; ownership is never inferred from a label, an amount or a date,
// and transactions without one show as unavailable. Refunds, edits and deletions
// are handled in their own modules and are not here.

function TransactionTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>User</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminPayments() {
  const { userWallet } = useAppData()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')

  const transactions = useMemo(() => selectUserLinkedTransactions(userWallet), [userWallet])
  const statusFilters = useMemo(() => selectTransactionStatusFilters(transactions), [transactions])
  const visibleTransactions = useMemo(
    () => filterAdminTransactions(transactions, { query, status }),
    [transactions, query, status],
  )

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Payments &amp; Finance"
        subtitle="Platform payment records. Open a transaction to review its details."
      />

      {transactions.length > 0 ? (
        <>
          <Section className="!mt-4">
            <Card>
              <div className="search-filter-row">
                <div className="search-filter-row__group">
                  <div className="search-bar">
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by user, description, or transaction ID"
                      className="text-input search-bar__input"
                      aria-label="Search transactions"
                    />
                    <button type="button" className="icon-btn" aria-label="Search">
                      <Search size={18} />
                    </button>
                  </div>
                </div>
                {statusFilters.length > 1 && (
                  <div className="search-filter-row__group">
                    <label className="search-filter-row__heading muted" htmlFor="admin-transaction-status" style={{ fontSize: 13, fontWeight: 600 }}>
                      Status
                    </label>
                    <select
                      id="admin-transaction-status"
                      className="select-input"
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                    >
                      {statusFilters.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </Card>
          </Section>

          <Section
            title="Transactions"
            icon={Wallet}
            className="!mt-5"
            titleRight={<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>({visibleTransactions.length})</span>}
          >
            {visibleTransactions.length === 0 ? (
              <p className="muted">No transactions match your search.</p>
            ) : (
              <TransactionTable
                rows={visibleTransactions.map((transaction) => {
                  const transactionStatus = getTransactionStatus(transaction)
                  return (
                    <tr key={transaction.id}>
                      <td>{transaction.id || '—'}</td>
                      <td>{getTransactionUserName(transaction) || '—'}</td>
                      <td>{getUserTxnTypeLabel(transaction)}</td>
                      <td>{transaction.amount}</td>
                      <td>{formatDisplayDate(transaction.date)}</td>
                      <td>
                        {transactionStatus ? <StatusBadge label={transactionStatus} /> : <span className="muted">Not available</span>}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`${routes.base}/payments/${transaction.id}`)}
                        >
                          <Eye size={15} /> View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              />
            )}
          </Section>
        </>
      ) : (
        <Section title="Transactions" icon={Wallet} className="!mt-4">
          <Card>
            <p className="muted" style={{ marginTop: 0 }}>
              No user-linked transactions found.
            </p>
            <p className="muted" style={{ marginBottom: 0 }}>
              Only transactions that record a signed-in user's own id can be attributed here, and the
              app stores a single wallet whose earlier transactions carry no owner. No owner is
              inferred for those and nothing is listed in their place; they will keep showing as
              unavailable until a real user transaction exists.
            </p>
          </Card>
        </Section>
      )}
    </div>
  )
}
