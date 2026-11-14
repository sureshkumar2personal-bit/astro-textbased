import { Star, Users } from 'lucide-react'
import { callerMinutes } from '../../../../utils/instantCallConsole.js'

// The panel lists only the next two callers; the pill still shows the real number waiting.
const VISIBLE_CALLERS = 2

export default function WaitingQueuePanel({ queue, waits, repeatIds }) {
  const visible = queue.slice(0, VISIBLE_CALLERS)
  return (
    <aside className="icc-card icc-queue" aria-label="Waiting queue">
      <header className="icc-queue__head">
        <h2><Users size={22} aria-hidden="true" /> Waiting Queue</h2>
        <span className="icc-queue__count" data-testid="queue-count">{queue.length} Waiting</span>
      </header>
      {visible.length ? (
        <ul className="icc-queue__list">
          {visible.map((request) => {
            const wait = waits[request.id] ?? 0
            const { minutes, label } = callerMinutes(request)
            return (
              <li key={request.id} className="icc-queue__item">
                <div className="icc-queue__who">
                  <p className="icc-queue__name">
                    <strong>{request.userName}</strong>
                    {repeatIds?.has(request.userId) && <span className="icc-queue__repeat"><Star size={13} fill="currentColor" aria-hidden="true" /> Repeat</span>}
                  </p>
                  <p className="icc-queue__sub">{request.topic || 'Topic not specified'} <i aria-hidden="true">•</i> {minutes}m {label}</p>
                </div>
                <span className="icc-queue__wait">{wait > 0 ? `${wait}m wait` : 'Next up'}</span>
              </li>
            )
          })}
        </ul>
      ) : <p className="icc-muted icc-queue__empty">No one else is waiting right now.</p>}
    </aside>
  )
}
