import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, CalendarDays } from 'lucide-react'
import {
  addDays,
  addMonths,
  startOfDay,
  startOfMonth,
  startOfWeek,
  isSameDay,
  formatDisplayDate,
  weekdayShort,
  toIsoDate,
  fromIsoDate,
  resolveAppointmentWindow,
  getAppointmentPhase,
  formatTimeRange,
  parseTimeToMinutes,
  generateAppointmentSlots,
  getAppointmentSlotSummary,
  getDateAvailability,
  isWithinSchedulingHorizon,
} from '../../../utils/appointments.js'
import { callTypeMeta } from './meta.jsx'

const WORKDAY_START_HOUR = 7
const WORKDAY_END_HOUR = 22
const DAY_EVENT_INSET = 4
const EVENT_GAP = 6

function getCalendarRangeStart(view, date) {
  if (view === 'day') return startOfDay(date)
  if (view === 'month') return startOfMonth(date)
  return startOfWeek(date)
}

function shiftCalendarRange(view, date, direction) {
  if (view === 'day') return addDays(startOfDay(date), direction)
  if (view === 'week') return addDays(startOfWeek(date), direction * 7)
  if (view === 'month') return addMonths(startOfMonth(date), direction)
  return startOfDay(date)
}

function buildCollisionLayout(dayAppointments) {
  const sorted = dayAppointments
    .map((appointment, index) => {
      const { startMin, endMin } = resolveAppointmentWindow(appointment)
      return { appointment, startMin, endMin, index }
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.index - b.index)

  const groups = []
  let currentGroup = []
  let currentGroupEnd = -Infinity

  sorted.forEach((item) => {
    if (!currentGroup.length || item.startMin < currentGroupEnd) {
      currentGroup.push(item)
      currentGroupEnd = Math.max(currentGroupEnd, item.endMin)
      return
    }

    groups.push(currentGroup)
    currentGroup = [item]
    currentGroupEnd = item.endMin
  })

  if (currentGroup.length) groups.push(currentGroup)

  return groups.flatMap((group) => {
    const active = []
    const laidOut = []
    let maxColumns = 0

    group.forEach((item) => {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i].endMin <= item.startMin) {
          active.splice(i, 1)
        }
      }

      const usedColumns = new Set(active.map((entry) => entry.col))
      let col = 0
      while (usedColumns.has(col)) col += 1

      active.push({ col, endMin: item.endMin })
      maxColumns = Math.max(maxColumns, active.length)
      laidOut.push({ ...item, col })
    })

    const totalGapPx = DAY_EVENT_INSET * 2 + EVENT_GAP * (maxColumns - 1)
    const columnWidth = `calc((100% - ${totalGapPx}px) / ${maxColumns})`

    return laidOut.map((item) => ({
      ...item,
      layout: {
        left: `calc(${DAY_EVENT_INSET}px + (${columnWidth}) * ${item.col} + ${EVENT_GAP * item.col}px)`,
        width: columnWidth,
        zIndex: 10 + item.col,
      },
    }))
  })
}

// ---- Day / Week view event rendering ------------------------------------

function EventBlock({ appointment, now, onClick, hourHeight = 56, layout }) {
  const meta = callTypeMeta(appointment.callType)
  const Icon = meta.icon
  const { startMin, endMin } = resolveAppointmentWindow(appointment)
  const duration = endMin - startMin
  const top = ((startMin - WORKDAY_START_HOUR * 60) / 60) * hourHeight
  const height = (duration / 60) * hourHeight
  const phaseResult = getAppointmentPhase(appointment, now)
  const phase = typeof phaseResult === 'string' ? phaseResult : phaseResult.phase
  const isLive = phase === 'live'
  const style = layout
    ? {
        top: `${top}px`,
        height: `${height}px`,
        left: layout.left,
        width: layout.width,
        zIndex: layout.zIndex,
      }
    : {
        top: `${top}px`,
        height: `${height}px`,
      }

  return (
    <div
      className={`apt-event${isLive ? ' apt-event--live' : ' apt-event--booked'}`}
      style={style}
      onClick={(event) => { event.stopPropagation(); onClick(appointment) }}
    >
      <div className="apt-event-time">{formatTimeRange(startMin, endMin)}</div>
      <div className="apt-event-name">{appointment.customerName}</div>
      <div className="apt-event-type">
        <Icon size={11} /> {meta.label}
      </div>
      {isLive && <span className="apt-event-live">Call Now</span>}
    </div>
  )
}

// ---- Day View -----------------------------------------------------------

function AvailabilityLayer({ date, template, appointments, now, hourHeight }) {
  const availability = getDateAvailability(template, date)
  const slots = generateAppointmentSlots({ template, date, appointments, now })
  const toStyle = (startMin, endMin) => ({ top: `${((startMin - WORKDAY_START_HOUR * 60) / 60) * hourHeight}px`, height: `${((endMin - startMin) / 60) * hourHeight}px` })
  return <div className="apt-availability-layer">
    {slots.map((slot) => <div key={`${slot.startMin}-${slot.endMin}`} className="apt-availability-block" style={toStyle(slot.startMin, slot.endMin)} />)}
    {(availability.breaks || []).map((item, index) => <div key={`break-${index}`} className="apt-break-block" style={toStyle(parseTimeToMinutes(item.start), parseTimeToMinutes(item.end))}>Break</div>)}
  </div>
}

function DayView({ appointments, allAppointments, availabilityTemplate, now, rangeStart, onSelect }) {
  const day = startOfDay(rangeStart)
  const dayIso = toIsoDate(day)
  const hours = Array.from({ length: WORKDAY_END_HOUR - WORKDAY_START_HOUR + 1 }, (_, i) => WORKDAY_START_HOUR + i)
  const hourHeight = 56

  const dayAppointments = appointments.filter((a) => a.dateIso === dayIso)
  const laidOutAppointments = buildCollisionLayout(dayAppointments)

  return (
    <div className="apt-day-view">
      <div className="apt-day-grid">
        <div className="apt-day-time-col">
          {hours.map((h) => (
            <div key={h} className="apt-day-hour-row" style={{ height: `${hourHeight}px` }}>
              <div className="apt-day-hour-label">{String(h).padStart(2, '0')}:00</div>
            </div>
          ))}
        </div>
        <div className="apt-day-body" style={{ height: `${hours.length * hourHeight}px` }}>
          <div className="apt-day-hour-lines">
            {hours.map((h) => (
              <div key={h} className="apt-day-hour-row" style={{ height: `${hourHeight}px` }}>
                <div className="apt-day-hour-line" />
              </div>
            ))}
          </div>
          <div className="apt-events-layer" style={{ height: `${hours.length * hourHeight}px` }}>
            <AvailabilityLayer date={day} template={availabilityTemplate} appointments={allAppointments} now={now} hourHeight={hourHeight} />
            {laidOutAppointments.map((appt) => (
              <EventBlock
                key={appt.id}
                appointment={appt.appointment}
                now={now}
                onClick={onSelect}
                hourHeight={hourHeight}
                layout={appt.layout}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Week View ----------------------------------------------------------

function WeekView({ appointments, allAppointments, availabilityTemplate, now, rangeStart, onSelect }) {
  const weekStart = startOfWeek(rangeStart)
  const weekStartIso = toIsoDate(weekStart)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hourHeight = 50
  const hours = Array.from({ length: WORKDAY_END_HOUR - WORKDAY_START_HOUR + 1 }, (_, i) => WORKDAY_START_HOUR + i)
  const [selectedDayIso, setSelectedDayIso] = useState(weekStartIso)

  useEffect(() => {
    setSelectedDayIso(weekStartIso)
  }, [weekStartIso])

  return (
    <div className="apt-week-view">
      <div className="apt-week-header">
        <div className="apt-week-corner" aria-hidden="true" />
        {days.map((d) => (
          <button
            key={toIsoDate(d)}
            type="button"
            className={`apt-week-day${isSameDay(d, new Date()) ? ' is-today' : ''}${selectedDayIso === toIsoDate(d) ? ' is-selected' : ''}`}
            onClick={() => setSelectedDayIso(toIsoDate(d))}
            aria-label={`Show appointments for ${formatDisplayDate(toIsoDate(d), true)}`}
            aria-pressed={selectedDayIso === toIsoDate(d)}
          >
            <div className="apt-week-day-name">{weekdayShort(toIsoDate(d))}</div>
            <div className="apt-week-day-date">{d.getDate()}</div>
          </button>
        ))}
      </div>
      <div className="apt-week-grid">
        <div className="apt-week-time-col">
          {hours.map((h) => (
            <div key={h} className="apt-week-hour" style={{ height: `${hourHeight}px` }}>
              <span>{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        <div className="apt-week-days">
          {days.map((d) => {
            const dayIso = toIsoDate(d)
            const dayAppointments = appointments.filter((a) => a.dateIso === dayIso)
            const laidOutAppointments = buildCollisionLayout(dayAppointments)
            return (
              <div
                key={dayIso}
                className={`apt-week-day-col${isSameDay(d, new Date()) ? ' is-today' : ''}${selectedDayIso === dayIso ? ' is-selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Show appointments for ${formatDisplayDate(dayIso, true)}`}
                aria-pressed={selectedDayIso === dayIso}
                onClick={() => setSelectedDayIso(dayIso)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedDayIso(dayIso)
                  }
                }}
              >
                <div className="apt-week-day-events" style={{ height: `${hours.length * hourHeight}px` }}>
                  <AvailabilityLayer date={d} template={availabilityTemplate} appointments={allAppointments} now={now} hourHeight={hourHeight} />
                  {laidOutAppointments.map((appt) => (
                    <EventBlock
                      key={appt.appointment.id}
                      appointment={appt.appointment}
                      now={now}
                      onClick={onSelect}
                      hourHeight={hourHeight}
                      layout={appt.layout}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---- Month View ---------------------------------------------------------

const DAY_EDIT_STATUSES = ['Available', 'Leave', 'Dyaan']

function getDateSchedule(availabilityTemplate, cell) {
  const iso = toIsoDate(cell)
  const override = availabilityTemplate?.dateOverrides?.[iso]
  if (override) return { ...override, breaks: override.breaks || [], isOverride: true }
  const weeklyDay = availabilityTemplate?.weeklySchedule?.find((day) => Number(day.dayIndex) === cell.getDay())
  return {
    status: weeklyDay?.enabled ? 'Available' : 'Leave',
    windows: weeklyDay?.enabled ? (weeklyDay.slots || []) : [],
    breaks: weeklyDay?.enabled ? (weeklyDay.breaks || []) : [],
    isOverride: false,
  }
}

function getDayEditPosition(event, container) {
  const cellRect = event.currentTarget.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const popupWidth = 300
  const popupHeight = 360
  const padding = 12

  let left = cellRect.left - containerRect.left + cellRect.width + 10
  if (left + popupWidth > containerRect.width - padding) left = cellRect.left - containerRect.left - popupWidth - 10
  left = Math.max(padding, Math.min(left, Math.max(padding, containerRect.width - popupWidth - padding)))

  let top = cellRect.top - containerRect.top
  if (top + popupHeight > containerRect.height - padding) top = containerRect.height - popupHeight - padding
  top = Math.max(padding, top)
  return { left, top }
}

function MonthView({ appointments, allAppointments, availabilityTemplate, _now, rangeStart, onSelect, onSaveDayOverride, onClearDayOverride }) {
  const monthStart = startOfMonth(rangeStart)
  const monthStartIso = toIsoDate(monthStart)
  const gridStart = startOfWeek(monthStart, 0)
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  const weeks = Array.from({ length: 6 }, (_, weekIndex) => cells.slice(weekIndex * 7, weekIndex * 7 + 7))

  const todayIso = toIsoDate(new Date())
  const monthNow = useMemo(() => (_now && new Date(_now)) || new Date(), [_now])
  const monthSummary = useMemo(() => {
    let totalAvailable = 0
    let totalBooked = 0
    cells.forEach((cellDay) => {
      const s = getAppointmentSlotSummary({ template: availabilityTemplate, date: cellDay, appointments: allAppointments, now: monthNow })
      totalAvailable += s.available
      totalBooked += s.booked
    })
    const upcomingCount = allAppointments.filter((appt) => {
      if (!appt.dateIso || appt.status === 'Cancelled' || appt.status === 'No-show' || appt.status === 'Auto-cancelled') return false
      const day = fromIsoDate(appt.dateIso)
      return day.getMonth() === monthStart.getMonth() && day.getFullYear() === monthStart.getFullYear()
    }).length
    return { totalAvailable, totalBooked, upcomingCount }
  }, [cells, availabilityTemplate, allAppointments, monthNow, monthStart])
  const [selectedDayPopup, setSelectedDayPopup] = useState(null)
  const [dayContextMenu, setDayContextMenu] = useState(null)
  const [selectedDayEdit, setSelectedDayEdit] = useState(null)
  const [dayEditDraft, setDayEditDraft] = useState(null)
  const monthGridRef = useRef(null)

  useEffect(() => {
    setSelectedDayPopup(null)
    setDayContextMenu(null)
    setSelectedDayEdit(null)
    setDayEditDraft(null)
  }, [monthStartIso])

  useEffect(() => {
    if (!selectedDayEdit) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDayContextMenu(null)
        setSelectedDayEdit(null)
        setDayEditDraft(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDayEdit])

  const selectedDayIso = selectedDayPopup?.iso || null
  const selectedDayAppointments = selectedDayIso
    ? appointments
        .filter((a) => a.dateIso === selectedDayIso)
        .slice()
        .sort((a, b) => resolveAppointmentWindow(a).startMin - resolveAppointmentWindow(b).startMin)
    : []
  const selectedDaySummary = selectedDayIso
    ? getAppointmentSlotSummary({ template: availabilityTemplate, date: fromIsoDate(selectedDayIso), appointments: allAppointments, now: monthNow })
    : null

  const openDayPopup = (iso, event) => {
    setDayContextMenu(null)
    setSelectedDayEdit(null)
    setDayEditDraft(null)
    const container = monthGridRef.current
    if (!container) {
      setSelectedDayPopup({ iso, left: 12, top: 12 })
      return
    }

    const cellRect = event.currentTarget.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const popupWidth = 320
    const popupHeight = Math.min(320, 132 + (appointments.filter((a) => a.dateIso === iso).length * 68))
    const padding = 12

    let left = cellRect.left - containerRect.left + cellRect.width + 12
    if (left + popupWidth > containerRect.width - padding) {
      left = cellRect.left - containerRect.left - popupWidth - 12
    }
    left = Math.max(padding, Math.min(left, containerRect.width - popupWidth - padding))

    let top = cellRect.top - containerRect.top + 12
    if (top + popupHeight > containerRect.height - padding) {
      top = Math.max(padding, cellRect.top - containerRect.top - popupHeight - 12)
    }
    top = Math.max(padding, Math.min(top, containerRect.height - popupHeight - padding))

    setSelectedDayPopup({ iso, left, top })
  }

  const openDayEditor = (cell, event, positionOverride = null) => {
    event?.preventDefault()
    const iso = toIsoDate(cell)
    const dayApps = allAppointments.filter((appointment) => appointment.dateIso === iso)
    const schedule = getDateSchedule(availabilityTemplate, cell)
    const isCurrentMonth = cell.getMonth() === monthStart.getMonth() && cell.getFullYear() === monthStart.getFullYear()
    if (!isCurrentMonth || dayApps.length || !isWithinSchedulingHorizon(cell, new Date(), 3)) return

    const position = positionOverride || (monthGridRef.current ? getDayEditPosition(event, monthGridRef.current) : { left: 12, top: 12 })
    setDayContextMenu(null)
    setSelectedDayPopup(null)
    setSelectedDayEdit({ iso, ...position })
    setDayEditDraft({
      status: DAY_EDIT_STATUSES.includes(schedule.status) ? schedule.status : 'Available',
      windows: schedule.windows.map((slot) => ({ start: slot.start, end: slot.end })),
      breaks: (schedule.breaks || []).map((item) => ({ start: item.start, end: item.end })),
    })
  }

  const updateDayEditWindow = (index, patch) => {
    setDayEditDraft((current) => ({
      ...current,
      windows: current.windows.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...patch } : slot),
    }))
  }

  const removeDayEditWindow = (index) => {
    setDayEditDraft((current) => ({ ...current, windows: current.windows.filter((_, slotIndex) => slotIndex !== index) }))
  }

  const closeDayEditor = () => {
    setSelectedDayEdit(null)
    setDayEditDraft(null)
  }

  return (
    <div className="apt-month-view">
      <div className="apt-cale-summary">
        <span className="apt-cale-summary__item"><i className="sw is-available" />{monthSummary.totalAvailable} available slots</span>
        <span className="apt-cale-summary__item"><i className="sw is-booked" />{monthSummary.totalBooked} booked slots</span>
        <span className="apt-cale-summary__item"><i className="sw is-upcoming" />{monthSummary.upcomingCount} upcoming appointments</span>
      </div>
      <div className="apt-cale-legend">
        <span><i className="sw is-available" />Available</span>
        <span><i className="sw is-booked" />Booked / Full</span>
        <span><i className="sw is-unavailable" />Unavailable</span>
        <span><i className="sw is-override" />Daily override</span>
        <span><i className="sw is-holiday" />Holiday</span>
      </div>
      <div className="apt-month-header">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
          <div key={w} className="apt-month-weekday">{w}</div>
        ))}
      </div>
      {selectedDayPopup && (
        <div
          className="apt-month-popover"
          role="dialog"
          aria-label={`Appointments for ${formatDisplayDate(selectedDayIso, true)}`}
          style={{ left: `${selectedDayPopup.left}px`, top: `${selectedDayPopup.top}px` }}
        >
          <div className="apt-month-popover__head">
            <div>
              <div className="apt-month-popover__title">{formatDisplayDate(selectedDayIso, true)}</div>
              <div className="apt-month-popover__sub">
                {selectedDayAppointments.length ? `${selectedDayAppointments.length} appointment${selectedDayAppointments.length === 1 ? '' : 's'}` : 'No appointments'}
                {selectedDaySummary && selectedDaySummary.total > 0 && (
                  <span className="apt-month-popover__counts">
                    · {selectedDaySummary.available} available · {selectedDaySummary.booked} booked
                  </span>
                )}
              </div>
            </div>
            <button type="button" className="icon-btn" aria-label="Close day popup" onClick={() => setSelectedDayPopup(null)}>
              <CalendarDays size={16} />
            </button>
          </div>
          <div className="apt-month-popover__list">
            {selectedDayAppointments.length ? (
              selectedDayAppointments.map((appt) => {
                const meta = callTypeMeta(appt.callType)
                const Icon = meta.icon
                const { startMin, endMin } = resolveAppointmentWindow(appt)
                return (
                  <button
                    key={appt.id}
                    type="button"
                    className="apt-month-popover__item"
                    onClick={() => onSelect(appt)}
                  >
                    <div className="apt-month-popover__time">{formatTimeRange(startMin, endMin)}</div>
                    <div className="apt-month-popover__name">
                      <Icon size={12} />
                      <span>{appt.customerName}</span>
                    </div>
                    <div className="apt-month-popover__meta">{meta.label}</div>
                  </button>
                )
              })
            ) : (
              <div className="apt-month-popover__empty">No appointments for this day</div>
            )}
          </div>
        </div>
      )}
      {dayContextMenu && (
        <div
          className="apt-month-context-menu"
          role="menu"
          aria-label={`Actions for ${formatDisplayDate(dayContextMenu.iso, true)}`}
          style={{ left: `${dayContextMenu.left}px`, top: `${dayContextMenu.top}px` }}
        >
          <div className="apt-month-context-menu__date">{formatDisplayDate(dayContextMenu.iso, true)}</div>
          <button
            type="button"
            role="menuitem"
            onClick={(event) => openDayEditor(dayContextMenu.cell, event, dayContextMenu.position)}
          >
            Edit day
          </button>
        </div>
      )}
      {selectedDayEdit && dayEditDraft && (
        <div
          className="apt-month-day-editor"
          role="dialog"
          aria-label={`Edit availability for ${formatDisplayDate(selectedDayEdit.iso, true)}`}
          style={{ left: `${selectedDayEdit.left}px`, top: `${selectedDayEdit.top}px` }}
        >
          <div className="apt-month-day-editor__head">
            <div>
              <strong>Edit day</strong>
              <span>{formatDisplayDate(selectedDayEdit.iso, true)}</span>
            </div>
            <button type="button" className="icon-btn" aria-label="Close day editor" onClick={closeDayEditor}><CalendarDays size={15} /></button>
          </div>
          <label className="apt-month-day-editor__field">
            <span>Day status</span>
            <select value={dayEditDraft.status} onChange={(event) => setDayEditDraft((current) => ({ ...current, status: event.target.value }))}>
              {DAY_EDIT_STATUSES.map((status) => <option key={status} value={status}>{status === 'Dyaan' ? 'Dyaan / DND' : status}</option>)}
            </select>
          </label>
          <div className="apt-month-day-editor__windows">
            <div className="apt-month-day-editor__label">Time windows</div>
            {dayEditDraft.windows.map((slot, index) => (
              <div className="apt-month-day-editor__window" key={`${selectedDayEdit.iso}-${index}`}>
                <input type="time" value={slot.start} aria-label={`Window ${index + 1} start`} onChange={(event) => updateDayEditWindow(index, { start: event.target.value })} />
                <span>to</span>
                <input type="time" value={slot.end} aria-label={`Window ${index + 1} end`} onChange={(event) => updateDayEditWindow(index, { end: event.target.value })} />
                <button type="button" className="icon-btn" aria-label={`Remove window ${index + 1}`} onClick={() => removeDayEditWindow(index)}><span aria-hidden="true">×</span></button>
              </div>
            ))}
            <button type="button" className="apt-month-day-editor__add" disabled={dayEditDraft.windows.length >= 3} onClick={() => setDayEditDraft((current) => ({ ...current, windows: [...current.windows, { start: '09:00', end: '10:00' }] }))}>+ Add window</button>
          </div>
          <div className="apt-month-day-editor__windows">
            <div className="apt-month-day-editor__label">Break times</div>
            {dayEditDraft.breaks.map((slot, index) => <div className="apt-month-day-editor__window" key={`break-${index}`}><input type="time" value={slot.start} aria-label={`Break ${index + 1} start`} onChange={(event) => setDayEditDraft((current) => ({ ...current, breaks: current.breaks.map((item, itemIndex) => itemIndex === index ? { ...item, start: event.target.value } : item) }))} /><span>to</span><input type="time" value={slot.end} aria-label={`Break ${index + 1} end`} onChange={(event) => setDayEditDraft((current) => ({ ...current, breaks: current.breaks.map((item, itemIndex) => itemIndex === index ? { ...item, end: event.target.value } : item) }))} /><button type="button" className="icon-btn" aria-label={`Remove break ${index + 1}`} onClick={() => setDayEditDraft((current) => ({ ...current, breaks: current.breaks.filter((_, itemIndex) => itemIndex !== index) }))}><span aria-hidden="true">×</span></button></div>)}
            <button type="button" className="apt-month-day-editor__add" onClick={() => setDayEditDraft((current) => ({ ...current, breaks: [...current.breaks, { start: '13:00', end: '14:00' }] }))}>+ Add break</button>
          </div>
          <div className="apt-month-day-editor__actions">
            <button type="button" className="btn btn-ghost" onClick={() => { onClearDayOverride?.(selectedDayEdit.iso); closeDayEditor() }}>Clear override</button>
            <button type="button" className="btn btn-primary" onClick={() => { onSaveDayOverride?.(selectedDayEdit.iso, dayEditDraft); closeDayEditor() }}>Save day</button>
          </div>
        </div>
      )}
      <div className="apt-month-grid" ref={monthGridRef}>
        {weeks.map((week, wi) => (
          <div key={wi} className="apt-month-week">
            {week.map((cell) => {
              const iso = toIsoDate(cell)
              const dayApps = appointments.filter((a) => a.dateIso === iso)
              const allDayApps = allAppointments.filter((a) => a.dateIso === iso)
              const scheduleInfo = getDateAvailability(availabilityTemplate, cell)
              const summary = getAppointmentSlotSummary({
                template: availabilityTemplate,
                date: cell,
                appointments: allAppointments,
                now: _now && new Date(_now) || new Date(),
              })
              const isToday = iso === todayIso
              const isCurrentMonth = cell.getMonth() === monthStart.getMonth() && cell.getFullYear() === monthStart.getFullYear()
              let cellState = 'unavailable'
              let cellStateLabel = 'Unavailable'
              if (scheduleInfo.holiday) {
                cellState = 'holiday'
                cellStateLabel = 'Holiday'
              } else if (scheduleInfo.isOverride) {
                cellState = 'override'
                cellStateLabel = 'Daily override'
              } else if (scheduleInfo.status !== 'Available') {
                cellState = 'unavailable'
                cellStateLabel = 'Unavailable'
              } else if (summary.total > 0) {
                cellState = summary.available > 0 ? 'available' : 'full'
                cellStateLabel = summary.available > 0 ? `${summary.available} available` : 'Full / Booked'
              } else {
                cellState = 'unavailable'
                cellStateLabel = 'No slots'
              }
              const isUnavailable = cellState === 'unavailable' || cellState === 'holiday'
              return (
                <div
                  key={iso}
                  className={`apt-month-cell${isToday ? ' is-today' : ''}${!isCurrentMonth ? ' is-muted' : ''}${isUnavailable ? ' is-unavailable' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Show appointments for ${formatDisplayDate(iso, true)}`}
                  onClick={(event) => openDayPopup(iso, event)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    if (!allDayApps.length && isWithinSchedulingHorizon(cell, new Date(), 3)) {
                      const position = monthGridRef.current ? getDayEditPosition(event, monthGridRef.current) : { left: 12, top: 12 }
                      setSelectedDayPopup(null)
                      setSelectedDayEdit(null)
                      setDayEditDraft(null)
                      setDayContextMenu({ iso, cell, left: position.left, top: position.top, position })
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openDayPopup(iso, event)
                    }
                  }}
                >
                  <div className="apt-month-day">{cell.getDate()}</div>
                  <div className={`apt-month-availability apt-month-availability--${cellState}`}>
                    {cellStateLabel}
                  </div>
                  {(cellState === 'available' || cellState === 'full' || cellState === 'override') && summary.total > 0 && (
                    <div className="apt-month-counts">
                      <span className="is-avail">{summary.available} available</span>
                      <span className="is-booked">{summary.booked} booked</span>
                    </div>
                  )}
                  <div className="apt-month-events">
                    {dayApps.slice(0, 3).map((appt) => {
                      const meta = callTypeMeta(appt.callType)
                      const Icon = meta.icon
                      return (
                        <div
                          key={appt.id}
                          className="apt-month-event"
                          onClick={(event) => { event.stopPropagation(); onSelect(appt) }}
                        >
                          <Icon size={9} />
                          {appt.customerName}
                        </div>
                      )
                    })}
                    {dayApps.length > 3 && (
                      <div className="apt-month-more">+{dayApps.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Main Calendar ------------------------------------------------------

export default function AppointmentCalendar({ appointments, allAppointments = appointments, availabilityTemplate, now, view, rangeStart, statusFilter, statusOptions, search, onStatusFilterChange, onSearchChange, onViewChange, onRangeChange, onSelect, onSaveDayOverride, onClearDayOverride, isPreview = false }) {
  const visibleStart = getCalendarRangeStart(view, rangeStart)
  const handlePrevious = () => onRangeChange(shiftCalendarRange(view, visibleStart, -1))
  const handleNext = () => {
    const next = shiftCalendarRange(view, visibleStart, 1)
    if (isPreview || isWithinSchedulingHorizon(next, new Date(), 3)) onRangeChange(next)
  }
  const handleToday = () => onRangeChange(getCalendarRangeStart(view, new Date()))

  return (
    <div className="apt-calendar">
      <div className="apt-calendar-toolbar">
        <div className="apt-calendar-nav">
          <button type="button" className="icon-btn" onClick={handlePrevious} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn btn-ghost apt-today-btn" onClick={handleToday}>
            Today
          </button>
          <button type="button" className="icon-btn" onClick={handleNext} aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="apt-calendar-title">{formatDisplayDate(toIsoDate(visibleStart), true)}</div>
        <div className="apt-calendar-toolbar__filters">
          {!isPreview && <>
            <label className="sr-only" htmlFor="appointment-filter-select">Appointment filter</label>
            <select
              id="appointment-filter-select"
              className="apt-view-dropdown"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
            >
              {statusOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
            <label className="sr-only" htmlFor="appointment-search">Search appointments</label>
            <div className="apt-calendar-search">
              <Search size={15} />
              <input id="appointment-search" type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search appointments..." />
            </div>
          </>}
          <label className="sr-only" htmlFor="calendar-view-select">Calendar view</label>
          <select id="calendar-view-select" className="apt-view-dropdown" value={view} onChange={(event) => onViewChange(event.target.value)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {view === 'day' && <DayView appointments={appointments} allAppointments={allAppointments} availabilityTemplate={availabilityTemplate} now={now} rangeStart={visibleStart} onSelect={onSelect} />}
      {view === 'week' && <WeekView appointments={appointments} allAppointments={allAppointments} availabilityTemplate={availabilityTemplate} now={now} rangeStart={visibleStart} onSelect={onSelect} />}
      {view === 'month' && <MonthView appointments={appointments} allAppointments={allAppointments} availabilityTemplate={availabilityTemplate} now={now} rangeStart={visibleStart} onSelect={onSelect} onSaveDayOverride={onSaveDayOverride} onClearDayOverride={onClearDayOverride} />}
    </div>
  )
}
