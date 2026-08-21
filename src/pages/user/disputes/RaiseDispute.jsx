import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { RadioGroup } from '../../../../components/OptionGroup.jsx'
import UploadField from '../../../../components/UploadField.jsx'
import { disputeReasons, platformDisputeReasons } from '../../../../data/mockData.js'
import { useAppData } from '../../../../state/AppDataContext.jsx'
import { useAuth } from '../../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../../utils/roleRoutes.js'
import PageHeader from '../../../../components/ui/PageHeader.jsx'
import Card from '../../../../components/ui/Card.jsx'
import StatusBadge from '../../../../components/StatusBadge.jsx'
import SuccessAlert from '../../../../components/ui/SuccessAlert.jsx'

function isQuestionOwnedByUser(question, user) {
  if (!user?.id && !user?.email) return false
  return (user.id && question.submittedByUserId === user.id) || (user.email && question.submittedByEmail === user.email)
}

function getWordPreview(content) {
  const text = String(content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= 4) return { preview: text, isTruncated: false }

  return {
    preview: words.slice(0, 4).join(' '),
    isTruncated: true,
  }
}

function ContentPreview({ content, title, onViewFull, quoted = false, className = 'muted' }) {
  const { preview, isTruncated } = getWordPreview(content)

  return (
    <div className={className}>
      {quoted ? `“${preview}”` : preview}
      {isTruncated && <button type="button" className="link-btn ml-1" aria-label={`See full ${title.toLowerCase()}`} onClick={() => onViewFull({ title, content })}>See more…</button>}
    </div>
  )
}

export default function RaiseDispute() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { questions, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const requestedQuestionId = searchParams.get('questionId')
  const [selectedId, setSelectedId] = useState(requestedQuestionId || null)
  const [popupOpen, setPopupOpen] = useState(Boolean(requestedQuestionId))
  const [target, setTarget] = useState('Astrologer')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [fullContent, setFullContent] = useState(null)

  const answeredQuestions = useMemo(
    () => questions.filter((question) => question.status === 'Answered' && isQuestionOwnedByUser(question, currentUser)),
    [currentUser, questions],
  )
  const selectedQuestion = answeredQuestions.find((question) => question.id === selectedId) || null
  const alreadyRaised = Boolean(selectedQuestion?.dispute)
  const reasonOptions = target === 'Platform Support' ? platformDisputeReasons : disputeReasons

  const closePopup = useCallback(() => {
    setPopupOpen(false)
    setFullContent(null)
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    const questionId = searchParams.get('questionId')
    if (questionId && answeredQuestions.some((question) => question.id === questionId)) {
      setSelectedId(questionId)
      setPopupOpen(true)
    }
  }, [answeredQuestions, searchParams])

  useEffect(() => {
    if (!popupOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (fullContent) {
        setFullContent(null)
        return
      }
      closePopup()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closePopup, fullContent, popupOpen])

  useEffect(() => {
    setTarget(selectedQuestion?.dispute?.target || 'Astrologer')
    setReason(selectedQuestion?.dispute?.reason || '')
    setDescription(selectedQuestion?.dispute?.description || '')
    setSubmitted(false)
  }, [selectedQuestion?.id, selectedQuestion?.dispute?.description, selectedQuestion?.dispute?.reason, selectedQuestion?.dispute?.target])

  function openPopup(question) {
    setSelectedId(question.id)
    setFullContent(null)
    setPopupOpen(true)
    setSearchParams({ questionId: question.id }, { replace: true })
  }

  const handleSubmit = () => {
    if (!selectedQuestion || alreadyRaised || !reason || !description.trim()) return
    actions.raiseDispute(selectedQuestion.id, {
      target,
      reason,
      description,
      attachment: 'Screenshot.pdf',
    })
    setSubmitted(true)
    setPopupOpen(false)
    setSearchParams({}, { replace: true })
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Raise Dispute" showBack backTo={routes.trackQuestions} />

      <section className="section">
        <div className="section-title">Answered Questions</div>
        <div className="muted" style={{ marginTop: -8, marginBottom: 16 }}>Select an answered question to raise a new dispute or view an existing dispute.</div>
        {answeredQuestions.length === 0 ? (
          <Card>
            <div className="muted">No answered questions are available for a dispute.</div>
            <button type="button" className="btn btn-outline mt-4" onClick={() => navigate(routes.trackQuestions)}>Go to Track My Questions</button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            {answeredQuestions.map((question) => {
              const hasDispute = Boolean(question.dispute)
              return (
                <button
                  type="button"
                  key={question.id}
                  className="card flex h-full flex-col text-left transition hover:-translate-y-1 hover:border-[color:var(--secondary)]"
                  onClick={() => openPopup(question)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold text-[color:var(--text-primary)]">{question.id}</div>
                    {hasDispute ? <StatusBadge label={question.dispute.status || 'Open'} /> : <span className="badge badge-red">Dispute eligible</span>}
                  </div>
                  <div className="muted mt-3 flex flex-1 flex-col gap-2 text-sm">
                    <span>{question.campaignName}</span>
                    <span>{question.category} · {question.type}</span>
                    <span>Answered: {question.raised}</span>
                  </div>
                  <div className="mt-4 font-semibold text-[color:var(--primary)]">{hasDispute ? 'View Dispute →' : 'Raise Dispute →'}</div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {popupOpen && selectedQuestion && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={closePopup}>
          <div
            className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll"
            style={{ width: 'min(820px, calc(100vw - 32px))' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div style={{ minWidth: 0 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>{alreadyRaised ? 'Dispute Details' : 'Raise Dispute'}</div>
                <div
                  className="muted"
                  style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {selectedQuestion.campaignName || 'User question'} · {selectedQuestion.id}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <StatusBadge label={selectedQuestion.status} />
                <button type="button" className="icon-btn" aria-label="Close dispute popup" onClick={closePopup}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="modal-card__content user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div className="field-label-top" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Question Details</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                    gap: 14,
                    background: 'var(--violet-50)',
                    borderRadius: 'var(--radius-s)',
                    padding: 14,
                    fontSize: 14,
                  }}
                >
                  <div><strong>Question ID</strong><div className="muted">{selectedQuestion.id}</div></div>
                  <div><strong>Campaign</strong><div className="muted">{selectedQuestion.campaignName || 'No campaign'}</div></div>
                  <div><strong>Category</strong><div className="muted">{selectedQuestion.category}</div></div>
                  <div><strong>Question Type</strong><div className="muted">{selectedQuestion.type}</div></div>
                  <div><strong>Question For</strong><div className="muted">{selectedQuestion.questionFor}</div></div>
                  <div><strong>Language</strong><div className="muted">{selectedQuestion.language}</div></div>
                </div>
              </div>

              <div>
                <div className="field-label-top" style={{ marginBottom: 8 }}>Your Question</div>
                <div style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14 }}>
                  <ContentPreview content={selectedQuestion.question} title="Your Question" quoted className="text-[color:var(--ink)]" onViewFull={setFullContent} />
                </div>
              </div>

              <div>
                <div className="field-label-top" style={{ marginBottom: 8 }}>Astrologer's Answer</div>
                <div style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14 }}>
                  <ContentPreview content={selectedQuestion.answer || 'No answer available.'} title="Astrologer's Answer" quoted className="text-[color:var(--ink)]" onViewFull={setFullContent} />
                </div>
              </div>

              {alreadyRaised ? (
                <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Existing Dispute</div>
                    <div className="grid gap-3">
                      <div><strong>Target</strong><div className="muted">{selectedQuestion.dispute.target}</div></div>
                    <div><strong>Reason</strong><ContentPreview content={selectedQuestion.dispute.reason} title="Dispute Reason" onViewFull={setFullContent} /></div>
                    {selectedQuestion.dispute.description ? <div><strong>Description</strong><ContentPreview content={selectedQuestion.dispute.description} title="Dispute Description" onViewFull={setFullContent} /></div> : null}
                    <div><strong>Attachment</strong><div className="muted">{selectedQuestion.dispute.attachment || 'Screenshot.pdf'}</div></div>
                    <div><strong>Status</strong><StatusBadge label={selectedQuestion.dispute.status || 'Open'} /></div>
                  </div>
                </Card>
              ) : (
                <>
                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Raise Dispute To</div>
                    <RadioGroup
                      name="dispute-target"
                      options={['Astrologer', 'Platform Support']}
                      value={target}
                      onChange={(value) => {
                        setTarget(value)
                        setReason('')
                      }}
                    />
                  </Card>

                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Dispute Reason</div>
                    <select value={reason} onChange={(event) => setReason(event.target.value)} className="select-input">
                      <option value="">Select Reason</option>
                      {reasonOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </Card>

                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Dispute Description</div>
                    <textarea className="textarea-box" placeholder="Explain your issue in detail..." maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
                    <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>Characters: {description.length} / 1000</div>
                  </Card>

                  <Card>
                    <div className="section-title" style={{ fontSize: 15 }}>Attachments (Optional)</div>
                    <UploadField label="Upload screenshot, image, or PDF" accept=".pdf,.jpg,.jpeg,.png" />
                  </Card>
                </>
              )}
            </div>

            <div className="modal-card__footer user-modal-card__footer">
              {alreadyRaised ? (
                <button type="button" className="btn btn-primary" onClick={closePopup}>Close</button>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost" onClick={closePopup}>Cancel</button>
                  <button type="button" className="btn btn-primary" disabled={!reason || !description.trim() || submitted} onClick={handleSubmit}>Submit Dispute</button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {fullContent && createPortal(
        <div className="modal-overlay user-modal-overlay" style={{ zIndex: 10000 }} onClick={() => setFullContent(null)}>
          <div className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll" style={{ width: 'min(640px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>{fullContent.title}</div>
              <button type="button" className="icon-btn" aria-label="Close full content" onClick={() => setFullContent(null)}><X size={16} /></button>
            </div>
            <div className="modal-card__content user-modal-card__content">
              <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14, whiteSpace: 'pre-wrap' }}>{fullContent.content}</div>
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              <button type="button" className="btn btn-primary" onClick={() => setFullContent(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {submitted && <SuccessAlert variant="user" message="Dispute submitted successfully." onDismiss={() => setSubmitted(false)} />}
    </div>
  )
}
