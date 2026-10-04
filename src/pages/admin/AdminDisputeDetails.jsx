import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Clock, Gavel, Info, Megaphone, ShieldCheck, X } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useAdmin } from '../../state/AdminContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import { findAdminDispute, getDisputeId, selectAdminDisputes } from '../../utils/adminDisputes.js'
import {
  DISPUTE_OUTCOME_ASTROLOGER,
  DISPUTE_OUTCOME_CUSTOMER,
  DISPUTE_OUTCOME_PARTIAL,
  DISPUTE_RESPONSE_WINDOW_DAYS,
  getDisputeResponseDeadline,
  getQuestionPaidAmount,
  getQuestionPaymentState,
  isDisputeOverdue,
  isDisputeUnresolved,
} from '../../utils/paymentRules.js'

// Admin -> Dispute details.
//
// Reads the dispute through the existing selectAdminDisputes selector, exactly as
// before. What is new here is the admin decision surface: Review Dispute, Request
// Astrologer Response, and Resolve Dispute.
//
// Every mutation is delegated to the action that already owns the record in
// AppDataContext, so the questions store remains the single owner of the dispute
// model. Nothing on this page writes to storage directly, and no second dispute
// store or timer is introduced.
//
// Financial effect is real but local: a customer-favoured or partial resolution sets
// the question's refund to Pending, and the existing settlement sweep credits the
// customer wallet using the same shape revokeQuestion already uses. This is a
// localStorage application — no gateway, no transfer, and no regulated escrow
// facility is involved or implied.

const PANEL = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--radius-m)',
  boxShadow: 'var(--shadow-xs)',
}

// The three decisions an admin can take, matching the platform rules.
const DISPUTE_ACTIONS = [
  {
    key: 'review',
    label: 'Review Dispute',
    detail: 'Mark the dispute as under review. The amount stays withheld and the response window is not restarted.',
    Icon: ShieldCheck,
    tone: 'sky',
  },
  {
    key: 'request',
    label: 'Request Astrologer Response',
    detail: `Ask the astrologer to respond and restart the ${DISPUTE_RESPONSE_WINDOW_DAYS}-day window from now.`,
    Icon: Clock,
    tone: 'amber',
  },
  {
    key: 'resolve',
    label: 'Resolve Dispute',
    detail: 'Decide the outcome and settle the related amount in the same step.',
    Icon: Gavel,
    tone: 'red',
  },
]

const ACTION_TOKENS = {
  sky: { tint: 'var(--sky-bg)', fg: 'var(--sky-600)' },
  amber: { tint: 'var(--warning-bg)', fg: 'var(--amber-600)' },
  red: { tint: 'var(--danger-bg)', fg: 'var(--red-600)' },
}

function DetailField({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2 }}>{value || 'Not available'}</div>
    </div>
  )
}

function DetailBlock({ label, children }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Decision modal
//
// One dialog serves all three actions. `Request` and `Resolve` require a reason,
// because both change who is owed money or restart a deadline and the audit trail
// has to say why. `Review` is a pure workflow state and needs none.
// ---------------------------------------------------------------------------
function DisputeActionDialog({ action, questionId, paidAmount, reason, outcome, refundAmount, onReasonChange, onOutcomeChange, onRefundAmountChange, onCancel, onConfirm }) {
  const tokens = ACTION_TOKENS[action.tone]
  const requiresReason = action.key !== 'review'
  const confirmDisabled = requiresReason && !reason.trim()
  const ActionIcon = action.Icon

  // A partial resolution needs a real figure, and it can never exceed what was paid.
  const partialInvalid =
    action.key === 'resolve' &&
    outcome === DISPUTE_OUTCOME_PARTIAL &&
    (!(Number(refundAmount) > 0) || Number(refundAmount) > (paidAmount || 0))
  const blocked = confirmDisabled || partialInvalid

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-action-title"
        style={{
          width: 'min(460px, 100%)',
          borderRadius: 'var(--radius-m)',
          border: '1px solid var(--surface-border)',
          background: 'var(--surface-strong)',
          boxShadow: 'var(--shadow-lg)',
          padding: 22,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
            <span
              aria-hidden="true"
              className="stat-icon"
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-s)',
                background: tokens.tint,
                color: tokens.fg,
                flex: 'none',
              }}
            >
              <ActionIcon size={17} />
            </span>
            <span id="dispute-action-title" style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>
              {action.label}
            </span>
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onCancel}
            style={{ width: 30, height: 30, borderRadius: 'var(--radius-xs)' }}
          >
            <X size={15} />
          </button>
        </div>

        <p className="muted" style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.55 }}>
          Question:{' '}
          <span style={{ fontWeight: 650, color: 'var(--ink)' }}>{questionId}</span>
        </p>

        <p className="muted" style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.55 }}>
          {action.detail}
        </p>

        {/* Only a resolution can move the amount, so the outcome control appears for
            that action alone. */}
        {action.key === 'resolve' && (
          <div style={{ marginTop: 16 }}>
            <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Outcome</span>
            <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 7 }}>
              {[
                { value: DISPUTE_OUTCOME_CUSTOMER, label: 'Customer wins' },
                { value: DISPUTE_OUTCOME_ASTROLOGER, label: 'Astrologer wins' },
                { value: DISPUTE_OUTCOME_PARTIAL, label: 'Partial' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onOutcomeChange(option.value)}
                  aria-pressed={outcome === option.value}
                  className={`btn btn-sm ${outcome === option.value ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontWeight: 600 }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="muted" style={{ margin: '9px 0 0', fontSize: 11.5, lineHeight: 1.55 }}>
              {outcome === DISPUTE_OUTCOME_CUSTOMER
                ? `Refunds the full paid amount of ₹${(paidAmount || 0).toLocaleString('en-IN')} to the customer.`
                : outcome === DISPUTE_OUTCOME_ASTROLOGER
                  ? 'Marks the amount release eligible to the astrologer. Nothing is transferred here.'
                  : 'Refunds part of the amount to the customer and releases the remainder.'}
            </p>
            {outcome === DISPUTE_OUTCOME_PARTIAL && (
              <label
                className="muted"
                htmlFor="dispute-partial-refund"
                style={{ display: 'block', marginTop: 12, fontSize: 12, fontWeight: 600 }}
              >
                Refund amount to customer
              </label>
            )}
            {outcome === DISPUTE_OUTCOME_PARTIAL && (
              <input
                id="dispute-partial-refund"
                type="number"
                min="1"
                max={paidAmount || undefined}
                className="text-input"
                value={refundAmount}
                onChange={(event) => onRefundAmountChange(event.target.value)}
                style={{ marginTop: 6, width: '100%', fontSize: 13.5 }}
              />
            )}
            {partialInvalid && (
              <p className="muted" style={{ margin: '7px 0 0', fontSize: 11.5 }}>
                Enter a refund above zero and no more than the ₹{(paidAmount || 0).toLocaleString('en-IN')} paid.
              </p>
            )}
          </div>
        )}

        {requiresReason && (
          <>
            <label
              className="muted"
              htmlFor="dispute-action-reason"
              style={{ display: 'block', marginTop: 16, fontSize: 12, fontWeight: 600 }}
            >
              Reason
            </label>
            <textarea
              id="dispute-action-reason"
              className="textarea-box"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Enter reason..."
              rows={3}
              autoFocus
              style={{ marginTop: 6, minHeight: 84, resize: 'vertical', fontSize: 13.5 }}
            />
            {confirmDisabled && (
              <p className="muted" style={{ margin: '7px 0 0', fontSize: 11.5 }}>
                A reason is required before this action can be confirmed.
              </p>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-2" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn-sm ${action.tone === 'red' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={blocked}
            style={blocked ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function AdminDisputeDetails() {
  const { disputeKey } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { questions, actions } = useAppData()
  const { recordAudit } = useAdmin()

  const [actionsOpen, setActionsOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [pendingReason, setPendingReason] = useState('')
  const [pendingOutcome, setPendingOutcome] = useState(DISPUTE_OUTCOME_CUSTOMER)
  const [pendingRefund, setPendingRefund] = useState('')
  const actionsRef = useRef(null)
  const actionsButtonRef = useRef(null)

  const disputes = useMemo(() => selectAdminDisputes(questions), [questions])
  const row = useMemo(() => findAdminDispute(disputes, disputeKey), [disputes, disputeKey])

  useEffect(() => {
    if (!actionsOpen) return undefined
    const onPointerDown = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) setActionsOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActionsOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [actionsOpen])

  if (!row) {
    return <Navigate to={`${routes.base}/disputes`} replace />
  }

  const { dispute } = row
  const question = questions.find((item) => item.id === row.questionId)
  const unresolved = isDisputeUnresolved(dispute)
  const overdue = isDisputeOverdue(dispute)
  const paidAmount = getQuestionPaidAmount(question)
  const paymentState = getQuestionPaymentState(question)
  const responseDue = getDisputeResponseDeadline(dispute)

  const requestStatusAction = (action) => {
    setActionsOpen(false)
    setPendingReason('')
    setPendingOutcome(DISPUTE_OUTCOME_CUSTOMER)
    setPendingRefund('')
    setPendingAction(action)
  }

  const cancelStatusAction = () => {
    setPendingAction(null)
    setPendingReason('')
    setPendingRefund('')
    if (actionsButtonRef.current) actionsButtonRef.current.focus()
  }

  // The single commit point. Each branch calls the AppDataContext action that owns
  // the record, then writes exactly one audit entry through the existing mechanism.
  // Admin identity and timestamp are stamped by recordAudit itself.
  const confirmStatusAction = () => {
    if (!pendingAction) return
    const action = pendingAction
    const reason = pendingReason.trim()
    if (action.key !== 'review' && !reason) return

    const before = String(dispute.status || '').trim()
    const target = `${row.userName || 'Customer'} · question ${row.questionId}`

    if (action.key === 'review') {
      const result = actions.markDisputeUnderReview(row.questionId)
      if (!result) return
      recordAudit('Dispute Marked Under Review', 'Dispute Management', [
        target,
        `${before || 'Open'} → ${result.status}`,
        'Reason: not required for a review state',
      ].join(' · '))
    } else if (action.key === 'request') {
      const result = actions.requestAstrologerResponse(row.questionId, { reason })
      if (!result) return
      recordAudit('Astrologer Response Requested', 'Dispute Management', [
        target,
        `${before || 'Open'} → ${result.status}`,
        `Reason: ${reason}`,
        `Response due: ${formatDisplayDate(result.responseDueAt)}`,
      ].join(' · '))
    } else {
      const refundAmount = Number(pendingRefund)
      if (pendingOutcome === DISPUTE_OUTCOME_PARTIAL && (!(refundAmount > 0) || refundAmount > (paidAmount || 0))) return
      const result = actions.resolveDispute(row.questionId, {
        outcome: pendingOutcome,
        refundAmount,
        reason,
      })
      if (!result) return
      recordAudit(
        pendingOutcome === DISPUTE_OUTCOME_CUSTOMER
          ? 'Dispute Resolved — Customer Refund'
          : pendingOutcome === DISPUTE_OUTCOME_ASTROLOGER
            ? 'Dispute Resolved — Amount Released'
            : 'Dispute Resolved — Partial Refund',
        'Dispute Management',
        [
          target,
          `${before || 'Open'} → ${result.status}`,
          `Outcome: ${result.outcome}`,
          `Reason: ${reason}`,
          result.refundAmount > 0 ? `Refund: ₹${result.refundAmount.toLocaleString('en-IN')}` : 'Refund: none',
          `Payment state: ${paymentState || 'Not available'} → ${result.paymentState || (result.refundAmount > 0 ? 'Refund Pending' : 'Released')}`,
        ].join(' · '),
      )
    }

    cancelStatusAction()
  }

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title={getDisputeId(row) || row.questionId || 'Dispute'}
        subtitle={`${row.userName} · ${row.astrologerName}`}
        actions={(
          <div className="flex items-center gap-2">
            {/* Decision actions are offered only while the dispute is genuinely
                unresolved. A resolved dispute offers nothing, because there is
                nothing left to decide. */}
            {unresolved ? (
              <div className="relative" ref={actionsRef}>
                <button
                  ref={actionsButtonRef}
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setActionsOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={actionsOpen}
                  aria-label={`Dispute actions for question ${row.questionId}`}
                >
                  Actions
                  <ChevronDown size={15} />
                </button>

                {actionsOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-30"
                    style={{
                      top: 'calc(100% + 6px)',
                      minWidth: 262,
                      borderRadius: 'var(--radius-s)',
                      border: '1px solid var(--surface-border)',
                      background: 'var(--surface-overlay)',
                      boxShadow: 'var(--shadow-md)',
                      padding: 6,
                    }}
                  >
                    {DISPUTE_ACTIONS.map((action) => {
                      const ActionIcon = action.Icon
                      const tokens = ACTION_TOKENS[action.tone]
                      return (
                        <button
                          key={action.key}
                          type="button"
                          role="menuitem"
                          className="flex w-full items-start gap-2.5 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--primary)]"
                          style={{ padding: '8px 10px' }}
                          onClick={() => requestStatusAction(action)}
                        >
                          <span
                            aria-hidden="true"
                            className="stat-icon"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 'var(--radius-xs)',
                              background: tokens.tint,
                              color: tokens.fg,
                              flex: 'none',
                            }}
                          >
                            <ActionIcon size={14} />
                          </span>
                          <span className="flex flex-col" style={{ gap: 2, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                              {action.label}
                            </span>
                            <span className="muted" style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                              {action.detail}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(`${routes.base}/disputes`)}
            >
              Back to Disputes
            </button>
          </div>
        )}
      />

      {pendingAction && (
        <DisputeActionDialog
          action={pendingAction}
          questionId={row.questionId}
          paidAmount={paidAmount}
          reason={pendingReason}
          outcome={pendingOutcome}
          refundAmount={pendingRefund}
          onReasonChange={setPendingReason}
          onOutcomeChange={setPendingOutcome}
          onRefundAmountChange={setPendingRefund}
          onCancel={cancelStatusAction}
          onConfirm={confirmStatusAction}
        />
      )}

      <Section title="Dispute" icon={Megaphone} className="!mt-4">
        <Card>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 18,
            }}
          >
            <DetailField label="Dispute ID" value={getDisputeId(row)} />
            <DetailField label="User" value={row.userName} />
            <DetailField label="Astrologer" value={row.astrologerName} />
            <DetailField label="Related record" value={`${row.relatedLabel} · ${row.questionId}`} />
            <DetailField label="Created" value={formatDisplayDate(row.createdAt)} />
            <DetailField label="Target" value={dispute.target} />
            <DetailField
              label="Status"
              value={row.status ? <StatusBadge label={row.status} /> : null}
            />
            <DetailField label="Attachment" value={dispute.attachment} />
            <DetailField
              label={`Response due (${DISPUTE_RESPONSE_WINDOW_DAYS} days)`}
              value={unresolved ? formatDisplayDate(responseDue) : 'Not applicable'}
            />
            <DetailField
              label="Amount on hold"
              value={paidAmount !== null ? `₹${paidAmount.toLocaleString('en-IN')}` : ''}
            />
            <DetailField
              label="Payment state"
              value={paymentState ? <StatusBadge label={paymentState} /> : null}
            />
          </div>

          <DetailBlock label="Reason">{dispute.reason || 'Not available'}</DetailBlock>

          <DetailBlock label="Details">{dispute.description || 'Not available'}</DetailBlock>

          {dispute.resolution && (
            <DetailBlock label="Admin resolution">
              {`Outcome: ${dispute.resolution.outcome} · Refund: ${
                dispute.resolution.refundAmount > 0
                  ? `₹${dispute.resolution.refundAmount.toLocaleString('en-IN')}`
                  : 'none'
              } · ${dispute.resolution.reason || 'No reason recorded'} · ${formatDisplayDate(
                dispute.resolution.resolvedAt,
              )}`}
            </DetailBlock>
          )}
        </Card>
      </Section>

      <Section title="Resolution" icon={Megaphone} className="!mt-5">
        <Card>
          {dispute.response ? (
            <div style={{ marginTop: 0 }}>{dispute.response}</div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>No records found.</p>
          )}
        </Card>
      </Section>

      {/* Deadline state, stated plainly. An overdue dispute is still unresolved: the
          window running out asks for an admin decision, it never makes one. */}
      {unresolved && (
        <Card
          style={{ ...PANEL, background: 'var(--surface-soft)', padding: '14px 16px', marginTop: 14 }}
          className="flex gap-3"
        >
          <Info size={17} style={{ color: 'var(--muted)', flex: 'none', marginTop: 1 }} />
          <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
            {overdue
              ? `The ${DISPUTE_RESPONSE_WINDOW_DAYS}-day response window has passed with no astrologer response, so this dispute needs an admin decision. It has not been awarded to either side and no money has moved. `
              : `This dispute is unresolved and its amount stays held. The astrologer has until ${formatDisplayDate(
                  responseDue,
                )} to respond. `}
            Resolving it here writes one Admin &amp; Audit entry recording the admin, the action, the previous and
            new status, the reason and any refund figure.
          </p>
        </Card>
      )}
    </div>
  )
}