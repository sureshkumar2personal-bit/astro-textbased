import { createPortal } from 'react-dom'
import { useMemo, useState } from 'react'
import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAppData } from '../../../state/AppDataContext.jsx'
import {
  addMonths,
  format12h,
  generateAppointmentSlots,
  isWithinSchedulingHorizon,
  parseDurationToMinutes,
  startOfMonth,
  toIsoDate,
} from '../../../utils/appointments.js'

const monthKey = (date) =>
  `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}`

const t24 = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(
    2,
    '0',
  )}:${String(minutes % 60).padStart(2, '0')}`

const dateLabel = (date) =>
  date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

// Sensible default working schedule used only when the astrologer has not yet
// configured a weekly availability template for the target month. Editing the
// working hours in the Schedule panel automatically flows into this modal
// because both go through the same generateAppointmentSlots engine.
const DEFAULT_APPOINTMENT_WINDOWS = {
  0: [],
  1: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  2: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  3: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  4: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  5: [
    { start: '09:00', end: '13:00' },
    { start: '16:00', end: '20:00' },
  ],
  6: [{ start: '10:00', end: '14:00' }],
}

function defaultTemplate(durationMin) {
  return {
    astrologerId: null,
    monthKey: null,
    appointmentDuration: durationMin,
    appointmentPrice: 799,
    status: 'Published',
    dateOverrides: {},
    weeklySchedule: [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
      dayIndex,
      enabled: DEFAULT_APPOINTMENT_WINDOWS[dayIndex].length > 0,
      slots: DEFAULT_APPOINTMENT_WINDOWS[dayIndex].map((w) => ({ ...w })),
      breaks: [],
    })),
  }
}

export default function RescheduleModal({
  appointment,
  appointments = [],
  astrologerId,
  onClose,
}) {
  const { appointmentAvailabilityTemplates, actions } =
    useAppData()

  const [month, setMonth] = useState(
    () => new Date(),
  )
  const [selectedDate, setSelectedDate] = useState(
    null,
  )
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  const durationMin =
    parseDurationToMinutes(appointment.duration) ||
    30

  const template = useMemo(() => {
    const key = monthKey(month)
    const found =
      appointmentAvailabilityTemplates.find(
        (item) =>
          item.astrologerId === astrologerId &&
          item.monthKey === key,
      )
    // Use the selected duration so generated slots match the appointment.
    // Fall back to a sensible default working schedule when the astrologer has
    // not configured availability yet; the engine still guards working hours.
    return found
      ? { ...found, appointmentDuration: durationMin }
      : defaultTemplate(durationMin)
  }, [
    appointmentAvailabilityTemplates,
    astrologerId,
    month,
    durationMin,
  ])

  const now = useMemo(() => new Date(), [])

  const days = useMemo(() => {
    const first = startOfMonth(month)
    const gridStart = new Date(
      first.getFullYear(),
      first.getMonth(),
      1 - new Date(first).getDay(),
    )
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      return d
    })
  }, [month])

  const availableSlotsFor = (date) =>
    generateAppointmentSlots({
      template,
      date,
      appointments,
      now,
    })

  const selectedCalendarDay = selectedDate
    ? new Date(selectedDate)
    : null

  const selectedSlots = selectedCalendarDay
    ? availableSlotsFor(selectedCalendarDay)
    : []

  const onPickDay = (date) => {
    if (!isWithinSchedulingHorizon(date, now, 3)) return
    setSelectedDate(date)
    setNotice(null)
  }

  const onConfirm = (slot) => {
    if (saving) return
    const iso = toIsoDate(selectedCalendarDay)
    setSaving(true)
    const newId = actions.rescheduleAppointment({
      originalId: appointment.id,
      date: dateLabel(selectedCalendarDay),
      dateIso: iso,
      time: format12h(slot.startMin),
      start: t24(slot.startMin),
      end: t24(slot.endMin),
    })
    if (newId) {
      setNotice(`Rescheduled to ${dateLabel(selectedCalendarDay)} at ${format12h(slot.startMin)}.`)
      window.setTimeout(onClose, 1200)
    } else {
      setSaving(false)
      setNotice('Could not reschedule this appointment. It may already be rescheduled or completed.')
    }
  }

  return createPortal(
    <div
      className="apt-drawer-overlay apt-reschedule-overlay"
      onClick={onClose}
    >
      <div
        className="apt-reschedule"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="apt-reschedule-head">
          <div>
            <h2>Reschedule Appointment</h2>
            <span>
              {appointment.customerName} ·{' '}
              {appointment.date || dateLabel(new Date(appointment.dateIso))}{' '}
              · {durationMin} min
            </span>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="apt-reschedule-calendar">
          <div className="apt-reschedule-month">
            <button
              type="button"
              className="icon-btn"
              aria-label="Previous month"
              disabled={month <= startOfMonth(now)}
              onClick={() =>
                setMonth(addMonths(month, -1))
              }
            >
              <ChevronLeft size={16} />
            </button>
            <strong>
              {month.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </strong>
            <button
              type="button"
              className="icon-btn"
              aria-label="Next month"
              disabled={
                !isWithinSchedulingHorizon(
                  addMonths(startOfMonth(month), 1),
                  now,
                  3,
                )
              }
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="apt-reschedule-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
              (day) => (
                <span key={day}>{day}</span>
              ),
            )}
          </div>

          <div className="apt-reschedule-grid">
            {days.map((day) => {
              const iso = toIsoDate(day)
              const inMonth =
                day.getMonth() === month.getMonth()
              const inHorizon = isWithinSchedulingHorizon(
                day,
                now,
                3,
              )
              const count = inHorizon
                ? availableSlotsFor(day).length
                : 0
              const available = inHorizon && count > 0
              const selected = selectedDate
                ? toIsoDate(selectedDate) === iso
                : false
              return (
                <button
                  type="button"
                  key={iso}
                  disabled={!available}
                  className={`${available ? 'is-available' : ''}${
                    selected ? ' is-selected' : ''
                  }${inMonth ? '' : ' is-outside'}`}
                  onClick={() => onPickDay(day)}
                >
                  <b>{day.getDate()}</b>
                  {available && <small>{count}</small>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="apt-reschedule-body">
          {selectedSlots.length ? (
            <>
              <div className="apt-reschedule-label">
                Available times for{' '}
                {dateLabel(selectedCalendarDay)}
              </div>
              <div className="apt-reschedule-slots">
                {selectedSlots.map((slot) => (
                  <button
                    type="button"
                    key={slot.startMin}
                    className="apt-reschedule-slot"
                    onClick={() => onConfirm(slot)}
                  >
                    <CalendarCheck2 size={15} />
                    <span>
                      {format12h(slot.startMin)} –{' '}
                      {format12h(slot.endMin)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            selectedCalendarDay && (
              <div className="apt-reschedule-empty">
                No available slots on this date. Select another
                available date.
              </div>
            )
          )}

          {notice && (
            <div className="apt-reschedule-notice">
              {notice}
            </div>
          )}
        </div>

        <footer className="apt-reschedule-foot">
          <span>
            Only slots inside your working hours and free of
            clashes are shown.
          </span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}