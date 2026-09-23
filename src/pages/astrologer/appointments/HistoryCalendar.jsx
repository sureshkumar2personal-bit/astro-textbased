import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth,
  startOfWeek,
  toIsoDate,
  formatDisplayDate,
} from '../../../utils/appointments.js'
import { appointmentStatusBucket } from '../../../utils/appointments.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Build a small per-status breakdown used to decide cell styling + count badge.
function dayBreakdown(appointments, date) {
  const iso = toIsoDate(date)
  const dayApps = appointments.filter((appointment) => appointment.dateIso === iso)
  const booked = dayApps.filter((appointment) => appointmentStatusBucket(appointment) === 'booked')
  const pending = dayApps.filter((appointment) => appointmentStatusBucket(appointment) === 'booked' && !appointment.rescheduledFrom && !appointment.rescheduledTo && !appointment.rescheduledAt)
  const rescheduled = dayApps.filter((appointment) => appointmentStatusBucket(appointment) === 'rescheduled')
  const completed = dayApps.filter((appointment) => appointmentStatusBucket(appointment) === 'completed')
  const cancelled = dayApps.filter((appointment) => appointmentStatusBucket(appointment) === 'cancelled')
  const other = dayApps.filter((appointment) => appointment.status === 'No-show')
  return { total: dayApps.length, booked, pending, rescheduled, completed, cancelled, other }
}

export default function HistoryCalendar({ appointments, rangeStart, onRangeChange, onSelectDate, selectedDate, variant = 'default', showMonthArrows = false }) {
  const isUserCalendar = variant === 'user'
  const monthStart = startOfMonth(rangeStart)
  const gridStart = startOfWeek(monthStart, 0)
  const weeks = useMemo(() => {
    const cells = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      return date
    })
    const result = []
    for (let index = 0; index < cells.length; index += 7) result.push(cells.slice(index, index + 7))
    return result
  }, [gridStart])

  const todayIso = toIsoDate(new Date())
  const selectedIso = selectedDate ? toIsoDate(selectedDate) : null
  const monthLabel = `${MONTHS[monthStart.getMonth()]} ${monthStart.getFullYear()}`

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef(null)

  const years = useMemo(() => {
    const set = new Set()
    appointments.forEach((appointment) => {
      if (appointment.dateIso) set.add(Number(appointment.dateIso.slice(0, 4)))
    })
    set.add(monthStart.getFullYear())
    const sorted = Array.from(set).sort((a, b) => a - b)
    return sorted.length ? sorted : [monthStart.getFullYear()]
  }, [appointments, monthStart])

  useEffect(() => {
    const close = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleToday = () => {
    const now = new Date()
    onRangeChange(startOfMonth(now))
    onSelectDate(now)
  }

  const handlePrevMonth = () => {
    onRangeChange(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    onRangeChange(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))
  }

  const applyMonthYear = (month, year) => {
    onRangeChange(new Date(year, month, 1))
    onSelectDate(new Date(year, month, 1))
    setPickerOpen(false)
  }

  return (
    <div className="apt-scheduling-calendar apt-scheduling-calendar--history">
      <div className="apt-calendar-toolbar apt-history-toolbar">
        <div className="apt-calendar-nav">
          {isUserCalendar && <button type="button" className="apt-history-user-nav" aria-label="Previous month" onClick={() => onRangeChange(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}><ChevronLeft size={17} /></button>}
          {showMonthArrows && (
            <button type="button" className="icon-btn apt-calendar-arrow" onClick={handlePrevMonth} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
          )}
          <button type="button" className="btn btn-ghost apt-today-btn" onClick={handleToday}>
            Today
          </button>
        </div>
        <div className="apt-calendar-title-wrap">
          <button
            type="button"
            className="apt-calendar-title"
            onClick={() => setPickerOpen((open) => !open)}
            aria-expanded={pickerOpen}
            aria-haspopup="true"
          >
            {monthLabel} <ChevronDown size={14} />
          </button>
          {pickerOpen && (
            <div className="apt-calendar-picker" ref={pickerRef}>
              <div className="apt-calendar-picker-head">Select month &amp; year</div>
              <div className="apt-calendar-picker-months">
                {MONTHS.map((name, index) => (
                  <button
                    type="button"
                    key={name}
                    className={index === monthStart.getMonth() ? 'is-active' : ''}
                    onClick={() => applyMonthYear(index, monthStart.getFullYear())}
                  >
                    {name.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div className="apt-calendar-picker-years">
                <label htmlFor="apt-calendar-picker-year">Year</label>
                <select
                  id="apt-calendar-picker-year"
                  aria-label="Select year"
                  value={monthStart.getFullYear()}
                  onChange={(event) => applyMonthYear(monthStart.getMonth(), Number(event.target.value))}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        {showMonthArrows && (
          <button type="button" className="icon-btn apt-calendar-arrow" onClick={handleNextMonth} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        )}
        <div className="apt-history-calendar-legend" aria-label="Appointment status legend">
          {isUserCalendar && <button type="button" className="apt-history-user-nav" aria-label="Next month" onClick={() => onRangeChange(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}><ChevronRight size={17} /></button>}
          <span className="is-pending">Upcoming</span>
          <span className="is-completed">Completed</span>
          <span className="is-cancelled">Cancelled</span>
          <span className="is-rescheduled">Rescheduled</span>
        </div>
      </div>

      <div className="apt-month-view apt-history-month-view">
        <div className="apt-month-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="apt-month-weekday">{day}</div>
          ))}
        </div>
        <div className="apt-month-grid">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="apt-month-week">
              {week.map((cell) => {
                const iso = toIsoDate(cell)
                const isCurrentMonth = cell.getMonth() === monthStart.getMonth() && cell.getFullYear() === monthStart.getFullYear()
                const isToday = iso === todayIso
                const isSelected = iso === selectedIso
                const breakdown = dayBreakdown(appointments, cell)
                return (
                  <div
                    key={iso}
                    className={[
                      'apt-month-cell',
                      'apt-history-cell',
                      isCurrentMonth ? '' : 'is-muted',
                      isToday ? 'is-today' : '',
                      isSelected ? 'is-selected' : '',
                      breakdown.total ? `has-${breakdown.pending.length ? 'pending' : breakdown.completed.length ? 'completed' : breakdown.cancelled.length ? 'cancelled' : 'rescheduled'}` : '',
                    ].filter(Boolean).join(' ')}
                    role="button"
                    tabIndex={0}
                    aria-label={`${formatDisplayDate(iso, true)}${breakdown.total ? `, ${breakdown.total} appointment${breakdown.total === 1 ? '' : 's'}` : ', no appointments'}`}
                    aria-pressed={isSelected}
                    onClick={(event) => { event.stopPropagation(); onSelectDate(cell) }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelectDate(cell)
                      }
                    }}
                  >
                    <div className="apt-month-day">{cell.getDate()}</div>
                    {isUserCalendar ? (
                      <div className="apt-history-cell-side">
                        {breakdown.pending.length > 0 && <span className="apt-history-status-item is-pending" title={`${breakdown.pending.length} upcoming appointment${breakdown.pending.length === 1 ? '' : 's'}`} aria-label={`${breakdown.pending.length} upcoming appointments`}><i aria-hidden="true" />{breakdown.pending.length}</span>}
                        {breakdown.completed.length > 0 && <span className="apt-history-status-item is-completed" title={`${breakdown.completed.length} completed appointment${breakdown.completed.length === 1 ? '' : 's'}`} aria-label={`${breakdown.completed.length} completed appointments`}><i aria-hidden="true" />{breakdown.completed.length}</span>}
                        {breakdown.cancelled.length > 0 && <span className="apt-history-status-item is-cancelled" title={`${breakdown.cancelled.length} cancelled appointment${breakdown.cancelled.length === 1 ? '' : 's'}`} aria-label={`${breakdown.cancelled.length} cancelled appointments`}><i aria-hidden="true" />{breakdown.cancelled.length}</span>}
                        {breakdown.rescheduled.length > 0 && <span className="apt-history-status-item is-rescheduled" title={`${breakdown.rescheduled.length} rescheduled appointment${breakdown.rescheduled.length === 1 ? '' : 's'}`} aria-label={`${breakdown.rescheduled.length} rescheduled appointments`}><i aria-hidden="true" />{breakdown.rescheduled.length}</span>}
                      </div>
                    ) : (
                      <>
                        {breakdown.total > 0 && <div className="apt-history-count" aria-hidden="true">{breakdown.total}</div>}
                        <div className="apt-history-cell-status" aria-hidden="true">
                          {breakdown.pending.length > 0 && <span className="is-pending">{breakdown.pending.length}</span>}
                          {breakdown.completed.length > 0 && <span className="is-completed">{breakdown.completed.length}</span>}
                          {breakdown.cancelled.length > 0 && <span className="is-cancelled">{breakdown.cancelled.length}</span>}
                          {breakdown.rescheduled.length > 0 && <span className="is-rescheduled">{breakdown.rescheduled.length}</span>}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
