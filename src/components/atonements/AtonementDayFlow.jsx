import { useRef, useState } from 'react'
import { Check, Clock3, Eye, LockKeyhole, MapPin, Paperclip, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { ATONEMENT_ICONS } from './atonementIcons.jsx'
import { formatRemedyHour } from '../../utils/remedyNotes.js'
import { getAtonementProgress, isAtonementDayActionable, isAtonementDayLocked, localDateIso } from '../../utils/atonements.js'

const MAX_PROOF_BYTES = 2 * 1024 * 1024


function formatLongDate(value) {
  if (!value) return 'Date not set'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function formatStamp(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatCompleted(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  const day = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
  return `${day} · ${time}`
}

// Split an astrologer's "a, b, and c" list into items without changing the words.
function listItems(value) {
  return String(value || '').split(/\s*[,;\n]\s*/).map((item) => item.replace(/^and\s+/i, '').trim()).filter(Boolean)
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Same day -> ritual selection the astrologer-side saved method uses.
function ritualsForDay(method, dayIndex, totalDays) {
  const configuredDays = [method?.days, method?.dayByDay, method?.procedureDays, method?.schedule].find(Array.isArray) || []
  const own = configuredDays[dayIndex] && typeof configuredDays[dayIndex] === 'object' ? configuredDays[dayIndex] : {}
  const configured = own.rituals || own.procedures || own.items
  const all = (method?.rituals || []).filter((ritual) => ritual?.enabled !== false)
  const rituals = Array.isArray(configured)
    ? configured.filter((ritual) => ritual?.enabled !== false)
    : all.filter((ritual, index) => index % totalDays === dayIndex % totalDays || ['deepam', 'mantra-japam'].includes(ritual.id))
  return { rituals, materials: own.materials || method?.materials || [] }
}

function materialText(material) {
  return typeof material === 'string' ? material : [material?.name, material?.quantity, material?.unit].filter(Boolean).join(' ')
}

function ProofPreview({ proof }) {
  if (proof.type.startsWith('image/')) return <img src={proof.dataUrl} alt={proof.name} />
  if (proof.type.startsWith('video/')) return <video src={proof.dataUrl} controls />
  if (proof.type.startsWith('audio/')) return <audio src={proof.dataUrl} controls />
  return <Paperclip size={18} />
}

function ProofSection({ proof, onSave, onRemove }) {
  const inputRef = useRef(null)
  const pick = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_PROOF_BYTES) { window.alert('Please choose a file smaller than 2 MB.'); return }
    onSave({ name: file.name, type: file.type, dataUrl: await readFile(file), addedAt: new Date().toISOString() })
  }
  return <div className="atonement-flow-proof">
    <input ref={inputRef} type="file" accept="image/*,video/*,audio/*" hidden onChange={pick} />
    {proof ? <>
      <div className="atonement-flow-proof-file"><div className="atonement-flow-proof-preview"><ProofPreview proof={proof} /></div><div><strong title={proof.name}>{proof.name}</strong>{proof.addedAt && <small>Added {formatStamp(proof.addedAt)}</small>}</div></div>
      <div className="atonement-flow-proof-actions">
        <a className="btn btn-outline btn-sm" href={proof.dataUrl} target="_blank" rel="noreferrer"><Eye size={13} /> View Proof</a>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()}><RefreshCw size={13} /> Replace Proof</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove}><Trash2 size={13} /> Remove</button>
      </div>
    </> : <button type="button" className="am-add-proof" onClick={() => inputRef.current?.click()}><Plus size={15} /><span><strong>Add Proof</strong><small>Photo · Video · Audio</small></span></button>}
  </div>
}

export default function AtonementDayFlow({ atonement, onToggleDay, onSaveProof }) {
  const progress = getAtonementProgress(atonement)
  const method = atonement.method
  const allCompleted = progress.total > 0 && progress.completed === progress.total
  const firstOpen = atonement.days.findIndex((day) => !day.completed)
  const [selected, setSelected] = useState(firstOpen === -1 ? 0 : firstOpen)
  const index = Math.min(selected, atonement.days.length - 1)
  const today = localDateIso()
  const isFuture = (item) => !item.completed && Boolean(item.date) && item.date > today
  const day = atonement.days[index]
  const waiting = isAtonementDayLocked(atonement, index)
  const locked = waiting || isFuture(day)
  const actionable = isAtonementDayActionable(atonement, index)
  const includedRituals = (method?.rituals || []).filter((ritual) => ritual?.enabled !== false)
  const { rituals, materials } = ritualsForDay(method, index, atonement.days.length)
  const god = day.god || day.deity
  const thingItems = [...materials.map(materialText), ...listItems(day.things)]
  const purpose = method?.purpose || method?.shortDescription || method?.detailedDescription || method?.description

  const steps = [
    ...rituals.map((ritual, i) => ({
      key: `ritual-${ritual.instanceId || i}`,
      icon: <ATONEMENT_ICONS.instruction size={16} />,
      title: ritual.name,
      body: [ritual.config?.instructions || ritual.instructions || ritual.description, ritual.config?.notes || ritual.config?.extraNotes || ritual.notes].filter(Boolean).map((text, n) => <p key={n} className={n ? 'jr-note' : undefined}>{text}</p>),
    })),
    god && { key: 'god', icon: <ATONEMENT_ICONS.god size={16} />, title: god, sub: 'God' },
    day.poojas && { key: 'process', icon: <ATONEMENT_ICONS.instruction size={16} />, title: 'Ritual Instruction', quote: day.poojas },
    thingItems.length > 0 && { key: 'things', icon: <ATONEMENT_ICONS.things size={16} />, title: 'Things Required', chips: thingItems },
    day.extraNotes && { key: 'notes', icon: <ATONEMENT_ICONS.notes size={16} />, title: 'Additional Notes', body: <p>{day.extraNotes}</p> },
  ].filter(Boolean)
  const meta = [day.place && { Icon: MapPin, text: day.place }, day.hour && { Icon: Clock3, text: formatRemedyHour(day.hour) }].filter(Boolean)

  return <div className="jr-page">
    <header className="jr-header">
      <span className="jr-eyebrow">{atonement.astrologerName}</span>
      <h2>{method?.title || method?.name || atonement.summary}</h2>
      {purpose && <p>{purpose}</p>}
      <div className="jr-meta">
        <span><Clock3 size={14} /> {atonement.days.length} {atonement.days.length === 1 ? 'Day' : 'Days'}</span>
        <span><Check size={14} /> {progress.completed}/{progress.total} Days Completed</span>
        <span className={`jr-status ${allCompleted ? 'is-done' : 'is-active'}`}>{allCompleted ? 'Completed' : 'In Progress'}</span>
      </div>
      <div className="jr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed}><span style={{ width: `${progress.percent}%` }} /></div>
      {includedRituals.length > 0 && <div className="jr-included">{includedRituals.map((ritual, i) => <span key={ritual.instanceId || i}>{ritual.name}</span>)}</div>}
    </header>

    <nav className="jr-journey" aria-label="Select day">
      {atonement.days.map((item, i) => {
        const isLocked = isAtonementDayLocked(atonement, i) || isFuture(item)
        return <button type="button" key={`${atonement.id}-tab-${i}`} className={`jr-node${i === index ? ' active' : ''}${item.completed ? ' completed' : ''}${isLocked ? ' locked' : ''}`} onClick={() => setSelected(i)} aria-current={i === index ? 'step' : undefined}>
          <span className="jr-dot">{item.completed ? <Check size={13} /> : isLocked ? <LockKeyhole size={11} /> : null}</span>
          <span className="jr-node-label">Day {i + 1}</span>
        </button>
      })}
    </nav>

    <section className="jr-day">
      <div className="jr-day-head">
        <div className="jr-day-title"><span>Day</span><strong>{index + 1}</strong></div>
        <div>
          <h3>{formatLongDate(day.date)} <span className={`jr-day-state${day.completed ? ' is-done' : ''}`}>{day.completed ? 'Completed' : locked ? 'Locked' : 'Pending'}</span></h3>
          {meta.length > 0 && <div className="jr-day-meta">{meta.map(({ Icon, text }) => <span key={text}><Icon size={14} /> {text}</span>)}</div>}
        </div>
      </div>

      <ol className="jr-steps" aria-label="Ritual plan">
        {steps.map((step) => <li className="jr-step" key={step.key}>
          <span className="jr-step-node">{step.icon}</span>
          <div className="jr-step-body">
            <strong>{step.title}</strong>
            {step.sub && <small>{step.sub}</small>}
            {step.quote && <blockquote>{step.quote}</blockquote>}
            {step.chips && <div className="jr-chips">{step.chips.map((chip, i) => <span key={i}>{chip}</span>)}</div>}
            {step.body}
          </div>
        </li>)}
        {!steps.length && <li className="jr-step"><span className="jr-step-node"><ATONEMENT_ICONS.instruction size={16} /></span><div className="jr-step-body"><small>No instructions were provided for this day.</small></div></li>}

        <li className={`jr-step jr-final${day.completed ? ' is-completed' : ''}`}>
          <span className="jr-step-node">{day.completed ? <Check size={16} /> : null}</span>
          <div className="jr-step-body">
            {day.completed ? <>
              <span className="jr-done-label">Completed</span>
              <strong>Day {index + 1} completed successfully</strong>
              {day.completedAt && <small>{formatCompleted(day.completedAt)}</small>}
              <ProofSection proof={day.proof} onSave={(proof) => onSaveProof(index, proof)} onRemove={() => onSaveProof(index, null)} />
            </> : <>
              <span className="jr-pending-label">Status</span>
              <strong>Not Completed</strong>
              <button type="button" className="btn btn-primary jr-mark" disabled={!actionable} onClick={() => onToggleDay(index)}><Check size={15} /> Mark Day as Completed</button>
              {waiting && <small className="atonement-availability-note">Complete Day {index} first.</small>}
              {isFuture(day) && <small className="atonement-availability-note">Unlocks on {formatLongDate(day.date)}</small>}
              <small>You can add proof after marking the day completed.</small>
            </>}
          </div>
        </li>
      </ol>
    </section>
  </div>
}
