import { Plus, Users } from 'lucide-react'
import { formatRupees } from '../../../../utils/instantCallConsole.js'

export default function WaitingQueuePanel({ queue, waits, canAdd, onAdd }) {
  return (
    <aside className="icc-card icc-queue" aria-label="Waiting queue">
      <header className="icc-queue__head">
        <h2><Users size={16} aria-hidden="true" /> Waiting Queue</h2>
        <span className="icc-pill is-gold" data-testid="queue-count">{queue.length} in queue</span>
      </header>
      {queue.length ? (
        <ol className="icc-queue__list">
          {queue.map((request, index) => {
            const wait = waits[request.id] ?? 0
            return (
              <li key={request.id} className="icc-queue__item">
                <div className="icc-queue__row">
                  <strong><span className="icc-queue__pos">#{index + 1}</span> {request.userName}</strong>
                  <span className="icc-queue__wait">{wait > 0 ? `Wait: ~${wait}m` : 'Next up'}</span>
                </div>
                <p>{request.topic || 'Topic not specified'} <i aria-hidden="true">•</i> {formatRupees(request.amount ?? 0)} ({request.durationMinutes}m)</p>
              </li>
            )
          })}
        </ol>
      ) : <p className="icc-muted icc-queue__empty">No one else is waiting right now.</p>}
      <button type="button" className="icc-btn icc-btn--ghost icc-queue__add" disabled={!canAdd} onClick={onAdd} title={canAdd ? undefined : 'Every demo caller is already in the queue'}><Plus size={15} /> Add Caller to Queue</button>
    </aside>
  )
}
