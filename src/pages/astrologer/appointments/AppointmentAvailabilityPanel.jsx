import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
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
  APPOINTMENT_BUFFER_OPTIONS,
  addMonths,
  appointmentBufferMinutes,
  availabilityBounds,
  clampAvailabilityPeriod,
  format12h,
  fromIsoDate,
  generateAppointmentSlots,
  getAppointmentSlotSummary,
  getDateAvailability,
  hasUnpublishedChanges,
  isWithinSchedulingHorizon,
  isValidRange,
  openWeekdayDetail,
  parseTimeToMinutes,
  publishedCellState,
  publishedSnapshotForDate,
  shouldShowBreakReminder,
  toIsoDate,
  toggleCollapsed,
  validateDayBreaks,
  weeklyScheduleFromTemplate,
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

// The shared weekly configuration used by the All Day / Except Sunday quick
// actions. Persisted on the template as `weeklyTemplate` so it survives saves
// and refreshes. For templates saved before this field existed it is derived
// from the first enabled weekday so nothing is lost on migration.
function deriveWeeklyTemplate(template = {}) {
  if (template.weeklyTemplate) {
    return {
      enabled: template.weeklyTemplate.enabled !== false,
      slots: (template.weeklyTemplate.slots || []).map(cloneWindow),
      breaks: (template.weeklyTemplate.breaks || []).map(cloneWindow),
      continueWithoutBreak: Boolean(
        template.weeklyTemplate.continueWithoutBreak,
      ),
    }
  }

  const schedule = template.weeklySchedule || []
  const enabledDay = schedule.find(
    (day) =>
      day.enabled &&
      (day.slots?.length || day.continueWithoutBreak),
  )

  if (enabledDay) {
    return {
      enabled: true,
      slots: (enabledDay.slots || []).map(cloneWindow),
      breaks: (enabledDay.breaks || []).map(cloneWindow),
      continueWithoutBreak: Boolean(
        enabledDay.continueWithoutBreak,
      ),
    }
  }

  return {
    enabled: true,
    slots: DEFAULT_WINDOWS.map(cloneWindow),
    breaks: [],
    continueWithoutBreak: false,
  }
}

// Default availability period = today → today + 90 days (the maximum window),
// computed dynamically from the current date (never hard-coded). The astrologer
// is free to shorten the end date down to the start date.
function defaultAvailabilityPeriod(anchor = new Date()) {
  const { min, max } = availabilityBounds(anchor)
  return { start: min, end: max }
}

function formatPeriod(startIso, endIso) {
  if (!startIso || !endIso) return '—'
  return `${fromIsoDate(startIso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} – ${fromIsoDate(endIso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`
}

// Compact status line shown on each day selector chip.
function daySummaryLabel(day = {}) {
  if (day.enabled === false) return 'Off'
  const windows = day.slots || []
  if (!windows.length) return 'Configure hours'
  if (windows.length === 1) {
    return `${format12h(
      parseTimeToMinutes(windows[0].start),
    )} – ${format12h(parseTimeToMinutes(windows[0].end))}`
  }
  return `${windows.length} time ranges`
}

function createDraft(astrologerId, key, source, today) {
  const template = source || {}
  const fallback = defaultAvailabilityPeriod(today)
  const startIso =
    template.availabilityPeriod?.start || fallback.start
  // The end date is the astrologer's own choice within the max 90-day window —
  // never derived or forced back to a full 90 days.
  const period = {
    start: startIso,
    end: template.availabilityPeriod?.end || fallback.end,
  }

  return {
    id:
      template.id ||
      `appointment-availability-${astrologerId}-${key}`,
    astrologerId,
    monthKey: key,
    monthLabel: monthLabel(monthDate(key)),
    timezone: 'Asia/Kolkata',
    availabilityPeriod: {
      start: period.start,
      end: period.end,
    },
    appointmentDuration: DURATIONS.includes(
      Number(template.appointmentDuration),
    )
      ? Number(template.appointmentDuration)
      : 30,
    appointmentPrice:
      Number.isFinite(Number(template.appointmentPrice))
        ? Number(template.appointmentPrice)
        : 799,
    appointmentBuffer:
      Number.isFinite(Number(template.appointmentBuffer)) &&
      Number(template.appointmentBuffer) >= 0
        ? Math.round(Number(template.appointmentBuffer))
        : 5,
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
    weeklyTemplate: deriveWeeklyTemplate(template),
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

// Pick a sensible default break inside the working windows so the added break
// is immediately valid against the day's working hours AND does not overlap any
// existing break. Without this, every subsequent "+ Add Break" would propose
// the same mid-window range and be rejected, blocking multiple breaks.
function suggestBreak(windows, existing = []) {
  const candidates = (windows && windows.length ? windows : DEFAULT_WINDOWS)
    .filter(isValidRange)
    .map((win) => ({
      start: parseTimeToMinutes(win.start),
      end: parseTimeToMinutes(win.end),
    }))

  if (!candidates.length) {
    return { start: '09:00', end: '16:00' }
  }

  const taken = (existing || [])
    .filter(isValidRange)
    .map((item) => ({
      start: parseTimeToMinutes(item.start),
      end: parseTimeToMinutes(item.end),
    }))

  const BREAK_LENGTH = 30

  const fits = (start, end) =>
    start + BREAK_LENGTH <= end &&
    !taken.some((item) => start < item.end && end > item.start)

  for (const win of candidates) {
    // 1) Prefer a comfortable mid-window slot.
    const mid = win.start + Math.floor((win.end - win.start) / 2)
    for (const [start, end] of [
      [mid - BREAK_LENGTH, mid + BREAK_LENGTH],
      [mid - Math.floor(BREAK_LENGTH / 2), mid + Math.ceil(BREAK_LENGTH / 2)],
    ]) {
      if (fits(start, end)) {
        return { start: t24(start), end: t24(end) }
      }
    }

    // 2) Otherwise scan the window for the first 30-min gap clear of breaks.
    for (
      let start = win.start;
      start + BREAK_LENGTH <= win.end;
      start += 5
    ) {
      const end = start + BREAK_LENGTH
      if (fits(start, end)) {
        return { start: t24(start), end: t24(end) }
      }
    }
  }

  // 3) No free gap inside the windows — fall back to the first window's span.
  const win = candidates[0]
  return {
    start: t24(win.start),
    end: t24(win.end),
  }
}

// Shared working-hours editor. Handles both the weekly schedule (per weekday,
// `slots` key) and the one-off daily schedule (date override, `windows` key).
// Working hours can contain several windows and each window is editable.
function WorkingHoursEditor({ schedule, onChange, daily = false, allowAllDay = true }) {
  const [hoursCollapsed, setHoursCollapsed] =
    useState(false)
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

            {allowAllDay && (
              <button
                type="button"
                onClick={() => setAllDay(!allDay)}
              >
                {allDay ? 'Set specific hours' : 'All Day'}
              </button>
            )}

            <button
              type="button"
              className="apt-collapse-toggle"
              aria-expanded={!hoursCollapsed}
              aria-label={
                hoursCollapsed
                  ? 'Expand working hours'
                  : 'Collapse working hours'
              }
              onClick={() =>
                setHoursCollapsed((current) =>
                  toggleCollapsed(current),
                )
              }
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {!hoursCollapsed &&
            (allDay ? (
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
            ))}
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
  const [breaksCollapsed, setBreaksCollapsed] =
    useState(false)
  const hasBreaks = breaks.length > 0

  return (
    <div className="apt-schedule-breaks">
      <div className="apt-schedule-breaks__head">
        <Coffee size={14} />
        <span>Break Hours</span>
        <small>
          {hasBreaks
            ? `${breaks.length} configured`
            : 'None configured'}
        </small>

        <button
          type="button"
          className="apt-collapse-toggle"
          aria-expanded={!breaksCollapsed}
          aria-label={
            breaksCollapsed
              ? 'Expand break hours'
              : 'Collapse break hours'
          }
          onClick={() =>
            setBreaksCollapsed((current) =>
              toggleCollapsed(current),
            )
          }
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {!breaksCollapsed && (
        <>
          <label className="apt-continue-toggle">
            <input
              type="checkbox"
              checked={continueWithoutBreak}
              onChange={(event) =>
                onToggleContinue(
                  event.target.checked,
                )
              }
            />
            <span>Continue without Break</span>
          </label>

          {continueWithoutBreak ? (
            <div className="apt-continue-without-break">
              <span>
                Continue without break is ON — no
                active breaks for this day.
              </span>
            </div>
          ) : (
            <>
              {hasBreaks && (
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

              {shouldShowBreakReminder({
                breaks,
                continueWithoutBreak,
              }) && (
                <p className="apt-break-reminder">
                  <strong>*</strong>
                  <span>
                    You haven&apos;t added a break
                    yet. Add a break or choose
                    Continue without Break.
                  </span>
                </p>
              )}

              <button
                type="button"
                className="btn btn-outline"
                onClick={onAdd}
              >
                + Add Break
              </button>
            </>
          )}

          {error && (
            <p
              className="apt-schedule-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function SlotStatus({ slot }) {
  const completed = slot.status === 'completed' || slot.completed
  const closed = slot.status === 'closed' || slot.status === 'past' || slot.closed
  // The engine resolves the label from the slot's end time so a preset/future
  // "Completed" record never reads Completed before its time. Fall back to the
  // appointment record only when no engine label exists.
  const label = slot.label || (closed
    ? 'Closed'
    : slot.status === 'booked'
      ? slot.appointment?.status || 'Booked'
      : completed
        ? slot.appointment?.status === 'No-show'
          ? 'No-show'
          : 'Completed'
        : 'Available')

  const className = closed
    ? 'apt-slot-status is-closed'
    : slot.status === 'booked'
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

// Status class placed on the whole slot box/card so the entire card (not just
// the label) visually communicates Available / Booked / Completed / Closed.
function slotStatusClass(slot) {
  const status = slot?.status || 'available'
  if (status === 'booked') return 'is-booked'
  if (status === 'completed') return 'is-completed'
  if (status === 'closed' || status === 'past') return 'is-closed'
  return 'is-available'
}

function DateSummaryModal({
  date,
  template,
  appointments,
  now,
  published = false,
  availabilityPeriod,
  onClose,
  onEdit,
}) {
  if (!date || !template) return null

  const iso = toIsoDate(date)
  const isPast = iso < toIsoDate(now)
  const availability = getDateAvailability(
    template,
    date,
  )

  const summary = getAppointmentSlotSummary({
    template,
    date,
    appointments,
    now,
    availabilityPeriod,
  })

  const holiday = availability.holiday
  const badgeLabel = isPast
    ? 'Closed'
    : availability.status === 'Unavailable'
      ? 'Unavailable'
      : summary.remaining > 0
        ? 'Available'
        : 'Fully Booked'

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

        {isPast && (
          <div className="apt-holiday-banner apt-past-banner">
            <CalendarDays size={17} />

            <div>
              <strong>
                Past date — slots closed
              </strong>
              <span>
                This date has already passed. None of
                its slots can be booked again; the
                details below are shown for
                reference.
              </span>
            </div>
          </div>
        )}

        <div className="apt-summary-stats">
          <div className="apt-summary-hours">
            <span>Working Hours</span>
            <strong>
              {availability.windows?.length ? (
                availability.windows.map(
                  (window) => (
                    <span
                      key={`${window.start}-${window.end}`}
                    >
                      {format12h(
                        parseTimeToMinutes(
                          window.start,
                        ),
                      )}
                      {' – '}
                      {format12h(
                        parseTimeToMinutes(
                          window.end,
                        ),
                      )}
                    </span>
                  ),
                )
              ) : (
                'Not available'
              )}
            </strong>
          </div>

          <div>
            <span>Duration</span>
            <strong>
              {template.appointmentDuration} Minutes
            </strong>
          </div>

          <div>
            <span>Appointment Buffer</span>
            <strong>
              {appointmentBufferMinutes(template) > 0
                ? `${appointmentBufferMinutes(template)} min`
                : 'None'}
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
                badgeLabel
              }
            />
          </div>

          {summary.slots.length ? (
            <div className="apt-summary-slots">
              {summary.slots.map((slot) => (
                <div
                  className={`apt-summary-slot ${slotStatusClass(slot)}`}
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

function PublishedPeriodModal({
  astrologerId,
  templates = [],
  appointments = [],
  now,
  period,
  onClose,
  onOpenDay,
}) {
  const periodOk = Boolean(period?.start && period?.end)
  const periodStart = periodOk
    ? fromIsoDate(period.start)
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = periodOk
    ? fromIsoDate(period.end)
    : new Date(now.getFullYear(), now.getMonth() + 3, 0)

  // Start viewing at the period's first month. Backwards navigation allows any
  // earlier month for read-only history; forward navigation stops at the month
  // that contains the period end.
  const [viewMonth, setViewMonth] = useState(() =>
    new Date(
      periodStart.getFullYear(),
      periodStart.getMonth(),
      1,
    ),
  )

  const lastViewMonth = new Date(
    periodEnd.getFullYear(),
    periodEnd.getMonth(),
    1,
  )

  // A view month that ends before the period start is historical — shown for
  // reference only, never editable or selectable.
  const lastDayOfView = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  )
  const historicalView =
    lastDayOfView < periodStart

  const monthTemplates = templates.filter(
    (item) => item.astrologerId === astrologerId,
  )

  const snapshotFor = (date) =>
    publishedSnapshotForDate({
      templates: monthTemplates,
      date,
    })

  // Monday-first 42-day grid, matching the Monthly Schedule calendar exactly.
  const gridStart = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
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

  const isCurrentMonth = (date) =>
    date.getMonth() === viewMonth.getMonth() &&
    date.getFullYear() === viewMonth.getFullYear()
  const todayIso = toIsoDate(now)

  const periodLabel = formatPeriod(
    period?.start,
    period?.end,
  )

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
        className="apt-summary-modal apt-published-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Published availability calendar"
      >
        <div className="apt-summary-modal__head">
          <div>
            <span>
              Published Availability
            </span>
            <h3>
              {viewMonth.toLocaleDateString('en-IN', {
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            <p className="apt-published-modal__period">
              Users can book published
              availability for this period:{' '}
              <strong>{periodLabel}</strong>
            </p>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close published availability"
          >
            <X size={18} />
          </button>
        </div>

        <div className="apt-published-modal__nav">
          <button
            type="button"
            className="icon-btn"
            onClick={() =>
              setViewMonth(
                addMonths(viewMonth, -1),
              )
            }
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>

          <strong>
            {viewMonth.toLocaleDateString('en-IN', {
              month: 'long',
              year: 'numeric',
            })}
          </strong>

          <button
            type="button"
            className="icon-btn"
            disabled={
              viewMonth.getTime() >=
              lastViewMonth.getTime()
            }
            onClick={() =>
              setViewMonth(
                addMonths(viewMonth, 1),
              )
            }
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {historicalView && (
          <p className="apt-published-modal__readonly">
            This month is before the published
            period and is shown for reference
            only — availability here is not
            current and cannot be edited.
          </p>
        )}

        <div className="apt-scheduling-calendar apt-scheduling-calendar--published">
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
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="apt-scheduling-calendar__grid">
            {gridDates.map((date) => {
              const iso = toIsoDate(date)
              const inViewMonth =
                isCurrentMonth(date)
              // Calendar days before today are closed for new bookings.
              const isPast = iso < todayIso
              const snapshot =
                snapshotFor(date)
              const isOverridden = Boolean(
                snapshot?.dateOverrides?.[iso],
              )

              const withinPeriod = periodOk
                ? iso >= period.start &&
                  iso <= period.end
                : true

              // Historical months read their own
              // published snapshot only (single-day
              // gate), so they show the reference
              // counts that were live then.
              const summaryPeriod =
                historicalView && inViewMonth
                  ? { start: iso, end: iso }
                  : periodOk
                    ? period
                    : undefined

              const summary = snapshot
                ? getAppointmentSlotSummary({
                    template: snapshot,
                    date,
                    appointments,
                    now,
                    availabilityPeriod:
                      summaryPeriod,
                  })
                : null
              const availability =
                snapshot
                  ? getDateAvailability(
                      snapshot,
                      date,
                    )
                  : null
              const isHoliday = Boolean(
                availability?.holiday,
              )

              const {
                state,
                label,
                actionable,
              } = publishedCellState({
                inViewMonth,
                isPast,
                historicalView,
                withinPeriod,
                hasSnapshot: Boolean(snapshot),
                summaryTotal:
                  summary?.total || 0,
                remaining: summary?.remaining || 0,
                isHoliday,
              })

              return (
                <button
                  type="button"
                  key={iso}
                  disabled={!actionable}
                  onClick={() =>
                    onOpenDay(
                      new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                      ),
                    )
                  }
                  className={[
                    'apt-scheduling-date',
                    `is-${state}`,
                    iso === todayIso
                      ? 'is-today'
                      : '',
                    isOverridden
                      ? 'is-override'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={
                    summary &&
                    summary.total > 0
                      ? `${date.toDateString()}: ${summary.total} slots, ${summary.available} available`
                      : undefined
                  }
                >
                  <strong>
                    {date.getDate()}
                  </strong>

                  {isPast ? (
                    <>
                      <span className="apt-cell-line apt-cell-closed">
                        Closed
                      </span>

                      {summary &&
                      (summary.booked > 0 ||
                        summary.completed > 0) ? (
                        <em
                          aria-label={[
                            summary.booked > 0
                              ? `${summary.booked} Booked`
                              : '',
                            summary.completed > 0
                              ? `${summary.completed} Completed`
                              : '',
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        >
                          {summary.booked > 0 ? (
                            <b>{summary.booked} booked</b>
                          ) : null}
                          {summary.completed > 0 ? (
                            <b className="is-completed">
                              {' '}·{' '}
                              {summary.completed} completed
                            </b>
                          ) : null}
                        </em>
                      ) : null}
                    </>
                  ) : summary && summary.total > 0 ? (
                    <>
                      <span className="apt-cell-line">
                        {summary.total} Slots
                      </span>

                      <em
                        aria-label={[
                          `${summary.available} Available`,
                          summary.booked > 0
                            ? `${summary.booked} Booked`
                            : '',
                          summary.completed > 0
                            ? `${summary.completed} Completed`
                            : '',
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      >
                        {summary.available}{' '}
                        Available
                        {summary.booked >
                        0 ? (
                          <b>
                            {' '}·{' '}
                            {summary.booked} Booked
                          </b>
                        ) : null}
                        {summary.completed >
                        0 ? (
                          <b className="is-completed">
                            {' '}·{' '}
                            {summary.completed}{' '}
                            Completed
                          </b>
                        ) : null}
                      </em>
                    </>
                  ) : (
                    <span>{label}</span>
                  )}

                  {inViewMonth && isOverridden && (
                    <i>Override</i>
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
            Booked
          </span>
          <span className="unavailable">
            Unavailable
          </span>
          <span className="holiday">
            Holiday
          </span>
          <span className="unpublished">
            Unpublished
          </span>
        </div>

        <p className="apt-published-modal__note">
          Dates marked Unpublished sit outside
          the current availability period. Use
          the arrows to scan earlier months for
          reference — those dates are view only
          and never editable.
        </p>
      </div>
    </div>
  )
}

export default function AppointmentAvailabilityPanel({
  astrologerId,
  appointments: propAppointments = [],
}) {
  const {
    appointmentAvailabilityTemplates,
    appointments: contextAppointments,
    actions,
  } = useAppData()
  const { success } = useToast()

  // Single source of truth for the panel's booking data: the shared
  // appointments state from AppDataContext, scoped to this astrologer so the
  // Monthly / Daily / Published summaries always reflect real bookings regardless
  // of how the panel is mounted. The `appointments` prop remains a fallback so
  // callers that pre-filter can keep working unchanged.
  const appointments = useMemo(
    () =>
      (contextAppointments && contextAppointments.length
        ? contextAppointments
        : propAppointments
      ).filter(
        (appointment) =>
          appointment.astrologerId === astrologerId,
      ),
    [contextAppointments, propAppointments, astrologerId],
  )

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

  const [weekErrors, setWeekErrors] = useState({})
  const [dailyError, setDailyError] = useState(null)

  const [weekTemplateError, setWeekTemplateError] =
    useState(null)

  // No weekday detail is open until the astrologer selects a day chip.
  const [selectedDayIndex, setSelectedDayIndex] =
    useState(null)

  const [publishedPeriodOpen, setPublishedPeriodOpen] =
    useState(false)

  const [publishedSummaryDate, setPublishedSummaryDate] =
    useState(null)

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
      today,
    )

  useEffect(() => {
    setDrafts((current) => {
      const nextDraft = createDraft(
        astrologerId,
        key,
        source,
        today,
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
          today,
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

  const updateAvailabilityPeriod = (
    startIso,
    endIso,
  ) => {
    update((current) => {
      const currentPeriod =
        current.availabilityPeriod || {}
      // Both dates are free choices bounded by today → today + 90 days. The
      // end date keeps whatever the astrologer picked; nothing is recalculated.
      const period = clampAvailabilityPeriod({
        start: startIso || currentPeriod.start,
        end: endIso || currentPeriod.end,
        today,
      })

      return {
        ...current,
        availabilityPeriod: period,
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
        today,
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
      availabilityPeriod:
        draft.availabilityPeriod,
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
    const iso = toIsoDate(date)
    const inHorizon =
      isWithinSchedulingHorizon(
        date,
        today,
        3,
      )
    const inPeriod =
      !draft.availabilityPeriod ||
      (iso >= draft.availabilityPeriod.start &&
        iso <= draft.availabilityPeriod.end)
    // Past dates are outside the availability period but may still open for
    // historical inspection (booking is disabled there by the engine).
    const isPast = iso < toIsoDate(today)

    if (
      !inHorizon ||
      (!inPeriod && !isPast)
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
    const date =
      publishedSummaryDate || selectedSummaryDate

    if (date) {
      setSelectedDate(toIsoDate(date))
      setSelectedMonth(
        new Date(
          date.getFullYear(),
          date.getMonth(),
          1,
        ),
      )
    }

    setSelectedSummaryDate(null)
    setPublishedSummaryDate(null)
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

  // ---- Shared weekly template (All Day / Except Sunday source) ------------

  const weeklyTemplate =
    draft.weeklyTemplate || deriveWeeklyTemplate(draft)

  const setWeeklyTemplateEditor = (next) => {
    const windows = Array.isArray(next.slots)
      ? next.slots.length
        ? next.slots
        : DEFAULT_WINDOWS
      : (weeklyTemplate.slots || []).length
        ? weeklyTemplate.slots
        : DEFAULT_WINDOWS
    const breaks = Array.isArray(next.breaks)
      ? next.breaks
      : (weeklyTemplate.breaks || [])

    setWeekTemplateError(
      validateDayBreaks(breaks, windows),
    )

    update((current) => ({
      ...current,
      weeklyTemplate: next,
    }))
  }

  const addTemplateBreak = () => {
    const windows = weeklyTemplate.slots?.length
      ? weeklyTemplate.slots
      : DEFAULT_WINDOWS
    const existing = weeklyTemplate.breaks || []
    const nextBreaks = [
      ...existing,
      suggestBreak(windows, existing),
    ]
    const message = validateDayBreaks(
      nextBreaks,
      windows,
    )

    if (message) {
      setWeekTemplateError(message)
      return
    }

    setWeekTemplateError(null)
    update((current) => ({
      ...current,
      weeklyTemplate: {
        ...(current.weeklyTemplate ||
          weeklyTemplate),
        continueWithoutBreak: false,
        breaks: nextBreaks,
      },
    }))
    success('Successfully added')
  }

  const updateTemplateBreaks = (nextBreaks) => {
    const windows = weeklyTemplate.slots?.length
      ? weeklyTemplate.slots
      : DEFAULT_WINDOWS
    setWeekTemplateError(
      validateDayBreaks(nextBreaks, windows) ||
        null,
    )
    update((current) => ({
      ...current,
      weeklyTemplate: {
        ...(current.weeklyTemplate ||
          weeklyTemplate),
        breaks: nextBreaks,
      },
    }))
  }

  const removeTemplateBreak = (breakIndex) => {
    update((current) => ({
      ...current,
      weeklyTemplate: {
        ...(current.weeklyTemplate ||
          weeklyTemplate),
        breaks: (
          (current.weeklyTemplate ||
            weeklyTemplate).breaks ||
          []
        ).filter(
          (_, index) => index !== breakIndex,
        ),
      },
    }))
    success('Removed successfully')
  }

  const toggleTemplateContinue = (enabled) => {
    update((current) => ({
      ...current,
      weeklyTemplate: {
        ...(current.weeklyTemplate ||
          weeklyTemplate),
        continueWithoutBreak: enabled,
        breaks: enabled
          ? []
          : (current.weeklyTemplate ||
              weeklyTemplate).breaks || [],
      },
    }))
    setWeekTemplateError(null)
  }

  const applySharedToDays = (options) => {
    const sourceTemplate =
      draft.weeklyTemplate || weeklyTemplate

    update((current) => ({
      ...current,
      weeklySchedule: weeklyScheduleFromTemplate(
        current.weeklySchedule,
        current.weeklyTemplate || weeklyTemplate,
        options,
      ),
    }))

    const templateWindows =
      (sourceTemplate.slots || []).filter(
        isValidRange,
      )
    const detail = templateWindows.length
      ? templateWindows
          .map(
            (window) =>
              `${format12h(
                parseTimeToMinutes(
                  window.start,
                ),
              )} – ${format12h(
                parseTimeToMinutes(window.end),
              )}`,
          )
          .join(' · ')
      : 'no working hours configured'
    success(
      options.sundayOff
        ? `Applied to Monday–Saturday (${detail}). Sunday set to Off.`
        : `Applied to all 7 days (${detail}).`,
    )
  }

  const applyAllDays = () =>
    applySharedToDays({})

  const applyExceptSunday = () =>
    applySharedToDays({ sundayOff: true })

  const setWeeklyEnabled = (dayIndex, checked) => {
    const day = dayFor(dayIndex)
    setWeekly(
      dayIndex,
      checked
        ? {
            ...day,
            enabled: true,
            slots: (day.slots || []).length
              ? day.slots
              : DEFAULT_WINDOWS.map(cloneWindow),
          }
        : {
            ...day,
            enabled: false,
          },
    )
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
    const existing = day.breaks || []
    const nextBreaks = [
      ...existing,
      suggestBreak(windows, existing),
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
    const existing = daily.breaks || []
    const nextBreaks = [
      ...existing,
      suggestBreak(windows, existing),
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
  const hasUnpublished = publishedSource
    ? hasUnpublishedChanges(source)
    : false

  // The published card represents the *currently published* period.
  const publishedPeriod =
    publishedSource?.publishedAvailabilityPeriod ||
    publishedSource?.availabilityPeriod ||
    draft.availabilityPeriod
  const availabilityPeriod = formatPeriod(
    publishedPeriod?.start,
    publishedPeriod?.end,
  )

  const openPublishedPreview = () => {
    if (!publishedSource) return
    setSelectedSummaryDate(null)
    setPublishedPeriodOpen(true)
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
              Publish
            </button>
          </div>
        </header>

        <section className="apt-policy-card">
          <div className="apt-policy-card__head">
            <span>Appointment Settings</span>
          </div>

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

          <div>
            <span>Appointment Buffer</span>

            <div className="apt-segmented">
              {APPOINTMENT_BUFFER_OPTIONS.map(
                (buffer) => (
                  <button
                    key={buffer}
                    type="button"
                    className={
                      draft.appointmentBuffer ===
                      buffer
                        ? 'is-active'
                        : ''
                    }
                    onClick={() =>
                      update(
                        (current) => ({
                          ...current,
                          appointmentBuffer:
                            buffer,
                        }),
                      )
                    }
                  >
                    {buffer === 0
                      ? 'None'
                      : `${buffer} min`}
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
            Availability period:{' '}
            <strong>
              {formatPeriod(
                draft.availabilityPeriod?.start,
                draft.availabilityPeriod?.end,
              )}
            </strong>
          </p>

          <p className="apt-policy-note">
            Buffer gaps are rest time between
            appointments — separate from Break
            Hours. They are never slots and never
            count in Total Slots.
          </p>
        </section>

        <section className="apt-period-card">
          <div>
            <span className="apt-weekly-quick__label">
              Availability Period
            </span>

            <h3>When can users book?</h3>

            <p>
              Choose the first bookable day from
              today, then pick an end date yourself
              — anything from the start date up to{' '}
              90 days from today.{' '}
              {formatPeriod(
                draft.availabilityPeriod?.start,
                draft.availabilityPeriod?.end,
              )}{' '}
              is the current selection.
            </p>
          </div>

          <div className="apt-period-card__fields">
            <label>
              <span>Start Date</span>

              <input
                type="date"
                min={availabilityBounds(today).min}
                max={availabilityBounds(today).max}
                value={
                  draft.availabilityPeriod
                    ?.start || ''
                }
                onChange={(event) =>
                  updateAvailabilityPeriod(
                    event.target.value,
                    draft.availabilityPeriod
                      ?.end,
                  )
                }
              />
            </label>

            <label className="apt-period-card__end">
              <span>End Date</span>

              <input
                type="date"
                min={
                  draft.availabilityPeriod?.start ||
                  availabilityBounds(today).min
                }
                max={availabilityBounds(today).max}
                value={
                  draft.availabilityPeriod?.end
                    || ''
                }
                onChange={(event) =>
                  updateAvailabilityPeriod(
                    draft.availabilityPeriod
                      ?.start,
                    event.target.value,
                  )
                }
              />
            </label>

            <p className="apt-period-card__hint">
              Up to 90 days from today. Start can
              be today or later; End can be any
              date from Start through the 90-day
              boundary. Dates before today, after
              the boundary, or before the start
              date are disabled.
            </p>
          </div>
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
                  ? 'Published'
                  : 'Not published'}
                {hasUnpublished &&
                  ' · Edited'}
              </strong>
            </div>

            <div>
              <span>Last Published</span>
              <strong>
                {publishedSource?.publishedAt
                  ? new Date(
                      publishedSource.publishedAt,
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
              <span>Availability Period</span>
              <strong>
                {publishedSource
                  ? availabilityPeriod
                  : '—'}
              </strong>
            </div>
          </div>

          <div className="apt-published-card__note">
            <CalendarDays size={15} />
            Users can book only the published
            availability. Saved changes become
            visible to users after you publish.
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
              View the full published period,
              including weekly rules, daily
              overrides and existing bookings.
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
                <h3>Weekly Schedule</h3>

                <p>
                  Your recurring base availability,
                  shared across all weekdays. Start
                  with the shared template below,
                  then fine-tune any single day.
                </p>
              </div>
            </div>

            <div className="apt-weekly-quick">
              <div>
                <span className="apt-weekly-quick__label">
                  Quick start
                </span>

                <p>
                  Apply the shared weekly template
                  to several weekdays at once.
                  You can still edit any day
                  afterwards.
                </p>
              </div>

              <div className="apt-weekly-quick__buttons">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={applyAllDays}
                >
                  <CalendarDays size={15} />
                  All Day — Monday to Sunday
                </button>

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={applyExceptSunday}
                >
                  <CalendarDays size={15} />
                  Monday–Saturday (Except Sunday)
                </button>
              </div>
            </div>

            <div
              className="apt-weekly-days"
              role="group"
              aria-label="Weekday availability"
            >
              {DAYS.map((meta) => {
                const day = dayFor(meta.dayIndex)
                const selected =
                  selectedDayIndex ===
                  meta.dayIndex

                return (
                  <div
                    className={[
                      'apt-weekly-day-chip',
                      selected
                        ? 'is-selected'
                        : '',
                      day.enabled === false
                        ? 'is-off'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={meta.dayIndex}
                  >
                    <button
                      type="button"
                      className="apt-weekly-day-chip__select"
                      onClick={() =>
                        setSelectedDayIndex(
                          (current) =>
                            openWeekdayDetail(
                              current,
                              meta.dayIndex,
                            ),
                        )
                      }
                      aria-pressed={selected}
                    >
                      <span className="apt-weekly-day-chip__name">
                        {meta.label}
                      </span>

                      <span className="apt-weekly-day-chip__status">
                        {daySummaryLabel(day)}
                      </span>
                    </button>

                    <label
                      className={[
                        'apt-weekly-day-chip__toggle',
                        day.enabled !== false
                          ? 'is-on'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={
                          day.enabled !== false
                        }
                        onChange={(event) =>
                          setWeeklyEnabled(
                            meta.dayIndex,
                            event.target.checked,
                          )
                        }
                        aria-label={`Available ${meta.label}`}
                      />
                      Available
                    </label>
                  </div>
                )
              })}
            </div>

            {selectedDayIndex == null && (
              <p className="apt-weekly-detail-hint">
                Choose a weekday above to view or
                fine-tune that day's schedule. No
                day is open by default.
              </p>
            )}

            <Card className="apt-weekly-template">
              <div className="apt-weekly-panel__head">
                <div>
                  <strong>
                    Shared Weekly Template
                  </strong>

                  <span>
                    The hours and breaks used by{' '}
                    <em>All Day</em> and{' '}
                    <em>Except Sunday</em>, and the
                    default for each weekday.
                  </span>
                </div>
              </div>

              <WorkingHoursEditor
                schedule={weeklyTemplate}
                onChange={setWeeklyTemplateEditor}
                allowAllDay={false}
              />

              <BreaksEditor
                breaks={
                  weeklyTemplate.breaks || []
                }
                windows={
                  weeklyTemplate.slots?.length
                    ? weeklyTemplate.slots
                    : DEFAULT_WINDOWS
                }
                continueWithoutBreak={Boolean(
                  weeklyTemplate.continueWithoutBreak,
                )}
                error={weekTemplateError}
                onChange={updateTemplateBreaks}
                onAdd={addTemplateBreak}
                onRemove={removeTemplateBreak}
                onEditCommit={() =>
                  success('Saved successfully')
                }
                onToggleContinue={
                  toggleTemplateContinue
                }
              />
            </Card>

            {selectedDayIndex != null && (
              <Card className="apt-weekly-day-detail">
                <div className="apt-weekly-panel__head">
                  <div>
                    <strong>
                      {
                        DAYS.find(
                          (meta) =>
                            meta.dayIndex ===
                            selectedDayIndex,
                        )?.label
                      }{' '}
                      detail
                    </strong>

                    <span>
                      {dayFor(selectedDayIndex)
                        .enabled === false
                        ? 'This weekday is currently unavailable.'
                        : 'Overrides the shared template for this weekday only.'}
                    </span>
                  </div>
                </div>

              {dayFor(selectedDayIndex)
                .enabled === false ? (
                <div className="apt-weekly-day-detail__off">
                  <p>
                    This weekday is turned off.
                    Turn it back on to set
                    working hours and breaks.
                  </p>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      setWeeklyEnabled(
                        selectedDayIndex,
                        true,
                      )
                    }
                  >
                    Turn on
                  </button>
                </div>
              ) : (
                <>
                  <WorkingHoursEditor
                    schedule={dayFor(selectedDayIndex)}
                    onChange={(next) =>
                      setWeekly(
                        selectedDayIndex,
                        next,
                      )
                    }
                    allowAllDay={false}
                  />

                  <BreaksEditor
                    breaks={
                      dayFor(selectedDayIndex)
                        .breaks || []
                    }
                    windows={
                      dayFor(selectedDayIndex)
                        .slots?.length
                        ? dayFor(selectedDayIndex)
                            .slots
                        : DEFAULT_WINDOWS
                    }
                    continueWithoutBreak={Boolean(
                      dayFor(selectedDayIndex)
                        .continueWithoutBreak,
                    )}
                    error={
                      weekErrors[selectedDayIndex]
                    }
                    onChange={(nextBreaks) =>
                      updateWeekBreaks(
                        selectedDayIndex,
                        nextBreaks,
                      )
                    }
                    onAdd={() =>
                      addWeekBreak(selectedDayIndex)
                    }
                    onRemove={(breakIndex) =>
                      removeWeekBreak(
                        selectedDayIndex,
                        breakIndex,
                      )
                    }
                    onEditCommit={() =>
                      success('Saved successfully')
                    }
                    onToggleContinue={(enabled) =>
                      toggleWeekContinue(
                        selectedDayIndex,
                        enabled,
                      )
                    }
                  />
                </>
              )}
              </Card>
            )}
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
                  max={
                    draft.availabilityPeriod?.end
                      ? draft.availabilityPeriod.end
                      : toIsoDate(
                          new Date(
                            today.getFullYear(),
                            today.getMonth() + 3,
                            0,
                          ),
                        )
                  }
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
                  const todayIso =
                    toIsoDate(today)

                  const inMonth =
                    date.getMonth() ===
                    selectedMonth.getMonth()

                  const inHorizon =
                    isWithinSchedulingHorizon(
                      date,
                      today,
                      3,
                    )

                  const inPeriod =
                    !draft.availabilityPeriod ||
                    (iso >=
                      draft.availabilityPeriod
                        .start &&
                      iso <=
                        draft.availabilityPeriod
                          .end)

                  // A calendar day before today is a past date: closed for new
                  // bookings, shown for history only.
                  const isPast =
                    iso < todayIso

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
                      availabilityPeriod:
                        draft.availabilityPeriod,
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

                  if (
                    isPast
                  ) {
                    state = 'closed'
                  } else if (
                    !inPeriod
                  ) {
                    state = 'outside'
                  } else if (
                    !inHorizon
                  ) {
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
                        !inHorizon ||
                        (!inPeriod &&
                          !isPast)
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
                        todayIso
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

                      {isPast ? (
                        <>
                          <span className="apt-cell-line apt-cell-closed">
                            Closed
                          </span>

                          {(dateSummary.booked >
                            0 ||
                            dateSummary.completed >
                              0) && (
                            <em
                              aria-label={[
                                dateSummary.booked >
                                0
                                  ? `${dateSummary.booked} Booked`
                                  : '',
                                dateSummary.completed >
                                0
                                  ? `${dateSummary.completed} Completed`
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            >
                              {dateSummary.booked >
                              0 ? (
                                <b>
                                  {dateSummary.booked}{' '}
                                  booked
                                </b>
                              ) : null}
                              {dateSummary.completed >
                              0 ? (
                                <b className="is-completed">
                                  {' '}
                                  ·{' '}
                                  {dateSummary.completed}{' '}
                                  completed
                                </b>
                              ) : null}
                            </em>
                          )}
                        </>
                      ) : dateSummary.total >
                        0 ? (
                        <>
                          <span className="apt-cell-line">
                            {dateSummary.total}{' '}
                            Slots
                          </span>

                          <em
                            aria-label={[
                              `${dateSummary.available} Available`,
                              dateSummary.booked > 0
                                ? `${dateSummary.booked} Booked`
                                : '',
                              dateSummary.completed > 0
                                ? `${dateSummary.completed} Completed`
                                : '',
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          >
                            {dateSummary.available}{' '}
                            Available
                            {dateSummary.booked >
                            0 ? (
                              <b>
                                {' '}
                                · {dateSummary.booked}{' '}
                                Booked
                              </b>
                            ) : null}
                            {dateSummary.completed >
                            0 ? (
                              <b className="is-completed">
                                {' '}
                                ·{' '}
                                {dateSummary.completed}{' '}
                                Completed
                              </b>
                            ) : null}
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

              <span className="closed">
                Past / Closed
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
                Cells show total slots, then
                available · booked (· completed
                when present). Past dates show
                Closed.
              </span>
            </div>
          </section>
        )}
      </Card>

      {publishedSummaryDate && (
        <DateSummaryModal
          date={publishedSummaryDate}
          template={publishedSnapshotForDate({
            templates: appointmentAvailabilityTemplates.filter(
              (item) =>
                item.astrologerId ===
                astrologerId,
            ),
            date: publishedSummaryDate,
          })}
          appointments={appointments}
          now={today}
          published
          availabilityPeriod={publishedPeriod}
          onClose={() => {
            setPublishedSummaryDate(null)
          }}
          onEdit={editSelectedDate}
        />
      )}

      {selectedSummaryDate && (
        <DateSummaryModal
          date={selectedSummaryDate}
          template={draft}
          appointments={appointments}
          now={today}
          onClose={() => {
            setSelectedSummaryDate(null)
          }}
          onEdit={editSelectedDate}
        />
      )}

      {publishedPeriodOpen && (
        <PublishedPeriodModal
          astrologerId={astrologerId}
          templates={appointmentAvailabilityTemplates}
          appointments={appointments}
          now={today}
          period={publishedPeriod}
          onClose={() => setPublishedPeriodOpen(false)}
          onOpenDay={(date) => {
            setPublishedPeriodOpen(false)
            setPublishedSummaryDate(date)
          }}
        />
      )}
    </>
  )
}