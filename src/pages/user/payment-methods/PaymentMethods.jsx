import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Building2,
  Smartphone,
  Plus,
  Trash2,
  Star,
  X,
  Shield,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Section from '../../../components/ui/Section.jsx'
import Card from '../../../components/ui/Card.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { maskAccountNumber, maskCard, maskUPI } from '../../../utils/wallet.js'

const METHOD_ICONS = {
  bank: Building2,
  upi: Smartphone,
  card: CreditCard,
}

const METHOD_COLORS = {
  bank: 'var(--sky-500)',
  upi: 'var(--violet-600)',
  card: 'var(--amber-500)',
}

const METHOD_TYPE_LABELS = {
  bank: 'Bank Account',
  upi: 'UPI ID',
  card: 'Card',
}

function maskMethodDetail(method) {
  if (method.type === 'bank') return `${method.bankName || 'Bank'} ${maskAccountNumber(method.accountNumber)}`
  if (method.type === 'upi') return maskUPI(method.upiId)
  if (method.type === 'card') return `${method.cardNetwork || 'Card'} ${maskCard(method.cardNumber)}`
  return 'Saved method'
}

function methodSublabel(method) {
  if (method.type === 'bank') return method.accountHolder || method.bankName || ''
  if (method.type === 'upi') return method.upiProvider || 'UPI'
  if (method.type === 'card') return `${method.cardType || 'Card'}${method.cardHolder ? ` · ${method.cardHolder}` : ''}`
  return ''
}

export default function PaymentMethods() {
  const { currentUser } = useAuth()
  const { userPaymentMethods, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const sorted = useMemo(() => {
    if (!Array.isArray(userPaymentMethods)) return []
    return [...userPaymentMethods].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return 0
    })
  }, [userPaymentMethods])

  const handleSetDefault = (methodId) => {
    actions.setDefaultUserPaymentMethod(methodId)
    setSuccessMessage('Default payment method updated.')
  }

  const handleDelete = (methodId) => {
    actions.removeUserPaymentMethod(methodId)
    setConfirmDelete(null)
    setSuccessMessage('Payment method removed.')
  }

  return (
    <div>
      <PageHeader
        eyebrow="User portal"
        title="Payment Methods"
        subtitle="Manage your saved bank accounts, UPI IDs, and cards for seamless payments."
        showBack
        backTo={routes.dashboard}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => navigate(routes.addPaymentMethod)}>
            <Plus size={16} /> Add New Method
          </button>
        }
      />

      <Section title="Saved Methods" icon={CreditCard}>
        {sorted.length === 0 ? (
          <Card>
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--violet-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <CreditCard size={26} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>No payment methods saved</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Add a bank account, UPI ID, or card to start seamless transactions.</div>
              <button type="button" className="btn btn-primary" onClick={() => navigate(routes.addPaymentMethod)}>
                <Plus size={16} /> Add Payment Method
              </button>
            </div>
          </Card>
        ) : (
          <div className="pm-list">
            {sorted.map((method) => {
              const Icon = METHOD_ICONS[method.type] || CreditCard
              const color = METHOD_COLORS[method.type] || 'var(--muted)'
              return (
                <Card key={method.id} className="pm-card">
                  <div className="pm-card__left">
                    <div className="pm-card__icon" style={{ color }}>
                      <Icon size={20} />
                    </div>
                    <div className="pm-card__info">
                      <div className="pm-card__detail">{maskMethodDetail(method)}</div>
                      <div className="pm-card__sublabel">{methodSublabel(method)}</div>
                      <div className="pm-card__type-badge">{METHOD_TYPE_LABELS[method.type]}</div>
                    </div>
                  </div>
                  <div className="pm-card__right">
                    {method.isDefault && (
                      <span className="pm-default-badge">
                        <Star size={12} /> Default
                      </span>
                    )}
                    {!method.isDefault && (
                      <button type="button" className="btn btn-ghost pm-set-default" onClick={() => handleSetDefault(method.id)}>
                        Set Default
                      </button>
                    )}
                    <button type="button" className="icon-btn pm-delete-btn" onClick={() => setConfirmDelete(method)} title="Remove method">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Security" icon={Shield}>
        <Card>
          <div className="pm-security-info">
            <div className="pm-security-item">
              <Shield size={18} style={{ color: 'var(--success)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Your data is encrypted</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Card numbers and account details are masked and stored securely.</div>
              </div>
            </div>
            <div className="pm-security-item">
              <Shield size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>PCI DSS compliant</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>We follow industry-standard security practices for payment data.</div>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* Delete Confirmation Modal */}
      {confirmDelete && createPortal(
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-card" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>
                <Trash2 size={20} /> Remove Method
              </div>
              <button type="button" className="icon-btn" onClick={() => setConfirmDelete(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
                Are you sure you want to remove <strong>{maskMethodDetail(confirmDelete)}</strong>?
                {confirmDelete.isDefault && (
                  <span style={{ display: 'block', marginTop: 8, color: 'var(--danger, #b91c1c)', fontSize: 13 }}>
                    This is your default method. Another method will be set as default automatically.
                  </span>
                )}
              </p>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ background: 'var(--danger, #b91c1c)' }} onClick={() => handleDelete(confirmDelete.id)}>
                <Trash2 size={16} /> Remove
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
