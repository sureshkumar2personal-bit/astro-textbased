import { useMemo } from 'react'
import { Wallet } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import {
  findAdminTransaction,
  getTransactionStatus,
  getTransactionUserName,
  getUserTxnTypeLabel,
  selectUserLinkedTransactions,
} from '../../utils/adminPayments.js'

// Admin -> Transaction details.
//
// Read-only. Refunding, editing and deleting all happen in their own modules;
// none of that behaviour is touched here.
function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || 'Not available'}</div>
    </div>
  )
}

export default function AdminTransactionDetails() {
  const { transactionId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { userWallet } = useAppData()

  const transactions = useMemo(() => selectUserLinkedTransactions(userWallet), [userWallet])
  const transaction = useMemo(() => findAdminTransaction(transactions, transactionId), [transactions, transactionId])

  if (!transaction) {
    return <Navigate to={`${routes.base}/payments`} replace />
  }

  const status = getTransactionStatus(transaction)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={transaction.id || 'Transaction'}
        subtitle={transaction.label}
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`${routes.base}/payments`)}
          >
            Back to Payments
          </button>
        }
      />

      <Section title="Transaction" icon={Wallet} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="Transaction ID" value={transaction.id} />
            <DetailField label="User" value={getTransactionUserName(transaction)} />
            <DetailField label="Type" value={getUserTxnTypeLabel(transaction)} />
            <DetailField label="Amount" value={transaction.amount} />
            <DetailField label="Date" value={formatDisplayDate(transaction.date)} />
            <DetailField label="Time" value={transaction.time} />
            <DetailField
              label="Status"
              value={status ? <StatusBadge label={status} /> : null}
            />
            <DetailField label="Description" value={transaction.label} />
          </div>
        </Card>
      </Section>
    </div>
  )
}
