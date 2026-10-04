import { useMemo } from 'react'
import {
  Clock,
  FileText,
  Gavel,
  History,
  MessageCircle,
  Paperclip,
  Wallet,
} from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Section from '../../components/ui/Section.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'
import { formatDisplayDate } from '../../utils/adminUsers.js'
import { parseDisplayDate } from '../../utils/date.js'
import {
  findAdminQuestion,
  getQuestionAskedAt,
  getQuestionAstrologerName,
  getQuestionResponse,
  getQuestionUserName,
} from '../../utils/adminQuestions.js'
import {
  ANSWER_WINDOW_DAYS,
  DISPUTE_RESPONSE_WINDOW_DAYS,
  DISPUTE_OUTCOME_CUSTOMER,
  DISPUTE_OUTCOME_PARTIAL,
  getDisputeResponseDeadline,
  getQuestionPaidAmount,
  isDisputeAwaitingResponse,
  isDisputeOverdue,
  isDisputeUnresolved,
} from '../../utils/paymentRules.js'
import { selectExpiredQuestions, selectQuestionsOverdue } from '../../utils/adminCompliance.js'
// The deadline, payment and dispute cells are imported from the Questions list rather
// than reimplemented. They are the components that already render those three states,
// so the detail page cannot drift away from what the list shows for the same record.
// Importing them changes nothing about the list page itself.
import { DeadlineCell, DisputeCell, PaymentCell } from './AdminQuestions.jsx'

// Admin -> Text-Based Question details.
//
// Read-only, and read-only by design: answering, refunding, resolving, cancelling and
// disputing all happen in their own modules. Nothing on this page writes to the
// questions store, and no lifecycle, payment or dispute rule is redefined here — every
// value below is read through the same selector the list page and the compliance
// sweeps already use.
//
// Where the record does not carry a field, the page says so. It never substitutes a
// placeholder date, a derived amount or an invented event.

// A light bordered surface. `.card` in this codebase is intentionally transparent, so
// grouping and separation come from here instead, matching the sibling dispute page.
const PANEL = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--radius-m)',
  padding: '18px 20px',
}

// Label above value. The value is always the stronger of the two, so a column of these
// reads as values first and labels second.
function DetailField({ label, value, hint }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ marginTop: 5, fontSize: 13.5, fontWeight: 650, color: 'var(--ink)', wordBreak: 'break-word' }}>
        {value === null || value === undefined || value === '' ? <span className="muted" style={{ fontWeight: 500 }}>Not on record</span> : value}
      </div>
      {hint ? <div className="muted" style={{ marginTop: 3, fontSize: 11.5 }}>{hint}</div> : null}
    </div>
  )
}

// A readable block of existing prose: the question, the answer, a dispute narrative.
function Prose({ children }) {
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
      {children}
    </div>
  )
}

function EmptyNote({ children }) {
  return (
    <p className="muted" style={{ margin: 0, fontSize: 13 }}>
      {children}
    </p>
  )
}

// Responsive field grid. Kept as one object so every section lays its fields out
// identically without repeating the same inline style block.
const GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: '18px 20px',
}

// The compact at-a-glance strip. Same six facts the list columns show, so nothing
// here has to be read twice further down the page.
function SummaryTile({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  )
}

// One dated step in the timeline. Rendered only when the record really carries the
// timestamp, so an empty step can never imply an event that did not happen.
function TimelineStep({ label, at, detail }) {
  return (
    <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span
        aria-hidden="true"
        style={{
          marginTop: 5,
          width: 9,
          height: 9,
          borderRadius: '50%',
          flex: 'none',
          background: 'var(--primary)',
          boxShadow: '0 0 0 3px var(--primary-bg)',
        }}
      />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 650, color: 'var(--ink)' }}>{label}</span>
        <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
          {at}
          {detail ? ` · ${detail}` : ''}
        </span>
      </span>
    </li>
  )
}

export default function AdminQuestionDetails() {
  const { questionId } = useParams()
  const navigate = useNavigate()
  const routes = getRoleRoutes(ROLES.ADMIN)
  const { questions } = useAppData()

  const question = useMemo(() => findAdminQuestion(questions, questionId), [questions, questionId])

  if (!question) {
    return <Navigate to={`${routes.base}/text-based-questions`} replace />
  }

  const now = Date.now()
  const response = getQuestionResponse(question)
  const dispute = question.dispute || null

  // Compliance verdicts come from the same selectors the list and the sweeps use, so
  // the deadline shown here is the deadline shown there. Nothing is recalculated.
  const isExpired = selectExpiredQuestions([question]).length > 0
  const isOverdue = selectQuestionsOverdue([question], now).length > 0

  const paidAmount = getQuestionPaidAmount(question)
  const refundAmount = Number(question.refundAmount) > 0 ? Number(question.refundAmount) : null
  const disputeUnresolved = isDisputeUnresolved(dispute)
  const disputeOverdue = isDisputeOverdue(dispute, now)
  const disputeResponseDue = dispute ? getDisputeResponseDeadline(dispute) : null
  const resolution = dispute?.resolution || null
  const outcomeLabel = resolution?.outcome === DISPUTE_OUTCOME_CUSTOMER
    ? 'In favour of the customer'
    : resolution?.outcome === DISPUTE_OUTCOME_PARTIAL
      ? 'Partial refund'
      : resolution?.outcome
        ? 'In favour of the astrologer'
        : null

  const askedAt = getQuestionAskedAt(question)
  const attachments = Array.isArray(question.attachments) ? question.attachments.filter(Boolean) : []
  const previousQuestions = Array.isArray(question.previousQuestions) ? question.previousQuestions.filter(Boolean) : []
  const history = Array.isArray(question.history) ? question.history.filter(Boolean) : []

  // Timeline steps are assembled from timestamps that exist on the record and nothing
  // else. A future response deadline is not an event, so it stays in the dispute
  // section rather than being listed as a step, and a dispute with no raisedAt simply
  // produces no "Dispute raised" step instead of a guessed date.
  const stamp = (value) => {
    const millis = parseDisplayDate(value).getTime()
    return Number.isFinite(millis) && millis > 0 ? millis : null
  }

  const steps = [
    { key: 'asked', label: 'Question asked', at: stamp(askedAt) },
    { key: 'answered', label: 'Answered by astrologer', at: stamp(question.answeredAt || question.answerDeliveredAt) },
    { key: 'dispute-raised', label: 'Dispute raised', at: stamp(dispute?.raisedAt) },
    { key: 'dispute-overdue', label: 'Dispute response overdue', at: stamp(dispute?.overdueAt) },
    { key: 'dispute-resolved', label: 'Dispute resolved', at: stamp(resolution?.resolvedAt) },
  ]
    .filter((step) => step.at !== null)
    .sort((a, b) => a.at - b.at)

  return (
    <div className="tbq-page">
      <PageHeader
        eyebrow="Platform administration"
        title="Text-Based Question"
        subtitle={(
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{question.id || 'No ID on record'}</span>
            <span aria-hidden="true">·</span>
            <span>{question.category ? `Category: ${question.category}` : 'No category on record'}</span>
          </span>
        )}
        actions={(
          <div className="flex items-center gap-2">
            <StatusBadge label={question.status} />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(`${routes.base}/text-based-questions`)}
            >
              Back to Questions
            </button>
          </div>
        )}
      />

      {/* Admin summary: the six facts that identify the record, before any detail. */}
      <Section title="Admin Summary" icon={FileText} className="!mt-5">
        <div style={PANEL}>
          <div style={GRID}>
            <SummaryTile label="User">{getQuestionUserName(question) || <span className="muted">Not on record</span>}</SummaryTile>
            <SummaryTile label="Astrologer">
              {getQuestionAstrologerName(question) || question.astrologerId || <span className="muted">Not on record</span>}
            </SummaryTile>
            <SummaryTile label="Status"><StatusBadge label={question.status} /></SummaryTile>
            <SummaryTile label="Deadline">
              <DeadlineCell question={question} isExpired={isExpired} isOverdue={isOverdue} now={now} />
            </SummaryTile>
            <SummaryTile label="Payment"><PaymentCell question={question} /></SummaryTile>
            <SummaryTile label="Dispute"><DisputeCell question={question} /></SummaryTile>
          </div>
        </div>
      </Section>

      <Section title="Question Details" icon={FileText}>
        <div style={PANEL}>
          <div style={GRID}>
            <DetailField label="Question ID" value={question.id} />
            <DetailField label="User" value={getQuestionUserName(question)} />
            <DetailField label="Astrologer" value={getQuestionAstrologerName(question) || question.astrologerId} />
            <DetailField label="Asked" value={formatDisplayDate(askedAt)} />
            <DetailField
              label="Deadline"
              hint={`${ANSWER_WINDOW_DAYS}-day answer window from the question's own ask time`}
            >
              <DeadlineCell question={question} isExpired={isExpired} isOverdue={isOverdue} now={now} />
            </DetailField>
            <DetailField label="Current status" value={<StatusBadge label={question.status} />} />
          </div>

          {/* Whatever else the record genuinely carries. Each field is optional and
              reports itself as absent rather than being filled in. */}
          <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--divider)' }}>
            <div style={GRID}>
              <DetailField label="Category" value={question.category} />
              <DetailField label="Question type" value={question.type} />
              <DetailField label="Asked for" value={question.questionFor} />
              <DetailField label="Language" value={question.language} />
              <DetailField label="Priority" value={question.priority} />
              <DetailField label="Campaign" value={question.campaignName || question.campaignId} />
              <DetailField label="Horoscope" value={question.horoscopeMode} />
              <DetailField label="Submitted from" value={question.submittedByEmail} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Question & Answer" icon={MessageCircle}>
        <div style={{ ...PANEL, display: 'grid', gap: 22 }}>
          <div>
            <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Question
            </div>
            <div style={{ marginTop: 8 }}>
              {question.question ? <Prose>{question.question}</Prose> : <EmptyNote>No question text on record.</EmptyNote>}
            </div>
          </div>

          <div style={{ paddingTop: 20, borderTop: '1px solid var(--divider)' }}>
            <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Astrologer Response
            </div>
            <div style={{ marginTop: 8 }}>
              {response ? (
                <Prose>{response}</Prose>
              ) : (
                <EmptyNote>Awaiting astrologer response.</EmptyNote>
              )}
            </div>
            {/* A draft is working copy, not a response, so it is never presented as one. */}
            {question.draftAnswer ? (
              <div style={{ marginTop: 16 }}>
                <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Draft answer · not submitted
                </div>
                <div className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {question.draftAnswer}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="Payment" icon={Wallet}>
        <div style={PANEL}>
          <div style={GRID}>
            <DetailField
              label="Amount"
              value={paidAmount === null ? null : `₹${paidAmount.toLocaleString('en-IN')}`}
              hint={question.purchaseType ? `Purchase type: ${question.purchaseType}` : undefined}
            />
            <DetailField label="Payment state">
              <PaymentCell question={question} />
            </DetailField>
            <DetailField label="Recorded state" value={question.paymentState} />
            <DetailField
              label="Refund amount"
              value={refundAmount === null ? null : `₹${refundAmount.toLocaleString('en-IN')}`}
            />
            <DetailField label="Refund status" value={question.refundStatus} />
            <DetailField label="Dispute hold" value={disputeUnresolved ? 'Amount withheld while the dispute is open' : null} />
          </div>
          <p className="muted" style={{ margin: '18px 0 0', fontSize: 11.5, lineHeight: 1.55 }}>
            {paidAmount === null
              ? 'No paid amount is recorded against this question, so no payment state applies.'
              : 'Recorded state only. This page performs no refund or release.'}
          </p>
        </div>
      </Section>

      <Section title="Dispute" icon={Gavel}>
        <div style={PANEL}>
          {!dispute ? (
            <EmptyNote>No dispute</EmptyNote>
          ) : (
            <>
              <div style={GRID}>
                <DetailField label="Dispute status">
                  <StatusBadge label={dispute.status} />
                </DetailField>
                <DetailField label="Raised against" value={dispute.target} />
                <DetailField
                  label="Raised on"
                  value={dispute.raisedAt ? formatDisplayDate(dispute.raisedAt) : null}
                  hint={dispute.raisedAt ? undefined : 'No raised date stored on this dispute'}
                />
                <DetailField
                  label="Response status"
                  value={disputeUnresolved
                    ? (isDisputeAwaitingResponse(dispute) ? 'Awaiting astrologer response' : 'Open')
                    : 'No response outstanding'}
                  hint={disputeUnresolved ? undefined : 'Dispute is resolved'}
                />
                <DetailField
                  label="Response due"
                  value={disputeResponseDue ? formatDisplayDate(disputeResponseDue) : null}
                  hint={
                    disputeResponseDue && disputeUnresolved
                      ? `${DISPUTE_RESPONSE_WINDOW_DAYS}-day window${disputeOverdue ? ' · overdue' : ''}`
                      : disputeResponseDue
                        ? 'Recorded deadline'
                        : undefined
                  }
                />
                <DetailField label="Outcome" value={outcomeLabel} />
              </div>

              {disputeOverdue ? (
                <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--red-600)', fontWeight: 650 }}>
                  Response window has passed.
                </p>
              ) : null}

              <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--divider)', display: 'grid', gap: 18 }}>
                <div>
                  <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Reason
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {dispute.reason ? <Prose>{dispute.reason}</Prose> : <EmptyNote>No reason recorded.</EmptyNote>}
                  </div>
                </div>

                <div>
                  <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Customer description
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {dispute.description ? <Prose>{dispute.description}</Prose> : <EmptyNote>No description recorded.</EmptyNote>}
                  </div>
                </div>

                <div>
                  <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Astrologer response
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {dispute.response ? <Prose>{dispute.response}</Prose> : <EmptyNote>No response recorded yet.</EmptyNote>}
                  </div>
                </div>

                {resolution ? (
                  <div>
                    <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Resolution
                    </div>
                    <div style={GRID}>
                      <DetailField label="Outcome" value={outcomeLabel} />
                      <DetailField
                        label="Refunded"
                        value={Number(resolution.refundAmount) > 0 ? `₹${Number(resolution.refundAmount).toLocaleString('en-IN')}` : null}
                      />
                      <DetailField
                        label="Resolved on"
                        value={resolution.resolvedAt ? formatDisplayDate(resolution.resolvedAt) : null}
                      />
                    </div>
                    {resolution.reason ? (
                      <div style={{ marginTop: 12 }}>
                        <Prose>{resolution.reason}</Prose>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </Section>

      <Section title="Attachments & Notes" icon={Paperclip}>
        <div style={PANEL}>
          <div style={GRID}>
            <DetailField
              label="Attachments"
              value={attachments.length ? attachments.join(', ') : null}
              hint={attachments.length ? undefined : 'No attachments on record'}
            />
            <DetailField
              label="Dispute attachment"
              value={dispute?.attachment}
              hint={dispute?.attachment ? undefined : 'None'}
            />
            <DetailField
              label="Previous questions"
              value={previousQuestions.length ? previousQuestions.join(' · ') : null}
              hint={previousQuestions.length ? undefined : 'None on record'}
            />
          </div>
        </div>
      </Section>

      <Section title="Timeline" icon={History}>
        <div style={PANEL}>
          {steps.length === 0 ? (
            <EmptyNote>No dated events on record for this question.</EmptyNote>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 16 }}>
              {steps.map((step) => (
                <TimelineStep key={step.key} label={step.label} at={formatDisplayDate(new Date(step.at))} />
              ))}
            </ol>
          )}

          {/* The activity log is a list of strings the store appends to on each action.
              It carries no per-entry time, so it is shown as recorded wording rather
              than placed on the dated timeline above. */}
          {history.length ? (
            <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--divider)' }}>
              <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Recorded activity
              </div>
              <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 7 }}>
                {history.map((entry, index) => (
                  <li key={`${entry}-${index}`} className="muted" style={{ fontSize: 12.5, display: 'flex', gap: 8 }}>
                    <Clock size={13} style={{ marginTop: 2, flex: 'none' }} aria-hidden="true" />
                    <span>{entry}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Section>
    </div>
  )
}