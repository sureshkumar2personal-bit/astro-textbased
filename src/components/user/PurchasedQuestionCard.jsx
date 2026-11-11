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
  const isPersonal = credit.questionType !== 'General'
  const offerLabel = getQuestionCreditOfferLabel(credit)
  const daysLeft = getQuestionCreditDaysRemaining(credit)

  return (
    <div className={`glass-card p-5 rounded-2xl border-l-4 ${isPersonal ? 'border-l-emerald-500' : 'border-l-purple-500'} space-y-4 flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
            isPersonal
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
              : 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800'
          }`}>
            {isPersonal ? 'Personal Q&A' : 'General Q&A'}
          </span>
          <span className="text-xs font-bold text-slate-400">{STATUS_LABEL[status] || 'Available'}</span>
        </div>

        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{credit.astrologerName || 'Astrologer'}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{getQuestionCreditSourceLabel(credit)}</p>

        {offerLabel && (
          <div className="mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800">
              {offerLabel}
            </span>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs mb-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Paid:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{formatSlotAmount(credit.paidPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Purchased:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{formatPurchasedQuestionDate(credit.purchasedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{isAvailable ? 'Expires:' : isUsed ? 'Used on:' : 'Expired:'}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isUsed
                ? formatPurchasedQuestionDate(credit.usedAt)
                : `${formatPurchasedQuestionDate(credit.expiresAt)}${isAvailable ? ` (${daysLeft}d left)` : ''}`}
            </span>
          </div>
        </div>
      </div>

      {isAvailable ? (
        <button
          type="button"
          className="w-full py-2.5 emerald-gradient text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 hover:opacity-95 transition"
          onClick={() => onAsk(credit)}
        >
          {actionLabel === 'Ask Your Question' ? 'Use a Slot Now' : actionLabel}
        </button>
      ) : (
        <div className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold text-center">
          {isUsed
            ? 'Used — this question has already been submitted.'
            : 'Expired — this question can no longer be submitted.'}
        </div>
      )}
    </div>
  )
}
