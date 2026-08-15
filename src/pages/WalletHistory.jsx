import { Wallet, History, Clock, TrendingUp, ArrowDownToLine, Shield } from 'lucide-react'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { getPaymentHoldStatus } from '../utils/date.js'
import PageHeader from '../components/ui/PageHeader.jsx'

function parseAmount(amountStr) {
  const sign = amountStr.trim().startsWith('-') ? -1 : 1
  return sign * Number(amountStr.replace(/[^0-9.]/g, ''))
}

function formatSignedAmount(amount) {
  return `${amount < 0 ? '-' : '+'}₹${Math.abs(amount).toLocaleString('en-IN')}`
}

export default function WalletHistory() {
  const { currentUser } = useAuth()
  const { userWallet, astrologerWallet } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const isAstrologer = currentUser?.role === 'astrologer'
  const wallet = isAstrologer ? astrologerWallet : userWallet
  const holdDays = wallet.holdDays ?? 7

  const transactions = wallet.transactions.map((item) => {
    const amount = parseAmount(item.amount)
    const hold = amount > 0 ? getPaymentHoldStatus(item.date, holdDays) : { held: false }
    return { ...item, amount, hold }
  })

  return (
    <div>
      <PageHeader
        eyebrow={currentUser?.role === 'astrologer' ? 'Astrologer workspace' : 'User portal'}
        title="Wallet History"
        showBack
        backTo={routes.dashboard}
      />

      {currentUser?.role === 'astrologer' ? (
        <>
          <div className="stat-grid section">
            <div className="stat-card">
              <div className="stat-icon tone-violet"><Wallet size={20} /></div>
              <div className="stat-card-body">
                <div className="stat-value">₹ {wallet.balance.toLocaleString('en-IN')}</div>
                <div className="stat-label">Available Balance</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon tone-sky"><Shield size={20} /></div>
              <div className="stat-card-body">
                <div className="stat-value">₹ {(wallet.escrow || 0).toLocaleString('en-IN')}</div>
                <div className="stat-label">Held in Escrow</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon tone-green"><TrendingUp size={20} /></div>
              <div className="stat-card-body">
                <div className="stat-value">₹ {(wallet.earnings || 0).toLocaleString('en-IN')}</div>
                <div className="stat-label">Total Earnings</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon tone-red"><ArrowDownToLine size={20} /></div>
              <div className="stat-card-body">
                <div className="stat-value">₹ {(wallet.withdrawn || 0).toLocaleString('en-IN')}</div>
                <div className="stat-label">Total Withdrawn</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="stat-grid section">
          <div className="stat-card">
            <div className="stat-icon tone-violet"><Wallet size={20} /></div>
            <div className="stat-card-body">
              <div className="stat-value">₹ {wallet.balance.toLocaleString('en-IN')}</div>
              <div className="stat-label">Available Balance</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon tone-gold"><TrendingUp size={20} /></div>
            <div className="stat-card-body">
              <div className="stat-value">₹ {(wallet.toppedUp || 0).toLocaleString('en-IN')}</div>
              <div className="stat-label">Total Topped Up</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon tone-sky"><Wallet size={20} /></div>
            <div className="stat-card-body">
              <div className="stat-value">₹ {(wallet.spent || 0).toLocaleString('en-IN')}</div>
              <div className="stat-label">Total Spent</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon tone-green"><History size={20} /></div>
            <div className="stat-card-body">
              <div className="stat-value">₹ {(wallet.refunded || 0).toLocaleString('en-IN')}</div>
              <div className="stat-label">Total Refunded</div>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title"><History size={20} />Transaction History</div>
        <div className="activity-list">
          {transactions.map((item) => (
            <div key={item.id} className="activity-row">
              <div>
                <div className="activity-id">{item.label}</div>
                <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
                  <span className="activity-meta">{item.time}</span>
                  {item.hold.held && (
                    <span className="badge badge-amber">
                      <Clock size={11} />
                      {item.hold.daysRemaining <= 0 ? 'Releases today' : `Releases in ${item.hold.daysRemaining}d`}
                    </span>
                  )}
                </div>
              </div>
              <div className="font-semibold text-[color:var(--text-primary)]">{formatSignedAmount(item.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
