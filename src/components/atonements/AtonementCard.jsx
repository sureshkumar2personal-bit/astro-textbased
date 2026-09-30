import { CompletionMarker } from './atonementIcons.jsx'
import { getAtonementProgress, getFirstIncompleteAtonementDay } from '../../utils/atonements.js'

const SOURCE_BADGES = { question: 'Text Based', chat: 'Chat', call: 'Call', appointment: 'Appointment' }

export default function AtonementCard({ atonement, selected = false, onSelect }) {
  const progress = getAtonementProgress(atonement)
  const current = getFirstIncompleteAtonementDay(atonement)
  const completed = !current
  return <article className={`rem-card${selected ? ' is-selected' : ''}`}>
    <div className="rem-card-top"><strong className="rem-card-astrologer">{atonement.astrologerName}</strong><span className={`rem-card-status ${completed ? 'is-completed' : 'is-pending'}`}><CompletionMarker done={completed} /> {completed ? 'Completed' : 'Pending'}</span></div>
    <div className="rem-card-category">{SOURCE_BADGES[atonement.sourceType] || 'Text Based'}</div>
    <div className="rem-card-duration">{progress.total}-Day Remedy</div>
    <h2 className="rem-card-title">{atonement.summary}</h2>
    <div className="rem-card-progress"><small>Progress</small><strong>{completed ? `${progress.completed} of ${progress.total} days` : `Day ${current.index + 1} of ${progress.total}`}</strong></div>
    <button type="button" className="rem-card-button" onClick={onSelect}>View Details <span aria-hidden="true">→</span></button>
  </article>
}
