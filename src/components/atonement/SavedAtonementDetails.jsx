import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

function durationInDays(value) {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number(match[0]) : 1
}

function dayDate(startAt, dayNumber) {
  if (!startAt) return ''
  const date = new Date(startAt)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + dayNumber - 1)
  return formatDayLabel(date)
}

function formatDayLabel(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value || '')
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dayRituals(day, fallbackRituals, previewDays, selectedDay) {
  const configured = day?.rituals || day?.procedures || day?.items
  if (Array.isArray(configured)) return configured.filter((ritual) => ritual?.enabled !== false)
  return fallbackRituals.filter((ritual, index) => index % previewDays === (selectedDay - 1) % previewDays || ['deepam', 'mantra-japam'].includes(ritual.id))
}

export default function SavedAtonementDetails({ name, content = {}, preview = '', duration, onClose, onAttach, completedDays = {}, onToggleDay, currentDayNumber = null, hideProgress = false }) {
  const [selectedDay, setSelectedDay] = useState(1)
  const configuredDays = [content.days, content.dayByDay, content.procedureDays, content.schedule].find(Array.isArray) || []
  const previewDays = Math.max(1, configuredDays.length || durationInDays(duration || content.templateDuration || content.duration || content.completionDays))
  const previewRituals = (content.rituals || []).filter((ritual) => ritual?.enabled !== false)
  const selectedDayConfig = configuredDays[selectedDay - 1] || {}
  const previewDayRituals = dayRituals(selectedDayConfig, previewRituals, previewDays, selectedDay)
  const selectedMaterials = selectedDayConfig.materials || content.materials || []
  const selectedDayDate = formatDayLabel(selectedDayConfig.date || selectedDayConfig.dateIso || dayDate(content.startAt || content.startedAt, selectedDay))
  const hasDayToggle = typeof onToggleDay === 'function'

  return createPortal(
    (
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
          {!hideProgress && <section>
            <h4>Complete Day-by-Day Procedure</h4>
            <nav className="apt-saved-day-tabs">
              {Array.from({ length: previewDays }, (_, index) => {
                const day = index + 1
                const completed = Boolean(completedDays[`day-${day}`]?.completed || completedDays[`day-${day}`])
                return <button key={day} type="button" className={`${selectedDay === day ? 'active ' : ''}${completed ? 'completed' : ''}`} onClick={() => setSelectedDay(day)}>{completed ? '✓ ' : ''}Day {day}</button>
              })}
            </nav>
            <div className="apt-saved-day-detail">
              <strong>Day {selectedDay}{selectedDayDate ? ` — ${selectedDayDate}` : ''}</strong>
              {hasDayToggle && (() => {
                const completed = Boolean(completedDays[`day-${selectedDay}`]?.completed || completedDays[`day-${selectedDay}`])
                const previousDaysComplete = Array.from({ length: Math.max(0, selectedDay - 1) }, (_, index) => completedDays[`day-${index + 1}`]?.completed || completedDays[`day-${index + 1}`]).every(Boolean)
                const available = selectedDay === currentDayNumber && previousDaysComplete && !completed
                const unavailableLabel = selectedDay <= (currentDayNumber || 0) && !previousDaysComplete ? 'Complete the previous day first' : selectedDayDate ? `Available on ${selectedDayDate}` : 'Not available yet'
                return <label className={`apt-saved-day-complete${completed ? ' is-completed' : ''}${!available && !completed ? ' is-locked' : ''}`}><input type="checkbox" checked={completed} disabled={!available} onChange={() => onToggleDay(`day-${selectedDay}`)} /> {completed ? 'Day completed' : available ? "Mark today's Pariharam as completed" : unavailableLabel}</label>
              })()}
              {previewDayRituals.length ? previewDayRituals.map((ritual, index) => <article key={ritual.instanceId || index}><h5>{ritual.icon || '✦'} {ritual.name}</h5><p>{ritual.config?.instructions || ritual.instructions || ritual.description || 'Follow the prescribed procedure for this ritual.'}</p></article>) : <p>Follow the saved Atonement instructions for this day.</p>}
            </div>
          </section>}
          {selectedMaterials.length > 0 && <section><h4>Materials &amp; Offerings</h4><ul className="apt-saved-materials">{selectedMaterials.map((material, index) => <li key={material.id || index}>{typeof material === 'string' ? material : `${material.name} ${[material.quantity, material.unit].filter(Boolean).join(' ')}`}</li>)}</ul></section>}
          {content.instructions && <section><h4>Additional Instructions</h4>{['before', 'during', 'after'].map((key) => content.instructions[key] && <p key={key}><strong>{key[0].toUpperCase() + key.slice(1)}:</strong> {content.instructions[key]}</p>)}</section>}
          {preview && <img className="apt-saved-detail-media" src={preview} alt={name} />}
        </div>
        <div className="apt-saved-content-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>{onAttach && <button type="button" className="btn btn-primary" onClick={onAttach}>Attach / Select This Atonement</button>}</div>
      </div>
    </div>
    ),
    document.body,
  )
}
