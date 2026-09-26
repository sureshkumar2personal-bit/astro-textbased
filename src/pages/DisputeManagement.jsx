import { useCallback, useEffect, useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import DisputeDetailsModal from '../components/DisputeDetailsModal.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { TempleReturnIcon, TempleScrollIcon } from '../components/TempleIcons.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'
import '../css/astrologer/dispute-management.css'

export default function DisputeManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { questions, questionPreviewId } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [disputeFilter, setDisputeFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(searchParams.get('questionId') || questionPreviewId || null)
  const [detailsOpen, setDetailsOpen] = useState(Boolean(searchParams.get('questionId') || questionPreviewId))
  const [justSubmitted, setJustSubmitted] = useState(false)

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

  const openDetails = useCallback((question) => {
    setSelectedId(question.id)
    setDetailsOpen(true)
    setSearchParams({ questionId: question.id }, { replace: true })
  }, [setSearchParams])

  const closeDetails = useCallback(() => {
    setDetailsOpen(false)
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const handleResponded = useCallback(() => setJustSubmitted(true), [])

  return (
    <div className="dispute-management-page">
      <div className="dispute-hero">
        <PageHeader
          eyebrow="Astrologer workspace"
          title="Dispute Management"
          subtitle="Review & resolve a dispute"
          showBack
          backTo={routes.dashboard}
          backIcon={currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined}
        />
      </div>

      <div className="dispute-section">
        <div className="dispute-section__title"><History size={18} />Dispute History</div>
        <div className="dispute-stats-strip">
          {[
            ['all', totalDisputed, 'Total Raised', 'lavender'],
            ['resolved', resolvedDisputes, 'Resolved', 'green'],
            ['pending', pendingDisputes, 'Pending', 'red'],
          ].map(([filter, count, label, tone]) => (
            <button
              key={filter}
              type="button"
              className={`dispute-stat dispute-stat--${tone}${disputeFilter === filter ? ' is-active' : ''}`}
              onClick={() => setDisputeFilter(filter)}
            >
              <span className={`dispute-stat__icon dispute-stat__icon--${tone}`}><History size={18} /></span>
              <span className="dispute-stat__text">
                <span className="dispute-stat__value">{count}</span>
                <span className="dispute-stat__label">{label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="dispute-section">
        <div className="dispute-section__title">{disputeFilter === 'all' ? 'All Disputes' : disputeFilter === 'resolved' ? 'Resolved Disputes' : 'Pending Disputes'}</div>
        {disputedQuestions.length === 0 ? (
          <div className="muted" style={{ padding: '16px 0' }}>No disputes found.</div>
        ) : (
          <div className="dispute-table">
            <div className="dispute-table__head" aria-hidden="true">
              <span>Dispute ID</span>
              <span>User &amp; Campaign</span>
              <span>Raised On</span>
              <span>Status</span>
              <span className="dispute-table__action-head">Action</span>
            </div>
            {disputedQuestions.map((question) => (
              <button type="button" key={question.id} className="dispute-row" onClick={() => openDetails(question)}>
                <span className="dispute-row__id">
                  <span className="dispute-row__icon" aria-hidden="true"><TempleScrollIcon size={14} /></span>
                  {question.id}
                </span>
                <span className="dispute-row__user">
                  <span className="dispute-row__user-main">{question.user} · {question.category}</span>
                  <span className="dispute-row__user-sub">{question.campaignName}</span>
                </span>
                <span className="dispute-row__date">Raised: {question.raised}</span>
                <span className="dispute-row__status"><StatusBadge label={question.dispute?.status || 'Open'} /></span>
                <span className="dispute-row__action">View Details <span aria-hidden="true">→</span></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {detailsOpen && selectedQuestion?.dispute && (
        <DisputeDetailsModal
          question={selectedQuestion}
          onClose={closeDetails}
          onResponded={handleResponded}
        />
      )}

      {justSubmitted && <SuccessAlert message="Response submitted successfully." onDismiss={() => setJustSubmitted(false)} />}
    </div>
  )
}
