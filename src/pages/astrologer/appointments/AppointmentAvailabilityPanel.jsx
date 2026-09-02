import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Save, Send, Trash2, Clock3, Sparkles, Eye, X } from 'lucide-react'
import { useAppData } from '../../../state/AppDataContext.jsx'
import Card from '../../../components/ui/Card.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import AppointmentCalendar from './AppointmentCalendar.jsx'
import { toIsoDate } from '../../../utils/appointments.js'

const WEEKDAYS = [
  { dayIndex: 0, label: 'Sun' },
  { dayIndex: 1, label: 'Mon' },
  { dayIndex: 2, label: 'Tue' },
  { dayIndex: 3, label: 'Wed' },
  { dayIndex: 4, label: 'Thu' },
  { dayIndex: 5, label: 'Fri' },
  { dayIndex: 6, label: 'Sat' },
]

const DEFAULT_WINDOWS = {
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
  6: [
    { start: '10:00', end: '14:00' },
  ],
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function fromMonthKey(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number)
  if (!year || !month) return new Date()
  return new Date(year, month - 1, 1)
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function parseWindowMinutes(value) {
  const [hoursText, minutesText] = String(value || '00:00').split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0
  return hours * 60 + minutes
}

function cloneWindow(slot = {}) {
  return {
    start: typeof slot.start === 'string' && slot.start.trim() ? slot.start : '09:00',
    end: typeof slot.end === 'string' && slot.end.trim() ? slot.end : '10:00',
  }
}

function createDefaultSchedule() {
  return WEEKDAYS.map((day) => ({
    dayIndex: day.dayIndex,
    enabled: day.dayIndex !== 0 && day.dayIndex !== 6,
    slots: (DEFAULT_WINDOWS[day.dayIndex] || []).map(cloneWindow),
  }))
}

function createDraftTemplate(astrologerId, monthKey, source = null) {
  const month = fromMonthKey(monthKey)
  const template = source && typeof source === 'object' ? source : {}
  const weeklySchedule = Array.isArray(template.weeklySchedule)
    ? WEEKDAYS.map((day) => {
        const existingDay = template.weeklySchedule.find((item) => Number(item?.dayIndex) === day.dayIndex)
        const slots = Array.isArray(existingDay?.slots) && existingDay.slots.length
          ? existingDay.slots.map(cloneWindow)
          : (DEFAULT_WINDOWS[day.dayIndex] || []).map(cloneWindow)
        return {
          dayIndex: day.dayIndex,
          enabled: existingDay?.enabled !== false && slots.length > 0,
          slots,
        }
      })
    : createDefaultSchedule()

  return {
    id: template.id || `appointment-availability-${astrologerId || 'astrologer'}-${monthKey}`,
    astrologerId: astrologerId || template.astrologerId || 'astrologer-demo',
    monthKey,
    monthLabel: formatMonthLabel(month),
    timezone: 'Asia/Kolkata',
    status: template.status === 'Published' ? 'Published' : 'Draft',
    publishedAt: template.publishedAt || null,
    updatedAt: template.updatedAt || new Date().toISOString(),
    reminderDismissedForMonthKey: template.reminderDismissedForMonthKey || null,
    dateOverrides: template.dateOverrides && typeof template.dateOverrides === 'object' ? template.dateOverrides : {},
    weeklySchedule,
  }
}

function countOpenWindows(schedule) {
  return schedule.reduce((total, day) => total + (day.enabled ? day.slots.length : 0), 0)
}

function countOpenHours(schedule) {
  return schedule.reduce((total, day) => {
    if (!day.enabled) return total
    return total + day.slots.reduce((sum, slot) => {
      const minutes = Math.max(0, parseWindowMinutes(slot.end) - parseWindowMinutes(slot.start))
      return sum + minutes
    }, 0)
  }, 0)
}

function formatHoursLabel(totalMinutes) {
  const hours = totalMinutes / 60
  if (!hours) return '0h'
  if (hours >= 10 && Number.isInteger(hours)) return `${hours}h`
  return `${hours.toFixed(hours >= 1 ? 1 : 2)}h`
}

const PREVIEW_WEEKLY_SCHEDULE = [
  { dayIndex: 0, enabled: false, slots: [] },
  { dayIndex: 1, enabled: true, slots: [{ start: '09:00', end: '13:00' }, { start: '16:00', end: '19:00' }] },
  { dayIndex: 2, enabled: true, slots: [{ start: '10:00', end: '14:00' }] },
  { dayIndex: 3, enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '17:00', end: '20:00' }] },
  { dayIndex: 4, enabled: false, slots: [] },
  { dayIndex: 5, enabled: true, slots: [{ start: '11:00', end: '15:00' }] },
  { dayIndex: 6, enabled: true, slots: [{ start: '10:00', end: '13:00' }] },
]

function createPreviewTemplate(anchorDate) {
  const monthKey = getMonthKey(anchorDate)
  const monthLabel = formatMonthLabel(anchorDate)
  const leaveDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 4)
  const dyaanDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 11)
  return {
    monthKey,
    monthLabel,
    timezone: 'Asia/Kolkata',
    weeklySchedule: PREVIEW_WEEKLY_SCHEDULE,
    dateOverrides: {
      [toIsoDate(leaveDate)]: { status: 'Leave', windows: [] },
      [toIsoDate(dyaanDate)]: { status: 'Dyaan', windows: [] },
    },
  }
}

function createPreviewAppointments(anchorDate) {
  const dates = [
    new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 3),
    new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 7),
    new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 12),
    new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 14),
  ]
  const windows = [
    ['09:00', '10:00'],
    ['10:30', '11:30'],
    ['16:00', '17:00'],
    ['11:00', '12:00'],
  ]
  return dates.map((date, index) => ({
    id: `template-preview-${index + 1}`,
    dateIso: toIsoDate(date),
    start: windows[index][0],
    end: windows[index][1],
    customerName: 'Example available slot',
    callType: 'Audio',
    status: 'Confirmed',
    topic: 'Template preview',
  }))
}

function DaySchedule({ day, onToggleDay, onUpdateSlot, onAddSlot, onRemoveSlot, readOnly = false }) {
  const hasMultipleSlots = day.slots.length > 1

  return (
    <section className={`apt-slot-day${day.enabled ? '' : ' is-disabled'}`}>
      <div className="apt-slot-day-head">
        <button
          type="button"
          className={`apt-slot-day-toggle${day.enabled ? ' is-active' : ''}`}
          onClick={() => onToggleDay?.(day.dayIndex)}
          aria-pressed={day.enabled}
          disabled={readOnly}
        >
          <CalendarDays size={14} />
          <span>{WEEKDAYS.find((item) => item.dayIndex === day.dayIndex)?.label || 'Day'}</span>
        </button>
        <span className="apt-slot-day-meta">
          {day.enabled ? `${day.slots.length} window${day.slots.length === 1 ? '' : 's'}` : 'Closed'}
        </span>
      </div>

      <div className="apt-slot-day-slots">
        {day.slots.map((slot, slotIndex) => (
          <div key={`${day.dayIndex}-${slotIndex}`} className="apt-slot-window">
            <label>
              <span>Start</span>
              <input
                type="time"
                value={slot.start}
                onChange={(event) => onUpdateSlot?.(day.dayIndex, slotIndex, { start: event.target.value })}
                disabled={readOnly || !day.enabled}
              />
            </label>
            <label>
              <span>End</span>
              <input
                type="time"
                value={slot.end}
                onChange={(event) => onUpdateSlot?.(day.dayIndex, slotIndex, { end: event.target.value })}
                disabled={readOnly || !day.enabled}
              />
            </label>
            {!readOnly && <button
              type="button"
              className="apt-slot-window-remove"
              onClick={() => onRemoveSlot(day.dayIndex, slotIndex)}
              aria-label={`Remove ${WEEKDAYS.find((item) => item.dayIndex === day.dayIndex)?.label || 'day'} slot ${slotIndex + 1}`}
              disabled={!day.enabled || !hasMultipleSlots}
            >
              <Trash2 size={14} />
            </button>}
          </div>
        ))}
      </div>

      {!readOnly && <button
        type="button"
        className="apt-slot-add"
        onClick={() => onAddSlot?.(day.dayIndex)}
        disabled={readOnly || !day.enabled || day.slots.length >= 3}
      >
        <Plus size={14} />
        Add window
      </button>}
    </section>
  )
}

export function TemplatePreview({ onClose }) {
  const [view, setView] = useState('day')
  const [rangeStart, setRangeStart] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 3)
  })
  const [previewDraft, setPreviewDraft] = useState(() => createPreviewTemplate(new Date()))
  const previewTemplate = useMemo(() => ({
    ...previewDraft,
    monthKey: getMonthKey(rangeStart),
    monthLabel: formatMonthLabel(rangeStart),
  }), [previewDraft, rangeStart])
  const previewAppointments = useMemo(() => createPreviewAppointments(rangeStart), [rangeStart])

  const updatePreviewDraft = (mutator) => {
    setPreviewDraft((current) => mutator({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) => ({ ...day, slots: day.slots.map((slot) => ({ ...slot })) })),
      dateOverrides: { ...current.dateOverrides },
    }))
  }

  const handlePreviewToggleDay = (dayIndex) => {
    updatePreviewDraft((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) => day.dayIndex === dayIndex
        ? { ...day, enabled: !day.enabled, slots: day.enabled ? [] : [{ start: '09:00', end: '10:00' }] }
        : day),
    }))
  }

  const handlePreviewUpdateSlot = (dayIndex, slotIndex, patch) => {
    updatePreviewDraft((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) => day.dayIndex === dayIndex
        ? { ...day, slots: day.slots.map((slot, index) => index === slotIndex ? { ...slot, ...patch } : slot) }
        : day),
    }))
  }

  const handlePreviewAddSlot = (dayIndex) => {
    updatePreviewDraft((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) => day.dayIndex === dayIndex && day.slots.length < 3
        ? { ...day, enabled: true, slots: [...day.slots, { start: '18:00', end: '20:00' }] }
        : day),
    }))
  }

  const handlePreviewRemoveSlot = (dayIndex, slotIndex) => {
    updatePreviewDraft((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) => {
        if (day.dayIndex !== dayIndex) return day
        const slots = day.slots.filter((_, index) => index !== slotIndex)
        return { ...day, enabled: slots.length > 0, slots }
      }),
    }))
  }

  const handlePreviewSaveDay = (dateIso, override) => {
    updatePreviewDraft((current) => ({
      ...current,
      dateOverrides: { ...current.dateOverrides, [dateIso]: override },
    }))
  }

  const handlePreviewClearDay = (dateIso) => {
    updatePreviewDraft((current) => {
      const dateOverrides = { ...current.dateOverrides }
      delete dateOverrides[dateIso]
      return { ...current, dateOverrides }
    })
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    (
    <div className="modal-overlay apt-preview-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal-card modal-card--scroll apt-preview-card" role="dialog" aria-modal="true" aria-labelledby="appointment-template-preview-title">
        <header className="modal-card__header apt-preview-header">
          <div>
            <div className="apt-slot-panel__eyebrow">Demo only</div>
            <h2 id="appointment-template-preview-title">Before Publish: Template Setup</h2>
            <p>This is a read-only example of the availability setup page and how the same settings appear in the calendar.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close template preview">
            <X size={18} />
          </button>
        </header>
        <div className="modal-card__content apt-preview-content">
          <div className="apt-preview-note">
            <Eye size={15} />
            <span>Demo only. The sample settings cannot be saved or published. Close this preview to configure the real template.</span>
          </div>
          <div className="apt-preview-summary">
            <div><strong>Draft</strong><span>Status</span></div>
            <div><strong>7</strong><span>Open windows</span></div>
            <div><strong>24h</strong><span>Total hours</span></div>
            <div><strong>Asia/Kolkata</strong><span>Timezone</span></div>
          </div>
          <div className="apt-preview-setup">
            <div className="apt-preview-section-head">
              <div>
                <strong>Weekly availability</strong>
                <span>{previewTemplate.monthLabel} example hours</span>
              </div>
              <div className="apt-preview-actions">
                <button type="button" className="btn btn-outline" disabled>Save draft</button>
                <button type="button" className="btn btn-primary" disabled>Publish month</button>
                <button type="button" className="btn btn-ghost" onClick={() => setPreviewDraft(createPreviewTemplate(rangeStart))}>Reset</button>
              </div>
            </div>
            <div className="apt-slot-editor apt-preview-form">
              {previewTemplate.weeklySchedule.map((day) => (
                <DaySchedule
                  key={day.dayIndex}
                  day={day}
                  onToggleDay={handlePreviewToggleDay}
                  onUpdateSlot={handlePreviewUpdateSlot}
                  onAddSlot={handlePreviewAddSlot}
                  onRemoveSlot={handlePreviewRemoveSlot}
                />
              ))}
            </div>
          </div>
          <div className="apt-preview-calendar">
            <AppointmentCalendar
              appointments={previewAppointments}
              allAppointments={previewAppointments}
              availabilityTemplate={previewTemplate}
              now={new Date()}
              view={view}
              rangeStart={rangeStart}
              statusFilter="upcoming"
              statusOptions={[{ key: 'upcoming', label: 'Demo availability' }]}
              search=""
              onStatusFilterChange={() => {}}
              onSearchChange={() => {}}
              onViewChange={setView}
              onRangeChange={setRangeStart}
              onSelect={() => {}}
              onSaveDayOverride={handlePreviewSaveDay}
              onClearDayOverride={handlePreviewClearDay}
              isPreview
            />
          </div>
        </div>
      </section>
    </div>
    ),
    document.body,
  )
}

export default function AppointmentAvailabilityPanel({ astrologerId }) {
  const { appointmentAvailabilityTemplates, actions } = useAppData()
  const today = new Date()
  const currentMonthKey = getMonthKey(today)
  const nextMonthKey = getMonthKey(new Date(today.getFullYear(), today.getMonth() + 1, 1))
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => fromMonthKey(currentMonthKey))
  const selectedMonthKey = getMonthKey(selectedMonthDate)

  const selectedMonthTemplate = useMemo(
    () => appointmentAvailabilityTemplates.find((template) => template.astrologerId === astrologerId && template.monthKey === selectedMonthKey) || null,
    [appointmentAvailabilityTemplates, astrologerId, selectedMonthKey],
  )

  const nextMonthTemplate = useMemo(
    () => appointmentAvailabilityTemplates.find((template) => template.astrologerId === astrologerId && template.monthKey === nextMonthKey) || null,
    [appointmentAvailabilityTemplates, astrologerId, nextMonthKey],
  )

  const initialDraft = useMemo(
    () => createDraftTemplate(astrologerId, selectedMonthKey, appointmentAvailabilityTemplates.find((template) => template.astrologerId === astrologerId && template.monthKey === selectedMonthKey) || null),
    [astrologerId, appointmentAvailabilityTemplates, selectedMonthKey],
  )

  const [drafts, setDrafts] = useState(() => ({ [selectedMonthKey]: initialDraft }))
  const draft = drafts[selectedMonthKey] || initialDraft

  const startOfSelectedMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1)
  const startOfNextMonth = new Date(startOfSelectedMonth.getFullYear(), startOfSelectedMonth.getMonth() + 1, 1)
  const daysUntilMonthEnd = Math.max(Math.ceil((startOfNextMonth - today) / (24 * 60 * 60 * 1000)), 0)

  const monthReminderNeeded =
    selectedMonthKey === currentMonthKey &&
    daysUntilMonthEnd <= 10 &&
    nextMonthTemplate?.status !== 'Published'

  useEffect(() => {
    setDrafts((prev) => {
      if (prev[selectedMonthKey]) return prev
      return { ...prev, [selectedMonthKey]: initialDraft }
    })
  }, [initialDraft, selectedMonthKey])

  const updateDraft = (mutator) => {
    setDrafts((prev) => {
      const current = prev[selectedMonthKey] || initialDraft
      const next = mutator(createDraftTemplate(astrologerId, selectedMonthKey, current))
      return {
        ...prev,
        [selectedMonthKey]: {
          ...next,
          status: 'Draft',
          updatedAt: new Date().toISOString(),
        },
      }
    })
  }

  const handleToggleMonth = (direction) => {
    setSelectedMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
  }

  const handleToggleDay = (dayIndex) => {
    updateDraft((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) =>
        day.dayIndex === dayIndex
          ? {
              ...day,
              enabled: !day.enabled,
              slots: day.enabled ? [] : (DEFAULT_WINDOWS[dayIndex] || [{ start: '09:00', end: '10:00' }]).map(cloneWindow),
            }
          : day,
      ),
    }))
  }

  const handleUpdateSlot = (dayIndex, slotIndex, patch) => {
    updateDraft((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) => {
        if (day.dayIndex !== dayIndex) return day
        return {
          ...day,
          slots: day.slots.map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot)),
        }
      }),
    }))
  }

  const handleAddSlot = (dayIndex) => {
    updateDraft((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) => {
        if (day.dayIndex !== dayIndex) return day
        if (day.slots.length >= 3) return day
        return {
          ...day,
          enabled: true,
          slots: [...day.slots, { start: '18:00', end: '20:00' }],
        }
      }),
    }))
  }

  const handleRemoveSlot = (dayIndex, slotIndex) => {
    updateDraft((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) => {
        if (day.dayIndex !== dayIndex) return day
        const nextSlots = day.slots.filter((_, index) => index !== slotIndex)
        return {
          ...day,
          enabled: nextSlots.length > 0,
          slots: nextSlots,
        }
      }),
    }))
  }

  const handleReset = () => {
    setDrafts((prev) => ({
      ...prev,
      [selectedMonthKey]: createDraftTemplate(astrologerId, selectedMonthKey, appointmentAvailabilityTemplates.find((template) => template.astrologerId === astrologerId && template.monthKey === selectedMonthKey) || null),
    }))
  }

  const handleSaveDraft = () => {
    const saved = actions.saveAppointmentAvailabilityTemplate(draft)
    if (saved) {
      setDrafts((prev) => ({ ...prev, [selectedMonthKey]: saved }))
    }
  }

  const handlePublish = () => {
    const published = actions.publishAppointmentAvailabilityTemplate(draft)
    if (published) {
      setDrafts((prev) => ({ ...prev, [selectedMonthKey]: published }))
    }
  }

  const openWindows = countOpenWindows(draft.weeklySchedule)
  const openHours = formatHoursLabel(countOpenHours(draft.weeklySchedule))

  return (
    <Card className="apt-slot-panel">
      <div className="apt-slot-panel__head">
        <div className="apt-slot-panel__title-copy">
          <div className="apt-slot-panel__eyebrow">Slot Publishing</div>
          <h2>Publish availability before booking opens</h2>
          <p>
            Set weekly consultation hours for the selected month, then save a draft or publish it for user bookings.
          </p>
        </div>
        <div className="apt-slot-panel__actions">
          <StatusBadge label={draft.status || 'Draft'} className="apt-slot-panel__status" />
          <button type="button" className="btn btn-ghost" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="btn btn-outline" onClick={handleSaveDraft}>
            <Save size={15} />
            Save draft
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePublish}>
            <Send size={15} />
            Publish month
          </button>
        </div>
      </div>

      <div className="apt-slot-panel__meta">
        <div className="apt-slot-month-nav">
          <button type="button" className="icon-btn" onClick={() => handleToggleMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="apt-slot-month-btn is-current" onClick={() => setSelectedMonthDate(fromMonthKey(currentMonthKey))}>
            Current month
          </button>
          <button type="button" className="apt-slot-month-btn" onClick={() => setSelectedMonthDate(fromMonthKey(nextMonthKey))}>
            Next month
          </button>
          <button type="button" className="icon-btn" onClick={() => handleToggleMonth(1)} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
          <span className="apt-slot-month-label">{formatMonthLabel(selectedMonthDate)}</span>
        </div>

        {monthReminderNeeded && (
          <div className="apt-slot-reminder">
            <Sparkles size={15} />
            <span>
              Next month availability is due soon. Prepare the schedule for {formatMonthLabel(new Date(today.getFullYear(), today.getMonth() + 1, 1))}.
            </span>
            <button type="button" className="apt-slot-reminder-btn" onClick={() => setSelectedMonthDate(fromMonthKey(nextMonthKey))}>
              Prepare next month
            </button>
          </div>
        )}
      </div>

      <div className="apt-slot-summary">
        <div className="apt-slot-summary__item">
          <strong>{draft.status || 'Draft'}</strong>
          <span>Status</span>
        </div>
        <div className="apt-slot-summary__item">
          <strong>{openWindows}</strong>
          <span>Open windows</span>
        </div>
        <div className="apt-slot-summary__item">
          <strong>{openHours}</strong>
          <span>Total hours</span>
        </div>
        <div className="apt-slot-summary__item">
          <strong>{draft.timezone}</strong>
          <span>Timezone</span>
        </div>
      </div>

      <div className="apt-slot-editor">
        {draft.weeklySchedule.map((day) => (
          <DaySchedule
            key={day.dayIndex}
            day={day}
            onToggleDay={handleToggleDay}
            onUpdateSlot={handleUpdateSlot}
            onAddSlot={handleAddSlot}
            onRemoveSlot={handleRemoveSlot}
          />
        ))}
      </div>

      <div className="apt-slot-footer">
        <div className="apt-slot-footer__note">
          <Clock3 size={14} />
          <span>
            {selectedMonthTemplate?.status === 'Published'
              ? `This month is already published. Last published on ${selectedMonthTemplate.publishedAt ? new Date(selectedMonthTemplate.publishedAt).toLocaleDateString('en-IN') : 'Not available'}.`
              : 'Publish the schedule once the availability is final. Users can book against the published template.'}
          </span>
        </div>
      </div>
    </Card>
  )
}
