import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Edit3,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useAppData } from '../../../state/AppDataContext.jsx'
import Card from '../../../components/ui/Card.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import {
  format12h,
  fromIsoDate,
  generateAppointmentSlots,
  getAppointmentSlotSummary,
  getDateAvailability,
  isWithinSchedulingHorizon,
  parseTimeToMinutes,
  toIsoDate,
} from '../../../utils/appointments.js'

const DAYS = [
  { dayIndex: 1, label: 'Monday' },
  { dayIndex: 2, label: 'Tuesday' },
  { dayIndex: 3, label: 'Wednesday' },
  { dayIndex: 4, label: 'Thursday' },
  { dayIndex: 5, label: 'Friday' },
  { dayIndex: 6, label: 'Saturday' },
  { dayIndex: 0, label: 'Sunday' },
]

const DEFAULT_WINDOWS = [{ start: '09:00', end: '16:00' }]

const DURATIONS = [15, 30]

const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const monthDate = (key) => {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

const monthLabel = (date) =>
  date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

const cloneWindow = (item = {}) => ({
  start: item.start || '09:00',
  end: item.end || '16:00',
})

function createDraft(astrologerId, key, source) {
  const template = source || {}

  return {
    id:
      template.id ||
      `appointment-availability-${astrologerId}-${key}`,
    astrologerId,
    monthKey: key,
    monthLabel: monthLabel(monthDate(key)),
    timezone: 'Asia/Kolkata',
    appointmentDuration: DURATIONS.includes(
      Number(template.appointmentDuration),
    )
      ? Number(template.appointmentDuration)
      : 30,
    appointmentPrice:
      Number.isFinite(Number(template.appointmentPrice))
        ? Number(template.appointmentPrice)
        : 799,
    status: template.status === 'Published' ? 'Published' : 'Draft',
    publishedAt: template.publishedAt || null,
    updatedAt: template.updatedAt || null,
    dateOverrides: {
      ...(template.dateOverrides || {}),
    },
    weeklySchedule: DAYS.map(({ dayIndex }) => {
      const existing = template.weeklySchedule?.find(
        (day) => Number(day.dayIndex) === dayIndex,
      )

      return {
        dayIndex,
        enabled: existing
          ? existing.enabled !== false
          : dayIndex !== 0,
        slots:
          existing?.slots?.length
            ? existing.slots.map(cloneWindow)
            : dayIndex === 0
              ? []
              : DEFAULT_WINDOWS.map(cloneWindow),
        breaks: (existing?.breaks || []).map(cloneWindow),
      }
    }),
  }
}

function isValidRange(item) {
  return (
    parseTimeToMinutes(item.start) <
    parseTimeToMinutes(item.end)
  )
}

function TimeRange({
  item,
  onChange,
  onRemove,
  label,
}) {
  return (
    <div className="apt-schedule-range">
      <span>{label}</span>

      <input
        type="time"
        value={item.start}
        onChange={(event) =>
          onChange({
            start: event.target.value,
          })
        }
        aria-label={`${label} start`}
      />

      <b>→</b>

      <input
        type="time"
        value={item.end}
        onChange={(event) =>
          onChange({
            end: event.target.value,
          })
        }
        aria-label={`${label} end`}
      />

      {onRemove && (
        <button
          type="button"
          className="icon-btn"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

// Simplified single working-hours editor used by both the Weekly and Daily
// schedules. It intentionally exposes one simple concept per day: is the day
// working, and is it all-day or a single time range. Existing break data is
// preserved (so the slot engine keeps honouring stored breaks) but is not
// edited here to keep the section simple.
const ALL_DAY_WINDOW = { start: '00:00', end: '23:59' }

function isAllDayWindow(item) {
  return Boolean(item) && item.start === '00:00' && item.end === '23:59'
}

function DayHoursEditor({ schedule, onChange, daily = false }) {
  const windowsKey = daily ? 'windows' : 'slots'
  const enabled = daily
    ? (schedule.status || 'Available') === 'Available'
    : schedule.enabled !== false
  const firstWindow = (schedule?.[windowsKey] || [])[0] || DEFAULT_WINDOWS[0]
  const allDay = isAllDayWindow(firstWindow)

  const setEnabled = (checked) => {
    const windows = checked
      ? (schedule?.[windowsKey] || []).length
        ? schedule[windowsKey]
        : DEFAULT_WINDOWS.map(cloneWindow)
      : []
    onChange({
      ...schedule,
      ...(daily
        ? { status: checked ? 'Available' : 'Unavailable' }
        : { enabled: checked }),
      [windowsKey]: windows,
    })
  }

  const setSingleWindow = (patch = {}) => {
    onChange({
      ...schedule,
      [windowsKey]: [
        {
          ...firstWindow,
          ...(allDay ? DEFAULT_WINDOWS[0] : {}),
          ...patch,
        },
      ],
    })
  }

  const toggleAllDay = (checked) => {
    setSingleWindow(
      checked
        ? ALL_DAY_WINDOW
        : { start: DEFAULT_WINDOWS[0].start, end: DEFAULT_WINDOWS[0].end },
    )
  }

  return (
    <div className="apt-schedule-editor">
      <label className="apt-availability-switch">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) =>
            setEnabled(event.target.checked)
          }
        />

        <span>Available for appointments</span>

        <em>
          {enabled ? 'Working day' : 'Unavailable'}
        </em>
      </label>

      {enabled && (
        <div className="apt-schedule-group">
          <label className="apt-all-day">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) =>
                toggleAllDay(event.target.checked)
              }
            />
            <span>All Day</span>
          </label>

          {!allDay && (
            <TimeRange
              item={firstWindow}
              label="Working hours"
              onChange={(patch) =>
                setSingleWindow(patch)
              }
            />
          )}
        </div>
      )}
    </div>
  )
}

function SlotStatus({ slot }) {
  const label =
    slot.status === 'booked'
      ? slot.appointment?.status || 'Booked'
      : 'Available'

  const className =
    slot.status === 'booked'
      ? 'apt-slot-status is-booked'
      : 'apt-slot-status is-available'

  return (
    <span className={className}>
      <i />
      {label}
    </span>
  )
}

function DateSummaryModal({
  date,
  template,
  appointments,
  now,
  onClose,
  onEdit,
  onToggleBook,
}) {
  if (!date || !template) return null

  const iso = toIsoDate(date)
  const availability = getDateAvailability(
    template,
    date,
  )

  const summary = getAppointmentSlotSummary({
    template,
    date,
    appointments,
    now,
  })

  const holiday = availability.holiday

  return (
    <div
      className="apt-summary-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="apt-summary-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Appointment availability summary"
      >
        <div className="apt-summary-modal__head">
          <div>
            <span>Appointment Summary</span>
            <h3>
              {date.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h3>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close summary"
          >
            <X size={18} />
          </button>
        </div>

        {holiday && (
          <div className="apt-holiday-banner">
            <CalendarDays size={17} />

            <div>
              <strong>
                Government Holiday
              </strong>
              <span>
                {holiday.name} · This date is
                unavailable by default. You can
                override it and make it available.
              </span>
            </div>
          </div>
        )}

        <div className="apt-summary-stats">
          <div>
            <span>Working Hours</span>
            <strong>
              {availability.windows?.length
                ? availability.windows
                    .map(
                      (window) =>
                        `${format12h(
                          parseTimeToMinutes(
                            window.start,
                          ),
                        )} – ${format12h(
                          parseTimeToMinutes(
                            window.end,
                          ),
                        )}`,
                    )
                    .join(' · ')
                : 'Not available'}
            </strong>
          </div>

          <div>
            <span>Duration</span>
            <strong>
              {template.appointmentDuration} Minutes
            </strong>
          </div>

          <div>
            <span>Total Slots</span>
            <strong>{summary.total}</strong>
          </div>

          <div>
            <span>Booked</span>
            <strong>{summary.booked}</strong>
          </div>

          <div>
            <span>Remaining</span>
            <strong>{summary.available}</strong>
          </div>
        </div>

        <div className="apt-summary-slot-section">
          <div className="apt-summary-slot-head">
            <div>
              <h4>Appointment Slots</h4>
              <p>
                Cancelled appointments automatically
                free their slots.
              </p>
            </div>

            <StatusBadge
              label={
                availability.status === 'Available'
                  ? summary.available > 0
                    ? 'Available'
                    : 'Fully Booked'
                  : 'Unavailable'
              }
            />
          </div>

          {summary.slots.length ? (
            <div className="apt-summary-slots">
              {summary.slots.map((slot) => (
                <div
                  className="apt-summary-slot"
                  key={`${iso}-${slot.startMin}`}
                >
                  <div>
                    <Clock3 size={14} />
                    <strong>
                      {format12h(slot.startMin)}
                      {' – '}
                      {format12h(slot.endMin)}
                    </strong>
                  </div>

                  <div className="apt-summary-slot__actions">
                    <SlotStatus slot={slot} />
                    {slot.status === 'available' && onToggleBook && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => onToggleBook(slot.startMin)}
                      >
                        Mark Booked
                      </button>
                    )}
                    {slot.manual && onToggleBook && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => onToggleBook(slot.startMin)}
                      >
                        Mark Available
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="apt-summary-empty">
              <Clock3 size={20} />
              <strong>
                No appointment slots
              </strong>
              <span>
                This date currently has no
                bookable slots.
              </span>
            </div>
          )}
        </div>

        <div className="apt-summary-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onEdit}
          >
            <Edit3 size={15} />
            Edit Daily Schedule
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppointmentAvailabilityPanel({
  astrologerId,
  appointments = [],
}) {
  const {
    appointmentAvailabilityTemplates,
    actions,
  } = useAppData()

  const today = useMemo(
    () => new Date(),
    [],
  )

  const [mode, setMode] = useState('weekly')
  const [selectedMonth, setSelectedMonth] =
    useState(
      () =>
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        ),
    )

  const [selectedDate, setSelectedDate] =
    useState(() => toIsoDate(today))

  const [selectedSummaryDate, setSelectedSummaryDate] =
    useState(null)

  const [breakReminderDismissed, setBreakReminderDismissed] =
    useState(false)

  const [drafts, setDrafts] = useState({})

  const key = monthKey(selectedMonth)

  const source = appointmentAvailabilityTemplates.find(
    (template) =>
      template.astrologerId === astrologerId &&
      template.monthKey === key,
  )

  const draft =
    drafts[key] ||
    createDraft(
      astrologerId,
      key,
      source,
    )

  useEffect(() => {
    setDrafts((current) => {
      const nextDraft = createDraft(
        astrologerId,
        key,
        source,
      )

      const existing = current[key]

      if (
        existing &&
        existing.updatedAt === source?.updatedAt
      ) {
        return current
      }

      if (existing && !source) {
        return current
      }

      return {
        ...current,
        [key]: existing || nextDraft,
      }
    })
  }, [
    astrologerId,
    key,
    source,
  ])

  const update = (mutator) => {
    setDrafts((current) => {
      const currentDraft =
        current[key] ||
        createDraft(
          astrologerId,
          key,
          source,
        )

      return {
        ...current,
        [key]: {
          ...mutator(currentDraft),
          status: 'Draft',
          updatedAt:
            new Date().toISOString(),
        },
      }
    })
  }

  const save = (publish) => {
    const currentDraft =
      drafts[key] ||
      createDraft(
        astrologerId,
        key,
        source,
      )

    const cleanedWeeklySchedule =
      currentDraft.weeklySchedule.map(
        (day) => ({
          ...day,
          slots: (day.slots || []).filter(
            isValidRange,
          ),
          breaks: (day.breaks || []).filter(
            isValidRange,
          ),
        }),
      )

    const cleanedOverrides =
      Object.fromEntries(
        Object.entries(
          currentDraft.dateOverrides || {},
        ).map(
          ([dateIso, override]) => [
            dateIso,
            {
              ...override,
              windows: (
                override.windows || []
              ).filter(isValidRange),
              breaks: (
                override.breaks || []
              ).filter(isValidRange),
            },
          ],
        ),
      )

    const nextDraft = {
      ...currentDraft,
      weeklySchedule:
        cleanedWeeklySchedule,
      dateOverrides:
        cleanedOverrides,
    }

    const result = publish
      ? actions.publishAppointmentAvailabilityTemplate(
          nextDraft,
        )
      : actions.saveAppointmentAvailabilityTemplate(
          nextDraft,
        )

    if (result) {
      setDrafts((current) => ({
        ...current,
        [key]: result,
      }))
    }
  }

  const moveMonth = (direction) => {
    const next = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + direction,
      1,
    )

    if (
      isWithinSchedulingHorizon(
        next,
        today,
        3,
      )
    ) {
      setSelectedMonth(next)
      setSelectedDate(
        toIsoDate(next),
      )
    }
  }

  const selectedDay =
    fromIsoDate(selectedDate)

  const availability =
    getDateAvailability(
      draft,
      selectedDay,
    )

  const override =
    draft.dateOverrides?.[selectedDate]

  const daily = {
    status:
      override?.status ||
      availability.status,
    windows: (
      override?.windows ||
      availability.windows ||
      []
    ).map(cloneWindow),
    breaks: (
      override?.breaks ||
      availability.breaks ||
      []
    ).map(cloneWindow),
    bookedSlots: override?.bookedSlots || [],
  }

  const selectedDateSlots =
    generateAppointmentSlots({
      template: draft,
      date: selectedDay,
      appointments,
      now: today,
    })

  const longDays = draft.weeklySchedule.filter(
    (day) =>
      day.enabled &&
      !(day.breaks || []).length &&
      (day.slots || []).some(
        (slot) =>
          parseTimeToMinutes(
            slot.end,
          ) -
            parseTimeToMinutes(
              slot.start,
            ) >=
          360,
      ),
  )

  const saveDaily = () => {
    const next = {
      ...draft,
      dateOverrides: {
        ...(draft.dateOverrides || {}),
        [selectedDate]: {
          ...daily,
          windows: (
            daily.windows || []
          ).filter(isValidRange),
          breaks: (
            daily.breaks || []
          ).filter(isValidRange),
        },
      },
    }

    const saved =
      actions.saveAppointmentAvailabilityTemplate(
        next,
      )

    if (saved) {
      setDrafts((current) => ({
        ...current,
        [key]: saved,
      }))
    }
  }

  const clearDaily = () => {
    const overrides = {
      ...(draft.dateOverrides || {}),
    }

    delete overrides[selectedDate]

    const saved =
      actions.saveAppointmentAvailabilityTemplate(
        {
          ...draft,
          dateOverrides: overrides,
        },
      )

    if (saved) {
      setDrafts((current) => ({
        ...current,
        [key]: saved,
      }))
    }
  }

  const openDateSummary = (date) => {
    if (
      !isWithinSchedulingHorizon(
        date,
        today,
        3,
      )
    ) {
      return
    }

    setSelectedDate(
      toIsoDate(date),
    )

    setSelectedMonth(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      ),
    )

    setSelectedSummaryDate(date)
  }

  const editSelectedDate = () => {
    setSelectedSummaryDate(null)
    setMode('daily')
  }

  const toggleBookedSlot = (startMin) => {
    if (!selectedSummaryDate) return

    const iso = toIsoDate(selectedSummaryDate)
    const current = draft.dateOverrides?.[iso]?.bookedSlots || []
    const next = current.includes(startMin)
      ? current.filter((n) => n !== startMin)
      : [...current, startMin]

    const override = draft.dateOverrides?.[iso] || {
      status: 'Available',
      windows: (availability.windows || []).map(cloneWindow),
      breaks: (availability.breaks || []).map(cloneWindow),
    }

    const saved =
      actions.saveAppointmentAvailabilityTemplate({
        ...draft,
        dateOverrides: {
          ...(draft.dateOverrides || {}),
          [iso]: { ...override, bookedSlots: next },
        },
      })

    if (saved) {
      setDrafts((current) => ({
        ...current,
        [key]: saved,
      }))
      setSelectedSummaryDate(selectedSummaryDate)
    }
  }

  const gridStart = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth(),
    1,
  )

  gridStart.setDate(
    gridStart.getDate() -
      ((gridStart.getDay() + 6) % 7),
  )

  const gridDates = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      ),
  )

  const setWeekly = (
    dayIndex,
    next,
  ) => {
    update((current) => ({
      ...current,
      weeklySchedule:
        current.weeklySchedule.map(
          (day) =>
            day.dayIndex === dayIndex
              ? next
              : day,
        ),
    }))
  }

  // Apply a source day's schedule (enabled flag, working windows, breaks) to the
  // chosen target day(s), reusing the same cloned window/break shape.
  const copyDaySchedule = (
    sourceIndex,
    targetIndexes,
  ) => {
    if (!targetIndexes.length) return
    const source =
      draft.weeklySchedule.find(
        (day) => day.dayIndex === sourceIndex,
      ) || {}
    update((current) => ({
      ...current,
      weeklySchedule:
        current.weeklySchedule.map(
          (day) =>
            targetIndexes.includes(
              day.dayIndex,
            )
              ? {
                  ...day,
                  enabled: source.enabled,
                  slots: (
                    source.slots ||
                    []
                  ).map(cloneWindow),
                  breaks: (
                    source.breaks ||
                    []
                  ).map(cloneWindow),
                }
              : day,
        ),
    }))
  }

  const saveDailyEditor = (next) => {
    update((current) => ({
      ...current,
      dateOverrides: {
        ...(current.dateOverrides || {}),
        [selectedDate]: next,
      },
    }))
  }

  return (
    <>
      <Card className="apt-schedule-card">
        <header className="apt-schedule-header">
          <div>
            <div className="apt-slot-panel__eyebrow">
              Appointments
            </div>

            <h2>
              Schedule Appointment
            </h2>

            <p>
              Set your appointment availability,
              working hours, breaks, duration and
              price.
            </p>
          </div>

          <div className="apt-schedule-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => save(false)}
            >
              <Save size={15} />
              Save Changes
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => save(true)}
            >
              <Send size={15} />
              Publish Availability
            </button>
          </div>
        </header>

        <section className="apt-policy-card">
          <div>
            <span>
              Appointment Duration
            </span>

            <div className="apt-segmented">
              {DURATIONS.map(
                (duration) => (
                  <button
                    key={duration}
                    type="button"
                    className={
                      draft.appointmentDuration ===
                      duration
                        ? 'is-active'
                        : ''
                    }
                    onClick={() =>
                      update(
                        (current) => ({
                          ...current,
                          appointmentDuration:
                            duration,
                        }),
                      )
                    }
                  >
                    {duration} Minutes
                  </button>
                ),
              )}
            </div>
          </div>

          <label className="apt-policy-price">
            <span>
              Appointment Price
            </span>

            <div>
              <b>₹</b>

              <input
                type="number"
                min="0"
                value={draft.appointmentPrice}
                onChange={(event) =>
                  update(
                    (current) => ({
                      ...current,
                      appointmentPrice:
                        Math.max(
                          0,
                          Number(
                            event.target.value,
                          ) || 0,
                        ),
                    }),
                  )
                }
              />
            </div>
          </label>

          <p>
            <CalendarDays size={16} />
            Current month + next two months
            are available for scheduling.
          </p>
        </section>

        <nav
          className="apt-schedule-tabs"
          aria-label="Scheduling modes"
        >
          {[
            [
              'weekly',
              'Weekly Schedule',
            ],
            [
              'daily',
              'Daily Schedule',
            ],
            [
              'monthly',
              'Monthly Schedule',
            ],
          ].map(
            ([value, label]) => (
              <button
                type="button"
                key={value}
                className={
                  mode === value
                    ? 'is-active'
                    : ''
                }
                onClick={() =>
                  setMode(value)
                }
              >
                {label}
              </button>
            ),
          )}
        </nav>

        {mode === 'weekly' && (
          <section className="apt-schedule-mode">
            <div className="apt-mode-heading">
              <div>
                <h3>
                  Weekly Schedule
                </h3>

                <p>
                  Your recurring base
                  availability.
                </p>
              </div>

              <div className="apt-month-controls">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() =>
                    moveMonth(-1)
                  }
                  disabled
                >
                  <ChevronLeft size={16} />
                </button>

                <strong>
                  {monthLabel(
                    selectedMonth,
                  )}
                </strong>

                <button
                  type="button"
                  className="icon-btn"
                  onClick={() =>
                    moveMonth(1)
                  }
                  disabled={
                    !isWithinSchedulingHorizon(
                      new Date(
                        selectedMonth.getFullYear(),
                        selectedMonth.getMonth() +
                          1,
                        1,
                      ),
                      today,
                      3,
                    )
                  }
                >
                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>
            </div>

            <div className="apt-weekly-days">
              {DAYS.map((meta) => {
                const day =
                  draft.weeklySchedule.find(
                    (item) =>
                      item.dayIndex ===
                      meta.dayIndex,
                  )

                return (
                  <article
                    className="apt-weekly-day"
                    key={meta.dayIndex}
                  >
                    <div className="apt-weekly-day__title">
                      <h4>
                        {meta.label}
                      </h4>

                      <span>
                        {day.enabled
                          ? 'Available'
                          : 'Unavailable'}
                      </span>
                    </div>

                    <DayHoursEditor
                      schedule={day}
                      onChange={(next) =>
                        setWeekly(
                          meta.dayIndex,
                          next,
                        )
                      }
                    />

                    <div className="apt-weekly-day__copy">
                      <label>
                        Copy this day to
                      </label>

                      <select
                        value=""
                        onChange={(event) => {
                          const target = Number(
                            event.target.value,
                          )
                          if (
                            Number.isFinite(
                              target,
                            ) &&
                            target !==
                              meta.dayIndex
                          ) {
                            copyDaySchedule(
                              meta.dayIndex,
                              [target],
                            )
                          }
                        }}
                      >
                        <option
                          value=""
                          disabled
                        >
                          Choose a day…
                        </option>

                        {DAYS.filter(
                          (item) =>
                            item.dayIndex !==
                            meta.dayIndex,
                        ).map((item) => (
                          <option
                            key={item.dayIndex}
                            value={
                              item.dayIndex
                            }
                          >
                            {item.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const targets = DAYS.map(
                            (
                              item,
                            ) =>
                              item.dayIndex,
                          ).filter(
                            (idx) =>
                              idx !==
                              meta.dayIndex,
                          )
                          copyDaySchedule(
                            meta.dayIndex,
                            targets,
                          )
                        }}
                      >
                        all weekdays
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            {longDays.length > 0 &&
              !breakReminderDismissed && (
                <div className="apt-break-reminder">
                  <Coffee size={18} />

                  <div>
                    <strong>
                      ⚠ No break time added
                    </strong>

                    <span>
                      Your working hours include
                      a continuous six-hour or
                      longer period. Consider
                      adding a break to avoid
                      continuous appointments.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      const day =
                        longDays[0]

                      setWeekly(
                        day.dayIndex,
                        {
                          ...day,
                          breaks: [
                            {
                              start: '13:00',
                              end: '14:00',
                            },
                          ],
                        },
                      )
                    }}
                  >
                    Add Break
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setBreakReminderDismissed(
                        true,
                      )
                    }
                  >
                    Continue Without Break
                  </button>
                </div>
              )}

            <div className="apt-save-weekly">
              <div>
                <strong>Save Weekly Schedule</strong>
                <span>
                  Your working hours, breaks and
                  available days for each weekday.
                </span>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => save(false)}
              >
                <Save size={15} />
                Save Weekly Schedule
              </button>
            </div>
          </section>
        )}

        {mode === 'daily' && (
          <section className="apt-schedule-mode">
            <div className="apt-mode-heading">
              <div>
                <h3>
                  Daily Schedule
                </h3>

                <p>
                  Apply a one-time change to{' '}
                  <strong>one date only</strong> —{' '}
                  this never changes the weekly
                  schedule.
                </p>

                <span
                  className={
                    override
                      ? 'apt-daily-override-pill is-set'
                      : 'apt-daily-override-pill'
                  }
                >
                  {override
                    ? 'Custom override set for this date'
                    : 'Uses the weekly schedule (no custom override)'}
                </span>
              </div>

              <label className="apt-date-picker">
                <span>
                  Selected Date
                </span>

                <input
                  type="date"
                  min={toIsoDate(today)}
                  max={toIsoDate(
                    new Date(
                      today.getFullYear(),
                      today.getMonth() + 3,
                      0,
                    ),
                  )}
                  value={selectedDate}
                  onChange={(event) => {
                    const value =
                      event.target.value

                    setSelectedDate(value)

                    const date =
                      fromIsoDate(value)

                    setSelectedMonth(
                      new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        1,
                      ),
                    )
                  }}
                />
              </label>
            </div>

            {availability.holiday &&
              !override && (
                <div className="apt-holiday-banner">
                  <CalendarDays size={17} />

                  <div>
                    <strong>
                      Government Holiday —{' '}
                      {availability.holiday.name}
                    </strong>

                    <span>
                      This date is unavailable
                      by default. Enable
                      availability below if
                      you want to work on this
                      holiday.
                    </span>
                  </div>
                </div>
              )}

            <DayHoursEditor
              daily
              schedule={daily}
              onChange={saveDailyEditor}
            />

            <div className="apt-slot-preview">
              <div>
                <Clock3 size={16} />

                <strong>
                  {selectedDateSlots.length}{' '}
                  available appointment
                  slots
                </strong>

                <span>
                  {selectedDateSlots.length
                    ? selectedDateSlots
                        .slice(0, 8)
                        .map(
                          (slot) =>
                            `${format12h(
                              slot.startMin,
                            )}–${format12h(
                              slot.endMin,
                            )}`,
                        )
                        .join(' · ')
                    : 'No remaining slots for this date.'}
                </span>
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={clearDaily}
                  disabled={!override}
                >
                  Remove Override
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveDaily}
                >
                  <Save size={14} />
                  Save Day Schedule
                </button>
              </div>
            </div>
          </section>
        )}

        {mode === 'monthly' && (
          <section className="apt-schedule-mode">
            <div className="apt-mode-heading">
              <div>
                <h3>
                  Monthly Schedule
                </h3>

                <p>
                  Select a date to view its
                  availability and appointment
                  slots.
                </p>
              </div>

              <div className="apt-month-controls">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() =>
                    moveMonth(-1)
                  }
                  disabled={
                    !isWithinSchedulingHorizon(
                      new Date(
                        selectedMonth.getFullYear(),
                        selectedMonth.getMonth() - 1,
                        1,
                      ),
                      today,
                      3,
                    )
                  }
                >
                  <ChevronLeft size={16} />
                </button>

                <strong>
                  {monthLabel(
                    selectedMonth,
                  )}
                </strong>

                <button
                  type="button"
                  className="icon-btn"
                  onClick={() =>
                    moveMonth(1)
                  }
                  disabled={
                    !isWithinSchedulingHorizon(
                      new Date(
                        selectedMonth.getFullYear(),
                        selectedMonth.getMonth() +
                          1,
                        1,
                      ),
                      today,
                      3,
                    )
                  }
                >
                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>
            </div>

            <div className="apt-scheduling-calendar">
              <div className="apt-scheduling-calendar__weekdays">
                {[
                  'Mon',
                  'Tue',
                  'Wed',
                  'Thu',
                  'Fri',
                  'Sat',
                  'Sun',
                ].map((label) => (
                  <span key={label}>
                    {label}
                  </span>
                ))}
              </div>

              <div className="apt-scheduling-calendar__grid">
                {gridDates.map((date) => {
                  const iso =
                    toIsoDate(date)

                  const inMonth =
                    date.getMonth() ===
                    selectedMonth.getMonth()

                  const inHorizon =
                    isWithinSchedulingHorizon(
                      date,
                      today,
                      3,
                    )

                  const dateAvailability =
                    getDateAvailability(
                      draft,
                      date,
                    )

                  const dateSummary =
                    getAppointmentSlotSummary({
                      template: draft,
                      date,
                      appointments,
                      now: today,
                    })

                  const hasAppointments =
                    appointments.some(
                      (appointment) =>
                        appointment.dateIso ===
                          iso &&
                        appointment.status !==
                          'Cancelled',
                    )

                  const isHoliday =
                    Boolean(
                      dateAvailability.holiday,
                    )

                  let state =
                    'unavailable'

                  if (!inHorizon) {
                    state = 'outside'
                  } else if (
                    dateSummary.available >
                    0
                  ) {
                    state = 'available'
                  } else if (
                    dateSummary.booked > 0
                  ) {
                    state = 'booked'
                  } else if (
                    isHoliday &&
                    !dateAvailability.isOverride
                  ) {
                    state = 'holiday'
                  } else if (
                    hasAppointments
                  ) {
                    state = 'booked'
                  }

                  return (
                    <button
                      type="button"
                      key={iso}
                      disabled={
                        !inMonth ||
                        !inHorizon
                      }
                      onClick={() =>
                        openDateSummary(
                          date,
                        )
                      }
                      className={[
                        'apt-scheduling-date',
                        `is-${state}`,
                        iso ===
                        toIsoDate(today)
                          ? 'is-today'
                          : '',
                        draft.dateOverrides?.[
                          iso
                        ]
                          ? 'is-override'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <strong>
                        {date.getDate()}
                      </strong>

                      <span>
                        {state ===
                        'available'
                          ? `${dateSummary.available} available`
                          : state ===
                              'booked'
                            ? dateSummary.booked >
                              0
                              ? `${dateSummary.booked} booked`
                              : 'Fully booked'
                            : state ===
                                'holiday'
                              ? 'Holiday'
                              : state ===
                                  'outside'
                                ? ''
                                : 'Unavailable'}
                      </span>

                      {draft.dateOverrides?.[
                        iso
                      ] && (
                        <i>
                          Custom
                        </i>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="apt-calendar-legend">
              <span className="available">
                Available
              </span>

              <span className="booked">
                Booked / Full
              </span>

              <span className="unavailable">
                Unavailable
              </span>

              <span className="custom">
                Custom Day
              </span>

              <span className="holiday">
                Government Holiday
              </span>
            </div>
          </section>
        )}
      </Card>

      {selectedSummaryDate && (
        <DateSummaryModal
          date={selectedSummaryDate}
          template={draft}
          appointments={appointments}
          now={today}
          onClose={() =>
            setSelectedSummaryDate(null)
          }
          onEdit={editSelectedDate}
          onToggleBook={toggleBookedSlot}
        />
      )}
    </>
  )
}