import Card from '../ui/Card.jsx'
import StatusBadge from '../StatusBadge.jsx'
import {
  QUESTION_CREDIT_AVAILABLE,
  QUESTION_CREDIT_EXPIRED,
  QUESTION_CREDIT_USED,
  getQuestionCreditDaysRemaining,
  getQuestionCreditOfferLabel,
  getQuestionCreditSourceLabel,
  getQuestionCreditStatus,
} from '../../utils/questionCredits.js'
import { formatSlotAmount } from '../../utils/purchasedSlots.js'

function formatPurchasedQuestionDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// A purchased question is the receipt for a "Pay Now & Ask Later" payment. It is
// only ever created after a confirmed payment (see purchaseQuestionCredit), so an
// existing record is always genuinely paid - there is no pending, failed or
// unpaid state to mislabel. The demo Review & Payment flow never creates one, so
// nothing here can show a demo payment as a real purchase.
const STATUS_LABEL = {
  [QUESTION_CREDIT_AVAILABLE]: 'Available',
  [QUESTION_CREDIT_USED]: 'Used',
  [QUESTION_CREDIT_EXPIRED]: 'Expired',
}

// One purchased-question entitlement. Shared by the Purchased Questions page,
// so every surface reads the exact same fields from the same credit record.
export default function PurchasedQuestionCard({ credit, onAsk, actionLabel = 'Ask Your Question' }) {
  // Always derive the status from the record fields instead of trusting a stored
  // flag, so an entitlement that expired is still blocked even if its stored
  // status is stale, and a used credit stays Used.
  const status = getQuestionCreditStatus(credit)
  const isAvailable = status === QUESTION_CREDIT_AVAILABLE
  const isUsed = status === QUESTION_CREDIT_USED
  const offerLabel = getQuestionCreditOfferLabel(credit)
  const daysLeft = getQuestionCreditDaysRemaining(credit)

  return (
    <Card className="aq-credit-card">
      <div className="aq-credit-card__head">
        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{credit.astrologerName || 'Astrologer'}</div>
        <StatusBadge label={STATUS_LABEL[status] || 'Available'} />
      </div>
      <div className="muted" style={{ fontSize: 13.5 }}>
        {getQuestionCreditSourceLabel(credit)} · {credit.questionType} question
      </div>
      {offerLabel ? <span className="aq-credit-card__offer">{offerLabel}</span> : null}
      <div className="aq-credit-card__meta">
        <span><strong>Purchased</strong> {formatPurchasedQuestionDate(credit.purchasedAt)}</span>
        <span><strong>Paid</strong> {formatSlotAmount(credit.paidPrice)}</span>
        <span><strong>Payment</strong> Paid</span>
        {isUsed ? (
          <span><strong>Used</strong> {formatPurchasedQuestionDate(credit.usedAt)}</span>
        ) : (
          <span>
            <strong>{isAvailable ? 'Expires' : 'Expired'}</strong> {formatPurchasedQuestionDate(credit.expiresAt)}
            {isAvailable ? ` · in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : ''}
          </span>
        )}
      </div>
      {isAvailable ? (
        <button type="button" className="btn btn-primary aq-credit-card__action" onClick={() => onAsk(credit)}>
          {actionLabel}
        </button>
      ) : (
        <div className="aq-credit-card__expired">
          {isUsed
            ? 'Used — this question has already been submitted.'
            : 'Expired — this question can no longer be submitted.'}
        </div>
      )}
    </Card>
  )
}
