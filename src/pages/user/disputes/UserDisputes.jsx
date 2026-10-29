import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Gavel,
  X,
  MessageSquare,
  Calendar,
  PhoneCall,
  Flame,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Filter,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import SummaryCard from '../../../components/ui/SummaryCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import RaiseDisputeModal from '../../../components/user/RaiseDisputeModal.jsx'
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
import { mockAstrologers } from '../../../data/notificationData.js'

// Additional mock service disputes to demonstrate cross-service dispute tracking
const SERVICE_DISPUTES_SEED = [
  {
    id: 'DSP-APT-8802',
    referenceId: 'APT-2026-0814',
    service: 'Appointments & Calls',
    serviceType: '1-on-1 Audio Call',
    category: 'Career & Growth',
    astrologerName: 'Dr. Rani',
    reason: 'Call dropped abruptly and was not reconnected',
    description: 'The scheduled 30-minute consultation call disconnected after 3 minutes due to network error and was not resumed. I was debited for the full session fee.',
    target: 'AstroConnect Platform',
    raisedAt: '2026-10-24T15:30:00+05:30',
    status: 'Under Review',
    stage: 'Under Review',
    response: 'Platform support team is currently auditing the call connection logs with our telecom provider. A credit adjustment is being reviewed.',
    resolution: null,
    resolvedAt: null,
    attachment: 'Call_History_Log.png',
  },
  {
    id: 'DSP-POJ-1049',
    referenceId: 'POJ-2026-0391',
    service: 'Poojas & Remedies',
    serviceType: 'Mahamrityunjaya Pooja',
    category: 'Health & Protection',
    astrologerName: 'Acharya Shastri',
    reason: 'Prasadam delivery tracking not updated',
    description: 'The Sankalpa and live pooja were completed 10 days ago, but the consecrated prasadam tracking status has not been updated and the parcel was not received.',
    target: 'AstroConnect Platform',
    raisedAt: '2026-10-18T11:00:00+05:30',
    status: 'Resolved',
    stage: 'Resolved',
    response: 'Prasadam parcel was re-dispatched via Express Courier. Tracking ID: EXP-IND-99201. Delivered to registered address on 21 Oct.',
    resolution: 'Dispatched express replacement parcel with active tracking. Package confirmed delivered.',
    resolvedAt: '2026-10-21T16:00:00+05:30',
    attachment: 'Pooja_Receipt.pdf',
  },
]

const SERVICE_META = {
  'Text Questions': {
    icon: MessageSquare,
    label: 'Text-Based Question',
    badgeClass: 'badge-sky',
    color: 'var(--sky-600)',
    bg: 'var(--sky-bg)',
  },
  'Appointments & Calls': {
    icon: PhoneCall,
    label: 'Appointment / Call',
    badgeClass: 'badge-purple',
    color: 'var(--primary)',
    bg: 'var(--primary-bg)',
  },
  'Poojas & Remedies': {
    icon: Flame,
    label: 'Pooja / Remedy',
    badgeClass: 'badge-amber',
    color: 'var(--amber-600)',
    bg: 'var(--amber-100)',
  },
}

const STAGE_CARD_META = {
  All: { background: 'var(--primary-bg)', color: 'var(--primary)', border: 'rgba(91, 33, 182, 0.20)' },
  Open: { background: 'var(--danger-bg)', color: 'var(--red-600)', border: 'rgba(239, 68, 68, 0.24)' },
  'Under Review': { background: 'var(--amber-100)', color: 'var(--amber-600)', border: 'rgba(245, 158, 11, 0.30)' },
  Resolved: { background: 'var(--success-bg)', color: 'var(--green-600)', border: 'rgba(16, 185, 129, 0.30)' },
  Closed: { background: 'var(--neutral-bg)', color: 'var(--muted)', border: 'rgba(100, 116, 139, 0.24)' },
}

const QUOTE_BOX_STYLE = {
  fontSize: 14.5,
  lineHeight: 1.6,
  color: 'var(--ink)',
  background: 'var(--primary-bg)',
  borderRadius: 'var(--radius-s)',
  padding: 14,
  whiteSpace: 'pre-wrap',
  border: '1px solid rgba(91, 33, 182, 0.12)',
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

function DisputeDetailsModal({ disputeItem, onClose, onNavigateQuestion }) {
  const { isQuestion, question, service, serviceType, referenceId, astrologerName } = disputeItem
  const dispute = disputeItem.dispute || disputeItem

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

  const meta = SERVICE_META[service] || SERVICE_META['Text Questions']
  const ServiceIcon = meta.icon

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
            <div className="muted" style={{ fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: meta.color }}>
                <ServiceIcon size={14} /> {service} · {referenceId}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <StatusBadge label={disputeItem.stage || 'Open'} />
            <button type="button" className="icon-btn" aria-label="Close dispute details" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-card__content user-modal-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isQuestion && question ? (
            <div>
              <div className="field-label-top" style={{ marginBottom: 6 }}>Original Question</div>
              <div style={QUOTE_BOX_STYLE}>{question.question || '—'}</div>
              {question.answer && (
                <div style={{ marginTop: 12 }}>
                  <div className="field-label-top" style={{ marginBottom: 6 }}>Astrologer's Answer</div>
                  <div style={QUOTE_BOX_STYLE}>{question.answer}</div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="field-label-top" style={{ marginBottom: 6 }}>Service Consulted</div>
              <div style={QUOTE_BOX_STYLE}>
                <strong>{serviceType}</strong> with <strong>{astrologerName}</strong>
                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>Reference: {referenceId} · Category: {disputeItem.category}</div>
              </div>
            </div>
          )}

          <Card style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div className="section-title" style={{ marginBottom: 2 }}>Dispute Record</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><strong>Service Name</strong><div className="muted">{service} ({serviceType})</div></div>
              <div><strong>Astrologer</strong><div className="muted">{astrologerName}</div></div>
              <div><strong>Raised To</strong><div className="muted">{dispute.target || 'AstroConnect Platform'}</div></div>
              <div><strong>Raised On</strong><div className="muted">{dispute.raisedAt ? formatAnswerDate(dispute.raisedAt) : '—'}</div></div>
            </div>

            <div><strong>Dispute Reason</strong><div className="muted">{dispute.reason || '—'}</div></div>
            {dispute.description && <div><strong>Description</strong><div className="muted">{dispute.description}</div></div>}
            {dispute.attachment && <div><strong>Attachment</strong><div className="muted">{dispute.attachment}</div></div>}
            
            <div style={{ paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              <strong>{dispute.target === 'AstroConnect Platform' ? 'Platform Response' : 'Astrologer Response'}</strong>
              <div className="muted" style={{ marginTop: 4 }}>
                {dispute.response || (dispute.target === 'AstroConnect Platform' ? 'Waiting for platform review.' : 'Waiting for an astrologer response.')}
              </div>
            </div>

            {dispute.resolution && (
              <div style={{ paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                <strong>Resolution</strong>
                <div className="muted" style={{ marginTop: 4 }}>{dispute.resolution}</div>
                {dispute.resolvedAt && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Settled on: {formatAnswerDate(dispute.resolvedAt)}</div>}
              </div>
            )}
          </Card>
        </div>

        <div className="modal-card__footer user-modal-card__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isQuestion && question ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                onClose()
                onNavigateQuestion(question.id)
              }}
            >
              View In Question Tracker <ArrowRight size={14} />
            </button>
          ) : <div />}
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function UserDisputes() {
  const { questions } = useAppData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(currentUser?.role)

  const [serviceTab, setServiceTab] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [raiseDisputeQuestionId, setRaiseDisputeQuestionId] = useState(null)
  const [disputeSubmitted, setDisputeSubmitted] = useState(false)

  // Map user's question disputes into normalized service dispute records
  const questionDisputes = useMemo(() => {
    return getUserDisputes(questions, currentUser).map((item) => {
      const q = item.question
      const d = item.dispute
      const astrologer = mockAstrologers.find((a) => a.id === q.astrologerId)
      return {
        id: `DSP-${q.id}`,
        referenceId: q.id,
        isQuestion: true,
        question: q,
        dispute: d,
        stage: item.stage,
        service: 'Text Questions',
        serviceType: getQuestionTypeLabel(q) || 'Text-Based Question',
        category: q.category || 'General',
        astrologerName: astrologer?.name || q.user || 'Dr. Rani',
        reason: d.reason,
        description: d.description,
        target: d.target || 'Astrologer',
        raisedAt: d.raisedAt || q.raisedAt,
        response: d.response,
        resolution: d.resolution,
        resolvedAt: d.resolvedAt,
        attachment: d.attachment,
      }
    })
  }, [questions, currentUser])

  // Combine question disputes + other service disputes
  const allDisputes = useMemo(() => {
    const serviceItems = SERVICE_DISPUTES_SEED.map((s) => ({
      ...s,
      dispute: s,
    }))
    return [...questionDisputes, ...serviceItems].sort((a, b) => {
      const timeA = a.raisedAt ? new Date(a.raisedAt).getTime() : 0
      const timeB = b.raisedAt ? new Date(b.raisedAt).getTime() : 0
      return timeB - timeA
    })
  }, [questionDisputes])

  // Counts by service
  const serviceCounts = useMemo(() => {
    const counts = {
      All: allDisputes.length,
      'Text Questions': questionDisputes.length,
      'Appointments & Calls': SERVICE_DISPUTES_SEED.filter((d) => d.service === 'Appointments & Calls').length,
      'Poojas & Remedies': SERVICE_DISPUTES_SEED.filter((d) => d.service === 'Poojas & Remedies').length,
    }
    return counts
  }, [allDisputes, questionDisputes])

  // Filtered by service
  const serviceFiltered = useMemo(() => {
    if (serviceTab === 'All') return allDisputes
    return allDisputes.filter((d) => d.service === serviceTab)
  }, [allDisputes, serviceTab])

  // Counts by stage
  const stageCounts = useMemo(() => {
    const counts = { All: serviceFiltered.length, Open: 0, 'Under Review': 0, Resolved: 0, Closed: 0 }
    serviceFiltered.forEach((d) => {
      if (counts[d.stage] !== undefined) counts[d.stage] += 1
    })
    return counts
  }, [serviceFiltered])

  // Filtered by stage & search
  const visibleDisputes = useMemo(() => {
    return serviceFiltered.filter((d) => {
      if (stageFilter !== 'All' && d.stage !== stageFilter) return false
      if (!search.trim()) return true
      const query = search.toLowerCase()
      return (
        d.referenceId.toLowerCase().includes(query) ||
        d.reason.toLowerCase().includes(query) ||
        d.astrologerName.toLowerCase().includes(query) ||
        d.service.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
      )
    })
  }, [serviceFiltered, stageFilter, search])

  // Eligible questions without dispute
  const eligibleQuestions = useMemo(() => getDisputeEligibleQuestions(questions, currentUser), [questions, currentUser])
  const raiseDisputeQuestion = useMemo(
    () => questions.find((q) => q.id === raiseDisputeQuestionId) || null,
    [questions, raiseDisputeQuestionId],
  )

  const SERVICE_TABS = [
    { key: 'All', label: 'All Services', count: serviceCounts.All },
    { key: 'Text Questions', label: 'Text Questions', count: serviceCounts['Text Questions'], icon: MessageSquare },
    { key: 'Appointments & Calls', label: 'Appointments & Calls', count: serviceCounts['Appointments & Calls'], icon: PhoneCall },
    { key: 'Poojas & Remedies', label: 'Poojas & Remedies', count: serviceCounts['Poojas & Remedies'], icon: Flame },
  ]

  return (
    <div className="user-disputes-page" style={{ paddingBottom: 40 }}>
      {/* Unified Page Header matching user portal */}
      <PageHeader
        eyebrow="User portal"
        title="Disputes"
        style={{ marginBottom: 24 }}
      />

      {/* Service Tabs */}
      <div
        className="service-tabs"
        role="tablist"
        aria-label="Filter disputes by service"
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 4,
          marginBottom: 16,
        }}
      >
        {SERVICE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = serviceTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setServiceTab(tab.key)
                setStageFilter('All')
              }}
              className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
              style={{
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 700,
                padding: '8px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
              }}
            >
              {Icon && <Icon size={15} />}
              {tab.label}
              <span
                style={{
                  background: isActive ? 'rgba(255,255,255,0.24)' : 'var(--neutral-bg)',
                  color: isActive ? '#FFFFFF' : 'var(--muted)',
                  fontSize: 11,
                  padding: '1px 7px',
                  borderRadius: 10,
                  fontWeight: 800,
                }}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Status Summary & Search Toolbar */}
      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {DISPUTE_STAGES.map((stage) => {
              const meta = STAGE_CARD_META[stage]
              const count = stageCounts[stage] || 0
              const isActive = stageFilter === stage
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setStageFilter(isActive && stage !== 'All' ? 'All' : stage)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    border: `1px solid ${isActive ? meta.color : meta.border}`,
                    background: isActive ? meta.color : meta.background,
                    color: isActive ? '#FFFFFF' : meta.color,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 160ms ease',
                  }}
                >
                  <span>{stage}</span>
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: 8,
                      fontSize: 11,
                      background: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.06)',
                      color: isActive ? '#FFFFFF' : 'inherit',
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="search-bar" style={{ width: 280, maxWidth: '100%', margin: 0 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, reason, astrologer..."
              className="text-input search-bar__input"
              style={{ height: 38 }}
            />
            <button type="button" className="icon-btn" aria-label="Search disputes" style={{ height: 38, width: 38 }}>
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* Dispute Cards Grid */}
        {visibleDisputes.length === 0 ? (
          <Card>
            <div className="muted" style={{ textAlign: 'center', padding: '24px 12px' }}>
              No disputes found under <strong>{serviceTab}</strong> with status <strong>{stageFilter}</strong>.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleDisputes.map((item) => {
              const sMeta = SERVICE_META[item.service] || SERVICE_META['Text Questions']
              const SIcon = sMeta.icon
              return (
                <Card key={item.id} className="question-dashboard-row" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 9px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 800,
                        background: sMeta.bg,
                        color: sMeta.color,
                      }}
                    >
                      <SIcon size={13} /> {item.service}
                    </span>
                    <StatusBadge label={item.stage} />
                  </div>

                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {item.referenceId} · {item.astrologerName}
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {item.serviceType} · {item.category}
                    </div>
                  </div>

                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                    “{item.reason}”
                  </div>

                  {item.description && (
                    <div className="muted" style={{ fontSize: 12.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <MetaPair label="Raised To">{item.target}</MetaPair>
                    <MetaPair label="Date">{item.raisedAt ? formatAnswerDate(item.raisedAt) : '—'}</MetaPair>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setSelectedDispute(item)}
                    >
                      View Dispute Details
                    </button>
                    {item.isQuestion && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`${routes.askQuestion}/my-questions?questionId=${item.referenceId}`)}
                      >
                        View Question
                      </button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </Section>

      {/* Eligible Questions to Raise a Dispute */}
      <Section className="!mt-8" title="Dispute-Eligible Services" titleRight={<span className="muted">Answered consultations and questions within dispute window</span>}>
        {eligibleQuestions.length === 0 ? (
          <Card>
            <div className="muted">No answered question is waiting for a dispute right now.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {eligibleQuestions.map((q) => (
              <Card key={q.id} className="question-dashboard-row" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{q.id}</div>
                  <span className="badge badge-red" style={{ fontSize: 11 }}>Eligible</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Text-Based Question · {q.category} · {getQuestionTypeLabel(q)}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Answered: {q.answeredAt ? formatAnswerDate(q.answeredAt) : q.raised || 'Recent'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setRaiseDisputeQuestionId(q.id)}
                  >
                    Raise Dispute
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`${routes.askQuestion}/my-questions?questionId=${q.id}`)}
                  >
                    View Answer
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* Dispute Details Modal */}
      {selectedDispute && (
        <DisputeDetailsModal
          disputeItem={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onNavigateQuestion={(qid) => navigate(`${routes.askQuestion}/my-questions?questionId=${qid}`)}
        />
      )}

      {/* Inline Raise Dispute Modal */}
      {raiseDisputeQuestion && (
        <RaiseDisputeModal
          question={raiseDisputeQuestion}
          onClose={() => setRaiseDisputeQuestionId(null)}
          onSubmitted={() => setDisputeSubmitted(true)}
        />
      )}

      {/* Success Banner */}
      {disputeSubmitted && (
        <SuccessAlert
          variant="user"
          message="Your dispute has been recorded successfully and forwarded for review."
          onDismiss={() => setDisputeSubmitted(false)}
        />
      )}
    </div>
  )
}
