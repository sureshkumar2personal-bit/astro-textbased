import { createPortal } from 'react-dom'
import { useMemo, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Clock, Minus, Plus, ShieldCheck, Sparkles, User, Wallet, X } from 'lucide-react'
import { mockAstrologers } from '../../data/notificationData.js'
import { getAstrologerPhoto } from '../../data/astrologerPhotos.js'
import { formatSlotAmount, formatSlotExpiryDate } from '../../utils/purchasedSlots.js'

const QUESTION_TYPES = [
  {
    id: 'General',
    label: 'General Q&A',
    description: 'Direct, focused question with quick astrologer response.',
    basePrice: 299,
  },
  {
    id: 'Personal',
    label: 'Personal Q&A',
    description: 'In-depth birth chart analysis, remedies & personal guidance.',
    basePrice: 499,
  },
]

const QUICK_QUANTITIES = [
  { qty: 1, discount: 0, badge: '' },
  { qty: 2, discount: 5, badge: '5% OFF' },
  { qty: 3, discount: 10, badge: 'Popular · 10% OFF' },
  { qty: 5, discount: 15, badge: 'Best Value · 15% OFF' },
  { qty: 10, discount: 20, badge: 'Super Saver · 20% OFF' },
]

export default function BuyQuestionSlotsModal({
  currentUser,
  userWallet,
  onClose,
  onSuccess,
  actions,
}) {
  const [selectedAstrologerId, setSelectedAstrologerId] = useState(() => mockAstrologers[0]?.id || 'astrologer-demo')
  const [selectedType, setSelectedType] = useState('Personal')
  const [quantity, setQuantity] = useState(3)
  const [paymentMethod, setPaymentMethod] = useState('Wallet')
  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const astrologer = useMemo(
    () => mockAstrologers.find((a) => a.id === selectedAstrologerId) || mockAstrologers[0],
    [selectedAstrologerId],
  )

  const typeConfig = useMemo(
    () => QUESTION_TYPES.find((t) => t.id === selectedType) || QUESTION_TYPES[1],
    [selectedType],
  )

  // Package discount rules
  const discountPercent = useMemo(() => {
    if (quantity >= 10) return 20
    if (quantity >= 5) return 15
    if (quantity >= 3) return 10
    if (quantity >= 2) return 5
    return 0
  }, [quantity])

  const unitPrice = typeConfig.basePrice
  const originalTotal = quantity * unitPrice
  const discountAmount = Math.round((originalTotal * discountPercent) / 100)
  const payableTotal = originalTotal - discountAmount

  const walletBalance = Number(userWallet?.balance || 0)
  const isWalletSufficient = paymentMethod !== 'Wallet' || walletBalance >= payableTotal

  const today = new Date()
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.min(20, Math.max(1, prev + delta)))
    setErrorMessage('')
  }

  const handleConfirmPurchase = async () => {
    if (processing) return
    if (paymentMethod === 'Wallet' && !isWalletSufficient) {
      setErrorMessage(`Insufficient wallet balance (₹${walletBalance.toLocaleString('en-IN')}). Please select another payment method or add funds.`)
      return
    }

    setProcessing(true)
    setErrorMessage('')

    try {
      const result = actions.buyQuestionSlots({
        userId: currentUser?.id || 'user-demo',
        userEmail: currentUser?.email || 'user@example.com',
        astrologerId: astrologer.id,
        astrologerName: astrologer.name,
        campaignName: `${astrologer.name} · ${typeConfig.label} Package`,
        questionType: selectedType,
        quantity,
        unitPrice,
        discountPercent,
        totalAmount: payableTotal,
        paymentMethod,
      })

      if (result) {
        onSuccess({
          quantity,
          type: typeConfig.label,
          astrologerName: astrologer.name,
          amount: payableTotal,
          expiresAt: expiryDate.toISOString(),
        })
      }
    } catch {
      setErrorMessage('Failed to complete purchase. Please try again.')
      setProcessing(false)
    }
  }

  return createPortal(
    <div className="modal-overlay user-modal-overlay" onClick={onClose}>
      <div
        className="buy-question-slots-modal user-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Buy Question Slots"
      >
        <div className="user-modal-card__header buy-slots-modal__head">
          <div>
            <span className="buy-slots-modal__eyebrow">Text-Based Questions</span>
            <h3 className="section-title">Buy Question Slots</h3>
            <p className="buy-slots-modal__sub">Select astrologer, question type, and package quantity</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="user-modal-card__content buy-slots-modal__body">
          {/* Prominent 7-Day Validity Warning Banner */}
          <div className="buy-slots-policy-warning" role="alert">
            <div className="buy-slots-policy-warning__icon">
              <AlertTriangle size={20} />
            </div>
            <div className="buy-slots-policy-warning__copy">
              <strong>7-Day Slot Validity Notice (Strict Policy)</strong>
              <p>
                Purchased slots are available for <strong>7 days</strong> from the purchase date. After 7 days, unused slots are permanently <strong>closed</strong>. <strong>No refund and no re-schedule</strong> under any circumstance.
              </p>
            </div>
          </div>

          {/* Select Astrologer */}
          <div className="buy-slots-field">
            <label className="field-label-top">
              <span>Choose Astrologer</span>
            </label>
            <div className="buy-slots-astrologer-grid">
              {mockAstrologers.slice(0, 4).map((item) => {
                const isSelected = item.id === selectedAstrologerId
                const photo = getAstrologerPhoto(item)
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`buy-slots-astrologer-chip${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedAstrologerId(item.id)}
                    aria-pressed={isSelected}
                  >
                    <div className="buy-slots-astrologer-chip__avatar">
                      {photo ? <img src={photo} alt="" /> : <User size={16} />}
                    </div>
                    <div className="buy-slots-astrologer-chip__info">
                      <strong>{item.name}</strong>
                      <small>{item.specialization}</small>
                    </div>
                    {isSelected && (
                      <span className="buy-slots-astrologer-chip__check">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question Type Selection */}
          <div className="buy-slots-field">
            <label className="field-label-top">
              <span>Question Type</span>
            </label>
            <div className="buy-slots-type-grid">
              {QUESTION_TYPES.map((type) => {
                const isSelected = type.id === selectedType
                return (
                  <button
                    type="button"
                    key={type.id}
                    className={`buy-slots-type-card${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedType(type.id)}
                    aria-pressed={isSelected}
                  >
                    <div className="buy-slots-type-card__top">
                      <strong>{type.label}</strong>
                      <span className="buy-slots-type-card__price">₹{type.basePrice}/slot</span>
                    </div>
                    <p className="buy-slots-type-card__desc">{type.description}</p>
                    {isSelected && (
                      <span className="buy-slots-type-card__badge">
                        <Check size={13} /> Selected
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Multiple Slots Quantity Picker */}
          <div className="buy-slots-field">
            <div className="buy-slots-qty-header">
              <label className="field-label-top" style={{ margin: 0 }}>
                <span>Number of Slots</span>
              </label>
              <span className="buy-slots-qty-hint">Buy multiple slots to save up to 20%</span>
            </div>

            {/* Quick quantity selection pills */}
            <div className="buy-slots-quick-pills">
              {QUICK_QUANTITIES.map((item) => {
                const isSelected = quantity === item.qty
                return (
                  <button
                    type="button"
                    key={item.qty}
                    className={`buy-slots-quick-pill${isSelected ? ' is-active' : ''}`}
                    onClick={() => {
                      setQuantity(item.qty)
                      setErrorMessage('')
                    }}
                  >
                    <b>{item.qty} {item.qty === 1 ? 'Slot' : 'Slots'}</b>
                    {item.badge && <small>{item.badge}</small>}
                  </button>
                )
              })}
            </div>

            {/* Stepper controls */}
            <div className="buy-slots-stepper-row">
              <span className="buy-slots-stepper-label">Custom Quantity:</span>
              <div className="buy-slots-stepper">
                <button
                  type="button"
                  className="buy-slots-stepper__btn"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="buy-slots-stepper__value">{quantity}</span>
                <button
                  type="button"
                  className="buy-slots-stepper__btn"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= 20}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Summary & Expiry Breakdown */}
          <div className="buy-slots-summary-box">
            <div className="buy-slots-summary-row">
              <span>Astrologer</span>
              <strong>{astrologer.name}</strong>
            </div>
            <div className="buy-slots-summary-row">
              <span>Slots &amp; Type</span>
              <strong>{quantity} × {typeConfig.label}</strong>
            </div>
            <div className="buy-slots-summary-row buy-slots-summary-row--highlight">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <Clock size={13} /> Validity Window
              </span>
              <strong className="text-amber-600 dark:text-amber-400">
                7 Days (Until {formatSlotExpiryDate(expiryDate)})
              </strong>
            </div>
            {discountPercent > 0 && (
              <div className="buy-slots-summary-row buy-slots-summary-row--discount">
                <span>Multi-Slot Discount ({discountPercent}%)</span>
                <strong className="text-emerald-600">-₹{discountAmount.toLocaleString('en-IN')}</strong>
              </div>
            )}
            <div className="buy-slots-summary-row buy-slots-summary-row--total">
              <span>Total Payable</span>
              <strong>₹{payableTotal.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="buy-slots-payment-group">
            <span className="buy-slots-payment-label">Payment Method:</span>
            <div className="buy-slots-payment-options">
              <label className={`buy-slots-payment-radio${paymentMethod === 'Wallet' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="buy-slots-payment"
                  value="Wallet"
                  checked={paymentMethod === 'Wallet'}
                  onChange={() => setPaymentMethod('Wallet')}
                />
                <Wallet size={15} />
                <span>Wallet (₹{walletBalance.toLocaleString('en-IN')})</span>
              </label>
              <label className={`buy-slots-payment-radio${paymentMethod === 'Online' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="buy-slots-payment"
                  value="Online"
                  checked={paymentMethod === 'Online'}
                  onChange={() => setPaymentMethod('Online')}
                />
                <ShieldCheck size={15} />
                <span>UPI / Net Banking / Card</span>
              </label>
            </div>
          </div>

          {errorMessage && (
            <div className="buy-slots-error" role="alert">
              <AlertTriangle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="user-modal-card__footer buy-slots-modal__foot">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={processing}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmPurchase}
            disabled={processing || (paymentMethod === 'Wallet' && !isWalletSufficient)}
          >
            {processing ? 'Processing Purchase…' : `Pay ₹${payableTotal.toLocaleString('en-IN')} & Get ${quantity} Slots`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
