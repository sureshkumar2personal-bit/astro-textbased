import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine,
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  Check,
  X,
  Info,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Section from '../../../components/ui/Section.jsx'
import Card from '../../../components/ui/Card.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

const QUICK_AMOUNTS = [500, 1000, 2000, 5000]
const MIN_WITHDRAW = 100
const MAX_WITHDRAW_DAILY = 50000
const PLATFORM_FEE_RATE = 0.01
const GST_RATE = 0.18

const METHOD_ICONS = { bank: Building2, upi: Smartphone, card: CreditCard }

function maskMethod(method) {
  if (!method) return 'Saved method'
  if (method.type === 'bank') return `${method.bankName || 'Bank'} ****${String(method.accountNumber || '').slice(-4)}`
  if (method.type === 'upi') return method.upiId
  if (method.type === 'card') return `${method.cardNetwork || 'Card'} ****${String(method.cardNumber || '').slice(-4)}`
  return 'Saved method'
}

export default function Withdraw() {
  const { currentUser } = useAuth()
  const { userWallet, userPaymentMethods, actions } = useAppData()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const balance = Number(userWallet?.balance || 0)
  const value = Number(amount) || 0
  const platformFee = Math.round(value * PLATFORM_FEE_RATE)
  const gst = Math.round(platformFee * GST_RATE)
  const totalFee = platformFee + gst
  const youReceive = value - totalFee
  const validAmount = value >= MIN_WITHDRAW && value <= MAX_WITHDRAW_DAILY && value <= balance

  const defaultMethod = userPaymentMethods.find((m) => m.isDefault)
  const selectedMethod = userPaymentMethods.find((m) => m.id === selectedMethodId) || defaultMethod

  useEffect(() => {
    if (defaultMethod) setSelectedMethodId(defaultMethod.id)
  }, [defaultMethod])

  const handleWithdraw = () => {
    if (!validAmount || !selectedMethod) return
    setProcessing(true)
    setTimeout(() => {
      actions.createWithdrawal({
        amount: value,
        fee: totalFee,
        netAmount: youReceive,
        paymentMethodId: selectedMethod.id,
      })
      actions.debitUserWallet({
        amount: value,
        astrologer: 'Bank Withdrawal',
        duration: '',
        service: 'Withdrawal',
        transactionId: `WD-${Date.now().toString(36)}`,
      })
      setShowReview(false)
      setProcessing(false)
      setSuccessMessage(`₹${youReceive.toLocaleString('en-IN')} will be credited to ${maskMethod(selectedMethod)}.`)
      setTimeout(() => navigate(`${routes.walletManagement}/overview`), 2000)
    }, 800)
  }

  return (
    <div>
      <PageHeader
        eyebrow="User portal"
        title="Withdraw Funds"
        subtitle="Transfer money from your wallet to your bank account or UPI."
        showBack
        backTo={routes.dashboard}
      />

      <div className="withdraw-layout">
        <div className="withdraw-main">
          <Section title="Available Balance" icon={Wallet}>
            <Card>
              <div className="withdraw-balance-card">
                <div className="withdraw-balance-label">
                  <Wallet size={18} /> Available Balance
                </div>
                <div className="withdraw-balance-amount">₹{balance.toLocaleString('en-IN')}</div>
                <div className="withdraw-balance-meta">
                  Min ₹{MIN_WITHDRAW.toLocaleString('en-IN')} · Max ₹{MAX_WITHDRAW_DAILY.toLocaleString('en-IN')}/day
                </div>
              </div>
            </Card>
          </Section>

          <Section title="Amount" icon={ArrowDownToLine}>
            <Card>
              <div className="pm-field">
                <label className="field-label-top" htmlFor="withdraw-amount">Withdrawal Amount</label>
                <div className="withdraw-amount-input">
                  <span className="withdraw-rupee">₹</span>
                  <input
                    id="withdraw-amount"
                    className="text-input withdraw-amount-field"
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={MIN_WITHDRAW}
                    max={MAX_WITHDRAW_DAILY}
                  />
                </div>
                {amount && !validAmount && (
                  <div className="pm-field-error">
                    {value < MIN_WITHDRAW ? `Minimum withdrawal is ₹${MIN_WITHDRAW}` : value > balance ? 'Insufficient balance' : `Maximum daily withdrawal is ₹${MAX_WITHDRAW_DAILY.toLocaleString('en-IN')}`}
                  </div>
                )}
              </div>
              <div className="withdraw-quick-amounts">
                {QUICK_AMOUNTS.filter((a) => a <= balance).map((a) => (
                  <button key={a} type="button" className={`withdraw-quick-btn ${value === a ? 'is-active' : ''}`} onClick={() => setAmount(String(a))}>
                    ₹{a.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </Card>
          </Section>

          <Section title="Send To" icon={selectedMethod ? (METHOD_ICONS[selectedMethod.type] || CreditCard) : CreditCard}>
            <Card>
              {userPaymentMethods.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>No payment methods saved.</div>
                  <button type="button" className="btn btn-primary" onClick={() => navigate(routes.paymentMethods)}>Add Payment Method</button>
                </div>
              ) : (
                <div className="withdraw-methods">
                  {userPaymentMethods.map((method) => {
                    const Icon = METHOD_ICONS[method.type] || CreditCard
                    return (
                      <button
                        key={method.id}
                        type="button"
                        className={`withdraw-method-option ${selectedMethodId === method.id ? 'is-selected' : ''}`}
                        onClick={() => setSelectedMethodId(method.id)}
                      >
                        <div className="withdraw-method-left">
                          <Icon size={18} style={{ color: 'var(--primary)' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{maskMethod(method)}</div>
                            {method.isDefault && <div style={{ color: 'var(--muted)', fontSize: 11 }}>Default</div>}
                          </div>
                        </div>
                        <div className={`withdraw-method-check ${selectedMethodId === method.id ? 'is-visible' : ''}`}>
                          <Check size={14} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </Card>
          </Section>
        </div>

        <div className="withdraw-sidebar">
          <Section title="Fee Breakdown" icon={Info}>
            <Card>
              <div className="withdraw-fee-breakdown">
                <div className="withdraw-fee-row">
                  <span>Withdrawal Amount</span>
                  <strong>₹{value.toLocaleString('en-IN')}</strong>
                </div>
                <div className="withdraw-fee-row">
                  <span>Platform Fee (1%)</span>
                  <strong>₹{platformFee.toLocaleString('en-IN')}</strong>
                </div>
                <div className="withdraw-fee-row">
                  <span>GST (18%)</span>
                  <strong>₹{gst.toLocaleString('en-IN')}</strong>
                </div>
                <div className="withdraw-fee-divider" />
                <div className="withdraw-fee-row withdraw-fee-total">
                  <span>You'll Receive</span>
                  <strong>₹{youReceive.toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary withdraw-submit-btn"
                disabled={!validAmount || !selectedMethod}
                onClick={() => setShowReview(true)}
              >
                <ArrowDownToLine size={16} /> Withdraw ₹{youReceive.toLocaleString('en-IN')}
              </button>
              <div className="withdraw-processing-note">Processing time: 1-2 business days</div>
            </Card>
          </Section>
        </div>
      </div>

      {/* Review Modal */}
      {showReview && createPortal(
        <div className="modal-overlay" onClick={() => setShowReview(false)}>
          <div className="modal-card" style={{ width: 'min(460px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}><ArrowDownToLine size={20} /> Review Withdrawal</div>
              <button type="button" className="icon-btn" onClick={() => setShowReview(false)}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="withdraw-review">
                <div className="withdraw-review-row">
                  <span>Amount</span>
                  <strong>₹{value.toLocaleString('en-IN')}</strong>
                </div>
                <div className="withdraw-review-row">
                  <span>Send to</span>
                  <strong>{selectedMethod ? maskMethod(selectedMethod) : '—'}</strong>
                </div>
                <div className="withdraw-review-row">
                  <span>Fee</span>
                  <strong>₹{totalFee.toLocaleString('en-IN')}</strong>
                </div>
                <div className="withdraw-review-row withdraw-review-total">
                  <span>You receive</span>
                  <strong>₹{youReceive.toLocaleString('en-IN')}</strong>
                </div>
                <div className="withdraw-review-note">
                  <Info size={14} /> Processing: 1-2 business days
                </div>
              </div>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowReview(false)}>Edit</button>
              <button type="button" className="btn btn-primary" disabled={processing} onClick={handleWithdraw}>
                {processing ? 'Processing...' : 'Confirm & Send'}
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
