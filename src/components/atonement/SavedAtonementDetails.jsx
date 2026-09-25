import { useState } from 'react'
import { X } from 'lucide-react'

function durationInDays(value) {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number(match[0]) : 1
}

export default function SavedAtonementDetails({ name, content = {}, preview = '', duration, onClose, onAttach, completedDays = {}, onToggleDay }) {
  const [selectedDay, setSelectedDay] = useState(1)
  const previewDays = Math.max(1, durationInDays(duration || content.templateDuration || content.duration))
  const previewRituals = (content.rituals || []).filter((ritual) => ritual?.enabled !== false)
  const previewDayRituals = previewRituals.filter((ritual, index) => index % previewDays === (selectedDay - 1) % previewDays || ['deepam', 'mantra-japam'].includes(ritual.id))
  const hasDayToggle = typeof onToggleDay === 'function'

  return (
    <div className="apt-saved-content-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="apt-saved-atonement-details" onClick={(event) => event.stopPropagation()}>
        <div className="apt-saved-content-head">
          <div>
            <span className="atonement-card-badge">{content.sourceDefaultId ? 'Platform Default' : 'My Saved Method'}</span>
            <h3>{name}</h3>
            <strong>{previewDays} Day Atonement</strong>
            <p>{content.purpose || content.shortDescription || content.detailedDescription || 'Saved Atonement details'}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close Pariharam details" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="apt-saved-atonement-body">
          <div className="apt-saved-atonement-summary"><span>Total Duration: {content.templateDuration || content.duration || `${previewDays} days`}</span><span>{previewRituals.length} Rituals</span></div>
          <section><h4>Rituals Included</h4><div className="apt-saved-ritual-tags">{previewRituals.map((ritual, index) => <span key={ritual.instanceId || index}>{ritual.name}</span>)}</div></section>
          <section>
            <h4>Complete Day-by-Day Procedure</h4>
            <nav className="apt-saved-day-tabs">
              {Array.from({ length: previewDays }, (_, index) => {
                const day = index + 1
                const completed = Boolean(completedDays[`day-${day}`])
                return <button key={day} type="button" className={`${selectedDay === day ? 'active ' : ''}${completed ? 'completed' : ''}`} onClick={() => setSelectedDay(day)}>{completed ? '✓ ' : ''}Day {day}</button>
              })}
            </nav>
            <div className="apt-saved-day-detail">
              <strong>Day {selectedDay}</strong>
              {hasDayToggle && <label className="apt-saved-day-complete"><input type="checkbox" checked={Boolean(completedDays[`day-${selectedDay}`])} onChange={() => onToggleDay(`day-${selectedDay}`)} /> Mark day completed</label>}
              {previewDayRituals.length ? previewDayRituals.map((ritual, index) => <article key={ritual.instanceId || index}><h5>{ritual.icon || '✦'} {ritual.name}</h5><p>{ritual.config?.instructions || ritual.instructions || ritual.description || 'Follow the prescribed procedure for this ritual.'}</p></article>) : <p>Follow the saved Atonement instructions for this day.</p>}
            </div>
          </section>
          {content.materials?.length > 0 && <section><h4>Materials &amp; Offerings</h4><ul className="apt-saved-materials">{content.materials.map((material, index) => <li key={index}>{material.name} {[material.quantity, material.unit].filter(Boolean).join(' ')}</li>)}</ul></section>}
          {content.instructions && <section><h4>Additional Instructions</h4>{['before', 'during', 'after'].map((key) => content.instructions[key] && <p key={key}><strong>{key[0].toUpperCase() + key.slice(1)}:</strong> {content.instructions[key]}</p>)}</section>}
          {preview && <img className="apt-saved-detail-media" src={preview} alt={name} />}
        </div>
        <div className="apt-saved-content-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>{onAttach && <button type="button" className="btn btn-primary" onClick={onAttach}>Attach / Select This Atonement</button>}</div>
      </div>
    </div>
  )
}
