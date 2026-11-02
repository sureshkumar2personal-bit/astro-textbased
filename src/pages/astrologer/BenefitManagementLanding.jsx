import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, ChevronRight, Eye, FileText, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react'
import './benefitManagementLanding.css'

const PROFILE_IMAGE = '/astrologer-photos/reference/dr-rani.png'

function formatCreatedDate(value) {
  if (!value) return 'Recently created'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusClass(status) {
  return `benefit-landing-status benefit-landing-status--${String(status || 'Draft').toLowerCase()}`
}

function BenefitActions({ benefit, onView, onPreview, onDelete }) {
  const [open, setOpen] = useState(false)

  return <div className="benefit-landing-actions">
    <button type="button" className="benefit-landing-more" aria-label={`Actions for ${benefit.title}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}><MoreHorizontal size={18} /></button>
    {open && <div className="benefit-landing-menu" role="menu">
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onView(benefit) }}><Eye size={14} /> View</button>
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onPreview(benefit) }}><Sparkles size={14} /> Preview</button>
      <button type="button" role="menuitem" className="is-danger" onClick={() => { setOpen(false); onDelete(benefit) }}><Trash2 size={14} /> Delete</button>
    </div>}
  </div>
}

export default function BenefitManagementLanding({ benefits = [], onCreate, onSpecialization, onView, onPreview, onDelete }) {
  const [pendingDelete, setPendingDelete] = useState(null)
  const creationOptions = [
    { label: 'Specialization', icon: Sparkles, className: 'is-specialization' },
  ]

  useEffect(() => {
    if (!pendingDelete) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPendingDelete(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pendingDelete])

  const confirmDelete = () => {
    if (!pendingDelete) return
    onDelete?.(pendingDelete)
    setPendingDelete(null)
  }

  return <div className="benefit-landing">
    <section className="benefit-landing-composer" aria-label="Create a benefit">
      <div className="benefit-landing-composer-row" role="button" tabIndex="0" onClick={onCreate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onCreate() }}>
        <img className="benefit-landing-avatar" src={PROFILE_IMAGE} alt="Dr. Rani" />
        <div className="benefit-landing-prompt">Share a new benefit, specialization or guidance...</div>
        <ChevronRight className="benefit-landing-prompt-arrow" size={19} aria-hidden="true" />
      </div>
      <div className="benefit-landing-composer-divider" />
      <div className="benefit-landing-tools">
        {creationOptions.map(({ label, icon: Icon, className = '' }) => <button key={label} type="button" className={`benefit-landing-tool ${className}`} onClick={onSpecialization}><Icon size={17} /><span>{label}</span></button>)}
      </div>
    </section>

    <section className="benefit-landing-recent" aria-labelledby="recent-benefits-title">
      <div className="benefit-landing-section-heading"><div><h2 id="recent-benefits-title">Recent benefits</h2></div><span className="benefit-landing-count">{benefits.length} {benefits.length === 1 ? 'benefit' : 'benefits'}</span></div>
      {benefits.length === 0 ? <div className="benefit-landing-empty"><FileText size={22} /><strong>No benefits created yet</strong><span>Your next benefit will appear here after you save it.</span><button type="button" className="btn btn-primary" onClick={onCreate}>Create your first benefit</button></div> : <div className="benefit-landing-list">
        {benefits.map((benefit) => <article className="benefit-landing-card" key={benefit.id}>
          <div className="benefit-landing-card-icon"><FileText size={19} /></div>
          <div className="benefit-landing-card-body"><div className="benefit-landing-card-title-row"><h3>{benefit.title}</h3><span className={statusClass(benefit.status)}>{benefit.status || 'Draft'}</span></div><div className="benefit-landing-card-meta"><span>{benefit.category || 'General Guidance'}</span><span className="benefit-landing-meta-separator">•</span><span><CalendarDays size={13} /> {formatCreatedDate(benefit.publishDate)}</span><span className="benefit-landing-format">{benefit.format || 'Text'}</span></div><p>{benefit.content || 'No description added yet.'}</p></div>
          <BenefitActions benefit={benefit} onView={onView} onPreview={onPreview} onDelete={setPendingDelete} />
        </article>)}
      </div>}
    </section>
    {pendingDelete && <div className="benefit-delete-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null) }}>
      <div className="benefit-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="benefit-delete-title" aria-describedby="benefit-delete-description" onMouseDown={(event) => event.stopPropagation()}>
        <div className="benefit-delete-dialog__icon"><AlertTriangle size={22} aria-hidden="true" /></div>
        <div className="benefit-delete-dialog__content">
          <span className="benefit-delete-dialog__eyebrow">REMOVE BENEFIT</span>
          <h2 id="benefit-delete-title">Delete this benefit?</h2>
          <p id="benefit-delete-description">“{pendingDelete.title}” will be removed from your recent benefits. This action cannot be undone.</p>
        </div>
        <div className="benefit-delete-dialog__actions">
          <button type="button" className="benefit-delete-dialog__cancel" onClick={() => setPendingDelete(null)}>Cancel</button>
          <button type="button" className="benefit-delete-dialog__confirm" onClick={confirmDelete}><Trash2 size={15} aria-hidden="true" /> Delete benefit</button>
        </div>
      </div>
    </div>}
  </div>
}
