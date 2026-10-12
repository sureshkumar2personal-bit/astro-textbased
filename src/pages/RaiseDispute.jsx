import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import RaiseDisputeModal from '../components/user/RaiseDisputeModal.jsx'

function isQuestionOwnedByUser(question, user) {
  if (!user?.id && !user?.email) return false
  return (user.id && question.submittedByUserId === user.id) || (user.email && question.submittedByEmail === user.email)
}

export default function RaiseDispute() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { questions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const requestedQuestionId = searchParams.get('questionId')
  const [selectedId, setSelectedId] = useState(requestedQuestionId || null)
  const [popupOpen, setPopupOpen] = useState(Boolean(requestedQuestionId))
  const [submitted, setSubmitted] = useState(false)

  // This page both raises a new dispute and reviews an existing one. Raising a
  // dispute moves the question status off "Answered", so keep records that
  // already carry a dispute in the list too, otherwise the "Dispute raised"
  // notification deep-link and the "View Dispute" branch can never open them.
  const disputeQuestions = useMemo(
    () => questions.filter((question) => (
      (question.status === 'Answered' || Boolean(question.dispute))
      && isQuestionOwnedByUser(question, currentUser)
    )),
    [currentUser, questions],
  )
  const selectedQuestion = disputeQuestions.find((question) => question.id === selectedId) || null

  const closePopup = useCallback(() => {
    setPopupOpen(false)
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    const questionId = searchParams.get('questionId')
    if (questionId && disputeQuestions.some((question) => question.id === questionId)) {
      setSelectedId(questionId)
      setPopupOpen(true)
    }
  }, [disputeQuestions, searchParams])

  function openPopup(question) {
    setSelectedId(question.id)
    setPopupOpen(true)
    setSearchParams({ questionId: question.id }, { replace: true })
  }

  return (
    <div>
      <PageHeader eyebrow="User portal" title="Raise Dispute" showBack backTo={routes.trackQuestions} />

      <section className="section">
        <div className="section-title">Your Questions</div>
        <div className="muted" style={{ marginTop: -8, marginBottom: 16 }}>Select an answered question to raise a new dispute or view an existing dispute.</div>
        {disputeQuestions.length === 0 ? (
          <Card>
            <div className="muted">You have no answered questions to raise a dispute on yet.</div>
            <button type="button" className="btn btn-outline mt-4" onClick={() => navigate(routes.trackQuestions)}>Go to Track My Questions</button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            {disputeQuestions.map((question) => {
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
        <RaiseDisputeModal
          question={selectedQuestion}
          onClose={closePopup}
          onSubmitted={() => setSubmitted(true)}
        />
      )}

      {submitted && <SuccessAlert variant="user" message="Dispute submitted successfully." onDismiss={() => setSubmitted(false)} />}
    </div>
  )
}
