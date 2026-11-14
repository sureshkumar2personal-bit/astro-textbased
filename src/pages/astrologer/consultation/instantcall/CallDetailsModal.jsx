import { NotebookText, Sparkles, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatRupees } from '../../../../utils/instantCallConsole.js'
import KundliSnapshot from './KundliSnapshot.jsx'
import { birthLine } from './IncomingCallCard.jsx'

const Row = ({ label, children }) => <div><dt>{label}</dt><dd>{children || '—'}</dd></div>

export default function CallDetailsModal({ row, onClose }) {
  const closeRef = useRef(null)
  useEffect(() => {
    if (!row) return undefined
    const previous = document.activeElement
    closeRef.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.() }
  }, [row, onClose])
  if (!row) return null
  const { item, status, amount, when } = row
  const birth = item.birthDetails
  const date = new Date(when)

  return createPortal(
    <div className="icc-modal-overlay" onClick={onClose}>
      <div className="icc-modal" role="dialog" aria-modal="true" aria-labelledby="icc-modal-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 id="icc-modal-title">{item.userName}</h2>
            <small>{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</small>
          </div>
          <span className={`consult-status consult-status--${status.toLowerCase()}`}>{status}</span>
          <button ref={closeRef} type="button" className="icc-icon-btn" aria-label="Close details" onClick={onClose}><X size={16} /></button>
        </header>
        <div className="icc-modal__body">
          <section>
            <h3>Call</h3>
            <dl className="icc-modal__grid">
              <Row label="Duration">{status === 'Completed' ? `${item.durationMinutes} min` : ''}</Row>
              <Row label="Amount">{status === 'Completed' ? formatRupees(amount) : ''}</Row>
              <Row label="Topic">{item.topic}</Row>
              <Row label="Language">{item.language}</Row>
            </dl>
          </section>
          <section>
            <h3>Birth Details</h3>
            {birth ? (
              <dl className="icc-modal__grid">
                <Row label="Name">{birth.name}</Row>
                <Row label="Gender">{birth.gender}</Row>
                <Row label="Born">{birthLine(birth)}</Row>
                <Row label="Place">{birth.place}</Row>
              </dl>
            ) : <p className="icc-muted">Birth details were not shared for this call.</p>}
          </section>
          <section>
            <h3><Sparkles size={14} /> Kundli Snapshot</h3>
            <KundliSnapshot details={birth} emptyText="Kundli can't be shown because birth details were not shared for this call." />
          </section>
          <section>
            <h3><NotebookText size={14} /> Consultation Notes</h3>
            {item.notes ? <p className="icc-modal__notes">{item.notes}</p> : <p className="icc-muted">No notes were saved for this call.</p>}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
