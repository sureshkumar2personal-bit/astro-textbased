import { ArrowDownToLine, ArrowLeft, Clock3, FileText, MessageCircle, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import '../../../css/astrologer/dispute-management.css'

export default function ComplaintDetails() {
  const navigate = useNavigate()
  const location = useLocation()
  const { complaintId } = useParams()
  const { questions } = useAppData()
  const question = questions.find((item) => item.id === decodeURIComponent(complaintId || ''))
  const complaint = location.state?.complaint || (question ? {
    id: question.id,
    category: question.category,
    transactionId: question.transactionId || question.orderId || `TXN${String(question.id).replace(/^QTN-/, '')}`,
    date: question.raised,
    status: question.dispute?.status || 'Open',
    description: [question.dispute?.reason, question.dispute?.description].filter(Boolean).join('. '),
    evidence: question.dispute?.attachment ? [{ name: question.dispute.attachment }] : [],
    response: question.dispute?.response || '',
  } : null)

  if (!complaint) return <div className="complaint-details-page"><button type="button" className="complaint-details-back" onClick={() => navigate('/astrologer/dispute-management')}><ArrowLeft size={15} /> Back to Dispute Management</button><h1>Complaint Details</h1><p className="complaint-details-empty">Complaint not found.</p></div>

  const status = complaint.status || 'Open'
  const reviewed = !['Open', 'Pending'].includes(status)
  const raised = complaint.date || '—'

  return (
    <div className="complaint-details-page">
      <button type="button" className="complaint-details-back" onClick={() => navigate('/astrologer/dispute-management')}><ArrowLeft size={15} /> Back to Dispute Management</button>
      <h1>Complaint Details</h1>
      <div className="complaint-details-layout">
        <section className="complaint-detail-card complaint-detail-summary" aria-label="Complaint summary">
          <div className="complaint-detail-summary-head"><div className="complaint-detail-id"><ShieldCheck size={21} /><div><span>Complaint ID</span><strong>{complaint.id}</strong></div></div><StatusBadge label={status === 'Open' ? 'Under Review' : status} /></div>
          <div className="complaint-detail-meta"><div><span>Category</span><strong>{complaint.category || '—'}</strong></div><div><span>Transaction ID</span><strong>{complaint.transactionId || '—'}</strong></div><div><span>Date Raised</span><strong>{raised}</strong></div></div>
          <div className="complaint-detail-copy"><h2><MessageCircle size={17} /> Description</h2><p>{complaint.description || 'No description provided.'}</p></div>
          <div className="complaint-detail-evidence"><h2><FileText size={17} /> Attached Evidence</h2><div className="complaint-detail-files">{complaint.evidence?.length ? complaint.evidence.map((file, index) => <div className="complaint-detail-file" key={`${file.name}-${index}`}><FileText size={20} /><span><strong>{file.name || file}</strong><small>{file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Attachment'}</small></span><button type="button" aria-label={`Download ${file.name || 'attachment'}`}><ArrowDownToLine size={17} /></button></div>) : <span className="complaint-details-muted">No evidence attached.</span>}</div></div>
        </section>
        <section className="complaint-detail-card complaint-detail-timeline" aria-label="Status timeline">
          <h2><Clock3 size={17} /> Status Timeline</h2>
          <div className="complaint-timeline-list"><div className="complaint-timeline-row is-complete"><span className="complaint-timeline-dot" /><div><strong>Complaint Raised</strong><p>Your complaint has been submitted to the platform.</p></div><time>{raised}</time></div><div className={`complaint-timeline-row ${reviewed ? 'is-complete' : 'is-current'}`}><span className="complaint-timeline-dot" /><div><strong>Under Review</strong><p>Our support team is reviewing your complaint.</p></div><time>{reviewed ? 'Review recorded' : 'Pending'}</time></div><div className={`complaint-timeline-row ${complaint.response ? 'is-complete' : ''}`}><span className="complaint-timeline-dot" /><div><strong>Platform Response</strong><p>{complaint.response ? 'A response has been posted.' : 'You will be notified once we have an update.'}</p></div><time>{complaint.response ? 'Updated' : 'Pending'}</time></div></div>
          <div className="complaint-detail-response"><strong>Platform Response</strong><p>{complaint.response || 'Response from platform will be shown here once available.'}</p></div>
        </section>
      </div>
    </div>
  )
}
