import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Building2,
  Smartphone,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Card from '../../../components/ui/Card.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'

const TABS = [
  { key: 'bank', label: 'Bank Account', icon: Building2 },
  { key: 'upi', label: 'UPI ID', icon: Smartphone },
  { key: 'card', label: 'Card', icon: CreditCard },
]

const POPULAR_BANKS = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Kotak Mahindra Bank', 'Axis Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank']

const CARD_NETWORKS = ['Visa', 'Mastercard', 'RuPay', 'American Express']

function BankForm({ onSuccess }) {
  const { actions } = useAppData()
  const [holderName, setHolderName] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankSearch, setBankSearch] = useState('')
  const [showBankDropdown, setShowBankDropdown] = useState(false)
  const [accountNumber, setAccountNumber] = useState('')
  const [showAccount, setShowAccount] = useState(false)
  const [confirmAccount, setConfirmAccount] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [accountType, setAccountType] = useState('Savings')
  const [setDefault, setSetDefault] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const filteredBanks = POPULAR_BANKS.filter((b) => b.toLowerCase().includes(bankSearch.toLowerCase()))

  const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())
  const maskedAccount = accountNumber ? `****${accountNumber.slice(-4)}` : ''

  const validate = () => {
    const e = {}
    if (!holderName.trim()) e.holderName = 'Required'
    if (!bankName) e.bankName = 'Required'
    if (!accountNumber || accountNumber.length < 8) e.accountNumber = 'Enter a valid account number'
    if (accountNumber !== confirmAccount) e.confirmAccount = 'Account numbers do not match'
    if (!ifscValid) e.ifsc = 'Enter a valid IFSC code'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setSaving(true)
    setTimeout(() => {
      actions.addUserPaymentMethod({
        type: 'bank',
        holderName: holderName.trim(),
        bankName,
        accountNumber,
        ifsc: ifsc.toUpperCase(),
        accountType,
        isDefault: setDefault,
      })
      onSuccess('Bank account saved successfully.')
    }, 400)
  }

  return (
    <div className="pm-form">
      <div className="pm-field">
        <label className="field-label-top" htmlFor="pm-holder">Account Holder Name</label>
        <input id="pm-holder" className="text-input" placeholder="e.g. Priya V." value={holderName} onChange={(e) => setHolderName(e.target.value)} />
        {errors.holderName && <div className="pm-field-error">{errors.holderName}</div>}
      </div>

      <div className="pm-field-row">
        <div className="pm-field" style={{ flex: 1 }}>
          <label className="field-label-top" htmlFor="pm-bank">Bank Name</label>
          <div className="pm-bank-input-wrap">
            <input
              id="pm-bank"
              className="text-input"
              placeholder="Search banks..."
              value={showBankDropdown ? bankSearch : bankName}
              onChange={(e) => { setBankSearch(e.target.value); setShowBankDropdown(true); setBankName('') }}
              onFocus={() => { setShowBankDropdown(true); setBankSearch('') }}
            />
            {showBankDropdown && (
              <div className="pm-bank-dropdown">
                {filteredBanks.map((bank) => (
                  <button key={bank} type="button" className="pm-bank-option" onClick={() => { setBankName(bank); setBankSearch(bank); setShowBankDropdown(false) }}>
                    {bank}
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.bankName && <div className="pm-field-error">{errors.bankName}</div>}
        </div>
        <div className="pm-field" style={{ flex: 1 }}>
          <label className="field-label-top" htmlFor="pm-acctype">Account Type</label>
          <select id="pm-acctype" className="select-input" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            <option>Savings</option>
            <option>Current</option>
            <option>Salary</option>
          </select>
        </div>
      </div>

      <div className="pm-field">
        <label className="field-label-top" htmlFor="pm-acct">Account Number</label>
        <div className="pm-input-with-toggle">
          <input id="pm-acct" className="text-input" type={showAccount ? 'text' : 'password'} placeholder="Enter account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} />
          <button type="button" className="pm-toggle-visibility" onClick={() => setShowAccount(!showAccount)} tabIndex={-1}>
            {showAccount ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {accountNumber && <div className="pm-masked-preview">Preview: {maskedAccount}</div>}
        {errors.accountNumber && <div className="pm-field-error">{errors.accountNumber}</div>}
      </div>

      <div className="pm-field">
        <label className="field-label-top" htmlFor="pm-confirm-acct">Confirm Account Number</label>
        <input id="pm-confirm-acct" className="text-input" type="password" placeholder="Re-enter account number" value={confirmAccount} onChange={(e) => setConfirmAccount(e.target.value.replace(/\D/g, ''))} />
        {errors.confirmAccount && <div className="pm-field-error">{errors.confirmAccount}</div>}
      </div>

      <div className="pm-field">
        <label className="field-label-top" htmlFor="pm-ifsc">IFSC Code</label>
        <input id="pm-ifsc" className="text-input" placeholder="e.g. HDFC0001234" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} maxLength={11} />
        {ifsc && (
          <div className={`pm-ifsc-status ${ifscValid ? 'is-valid' : 'is-invalid'}`}>
            {ifscValid ? <><Check size={14} /> Valid IFSC</> : 'Enter a valid 11-character IFSC code'}
          </div>
        )}
        {errors.ifsc && <div className="pm-field-error">{errors.ifsc}</div>}
      </div>

      <label className="pm-checkbox">
        <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} />
        <span>Set as default payment method</span>
      </label>

      <button type="button" className="btn btn-primary pm-submit" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save Bank Account'}
      </button>
    </div>
  )
}

function UpiForm({ onSuccess }) {
  const { actions } = useAppData()
  const [upiId, setUpiId] = useState('')
  const [setDefault, setSetDefault] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const upiValid = /^[\w.\-]+@[\w]+$/.test(upiId)
  const provider = upiId.split('@')[1] || ''

  const validate = () => {
    const e = {}
    if (!upiId.trim()) e.upiId = 'Required'
    else if (!upiValid) e.upiId = 'Enter a valid UPI ID (e.g. name@upi)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setSaving(true)
    setTimeout(() => {
      actions.addUserPaymentMethod({
        type: 'upi',
        upiId: upiId.trim(),
        upiProvider: provider,
        isDefault: setDefault,
      })
      onSuccess('UPI ID saved successfully.')
    }, 400)
  }

  return (
    <div className="pm-form">
      <div className="pm-field">
        <label className="field-label-top" htmlFor="pm-upi">UPI ID</label>
        <input id="pm-upi" className="text-input" placeholder="e.g. priya@upi" value={upiId} onChange={(e) => setUpiId(e.target.value.trim())} />
        {upiId && (
          <div className={`pm-ifsc-status ${upiValid ? 'is-valid' : 'is-invalid'}`}>
            {upiValid ? <><Check size={14} /> Valid UPI ID{provider ? ` · ${provider}` : ''}</> : 'Enter a valid UPI ID'}
          </div>
        )}
        {errors.upiId && <div className="pm-field-error">{errors.upiId}</div>}
      </div>

      <label className="pm-checkbox">
        <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} />
        <span>Set as default payment method</span>
      </label>

      <button type="button" className="btn btn-primary pm-submit" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save UPI ID'}
      </button>
    </div>
  )
}

function CardForm({ onSuccess }) {
  const { actions } = useAppData()
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [showCard, setShowCard] = useState(false)
  const [expiry, setExpiry] = useState('')
  const [cardNetwork, setCardNetwork] = useState('')
  const [cardType, setCardType] = useState('Credit')
  const [setDefault, setSetDefault] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const detectNetwork = (num) => {
    const d = num.replace(/\s/g, '')
    if (/^4/.test(d)) return 'Visa'
    if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard'
    if (/^6[0-9]/.test(d)) return 'RuPay'
    if (/^3[47]/.test(d)) return 'American Express'
    return ''
  }

  const formatCard = (value) => {
    const d = value.replace(/\D/g, '').slice(0, 16)
    return d.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiry = (value) => {
    const d = value.replace(/\D/g, '').slice(0, 4)
    if (d.length >= 3) return `${d.slice(0, 2)}/${d.slice(2)}`
    return d
  }

  const maskedCard = cardNumber ? `****${cardNumber.replace(/\s/g, '').slice(-4)}` : ''
  const detectedNetwork = detectNetwork(cardNumber)

  const validate = () => {
    const e = {}
    if (!cardHolder.trim()) e.cardHolder = 'Required'
    const digits = cardNumber.replace(/\s/g, '')
    if (digits.length < 13) e.cardNumber = 'Enter a valid card number'
    if (expiry.length < 5) e.expiry = 'MM/YY required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setSaving(true)
    setTimeout(() => {
      actions.addUserPaymentMethod({
        type: 'card',
        cardHolder: cardHolder.trim(),
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardNetwork: detectedNetwork || cardNetwork,
        cardType,
        expiryMonth: expiry.split('/')[0],
        expiryYear: `20${expiry.split('/')[1]}`,
        isDefault: setDefault,
      })
      onSuccess('Card saved successfully.')
    }, 400)
  }

  return (
    <div className="pm-form">
      <div className="pm-card-preview">
        <div className="pm-card-visual">
          <div className="pm-card-visual__top">
            <div className="pm-card-visual__chip" />
            {detectedNetwork && <span className="pm-card-visual__network">{detectedNetwork}</span>}
          </div>
          <div className="pm-card-visual__number">{cardNumber || '**** **** **** ****'}</div>
          <div className="pm-card-visual__bottom">
            <span>{cardHolder || 'CARD HOLDER'}</span>
            <span>{expiry || 'MM/YY'}</span>
          </div>
        </div>
      </div>

      <div className="pm-field">
        <label className="field-label-top" htmlFor="pm-cardholder">Card Holder Name</label>
        <input id="pm-cardholder" className="text-input" placeholder="e.g. Priya V." value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
        {errors.cardHolder && <div className="pm-field-error">{errors.cardHolder}</div>}
      </div>

      <div className="pm-field">
        <label className="field-label-top" htmlFor="pm-cardnum">Card Number</label>
        <div className="pm-input-with-toggle">
          <input id="pm-cardnum" className="text-input" type={showCard ? 'text' : 'password'} placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))} maxLength={19} />
          <button type="button" className="pm-toggle-visibility" onClick={() => setShowCard(!showCard)} tabIndex={-1}>
            {showCard ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {cardNumber && <div className="pm-masked-preview">Preview: {maskedCard}</div>}
        {errors.cardNumber && <div className="pm-field-error">{errors.cardNumber}</div>}
      </div>

      <div className="pm-field-row">
        <div className="pm-field" style={{ flex: 1 }}>
          <label className="field-label-top" htmlFor="pm-expiry">Expiry (MM/YY)</label>
          <input id="pm-expiry" className="text-input" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} maxLength={5} />
          {errors.expiry && <div className="pm-field-error">{errors.expiry}</div>}
        </div>
        <div className="pm-field" style={{ flex: 1 }}>
          <label className="field-label-top" htmlFor="pm-cardtype">Card Type</label>
          <select id="pm-cardtype" className="select-input" value={cardType} onChange={(e) => setCardType(e.target.value)}>
            <option>Credit</option>
            <option>Debit</option>
          </select>
        </div>
      </div>

      <div className="pm-field">
        <label className="field-label-top" htmlFor="pm-network">Card Network</label>
        <select id="pm-network" className="select-input" value={cardNetwork || detectedNetwork} onChange={(e) => setCardNetwork(e.target.value)}>
          <option value="">Auto-detect</option>
          {CARD_NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <label className="pm-checkbox">
        <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} />
        <span>Set as default payment method</span>
      </label>

      <button type="button" className="btn btn-primary pm-submit" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save Card'}
      </button>
    </div>
  )
}

export default function AddPaymentMethod() {
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('bank')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => navigate(routes.paymentMethods), 1500)
  }

  return (
    <div>
      <PageHeader
        eyebrow="User portal"
        title="Add Payment Method"
        subtitle="Choose a method type and enter your details below."
        showBack
        backTo={routes.paymentMethods}
      />

      <div className="pm-add-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              className={`pm-tab ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} /> {tab.label}
            </button>
          )
        })}
      </div>

      <Card className="pm-form-card">
        {activeTab === 'bank' && <BankForm onSuccess={handleSuccess} />}
        {activeTab === 'upi' && <UpiForm onSuccess={handleSuccess} />}
        {activeTab === 'card' && <CardForm onSuccess={handleSuccess} />}
      </Card>

      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage('')} />}
    </div>
  )
}
