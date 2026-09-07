import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
  const booked = dayApps.filter((appointment) => appointmentStatusBucket(appointment.status) === 'booked')
  const completed = dayApps.filter((appointment) => appointmentStatusBucket(appointment.status) === 'completed')
  const cancelled = dayApps.filter((appointment) => appointmentStatusBucket(appointment.status) === 'cancelled')
  const other = dayApps.filter((appointment) => appointment.status === 'No-show')
  return { total: dayApps.length, booked, completed, cancelled, other }
}

export default function HistoryCalendar({ appointments, rangeStart, onRangeChange, onSelectDate, selectedDate }) {
  const monthStart = startOfMonth(rangeStart)
  const gridStart = startOfWeek(monthStart, 0)
  const gridDates = useMemo(() => {
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      return date
    })
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

  const applyMonthYear = (month, year) => {
    onRangeChange(new Date(year, month, 1))
    onSelectDate(new Date(year, month, 1))
    setPickerOpen(false)
  }

  return (
    <div className="apt-scheduling-calendar apt-scheduling-calendar--history">
      <div className="apt-calendar-toolbar apt-history-toolbar">
        <div className="apt-calendar-nav">
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
        <div className="apt-history-calendar-legend" aria-label="Appointment status legend">
          <span className="is-booked">Booked</span>
          <span className="is-completed">Completed</span>
          <span className="is-cancelled">Cancelled</span>
        </div>
      </div>

      <div className="apt-scheduling-calendar__weekdays">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="apt-scheduling-calendar__grid">
        {gridDates.map((date) => {
          const iso = toIsoDate(date)
          const isCurrentMonth = date.getMonth() === monthStart.getMonth() && date.getFullYear() === monthStart.getFullYear()
          const isToday = iso === todayIso
          const isSelected = iso === selectedIso
          const breakdown = dayBreakdown(appointments, date)

          // Match the Monthly Schedule's signature green calendar exactly:
          // every date cell carries the same `is-available` green treatment
          // (var(--success-bg) background, green border + green text) used by
          // the Schedule's available days. Historical appointments are still
          // strictly view-only through the drawer gating.
          let state = 'available'
          if (breakdown.total > 0 && breakdown.booked.length === 0 && breakdown.completed.length === 0 && breakdown.cancelled.length > 0) state = 'closed'

          return (
            <button
              type="button"
              key={iso}
              className={[
                'apt-scheduling-date',
                `is-${state}`,
                isToday ? 'is-today' : '',
                isSelected ? 'is-history-selected' : '',
                isCurrentMonth ? '' : 'is-outside-month',
              ].filter(Boolean).join(' ')}
              aria-label={`${formatDisplayDate(iso, true)}${breakdown.total ? `, ${breakdown.total} appointment${breakdown.total === 1 ? '' : 's'}` : ', no appointments'}`}
              aria-pressed={isSelected}
              onClick={() => onSelectDate(date)}
            >
              <strong>{date.getDate()}</strong>
              {breakdown.total > 0 && (
                <em
                  aria-label={`${breakdown.booked.length} Booked, ${breakdown.completed.length} Completed, ${breakdown.cancelled.length} Cancelled`}
                >
                  {breakdown.booked.length > 0 && <b className="is-booked">{breakdown.booked.length} booked</b>}
                  {breakdown.completed.length > 0 && <b className="is-completed"> · {breakdown.completed.length} completed</b>}
                </em>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
