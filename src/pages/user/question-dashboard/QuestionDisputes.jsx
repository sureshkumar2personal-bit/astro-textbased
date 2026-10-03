import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import SummaryCard from '../../../components/ui/SummaryCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { formatAnswerDate, getQuestionTypeLabel } from '../../../utils/answer.js'
import { getQuestionSourceLabel } from '../../../utils/questions.js'
import {
  DISPUTE_STAGES,
  countDisputeStages,
  getDisputeEligibleQuestions,
  getUserDisputes,
} from '../../../utils/questionDashboard.js'

// Same pastel title-card treatment used by the Text-Based Questions module
// summary cards, so the dispute buckets read like the rest of the app.
const STAGE_CARD_META = {
  All: { background: 'var(--primary-bg)', color: 'var(--primary)', border: 'rgba(91, 33, 182, 0.20)', hint: 'All raised disputes' },
  Open: { background: 'var(--danger-bg)', color: 'var(--red-600)', border: 'rgba(239, 68, 68, 0.24)', hint: 'Waiting for first reply' },
  'Under Review': { background: 'var(--amber-100)', color: 'var(--amber-600)', border: 'rgba(245, 158, 11, 0.30)', hint: 'Reply received' },
  Resolved: { background: 'var(--success-bg)', color: 'var(--green-600)', border: 'rgba(16, 185, 129, 0.30)', hint: 'Marked as resolved' },
  Closed: { background: 'var(--neutral-bg)', color: 'var(--muted)', border: 'rgba(100, 116, 139, 0.24)', hint: 'Closed without resolution' },
}

// Quoted question / answer blocks reuse the same inline treatment the Raise
// Dispute and Track My Questions modals use.
const QUOTE_BOX_STYLE = {
  fontSize: 15,
  lineHeight: 1.6,
  color: 'var(--ink)',
  background: 'var(--violet-50)',
  borderRadius: 'var(--radius-s)',
  padding: 14,
  whiteSpace: 'pre-wrap',
}

function MetaPair({ label, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
      <span className="muted" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', flex: 'none' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{children}</span>
    </span>
  )
}

function DisputeDetailsModal({ entry, onClose }) {
  const { question, dispute, stage } = entry

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div className="modal-overlay user-modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll"
        style={{ width: 'min(760px, calc(100vw - 32px))' }}
        role="dialog"
        aria-modal="true"
        aria-label="Dispute details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
          <div style={{ minWidth: 0 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Dispute Details</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{getQuestionSourceLabel(question)} · {question.id}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <StatusBadge label={stage} />
            <button type="button" className="icon-btn" aria-label="Close dispute details" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-card__content user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="field-label-top" style={{ marginBottom: 8 }}>Question</div>
            <div style={QUOTE_BOX_STYLE}>{question.question || '—'}</div>
          </div>

          {question.answer ? (
            <div>
              <div className="field-label-top" style={{ marginBottom: 8 }}>Astrologer's Answer</div>
              <div style={QUOTE_BOX_STYLE}>{question.answer}</div>
            </div>
          ) : null}

          <Card style={{ padding: 14, display: 'grid', gap: 10 }}>
            <div className="section-title" style={{ marginBottom: 2 }}>Dispute</div>
            <div><strong>Raised To</strong><div className="muted">{dispute.target || '—'}</div></div>
            <div><strong>Reason</strong><div className="muted">{dispute.reason || '—'}</div></div>
            {dispute.description ? <div><strong>Description</strong><div className="muted">{dispute.description}</div></div> : null}
            <div><strong>Attachment</strong><div className="muted">{dispute.attachment || '—'}</div></div>
            <div><strong>Raised On</strong><div className="muted">{dispute.raisedAt ? formatAnswerDate(dispute.raisedAt) : '—'}</div></div>
            <div><strong>Status</strong><StatusBadge label={dispute.status || 'Open'} /></div>
            <div>
              <strong>Astrologer Response</strong>
              <div className="muted">{dispute.response || 'Waiting for an astrologer response.'}</div>
            </div>
            {dispute.resolution ? <div><strong>Resolution</strong><div className="muted">{dispute.resolution}</div></div> : null}
            {dispute.resolvedAt ? <div><strong>Resolved On</strong><div className="muted">{formatAnswerDate(dispute.resolvedAt)}</div></div> : null}
          </Card>
        </div>

        <div className="modal-card__footer user-modal-card__footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function QuestionDisputes() {
  const { questions } = useAppData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(currentUser?.role)
  const [stageFilter, setStageFilter] = useState('All')
  const [openDisputeId, setOpenDisputeId] = useState(null)

  const disputes = useMemo(() => getUserDisputes(questions, currentUser), [questions, currentUser])
  const counts = useMemo(() => countDisputeStages(disputes), [disputes])
  const eligibleQuestions = useMemo(() => getDisputeEligibleQuestions(questions, currentUser), [questions, currentUser])

  const visibleDisputes = useMemo(
    () => (stageFilter === 'All' ? disputes : disputes.filter((entry) => entry.stage === stageFilter)),
    [disputes, stageFilter],
  )
  const openDispute = useMemo(
    () => disputes.find((entry) => entry.question.id === openDisputeId) || null,
    [disputes, openDisputeId],
  )

  return (
    <div>
      <Section title="Disputes" titleRight={<span className="muted">Every dispute you raised, with its current status.</span>}>
        <div className="grid grid-cols-2 items-stretch gap-4 lg:grid-cols-5" style={{ gridAutoRows: 'minmax(132px, 1fr)' }}>
          {DISPUTE_STAGES.map((stage) => {
            const meta = STAGE_CARD_META[stage]
            return (
              <div key={stage} className="h-full" style={{ minHeight: 132 }}>
                <SummaryCard
                  label={stage}
                  value={counts[stage] || 0}
                  hint={meta.hint}
                  background={meta.background}
                  color={meta.color}
                  border={meta.border}
                  onClick={() => setStageFilter(stageFilter === stage && stage !== 'All' ? 'All' : stage)}
                  active={stageFilter === stage}
                />
              </div>
            )
          })}
        </div>
      </Section>

      <Section className="!mt-6" title="Raised Disputes">
        {visibleDisputes.length === 0 ? (
          <Card>
            <div className="muted">
              {disputes.length === 0
                ? 'You have not raised any dispute yet. Answered questions become eligible for a dispute.'
                : `No disputes are currently marked as ${stageFilter}.`}
            </div>
            {disputes.length === 0 && (
              <button type="button" className="btn btn-outline mt-4" onClick={() => navigate(`${routes.askQuestion}/my-questions`)}>
                Go to My Questions
              </button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleDisputes.map(({ question, dispute, stage }) => (
              <Card key={question.id} className="question-dashboard-row">
                <div className="question-dashboard-row__head">
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{question.id}</div>
                  <StatusBadge label={stage} />
                </div>
                <div className="muted" style={{ fontSize: 13.5 }}>
                  {getQuestionSourceLabel(question)} · {question.category} · {getQuestionTypeLabel(question)}
                </div>
                <div className="muted" style={{ fontSize: 13.5 }}>{dispute.reason}</div>
                <div className="question-dashboard-row__meta">
                  <MetaPair label="Raised To">{dispute.target || '—'}</MetaPair>
                  <MetaPair label="Raised On">{dispute.raisedAt ? formatAnswerDate(dispute.raisedAt) : '—'}</MetaPair>
                </div>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setOpenDisputeId(question.id)}>View Dispute</button>
                  <button type="button" className="btn btn-primary" onClick={() => navigate(`${routes.askQuestion}/my-questions?questionId=${question.id}`)}>
                    View Question
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section className="!mt-6" title="Eligible for a Dispute" titleRight={<span className="muted">Answered questions without a dispute.</span>}>
        {eligibleQuestions.length === 0 ? (
          <Card>
            <div className="muted">No answered question is waiting for a dispute right now.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {eligibleQuestions.map((question) => (
              <Card key={question.id} className="question-dashboard-row">
                <div className="question-dashboard-row__head">
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{question.id}</div>
                  <span className="badge badge-red">Dispute eligible</span>
                </div>
                <div className="muted" style={{ fontSize: 13.5 }}>
                  {getQuestionSourceLabel(question)} · {question.category} · {getQuestionTypeLabel(question)}
                </div>
                <div className="question-dashboard-row__meta">
                  <MetaPair label="Answered">{question.answeredAt ? formatAnswerDate(question.answeredAt) : question.raised}</MetaPair>
                </div>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  {/* Raising keeps using the existing Raise Dispute page and its form. */}
                  <button type="button" className="btn btn-primary" onClick={() => navigate(`${routes.raiseDispute}?questionId=${question.id}`)}>
                    Raise Dispute
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => navigate(`${routes.askQuestion}/my-questions?questionId=${question.id}`)}>
                    View Answer
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {openDispute && <DisputeDetailsModal entry={openDispute} onClose={() => setOpenDisputeId(null)} />}
    </div>
  )
}