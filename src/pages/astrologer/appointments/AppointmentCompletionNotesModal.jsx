import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { createEmptyRemedyNotes, normalizeRemedyNotes, REMEDY_NOTE_FIELDS } from '../../../utils/remedyNotes.js'
import { callTypeMeta } from './meta.jsx'

export default function AppointmentCompletionNotesModal({ appointment, open, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(createEmptyRemedyNotes)

  useEffect(() => {
    if (!open) return
    setDraft(createEmptyRemedyNotes())
  }, [open, appointment?.id])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, open])

  if (!open || !appointment) return null

  const meta = callTypeMeta(appointment.callType)
  const sessionLabel = appointment.callType === 'Text' ? 'chat' : 'call'

  const handleChange = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    onSubmit(normalizeRemedyNotes(draft))
  }

  return createPortal(
    <div className="modal-overlay apt-notes-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="modal-card modal-card--scroll apt-notes-modal" role="dialog" aria-modal="true" aria-labelledby="apt-notes-title">
        <header className="modal-card__header apt-notes-header">
          <div>
            <div className="apt-notes-eyebrow">Session closure</div>
            <h2 id="apt-notes-title">End {sessionLabel} and add remedy notes</h2>
            <p>
              {meta.label} for {appointment.customerName}. Fill this before completing the session.
            </p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close remedy notes" onClick={onCancel}>
            <X size={18} />
          </button>
        </header>

        <form className="modal-card__content apt-notes-form" onSubmit={handleSubmit}>
          <div className="apt-notes-summary">
            <strong>Required remedy guidance</strong>
            <span>Use this to capture when, where, and how the customer should perform the remedy.</span>
          </div>

          <label className="apt-notes-field apt-notes-field--full">
            <span>Remedy summary</span>
            <textarea
              value={draft.summary}
              onChange={(event) => handleChange('summary', event.target.value)}
              placeholder="Summarize the remedy and the main advice."
              required
              rows="4"
            />
          </label>

          <div className="apt-notes-grid">
            {REMEDY_NOTE_FIELDS.filter((field) => ['day', 'hour', 'place', 'god'].includes(field.key)).map((field) => (
              <label className="apt-notes-field" key={field.key}>
                <span>{field.label}</span>
                <input
                  type={field.type}
                  value={draft[field.key]}
                  onChange={(event) => handleChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </label>
            ))}
          </div>

          <label className="apt-notes-field apt-notes-field--full">
            <span>Things to keep</span>
            <textarea
              value={draft.things}
              onChange={(event) => handleChange('things', event.target.value)}
              placeholder="List the items, flowers, or materials to keep ready."
              required
              rows="3"
            />
          </label>

          <label className="apt-notes-field apt-notes-field--full">
            <span>Do poojas</span>
            <textarea
              value={draft.poojas}
              onChange={(event) => handleChange('poojas', event.target.value)}
              placeholder="Describe the pooja steps or ritual to follow."
              required
              rows="3"
            />
          </label>

          <label className="apt-notes-field apt-notes-field--full">
            <span>Additional notes</span>
            <textarea
              value={draft.extraNotes}
              onChange={(event) => handleChange('extraNotes', event.target.value)}
              placeholder="Optional extra guidance."
              rows="3"
            />
          </label>

          <div className="modal-card__footer apt-notes-footer">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save notes & End {sessionLabel}</button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  )
}
