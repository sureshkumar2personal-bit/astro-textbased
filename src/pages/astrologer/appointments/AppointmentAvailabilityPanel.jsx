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
import { useToast } from '../../../components/Toast.jsx'
import Card from '../../../components/ui/Card.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import {
  addMonths,
  format12h,
  fromIsoDate,
  generateAppointmentSlots,
  getAppointmentSlotSummary,
  getDateAvailability,
  hasUnpublishedChanges,
  isWithinSchedulingHorizon,
  isValidRange,
  parseTimeToMinutes,
  publishedAvailabilitySnapshot,
  toIsoDate,
  validateDayBreaks,
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
        continueWithoutBreak: Boolean(
          existing?.continueWithoutBreak,
        ),
      }
    }),
  }
}

function TimeRange({
  item,
  onChange,
  onRemove,
  onBlur,
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
        onBlur={() => onBlur && onBlur()}
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
        onBlur={() => onBlur && onBlur()}
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

const ALL_DAY_WINDOW = { start: '00:00', end: '23:59' }

function isAllDayWindow(item) {
  return Boolean(item) && item.start === '00:00' && item.end === '23:59'
}

function isAllDaySchedule(windows) {
  return (
    Array.isArray(windows) &&
    windows.length === 1 &&
    isAllDayWindow(windows[0])
  )
}

function t24(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(
    2,
    '0',
  )}:${String(minutes % 60).padStart(2, '0')}`
}

// Pick a sensible default break inside the first working window so the added
// break is immediately valid against the day's working hours.
function suggestBreak(windows) {
  const win = (windows && windows.length ? windows : DEFAULT_WINDOWS)[0]
  const startMin = parseTimeToMinutes(win.start)
  const endMin = parseTimeToMinutes(win.end)
  const length = endMin - startMin
  if (length < 45) return { start: win.start, end: win.end }
  const mid = startMin + Math.floor(length / 2)
  return {
    start: t24(Math.max(startMin, mid - 30)),
    end: t24(Math.min(endMin, mid + 30)),
  }
}

// Shared working-hours editor. Handles both the weekly schedule (per weekday,
// `slots` key) and the one-off daily schedule (date override, `windows` key).
// Working hours can contain several windows and each window is editable.
function WorkingHoursEditor({ schedule, onChange, daily = false }) {
  const windowsKey = daily ? 'windows' : 'slots'
  const enabled = daily
    ? (schedule.status || 'Available') === 'Available'
    : schedule.enabled !== false
  const windows = schedule?.[windowsKey] || []
  const allDay = isAllDaySchedule(windows)

  const setEnabled = (checked) => {
    onChange({
      ...schedule,
      ...(daily
        ? { status: checked ? 'Available' : 'Unavailable' }
        : { enabled: checked }),
      [windowsKey]: checked
        ? windows.length
          ? windows
          : DEFAULT_WINDOWS.map(cloneWindow)
        : [],
    })
  }

  const updateWindow = (index, patch) => {
    onChange({
      ...schedule,
      [windowsKey]: windows.map((window, windowIndex) =>
        windowIndex === index
          ? { ...window, ...patch }
          : window,
      ),
    })
  }

  const addWindow = () => {
    const last = windows[windows.length - 1] || DEFAULT_WINDOWS[0]
    const start = parseTimeToMinutes(last.end)
    if (start >= 23 * 60 + 59) return
    const end = Math.min(start + 60, 23 * 60 + 59)
    onChange({
      ...schedule,
      [windowsKey]: [
        ...windows,
        { start: t24(start), end: t24(end) },
      ],
    })
  }

  const removeWindow = (index) => {
    onChange({
      ...schedule,
      [windowsKey]: windows.filter((_, windowIndex) => windowIndex !== index),
    })
  }

  const setAllDay = (checked) => {
    onChange({
      ...schedule,
      [windowsKey]: checked
        ? [ALL_DAY_WINDOW]
        : DEFAULT_WINDOWS.map(cloneWindow),
    })
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
          <div className="apt-schedule-group__head">
            <strong>Working hours</strong>

            <button
              type="button"
              onClick={() => setAllDay(!allDay)}
            >
              {allDay ? 'Set specific hours' : 'All Day'}
            </button>
          </div>

          {allDay ? (
            <p className="apt-schedule-empty">
              Available all day (12:00 AM – 11:59 PM).
            </p>
          ) : (
            <div className="apt-schedule-windows">
              {windows.map((window, index) => (
                <TimeRange
                  key={`${window.start}-${window.end}-${index}`}
                  item={window}
                  label={windows.length > 1 ? `Hours ${index + 1}` : 'Working hours'}
                  onChange={(patch) =>
                    updateWindow(index, patch)
                  }
                  onRemove={() => removeWindow(index)}
                />
              ))}

              <button
                type="button"
                className="btn btn-outline apt-schedule-add"
                onClick={addWindow}
              >
                + Add Hours
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Per-day break editor shared by the weekly and daily schedules. Supports
// multiple breaks (add / edit / remove), blocks invalid breaks (must sit
// inside the working hours, must not overlap), and exposes a recoverable
// "continue without break" option that never removes the break feature.
function BreaksEditor({
  breaks = [],
  windows = [],
  continueWithoutBreak = false,
  error = null,
  onChange,
  onAdd,
  onRemove,
  onEditCommit,
  onToggleContinue,
}) {
  return (
    <div className="apt-schedule-breaks">
      <div className="apt-schedule-breaks__head">
        <Coffee size={14} />
        <span>Break Hours</span>
        <small>{breaks.length} configured</small>
      </div>

      {continueWithoutBreak ? (
        <div className="apt-continue-without-break">
          <span>
            Continue without break is ON — no active
            breaks for this day.
          </span>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onToggleContinue(false)}
          >
            Turn off and add Breaks
          </button>
        </div>
      ) : (
        <>
          {breaks.length > 0 && (
            <div className="apt-schedule-breaks__list">
              {breaks.map((item, index) => (
                <TimeRange
                  key={`${item.start}-${item.end}-${index}`}
                  item={item}
                  label={`Break ${index + 1}`}
                  onChange={(patch) =>
                    onChange(
                      breaks.map((breakItem, breakIndex) =>
                        breakIndex === index
                          ? { ...breakItem, ...patch }
                          : breakItem,
                      ),
                    )
                  }
                  onBlur={() =>
                    onEditCommit && onEditCommit(index)
                  }
                  onRemove={() =>
                    onRemove(index)
                  }
                />
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn btn-outline"
            onClick={onAdd}
          >
            + Add Break
          </button>

          {breaks.length === 0 && (
            <button
              type="button"
              className="btn btn-ghost apt-schedule-continue-toggle"
              onClick={() => onToggleContinue(true)}
            >
              Continue without break
            </button>
          )}
        </>
      )}

      {error && (
        <p className="apt-schedule-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// Copy the source weekday's full schedule to chosen target day(s). Requires an
// explicit target selection + Apply so the command is never a hidden side
// effect of picking a day.
function CopyDayControl({ sourceIndex, onCopy }) {
  const [target, setTarget] = useState('')
  const targets = DAYS.filter(
    (item) => item.dayIndex !== sourceIndex,
  )

  return (
    <div className="apt-weekly-day__copy">
      <label>Copy this day to</label>

      <select
        value={target}
        onChange={(event) => setTarget(event.target.value)}
        aria-label={`Copy ${DAYS.find((d) => d.dayIndex === sourceIndex)?.label} to…`}
      >
        <option value="" disabled>
          Choose a day…
        </option>

        {targets.map((item) => (
          <option key={item.dayIndex} value={item.dayIndex}>
            {item.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={!target}
        onClick={() => {
          onCopy(sourceIndex, [Number(target)])
          setTarget('')
        }}
      >
        Apply
      </button>

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() =>
          onCopy(
            sourceIndex,
            targets.map((item) => item.dayIndex),
          )
        }
      >
        all weekdays
      </button>
    </div>
  )
}

function SlotStatus({ slot }) {
  const completed = slot.status === 'completed' || slot.completed
  const label =
    slot.status === 'booked'
      ? slot.appointment?.status || 'Booked'
      : completed
        ? slot.appointment?.status === 'No-show'
          ? 'No-show'
          : 'Completed'
        : 'Available'

  const className =
    slot.status === 'booked'
      ? 'apt-slot-status is-booked'
      : completed
        ? 'apt-slot-status is-completed'
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
  published = false,
  onClose,
  onEdit,
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
            <span>
              {published
                ? 'Published Availability Preview'
                : 'Appointment Summary'}
            </span>
            <h3>
              {date.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h3>
          </div>

          {published && (
            <StatusBadge label="Published" />
          )}

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
            <span>Completed</span>
            <strong>{summary.completed}</strong>
          </div>

          <div>
            <span>Remaining</span>
            <strong>{summary.remaining}</strong>
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
                  ? summary.remaining > 0
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

                  <SlotStatus slot={slot} />
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
  const { success } = useToast()

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

  const [publishedPreview, setPublishedPreview] =
    useState(false)

  const [weekErrors, setWeekErrors] = useState({})
  const [dailyError, setDailyError] = useState(null)

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
      success(publish ? 'Successfully published' : 'Saved successfully')
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

  const weekdaySchedule =
    draft.weeklySchedule.find(
      (day) =>
        day.dayIndex === selectedDay.getDay(),
    )

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
    continueWithoutBreak: Boolean(
      override
        ? override.continueWithoutBreak
        : weekdaySchedule?.continueWithoutBreak,
    ),
    bookedSlots: override?.bookedSlots || [],
  }

  const selectedDateSlots =
    generateAppointmentSlots({
      template: draft,
      date: selectedDay,
      appointments,
      now: today,
    })

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
      success('Saved successfully')
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
      success('Removed successfully')
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

    setPublishedPreview(false)
    setSelectedSummaryDate(date)
  }

  const editSelectedDate = () => {
    setSelectedSummaryDate(null)
    setPublishedPreview(false)
    setMode('daily')
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
    const windows = next.slots?.length
      ? next.slots
      : DEFAULT_WINDOWS
    const message = validateDayBreaks(
      next.breaks || [],
      windows,
    )
    setWeekErrors((current) => ({
      ...current,
      [dayIndex]: message || undefined,
    }))

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

  const copyDaySchedule = (
    sourceIndex,
    targetIndexes,
  ) => {
    if (!targetIndexes.length) return
    const sourceDay =
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
                  enabled: sourceDay.enabled,
                  slots: (
                    sourceDay.slots ||
                    []
                  ).map(cloneWindow),
                  breaks: (
                    sourceDay.breaks ||
                    []
                  ).map(cloneWindow),
                  continueWithoutBreak:
                    Boolean(
                      sourceDay.continueWithoutBreak,
                    ),
                }
              : day,
        ),
    }))
  }

  const setAllDay = (
    dayIndex,
    checked,
  ) => {
    const day =
      draft.weeklySchedule.find(
        (item) => item.dayIndex === dayIndex,
      ) || {}
    setWeekly(
      dayIndex,
      checked
        ? {
            ...day,
            enabled: true,
            slots: [ALL_DAY_WINDOW],
          }
        : {
            ...day,
            slots: (
              day.slots || []
            ).length &&
              !isAllDaySchedule(day.slots)
              ? day.slots
              : DEFAULT_WINDOWS.map(cloneWindow),
          },
    )
  }

  const applyExceptSunday = () => {
    update((current) => ({
      ...current,
      weeklySchedule:
        current.weeklySchedule.map(
          (day) =>
            day.dayIndex === 0
              ? day
              : {
                  ...day,
                  enabled: true,
                  slots: [ALL_DAY_WINDOW],
                },
        ),
    }))
  }

  const dayFor = (dayIndex) =>
    draft.weeklySchedule.find(
      (item) => item.dayIndex === dayIndex,
    ) || {}

  const addWeekBreak = (dayIndex) => {
    const day = dayFor(dayIndex)
    const windows = day.slots?.length
      ? day.slots
      : DEFAULT_WINDOWS
    const nextBreaks = [
      ...(day.breaks || []),
      suggestBreak(windows),
    ]
    const message = validateDayBreaks(
      nextBreaks,
      windows,
    )

    if (message) {
      setWeekErrors((current) => ({
        ...current,
        [dayIndex]: message,
      }))
      return
    }

    setWeekErrors((current) => ({
      ...current,
      [dayIndex]: undefined,
    }))
    setWeekly(dayIndex, {
      ...day,
      continueWithoutBreak: false,
      breaks: nextBreaks,
    })
    success('Successfully added')
  }

  const updateWeekBreaks = (
    dayIndex,
    nextBreaks,
  ) => {
    const day = dayFor(dayIndex)
    const windows = day.slots?.length
      ? day.slots
      : DEFAULT_WINDOWS
    const message = validateDayBreaks(
      nextBreaks,
      windows,
    )
    setWeekErrors((current) => ({
      ...current,
      [dayIndex]: message || undefined,
    }))
    setWeekly(dayIndex, {
      ...day,
      breaks: nextBreaks,
    })
  }

  const removeWeekBreak = (dayIndex, breakIndex) => {
    const day = dayFor(dayIndex)
    setWeekly(dayIndex, {
      ...day,
      breaks: (day.breaks || []).filter(
        (_, index) => index !== breakIndex,
      ),
    })
    success('Removed successfully')
  }

  const toggleWeekContinue = (
    dayIndex,
    enabled,
  ) => {
    const day = dayFor(dayIndex)
    setWeekly(dayIndex, {
      ...day,
      continueWithoutBreak: enabled,
      breaks: enabled
        ? []
        : (day.breaks || []),
    })
  }

  const updateDailyEditor = (next) => {
    if (next.breaks !== undefined || next.windows !== undefined) {
      const breaks =
        next.breaks !== undefined
          ? next.breaks
          : (daily.breaks || [])
      const windows =
        (next.windows !== undefined
          ? next.windows
          : (daily.windows || [])
        ).length
          ? next.windows !== undefined
            ? next.windows
            : daily.windows
          : DEFAULT_WINDOWS
      setDailyError(
        validateDayBreaks(breaks, windows),
      )
    }
    saveDailyEditor(next)
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

  const addDailyBreak = () => {
    const windows = daily.windows?.length
      ? daily.windows
      : DEFAULT_WINDOWS
    const nextBreaks = [
      ...(daily.breaks || []),
      suggestBreak(windows),
    ]
    const message = validateDayBreaks(
      nextBreaks,
      windows,
    )

    if (message) {
      setDailyError(message)
      return
    }

    setDailyError(null)
    saveDailyEditor({
      ...daily,
      continueWithoutBreak: false,
      breaks: nextBreaks,
    })
    success('Successfully added')
  }

  const removeDailyBreak = (index) => {
    saveDailyEditor({
      ...daily,
      breaks: (daily.breaks || []).filter(
        (_, breakIndex) => breakIndex !== index,
      ),
    })
    setDailyError(null)
    success('Removed successfully')
  }

  const commitDailyBreak = () => {
    success('Saved successfully')
  }

  const toggleDailyContinue = (enabled) => {
    saveDailyEditor({
      ...daily,
      continueWithoutBreak: enabled,
      breaks: enabled ? [] : (daily.breaks || []),
    })
    setDailyError(null)
  }

  // Published-availability status driven by the persisted template for this
  // month. Saving new edits never changes this until the astrologer publishes.
  const publishedSource = source?.publishedWeeklySchedule
    ? source
    : null
  const snapshot = publishedSource
    ? publishedAvailabilitySnapshot(source)
    : null
  const hasUnpublished = publishedSource
    ? hasUnpublishedChanges(source)
    : false

  const horizonEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 3,
    0,
  )
  const availabilityPeriod =
    `${today.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })} – ${horizonEnd.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`

  const publishedWorkingDays = snapshot
    ? (snapshot.weeklySchedule || []).filter(
        (day) => day.enabled,
      )
    : []
  const publishedSunday = snapshot
    ? snapshot.weeklySchedule.find(
        (day) => day.dayIndex === 0,
      )
    : null
  const publishedBreakCount = snapshot
    ? (snapshot.weeklySchedule || []).reduce(
        (total, day) => total + (day.breaks || []).length,
        0,
      )
    : 0

  const openPublishedPreview = () => {
    const horizonEndDate = addMonths(
      new Date(today.getFullYear(), today.getMonth(), 1),
      3,
    )
    let previewDate = null

    for (
      let cursor = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      cursor < horizonEndDate && !previewDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const monthTemplate =
        appointmentAvailabilityTemplates.find(
          (item) =>
            item.astrologerId === astrologerId &&
            item.monthKey === monthKey(cursor),
        )
      const monthSnapshot =
        publishedAvailabilitySnapshot(monthTemplate)
      if (
        monthSnapshot &&
        generateAppointmentSlots({
          template: monthSnapshot,
          date: cursor,
          appointments,
          now: today,
        }).length
      ) {
        previewDate = new Date(cursor)
      }
    }

    if (!previewDate) return

    setSelectedMonth(
      new Date(
        previewDate.getFullYear(),
        previewDate.getMonth(),
        1,
      ),
    )
    setSelectedDate(toIsoDate(previewDate))
    setPublishedPreview(true)
    setSelectedSummaryDate(previewDate)
  }

  const modalTemplate =
    publishedPreview && snapshot
      ? snapshot
      : draft

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

        <section className="apt-published-card">
          <div className="apt-published-card__main">
            <div>
              <span
                className={
                  publishedSource
                    ? 'is-published'
                    : ''
                }
              />
              <strong>
                {publishedSource
                  ? 'Published Availability'
                  : 'Not published yet'}
              </strong>
              <p>
                Users can only book the published
                availability — saved changes become
                live after you publish.
              </p>
            </div>

            {hasUnpublished && (
              <span className="apt-unpublished-pill">
                Unpublished changes
              </span>
            )}
          </div>

          <div className="apt-published-card__grid">
            <div>
              <span>Status</span>
              <strong>
                {publishedSource
                  ? '✓ Published'
                  : 'Not published'}
                {hasUnpublished &&
                  ' · Edited'}
              </strong>
            </div>

            <div>
              <span>Last published</span>
              <strong>
                {source?.publishedAt
                  ? new Date(
                      source.publishedAt,
                    ).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '—'}
              </strong>
            </div>

            <div>
              <span>Availability period</span>
              <strong>
                {availabilityPeriod}
              </strong>
            </div>

            <div>
              <span>Working days</span>
              <strong>
                {publishedWorkingDays.length
                  ? publishedWorkingDays
                      .map(
                        (day) =>
                          DAYS.find(
                            (meta) =>
                              meta.dayIndex ===
                              day.dayIndex,
                          )?.label.slice(0, 3),
                      )
                      .join(' · ')
                  : '—'}
              </strong>
            </div>

            <div>
              <span>Sunday</span>
              <strong>
                {publishedSunday?.enabled
                  ? 'Working'
                  : 'Off'}
              </strong>
            </div>

            <div>
              <span>Duration</span>
              <strong>
                {snapshot?.appointmentDuration || '—'} Minutes
              </strong>
            </div>

            <div>
              <span>Breaks</span>
              <strong>
                {publishedBreakCount > 0
                  ? `Configured (${publishedBreakCount})`
                  : 'None'}
              </strong>
            </div>
          </div>

          <div className="apt-published-card__actions">
            <button
              type="button"
              className="btn btn-outline"
              disabled={!publishedSource}
              onClick={openPublishedPreview}
            >
              <CalendarDays size={15} />
              View Published Availability
            </button>

            <p>
              Publish Availability to make your
              saved configuration visible to users
              booking this astrologer.
            </p>
          </div>
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
                  availability. Each day is
                  independently configurable.
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

            <div className="apt-weekly-bulk">
              <div className="apt-weekly-bulk__label">
                All Day
              </div>

              <div className="apt-weekly-bulk__days">
                {DAYS.map((meta) => {
                  const day = dayFor(meta.dayIndex)
                  const isOn =
                    day.enabled &&
                    isAllDaySchedule(day.slots)

                  return (
                    <label
                      key={meta.dayIndex}
                      className={
                        isOn ? 'is-on' : ''
                      }
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(isOn)}
                        onChange={(event) =>
                          setAllDay(
                            meta.dayIndex,
                            event.target.checked,
                          )
                        }
                        aria-label={`All Day ${meta.label}`}
                      />
                      {meta.label.slice(0, 3)}
                    </label>
                  )
                })}
              </div>

              <button
                type="button"
                className="btn btn-outline"
                onClick={applyExceptSunday}
              >
                Monday–Saturday (Except Sunday)
              </button>
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

                    <WorkingHoursEditor
                      schedule={day}
                      onChange={(next) =>
                        setWeekly(
                          meta.dayIndex,
                          next,
                        )
                      }
                    />

                    <BreaksEditor
                      breaks={day.breaks || []}
                      windows={
                        day.slots?.length
                          ? day.slots
                          : DEFAULT_WINDOWS
                      }
                      continueWithoutBreak={
                        Boolean(day.continueWithoutBreak)
                      }
                      error={weekErrors[meta.dayIndex]}
                      onChange={(nextBreaks) =>
                        updateWeekBreaks(
                          meta.dayIndex,
                          nextBreaks,
                        )
                      }
                      onAdd={() =>
                        addWeekBreak(meta.dayIndex)
                      }
                      onRemove={(breakIndex) =>
                        removeWeekBreak(meta.dayIndex, breakIndex)
                      }
                      onEditCommit={() =>
                        success('Saved successfully')
                      }
                      onToggleContinue={(enabled) =>
                        toggleWeekContinue(
                          meta.dayIndex,
                          enabled,
                        )
                      }
                    />

                    <CopyDayControl
                      sourceIndex={meta.dayIndex}
                      onCopy={copyDaySchedule}
                    />
                  </article>
                )
              })}
            </div>

            <div className="apt-save-weekly">
              <div>
                <strong>Save Weekly Schedule</strong>
                <span>
                  Your working hours, breaks and
                  available days for each weekday.
                  Saving does not change what users
                  see until you publish.
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

            <WorkingHoursEditor
              daily
              schedule={daily}
              onChange={updateDailyEditor}
            />

            <BreaksEditor
              breaks={daily.breaks || []}
              windows={
                daily.windows?.length
                  ? daily.windows
                  : DEFAULT_WINDOWS
              }
              continueWithoutBreak={
                daily.continueWithoutBreak
              }
              error={dailyError}
              onChange={(nextBreaks) =>
                updateDailyEditor({
                  ...daily,
                  breaks: nextBreaks,
                })
              }
              onAdd={addDailyBreak}
              onRemove={removeDailyBreak}
              onEditCommit={commitDailyBreak}
              onToggleContinue={toggleDailyContinue}
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
                  Total, Booked, Completed and
                  Remaining slots come from real
                  data — your published working
                  hours, breaks and appointments.
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
                    dateSummary.remaining >
                    0
                  ) {
                    state = 'available'
                  } else if (
                    dateSummary.booked > 0 ||
                    dateSummary.completed > 0
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

                      {dateSummary.total > 0 ? (
                        <>
                          <span className="apt-cell-line">
                            {dateSummary.total}{' '}
                            Slots
                          </span>

                          <em
                            aria-label={`${dateSummary.booked} booked, ${dateSummary.completed} completed, ${dateSummary.remaining} remaining of ${dateSummary.total} total`}
                          >
                            {dateSummary.booked}B ·{' '}
                            {dateSummary.completed}C ·{' '}
                            {dateSummary.remaining}R
                          </em>
                        </>
                      ) : (
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
                      )}

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

              <span>
                Day counts show B·C·R =
                Booked · Completed · Remaining
              </span>
            </div>
          </section>
        )}
      </Card>

      {selectedSummaryDate && (
        <DateSummaryModal
          date={selectedSummaryDate}
          template={modalTemplate}
          appointments={appointments}
          now={today}
          published={publishedPreview}
          onClose={() => {
            setSelectedSummaryDate(null)
            setPublishedPreview(false)
          }}
          onEdit={editSelectedDate}
        />
      )}
    </>
  )
}