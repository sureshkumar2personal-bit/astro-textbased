import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw,
  Zap,
  Pause,
  Play,
  Trash2,
  X,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Section from '../../../components/ui/Section.jsx'
import Card from '../../../components/ui/Card.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { WalletSectionTabs } from '../wallet/WalletHistory.jsx'

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'var(--success)', bg: 'var(--success-bg)' },
  paused: { label: 'Paused', color: 'var(--amber-600)', bg: 'var(--warning-bg)' },
  revoked: { label: 'Revoked', color: 'var(--danger, #b91c1c)', bg: 'var(--danger-bg)' },
}

function maskMethod(method) {
  if (!method) return 'Saved method'
  if (method.type === 'bank') return `${method.bankName || 'Bank'} ****${String(method.accountNumber || '').slice(-4)}`
  if (method.type === 'upi') return method.upiId
  if (method.type === 'card') return `${method.cardNetwork || 'Card'} ****${String(method.cardNumber || '').slice(-4)}`
  return 'Saved method'
}

export default function Autopay() {
  const { currentUser } = useAuth()
  const { userAutopays, userPaymentMethods, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [confirmRevoke, setConfirmRevoke] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const sorted = useMemo(() => {
    if (!Array.isArray(userAutopays)) return []
    return [...userAutopays].sort((a, b) => {
      const order = { active: 0, paused: 1, revoked: 2 }
      return (order[a.status] || 3) - (order[b.status] || 3)
    })
  }, [userAutopays])

  const active = sorted.filter((a) => a.status === 'active')
  const paused = sorted.filter((a) => a.status === 'paused')
  const revoked = sorted.filter((a) => a.status === 'revoked')

  const handleToggle = (id, currentStatus) => {
    if (currentStatus === 'active') {
      actions.updateUserAutopay(id, { status: 'paused' })
      setSuccessMessage('Autopay paused.')
    } else if (currentStatus === 'paused') {
      actions.updateUserAutopay(id, { status: 'active' })
      setSuccessMessage('Autopay resumed.')
    }
  }

  const handleRevoke = (id) => {
    actions.updateUserAutopay(id, { status: 'revoked', revokedAt: new Date().toISOString() })
    setConfirmRevoke(null)
    setSuccessMessage('Autopay revoked.')
  }

  const getMethod = (methodId) => userPaymentMethods.find((m) => m.id === methodId)

  const renderAutopayCard = (autopay) => {
    const status = STATUS_CONFIG[autopay.status]
    const method = getMethod(autopay.paymentMethodId)
    const TypeIcon = autopay.type === 'subscription' ? RefreshCw : Zap

    return (
      <Card key={autopay.id} className="autopay-card">
        <div className="autopay-card__header">
          <div className="autopay-card__type">
            <TypeIcon size={16} />
            <span>{autopay.type === 'subscription' ? 'Subscription Renewal' : 'Low Balance Top-up'}</span>
          </div>
          <span className="autopay-status-chip" style={{ color: status.color, background: status.bg }}>
            {autopay.status === 'active' && <span className="autopay-pulse" />}
            {status.label}
          </span>
        </div>
        <div className="autopay-card__details">
          {autopay.astrologerName && (
            <div className="autopay-card__detail">
              <span>Astrologer</span>
              <strong>{autopay.astrologerName}</strong>
            </div>
          )}
          <div className="autopay-card__detail">
            <span>Amount</span>
            <strong>₹{Number(autopay.amount).toLocaleString('en-IN')}</strong>
          </div>
          {autopay.triggerThreshold && (
            <div className="autopay-card__detail">
              <span>Trigger below</span>
              <strong>₹{Number(autopay.triggerThreshold).toLocaleString('en-IN')}</strong>
            </div>
          )}
          {autopay.frequency && (
            <div className="autopay-card__detail">
              <span>Frequency</span>
              <strong style={{ textTransform: 'capitalize' }}>{autopay.frequency}</strong>
            </div>
          )}
          <div className="autopay-card__detail">
            <span>Pay via</span>
            <strong>{maskMethod(method)}</strong>
          </div>
          {autopay.nextRunAt && autopay.status !== 'revoked' && (
            <div className="autopay-card__detail">
              <span>Next run</span>
              <strong><Clock size={13} /> {new Date(autopay.nextRunAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            </div>
          )}
        </div>
        {autopay.status !== 'revoked' && (
          <div className="autopay-card__actions">
            <button type="button" className={`btn ${autopay.status === 'active' ? 'btn-outline' : 'btn-primary'}`} onClick={() => handleToggle(autopay.id, autopay.status)}>
              {autopay.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
            </button>
            <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger, #b91c1c)' }} onClick={() => setConfirmRevoke(autopay)}>
              <Trash2 size={14} /> Revoke
            </button>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="User portal"
        title="Autopay"
        subtitle="Manage automatic payments for subscriptions and wallet top-ups."
        showBack
        backTo={routes.dashboard}
      />
      <WalletSectionTabs />

      {userPaymentMethods.length === 0 ? (
        <Card>
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--violet-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <RefreshCw size={26} style={{ color: 'var(--primary)' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>Add a payment method first</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>You need at least one saved payment method to set up autopay.</div>
            <button type="button" className="btn btn-primary" onClick={() => navigate(routes.paymentMethods)}>Add Payment Method</button>
          </div>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <Section title="Active Autopays" icon={RefreshCw} titleRight={<span className="autopay-section-count">{active.length}</span>}>
              <div className="autopay-list">{active.map(renderAutopayCard)}</div>
            </Section>
          )}

          {paused.length > 0 && (
            <Section title="Paused" icon={Pause} titleRight={<span className="autopay-section-count">{paused.length}</span>}>
              <div className="autopay-list">{paused.map(renderAutopayCard)}</div>
            </Section>
          )}

          {revoked.length > 0 && (
            <Section title="Revoked" icon={Trash2} titleRight={<span className="autopay-section-count">{revoked.length}</span>}>
              <div className="autopay-list">{revoked.map(renderAutopayCard)}</div>
            </Section>
          )}

          {sorted.length === 0 && (
            <Card>
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>No autopay rules</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>There are no autopay rules to manage.</div>
              </div>
            </Card>
          )}
        </>
      )}

      {confirmRevoke && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={() => setConfirmRevoke(null)}>
          <div className="modal-card" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}><AlertTriangle size={20} /> Revoke Autopay?</div>
              <button type="button" className="icon-btn" onClick={() => setConfirmRevoke(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
                {confirmRevoke.type === 'subscription'
                  ? 'Your subscription renewal will stop. You will need to renew manually before expiry.'
                  : 'Your automatic wallet top-up will stop. Your balance may run low without auto top-up.'}
              </p>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmRevoke(null)}>Keep</button>
              <button type="button" className="btn btn-primary" style={{ background: 'var(--danger, #b91c1c)' }} onClick={() => handleRevoke(confirmRevoke.id)}>
                Yes, Revoke
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage('')} />}
    </div>
  )
}
