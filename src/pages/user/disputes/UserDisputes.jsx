import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Gavel,
  History,
  Search,
  MessageSquare,
  PhoneCall,
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  X,
  ArrowRight,
  Download,
  Building2,
  UserRound,
  LayoutGrid,
  List,
  Upload,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Card from '../../../components/ui/Card.jsx'
import Section from '../../../components/ui/Section.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import RaiseDisputeModal from '../../../components/user/RaiseDisputeModal.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { formatAnswerDate, getQuestionTypeLabel } from '../../../utils/answer.js'
import {
  DISPUTE_STAGES,
  getDisputeEligibleQuestions,
  getUserDisputes,
} from '../../../utils/questionDashboard.js'
import { mockAstrologers } from '../../../data/notificationData.js'
import '../../../css/user/disputes.css'

// Initial cross-service disputes seed
const INITIAL_SERVICE_DISPUTES = [
  {
    id: 'DSP-APT-8802',
    referenceId: 'APT-2026-0814',
    service: 'Appointments & Calls',
    serviceType: '1-on-1 Audio Call',
    category: 'Career & Growth',
    astrologerName: 'Dr. Rani',
    reason: 'Call dropped abruptly and was not reconnected',
    description:
      'The scheduled 30-minute consultation call disconnected after 3 minutes due to network error and was not resumed. I was debited for the full session fee of ₹499.',
    target: 'AstroConnect Platform',
    raisedAt: '2026-10-24T15:30:00+05:30',
    status: 'Under Review',
    stage: 'Under Review',
    response:
      'Platform support team is currently auditing the call connection logs with our telecom provider. A credit adjustment is being reviewed.',
    resolution: null,
    resolvedAt: null,
    attachment: 'Call_History_Log.png',
    attachmentSize: '1.4 MB',
    transactionId: 'TXN-APT-8802',
  },
  {
    id: 'DSP-POJ-1049',
    referenceId: 'POJ-2026-0391',
    service: 'Poojas & Remedies',
    serviceType: 'Mahamrityunjaya Pooja',
    category: 'Health & Protection',
    astrologerName: 'Acharya Shastri',
    reason: 'Prasadam delivery tracking not updated',
    description:
      'The Sankalpa and live pooja were completed 10 days ago, but the consecrated prasadam tracking status has not been updated and the parcel was not received.',
    target: 'AstroConnect Platform',
    raisedAt: '2026-10-18T11:00:00+05:30',
    status: 'Resolved',
    stage: 'Resolved',
    response:
      'Prasadam parcel was re-dispatched via Express Courier. Tracking ID: EXP-IND-99201. Delivered to registered address on 21 Oct.',
    resolution: 'Dispatched express replacement parcel with active tracking. Package confirmed delivered. ₹150 store credit applied.',
    resolvedAt: '2026-10-21T16:00:00+05:30',
    attachment: 'Pooja_Receipt.pdf',
    attachmentSize: '2.1 MB',
    transactionId: 'TXN-POJ-1049',
  },
]

const SERVICE_META = {
  'Text Questions': {
    icon: MessageSquare,
    label: 'Text Question',
    badgeClass: 'badge-sky',
    color: '#0284c7',
  },
  'Appointments & Calls': {
    icon: PhoneCall,
    label: 'Appointment / Call',
    badgeClass: 'badge-purple',
    color: '#7c3aed',
  },
  'Poojas & Remedies': {
    icon: Flame,
    label: 'Pooja & Remedy',
    badgeClass: 'badge-amber',
    color: '#d97706',
  },
  Platform: {
    icon: Building2,
    label: 'Platform Service',
    badgeClass: 'badge-indigo',
    color: '#4f46e5',
  },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// -----------------------------------------------------------------------------
// Extended Row Panel (Inline Expandable Dossier & Timeline)
// Replaces popup modal with an inline extended view right within the row!
// -----------------------------------------------------------------------------
function DisputeDossierExpanded({ disputeItem, onCollapse, onNavigateQuestion, onCancelDispute }) {
  const { isQuestion, question, service, serviceType, referenceId, astrologerName } = disputeItem
  const dispute = disputeItem.dispute || disputeItem

  const sMeta = SERVICE_META[service] || SERVICE_META['Text Questions']
  const ServiceIcon = sMeta.icon
  const statusLabel = disputeItem.stage || disputeItem.status || 'Open'
  const isReviewed = !['Open', 'Pending'].includes(statusLabel)
  const isResolved = statusLabel === 'Resolved'
  const isPlatform = String(dispute.target || '').toLowerCase().includes('platform')

  return (
    <div className="disputes-expanded-content">
      {/* Top Header of Expanded Row */}
      <div className="disputes-row-expanded-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: sMeta.color, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ServiceIcon size={15} /> {service}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>·</span>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ textTransform: 'uppercase', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em' }}>Txn ID:</span>
            <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: 12.5 }}>{disputeItem.transactionId || referenceId}</strong>
          </span>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="user-dispute-details-layout">
        {/* Left Column: Dossier Card */}
        <div className="user-dispute-dossier-card">
          {/* Service Consulted Context */}
          <div className="user-dispute-service-context">
            <span className="context-label">Consultation Dossier</span>
            {isQuestion && question ? (
              <>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Original Question:</strong>
                  <p style={{ margin: '4px 0 0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    “{question.question || '—'}”
                  </p>
                </div>
                {question.answer && (
                  <div style={{ fontSize: 13, lineHeight: 1.55, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Astrologer’s Answer:</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                      {question.answer}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13 }}>
                <div><strong>Service:</strong> {serviceType} with {astrologerName}</div>
                <div style={{ color: 'var(--muted)', marginTop: 2 }}>Reference ID: {referenceId} · Category: {disputeItem.category}</div>
              </div>
            )}
          </div>

          {/* Dispute Reason & Statement */}
          <div className="user-dispute-statement-box">
            <h3><Gavel size={16} /> Dispute Reason & Statement</h3>
            <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--primary-bg)', fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
              “{dispute.reason || '—'}”
            </div>
            {dispute.description && (
              <p>{dispute.description}</p>
            )}
          </div>

          {/* Evidence */}
          <div className="user-dispute-evidence-box">
            <h3><FileText size={16} /> Attached Evidence</h3>
            {dispute.attachment ? (
              <div className="user-dispute-evidence-file">
                <FileText size={18} />
                <div>
                  <strong style={{ display: 'block', fontSize: 12 }}>{dispute.attachment}</strong>
                  <small style={{ color: 'var(--muted)', fontSize: 10.5 }}>{dispute.attachmentSize || 'Document file'}</small>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Download attachment"
                  style={{ marginLeft: 8, width: 28, height: 28 }}
                  onClick={() => alert(`Downloading evidence: ${dispute.attachment}`)}
                >
                  <Download size={14} />
                </button>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>No evidence files attached to this dispute.</span>
            )}
          </div>
        </div>

        {/* Right Column: Status Timeline Card */}
        <div className="user-dispute-timeline-card">
          <h3 className="user-dispute-timeline-title">
            <Clock size={17} /> Status Timeline
          </h3>

          <div className="user-dispute-timeline-track">
            {/* Step 1: Raised */}
            <div className="user-dispute-timeline-step is-complete">
              <span className="user-dispute-timeline-dot" />
              <div>
                <strong>Dispute Raised</strong>
                <p>Your dispute was formally submitted and recorded on the platform.</p>
              </div>
              <time>{formatDate(dispute.raisedAt || disputeItem.raisedAt)}</time>
            </div>

            {/* Step 2: Under Review */}
            <div className={`user-dispute-timeline-step ${isReviewed ? 'is-complete' : 'is-current'}`}>
              <span className="user-dispute-timeline-dot" />
              <div>
                <strong>Under Review</strong>
                <p>{isReviewed ? 'Support team and astrologer reviewed the case logs.' : 'Support team is reviewing the consultation and logs.'}</p>
              </div>
              <time>{isReviewed ? 'Review Recorded' : 'In Progress'}</time>
            </div>

            {/* Step 3: Response */}
            <div className={`user-dispute-timeline-step ${dispute.response ? 'is-complete' : isReviewed ? 'is-current' : ''}`}>
              <span className="user-dispute-timeline-dot" />
              <div>
                <strong>Astrologer / Platform Response</strong>
                <p>{dispute.response ? 'Official response posted to the case dossier.' : 'Awaiting official response from the party.'}</p>
              </div>
              <time>{dispute.response ? 'Response Logged' : 'Pending'}</time>
            </div>

            {/* Step 4: Resolution */}
            <div className={`user-dispute-timeline-step ${isResolved ? 'is-complete' : ''}`}>
              <span className="user-dispute-timeline-dot" />
              <div>
                <strong>Final Resolution & Settlement</strong>
                <p>{isResolved ? 'Dispute settled and appropriate adjustments finalized.' : 'Pending final outcome.'}</p>
              </div>
              <time>{isResolved ? formatDate(dispute.resolvedAt) : 'Pending'}</time>
            </div>
          </div>

          {/* Response Block */}
          <div className="user-dispute-response-box">
            <strong>{dispute.target === 'AstroConnect Platform' ? 'Platform Response' : 'Astrologer Response'}</strong>
            <p>
              {dispute.response ||
                (dispute.target === 'AstroConnect Platform'
                  ? 'The platform support team is reviewing your dispute. You will receive an in-app and email notification as soon as an update is recorded.'
                  : 'Waiting for the astrologer to provide a response or clarification on this consultation.')}
            </p>
          </div>

          {/* Resolution Block if Settled */}
          {isResolved && (
            <div className="user-dispute-resolution-box">
              <strong>Resolution Finalized</strong>
              <p>{dispute.resolution || 'Dispute was marked resolved.'}</p>
              {dispute.resolvedAt && (
                <small style={{ color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  Settled on: {formatDate(dispute.resolvedAt)}
                </small>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Extended Footer */}
      {(Boolean(isQuestion && question) || (statusLabel === 'Open' && Boolean(onCancelDispute))) && (
        <div className="disputes-row-expanded-footer">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isQuestion && question && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => onNavigateQuestion(question.id)}
              >
                View in Question Tracker <ArrowRight size={14} />
              </button>
            )}
            {statusLabel === 'Open' && onCancelDispute && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: '#dc2626' }}
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this dispute?')) {
                    onCancelDispute(disputeItem.id || referenceId)
                  }
                }}
              >
                <RotateCcw size={14} /> Cancel Dispute
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Interactive Raise Dispute Modal (CTA from Header)
// -----------------------------------------------------------------------------
function UserRaiseDisputeModal({ isOpen, onClose, eligibleQuestions, onSubmitDispute }) {
  const [complaintType, setComplaintType] = useState('astrologer')
  const [selectedService, setSelectedService] = useState('Text Questions')
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [category, setCategory] = useState('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Attachment must be smaller than 5 MB.')
        return
      }
      setAttachment({ name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB` })
      setError('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (complaintType === 'astrologer' && !selectedRecordId) {
      setError('Please select an eligible consultation record.')
      return
    }
    if (!reason.trim()) {
      setError('Please provide a dispute reason/title.')
      return
    }
    if (!description.trim()) {
      setError('Please describe your issue in detail.')
      return
    }

    const payload = {
      target: complaintType === 'platform' ? 'AstroConnect Platform' : 'Astrologer',
      service: selectedService,
      referenceId: selectedRecordId || `REF-${Date.now().toString().slice(-6)}`,
      category: category || 'General',
      reason: reason.trim(),
      description: description.trim(),
      attachment: attachment?.name || null,
      attachmentSize: attachment?.size || null,
      raisedAt: new Date().toISOString(),
      status: 'Open',
      stage: 'Open',
    }

    onSubmitDispute(payload)
    onClose()
  }

  return createPortal(
    <div className="user-dispute-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="user-dispute-modal-card"
        style={{ width: 'min(620px, 100%)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="raise-dispute-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="user-dispute-modal-header">
          <div>
            <h2 id="raise-dispute-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Raise New Dispute
            </h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close modal" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', fontSize: 12.5, fontWeight: 700 }}>
              {error}
            </div>
          )}

          {/* Type Radios */}
          <div className="raise-dispute-type-options">
            <button
              type="button"
              className={`raise-dispute-type-card ${complaintType === 'astrologer' ? 'is-selected' : ''}`}
              onClick={() => {
                setComplaintType('astrologer')
                setError('')
              }}
            >
              <div className="raise-dispute-type-icon">
                <UserRound size={18} />
              </div>
              <div className="raise-dispute-type-copy">
                <strong>Against Astrologer</strong>
              </div>
            </button>

            <button
              type="button"
              className={`raise-dispute-type-card ${complaintType === 'platform' ? 'is-selected' : ''}`}
              onClick={() => {
                setComplaintType('platform')
                setError('')
              }}
            >
              <div className="raise-dispute-type-icon">
                <Building2 size={18} />
              </div>
              <div className="raise-dispute-type-copy">
                <strong>Against Platform</strong>
              </div>
            </button>
          </div>

          {/* Service Selector */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
            <span>Related Service <b style={{ color: '#dc2626' }}>*</b></span>
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value)
                setSelectedRecordId('')
              }}
              className="text-input"
              style={{ height: 40, borderRadius: 9 }}
            >
              <option value="Text Questions">Text Questions</option>
              <option value="Appointments & Calls">Appointments & Calls</option>
              <option value="Poojas & Remedies">Poojas & Remedies</option>
              {complaintType === 'platform' && <option value="Platform">Platform & Wallet</option>}
            </select>
          </label>

          {/* Record Selector if Against Astrologer */}
          {complaintType === 'astrologer' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
              <span>Select Consultation / Question <b style={{ color: '#dc2626' }}>*</b></span>
              <select
                value={selectedRecordId}
                onChange={(e) => setSelectedRecordId(e.target.value)}
                className="text-input"
                style={{ height: 40, borderRadius: 9 }}
              >
                <option value="">Choose an eligible consultation</option>
                {eligibleQuestions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.id} · {q.category || 'General'} ({getQuestionTypeLabel(q)})
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Dispute Category */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
            <span>Dispute Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-input"
              style={{ height: 40, borderRadius: 9 }}
            >
              <option value="">Select category</option>
              <option value="Consultation Quality">Consultation Quality / Generic Answer</option>
              <option value="Technical & Call Dropout">Technical Issue / Call Disconnection</option>
              <option value="Payment / Billing">Payment / Billing Discrepancy</option>
              <option value="Delivery / Prasadam">Delivery / Prasadam Delay</option>
              <option value="Astrologer Conduct">Astrologer Conduct</option>
              <option value="Other">Other Resolution Request</option>
            </select>
          </label>

          {/* Reason Title */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
            <span>Dispute Reason / Headline <b style={{ color: '#dc2626' }}>*</b></span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Call dropped after 3 mins / Answer too generic"
              className="text-input"
              style={{ height: 40, borderRadius: 9 }}
            />
          </label>

          {/* Detailed Statement */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
            <span>Detailed Statement <b style={{ color: '#dc2626' }}>*</b></span>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what occurred, your expectations, and the requested remedy..."
              className="text-input"
              style={{ padding: '10px 12px', borderRadius: 9, minHeight: 90, resize: 'vertical' }}
            />
          </label>

          {/* Evidence Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Attach Evidence (Optional)</span>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '16px',
                border: '1px dashed var(--border)',
                borderRadius: 10,
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.02)',
                fontSize: 12.5,
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              <Upload size={16} />
              {attachment ? <span>{attachment.name} ({attachment.size})</span> : <span>Upload screenshot or document (JPG, PNG, PDF up to 5 MB)</span>}
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Dispute
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

// -----------------------------------------------------------------------------
// Main UserDisputes Dashboard Component
// -----------------------------------------------------------------------------
export default function UserDisputes() {
  const { questions, actions } = useAppData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const routes = getRoleRoutes(currentUser?.role)

  // Local state
  const [serviceDisputes, setServiceDisputes] = useState(INITIAL_SERVICE_DISPUTES)
  const [disputeFilter, setDisputeFilter] = useState('all') // 'all' | 'Open' | 'Under Review' | 'Resolved'
  const [serviceFilter, setServiceFilter] = useState('All') // 'All' | 'Text Questions' | 'Appointments & Calls' | 'Poojas & Remedies'
  const [targetDropdown, setTargetDropdown] = useState('all')
  const [search, setSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef(null)
  const searchContainerRef = useRef(null)

  useEffect(() => {
    if (!isSearchOpen) return
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        if (!search.trim()) {
          setIsSearchOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSearchOpen, search])

  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'

  // Expandable row state (NO POPUP - extends row inline!)
  const [expandedDisputeId, setExpandedDisputeId] = useState(null)

  // Raise dispute modals
  const [raiseDisputeQuestionId, setRaiseDisputeQuestionId] = useState(null)
  const [raiseModalOpen, setRaiseModalOpen] = useState(false)
  const [disputeSuccessMessage, setDisputeSuccessMessage] = useState('')

  const toggleExpand = (id) => {
    setExpandedDisputeId((prev) => (prev === id ? null : id))
  }

  // Map question disputes from AppDataContext
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
        stage: item.stage || d?.status || 'Open',
        status: item.stage || d?.status || 'Open',
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
        attachmentSize: d.attachment ? '1.2 MB' : null,
        transactionId: q.transactionId || `TXN-${String(q.id).replace(/^QTN-/, '')}`,
      }
    })
  }, [questions, currentUser])

  // All combined disputes
  const allDisputes = useMemo(() => {
    return [...questionDisputes, ...serviceDisputes].sort((a, b) => {
      const timeA = a.raisedAt ? new Date(a.raisedAt).getTime() : 0
      const timeB = b.raisedAt ? new Date(b.raisedAt).getTime() : 0
      return timeB - timeA
    })
  }, [questionDisputes, serviceDisputes])

  // Dispute counts for stat summary cards
  const totalCount = allDisputes.length
  const openCount = allDisputes.filter((d) => (d.stage || d.status) === 'Open').length
  const underReviewCount = allDisputes.filter((d) => ['Under Review', 'In Review'].includes(d.stage || d.status)).length
  const resolvedCount = allDisputes.filter((d) => (d.stage || d.status) === 'Resolved').length

  // Counts by service category
  const serviceCounts = useMemo(() => ({
    All: allDisputes.length,
    'Text Questions': allDisputes.filter((d) => d.service === 'Text Questions').length,
    'Appointments & Calls': allDisputes.filter((d) => d.service === 'Appointments & Calls').length,
    'Poojas & Remedies': allDisputes.filter((d) => d.service === 'Poojas & Remedies').length,
  }), [allDisputes])

  // Filtered disputes
  const visibleDisputes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allDisputes.filter((d) => {
      const currentStage = d.stage || d.status || 'Open'

      // Filter by Top Stat Card (disputeFilter)
      if (disputeFilter !== 'all') {
        if (disputeFilter === 'Open' && currentStage !== 'Open') return false
        if (disputeFilter === 'Under Review' && !['Under Review', 'In Review'].includes(currentStage)) return false
        if (disputeFilter === 'Resolved' && currentStage !== 'Resolved') return false
      }

      // Filter by Service Tab
      if (serviceFilter !== 'All' && d.service !== serviceFilter) return false

      // Filter by Target Dropdown
      if (targetDropdown !== 'all') {
        const isPlatform = String(d.target || '').toLowerCase().includes('platform')
        if (targetDropdown === 'platform' && !isPlatform) return false
        if (targetDropdown === 'astrologer' && isPlatform) return false
      }

      // Filter by Search Query
      if (q) {
        const idMatch = (d.id || '').toLowerCase().includes(q)
        const refMatch = (d.referenceId || '').toLowerCase().includes(q)
        const reasonMatch = (d.reason || '').toLowerCase().includes(q)
        const providerMatch = (d.astrologerName || '').toLowerCase().includes(q)
        const categoryMatch = (d.category || '').toLowerCase().includes(q)
        const descMatch = (d.description || '').toLowerCase().includes(q)
        const serviceMatch = (d.serviceType || d.service || '').toLowerCase().includes(q)
        if (!idMatch && !refMatch && !reasonMatch && !providerMatch && !categoryMatch && !descMatch && !serviceMatch) {
          return false
        }
      }

      return true
    })
  }, [allDisputes, disputeFilter, serviceFilter, targetDropdown, search])

  // Eligible questions to dispute
  const eligibleQuestions = useMemo(() => getDisputeEligibleQuestions(questions, currentUser), [questions, currentUser])
  const raiseDisputeQuestion = useMemo(
    () => questions.find((q) => q.id === raiseDisputeQuestionId) || null,
    [questions, raiseDisputeQuestionId],
  )

  // Handlers
  const handleRaiseCustomDispute = (payload) => {
    if (payload.service === 'Text Questions' && payload.referenceId.startsWith('QTN-')) {
      actions.raiseDispute(payload.referenceId, {
        target: payload.target,
        reason: payload.reason,
        description: payload.description,
        attachment: payload.attachment,
      })
    } else {
      const newDispute = {
        id: `DSP-${Date.now().toString().slice(-6)}`,
        referenceId: payload.referenceId,
        service: payload.service,
        serviceType: payload.service,
        category: payload.category,
        astrologerName: payload.target === 'AstroConnect Platform' ? 'AstroConnect Support' : 'Dr. Rani',
        reason: payload.reason,
        description: payload.description,
        target: payload.target,
        raisedAt: payload.raisedAt,
        status: 'Open',
        stage: 'Open',
        response: '',
        resolution: null,
        resolvedAt: null,
        attachment: payload.attachment,
        attachmentSize: payload.attachmentSize,
        transactionId: `TXN-${Date.now().toString().slice(-6)}`,
      }
      setServiceDisputes((prev) => [newDispute, ...prev])
    }
    setDisputeSuccessMessage('Your dispute was recorded successfully and submitted for review.')
  }

  const handleCancelDispute = (disputeId) => {
    setServiceDisputes((prev) => prev.filter((d) => d.id !== disputeId && d.referenceId !== disputeId))
    if (expandedDisputeId === disputeId) {
      setExpandedDisputeId(null)
    }
    setDisputeSuccessMessage('Dispute was cancelled.')
  }

  return (
    <div className="user-disputes-page">
      {/* Page Header */}
      <PageHeader
        eyebrow="User portal"
        title="Dispute Management"
        actions={
          <button
            type="button"
            className="btn btn-primary raise-complaint-trigger"
            onClick={() => setRaiseModalOpen(true)}
          >
            + Raise Dispute
          </button>
        }
      />

      {/* Success Banner */}
      {disputeSuccessMessage && (
        <SuccessAlert
          variant="user"
          message={disputeSuccessMessage}
          onDismiss={() => setDisputeSuccessMessage('')}
        />
      )}

      {/* --------------------------------------------------------------------
          Box 1: Dispute History (Clickable Stat Cards Grid)
          -------------------------------------------------------------------- */}
      <Card className="section dispute-summary-card">
        <div className="section-title">
          <History size={18} /> Dispute History
        </div>
        <div className="dispute-summary-grid">
          {[
            ['all', totalCount, 'Total Disputes', 'tone-violet'],
            ['Open', openCount, 'Open Disputes', 'tone-red'],
            ['Under Review', underReviewCount, 'Under Review', 'tone-amber'],
            ['Resolved', resolvedCount, 'Resolved', 'tone-green'],
          ].map(([filterKey, count, label, tone]) => {
            const isActive = disputeFilter === filterKey
            return (
              <button
                key={filterKey}
                type="button"
                className={`stat-card-clickable ${isActive ? 'is-active' : ''}`}
                onClick={() => setDisputeFilter(filterKey)}
                aria-pressed={isActive}
              >
                <div className={`stat-icon ${tone}`}>
                  {filterKey === 'Resolved' ? (
                    <CheckCircle2 size={20} />
                  ) : filterKey === 'Open' ? (
                    <AlertCircle size={20} />
                  ) : filterKey === 'Under Review' ? (
                    <Clock size={20} />
                  ) : (
                    <History size={20} />
                  )}
                </div>
                <div className="stat-card-body">
                  <div className="stat-value">{count}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* --------------------------------------------------------------------
          Box 2: Workspace & Complaints Section
          -------------------------------------------------------------------- */}
      <Card className="section disputes-section">
        {/* Section Header */}
        <div className="disputes-section-header">
          <h2 className="disputes-section-title">
            {disputeFilter === 'all'
              ? 'All Disputes'
              : disputeFilter === 'Open'
              ? 'Open Disputes'
              : disputeFilter === 'Under Review'
              ? 'Under Review Disputes'
              : 'Resolved Disputes'}{' '}
            ({visibleDisputes.length})
          </h2>

          {/* View Mode Toggle */}
          <div className="disputes-view-toggle" role="group" aria-label="Toggle view mode">
            <button
              type="button"
              className={viewMode === 'table' ? 'is-active' : ''}
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              title="Table view"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              className={viewMode === 'cards' ? 'is-active' : ''}
              onClick={() => setViewMode('cards')}
              aria-label="Cards view"
              title="Cards view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="disputes-toolbar">
          {/* Service Dropdown (Left side) */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="disputes-filter-select"
            aria-label="Filter by service"
          >
            <option value="All">All Services ({serviceCounts.All})</option>
            <option value="Text Questions">Text Questions ({serviceCounts['Text Questions'] || 0})</option>
            <option value="Appointments & Calls">Appointments & Calls ({serviceCounts['Appointments & Calls'] || 0})</option>
            <option value="Poojas & Remedies">Poojas & Remedies ({serviceCounts['Poojas & Remedies'] || 0})</option>
          </select>

          {/* Controls: Filter Select Dropdowns & Search Bar (Right side) */}
          <div className="disputes-controls">
            {/* Target Dropdown */}
            <select
              value={targetDropdown}
              onChange={(e) => setTargetDropdown(e.target.value)}
              className="disputes-filter-select"
              aria-label="Filter by target"
            >
              <option value="all">All Targets</option>
              <option value="astrologer">Astrologer</option>
              <option value="platform">Platform</option>
            </select>

            {/* Expandable Search Bar (same like TrackQuestions) */}
            <div ref={searchContainerRef} className="search-filter-row__group" style={{ margin: 0, gap: 0, display: 'flex', alignItems: 'center' }}>
              <div
                className="search-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isSearchOpen ? 6 : 0,
                  width: isSearchOpen ? 280 : 40,
                  height: 40,
                  transition: 'width 360ms cubic-bezier(0.16, 1, 0.3, 1), gap 360ms ease',
                  overflow: 'hidden',
                  flexShrink: 0,
                  margin: 0,
                  position: 'relative',
                  justifyContent: 'flex-end',
                }}
              >
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Dispute ID, Astrologer, Reason..."
                  className="text-input search-bar__input"
                  style={{
                    width: isSearchOpen ? '100%' : 0,
                    minWidth: 0,
                    height: 40,
                    opacity: isSearchOpen ? 1 : 0,
                    padding: isSearchOpen ? (search ? '0 32px 0 12px' : '0 12px') : 0,
                    borderWidth: isSearchOpen ? 1 : 0,
                    pointerEvents: isSearchOpen ? 'auto' : 'none',
                    transition: 'width 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease, padding 360ms ease, border-width 360ms ease',
                    margin: 0,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsSearchOpen(false)
                      setSearch('')
                    }
                  }}
                  aria-label="Search disputes"
                />
                {isSearchOpen && search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSearch('')
                      searchInputRef.current?.focus()
                    }}
                    style={{
                      position: 'absolute',
                      right: 44,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 4,
                      zIndex: 2,
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={isSearchOpen ? 'Search' : 'Open search'}
                  style={{
                    flex: '0 0 40px',
                    width: 40,
                    height: 40,
                    cursor: 'pointer',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSearchOpen ? 'var(--primary-bg)' : undefined,
                    color: isSearchOpen ? 'var(--primary)' : undefined,
                    transition: 'background 240ms ease, color 240ms ease',
                  }}
                  onClick={() => {
                    if (!isSearchOpen) {
                      setIsSearchOpen(true)
                      setTimeout(() => searchInputRef.current?.focus(), 80)
                    } else {
                      if (!search.trim()) {
                        setIsSearchOpen(false)
                      }
                    }
                  }}
                >
                  <Search size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Content: Table View (with INLINE EXTENDED ROW) vs Cards View
            ------------------------------------------------------------------ */}
        {visibleDisputes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)', fontSize: 13.5 }}>
            No disputes found matching your current filter and search criteria.
          </div>
        ) : viewMode === 'table' ? (
          <div className="disputes-table-wrap">
            <div className="disputes-table" role="table" aria-label="Disputes List">
              <div className="disputes-table-head" role="row">
                <span role="columnheader">S.No</span>
                <span role="columnheader">Dispute ID</span>
                <span role="columnheader">Against</span>
                <span role="columnheader">Related Service</span>
                <span role="columnheader">Provider</span>
                <span role="columnheader">Category</span>
                <span role="columnheader">Date Raised</span>
                <span role="columnheader">Status</span>
                <span role="columnheader" style={{ textAlign: 'right' }}>Action</span>
              </div>
              {visibleDisputes.map((dispute, index) => {
                const disputeId = dispute.id || dispute.referenceId
                const isExpanded = expandedDisputeId === disputeId
                const sMeta = SERVICE_META[dispute.service] || SERVICE_META['Text Questions']
                const SIcon = sMeta.icon
                const isPlatform = String(dispute.target || '').toLowerCase().includes('platform')
                const statusLabel = dispute.stage || dispute.status || 'Open'
                const statusSlug = String(statusLabel).toLowerCase().replace(/[^a-z0-9]+/g, '-')
                const serviceSlug = String(dispute.service || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
                const themeColor = sMeta.color || '#7c3aed'

                return (
                  <div key={disputeId} style={{ display: 'contents' }}>
                    {/* Primary Table Row */}
                    <div
                      className={`disputes-table-row ${isExpanded ? 'is-expanded' : ''} disputes-row--${statusSlug} disputes-row--service-${serviceSlug}`}
                      role="row"
                      style={{ cursor: 'pointer', '--dispute-theme-color': themeColor }}
                      onClick={() => toggleExpand(disputeId)}
                    >
                      <span role="cell" className="dispute-serial">{index + 1}</span>
                      <span role="cell" className="dispute-id-cell">{disputeId}</span>
                      <span role="cell">
                        <span className={`dispute-against-badge dispute-against-${isPlatform ? 'platform' : 'astrologer'}`}>
                          {isPlatform ? 'Platform' : 'Astrologer'}
                        </span>
                      </span>
                      <span role="cell" className="dispute-service-cell">
                        <SIcon size={14} />
                        <span>{dispute.serviceType || dispute.service}</span>
                      </span>
                      <span role="cell" className="dispute-provider-cell">{dispute.astrologerName || 'Astrologer'}</span>
                      <span role="cell">{dispute.category || 'General'}</span>
                      <span role="cell" className="dispute-date-cell">{formatDate(dispute.raisedAt)}</span>
                      <span role="cell">
                        <StatusBadge label={statusLabel} />
                      </span>
                      <span role="cell" style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`dispute-view-button ${isExpanded ? 'is-active' : ''}`}
                          onClick={() => toggleExpand(disputeId)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? 'Hide Details' : 'View Details'}
                          {isExpanded ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
                        </button>
                      </span>
                    </div>

                    {/* Extended Row Panel (Inline Expandable Drawer) */}
                    {isExpanded && (
                      <div
                        className={`disputes-row-expanded-panel disputes-row-expanded-panel--${statusSlug} disputes-row-expanded-panel--service-${serviceSlug}`}
                        role="region"
                        aria-label={`Details for ${disputeId}`}
                        style={{ '--dispute-theme-color': themeColor }}
                      >
                        <DisputeDossierExpanded
                          disputeItem={dispute}
                          onCollapse={() => setExpandedDisputeId(null)}
                          onNavigateQuestion={(qid) => navigate(`${routes.askQuestion}/my-questions?questionId=${qid}`)}
                          onCancelDispute={handleCancelDispute}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="disputes-card-grid">
            {visibleDisputes.map((item) => {
              const disputeId = item.id || item.referenceId
              const isExpanded = expandedDisputeId === disputeId
              const sMeta = SERVICE_META[item.service] || SERVICE_META['Text Questions']
              const SIcon = sMeta.icon
              const isPlatform = String(item.target || '').toLowerCase().includes('platform')
              const statusLabel = item.stage || item.status || 'Open'

              const statusSlug = String(statusLabel).toLowerCase().replace(/[^a-z0-9]+/g, '-')
              const serviceSlug = String(item.service || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
              const themeColor = sMeta.color || '#7c3aed'

              return (
                <Card
                  key={disputeId}
                  className={`dispute-card-item ${isExpanded ? 'is-expanded' : ''} dispute-card-item--${statusSlug} dispute-card-item--service-${serviceSlug}`}
                  style={{ '--dispute-theme-color': themeColor }}
                >
                  <div className="dispute-card-item-head">
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 9px',
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 800,
                        background: 'var(--primary-bg)',
                        color: sMeta.color,
                      }}
                    >
                      <SIcon size={13} /> {item.service}
                    </span>
                    <StatusBadge label={statusLabel} />
                  </div>

                  <div>
                    <div className="dispute-card-item-title">
                      {disputeId} · {item.astrologerName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {item.serviceType} · {item.category}
                    </div>
                  </div>

                  <div className="dispute-card-item-reason">
                    “{item.reason}”
                  </div>

                  {item.description && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <span>Against: <strong>{isPlatform ? 'Platform' : 'Astrologer'}</strong></span>
                    <span>Date: <strong>{formatDate(item.raisedAt)}</strong></span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                      onClick={() => toggleExpand(disputeId)}
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
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

                  {/* Inline Expanded in Card View */}
                  {isExpanded && (
                    <div className="disputes-card-expanded-panel">
                      <DisputeDossierExpanded
                        disputeItem={item}
                        onCollapse={() => setExpandedDisputeId(null)}
                        onNavigateQuestion={(qid) => navigate(`${routes.askQuestion}/my-questions?questionId=${qid}`)}
                        onCancelDispute={handleCancelDispute}
                      />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </Card>

      {/* --------------------------------------------------------------------
          Box 3: Dispute-Eligible Services (Answered Consultations)
          -------------------------------------------------------------------- */}
      <div id="eligible-disputes-section" className="eligible-services-box">
        <div className="section-title-wrap">
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Dispute-Eligible Services</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              Answered consultations and completed services within the 30-day dispute window
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
            {eligibleQuestions.length} consultation{eligibleQuestions.length === 1 ? '' : 's'} eligible
          </span>
        </div>

        {eligibleQuestions.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--muted)', fontSize: 13 }}>
              No answered consultation is waiting for a dispute right now.
            </div>
          </Card>
        ) : (
          <div className="eligible-services-grid">
            {eligibleQuestions.map((q) => (
              <div key={q.id} className="eligible-service-card">
                <div className="eligible-service-card-top">
                  <strong style={{ fontFamily: 'monospace', fontSize: 13.5 }}>{q.id}</strong>
                  <span className="badge badge-red" style={{ fontSize: 11, fontWeight: 800 }}>Eligible</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  Text Question · {q.category || 'General'} · {getQuestionTypeLabel(q)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Answered: {q.answeredAt ? formatAnswerDate(q.answeredAt) : q.raised || 'Recent'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------
          Modals (ONLY for Raising Disputes, NOT for View Details)
          -------------------------------------------------------------------- */}
      {/* 1. Raise Dispute Modal (triggered from Eligible Services list) */}
      {raiseDisputeQuestion && (
        <RaiseDisputeModal
          question={raiseDisputeQuestion}
          onClose={() => setRaiseDisputeQuestionId(null)}
          onSubmitted={() => {
            setRaiseDisputeQuestionId(null)
            setDisputeSuccessMessage('Your dispute has been recorded successfully and forwarded for review.')
          }}
        />
      )}

      {/* 2. General Raise Dispute Modal (triggered from Header CTA) */}
      <UserRaiseDisputeModal
        isOpen={raiseModalOpen}
        onClose={() => setRaiseModalOpen(false)}
        eligibleQuestions={eligibleQuestions}
        onSubmitDispute={handleRaiseCustomDispute}
      />
    </div>
  )
}
