import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { History } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import {
  TempleLampIcon,
  TempleReturnIcon,
  TempleScrollIcon,
  TempleShieldIcon,
} from '../components/TempleIcons.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'

export default function DisputeManagement() {
  const [searchParams] = useSearchParams()
  const { questions, questionPreviewId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [disputeFilter, setDisputeFilter] = useState('all')

  const disputedQuestions = useMemo(() => {
    if (disputeFilter === 'resolved') return questions.filter((q) => q.dispute?.status === 'Resolved')
    if (disputeFilter === 'pending') return questions.filter((q) => q.dispute?.status === 'Open')
    return questions.filter((q) => q.dispute)
  }, [questions, disputeFilter])

  const totalDisputed = useMemo(() => questions.filter((q) => q.dispute).length, [questions])
  const resolvedDisputes = useMemo(() => questions.filter((q) => q.dispute?.status === 'Resolved').length, [questions])
  const pendingDisputes = useMemo(() => questions.filter((q) => q.dispute?.status === 'Open').length, [questions])

  const questionId =
    searchParams.get('questionId') ||
    questionPreviewId ||
    disputedQuestions[0]?.id ||
    questions.find((question) => question.status === 'Disputed')?.id ||
    questions[0]?.id
  const selectedQuestion = useMemo(
    () =>
      disputedQuestions.find((question) => question.id === questionId) ||
      questions.find((question) => question.id === questionId) ||
      questions.find((question) => question.status === 'Disputed') ||
      questions[0] ||
      null,
    [questionId, questions, disputedQuestions],
  )
  const [response, setResponse] = useState(selectedQuestion?.dispute?.response || '')
  const [status, setStatus] = useState(selectedQuestion?.dispute?.status || 'Open')
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const backIcon = currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined

  useEffect(() => {
    setResponse(selectedQuestion?.dispute?.response || '')
    setStatus(selectedQuestion?.dispute?.status || 'Open')
  }, [selectedQuestion?.id, selectedQuestion?.dispute?.response, selectedQuestion?.dispute?.status])

  if (!selectedQuestion) {
    return null
  }

  const isSubmitted = status !== 'Open'

  const updateResponse = (nextStatus) => {
    setStatus(nextStatus)
    actions.respondToDispute(selectedQuestion.id, response, nextStatus)
    setJustSubmitted(true)
  }

  return (
    <div>
      <PageHeader eyebrow="Astrologer workspace" title="Dispute Management" showBack backTo={routes.dashboard} backIcon={backIcon} />

      <Card className="section">
        <div className="section-title"><History size={18} />Dispute History</div>
        <div className="stat-grid">
          <button
            className="stat-card stat-card-clickable"
            onClick={() => setDisputeFilter('all')}
            style={disputeFilter === 'all' ? { background: 'var(--primary-bg)', borderRadius: 'var(--radius-m)' } : {}}
          >
            <div className="stat-icon tone-violet"><History size={20} /></div>
            <div className="stat-card-body">
              <div className="stat-value">{totalDisputed}</div>
              <div className="stat-label">Total Raised</div>
            </div>
          </button>
          <button
            className="stat-card stat-card-clickable"
            onClick={() => setDisputeFilter('resolved')}
            style={disputeFilter === 'resolved' ? { background: 'var(--success-bg)', borderRadius: 'var(--radius-m)' } : {}}
          >
            <div className="stat-icon tone-green"><History size={20} /></div>
            <div className="stat-card-body">
              <div className="stat-value">{resolvedDisputes}</div>
              <div className="stat-label">Resolved</div>
            </div>
          </button>
          <button
            className="stat-card stat-card-clickable"
            onClick={() => setDisputeFilter('pending')}
            style={disputeFilter === 'pending' ? { background: 'var(--danger-bg)', borderRadius: 'var(--radius-m)' } : {}}
          >
            <div className="stat-icon tone-red"><History size={20} /></div>
            <div className="stat-card-body">
              <div className="stat-value">{pendingDisputes}</div>
              <div className="stat-label">Pending</div>
            </div>
          </button>
        </div>
      </Card>

      {disputeFilter !== 'all' && (
        <Card className="section">
          <div className="section-title">
            {disputeFilter === 'resolved' ? 'Resolved Disputes' : 'Pending Disputes'}
          </div>
          {disputedQuestions.length === 0 ? (
            <div className="muted" style={{ padding: '16px 0' }}>
              {disputeFilter === 'resolved' ? 'No resolved disputes found.' : 'No pending disputes found.'}
            </div>
          ) : (
            <div className="activity-list">
              {disputedQuestions.map((question) => (
                <div
                  key={question.id}
                  className="activity-row"
                  style={{ cursor: 'pointer', background: selectedQuestion?.id === question.id ? 'var(--primary-bg)' : undefined }}
                  onClick={() => window.location.search = `?questionId=${question.id}`}
                >
                  <div>
                    <div className="activity-id">{question.id}</div>
                    <div className="activity-meta">{question.user} · {question.category}</div>
                  </div>
                  <StatusBadge label={question.dispute?.status || 'Open'} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {disputedQuestions.length > 0 && (
        <>
          <Card className="section" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ lineHeight: 1.7 }}>
              <div>Campaign: {selectedQuestion.campaignName}</div>
              <div>Dispute ID: DSP-{selectedQuestion.id}</div>
            </div>
            <StatusBadge label={status} />
          </Card>

          <Card className="section">
            <div className="section-title"><TempleShieldIcon size={18} />User Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div><strong>User Name</strong><div className="muted">{selectedQuestion.user}</div></div>
              <div><strong>Question ID</strong><div className="muted">{selectedQuestion.id}</div></div>
              <div><strong>Question Type</strong><div className="muted">{selectedQuestion.type}</div></div>
              <div><strong>Category</strong><div className="muted">{selectedQuestion.category}</div></div>
              <div><strong>Raised On</strong><div className="muted">{selectedQuestion.raised}</div></div>
            </div>
          </Card>

          <Card className="section">
            <div className="section-title"><TempleScrollIcon size={18} />Original Question</div>
            <div style={{ fontStyle: 'italic', color: 'var(--ink)' }}>"{selectedQuestion.question}"</div>
          </Card>

          <Card className="section">
            <div className="section-title"><TempleLampIcon size={18} />Original Answer</div>
            <div style={{ fontStyle: 'italic', color: 'var(--ink)' }}>
              "{selectedQuestion.answer || 'Answer is being reviewed.'}"
            </div>
          </Card>

          <Card className="section">
            <div className="section-title"><TempleShieldIcon size={18} />User Dispute Details</div>
            {selectedQuestion.dispute ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div><strong>Reason:</strong> <span className="muted">{selectedQuestion.dispute.reason}</span></div>
                <div>
                  <strong>Description:</strong>
                  <div style={{ marginTop: 6, fontStyle: 'italic', color: 'var(--ink)' }}>
                    {selectedQuestion.dispute.description}
                  </div>
                </div>
                <button className="btn btn-outline" style={{ width: 'fit-content' }} onClick={() => setAttachmentOpen(true)}>
                  Open {selectedQuestion.dispute.attachment}
                </button>
              </div>
            ) : (
              <div className="muted">No dispute has been created for this question.</div>
            )}
          </Card>

          <Card className="section">
            <div className="section-title"><TempleLampIcon size={18} />Astrologer Response</div>
            <textarea
              className="textarea-box"
              placeholder="Write your clarification or resolution here..."
              value={response}
              readOnly={isSubmitted}
              onChange={(e) => setResponse(e.target.value)}
            />
          </Card>

          <Card className="section">
            <div className="section-title">Actions</div>
            <div className="btn-row" style={{ alignItems: 'center' }}>
              {isSubmitted ? (
                status === 'Resolved' && (
                  <span style={{ color: 'var(--green-600)', fontSize: 13, fontWeight: 600 }}>Submitted Successfully</span>
                )
              ) : (
                <button className="btn btn-primary" onClick={() => updateResponse('Resolved')}>
                  Answer
                </button>
              )}
              <button className="btn btn-outline" onClick={() => updateResponse('Closed')}>
                Closed
              </button>
            </div>
          </Card>
        </>
      )}

      {attachmentOpen && (
        <div className="modal-overlay" onClick={() => setAttachmentOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="section-title">Attachment Preview</div>
            <div className="muted" style={{ marginBottom: 16 }}>
              {selectedQuestion.dispute?.attachment || 'Attachment.pdf'} is now open in the dispute viewer.
            </div>
            <button className="btn btn-primary" onClick={() => setAttachmentOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {justSubmitted && (
        <SuccessAlert message="Response submitted successfully." onDismiss={() => setJustSubmitted(false)} />
      )}
    </div>
  )
}
