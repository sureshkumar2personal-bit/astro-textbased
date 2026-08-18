import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RadioGroup } from '../components/OptionGroup.jsx'
import UploadField from '../components/UploadField.jsx'
import { disputeReasons, platformDisputeReasons } from '../data/mockData.js'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'

function isQuestionOwnedByUser(question, user) {
  if (!user?.id && !user?.email) return false
  return (user.id && question.submittedByUserId === user.id) || (user.email && question.submittedByEmail === user.email)
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

  const answeredQuestions = useMemo(
    () => questions.filter((question) => question.status === 'Answered' && isQuestionOwnedByUser(question, currentUser)),
    [currentUser, questions],
  )
  const selectedQuestion = answeredQuestions.find((question) => question.id === selectedId) || null
  const alreadyRaised = Boolean(selectedQuestion?.dispute)
  const reasonOptions = target === 'Platform Support' ? platformDisputeReasons : disputeReasons

  const closePopup = useCallback(() => {
    setPopupOpen(false)
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
      if (event.key === 'Escape') closePopup()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closePopup, popupOpen])

  useEffect(() => {
    setTarget(selectedQuestion?.dispute?.target || 'Astrologer')
    setReason(selectedQuestion?.dispute?.reason || '')
    setDescription(selectedQuestion?.dispute?.description || '')
    setSubmitted(false)
  }, [selectedQuestion?.id, selectedQuestion?.dispute?.description, selectedQuestion?.dispute?.reason, selectedQuestion?.dispute?.target])

  function openPopup(question) {
    setSelectedId(question.id)
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

      {popupOpen && selectedQuestion && (
        <div className="modal-overlay" onClick={closePopup}>
          <div className="modal-card modal-card--scroll" style={{ width: 'min(820px, calc(100vw - 32px))' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header flex items-center justify-between gap-4">
              <div className="section-title" style={{ marginBottom: 0 }}>{alreadyRaised ? 'Dispute Details' : 'Raise Dispute'}</div>
              <button type="button" className="icon-btn" aria-label="Close dispute popup" onClick={closePopup}>×</button>
            </div>

            <div className="modal-card__content grid gap-4">
              <Card>
                <div className="section-title" style={{ fontSize: 15 }}>Question Details</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><strong>Question ID</strong><div className="muted">{selectedQuestion.id}</div></div>
                  <div><strong>Campaign</strong><div className="muted">{selectedQuestion.campaignName}</div></div>
                  <div><strong>Category</strong><div className="muted">{selectedQuestion.category}</div></div>
                  <div><strong>Question Type</strong><div className="muted">{selectedQuestion.type}</div></div>
                </div>
              </Card>

              <Card>
                <div className="section-title" style={{ fontSize: 15 }}>Your Question</div>
                <div style={{ fontStyle: 'italic', color: 'var(--ink)' }}>&quot;{selectedQuestion.question}&quot;</div>
              </Card>

              <Card>
                <div className="section-title" style={{ fontSize: 15 }}>Astrologer&apos;s Answer</div>
                <div style={{ fontStyle: 'italic', color: 'var(--ink)' }}>&quot;{selectedQuestion.status === 'Under Review' ? 'The astrologer’s answer is being reviewed and will be delivered soon.' : (selectedQuestion.answer || 'No answer available.')}&quot;</div>
              </Card>

              {alreadyRaised ? (
                <Card>
                  <div className="section-title" style={{ fontSize: 15 }}>Existing Dispute</div>
                  <div className="grid gap-3">
                    <div><strong>Target</strong><div className="muted">{selectedQuestion.dispute.target}</div></div>
                    <div><strong>Reason</strong><div className="muted">{selectedQuestion.dispute.reason}</div></div>
                    <div><strong>Description</strong><div className="muted">{selectedQuestion.dispute.description}</div></div>
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

            <div className="modal-card__footer">
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
        </div>
      )}

      {submitted && <SuccessAlert message="Dispute submitted successfully." onDismiss={() => setSubmitted(false)} />}
    </div>
  )
}
