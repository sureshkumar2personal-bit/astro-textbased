import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { History, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { TempleLampIcon, TempleReturnIcon, TempleScrollIcon, TempleShieldIcon } from '../components/TempleIcons.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'

function getWordPreview(content) {
  const text = String(content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 4) return { preview: text, isTruncated: false }

  return {
    preview: words.slice(0, 4).join(' '),
    isTruncated: true,
  }
}

function ContentPreview({ content, title, onViewFull, quoted = false, className = 'astrologer-modal-question' }) {
  const { preview, isTruncated } = getWordPreview(content)

  return (
    <div className={className}>
      {quoted ? `“${preview}”` : preview}
      {isTruncated && (
        <button type="button" className="link-btn ml-1" aria-label={`See full ${title.toLowerCase()}`} onClick={() => onViewFull({ title, content })}>
          See more…
        </button>
      )}
    </div>
  )
}

export default function DisputeManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { questions, questionPreviewId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [disputeFilter, setDisputeFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(searchParams.get('questionId') || questionPreviewId || null)
  const [detailsOpen, setDetailsOpen] = useState(Boolean(searchParams.get('questionId') || questionPreviewId))
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState('Open')
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [fullContent, setFullContent] = useState(null)

  const disputedQuestions = useMemo(() => {
    if (disputeFilter === 'resolved') return questions.filter((question) => question.dispute?.status === 'Resolved')
    if (disputeFilter === 'pending') return questions.filter((question) => question.dispute?.status === 'Open')
    return questions.filter((question) => question.dispute)
  }, [questions, disputeFilter])

  const totalDisputed = questions.filter((question) => question.dispute).length
  const resolvedDisputes = questions.filter((question) => question.dispute?.status === 'Resolved').length
  const pendingDisputes = questions.filter((question) => question.dispute?.status === 'Open').length
  const selectedQuestion = questions.find((question) => question.id === selectedId) || null

  useEffect(() => {
    const questionId = searchParams.get('questionId')
    if (questionId && questions.some((question) => question.id === questionId)) {
      setSelectedId(questionId)
      setDetailsOpen(true)
    }
  }, [questions, searchParams])

  useEffect(() => {
    setResponse(selectedQuestion?.dispute?.response || '')
    setStatus(selectedQuestion?.dispute?.status || 'Open')
  }, [selectedQuestion?.id, selectedQuestion?.dispute?.response, selectedQuestion?.dispute?.status])

  useEffect(() => {
    if (!detailsOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        if (fullContent) {
          setFullContent(null)
          return
        }
        setDetailsOpen(false)
        setAttachmentOpen(false)
        setSearchParams({}, { replace: true })
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [detailsOpen, fullContent, setSearchParams])

  const openDetails = (question) => {
    setSelectedId(question.id)
    setDetailsOpen(true)
    setFullContent(null)
    setSearchParams({ questionId: question.id }, { replace: true })
  }

  function closeDetails() {
    setDetailsOpen(false)
    setAttachmentOpen(false)
    setFullContent(null)
    setSearchParams({}, { replace: true })
  }

  const updateResponse = (nextStatus) => {
    if (!selectedQuestion) return
    setStatus(nextStatus)
    actions.respondToDispute(selectedQuestion.id, response, nextStatus)
    setJustSubmitted(true)
  }

  const isSubmitted = status !== 'Open'

  return (
    <div>
      <PageHeader eyebrow="Astrologer workspace" title="Dispute Management" showBack backTo={routes.dashboard} backIcon={currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined} />

      <Card className="section">
        <div className="section-title"><History size={18} />Dispute History</div>
        <div className="stat-grid">
          {[
            ['all', totalDisputed, 'Total Raised', 'tone-violet'],
            ['resolved', resolvedDisputes, 'Resolved', 'tone-green'],
            ['pending', pendingDisputes, 'Pending', 'tone-red'],
          ].map(([filter, count, label, tone]) => (
            <button key={filter} className="stat-card stat-card-clickable" onClick={() => setDisputeFilter(filter)} style={disputeFilter === filter ? { background: 'var(--primary-bg)', borderRadius: 'var(--radius-m)' } : {}}>
              <div className={`stat-icon ${tone}`}><History size={20} /></div>
              <div className="stat-card-body"><div className="stat-value">{count}</div><div className="stat-label">{label}</div></div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="section">
        <div className="section-title">{disputeFilter === 'all' ? 'All Disputes' : disputeFilter === 'resolved' ? 'Resolved Disputes' : 'Pending Disputes'}</div>
        {disputedQuestions.length === 0 ? (
          <div className="muted" style={{ padding: '16px 0' }}>No disputes found.</div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {disputedQuestions.map((question) => (
              <button type="button" key={question.id} className="card flex h-full flex-col text-left transition hover:-translate-y-1 hover:border-[color:var(--secondary)]" onClick={() => openDetails(question)}>
                <div className="flex items-start justify-between gap-3"><div className="font-bold text-[color:var(--text-primary)]">{question.id}</div><StatusBadge label={question.dispute?.status || 'Open'} /></div>
                <div className="muted mt-3 flex flex-1 flex-col gap-2 text-sm"><span>{question.user} · {question.category}</span><span>{question.campaignName}</span><span>Raised: {question.raised}</span></div>
                <div className="mt-4 font-semibold text-[color:var(--primary)]">View Details →</div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {detailsOpen && selectedQuestion?.dispute && createPortal(
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(820px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div className="astrologer-modal-title">Dispute Details</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedQuestion.campaignName} · DSP-{selectedQuestion.id}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
                <StatusBadge label={status} />
                <button type="button" className="icon-btn" aria-label="Close dispute details" onClick={closeDetails} style={{ width: 32, height: 32, minWidth: 32 }}><X size={16} /></button>
              </div>
            </div>

            <div className="modal-card__content astrologer-modal-content">
              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleShieldIcon size={14} />User Details</div>
                <div className="astrologer-modal-highlight astrologer-modal-details-grid">
                  <div><strong>Name</strong><div className="muted">{selectedQuestion.user}</div></div>
                  <div><strong>Question ID</strong><div className="muted">{selectedQuestion.id}</div></div>
                  <div><strong>Question Type</strong><div className="muted">{selectedQuestion.type}</div></div>
                  <div><strong>Category</strong><div className="muted">{selectedQuestion.category}</div></div>
                  <div><strong>Raised On</strong><div className="muted">{selectedQuestion.raised}</div></div>
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleScrollIcon size={14} />Original Question</div>
                <div className="astrologer-modal-highlight">
                  <ContentPreview content={selectedQuestion.question} title="Original Question" quoted onViewFull={setFullContent} />
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLampIcon size={14} />Original Answer</div>
                <div className="astrologer-modal-highlight">
                  <ContentPreview content={selectedQuestion.answer || 'Answer is being reviewed.'} title="Original Answer" quoted onViewFull={setFullContent} />
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleShieldIcon size={14} />User Dispute Details</div>
                <div className="astrologer-modal-highlight" style={{ display: 'grid', gap: 12 }}>
                  <div><strong>Dispute Content</strong><ContentPreview content={[selectedQuestion.dispute.reason, selectedQuestion.dispute.description].filter(Boolean).join('. ')} title="User Dispute Details" className="muted mt-1" onViewFull={setFullContent} /></div>
                  {selectedQuestion.dispute.attachment && <button className="option-pill" style={{ width: 'fit-content' }} type="button" onClick={() => setAttachmentOpen(true)}><span className="option-mark"><TempleScrollIcon size={14} /></span>Open {selectedQuestion.dispute.attachment}</button>}
                </div>
              </div>

              <div className="astrologer-modal-section">
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TempleLampIcon size={14} />Astrologer Response</div>
                {isSubmitted ? (
                  <div className="astrologer-modal-highlight">
                    <ContentPreview content={response || 'No response was provided.'} title="Astrologer Response" quoted onViewFull={setFullContent} />
                  </div>
                ) : <>
                  <textarea className="textarea-box" style={{ width: '100%' }} placeholder="Write your clarification or resolution here..." maxLength={3000} value={response} onChange={(event) => setResponse(event.target.value)} />
                  <div className="muted" style={{ fontSize: 12 }}>Characters: {response.length} / 3000</div>
                </>}
              </div>
            </div>

            <div className="modal-card__footer astrologer-modal-footer-actions">
              {isSubmitted && <span style={{ color: 'var(--green-600)', fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>Response submitted successfully</span>}
              <button className="btn btn-ghost" onClick={closeDetails}>Cancel</button>
              {!isSubmitted && <>
                <button className="btn btn-outline" onClick={() => updateResponse('Closed')}>Close Dispute</button>
                <button className="btn btn-primary" disabled={!response.trim()} onClick={() => updateResponse('Resolved')}>Submit Response</button>
              </>}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {fullContent && createPortal(
        <div className="modal-overlay" style={{ zIndex: 70 }} onClick={() => setFullContent(null)}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(640px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="astrologer-modal-title">{fullContent.title}</div>
              <button type="button" className="icon-btn" aria-label="Close full content" onClick={() => setFullContent(null)} style={{ width: 32, height: 32, minWidth: 32 }}><X size={16} /></button>
            </div>
            <div className="modal-card__content">
              <div className="astrologer-modal-highlight astrologer-modal-question" style={{ whiteSpace: 'pre-wrap' }}>{fullContent.content}</div>
            </div>
            <div className="modal-card__footer">
              <button type="button" className="btn btn-primary" onClick={() => setFullContent(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {attachmentOpen && selectedQuestion?.dispute && <div className="modal-overlay" onClick={() => setAttachmentOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="section-title">Attachment Preview</div><div className="muted" style={{ marginBottom: 16 }}>{selectedQuestion.dispute.attachment || 'Attachment.pdf'} is now open in the dispute viewer.</div><button className="btn btn-primary" onClick={() => setAttachmentOpen(false)}>Close</button></div></div>}
      {justSubmitted && <SuccessAlert message="Response submitted successfully." onDismiss={() => setJustSubmitted(false)} />}
    </div>
  )
}
