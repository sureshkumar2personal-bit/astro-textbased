import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, Search, MessageCircle } from 'lucide-react'
import Card from '../../../components/ui/Card.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { useAppData } from '../../../state/AppDataContext.jsx'
import { useAuth } from '../../../state/AuthContext.jsx'
import { formatDisplayDate, formatTimeRange, resolveAppointmentWindow } from '../../../utils/appointments.js'
import { formatRemedyHour } from '../../../utils/remedyNotes.js'

function formatAmount(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

function appointmentSortKey(appointment) {
  if (appointment.dateIso) {
    const { startMin } = resolveAppointmentWindow(appointment)
    return new Date(`${appointment.dateIso}T00:00:00`).getTime() + (startMin * 60000)
  }
  if (appointment.raisedAt) return new Date(appointment.raisedAt).getTime()
  return 0
}

function historyLabel(appointment) {
  return appointment.questionDetails?.question || appointment.topic || 'Appointment record'
}

export default function AppointmentHistoryTab() {
  const { appointments } = useAppData()
  const { currentUser } = useAuth()
  const astrologerId = currentUser?.id === 'astrologer-demo-alias' ? 'astrologer-demo' : currentUser?.id
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const records = useMemo(() => {
    const term = search.trim().toLowerCase()
    return appointments
      .filter((appointment) => appointment.astrologerId === astrologerId)
      .filter((appointment) => {
        if (!term) return true
        return [
          appointment.id,
          appointment.customerName,
          appointment.customerPhone,
          appointment.status,
          appointment.topic,
          appointment.orderId,
          appointment.language,
        ]
          .join(' ')
          .toLowerCase()
          .includes(term)
      })
      .slice()
      .sort((a, b) => appointmentSortKey(b) - appointmentSortKey(a))
  }, [appointments, astrologerId, search])

  const selected = records.find((appointment) => appointment.id === selectedId) || records[0] || null

  useEffect(() => {
    if (!records.length) {
      setSelectedId(null)
      return
    }
    if (!selected || records.every((appointment) => appointment.id !== selected.id)) {
      setSelectedId(records[0].id)
    }
  }, [records, selected])

  return (
    <div className="apt-history">
      <div className="apt-history-toolbar">
        <label className="apt-calendar-search apt-history-search">
          <Search size={15} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, status, topic, or ID..."
            aria-label="Search appointment history"
          />
        </label>
      </div>

      <div className="apt-history-grid">
        <Card className="apt-history-list-card">
          <div className="apt-history-list-head">
            <div>
              <div className="section-title">Appointment Records</div>
              <p className="muted">All appointment entries for the selected astrologer.</p>
            </div>
            <span className="muted">{records.length} result{records.length === 1 ? '' : 's'}</span>
          </div>

          <div className="apt-history-list">
            {records.length ? records.map((appointment) => {
              const { startMin, endMin } = resolveAppointmentWindow(appointment)
              const isSelected = selected?.id === appointment.id
              return (
                <button
                  key={appointment.id}
                  type="button"
                  className={`apt-history-item${isSelected ? ' is-active' : ''}`}
                  onClick={() => setSelectedId(appointment.id)}
                >
                  <div className="apt-history-item__top">
                    <div>
                      <strong>{appointment.customerName || 'Customer'}</strong>
                      <span>{appointment.id}</span>
                    </div>
                    <StatusBadge label={appointment.status || 'Pending'} />
                  </div>
                  <div className="apt-history-item__meta">
                    <span><CalendarDays size={13} /> {appointment.dateIso ? formatDisplayDate(appointment.dateIso, true) : appointment.date || 'Not available'}</span>
                    <span><Clock3 size={13} /> {formatTimeRange(startMin, endMin)}</span>
                  </div>
                  <div className="apt-history-item__footer">
                    <span>{appointment.type || 'Appointment'}</span>
                    <span>{appointment.topic || 'No topic'}</span>
                  </div>
                </button>
              )
            }) : (
              <div className="apt-history-empty">
                <MessageCircle size={18} />
                <strong>No appointment records found</strong>
                <span>Try a different status filter or search term.</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="apt-history-detail-card">
          {selected ? (() => {
            const { startMin, endMin } = resolveAppointmentWindow(selected)
            return (
              <>
                <div className="apt-history-detail-head">
                  <div>
                    <div className="section-title">Selected Record</div>
                    <h2>{selected.customerName || 'Customer'}</h2>
                  </div>
                  <StatusBadge label={selected.status || 'Pending'} />
                </div>

                <div className="apt-history-detail-grid">
                  <div><span>Date</span><strong>{selected.dateIso ? formatDisplayDate(selected.dateIso, true) : selected.date || 'Not available'}</strong></div>
                  <div><span>Time</span><strong>{formatTimeRange(startMin, endMin)}</strong></div>
                  <div><span>Type</span><strong>{selected.type || 'Appointment'}</strong></div>
                  <div><span>Amount</span><strong>{formatAmount(selected.amount)}</strong></div>
                  <div><span>Phone</span><strong>{selected.customerPhone || 'Not available'}</strong></div>
                  <div><span>Language</span><strong>{selected.language || 'Not available'}</strong></div>
                </div>

                <div className="apt-history-detail-copy">
                  <div className="section-title">Topic</div>
                  <p>{historyLabel(selected)}</p>
                </div>

                <div className="apt-history-detail-copy">
                  <div className="section-title">Timeline Notes</div>
                  {Array.isArray(selected.history) && selected.history.length ? (
                    <ul className="apt-history-notes">
                      {selected.history.map((entry) => <li key={entry}>{entry}</li>)}
                    </ul>
                  ) : (
                    <p className="muted">No timeline notes were recorded for this appointment.</p>
                  )}
                </div>

                {selected.remedyNotes && (
                  <div className="apt-history-detail-copy">
                    <div className="section-title">Remedy Notes</div>
                    <div className="apt-remedy-grid">
                      <div className="apt-remedy-card">
                        <span>Summary</span>
                        <strong>{selected.remedyNotes.summary || 'Not available'}</strong>
                      </div>
                      <div className="apt-remedy-card">
                        <span>Program day</span>
                        <strong>{selected.remedyNotes.day || 'Not available'}</strong>
                      </div>
                      <div className="apt-remedy-card">
                        <span>Program hour</span>
                        <strong>{formatRemedyHour(selected.remedyNotes.hour) || selected.remedyNotes.hour || 'Not available'}</strong>
                      </div>
                      <div className="apt-remedy-card">
                        <span>Place</span>
                        <strong>{selected.remedyNotes.place || 'Not available'}</strong>
                      </div>
                      <div className="apt-remedy-card">
                        <span>God / deity</span>
                        <strong>{selected.remedyNotes.god || 'Not available'}</strong>
                      </div>
                      <div className="apt-remedy-card apt-remedy-card--full">
                        <span>Things to keep</span>
                        <strong>{selected.remedyNotes.things || 'Not available'}</strong>
                      </div>
                      <div className="apt-remedy-card apt-remedy-card--full">
                        <span>Do poojas</span>
                        <strong>{selected.remedyNotes.poojas || 'Not available'}</strong>
                      </div>
                      {selected.remedyNotes.extraNotes && (
                        <div className="apt-remedy-card apt-remedy-card--full">
                          <span>Additional notes</span>
                          <strong>{selected.remedyNotes.extraNotes}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selected.questionDetails?.question && (
                  <div className="apt-history-detail-copy">
                    <div className="section-title">Question</div>
                    <p>{selected.questionDetails.question}</p>
                  </div>
                )}
              </>
            )
          })() : (
            <div className="apt-history-empty apt-history-empty--detail">
              <CalendarDays size={18} />
              <strong>Select a record</strong>
              <span>Choose an appointment from the list to inspect its details.</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
