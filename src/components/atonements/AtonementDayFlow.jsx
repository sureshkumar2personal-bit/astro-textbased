import { useRef, useState } from 'react'
import { Check, Clock3, Eye, LockKeyhole, MapPin, Paperclip, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { ATONEMENT_ICONS } from './atonementIcons.jsx'
import { formatRemedyHour } from '../../utils/remedyNotes.js'
import { getAtonementProgress, isAtonementDayActionable, isAtonementDayLocked, localDateIso, openProofInNewTab } from '../../utils/atonements.js'

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
  if (proof.type.startsWith('image/')) return <img src={proof.dataUrl} alt={proof.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
  if (proof.type.startsWith('video/')) return <video src={proof.dataUrl} controls style={{ maxWidth: 120, maxHeight: 60 }} />
  if (proof.type.startsWith('audio/')) return <audio src={proof.dataUrl} controls style={{ maxWidth: 160 }} />
  return <Paperclip size={18} style={{ color: 'var(--primary, #7346a3)' }} />
}

function DayProofItem({ day, dayIndex, onSaveProof }) {
  const inputRef = useRef(null)
  const proof = day.proof

  const pick = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_PROOF_BYTES) {
      window.alert('Please choose a file smaller than 2 MB.')
      return
    }
    const dataUrl = await readFile(file)
    onSaveProof(dayIndex, {
      name: file.name,
      type: file.type,
      dataUrl,
      addedAt: new Date().toISOString(),
    })
  }

  const attachSample = () => {
    onSaveProof(dayIndex, {
      name: `Day-${dayIndex + 1}-pooja-proof.jpg`,
      type: 'image/jpeg',
      dataUrl: '/astrologer-temple-banner.png',
      addedAt: new Date().toISOString(),
    })
  }

  const god = day.god || day.deity

  return (
    <div
      className="am-day-proof-card"
      style={{
        border: '1px solid rgba(115, 70, 163, 0.16)',
        borderRadius: 12,
        padding: '12px 14px',
        background: proof ? '#f4fbf6' : '#ffffff',
        display: 'grid',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="am-day-badge"
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: proof ? '#16a34a' : 'var(--primary, #7346a3)',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Day {dayIndex + 1}
          </span>
          <strong style={{ color: '#30263b', fontSize: 13.5 }}>
            {formatLongDate(day.date)}
          </strong>
          {god && (
            <span
              style={{
                fontSize: 11.5,
                color: '#6d3fa0',
                background: '#f3ebff',
                padding: '1px 8px',
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              {god}
            </span>
          )}
        </div>

        {proof ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#15803d',
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <Check size={13} /> Proof Attached
          </span>
        ) : (
          <span
            style={{
              color: '#d97706',
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            Pending Proof
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        hidden
        onChange={pick}
      />

      {proof ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
            padding: '8px 12px',
            borderRadius: 8,
            background: '#ffffff',
            border: '1px solid rgba(22, 163, 74, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                overflow: 'hidden',
                background: '#f0fdf4',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <ProofPreview proof={proof} />
            </div>
            <div style={{ minWidth: 0 }}>
              <strong
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#30263b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 240,
                }}
                title={proof.name}
              >
                {proof.name}
              </strong>
              {proof.addedAt && (
                <small style={{ color: '#8b8295', fontSize: 11 }}>
                  Added {formatStamp(proof.addedAt)}
                </small>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => openProofInNewTab(proof)}
            >
              <Eye size={12} /> View
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw size={12} /> Replace
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: '#dc2626' }}
              onClick={() => onSaveProof(dayIndex, null)}
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="am-add-proof"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1.5px dashed #7346a3',
              background: 'rgba(115, 70, 163, 0.04)',
              color: '#7346a3',
              cursor: 'pointer',
              textAlign: 'left',
              width: 'fit-content',
            }}
            onClick={() => inputRef.current?.click()}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: '#f3ebff',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
            </div>
            <span style={{ display: 'grid' }}>
              <strong style={{ fontSize: 13, color: '#7346a3' }}>
                + Add Day {dayIndex + 1} Proof
              </strong>
              <small style={{ color: '#8b8295', fontSize: 10.5 }}>
                Photo · Video · Audio (Max 2 MB)
              </small>
            </span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ fontSize: 11.5, padding: '7px 11px', height: 'auto', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            onClick={attachSample}
            title="Attach sample pooja photo for testing"
          >
            <Sparkles size={13} /> Quick Demo Photo
          </button>
        </div>
      )}
    </div>
  )
}

function AllDaysProofSection({ atonement, onSaveProof }) {
  const days = atonement.days || []
  const uploadedCount = days.filter((d) => d.proof).length
  const requirements = atonement.proofRequirements || []

  return (
    <div
      className="atonement-all-proofs"
      style={{
        marginTop: 16,
        padding: '18px 20px',
        borderRadius: 14,
        background: '#faf8fd',
        border: '1.5px solid rgba(115, 70, 163, 0.2)',
        display: 'grid',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 14,
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(115, 70, 163, 0.12)',
          paddingBottom: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <Paperclip size={17} style={{ color: 'var(--primary, #7346a3)' }} />
            <h4
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#30263b',
              }}
            >
              Day-by-Day Proof Attachments
            </h4>
          </div>
          <p style={{ margin: 0, color: '#6f667b', fontSize: 13 }}>
            Please add proof attachments for each completed day of your {days.length}-day pooja.
          </p>
          {requirements.length > 0 && (
            <small
              style={{
                display: 'block',
                marginTop: 6,
                color: 'var(--primary, #7346a3)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Astrologer asks for:{' '}
              {requirements
                .map((r) => `${r.label} (${r.required ? 'required' : 'optional'})`)
                .join(' · ')}
            </small>
          )}
        </div>

        <div
          className="am-proof-count-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 999,
            background: uploadedCount === days.length ? '#ecfaf1' : '#f3ebff',
            color: uploadedCount === days.length ? '#15803d' : 'var(--primary, #7346a3)',
            fontWeight: 700,
            fontSize: 12.5,
          }}
        >
          {uploadedCount === days.length ? <Check size={14} /> : <Paperclip size={13} />}
          <span>
            {uploadedCount}/{days.length} Proofs Attached
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {days.map((dayItem, dIdx) => (
          <DayProofItem
            key={`${atonement.id}-proof-day-${dIdx}`}
            day={dayItem}
            dayIndex={dIdx}
            onSaveProof={onSaveProof}
          />
        ))}
      </div>
    </div>
  )
}

export default function AtonementDayFlow({ atonement, onToggleDay, onSaveProof }) {
  const progress = getAtonementProgress(atonement)
  const method = atonement.method
  const allCompleted = progress.total > 0 && progress.completed === progress.total
  const firstOpen = atonement.days.findIndex((day) => !day.completed)
  const [selected, setSelected] = useState(firstOpen === -1 ? Math.max(0, atonement.days.length - 1) : firstOpen)
  const index = Math.min(selected, atonement.days.length - 1)
  const isFinalDay = index === atonement.days.length - 1
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

        <li className={`jr-step jr-proof-step${day.proof ? ' is-completed' : ''}`}>
          <span className="jr-step-node">
            {day.proof ? <Check size={16} /> : <Paperclip size={16} />}
          </span>
          <div className="jr-step-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <strong style={{ fontSize: 15 }}>
                {isFinalDay && atonement.days.length === 1 ? 'Pooja Proof Attachment' : `Day ${index + 1} Proof Attachment`}
              </strong>
              {day.proof ? (
                <span style={{ color: '#16a34a', fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Check size={13} /> Proof Attached
                </span>
              ) : (
                <span style={{ color: '#d97706', fontSize: 11.5, fontWeight: 700 }}>
                  Upload Proof Before Complete
                </span>
              )}
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#6f667b' }}>
              Please attach photo, video, or audio proof of your ritual/pooja before marking as completed.
            </p>
            <DayProofItem day={day} dayIndex={index} onSaveProof={onSaveProof} />
          </div>
        </li>

        <li className={`jr-step jr-final${day.completed ? ' is-completed' : ''}`}>
          <span className="jr-step-node">{day.completed ? <Check size={16} /> : null}</span>
          <div className="jr-step-body">
            {isFinalDay ? (
              day.completed ? (
                <>
                  <span className="jr-done-label">Completed</span>
                  <strong>
                    {atonement.days.length === 1
                      ? 'Pooja completed successfully'
                      : `Pooja completed successfully · All ${atonement.days.length} days done`}
                  </strong>
                  {day.completedAt && <small>{formatCompleted(day.completedAt)}</small>}
                  <small style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <Check size={13} /> Completed with verified proof attached.
                  </small>
                  {atonement.days.length > 1 && <AllDaysProofSection atonement={atonement} onSaveProof={onSaveProof} />}
                </>
              ) : (
                <>
                  <span className="jr-pending-label">Last Day Status</span>
                  <strong>
                    {atonement.days.length === 1
                      ? 'Pooja Not Completed'
                      : `Day ${index + 1} of ${atonement.days.length} (Last Day of Pooja)`}
                  </strong>

                  {atonement.days.length > 1 && (
                    <div style={{ marginTop: 10, marginBottom: 8 }}>
                      <AllDaysProofSection atonement={atonement} onSaveProof={onSaveProof} />
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary jr-mark"
                    disabled={!actionable || !day.proof}
                    onClick={() => {
                      if (!day.proof) {
                        window.alert('Please attach proof above before completing your pooja.')
                        return
                      }
                      onToggleDay(index)
                    }}
                    title={!day.proof ? 'Please attach proof above to complete' : ''}
                  >
                    <Check size={15} /> Complete Pooja
                  </button>

                  {waiting && <small className="atonement-availability-note">Complete Day {index} first.</small>}
                  {isFuture(day) && <small className="atonement-availability-note">Unlocks on {formatLongDate(day.date)}</small>}
                  {actionable && !day.proof && (
                    <small style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontWeight: 600 }}>
                      ⚠️ Please attach proof above before completing your pooja.
                    </small>
                  )}
                  {actionable && day.proof && (
                    <small style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontWeight: 600 }}>
                      ✓ Proof attached. You can now complete your pooja.
                    </small>
                  )}
                </>
              )
            ) : (
              day.completed ? (
                <>
                  <span className="jr-done-label">Completed</span>
                  <strong>Day {index + 1} completed successfully</strong>
                  {day.completedAt && <small>{formatCompleted(day.completedAt)}</small>}
                  <small style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <Check size={13} /> Day completed with verified proof attached.
                  </small>
                </>
              ) : (
                <>
                  <span className="jr-pending-label">Status</span>
                  <strong>Not Completed</strong>
                  <button
                    type="button"
                    className="btn btn-primary jr-mark"
                    disabled={!actionable || !day.proof}
                    onClick={() => {
                      if (!day.proof) {
                        window.alert(`Please attach proof for Day ${index + 1} before marking as completed.`)
                        return
                      }
                      onToggleDay(index)
                    }}
                    title={!day.proof ? 'Please attach proof above to complete' : ''}
                  >
                    <Check size={15} /> Mark Day as Completed
                  </button>

                  {waiting && <small className="atonement-availability-note">Complete Day {index} first.</small>}
                  {isFuture(day) && <small className="atonement-availability-note">Unlocks on {formatLongDate(day.date)}</small>}
                  {actionable && !day.proof && (
                    <small style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontWeight: 600 }}>
                      ⚠️ Please attach proof above before marking Day {index + 1} as completed.
                    </small>
                  )}
                  {actionable && day.proof && (
                    <small style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontWeight: 600 }}>
                      ✓ Proof attached. You can now mark Day {index + 1} as completed.
                    </small>
                  )}
                </>
              )
            )}
          </div>
        </li>
      </ol>
    </section>
  </div>
}
