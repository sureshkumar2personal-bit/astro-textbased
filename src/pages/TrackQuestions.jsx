import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import { ChipGroup } from '../components/OptionGroup.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const STATUS_FILTERS = ['All', 'Pending', 'Dispute', 'Answered']

function normalizeStatusFilter(value) {
  if (STATUS_FILTERS.includes(value)) return value
  if (value === 'Paid') return 'All'
  if (value === 'Submitted') return 'Answered'
  return 'All'
}

export default function TrackQuestions() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { questions, questionPreviewId, setQuestionPreviewId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => normalizeStatusFilter(searchParams.get('status') || 'All'))
  const [detailsOpen, setDetailsOpen] = useState(false)

  const matchesStatusFilter = useCallback((question) => {
    if (statusFilter === 'All') return true
    if (statusFilter === 'Pending') return question.status === 'Pending'
    if (statusFilter === 'Dispute') return question.status === 'Disputed'
    if (statusFilter === 'Answered') return question.status === 'Answered'
    return false
  }, [statusFilter])
  const matchesSearchFilter = useCallback((question) => {
    const term = appliedSearch.trim().toLowerCase()
    if (!term) return true
    if (term.includes('paid')) return question.purchaseType === 'Paid'
    if (term.includes('individual') || term.includes('personal')) return question.type === 'Personal'
    if (term.includes('general')) return question.type === 'General'
    return false
  }, [appliedSearch])
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [ratingSaved, setRatingSaved] = useState(false)

  const ownedQuestions = useMemo(() => {
    const scope = questions.filter((question) => {
      const isOwnQuestion =
        currentUser?.role !== 'user' ||
        (!currentUser?.id && !currentUser?.email) ||
        (currentUser?.id && question.submittedByUserId === currentUser.id) ||
        !question.submittedByEmail ||
        question.submittedByEmail === currentUser.email
      return isOwnQuestion
    })

    const source = currentUser?.role === 'user' && scope.length === 0 ? questions : scope

    const base = source.filter((question) => {
      return matchesSearchFilter(question) && matchesStatusFilter(question)
    })

    return base.sort((a, b) => new Date(b.raisedAt || b.raised) - new Date(a.raisedAt || a.raised))
  }, [currentUser?.email, currentUser?.id, currentUser?.role, questions, matchesSearchFilter, matchesStatusFilter])

  const visibleQuestions = ownedQuestions

  const selectedQuestion = detailsOpen
    ? visibleQuestions.find((question) => question.id === questionPreviewId) || null
    : null

  const selectedDisputeStatus = selectedQuestion?.dispute?.status || null
  const showRaiseDispute = selectedQuestion?.status === 'Answered' && !selectedQuestion?.dispute
  const showViewDispute = selectedDisputeStatus === 'Resolved'
  const ratingMode =
    selectedQuestion?.dispute?.status === 'Resolved'
      ? 'dispute'
      : selectedQuestion?.status === 'Answered'
        ? 'answer'
        : null

  useEffect(() => {
    if (!selectedQuestion) {
      setRating(0)
      setReview('')
      setRatingSaved(false)
      return
    }

    if (selectedQuestion.dispute?.status === 'Resolved') {
      setRating(selectedQuestion.dispute.rating || selectedQuestion.disputeRating || 0)
      setReview('')
      setRatingSaved(Boolean(selectedQuestion.dispute.rating || selectedQuestion.disputeRating))
      return
    }

    if (selectedQuestion.status === 'Answered') {
      setRating(selectedQuestion.answerRating || 0)
      setReview(selectedQuestion.answerReview || '')
      setRatingSaved(Boolean(selectedQuestion.answerRating))
      return
    }

    setRating(0)
    setReview('')
    setRatingSaved(false)
  }, [selectedQuestion, selectedQuestion?.answerRating, selectedQuestion?.answerReview, selectedQuestion?.dispute?.rating, selectedQuestion?.dispute?.status, selectedQuestion?.disputeRating, selectedQuestion?.id, selectedQuestion?.status])

  const openQuestion = (questionId) => {
    setQuestionPreviewId(questionId)
    setDetailsOpen(true)
  }

  const closeQuestion = useCallback(() => {
    setDetailsOpen(false)
    setQuestionPreviewId(null)
  }, [setQuestionPreviewId])

  useEffect(() => {
    if (!detailsOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeQuestion()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closeQuestion, detailsOpen, selectedQuestion])

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Track My Questions" showBack backTo={routes.askQuestion} />

      <Section title="Search">
        <Card>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Paid / Individual / General"
              className="text-input"
              style={{ flex: 1, minWidth: 240 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setAppliedSearch(search)
                }
              }}
            />
            <button className="btn btn-primary" onClick={() => setAppliedSearch(search)}>Search</button>
          </div>
        </Card>
      </Section>

      <Section title="Status">
        <Card>
          <ChipGroup options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        </Card>
      </Section>

      <div className="section">
        <Card style={{ marginTop: 0 }}>
          <div className="section-title">My Questions</div>
          {visibleQuestions.length === 0 && (
            <div className="mb-4 rounded-[14px] border border-[color:var(--border)] bg-white/90 px-4 py-3 text-sm text-[color:var(--muted)]">
              No matching questions found. Clear filters or submit a question from the Ask Question page.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {visibleQuestions.map((question) => {
              return (
                <Card
                  key={question.id}
                  hover
                  className="cursor-pointer"
                  onClick={() => openQuestion(question.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{question.id}</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="badge badge-green">{question.type}</span>
                        <span className="badge badge-gold">{question.purchaseType}</span>
                      </div>
                      <div className="muted">Raised: {question.raised}</div>
                    </div>
                    <StatusBadge label={question.status} />
                  </div>
                  <div className="btn-row" style={{ marginTop: 14 }}>
                    <button className="btn btn-outline" onClick={(event) => { event.stopPropagation(); openQuestion(question.id) }}>View</button>
                    {question.status === 'Pending' && (
                      <>
                        <button className="btn btn-outline" onClick={(event) => { event.stopPropagation(); navigate(`${routes.askQuestion}?editQuestionId=${question.id}`) }}>Edit</button>
                        <button className="btn btn-danger" onClick={(event) => { event.stopPropagation(); actions.revokeQuestion(question.id) }}>Delete</button>
                      </>
                    )}
                    {question.status === 'Answered' && !question.dispute && (
                      <button className="btn btn-primary" onClick={(event) => { event.stopPropagation(); navigate(`${routes.raiseDispute}?questionId=${question.id}`) }}>Raise Dispute</button>
                    )}
                    {question.dispute?.status === 'Resolved' && (
                      <button className="btn btn-primary" onClick={(event) => { event.stopPropagation(); openQuestion(question.id) }}>View</button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </Card>
      </div>

      {detailsOpen && selectedQuestion && createPortal(
        <div className="modal-overlay user-modal-overlay" onClick={closeQuestion}>
          <div
            className="modal-card modal-card--scroll user-modal-card user-modal-card--scroll"
            style={{ width: 'min(820px, calc(100vw - 32px))' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header user-modal-card__header flex items-center justify-between gap-4">
              <div style={{ minWidth: 0 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Question Details</div>
                <div
                  className="muted"
                  style={{ fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {selectedQuestion.campaignName || 'User question'} · {selectedQuestion.id}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <StatusBadge label={selectedQuestion.status} />
                <button type="button" className="icon-btn" aria-label="Close question details" onClick={closeQuestion}>
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
                  <div><strong>ID</strong><div className="muted">{selectedQuestion.id}</div></div>
                  <div><strong>User</strong><div className="muted">{selectedQuestion.user}</div></div>
                  <div><strong>Campaign</strong><div className="muted">{selectedQuestion.campaignName || 'No campaign'}</div></div>
                  <div><strong>Category</strong><div className="muted">{selectedQuestion.category}</div></div>
                  <div><strong>Type</strong><div className="muted">{selectedQuestion.type}</div></div>
                  <div><strong>Status</strong><div className="muted">{selectedQuestion.status}</div></div>
                </div>
              </div>

              <div>
                <div className="field-label-top" style={{ marginBottom: 8 }}>Your Question</div>
                <div style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14 }}>
                  “{selectedQuestion.question}”
                </div>
              </div>

              <div>
                <div className="field-label-top" style={{ marginBottom: 8 }}>Astrologer's Answer</div>
                <div style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink)', background: 'var(--violet-50)', borderRadius: 'var(--radius-s)', padding: 14 }}>
                  “{selectedQuestion.answer || 'No answer yet.'}”
                </div>
              </div>

              {selectedQuestion.dispute && (
                <Card style={{ padding: 14, display: 'grid', gap: 10 }}>
                  <div className="section-title" style={{ marginBottom: 2 }}>Dispute</div>
                  <div><strong>Target</strong><div className="muted">{selectedQuestion.dispute.target}</div></div>
                  <div><strong>Reason</strong><div className="muted">{selectedQuestion.dispute.reason}</div></div>
                  {selectedQuestion.dispute.description ? <div><strong>Description</strong><div className="muted">{selectedQuestion.dispute.description}</div></div> : null}
                  <div><strong>Attachment</strong><div className="muted">{selectedQuestion.dispute.attachment || 'Attachment.pdf'}</div></div>
                  <div><strong>Dispute Status</strong><StatusBadge label={selectedQuestion.dispute.status || 'Open'} /></div>
                  <div><strong>Astrologer Response</strong><div className="muted">{selectedQuestion.dispute.response || 'Waiting for astrologer update.'}</div></div>
                </Card>
              )}

              {ratingMode && (
                <Card style={{ padding: 14, display: 'grid', gap: 12 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>
                    {ratingMode === 'dispute' ? 'Rate Dispute Resolution' : 'Rate & Review the Astrologer'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`btn ${rating >= value ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setRating(value)}
                        aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      >
                        ★ {value}
                      </button>
                    ))}
                  </div>
                  <div className="muted">
                    {rating ? `Selected rating: ${rating} star${rating === 1 ? '' : 's'}` : 'Select a star rating and save it.'}
                  </div>
                  {ratingMode === 'answer' && (
                    <div className="field-group" style={{ marginBottom: 0 }}>
                      <label className="field-label-top">Your Feedback (Optional)</label>
                      <textarea
                        className="textarea-box"
                        style={{ minHeight: 80 }}
                        placeholder="Share your experience with the astrologer's answer..."
                        maxLength={500}
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="btn-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        if (!rating) return
                        if (ratingMode === 'dispute') {
                          actions.rateDisputeResolution(selectedQuestion.id, rating)
                        } else {
                          actions.rateQuestionAnswer(selectedQuestion.id, rating, review)
                        }
                        setRatingSaved(true)
                      }}
                    >
                      Save Rating
                    </button>
                  </div>
                  {ratingSaved && (
                    <div className="badge badge-green" style={{ width: 'fit-content' }}>
                      {ratingMode === 'answer' ? 'Rating & feedback saved successfully' : 'Rating saved successfully'}
                    </div>
                  )}
                </Card>
              )}
            </div>
            <div className="modal-card__footer user-modal-card__footer">
              {showRaiseDispute && (
                <button className="btn btn-primary" onClick={() => navigate(`${routes.raiseDispute}?questionId=${selectedQuestion.id}`)}>
                  Raise Dispute
                </button>
              )}
              {showViewDispute && (
                <button className="btn btn-primary" onClick={() => openQuestion(selectedQuestion.id)}>
                  View
                </button>
              )}
              <button className="btn btn-ghost" onClick={closeQuestion}>Close</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
