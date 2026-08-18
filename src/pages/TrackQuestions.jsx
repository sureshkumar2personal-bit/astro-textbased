import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import { ChipGroup } from '../components/OptionGroup.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Section from '../components/ui/Section.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'

const USER_PENDING_STATUSES = ['Pending', 'Submitted', 'Queued', 'In Progress', 'Under Review']

export default function TrackQuestions() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { questions, questionPreviewId, setQuestionPreviewId, actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All')

  const matchesStatusFilter = useCallback((questionStatus) => {
    if (statusFilter === 'All') return true
    if (statusFilter === 'pending_group') return USER_PENDING_STATUSES.includes(questionStatus)
    return questionStatus === statusFilter
  }, [statusFilter])
  const [detailsClosed, setDetailsClosed] = useState(false)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [ratingSaved, setRatingSaved] = useState(false)

  const ownedQuestions = useMemo(() => {
    const term = appliedSearch.trim().toLowerCase()
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
      const categoryLabel = question.category || 'Others'
      const matchesSearch = !term || [question.id, categoryLabel, question.question, question.status, question.campaignName]
        .join(' ')
        .toLowerCase()
        .includes(term)
      const matchesCategory =
        category === 'All' ||
        categoryLabel === category ||
        categoryLabel.includes(category) ||
        (category === 'Others' && categoryLabel === 'Others')
      return matchesSearch && matchesCategory && matchesStatusFilter(question.status)
    })

    return base.sort((a, b) => new Date(b.raisedAt || b.raised) - new Date(a.raisedAt || a.raised))
  }, [appliedSearch, category, currentUser?.email, currentUser?.id, currentUser?.role, questions, matchesStatusFilter])

  const categoryOptions = useMemo(() => {
    const labels = ownedQuestions
      .map((question) => question.category || 'Others')
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b))

    return ['All', ...labels]
  }, [ownedQuestions])

  const activeCategory = categoryOptions.includes(category) ? category : 'All'
  const visibleQuestions = useMemo(() => {
    if (category === 'All' || !categoryOptions.includes(category)) {
      return ownedQuestions
    }

    return ownedQuestions.filter((question) => (question.category || 'Others') === category)
  }, [category, categoryOptions, ownedQuestions])

  const selectedQuestion = detailsClosed
    ? null
    : visibleQuestions.find((question) => question.id === questionPreviewId) || visibleQuestions[0] || null

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
  }, [selectedQuestion?.answerRating, selectedQuestion?.answerReview, selectedQuestion?.dispute?.rating, selectedQuestion?.dispute?.status, selectedQuestion?.disputeRating, selectedQuestion?.id, selectedQuestion?.status])

  const openQuestion = (questionId) => {
    setDetailsClosed(false)
    setQuestionPreviewId(questionId)
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Track My Questions" showBack backTo={routes.askQuestion} />

      <Section title="Search">
        <Card>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Question ID / Category / Keyword"
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

      <Section title="Filters">
        <Card>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div className="field-label-top">Status</div>
              <ChipGroup options={['All', 'Pending', 'Submitted', 'Queued', 'In Progress', 'Under Review', 'Answered', 'Disputed', 'Closed']} value={statusFilter} onChange={setStatusFilter} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="badge badge-violet">Active filter: {statusFilter}</span>
              </div>
            </div>
            <div>
              <div className="field-label-top">Category</div>
              <ChipGroup options={categoryOptions} value={activeCategory} onChange={setCategory} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="badge badge-violet">Active filter: {activeCategory}</span>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <div className={`section grid grid-cols-1 gap-[22px] ${detailsClosed ? '' : 'lg:grid-cols-[1.3fr_1fr]'}`}>
        <Card style={{ marginTop: 0 }}>
          <div className="section-title">My Questions</div>
          {visibleQuestions.length === 0 && (
            <div className="mb-4 rounded-[14px] border border-[color:var(--border)] bg-white/90 px-4 py-3 text-sm text-[color:var(--muted)]">
              No matching questions found. Clear filters or submit a question from the Ask Question page.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {visibleQuestions.map((question) => {
              const isSelected = selectedQuestion?.id === question.id
              return (
                <Card key={question.id} hover={isSelected} className={isSelected ? 'card-selected' : ''}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{question.id}</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="badge badge-violet">Category: {question.category || 'Others'}</span>
                        <span className="badge badge-green">{question.type}</span>
                        <span className="badge badge-gold">{question.purchaseType}</span>
                      </div>
                      <div className="muted">Raised: {question.raised}</div>
                    </div>
                    <StatusBadge label={question.status} />
                  </div>
                  <div className="btn-row" style={{ marginTop: 14 }}>
                    <button className="btn btn-outline" onClick={() => openQuestion(question.id)}>View</button>
                    {question.status === 'Pending' && (
                      <>
                        <button className="btn btn-outline" onClick={() => navigate(`${routes.askQuestion}?editQuestionId=${question.id}`)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => actions.revokeQuestion(question.id)}>Delete</button>
                      </>
                    )}
                    {question.status === 'Answered' && !question.dispute && (
                      <button className="btn btn-primary" onClick={() => navigate(`${routes.raiseDispute}?questionId=${question.id}`)}>Raise Dispute</button>
                    )}
                    {question.dispute?.status === 'Resolved' && (
                      <button className="btn btn-primary" onClick={() => openQuestion(question.id)}>View</button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </Card>

        {!detailsClosed && (
        <Card style={{ marginTop: 0, alignSelf: 'start' }}>
          <div className="section-title">Question Details</div>
          {selectedQuestion ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div><strong>ID</strong><div className="muted">{selectedQuestion.id}</div></div>
              <div><strong>User</strong><div className="muted">{selectedQuestion.user}</div></div>
              <div><strong>Question</strong><div className="muted">{selectedQuestion.question}</div></div>
              <div>
                <strong>Category</strong>
                <div className="mt-2">
                  <span className="badge badge-violet">Category: {selectedQuestion.category || 'Others'}</span>
                </div>
              </div>
              <div><strong>Status</strong><StatusBadge label={selectedQuestion.status} /></div>
              <div><strong>Answer</strong><div className="muted">{selectedQuestion.answer || 'No answer yet.'}</div></div>
              {selectedQuestion.dispute && (
                <Card style={{ padding: 14, display: 'grid', gap: 10 }}>
                  <div className="section-title" style={{ marginBottom: 2 }}>Dispute</div>
                  <div><strong>Target</strong><div className="muted">{selectedQuestion.dispute.target}</div></div>
                  <div><strong>Reason</strong><div className="muted">{selectedQuestion.dispute.reason}</div></div>
                  <div><strong>Description</strong><div className="muted">{selectedQuestion.dispute.description}</div></div>
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
              <div className="btn-row">
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
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setDetailsClosed(true)
                    setQuestionPreviewId(null)
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="muted">Select a question to inspect the full details.</div>
          )}
        </Card>
        )}
      </div>
    </div>
  )
}
