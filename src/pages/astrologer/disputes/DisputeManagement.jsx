import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, CloudUpload, FileText, History, Megaphone, Search, UserRound, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../utils/roleRoutes.js'
import { TempleLampIcon, TempleReturnIcon, TempleScrollIcon, TempleShieldIcon } from '../../../components/TempleIcons.jsx'
import PageHeader from '../../../components/ui/PageHeader.jsx'
import Card from '../../../components/ui/Card.jsx'
import SuccessAlert from '../../../components/ui/SuccessAlert.jsx'
import '../../../css/astrologer/dispute-management.css'

const PLATFORM_COMPLAINT_CATEGORIES = [
  'Wallet Settlement',
  'Appointment System',
  'Technical Issue',
  'Account Issue',
  'Subscription',
  'Services Issue',
  'Other',
]
const MAX_EVIDENCE_SIZE = 5 * 1024 * 1024
const ALLOWED_EVIDENCE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

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

function getTransactionId(question) {
  return question.transactionId || question.orderId || `TXN-${String(question.id || '').replace(/^QTN-/, '')}`
}

export default function DisputeManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { questions, questionPreviewId, appointments = [], consultations = [], appointmentCalls = [], actions } = useAppData()
  const { currentUser } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [disputeFilter, setDisputeFilter] = useState('all')
  const [complaintSearch, setComplaintSearch] = useState('')
  const [complaintStatus, setComplaintStatus] = useState('all')
  const [complaintAgainst, setComplaintAgainst] = useState('all')
  const [platformComplaints, setPlatformComplaints] = useState([])
  const [selectedPlatformComplaint, setSelectedPlatformComplaint] = useState(null)
  const [expandedComplaintId, setExpandedComplaintId] = useState(null)
  const [complaintCategory, setComplaintCategory] = useState('')
  const [customComplaintCategory, setCustomComplaintCategory] = useState('')
  const [complaintType, setComplaintType] = useState('platform')
  const [complaintUserId, setComplaintUserId] = useState('')
  const [complaintDescription, setComplaintDescription] = useState('')
  const [complaintEvidence, setComplaintEvidence] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [formAttempted, setFormAttempted] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedId, setSelectedId] = useState(searchParams.get('questionId') || questionPreviewId || null)
  const [detailsOpen, setDetailsOpen] = useState(Boolean(searchParams.get('questionId') || questionPreviewId))
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState('Open')
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [fullContent, setFullContent] = useState(null)

  const USER_COMPLAINT_CATEGORIES = ['Misconduct / Inappropriate Behavior', 'No Response', 'Rude Behavior', 'Call / Chat Issue', 'Other']
  const userOptions = useMemo(() => Array.from(new Map(questions.map((question) => [question.userId || question.user, { id: question.userId || question.user, label: question.user || question.userId }])).values()), [questions])
  const allDisputedQuestions = useMemo(() => questions.filter((question) => question.dispute), [questions])
  const disputedQuestions = useMemo(() => {
    if (disputeFilter === 'resolved') return allDisputedQuestions.filter((question) => question.dispute?.status === 'Resolved')
    if (disputeFilter === 'pending') return allDisputedQuestions.filter((question) => question.dispute?.status === 'Open')
    if (disputeFilter === 'under-review') return allDisputedQuestions.filter((question) => ['Under Review', 'In Review'].includes(question.dispute?.status))
    return allDisputedQuestions
  }, [allDisputedQuestions, disputeFilter])

  const questionComplaintRows = (items) => items.map((question) => ({
      id: question.id,
      question,
      against: question.dispute?.target === 'AstroConnect Platform' ? 'Platform' : 'User',
      relatedTo: 'Question',
      userName: question.user || '—',
      category: question.category,
      transactionId: getTransactionId(question),
      date: question.raised,
      status: question.dispute?.status || 'Open',
      description: [question.dispute?.reason, question.dispute?.description].filter(Boolean).join('. '),
      evidence: question.dispute?.attachment ? [{ name: question.dispute.attachment }] : [],
      response: question.dispute?.response || '',
    }))

  const allComplaintRows = useMemo(() => [...questionComplaintRows(allDisputedQuestions), ...platformComplaints], [allDisputedQuestions, platformComplaints])
  const complaintRows = useMemo(() => [
    ...questionComplaintRows(disputedQuestions),
    ...platformComplaints.filter((complaint) => disputeFilter === 'all' || (disputeFilter === 'under-review' ? ['under review', 'in review'].includes(complaint.status.toLowerCase()) : complaint.status.toLowerCase() === disputeFilter)),
  ], [disputedQuestions, disputeFilter, platformComplaints])

  const visibleComplaints = useMemo(() => {
    const search = complaintSearch.trim().toLowerCase()
    return complaintRows.filter((complaint) => {
      const statusValue = complaint.status || 'Open'
      const normalizedStatus = statusValue.toLowerCase() === 'in review' ? 'under review' : statusValue.toLowerCase()
      const matchesStatus = complaintStatus === 'all' || normalizedStatus === complaintStatus
      const matchesAgainst = complaintAgainst === 'all' || complaint.against?.toLowerCase() === complaintAgainst
      const matchesSearch = !search || [complaint.id, complaint.category].some((value) => String(value || '').toLowerCase().includes(search))
      return matchesStatus && matchesAgainst && matchesSearch
    })
  }, [complaintAgainst, complaintRows, complaintSearch, complaintStatus])

  const totalDisputed = allComplaintRows.length
  const resolvedDisputes = allComplaintRows.filter((complaint) => complaint.status === 'Resolved').length
  const pendingDisputes = allComplaintRows.filter((complaint) => complaint.status === 'Open').length
  const underReviewDisputes = allComplaintRows.filter((complaint) => ['Under Review', 'In Review'].includes(complaint.status)).length
  const selectedQuestion = questions.find((question) => question.id === selectedId) || null
  const selectedComplaint = selectedPlatformComplaint || allComplaintRows.find((complaint) => complaint.question?.id === selectedQuestion?.id) || null
  const selectedHasReview = Boolean(selectedComplaint && (selectedComplaint.status !== 'Open' || selectedComplaint.question?.history?.some((entry) => /review|viewed|response|awaiting/i.test(entry))))
  const selectedHasResponse = Boolean(selectedComplaint?.response)
  const hasUnsavedComplaintForm = Boolean(complaintType !== 'platform' || complaintCategory || customComplaintCategory || complaintUserId || complaintDescription || complaintEvidence.length)
  const closeComplaintForm = useCallback(({ reset = false, confirmUnsaved = true } = {}) => {
    if (confirmUnsaved && hasUnsavedComplaintForm && !window.confirm('Discard your unsaved complaint details?')) return
    setFormOpen(false)
    if (reset) {
      setComplaintCategory('')
      setCustomComplaintCategory('')
      setComplaintType('platform')
      setComplaintUserId('')
      setComplaintDescription('')
      setComplaintEvidence([])
      setFormAttempted(false)
      setFormError('')
    }
  }, [hasUnsavedComplaintForm])

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

  useEffect(() => {
    if (!formOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeComplaintForm()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closeComplaintForm, formOpen])

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
    setSuccessMessage('Response submitted successfully.')
    setJustSubmitted(true)
  }

  const selectComplaint = (complaint) => {
    setExpandedComplaintId((currentId) => currentId === complaint.id ? null : complaint.id)
  }

  const submitPlatformComplaint = (event) => {
    event.preventDefault()
    setFormAttempted(true)
    const requiredUserFields = complaintType === 'user' && !complaintUserId
    const submittedCategory = complaintCategory === 'Other' ? customComplaintCategory.trim() : complaintCategory
    if (!submittedCategory || !complaintDescription.trim() || requiredUserFields) {
      setFormError(complaintType === 'user' ? 'Select a user, category, and description before submitting.' : 'Select a complaint category and add a description before submitting.')
      return
    }
    setFormError('')
    const complaint = {
      id: `${complaintType === 'user' ? 'USR' : 'CMP'}-${Date.now().toString().slice(-6)}`,
      against: complaintType === 'user' ? 'User' : 'Platform',
      relatedTo: '—',
      userName: complaintType === 'user' ? userOptions.find((user) => user.id === complaintUserId)?.label || '—' : '—',
      relatedRecord: '—',
      category: submittedCategory,
      transactionId: '—',
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'Open',
      description: complaintDescription.trim(),
      evidence: complaintEvidence,
      response: '',
      timeline: { raised: new Date().toISOString() },
    }
    setPlatformComplaints((complaints) => [complaint, ...complaints])
    setSelectedPlatformComplaint(complaint)
    setComplaintType('platform')
    setComplaintCategory('')
    setCustomComplaintCategory('')
    setComplaintUserId('')
    setComplaintRelatedId('')
    setComplaintDescription('')
    setComplaintEvidence([])
    setFormAttempted(false)
    setFormOpen(false)
    setSuccessMessage('Complaint saved in this frontend session.')
    setJustSubmitted(true)
  }

  const handleEvidenceSelect = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    const invalid = files.find((file) => !ALLOWED_EVIDENCE_TYPES.includes(file.type) || file.size > MAX_EVIDENCE_SIZE)
    if (invalid) {
      setFormError(`${invalid.name} must be a JPG, PNG, or PDF up to 5 MB.`)
      return
    }
    setFormError('')
    setComplaintEvidence((current) => [
      ...current,
      ...files.map((file) => ({ name: file.name, size: file.size, type: file.type, url: URL.createObjectURL(file) })),
    ])
  }

  const removeEvidence = (index) => setComplaintEvidence((files) => files.filter((_, fileIndex) => fileIndex !== index))

  const formatFileSize = (size) => {
    if (!size) return 'Size unavailable'
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }

  const scrollToComplaints = () => {
    document.getElementById('all-complaints-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const isSubmitted = status !== 'Open'

  return (
    <div className="dispute-management-page">
      <PageHeader
        eyebrow="Astrologer workspace"
        title="Dispute Management"
        showBack
        backTo={routes.dashboard}
        backIcon={currentUser?.role === 'astrologer' ? TempleReturnIcon : undefined}
        actions={<button type="button" className="btn btn-primary raise-complaint-trigger" onClick={() => setFormOpen(true)}>+ Raise Complaint</button>}
      />

      <Card className="section">
        <div className="section-title"><History size={18} />Dispute History</div>
        <div className="stat-grid dispute-summary-grid">
          {[
            ['all', totalDisputed, 'Total Complaints', 'tone-violet'],
            ['pending', pendingDisputes, 'Open Complaints', 'tone-red'],
            ['under-review', underReviewDisputes, 'Under Review', 'tone-amber'],
            ['resolved', resolvedDisputes, 'Resolved', 'tone-green'],
          ].map(([filter, count, label, tone]) => (
            <button key={filter} className="stat-card stat-card-clickable" onClick={() => setDisputeFilter(filter)} style={disputeFilter === filter ? { background: 'var(--primary-bg)', borderRadius: 'var(--radius-m)' } : {}}>
              <div className={`stat-icon ${tone}`}><History size={20} /></div>
              <div className="stat-card-body"><div className="stat-value">{count}</div><div className="stat-label">{label}</div></div>
            </button>
          ))}
        </div>
      </Card>

      <div className="dispute-main-workspace" id="all-complaints-section">
      <Card className="section complaints-section">
        <div className="section-title">{disputeFilter === 'all' ? 'All Complaints' : disputeFilter === 'resolved' ? 'Resolved Complaints' : disputeFilter === 'under-review' ? 'Under Review Complaints' : 'Open Complaints'}</div>
        <div className="complaints-toolbar">
          <label className="complaints-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search by Complaint ID or Category</span>
            <input
              type="search"
              value={complaintSearch}
              onChange={(event) => setComplaintSearch(event.target.value)}
              placeholder="Search by Complaint ID or Category"
            />
          </label>
          <label className="complaints-status-filter">
            <span className="sr-only">Filter by complaint status</span>
            <select value={complaintStatus} onChange={(event) => setComplaintStatus(event.target.value)}>
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="under review">Under Review</option>
              <option value="awaiting response">Awaiting Response</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="complaints-status-filter">
            <span className="sr-only">Filter by complaint target</span>
            <select value={complaintAgainst} onChange={(event) => setComplaintAgainst(event.target.value)}>
              <option value="all">All Targets</option>
              <option value="platform">Platform</option>
              <option value="user">User</option>
            </select>
          </label>
        </div>
        {visibleComplaints.length === 0 ? (
          <div className="muted" style={{ padding: '16px 0' }}>No complaints found.</div>
        ) : (
          <div className="complaints-table-wrap">
            <div className="complaints-table" role="table" aria-label="All complaints">
              <div className="complaints-table-row complaints-table-head" role="row">
                {['S.No', 'Complaint', 'Date & Time', 'Status', 'Action'].map((heading) => <span key={heading} role="columnheader">{heading}</span>)}
              </div>
              {visibleComplaints.map((complaint, index) => {
                const statusLabel = complaint.status || 'Open'
                return (
                  <Fragment key={complaint.id}>
                  <div className="complaints-table-row" role="row">
                    <span role="cell" className="complaint-serial">{index + 1}</span>
                    <span role="cell" className="complaint-summary"><strong>{complaint.category || 'Complaint'}</strong><small>{complaint.id || '—'}</small></span>
                    <span role="cell" className="complaint-date">{complaint.date || '—'}</span>
                    <span role="cell"><StatusBadge label={statusLabel} className={`complaint-status-badge complaint-status-${statusLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '')} ${statusLabel.toLowerCase() === 'in review' ? 'complaint-status-under-review' : ''}`} /></span>
                    <span role="cell" className="complaint-action"><button type="button" className="complaint-view-button" aria-expanded={expandedComplaintId === complaint.id} onClick={() => selectComplaint(complaint)}>{expandedComplaintId === complaint.id ? 'Hide Details' : 'View Details'} <span aria-hidden="true">{expandedComplaintId === complaint.id ? '↑' : '→'}</span></button></span>
                  </div>
                  {expandedComplaintId === complaint.id && <div className="complaint-inline-details" role="region" aria-label={`Details for ${complaint.id}`}>
                    <div className="complaint-inline-details__main">
                      <div><strong>Complaint</strong><p>{complaint.description || 'No description provided.'}</p></div>
                      <div className="complaint-inline-details__meta">
                        <span><b>Category</b>{complaint.category || '—'}</span>
                        <span className="complaint-inline-details__status"><b>Status</b><span className={`complaint-inline-status complaint-inline-status--${statusLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '')}`}><i aria-hidden="true" /><em>{statusLabel}</em></span></span>
                        <span className="complaint-inline-details__time"><b>Raised Date &amp; Time</b><time>{complaint.date || '—'}</time></span>
                      </div>
                    </div>
                    {complaint.evidence?.length > 0 && <div className="complaint-inline-details__evidence"><strong>Attached Evidence</strong>{complaint.evidence.map((file, fileIndex) => <span key={`${file.name || file}-${fileIndex}`}>{file.name || file}</span>)}</div>}
                  </div>}
                  </Fragment>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {formOpen && createPortal(
        <div className="complaint-form-overlay" role="presentation" onMouseDown={() => closeComplaintForm()}>
          <Card className="section raise-complaint-panel complaint-form-modal" role="dialog" aria-modal="true" aria-labelledby="raise-complaint-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="raise-complaint-panel-heading">
          <div className="section-title" id="raise-complaint-title">Raise Complaint</div>
          <button type="button" className="icon-btn" aria-label="Close raise complaint panel" onClick={closeComplaintForm}><X size={16} /></button>
        </div>
        <p className="raise-complaint-intro"><Megaphone size={18} aria-hidden="true" /><span>{complaintType === 'platform' ? 'Raise a complaint regarding platform services, payments, technical issues or other support matters.' : 'Report an issue related to a user or customer and our team will review it.'}</span></p>
        <form className="raise-complaint-form" onSubmit={submitPlatformComplaint} noValidate>
          <div className="complaint-type-options" role="radiogroup" aria-label="Complaint type">
            <button type="button" className={complaintType === 'platform' ? 'is-selected' : ''} onClick={() => { setComplaintType('platform'); setComplaintCategory(''); setCustomComplaintCategory(''); setFormError('') }}><span className="complaint-type-icon" aria-hidden="true"><Building2 size={18} /></span><span className="complaint-type-copy"><strong>Platform Issues</strong><small>Payments, wallet, technical or account issues</small></span></button>
            <button type="button" className={complaintType === 'user' ? 'is-selected' : ''} onClick={() => { setComplaintType('user'); setComplaintCategory(''); setCustomComplaintCategory(''); setFormError('') }}><span className="complaint-type-icon complaint-type-icon--user" aria-hidden="true"><UserRound size={18} /></span><span className="complaint-type-copy"><strong>User Issues</strong><small>Report an issue with a customer interaction</small></span></button>
          </div>
          {complaintType === 'user' && <>
          <label className="complaint-form-field">
            <span>Select User / Customer <b aria-hidden="true">*</b></span>
            <select value={complaintUserId} onChange={(event) => setComplaintUserId(event.target.value)} aria-invalid={formAttempted && !complaintUserId}>
              <option value="">Select a user</option>
              {userOptions.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}
            </select>
          </label>
          </>}
          <label className="complaint-form-field">
            <span>Complaint Category <b aria-hidden="true">*</b></span>
            <select value={complaintCategory} onChange={(event) => { setComplaintCategory(event.target.value); if (event.target.value !== 'Other') setCustomComplaintCategory('') }} aria-invalid={formAttempted && !complaintCategory}>
              <option value="">Select a category</option>
              {(complaintType === 'platform' ? PLATFORM_COMPLAINT_CATEGORIES : USER_COMPLAINT_CATEGORIES).map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            {formAttempted && !complaintCategory && <small className="complaint-field-error">Complaint category is required.</small>}
          </label>
          {complaintCategory === 'Other' && <label className="complaint-form-field">
            <span>Specify Complaint Category <b aria-hidden="true">*</b></span>
            <input value={customComplaintCategory} onChange={(event) => setCustomComplaintCategory(event.target.value)} placeholder="Type your complaint category" aria-invalid={formAttempted && !customComplaintCategory.trim()} />
            {formAttempted && !customComplaintCategory.trim() && <small className="complaint-field-error">Please enter a complaint category.</small>}
          </label>}
          <label className="complaint-form-field">
            <span>Complaint Description <b aria-hidden="true">*</b></span>
            <textarea value={complaintDescription} onChange={(event) => setComplaintDescription(event.target.value.slice(0, 500))} placeholder="Please describe your issue in detail..." maxLength={500} aria-invalid={formAttempted && !complaintDescription.trim()} />
            <small className="complaint-character-count">{complaintDescription.length} / 500</small>
            {formAttempted && !complaintDescription.trim() && <small className="complaint-field-error">Complaint description is required.</small>}
          </label>
          <div className="complaint-form-field">
            <span>Upload Evidence <em>(Optional)</em></span>
            <label className="complaint-upload-box">
              <CloudUpload size={25} aria-hidden="true" />
              <span>Click to upload or drag and drop</span>
              <small>Supports: JPG, PNG, PDF (Max 5 MB)</small>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf, image/jpeg, image/png, application/pdf" multiple onChange={handleEvidenceSelect} />
            </label>
            {complaintEvidence.length > 0 && <div className="complaint-evidence-list">{complaintEvidence.map((file, index) => <div className="complaint-evidence-item" key={`${file.name}-${index}`}><FileText size={14} /><span>{file.name}<small>{formatFileSize(file.size)}</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeEvidence(index)}><X size={14} /></button></div>)}</div>}
          </div>
          {formError && <div className="complaint-form-error" role="alert">{formError}</div>}
          <div className="raise-complaint-actions">
            <button type="button" className="btn btn-ghost" onClick={() => closeComplaintForm({ reset: true, confirmUnsaved: false })}>Cancel</button>
            <button type="submit" className="btn btn-primary">Submit Complaint</button>
          </div>
        </form>
          </Card>
        </div>,
        document.body,
      )}

      </div>

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
      {justSubmitted && <SuccessAlert message={successMessage} onDismiss={() => setJustSubmitted(false)} />}
    </div>
  )
}
