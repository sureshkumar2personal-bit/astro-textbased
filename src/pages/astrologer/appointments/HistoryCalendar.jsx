import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
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
  const booked = dayApps.filter((appointment) => appointmentStatusBucket(appointment.status) === 'booked')
  const completed = dayApps.filter((appointment) => appointmentStatusBucket(appointment.status) === 'completed')
  const cancelled = dayApps.filter((appointment) => appointmentStatusBucket(appointment.status) === 'cancelled')
  const other = dayApps.filter((appointment) => appointment.status === 'No-show')
  return { total: dayApps.length, booked, completed, cancelled, other }
}

export default function HistoryCalendar({ appointments, rangeStart, onRangeChange, onSelectDate, selectedDate }) {
  const monthStart = startOfMonth(rangeStart)
  const gridStart = startOfWeek(monthStart, 0)
  const weeks = useMemo(() => {
    const cells = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      return date
    })
    return Array.from({ length: 6 }, (_, weekIndex) => cells.slice(weekIndex * 7, weekIndex * 7 + 7))
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

  const handlePrevious = () => onRangeChange(addMonths(monthStart, -1))
  const handleNext = () => onRangeChange(addMonths(monthStart, 1))
  const handleToday = () => {
    const now = new Date()
    onRangeChange(startOfMonth(now))
    onSelectDate(now)
  }
  const applyMonthYear = (month, year) => {
    onRangeChange(new Date(year, month, 1))
    onSelectDate(new Date(year, month, 1))
    setPickerOpen(false)
  }

  return (
    <div className="apt-calendar apt-history-calendar">
      <div className="apt-calendar-toolbar">
        <div className="apt-calendar-nav">
          <button type="button" className="icon-btn" onClick={handlePrevious} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn btn-ghost apt-today-btn" onClick={handleToday}>
            Today
          </button>
          <button type="button" className="icon-btn" onClick={handleNext} aria-label="Next month">
            <ChevronRight size={18} />
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
        <div className="apt-history-calendar-legend" aria-label="Appointment status legend">
          <span className="is-booked">Booked</span>
          <span className="is-completed">Completed</span>
          <span className="is-cancelled">Cancelled</span>
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
                      breakdown.total ? `has-${breakdown.completed.length ? 'completed' : breakdown.cancelled.length ? 'cancelled' : 'booked'}` : '',
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
                    {breakdown.total > 0 && (
                      <div className="apt-history-count" aria-hidden="true">{breakdown.total}</div>
                    )}
                    <div className="apt-history-cell-status" aria-hidden="true">
                      {breakdown.booked.length > 0 && <span className="is-booked">{breakdown.booked.length}</span>}
                      {breakdown.completed.length > 0 && <span className="is-completed">{breakdown.completed.length}</span>}
                      {breakdown.cancelled.length > 0 && <span className="is-cancelled">{breakdown.cancelled.length}</span>}
                    </div>
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
