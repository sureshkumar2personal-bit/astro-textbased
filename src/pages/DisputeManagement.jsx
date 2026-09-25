import { useCallback, useEffect, useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import DisputeDetailsModal from '../components/DisputeDetailsModal.jsx'
import { useAppData } from '../state/AppDataContext.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes } from '../utils/roleRoutes.js'
import { TempleReturnIcon } from '../components/TempleIcons.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import TextBasedQuestionsModuleTabs from '../components/TextBasedQuestionsModuleTabs.jsx'
import Card from '../components/ui/Card.jsx'
import SuccessAlert from '../components/ui/SuccessAlert.jsx'

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
    <div>
      <PageHeader eyebrow="Astrologer workspace" title="Dispute Management" showBack backTo={routes.dashboard} backIcon={currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined} />

      <TextBasedQuestionsModuleTabs />

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
