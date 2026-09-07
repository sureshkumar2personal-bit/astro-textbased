import { describe, it, expect } from 'vitest'
import {
  APPOINTMENT_STATUS,
  CANCELLED_STATUSES,
  isCancelledStatus,
  appointmentGroup,
  getAppointmentPhase,
  AUTO_CANCEL_POLICY,
  deriveAutoStatus,
  isAppointmentUpcoming,
  canStartCall,
  generateAppointmentSlots,
  getAppointmentSlotSummary,
  isValidRange,
  isBreakWithinWindows,
  breaksOverlap,
  validateDayBreaks,
  publishedAvailabilitySnapshot,
  hasUnpublishedChanges,
  publishedSnapshotForDate,
  publishedCellState,
  publishedAvailabilityMap,
  availabilityBounds,
  isValidAvailabilityPeriod,
  clampAvailabilityPeriod,
  openWeekdayDetail,
  appointmentBufferMinutes,
  DEFAULT_APPOINTMENT_BUFFER,
  weeklyScheduleFromTemplate,
  DEFAULT_WEEKLY_WINDOWS,
  APPOINTMENT_BUFFER_OPTIONS,
  toggleCollapsed,
  shouldShowBreakReminder,
  getDateAvailability,
  isPastDate,
} from './appointments.js'

describe('appointment status semantics', () => {
  it('exposes the canonical booking statuses', () => {
    expect(APPOINTMENT_STATUS.BOOKED).toBe('Booked')
    expect(APPOINTMENT_STATUS.COMPLETED).toBe('Completed')
    expect(APPOINTMENT_STATUS.CANCELLED_BY_ASTROLOGER).toBe('Cancelled by Astrologer')
    expect(APPOINTMENT_STATUS.CANCELLED_BY_USER).toBe('Cancelled by User')
    expect(APPOINTMENT_STATUS.NO_SHOW).toBe('No-show')
    expect(APPOINTMENT_STATUS.AUTO_CANCELLED).toBe('Auto-cancelled')
  })

  it('identifies cancelled statuses', () => {
    expect(CANCELLED_STATUSES).toContain('Cancelled by Astrologer')
    expect(CANCELLED_STATUSES).toContain('Cancelled by User')
    expect(CANCELLED_STATUSES).toContain('Auto-cancelled')
    expect(isCancelledStatus('Cancelled by Astrologer')).toBe(true)
    expect(isCancelledStatus('Cancelled')).toBe(true)
    expect(isCancelledStatus('Cancelled by User')).toBe(true)
    expect(isCancelledStatus('Auto-cancelled')).toBe(true)
    expect(isCancelledStatus('Booked')).toBe(false)
    expect(isCancelledStatus('Completed')).toBe(false)
  })

  it('groups appointments into history buckets', () => {
    const now = new Date('2026-09-04T12:00:00+05:30')
    const base = { dateIso: '2026-09-10', start: '10:00', end: '10:30', duration: '30 min' }

    expect(appointmentGroup({ ...base, status: 'Booked' }, now)).toBe('upcoming')
    expect(appointmentGroup({ ...base, status: 'Completed' }, now)).toBe('completed')
    expect(appointmentGroup({ ...base, status: 'No-show' }, now)).toBe('completed')
    expect(appointmentGroup({ ...base, status: 'Cancelled by Astrologer' }, now)).toBe('cancelled')
    expect(appointmentGroup({ ...base, status: 'Cancelled by User' }, now)).toBe('cancelled')
    expect(appointmentGroup({ ...base, status: 'Auto-cancelled' }, now)).toBe('cancelled')
  })

  it('derives phase for the new statuses', () => {
    const now = new Date('2026-09-04T12:00:00+05:30')
    const base = { dateIso: '2026-09-10', start: '10:00', end: '10:30' }
    expect(getAppointmentPhase({ ...base, status: 'Cancelled by Astrologer' }, now)).toBe('cancelled')
    expect(getAppointmentPhase({ ...base, status: 'Cancelled by User' }, now)).toBe('cancelled')
    expect(getAppointmentPhase({ ...base, status: 'Auto-cancelled' }, now)).toBe('cancelled')
    expect(getAppointmentPhase({ ...base, status: 'No-show' }, now)).toBe('completed')
  })

  it('centralizes the auto-cancel/no-show policy', () => {
    expect(AUTO_CANCEL_POLICY).toHaveProperty('noShowAfterStartMinutes')
    expect(AUTO_CANCEL_POLICY).toHaveProperty('autoCancelLeadMinutes')
    expect(AUTO_CANCEL_POLICY).toHaveProperty('resolveAfterHours')
  })

  it('derives an automatic no-show after the cutoff has passed', () => {
    const appointment = { dateIso: '2026-09-10', start: '10:00', end: '10:30', status: 'Booked' }
    const at = (h, m) => { const d = new Date(2026, 8, 10, h, m); return d }
    expect(deriveAutoStatus(appointment, at(10, 20))).toEqual({ to: 'No-show' })
    expect(deriveAutoStatus(appointment, at(10, 16))).toEqual({ to: 'No-show' })
    expect(deriveAutoStatus(appointment, at(10, 5))).toBeNull()
    expect(deriveAutoStatus({ ...appointment, status: 'Completed' }, at(11, 0))).toBeNull()
  })
})

describe('upcoming window and start-call gating', () => {
  // Current date: September 4, 2026. Upcoming window = Sep + Oct + Nov.
  const now = new Date('2026-09-04T12:00:00+05:30')
  const base = (over) => ({
    dateIso: '2026-09-10',
    start: '10:00',
    end: '10:30',
    status: 'Booked',
    type: 'Audio Call',
    callType: 'Audio',
    ...over,
  })

  it('classifies future Booked within the current + next 2 months as upcoming', () => {
    expect(isAppointmentUpcoming(base({}), now)).toBe(true)
    expect(isAppointmentUpcoming(base({ dateIso: '2026-09-30' }), now)).toBe(true)
    expect(isAppointmentUpcoming(base({ dateIso: '2026-10-15' }), now)).toBe(true)
    expect(isAppointmentUpcoming(base({ dateIso: '2026-11-27' }), now)).toBe(true)
  })

  it('does not treat historical Booked as upcoming', () => {
    expect(isAppointmentUpcoming(base({ dateIso: '2026-07-20' }), now)).toBe(false)
    expect(isAppointmentUpcoming(base({ dateIso: '2026-08-22' }), now)).toBe(false)
  })

  it('does not treat future Booked beyond the next 2 months as upcoming', () => {
    // December 2026 is outside Sep/Oct/Nov.
    expect(isAppointmentUpcoming(base({ dateIso: '2026-12-01' }), now)).toBe(false)
    expect(isAppointmentUpcoming(base({ dateIso: '2027-01-10' }), now)).toBe(false)
  })

  it('does not treat terminal or rescheduled-original records as upcoming', () => {
    expect(isAppointmentUpcoming(base({ dateIso: '2026-09-20', status: 'Completed' }), now)).toBe(false)
    expect(isAppointmentUpcoming(base({ dateIso: '2026-09-20', status: 'Cancelled by Astrologer' }), now)).toBe(false)
    expect(isAppointmentUpcoming(base({ dateIso: '2026-09-20', status: 'No-show' }), now)).toBe(false)
    expect(isAppointmentUpcoming(base({ dateIso: '2026-09-20', status: 'Auto-cancelled' }), now)).toBe(false)
    expect(isAppointmentUpcoming(base({ dateIso: '2026-09-20', rescheduledTo: 'apt-h-rs-8-22' }), now)).toBe(false)
  })

  it('allows starting a call when live or a future Booked within the window', () => {
    expect(canStartCall(base({}), now)).toBe(true)
    expect(canStartCall(base({ dateIso: '2026-10-15' }), now)).toBe(true)
    withWindow((t) => {
      expect(canStartCall(base({ dateIso: '2026-09-10' }), t)).toBe(true)
    })
  })

  it('blocks starting a call for past, terminal and rescheduled-original records', () => {
    expect(canStartCall(base({ dateIso: '2026-07-20' }), now)).toBe(false)
    expect(canStartCall(base({ dateIso: '2026-12-01' }), now)).toBe(false)
    expect(canStartCall(base({ dateIso: '2026-09-20', status: 'Completed' }), now)).toBe(false)
    expect(canStartCall(base({ dateIso: '2026-09-20', status: 'Cancelled by Astrologer' }), now)).toBe(false)
    expect(canStartCall(base({ dateIso: '2026-09-20', status: 'No-show' }), now)).toBe(false)
    expect(canStartCall(base({ dateIso: '2026-09-20', status: 'Auto-cancelled' }), now)).toBe(false)
    expect(canStartCall(base({ dateIso: '2026-09-20', rescheduledTo: 'apt-h-rs-8-22' }), now)).toBe(false)
    expect(canStartCall(base({ dateIso: '2026-09-20', callType: 'Text' }), now)).toBe(false)
  })
})

function withWindow(fn) {
  fn(new Date('2026-09-10T10:15:00+05:30'))
}

describe('appointment availability engine (weekly schedule)', () => {
  // Reference date: a Thursday within the Sep/Oct/Nov booking horizon.
  const NOW = new Date('2026-09-04T12:00:00+05:30')
  const DATE = '2026-09-10' // Thursday -> dayIndex 4
  const THU = {
    dayIndex: 4,
    enabled: true,
    slots: [{ start: '10:00', end: '13:00' }],
    breaks: [],
  }

  const template = (over = {}) => ({
    appointmentDuration: 30,
    weeklySchedule: [THU],
    dateOverrides: {},
    ...over,
  })

  const run = (tpl, appointments = [], date = DATE, now = NOW) =>
    generateAppointmentSlots({ template: tpl, date, appointments, now })

  it('generates 30-min slots across weekly working hours', () => {
    const slots = run(template())
    expect(slots[0]).toEqual({ startMin: 600, endMin: 630, status: 'available' })
    expect(slots.every((s) => s.endMin - s.startMin === 30)).toBe(true)
    // 10:00-13:00 is 180 min -> 30-min slots, 15-min interval -> many available
    expect(slots.length).toBeGreaterThan(0)
  })

  it('marks an Off day as unavailable', () => {
    const off = { ...template(), weeklySchedule: [{ ...THU, enabled: false }] }
    expect(run(off)).toEqual([])
  })

  it('honours a leave (date override Unavailable)', () => {
    const leave = {
      ...template(),
      dateOverrides: { [DATE]: { status: 'Unavailable', windows: [] } },
    }
    expect(run(leave)).toEqual([])
  })

  it('uses only override hours when a date override exists', () => {
    const override = {
      ...template(),
      dateOverrides: {
        [DATE]: { status: 'Available', windows: [{ start: '14:00', end: '15:00' }] },
      },
    }
    const slots = run(override)
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every((s) => s.startMin >= 840 && s.endMin <= 900)).toBe(true)
  })

  it('supports multiple working periods in one day', () => {
    const multi = {
      ...template(),
      weeklySchedule: [
        {
          dayIndex: 4,
          enabled: true,
          slots: [
            { start: '10:00', end: '11:00' },
            { start: '14:00', end: '15:00' },
          ],
          breaks: [],
        },
      ],
    }
    const starts = run(multi).map((s) => s.startMin)
    expect(starts).toContain(600)
    expect(starts).toContain(840)
  })

  it('generates exactly-duration slots back-to-back (no fixed 15-min grid)', () => {
    const slots = run(template({ appointmentDuration: 40 }))
    expect(slots.every((s) => s.endMin - s.startMin === 40)).toBe(true)
    // 10:00-13:00 with 40-min slots on a 40-min grid gives starts 600,640,680,720.
    expect(slots.map((s) => s.startMin)).toEqual([600, 640, 680, 720])
    expect(slots.map((s) => s.startMin)).not.toContain(615)
  })

  it('never splits/shortens a slot across the window end', () => {
    const narrow = template({
      weeklySchedule: [
        { dayIndex: 4, enabled: true, slots: [{ start: '10:00', end: '10:45' }], breaks: [] },
      ],
      appointmentDuration: 40,
    })
    const slots = run(narrow)
    // Only 10:00-10:40 fits inside 10:00-10:45; 10:15 would end at 10:55 (> end).
    expect(slots.map((s) => s.startMin)).toEqual([600])
  })

  it('supports the 5/10/15/20/30/40 minute durations', () => {
    for (const duration of [5, 10, 15, 20, 30, 40]) {
      const slots = run(template({ appointmentDuration: duration }))
      expect(slots.length).toBeGreaterThan(0)
      expect(slots.every((s) => s.endMin - s.startMin === duration)).toBe(true)
    }
  })

  it('15-minute duration produces only contiguous 15-minute slots', () => {
    // 10:00-13:00 = 180 min -> exactly 12 slots at 15 minutes, back to back.
    const slots = run(template({ appointmentDuration: 15 }))
    expect(slots.map((s) => s.startMin)).toEqual(
      Array.from({ length: 12 }, (_, i) => 600 + i * 15),
    )
    expect(slots.every((s) => s.endMin - s.startMin === 15)).toBe(true)
  })

  it('30-minute duration never produces 15-minute or overlapping slots', () => {
    // 10:00-13:00 = 180 min -> exactly 6 slots at 30 minutes, back to back.
    const slots = run(template({ appointmentDuration: 30 }))
    expect(slots.map((s) => s.startMin)).toEqual(
      Array.from({ length: 6 }, (_, i) => 600 + i * 30),
    )
    expect(slots.every((s) => s.endMin - s.startMin === 30)).toBe(true)
    // No 15-minute leftovers: each slot is exactly the selected duration and
    // the next slot starts where the previous ended.
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].startMin).toBe(slots[i - 1].endMin)
    }
  })

  it('generates slots across every working-hour range without merging them', () => {
    const multi = {
      ...template(),
      weeklySchedule: [
        {
          dayIndex: 4,
          enabled: true,
          slots: [
            { start: '09:00', end: '16:00' },
            { start: '16:30', end: '20:00' },
          ],
          breaks: [],
        },
      ],
    }
    const starts = run(multi).map((s) => s.startMin)
    // Range 1: 09:00-16:00 = 7h -> 14 slots at 30 min.
    expect(starts.filter((s) => s >= 540 && s < 960).length).toBe(14)
    // Range 2: 16:30-20:00 = 3.5h -> 7 slots at 30 min.
    expect(starts.filter((s) => s >= 990 && s < 1200).length).toBe(7)
    // No slot bridges the 16:00-16:30 gap (960-990).
    expect(starts.some((s) => s > 930 && s < 990)).toBe(false)
    expect(starts.includes(930)).toBe(true) // 15:30-16:00
    expect(starts.includes(990)).toBe(true) // 16:30-17:00
  })

  it('totals slots across all working ranges for the printed count', () => {
    const multi = {
      ...template(),
      weeklySchedule: [
        {
          dayIndex: 4,
          enabled: true,
          slots: [
            { start: '09:00', end: '16:00' },
            { start: '16:30', end: '20:00' },
          ],
          breaks: [],
        },
      ],
    }
    const summary = getAppointmentSlotSummary({ template: multi, date: DATE })
    // 14 + 7 = 21 slots exactly as the requirement example.
    expect(summary.total).toBe(21)
  })

  it('removes break time entirely and never crosses a break', () => {
    const withBreak = {
      ...template(),
      weeklySchedule: [
        {
          dayIndex: 4,
          enabled: true,
          slots: [{ start: '09:00', end: '16:00' }],
          breaks: [{ start: '13:00', end: '14:00' }],
        },
      ],
    }
    const starts = run(withBreak).map((s) => s.startMin)
    // 09:00-13:00 = 8 slots and 14:00-16:00 = 4 slots; 12 total.
    expect(starts.length).toBe(12)
    expect(starts.every((s) => s < 780 || s >= 840)).toBe(true)
    expect(starts.includes(780)).toBe(false) // 13:00-13:30 inside break
    expect(starts.includes(840)).toBe(true) // 14:00-14:30 right after break
  })

  it('blocks slots that overlap a break, without shortening them', () => {
    const withBreak = {
      ...template(),
      weeklySchedule: [
        {
          dayIndex: 4,
          enabled: true,
          slots: [{ start: '10:00', end: '13:00' }],
          breaks: [{ start: '12:00', end: '12:30' }],
        },
      ],
      appointmentDuration: 30,
    }
    const starts = run(withBreak).map((s) => s.startMin)
    // Every generated slot must fit entirely outside the break.
    starts.forEach((start) => {
      const end = start + 30
      expect(start >= 750 || end <= 720).toBe(true)
    })
    expect(starts).not.toContain(720) // 12:00-12:30 fully inside the break
    expect(starts).not.toContain(705) // 11:45-12:15 straddles the break
  })

  it('excludes existing appointments using full duration (including across a slot start)', () => {
    const apt = {
      dateIso: DATE,
      start: '11:00',
      end: '11:30',
      duration: '30 min',
      status: 'Booked',
    }
    const starts = run(template({ appointmentDuration: 30 }), [apt]).map((s) => s.startMin)
    // 11:00-11:30 overlaps any slot covering that span.
    starts.forEach((start) => {
      const end = start + 30
      expect(end <= 660 || start >= 690).toBe(true)
    })
    expect(starts).not.toContain(660) // 11:00-11:30 booked exactly
    expect(starts).not.toContain(675) // 11:15-11:45 overlaps the booking
    expect(starts).toContain(630) // 10:30-11:00 ends exactly as the booking starts
    expect(starts).toContain(690) // 11:30-12:00 starts after the booking ends
  })

  it('is empty outside the current + 2 month booking horizon', () => {
    expect(run(template(), [], '2026-12-01')).toEqual([])
    expect(run(template(), [], '2026-07-20')).toEqual([])
  })

  it('blocks past times on the current day', () => {
    // Now is just after 12:00; a 10:00-13:00 window on TODAY should only offer
    // slots that start strictly in the future.
    const now = new Date('2026-09-10T12:00:00+05:30')
    const slots = run(template(), [], DATE, now)
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every((s) => s.startMin > 720)).toBe(true)
    expect(slots.some((s) => s.startMin === 630)).toBe(false) // 10:30 already past
  })

  it('returns no slots on a government holiday', () => {
    // Mock an override to keep the deterministic check: a holiday is Unavailable.
    const holiday = {
      ...template(),
      dateOverrides: { [DATE]: { status: 'Unavailable', windows: [] } },
    }
    expect(run(holiday)).toEqual([])
  })

  it('summary reports booked and available counts with the chosen duration', () => {
    const apt = {
      dateIso: DATE,
      start: '11:00',
      end: '11:30',
      duration: '30 min',
      status: 'Booked',
    }
    const summary = getAppointmentSlotSummary({
      template: template(),
      date: DATE,
      appointments: [apt],
      now: NOW,
    })
    expect(summary.slots.some((s) => s.status === 'booked')).toBe(true)
    expect(summary.slots.some((s) => s.status === 'available')).toBe(true)
    expect(summary.total).toBe(summary.booked + summary.available)
  })

  it('counts only ended Completed/No-show records as completed, not remaining capacity', () => {
    // Time-based rule: a slot is Completed only after its appointment end time
    // has passed (NOW is 11:45, so the 11:00-11:30 record has truly ended).
    const apt = {
      dateIso: DATE,
      start: '11:00',
      end: '11:30',
      duration: '30 min',
      status: 'Completed',
    }
    const single = {
      ...template(),
      weeklySchedule: [
        { dayIndex: 4, enabled: true, slots: [{ start: '11:00', end: '12:00' }], breaks: [] },
      ],
    }
    const summary = getAppointmentSlotSummary({
      template: single,
      date: DATE,
      appointments: [apt],
      now: new Date('2026-09-10T11:45:00+05:30'),
    })
    const completedSlots = summary.slots.filter((s) => s.status === 'completed')
    expect(completedSlots.length).toBeGreaterThan(0)
    expect(summary.completed).toBe(completedSlots.length)
    expect(summary.remaining).toBe(summary.total - summary.booked - summary.completed)
    expect(summary.total).toBe(summary.booked + summary.completed + summary.remaining)
    expect(summary.available).toBe(summary.remaining)
  })

  it('frees a slot again when its appointment is cancelled', () => {
    const apt = {
      dateIso: DATE,
      start: '11:00',
      end: '11:30',
      duration: '30 min',
      status: 'Cancelled by User',
    }
    const summary = getAppointmentSlotSummary({
      template: template(),
      date: DATE,
      appointments: [apt],
      now: NOW,
    })
    expect(summary.slots.find((s) => s.startMin === 660).status).toBe('available')
    expect(summary.booked).toBe(0)
    expect(summary.completed).toBe(0)
  })

  it('counts an ended no-show appointment as completed', () => {
    const apt = {
      dateIso: DATE,
      start: '11:00',
      end: '11:30',
      duration: '30 min',
      status: 'No-show',
    }
    const single = {
      ...template(),
      weeklySchedule: [
        { dayIndex: 4, enabled: true, slots: [{ start: '11:00', end: '12:00' }], breaks: [] },
      ],
    }
    const summary = getAppointmentSlotSummary({
      template: single,
      date: DATE,
      appointments: [apt],
      now: new Date('2026-09-10T11:45:00+05:30'),
    })
    const slot = summary.slots.find((s) => s.startMin === 660)
    expect(slot.status).toBe('completed')
    expect(slot.label).toBe('No-show')
    expect(summary.completed).toBeGreaterThan(0)
    expect(summary.remaining).toBe(summary.total - summary.completed)
  })

  it('gates slots outside the availability period', () => {
    const period = { start: '2026-09-08', end: '2026-12-06' }
    const inside = generateAppointmentSlots({
      template: template(),
      date: '2026-09-10',
      now: NOW,
      availabilityPeriod: period,
    })
    expect(inside.length).toBeGreaterThan(0)
    const outside = generateAppointmentSlots({
      template: template(),
      date: '2026-12-07',
      now: NOW,
      availabilityPeriod: period,
    })
    expect(outside).toEqual([])
  })

  it('generates slots on the exact period start and end dates', () => {
    // Both boundary dates are Thursdays (dayIndex 4, configured) in the future.
    const period = { start: '2026-09-10', end: '2026-09-24' }
    expect(
      generateAppointmentSlots({
        template: template(),
        date: period.start,
        now: NOW,
        availabilityPeriod: period,
      }).length,
    ).toBeGreaterThan(0)
    expect(
      generateAppointmentSlots({
        template: template(),
        date: period.end,
        now: NOW,
        availabilityPeriod: period,
      }).length,
    ).toBeGreaterThan(0)
  })

  it('summaries outside the availability period show no slots or capacity', () => {
    const period = { start: '2026-09-08', end: '2026-12-06' }
    const outside = getAppointmentSlotSummary({
      template: template(),
      date: '2026-12-07',
      now: NOW,
      availabilityPeriod: period,
    })
    expect(outside.total).toBe(0)
    expect(outside.slots).toEqual([])
  })
})

describe('break and working-hour validation', () => {
  const WINDOWS = [{ start: '09:00', end: '16:00' }]

  it('considers a range valid only when start is strictly before end', () => {
    expect(isValidRange({ start: '10:00', end: '12:00' })).toBe(true)
    expect(isValidRange({ start: '10:00', end: '10:00' })).toBe(false)
    expect(isValidRange({ start: '13:00', end: '12:00' })).toBe(false)
    expect(isValidRange(null)).toBe(false)
    expect(isValidRange({ start: '10:00' })).toBe(false)
  })

  it('rejects a break that falls outside the working hours', () => {
    expect(isBreakWithinWindows({ start: '10:00', end: '12:00' }, WINDOWS)).toBe(true)
    expect(isBreakWithinWindows({ start: '08:00', end: '10:00' }, WINDOWS)).toBe(false)
    expect(isBreakWithinWindows({ start: '15:00', end: '17:00' }, WINDOWS)).toBe(false)
  })

  it('detects overlapping breaks', () => {
    expect(breaksOverlap({ start: '10:00', end: '11:00' }, { start: '10:30', end: '11:30' })).toBe(true)
    expect(breaksOverlap({ start: '10:00', end: '10:30' }, { start: '10:30', end: '11:00' })).toBe(false)
  })

  it('validates a whole break list and returns the first problem', () => {
    expect(validateDayBreaks([], WINDOWS)).toBeNull()
    expect(validateDayBreaks([{ start: '10:00', end: '12:00' }], WINDOWS)).toBeNull()
    expect(validateDayBreaks([{ start: '13:00', end: '12:00' }], WINDOWS)).toMatch(/later than/)
    expect(validateDayBreaks([{ start: '07:00', end: '08:00' }], WINDOWS)).toMatch(/working hours/)
    expect(
      validateDayBreaks(
        [
          { start: '10:00', end: '12:00' },
          { start: '11:00', end: '12:30' },
        ],
        WINDOWS,
      ),
    ).toMatch(/overlap/)
  })
})

describe('published availability snapshots', () => {
  const WEEKLY = [
    { dayIndex: 1, enabled: true, slots: [{ start: '10:00', end: '12:00' }], breaks: [] },
  ]
  const baseTemplate = (over = {}) => ({
    astrologerId: 'a1',
    monthKey: '2026-09',
    appointmentDuration: 30,
    appointmentPrice: 799,
    status: 'Published',
    publishedAt: '2026-09-01T10:00:00.000Z',
    weeklySchedule: WEEKLY,
    dateOverrides: {},
    publishedWeeklySchedule: WEEKLY,
    publishedDateOverrides: {},
    publishedAppointmentDuration: 30,
    publishedAppointmentPrice: 799,
    ...over,
  })

  it('returns null when nothing has been published', () => {
    expect(publishedAvailabilitySnapshot({ weeklySchedule: WEEKLY })).toBeNull()
  })

  it('exposes published config when a snapshot exists', () => {
    const snapshot = publishedAvailabilitySnapshot(baseTemplate())
    expect(snapshot.weeklySchedule).toEqual(WEEKLY)
  })

  it('renders the published snapshot, not later draft edits', () => {
    const editedAfterPublish = baseTemplate({
      // Draft changed after publishing; the snapshot must keep the published data.
      weeklySchedule: [
        { dayIndex: 1, enabled: true, slots: [{ start: '08:00', end: '16:00' }], breaks: [] },
      ],
      appointmentDuration: 15,
      appointmentPrice: 999,
      dateOverrides: { '2026-09-14': { status: 'Available', windows: [{ start: '11:00', end: '12:00' }] } },
      availabilityPeriod: { start: '2026-09-05', end: '2026-11-30' },
      publishedAvailabilityPeriod: { start: '2026-09-01', end: '2026-11-28' },
    })
    const snapshot = publishedAvailabilitySnapshot(editedAfterPublish)

    // Published fields win over the edited draft.
    expect(snapshot.weeklySchedule).toEqual(WEEKLY)
    expect(snapshot.appointmentDuration).toBe(30)
    expect(snapshot.appointmentPrice).toBe(799)
    expect(snapshot.dateOverrides).toEqual({})
    expect(snapshot.publishedAvailabilityPeriod).toEqual({ start: '2026-09-01', end: '2026-11-28' })
    // And the snapshot actually drives slot generation from the published window.
    const slots = generateAppointmentSlots({
      template: snapshot,
      date: '2026-09-14', // two Mondays after 2026-08-31 (Sep 7, 14, 21...)
      availabilityPeriod: snapshot.publishedAvailabilityPeriod || snapshot.availabilityPeriod,
    })
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every((s) => s.endMin - s.startMin === 30)).toBe(true)
  })

  it('flags edits as unpublished changes against the snapshot', () => {
    expect(hasUnpublishedChanges(baseTemplate())).toBe(false)
    const edited = baseTemplate({
      weeklySchedule: [
        { dayIndex: 1, enabled: true, slots: [{ start: '10:00', end: '13:00' }], breaks: [] },
      ],
    })
    expect(hasUnpublishedChanges(edited)).toBe(true)
  })

  it('flags a price/duration change as unpublished without a schedule change', () => {
    expect(hasUnpublishedChanges(baseTemplate({ appointmentPrice: 999 }))).toBe(true)
    expect(hasUnpublishedChanges(baseTemplate({ appointmentDuration: 15 }))).toBe(true)
  })

  it('flags an availability-period change as unpublished', () => {
    expect(hasUnpublishedChanges(baseTemplate())).toBe(false)
    const draftPeriod = baseTemplate({
      availabilityPeriod: { start: '2026-09-08', end: '2026-12-07' },
      publishedAvailabilityPeriod: { start: '2026-09-04', end: '2026-12-03' },
    })
    expect(hasUnpublishedChanges(draftPeriod)).toBe(true)
  })

  it('builds a date -> slot-time availability map only from published templates', () => {
    const now = new Date('2026-09-04T12:00:00+05:30')
    const published = baseTemplate()
    const notPublished = {
      ...baseTemplate(),
      monthKey: '2026-10',
      id: 'draft-2',
      status: 'Draft',
      publishedWeeklySchedule: null,
      publishedDateOverrides: null,
      weeklySchedule: [
        { dayIndex: 2, enabled: true, slots: [{ start: '10:00', end: '12:00' }], breaks: [] },
      ],
    }
    const map = publishedAvailabilityMap({
      templates: [published, notPublished],
      astrologerId: 'a1',
      now,
    })
    // The published Monday schedule produces slots; the draft-only month is absent.
    const monday = [...Object.keys(map)].find((iso) => {
      const day = new Date(`${iso}T00:00:00`)
      return day.getDay() === 1
    })
    expect(monday).toBeDefined()
    expect(map[monday].length).toBeGreaterThan(0)
    // October is never a key because its template was never published.
    expect(Object.keys(map).every((iso) => iso.startsWith('2026-09'))).toBe(true)
  })

  it('excludes slots already occupied by a booked appointment', () => {
    const now = new Date('2026-09-04T12:00:00+05:30')
    const mondayIso = [...Array(30)]
      .map((_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`)
      .find((iso) => new Date(`${iso}T00:00:00`).getDay() === 1)
    const appointments = [
      { astrologerId: 'a1', dateIso: mondayIso, start: '10:00', end: '10:30', status: 'Booked' },
    ]
    const map = publishedAvailabilityMap({
      templates: [baseTemplate()],
      astrologerId: 'a1',
      appointments,
      now,
    })
    expect(map[mondayIso]).toBeDefined()
    expect(map[mondayIso]).not.toContain('10:00 AM')
    expect(map[mondayIso]).toContain('10:30 AM')
  })
})

describe('weeklyScheduleFromTemplate (shared weekly quick actions)', () => {
  const baseSchedule = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
    dayIndex,
    enabled: dayIndex !== 0,
    slots: dayIndex === 0 ? [] : [{ start: '09:00', end: '16:00' }],
    breaks: [],
    continueWithoutBreak: false,
  }))

  it('applies the shared template to all 7 days for All Day', () => {
    const template = {
      enabled: true,
      slots: [{ start: '09:00', end: '16:00' }],
      breaks: [{ start: '13:00', end: '13:30' }],
      continueWithoutBreak: false,
    }
    const next = weeklyScheduleFromTemplate(baseSchedule, template)
    expect(next.length).toBe(7)
    for (const day of next) {
      expect(day.enabled).toBe(true)
      expect(day.slots).toEqual([{ start: '09:00', end: '16:00' }])
      expect(day.breaks).toEqual([{ start: '13:00', end: '13:30' }])
    }
  })

  it('Except Sunday sets Monday–Saturday and turns Sunday off', () => {
    const template = { enabled: true, slots: [{ start: '10:00', end: '15:00' }] }
    const next = weeklyScheduleFromTemplate(baseSchedule, template, { sundayOff: true })
    const sunday = next.find((d) => d.dayIndex === 0)
    expect(sunday.enabled).toBe(false)
    // Sunday keeps its existing slots so it can be restored by re-enabling,
    // but breaks and continue-without-break are cleared.
    expect(sunday.breaks).toEqual([])
    expect(sunday.continueWithoutBreak).toBe(false)
    for (const day of next.filter((d) => d.dayIndex !== 0)) {
      expect(day.enabled).toBe(true)
      expect(day.slots).toEqual([{ start: '10:00', end: '15:00' }])
    }
  })

  it('falls back to the default window when the template has no valid windows', () => {
    const template = { enabled: true, slots: [], breaks: [] }
    const next = weeklyScheduleFromTemplate(baseSchedule, template)
    expect(next[1].slots).toEqual(
      DEFAULT_WEEKLY_WINDOWS.map((w) => ({ start: w.start, end: w.end })),
    )
  })

  it('leaves days untouched when they are not in the selected set', () => {
    const template = { enabled: true, slots: [{ start: '08:00', end: '12:00' }] }
    const next = weeklyScheduleFromTemplate(
      baseSchedule,
      template,
      { dayIndexes: [1, 3] },
    )
    expect(next[2].slots).toEqual([{ start: '09:00', end: '16:00' }])
    expect(next[1].slots).toEqual([{ start: '08:00', end: '12:00' }])
  })

  it('copies the continue-without-break setting so each day stays independently editable', () => {
    const template = {
      enabled: true,
      slots: [{ start: '09:00', end: '16:00' }],
      breaks: [],
      continueWithoutBreak: true,
    }
    const next = weeklyScheduleFromTemplate(baseSchedule, template)
    expect(next[1].continueWithoutBreak).toBe(true)
    expect(next[2].continueWithoutBreak).toBe(true)
  })
})

describe('availability period — maximum 90 days, not fixed 90 days', () => {
  const TODAY = new Date('2026-09-05T12:00:00+05:30')

  it('exposes the selectable window from today through today + 90 days', () => {
    expect(availabilityBounds(TODAY)).toEqual({
      min: '2026-09-05',
      max: '2026-12-04',
    })
  })

  it('allows a start date anywhere within today → today + 90 days', () => {
    expect(
      isValidAvailabilityPeriod({ start: '2026-09-05', end: '2026-09-05', today: TODAY }),
    ).toBe(true)
    expect(
      isValidAvailabilityPeriod({ start: '2026-12-04', end: '2026-12-04', today: TODAY }),
    ).toBe(true)
    // Starting before today is invalid.
    expect(
      isValidAvailabilityPeriod({ start: '2026-09-04', end: '2026-09-20', today: TODAY }),
    ).toBe(false)
  })

  it('accepts an end date much shorter than 90 days', () => {
    expect(
      isValidAvailabilityPeriod({ start: '2026-09-07', end: '2026-09-14', today: TODAY }),
    ).toBe(true)
    expect(
      isValidAvailabilityPeriod({ start: '2026-09-07', end: '2026-10-30', today: TODAY }),
    ).toBe(true)
    // A single-day period is valid too.
    expect(
      isValidAvailabilityPeriod({ start: '2026-09-07', end: '2026-09-07', today: TODAY }),
    ).toBe(true)
  })

  it('rejects an end date beyond the 90-day boundary', () => {
    // 05 Dec exceeds the max boundary (04 Dec).
    expect(
      isValidAvailabilityPeriod({ start: '2026-09-05', end: '2026-12-05', today: TODAY }),
    ).toBe(false)
    expect(
      isValidAvailabilityPeriod({ start: '2026-12-04', end: '2026-12-04', today: TODAY }),
    ).toBe(true)
  })

  it('rejects an end date before the start date', () => {
    expect(
      isValidAvailabilityPeriod({ start: '2026-09-14', end: '2026-09-07', today: TODAY }),
    ).toBe(false)
  })

  it('clamps user picks into the allowed window', () => {
    expect(
      clampAvailabilityPeriod({ start: '2026-09-04', end: '2026-12-05', today: TODAY }),
    ).toEqual({ start: '2026-09-05', end: '2026-12-04' })
    expect(
      clampAvailabilityPeriod({ start: '2026-09-14', end: '2026-09-07', today: TODAY }),
    ).toEqual({ start: '2026-09-14', end: '2026-09-14' })
    expect(
      clampAvailabilityPeriod({ start: '2026-09-10', end: '2026-09-18', today: TODAY }),
    ).toEqual({ start: '2026-09-10', end: '2026-09-18' })
  })

  it('does not force the end date to a full 90 days', () => {
    expect(
      isValidAvailabilityPeriod({ start: '2026-09-05', end: '2026-09-15', today: TODAY }),
    ).toBe(true)
    expect(
      isValidAvailabilityPeriod({ start: '2026-09-05', end: '2026-11-30', today: TODAY }),
    ).toBe(true)
  })
})

describe('appointment buffer (separate from break hours)', () => {
  const NOW = new Date('2026-09-04T12:00:00+05:30')
  const PERIOD = { start: '2026-09-05', end: '2026-12-04' }
  const template = (overrides = {}) => ({
    astrologerId: 'a1',
    monthKey: '2026-09',
    appointmentDuration: 30,
    appointmentBuffer: 5,
    weeklySchedule: [
      { dayIndex: 2, enabled: true, slots: [{ start: '09:00', end: '12:00' }], breaks: [] },
    ],
    dateOverrides: {},
    ...overrides,
  })

  it('defaults the appointment buffer to 5 minutes', () => {
    expect(DEFAULT_APPOINTMENT_BUFFER).toBe(5)
    expect(appointmentBufferMinutes({ appointmentBuffer: 5 })).toBe(5)
    expect(appointmentBufferMinutes({})).toBe(0) // legacy back-to-back
    expect(appointmentBufferMinutes({ appointmentBuffer: -3 })).toBe(0)
  })

  it('places a 5-minute gap after every 30-minute slot', () => {
    const slots = generateAppointmentSlots({
      template: template(),
      date: '2026-09-08', // a Tuesday
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    const starts = slots.map((slot) => slot.startMin)
    // 09:00-09:30, 09:35-10:05, 10:10-10:40, 10:45-11:15, 11:20-11:50
    expect(starts).toEqual([540, 575, 610, 645, 680])
    expect(slots.every((slot) => slot.endMin - slot.startMin === 30)).toBe(true)
  })

  it('never counts the buffer gap as an appointment slot', () => {
    const slots = generateAppointmentSlots({
      template: template(),
      date: '2026-09-08',
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    const starts = new Set(slots.map((slot) => slot.startMin))
    // The 5-minute gaps after each slot (570, 605, 640, 675) are absent.
    ;[570, 605, 640, 675].forEach((gap) => expect(starts.has(gap)).toBe(false))
    const summary = getAppointmentSlotSummary({
      template: template(),
      date: '2026-09-08',
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    expect(summary.total).toBe(5)
    expect(summary.slots.length).toBe(5)
  })

  it('never lets a slot cross the end of a working-hour range', () => {
    const slots = generateAppointmentSlots({
      template: template({
        weeklySchedule: [
          {
            dayIndex: 2,
            enabled: true,
            slots: [{ start: '09:00', end: '10:02' }],
            breaks: [],
          },
        ],
      }),
      date: '2026-09-08',
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    // 09:00-09:30 fits; 09:35-10:05 would cross the 10:02 boundary.
    expect(slots).toHaveLength(1)
    expect(slots[0].startMin).toBe(540)
  })

  it('applies the buffer inside each working-hour range independently', () => {
    const slots = generateAppointmentSlots({
      template: template({
        weeklySchedule: [
          {
            dayIndex: 2,
            enabled: true,
            slots: [
              { start: '09:00', end: '10:00' },
              { start: '10:30', end: '11:30' },
            ],
            breaks: [],
          },
        ],
      }),
      date: '2026-09-08',
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    // Range 1: 09:00. Range 2: 10:30. The gap 10:05-10:29 is not a slot.
    expect(slots.map((slot) => slot.startMin)).toEqual([540, 630])
  })

  it('excludes slots that overlap break hours (breaks still gate slots)', () => {
    const slots = generateAppointmentSlots({
      template: template({
        weeklySchedule: [
          {
            dayIndex: 2,
            enabled: true,
            slots: [{ start: '09:00', end: '12:00' }],
            breaks: [{ start: '10:00', end: '10:30' }],
          },
        ],
      }),
      date: '2026-09-08',
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    // The slot straddling the break start (09:35-10:05) and the slot inside the
    // break (10:10-10:40) are both dropped; the others survive.
    expect(slots.map((slot) => slot.startMin)).toEqual([540, 645, 680])
  })

  it('exposes the buffer on the published snapshot', () => {
    const snapshot = publishedAvailabilitySnapshot({
      publishedWeeklySchedule: template().weeklySchedule,
      publishedDateOverrides: {},
      publishedAppointmentBuffer: 10,
      appointmentDuration: 30,
      appointmentPrice: 799,
    })
    expect(snapshot.appointmentBuffer).toBe(10)
  })

  it('flags a buffer change as an unpublished change', () => {
    const base = {
      weeklySchedule: template().weeklySchedule,
      dateOverrides: {},
      publishedWeeklySchedule: template().weeklySchedule,
      publishedDateOverrides: {},
      publishedAppointmentDuration: 30,
      publishedAppointmentPrice: 799,
      publishedAppointmentBuffer: 5,
      appointmentDuration: 30,
      appointmentPrice: 799,
      appointmentBuffer: 10,
    }
    expect(hasUnpublishedChanges(base)).toBe(true)
    expect(
      hasUnpublishedChanges({ ...base, appointmentBuffer: 5 }),
    ).toBe(false)
  })
})

describe('published snapshot across the whole period', () => {
  const THREE_RANGES = [
    { start: '09:00', end: '16:00' },
    { start: '16:30', end: '18:00' },
    { start: '19:00', end: '21:00' },
  ]
  const WEEKLY_LONG = [
    {
      dayIndex: 2,
      enabled: true,
      slots: THREE_RANGES,
      breaks: [],
    },
  ]
  const NOW = new Date('2026-09-04T12:00:00+05:30')
  const PERIOD = { start: '2026-09-05', end: '2026-12-04' }

  const publishedSep = {
    astrologerId: 'a1',
    monthKey: '2026-09',
    appointmentDuration: 30,
    appointmentPrice: 799,
    status: 'Published',
    publishedAt: '2026-09-01T10:00:00.000Z',
    weeklySchedule: WEEKLY_LONG,
    dateOverrides: {},
    publishedWeeklySchedule: WEEKLY_LONG,
    publishedDateOverrides: {},
    publishedAppointmentDuration: 30,
    publishedAppointmentPrice: 799,
    publishedAvailabilityPeriod: PERIOD,
    availabilityPeriod: PERIOD,
  }

  it('keeps every configured working-hour range in the snapshot', () => {
    const snapshot = publishedAvailabilitySnapshot(publishedSep)
    expect(snapshot.weeklySchedule.find((d) => d.dayIndex === 2).slots).toEqual(THREE_RANGES)
  })

  it('generates slots across all three ranges (14 + 3 + 4 = 21)', () => {
    const slots = generateAppointmentSlots({
      template: publishedSep,
      date: '2026-09-15', // a Tuesday inside the period
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    expect(slots).toHaveLength(21)
    const starts = slots.map((slot) => slot.startMin)
    // Each working-hour range produces its own 30-minute slots.
    expect(starts).toContain(540) // 09:00 range 1
    expect(starts).toContain(990) // 16:30 range 2
    expect(starts).toContain(1140) // 19:00 range 3
    // No slot is generated across a gap between ranges.
    expect(slots.every((slot) => slot.endMin - slot.startMin === 30)).toBe(true)
    expect(starts).not.toContain(960) // 16:00–16:30 gap
    expect(starts).not.toContain(1080) // 18:00–19:00 gap
  })

  it('lets the published date summary read all ranges from the snapshot', () => {
    const summary = getAppointmentSlotSummary({
      template: publishedSep,
      date: '2026-09-15',
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    expect(summary.total).toBe(21)
    expect(summary.slots).toHaveLength(21)
    const starts = new Set(summary.slots.map((slot) => slot.startMin))
    expect(starts.has(990)).toBe(true)
    expect(starts.has(1140)).toBe(true)
  })

  it('dates inside the period stay published even in future months', () => {
    const snapshot = publishedSnapshotForDate({
      templates: [publishedSep],
      date: '2026-10-13', // Tuesday in October — no per-month template exists
    })
    expect(snapshot).not.toBeNull()
    // The October date follows the published weekly schedule (3 ranges, 21 slots).
    const slots = generateAppointmentSlots({
      template: snapshot,
      date: '2026-10-13',
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    expect(slots).toHaveLength(21)
    expect(
      slots.map((slot) => slot.startMin).includes(1140),
    ).toBe(true)
  })

  it('returns no snapshot outside the published period (after end, before start in another month)', () => {
    expect(
      publishedSnapshotForDate({ templates: [publishedSep], date: '2026-12-20' }),
    ).toBeNull()
    expect(
      publishedSnapshotForDate({ templates: [publishedSep], date: '2026-08-20' }),
    ).toBeNull()
  })

  it('reads a previous month from its own published snapshot (view-only history)', () => {
    const publishedAug = {
      ...publishedSep,
      monthKey: '2026-08',
      publishedAt: '2026-08-01T10:00:00.000Z',
      publishedAvailabilityPeriod: { start: '2026-08-01', end: '2026-10-29' },
      availabilityPeriod: { start: '2026-08-01', end: '2026-10-29' },
      publishedWeeklySchedule: [
        { dayIndex: 4, enabled: true, slots: [{ start: '10:00', end: '12:00' }], breaks: [] },
      ],
    }
    const snapshot = publishedSnapshotForDate({
      templates: [publishedSep, publishedAug],
      date: '2026-08-13', // a Thursday in August
    })
    expect(snapshot).not.toBeNull()
    expect(snapshot.monthKey).toBe('2026-08')
  })

  it('builds a date → slot map covering future months inside the published period', () => {
    const map = publishedAvailabilityMap({
      templates: [publishedSep],
      astrologerId: 'a1',
      now: NOW,
    })
    const octKeys = Object.keys(map).filter((iso) => iso.startsWith('2026-10'))
    const decKeys = Object.keys(map).filter((iso) => iso.startsWith('2026-12'))
    // Future months inside the period are published, not dropped.
    expect(octKeys.length).toBeGreaterThan(0)
    expect(decKeys.length).toBeGreaterThan(0)
    // Days outside the period are absent (Dec 5 onwards).
    expect(Object.keys(map)).not.toContain('2026-12-05')
    // Tuesday (dayIndex 2) slots in October map to the full three ranges.
    const tuesdayInOctober = '2026-10-13'
    expect(map[tuesdayInOctober]).toHaveLength(21)
  })
})

describe('published calendar cell states', () => {
  it('keeps future months inside the period Available, not Unpublished', () => {
    const cell = publishedCellState({
      inViewMonth: true,
      historicalView: false,
      withinPeriod: true,
      hasSnapshot: true,
      summaryTotal: 21,
      remaining: 18,
      isHoliday: false,
    })
    expect(cell.state).toBe('available')
    expect(cell.actionable).toBe(true)
  })

  it('marks dates before the start as Unpublished', () => {
    const cell = publishedCellState({
      inViewMonth: true,
      historicalView: false,
      withinPeriod: false,
      hasSnapshot: true,
      summaryTotal: 21,
      remaining: 18,
      isHoliday: false,
    })
    expect(cell.state).toBe('unpublished')
    expect(cell.label).toBe('Unpublished')
    expect(cell.actionable).toBe(false)
  })

  it('marks dates after the end as Unpublished', () => {
    const cell = publishedCellState({
      inViewMonth: true,
      historicalView: false,
      withinPeriod: false,
      hasSnapshot: false,
      summaryTotal: 0,
      remaining: 0,
      isHoliday: false,
    })
    expect(cell.state).toBe('unpublished')
    expect(cell.actionable).toBe(false)
  })

  it('shows previous months read-only (viewable but not actionable)', () => {
    const cell = publishedCellState({
      inViewMonth: true,
      historicalView: true,
      withinPeriod: false,
      hasSnapshot: true,
      summaryTotal: 4,
      remaining: 2,
      isHoliday: false,
    })
    expect(cell.state).toBe('available')
    expect(cell.actionable).toBe(false)

    const emptyHistory = publishedCellState({
      inViewMonth: true,
      historicalView: true,
      withinPeriod: false,
      hasSnapshot: false,
      summaryTotal: 0,
      remaining: 0,
      isHoliday: false,
    })
    expect(emptyHistory.state).toBe('unpublished')
  })

  it('keeps the full grid: out-of-month cells stay visible placeholders', () => {
    const cell = publishedCellState({
      inViewMonth: false,
      historicalView: false,
      withinPeriod: false,
      hasSnapshot: false,
      summaryTotal: 0,
      remaining: 0,
      isHoliday: false,
    })
    expect(cell.state).toBe('out-of-month')
    expect(cell.actionable).toBe(false)
  })
})

describe('weekly day-detail selection', () => {
  it('shows no day detail when no day is selected', () => {
    expect(openWeekdayDetail(null, undefined)).toBeNull()
    expect(openWeekdayDetail(null, NaN)).toBeNull()
  })

  it('opens the Monday detail on the first Monday click', () => {
    expect(openWeekdayDetail(null, 1)).toBe(1)
  })

  it('closes the detail when the same day is clicked again', () => {
    expect(openWeekdayDetail(1, 1)).toBeNull()
    expect(openWeekdayDetail(0, 0)).toBeNull()
  })

  it('switches from Monday to Tuesday, and again back to Monday', () => {
    expect(openWeekdayDetail(1, 2)).toBe(2)
    expect(openWeekdayDetail(2, 1)).toBe(1)
  })
})

describe('scheduler corrections — buffer options, collapse, reminder, all ranges kept', () => {
  it('offers only None, 5 and 10 minutes as buffer options (the 15-minute option is removed)', () => {
    expect(APPOINTMENT_BUFFER_OPTIONS).toEqual([0, 5, 10])
    expect(APPOINTMENT_BUFFER_OPTIONS).not.toContain(15)
  })

  it('keeps the default appointment buffer at 5 minutes', () => {
    expect(DEFAULT_APPOINTMENT_BUFFER).toBe(5)
  })

  it('collapses and expands the Working Hours and Break Hours sections', () => {
    expect(toggleCollapsed(false)).toBe(true)
    expect(toggleCollapsed(true)).toBe(false)
    expect(toggleCollapsed(undefined)).toBe(true)
  })

  it('shows the break reminder only when a day has no breaks and Continue without Break is not chosen', () => {
    expect(shouldShowBreakReminder({ breaks: [], continueWithoutBreak: false })).toBe(true)
    expect(shouldShowBreakReminder({})).toBe(true)
    expect(shouldShowBreakReminder({ breaks: [], continueWithoutBreak: true })).toBe(false)
    expect(
      shouldShowBreakReminder({
        breaks: [{ start: '13:00', end: '13:30' }],
        continueWithoutBreak: false,
      }),
    ).toBe(false)
    expect(shouldShowBreakReminder(null)).toBe(false)
  })

  it('keeps every working-hour range inside the weekday detail (no first-range collapse)', () => {
    const template = {
      astrologerId: 'a1',
      weeklySchedule: [
        {
          dayIndex: 2,
          enabled: true,
          slots: [
            { start: '09:00', end: '16:00' },
            { start: '16:30', end: '18:00' },
            { start: '19:00', end: '21:00' },
          ],
        },
      ],
    }
    const availability = getDateAvailability(template, '2026-09-15')
    expect(availability.windows).toHaveLength(3)
  })

  it('keeps every working-hour range inside date-override details too', () => {
    const template = {
      astrologerId: 'a1',
      dateOverrides: {
        '2026-09-20': {
          status: 'Available',
          windows: [
            { start: '10:00', end: '12:00' },
            { start: '13:00', end: '15:00' },
            { start: '16:00', end: '18:00' },
          ],
        },
      },
    }
    const availability = getDateAvailability(template, '2026-09-20')
    expect(availability.windows).toHaveLength(3)
    expect(availability.isOverride).toBe(true)
  })

  it('keeps all three ranges in the published date summary readout', () => {
    const THREE_RANGES = [
      { start: '09:00', end: '16:00' },
      { start: '16:30', end: '18:00' },
      { start: '19:00', end: '21:00' },
    ]
    const template = {
      astrologerId: 'a1',
      appointmentDuration: 30,
      publishedWeeklySchedule: [
        { dayIndex: 2, enabled: true, slots: THREE_RANGES, breaks: [] },
      ],
      publishedDateOverrides: {},
      publishedAppointmentDuration: 30,
    }
    const snapshot = publishedAvailabilitySnapshot(template)
    const availability = getDateAvailability(snapshot, '2026-09-15')
    expect(availability.windows).toEqual(THREE_RANGES)
  })

  it('generates slots across all ranges with buffer and never bridges ranges', () => {
    const template = {
      astrologerId: 'a1',
      appointmentDuration: 30,
      appointmentBuffer: 10,
      weeklySchedule: [
        {
          dayIndex: 2,
          enabled: true,
          slots: [
            { start: '09:00', end: '09:40' },
            { start: '10:20', end: '11:30' },
          ],
        },
      ],
    }
    const slots = generateAppointmentSlots({
      template,
      date: '2026-09-15',
      now: new Date('2026-09-04T12:00:00+05:30'),
      availabilityPeriod: { start: '2026-09-05', end: '2026-12-04' },
    })
    expect(slots).toHaveLength(3)
    expect(slots.map((s) => s.startMin)).toEqual([
      9 * 60,
      10 * 60 + 20,
      11 * 60,
    ])
    expect(slots.map((s) => s.endMin)).toEqual([
      9 * 60 + 30,
      10 * 60 + 50,
      11 * 60 + 30,
    ])
    expect(slots.some((s) => s.startMin === 9 * 60 + 30)).toBe(false)
  })
})

describe('regression: published date details must never collapse to the first working-hour range', () => {
  const THREE_RANGES = [
    { start: '09:00', end: '16:00' },
    { start: '16:30', end: '18:00' },
    { start: '19:00', end: '21:00' },
  ]
  const NOW = new Date('2026-09-04T12:00:00+05:30')
  const PERIOD = { start: '2026-09-05', end: '2026-12-04' }

  const publishedTemplate = {
    id: 't1',
    astrologerId: 'a1',
    monthKey: '2026-09',
    status: 'Published',
    appointmentDuration: 30,
    publishedAppointmentDuration: 30,
    appointmentBuffer: 0,
    publishedAppointmentBuffer: 0,
    weeklySchedule: [
      { dayIndex: 2, enabled: true, slots: THREE_RANGES, breaks: [], continueWithoutBreak: false },
    ],
    publishedWeeklySchedule: [
      { dayIndex: 2, enabled: true, slots: THREE_RANGES, breaks: [], continueWithoutBreak: false },
    ],
    dateOverrides: {},
    publishedDateOverrides: {},
    publishedAvailabilityPeriod: PERIOD,
    availabilityPeriod: PERIOD,
  }

  it('the published snapshot keeps every working-hour range as an array of objects', () => {
    const snapshot = publishedAvailabilitySnapshot(publishedTemplate)
    const day = snapshot.weeklySchedule.find((item) => item.dayIndex === 2)
    expect(Array.isArray(day.slots)).toBe(true)
    expect(day.slots).toEqual(THREE_RANGES)
    // Must NOT be a single { start, end } object.
    expect(day.slots.start).toBeUndefined()
    expect(day.slots.end).toBeUndefined()
  })

  it('resolving a selected published date (weekly template) exposes all 3 ranges', () => {
    const snapshot = publishedSnapshotForDate({
      templates: [publishedTemplate],
      date: '2026-09-15',
    })
    const details = getDateAvailability(snapshot, '2026-09-15')
    expect(details.windows).toEqual(THREE_RANGES)
    expect(details.windows).toHaveLength(3)
  })

  it('a selected published date with a daily override keeps the override’s complete range array', () => {
    const template = {
      ...publishedTemplate,
      weeklySchedule: [{ dayIndex: 2, enabled: true, slots: [], breaks: [] }],
      publishedWeeklySchedule: [{ dayIndex: 2, enabled: true, slots: [], breaks: [] }],
      publishedDateOverrides: {
        '2026-09-15': {
          status: 'Available',
          windows: THREE_RANGES,
          breaks: [],
          continueWithoutBreak: false,
        },
      },
    }
    const snapshot = publishedSnapshotForDate({
      templates: [template],
      date: '2026-09-15',
    })
    const details = getDateAvailability(snapshot, '2026-09-15')
    expect(details.isOverride).toBe(true)
    expect(details.windows).toEqual(THREE_RANGES)
    expect(details.windows).toHaveLength(3)
  })

  it('a future-month published date inherits all 3 ranges from the period-covering snapshot', () => {
    const snapshot = publishedSnapshotForDate({
      templates: [publishedTemplate],
      date: '2026-11-10',
    })
    const details = getDateAvailability(snapshot, '2026-11-10')
    expect(details.windows).toEqual(THREE_RANGES)
  })

  it('the selected published date slot summary counts slots from all 3 ranges (14 + 3 + 4 = 21)', () => {
    const snapshot = publishedSnapshotForDate({
      templates: [publishedTemplate],
      date: '2026-09-15',
    })
    const summary = getAppointmentSlotSummary({
      template: snapshot,
      date: '2026-09-15',
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    expect(summary.total).toBe(21)
    expect(summary.slots).toHaveLength(21)
    const starts = summary.slots.map((slot) => slot.startMin)
    // Ranges contribute at 09:00 (range 1), 16:30 (range 2) and 19:00 (range 3).
    expect(starts).toContain(9 * 60)
    expect(starts).toContain(16 * 60 + 30)
    expect(starts).toContain(19 * 60)
    expect(starts).toContain(16 * 60 + 30 + 30)
    expect(starts).toContain(19 * 60 + 30)
  })

  it('the selected published date slot summary counts all ranges even with a daily override', () => {
    const template = {
      ...publishedTemplate,
      weeklySchedule: [{ dayIndex: 2, enabled: true, slots: [], breaks: [] }],
      publishedWeeklySchedule: [{ dayIndex: 2, enabled: true, slots: [], breaks: [] }],
      publishedDateOverrides: {
        '2026-09-15': {
          status: 'Available',
          windows: THREE_RANGES,
          breaks: [],
          continueWithoutBreak: false,
        },
      },
    }
    const snapshot = publishedSnapshotForDate({
      templates: [template],
      date: '2026-09-15',
    })
    const summary = getAppointmentSlotSummary({
      template: snapshot,
      date: '2026-09-15',
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    expect(summary.total).toBe(21)
  })
})

describe('regression: monthly schedule follows weekly + daily + real booking statuses (single source of truth)', () => {
  // Tuesday 2026-09-15 inside the availability period. Mirrors the monthly
  // calendar date-selection flow: the same generateAppointmentSlots /
  // getAppointmentSlotSummary / getDateAvailability engine powers Monthly,
  // Daily and Published views, so the numbers always agree.
  const THREE_RANGES = [
    { start: '09:00', end: '16:00' },
    { start: '16:30', end: '18:00' },
    { start: '19:00', end: '21:00' },
  ]
  const NOW = new Date('2026-09-04T12:00:00+05:30')
  const PERIOD = { start: '2026-09-05', end: '2026-12-04' }
  const DATE = '2026-09-15' // Tuesday -> dayIndex 2

  const template = (over = {}) => ({
    appointmentDuration: 30,
    appointmentBuffer: 0,
    weeklySchedule: [
      {
        dayIndex: 2,
        enabled: true,
        slots: THREE_RANGES,
        breaks: [],
        continueWithoutBreak: false,
      },
    ],
    dateOverrides: {},
    availabilityPeriod: PERIOD,
    ...over,
  })

  const daySummary = (tpl, appointments = []) =>
    getAppointmentSlotSummary({
      template: tpl,
      date: DATE,
      appointments,
      now: NOW,
      availabilityPeriod: PERIOD,
    })

  const booking = (start, end = '17:00', status = 'Booked', dateIso = DATE) => ({
    id: `apt-${start}-${status}`,
    astrologerId: 'a1',
    dateIso,
    time: '04:30 PM',
    start,
    end,
    status,
  })

  it('1. a monthly date inherits every weekly working-hour range', () => {
    const details = getDateAvailability(template(), DATE)
    expect(details.windows).toEqual(THREE_RANGES)
    expect(details.windows).toHaveLength(3)
  })

  it('2. a monthly date with a daily override uses the override’s ranges instead of weekly', () => {
    const overrideRanges = [
      { start: '10:00', end: '13:00' },
      { start: '15:00', end: '17:00' },
    ]
    const tpl = template({
      weeklySchedule: [
        {
          dayIndex: 2,
          enabled: true,
          slots: THREE_RANGES,
          breaks: [],
        },
      ],
      dateOverrides: { [DATE]: { status: 'Available', windows: overrideRanges, breaks: [] } },
    })
    const details = getDateAvailability(tpl, DATE)
    expect(details.isOverride).toBe(true)
    expect(details.windows).toEqual(overrideRanges)
    expect(details.windows).not.toEqual(THREE_RANGES)
  })

  it('3. a monthly date does not collapse to the first working-hour range only', () => {
    const details = getDateAvailability(template(), DATE)
    expect(details.windows).toHaveLength(3)
    // Only 2 of the 3 ranges would be present if it collapsed to the first.
    const summary = daySummary(template())
    const starts = new Set(summary.slots.map((slot) => slot.startMin))
    expect(starts.has(990)).toBe(true) // 16:30 range 2
    expect(starts.has(1140)).toBe(true) // 19:00 range 3
    // Slot count exceeds what the first range alone (12 at 30 min) would produce.
    expect(summary.total).toBeGreaterThan(12)
  })

  it('4. Total Slots is calculated from ALL working-hour ranges, not only the first', () => {
    // Range 1: 09:00-16:00 = 14 slots. Range 2: 16:30-18:00 = 3. Range 3: 19:00-21:00 = 4.
    expect(daySummary(template()).total).toBe(21)
  })

  it('5. booking a slot changes that slot from Available to Booked', () => {
    const before = daySummary(template())
    expect(before.slots.find((slot) => slot.startMin === 990).status).toBe('available')
    const after = daySummary(template(), [booking('16:30', '17:00')])
    expect(after.slots.find((slot) => slot.startMin === 990).status).toBe('booked')
  })

  it('6. the Booked count updates correctly', () => {
    const summary = daySummary(template(), [booking('16:30', '17:00')])
    expect(summary.booked).toBe(1)
  })

  it('7. a future date with a Completed-marked record still reads Booked, never Completed', () => {
    // "Today" is 2026-09-04 and DATE is 2026-09-15; the 16:30 appointment end
    // (17:00) has not happened yet, so the preset status must not leak.
    const summary = daySummary(template(), [booking('16:30', '17:00', 'Completed')])
    const slot = summary.slots.find((slot) => slot.startMin === 990)
    expect(slot.status).toBe('booked')
    expect(slot.label).toBe('Booked')
  })

  it('8. future Completed-marked records are NOT counted as Completed', () => {
    const summary = daySummary(template(), [booking('16:30', '17:00', 'Completed')])
    expect(summary.completed).toBe(0)
    expect(summary.booked).toBe(1)
  })

  it('9. the Remaining count is Total − Booked − Completed', () => {
    const summary = daySummary(template(), [
      booking('16:30', '17:00', 'Booked'),
      booking('19:00', '19:30', 'Completed'),
    ])
    expect(summary.remaining).toBe(summary.total - summary.booked - summary.completed)
    expect(summary.remaining).toBe(summary.total - 2)
  })

  it('10. booking one slot does not mark any other slot as booked', () => {
    const summary = daySummary(template(), [booking('16:30', '17:00')])
    expect(summary.slots.filter((slot) => slot.status === 'booked')).toHaveLength(1)
    expect(summary.slots.filter((slot) => slot.status === 'available')).toHaveLength(
      summary.total - 1,
    )
  })

  it('11. booking works in the second and third working-hour ranges independently', () => {
    const summary = daySummary(template(), [
      booking('16:30', '17:00'), // range 2
      booking('19:00', '19:30'), // range 3
    ])
    expect(summary.slots.find((slot) => slot.startMin === 990).status).toBe('booked')
    expect(summary.slots.find((slot) => slot.startMin === 1140).status).toBe('booked')
    expect(summary.booked).toBe(2)
    // Slots inside range 1 stay untouched.
    expect(summary.slots.find((slot) => slot.startMin === 540).status).toBe('available')
  })

  it('12. the appointment buffer is never an appointment slot and never counted in Total Slots', () => {
    expect(APPOINTMENT_BUFFER_OPTIONS).toEqual([0, 5, 10])
    expect(APPOINTMENT_BUFFER_OPTIONS).not.toContain(15)
    const buffered = template({ appointmentBuffer: 5 })
    const summary = daySummary(buffered)
    const starts = new Set(summary.slots.map((slot) => slot.startMin))
    // The 5-minute gap after the 09:00–09:30 slot (09:30 = 570) is not a slot,
    // and the next slot starts at 09:35 instead.
    expect(starts.has(570)).toBe(false)
    expect(starts.has(575)).toBe(true)
    // 09:00-16:00 with a 5-min buffer -> 12 slots, not 14.
    expect(summary.slots.filter((slot) => slot.startMin < 960)).toHaveLength(12)
  })

  it('13. a cancelled booking returns its slot to Available and leaves the counts at zero', () => {
    const summary = daySummary(template(), [booking('16:30', '17:00', 'Cancelled by User')])
    expect(summary.slots.find((slot) => slot.startMin === 990).status).toBe('available')
    expect(summary.booked).toBe(0)
    expect(summary.completed).toBe(0)
    expect(summary.remaining).toBe(summary.total)
  })

  it('14. weekly changes synchronize into the monthly date automatically', () => {
    const before = daySummary(template())
    expect(before.total).toBe(21)
    // Simulate saving an edited Weekly Schedule: range 2 is shortened and range 3 removed.
    const edited = template({
      weeklySchedule: [
        {
          dayIndex: 2,
          enabled: true,
          slots: [
            { start: '09:00', end: '16:00' },
            { start: '16:30', end: '17:30' },
          ],
          breaks: [],
        },
      ],
    })
    const after = daySummary(edited)
    expect(after.total).toBe(16) // 14 + 2
    expect(after.slots.map((slot) => slot.startMin)).not.toContain(1140)
  })
})

describe('regression: past dates are closed, today stays live, and every date resolves to ONE schedule used everywhere', () => {
  // Friday 2026-09-04 is "today" for this suite. 2026-09-03 is yesterday (past),
  // 2026-09-15 (Tuesday) is a normal future date inside the period.
  const THREE_RANGES = [
    { start: '09:00', end: '16:00' },
    { start: '16:30', end: '18:00' },
    { start: '19:00', end: '21:00' },
  ]
  const NOW = new Date('2026-09-04T12:00:00+05:30')
  const PERIOD = { start: '2026-09-04', end: '2026-12-04' }
  const YESTERDAY = '2026-09-03' // Thursday
  const TODAY = '2026-09-04' // Friday
  const FUTURE = '2026-09-15' // Tuesday
  const OTHER_FUTURE = '2026-09-08' // next Tuesday, no override

  // Every weekday shares the three ranges so any date resolves a schedule.
  const template = (over = {}) => ({
    appointmentDuration: 30,
    appointmentBuffer: 0,
    weeklySchedule: [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
      dayIndex,
      enabled: true,
      slots: THREE_RANGES,
      breaks: [],
      continueWithoutBreak: false,
    })),
    dateOverrides: {},
    availabilityPeriod: PERIOD,
    ...over,
  })

  const summary = (tpl, date, appointments = []) =>
    getAppointmentSlotSummary({
      template: tpl,
      date,
      appointments,
      now: NOW,
      availabilityPeriod: PERIOD,
    })

  const availableSlots = (tpl, date, appointments = []) =>
    generateAppointmentSlots({
      template: tpl,
      date,
      appointments,
      now: NOW,
      availabilityPeriod: PERIOD,
    })

  const booking = (dateIso, start, end, status = 'Booked') => ({
    id: `apt-${dateIso}-${start}-${status}`,
    astrologerId: 'a1',
    dateIso,
    time: formatSlot(start),
    start,
    end,
    status,
  })

  // Human 12-hour label for a startMin only used to fill the `time` shape.
  const formatSlot = (minutes) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const period = h >= 12 ? 'PM' : 'AM'
    const hh = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hh}:${String(m).padStart(2, '0')} ${period}`
  }

  it('1. yesterday\u2019s date is never Available and produces no bookable slots', () => {
    const s = summary(template(), YESTERDAY)
    expect(s.isPast).toBe(true)
    expect(s.available).toBe(0)
    expect(s.remaining).toBe(0)
    // The date is inside the 3-month horizon, so historical reference is kept.
    expect(s.total).toBeGreaterThan(0)
    expect(s.slots.every((slot) => slot.status === 'closed')).toBe(true)
    expect(
      availableSlots(template(), YESTERDAY),
    ).toEqual([])
  })

  it('2. past unbooked slots become Closed/Past, never Available', () => {
    const s = summary(template(), YESTERDAY)
    expect(s.slots.filter((slot) => slot.status === 'closed')).toHaveLength(s.total)
    expect(s.slots.filter((slot) => slot.status === 'available')).toHaveLength(0)
    expect(s.slots.every((slot) => slot.elapsed === true)).toBe(true)
  })

  it('3. past booked history resolves to Completed once its end time has passed', () => {
    const appt = booking(YESTERDAY, 540, 570)
    const s = summary(template(), YESTERDAY, [appt])
    // The appointment existed, but its 09:30 end time is long past -> Completed.
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('completed')
    expect(s.slots.find((slot) => slot.startMin === 540).label).toBe('Completed')
    expect(s.booked).toBe(0)
    expect(s.completed).toBe(1)
    expect(s.available).toBe(0)
    // Unbooked slots around it stay closed, not available.
    expect(s.slots.find((slot) => slot.startMin === 570).status).toBe('closed')
  })

  it('4. past completed history remains Completed', () => {
    const appt = booking(YESTERDAY, 540, 570, 'Completed')
    const s = summary(template(), YESTERDAY, [appt])
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('completed')
    expect(s.completed).toBe(1)
    expect(s.available).toBe(0)
  })

  it('5. future dates remain Available when a schedule exists', () => {
    const s = summary(template(), FUTURE)
    expect(s.isPast).toBe(false)
    expect(s.available).toBe(s.total)
    expect(s.total).toBe(21)
    expect(availableSlots(template(), FUTURE)).toHaveLength(21)
  })

  it('6. today\u2019s date follows the current schedule rules', () => {
    const s = summary(template(), TODAY)
    expect(s.isPast).toBe(false)
    // At 12:00, morning slots have ended (end time passed) -> Closed, while later
    // slots stay live. The boundary is the END time, never the whole date.
    expect(s.slots.filter((slot) => slot.endMin <= 720 && !slot.appointment)).toHaveLength(
      s.closed,
    )
    expect(s.slots.some((slot) => slot.status === 'closed')).toBe(true)
    expect(s.slots.some((slot) => slot.status === 'available')).toBe(true)
    // Everything the booking engine offers maps 1:1 to Available summary slots
    // (one slot -> one status); the engine additionally requires a future start.
    const offered = availableSlots(template(), TODAY)
    const offeredStarts = new Set(offered.map((slot) => slot.startMin))
    offeredStarts.forEach((startMin) => {
      expect(s.slots.find((slot) => slot.startMin === startMin).status).toBe('available')
    })
    expect(offered.length).toBe(s.available - 1) // the just-started 12:00 slot is live, not bookable
    expect(s.available).toBe(15)
    expect(s.remaining).toBe(s.available)
  })

  it('7. a Completed-marked appointment on a FUTURE date still reads Booked', () => {
    const appt = booking(FUTURE, 540, 570, 'Completed')
    const s = summary(template(), FUTURE, [appt])
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('booked')
    expect(s.slots.find((slot) => slot.startMin === 540).label).toBe('Booked')
    expect(s.completed).toBe(0)
  })

  it('8. an occupied slot (Booked or Completed) can never be booked again', () => {
    const appt = booking(FUTURE, 540, 570, 'Completed')
    const s = summary(template(), FUTURE, [appt])
    // End time has not passed yet, so it reads Booked, but it is still occupied.
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('booked')
    expect(s.slots.find((slot) => slot.startMin === 540).appointment).toBeTruthy()
    // A slot occupied by any appointment is never offered again for booking.
    const offered = availableSlots(template(), FUTURE, [appt])
    expect(offered.some((slot) => slot.startMin === 540)).toBe(false)
    const endedOffered = availableSlots(template(), YESTERDAY, [appt])
    expect(endedOffered).toEqual([]) // and a past date offers nothing at all
  })

  it('9. monthly slot count equals the Appointment Slots count for the same date', () => {
    const s = summary(template(), FUTURE)
    const generated = availableSlots(template(), FUTURE)
    expect(s.total).toBe(generated.length)
    expect(s.total).toBe(21)
  })

  it('10. multiple working-hour ranges give the same count in Monthly and Appointment Slots', () => {
    const buffered = template({ appointmentBuffer: 5 })
    const s = summary(buffered, FUTURE)
    expect(s.total).toBe(17)
    expect(availableSlots(buffered, FUTURE)).toHaveLength(17)
    // Range 2 (16:30) and range 3 (19:00) slots are present in both.
    expect(s.slots.some((slot) => slot.startMin === 990)).toBe(true)
    expect(s.slots.some((slot) => slot.startMin === 1140)).toBe(true)
  })

  it('11. weekly schedule changes propagate to every date without a daily override', () => {
    const changedRanges = [
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '17:00' },
    ]
    const edited = template({
      weeklySchedule: [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
        dayIndex,
        enabled: true,
        slots: changedRanges,
        breaks: [],
        continueWithoutBreak: false,
      })),
    })
    for (const date of [FUTURE, OTHER_FUTURE, '2026-09-11']) {
      expect(getDateAvailability(edited, date).windows).toEqual(changedRanges)
    }
    const s = summary(edited, FUTURE)
    // 09:00-13:00 (8 slots) + 14:00-17:00 (6 slots) = 14.
    expect(s.total).toBe(14)
    expect(availableSlots(edited, FUTURE)).toHaveLength(14)
  })

  it('12. a daily override affects only its specific date', () => {
    const tpl = template({
      dateOverrides: {
        [FUTURE]: { status: 'Available', windows: [{ start: '10:00', end: '13:00' }], breaks: [] },
      },
    })
    expect(getDateAvailability(tpl, FUTURE).windows).toEqual([
      { start: '10:00', end: '13:00' },
    ])
    expect(summary(tpl, FUTURE).total).toBe(6)
    expect(summary(tpl, FUTURE).available).toBe(6)
    // Every other date keeps the weekly three ranges.
    expect(getDateAvailability(tpl, OTHER_FUTURE).windows).toEqual(THREE_RANGES)
    expect(summary(tpl, OTHER_FUTURE).total).toBe(21)
  })

  it('13. monthly never combines old + new schedules or duplicate ranges', () => {
    const dupRanges = [
      ...THREE_RANGES,
      ...THREE_RANGES,
      { start: '09:00', end: '16:00' },
    ]
    const tpl = template({
      weeklySchedule: [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
        dayIndex,
        enabled: true,
        slots: dupRanges,
        breaks: [],
        continueWithoutBreak: false,
      })),
    })
    expect(getDateAvailability(tpl, FUTURE).windows).toHaveLength(3)
    // Also: an override plus weekly ranges never sum — the override wins.
    const withOverride = template({
      dateOverrides: {
        [FUTURE]: { status: 'Available', windows: [{ start: '09:00', end: '16:00' }], breaks: [] },
      },
    })
    expect(summary(withOverride, FUTURE).total).toBe(14)
    expect(summary(withOverride, OTHER_FUTURE).total).toBe(21)
  })

  it('14. monthly never produces duplicate slots', () => {
    const s = summary(template(), FUTURE)
    const starts = new Set(s.slots.map((slot) => slot.startMin))
    expect(starts.size).toBe(s.total)
    expect(s.total).toBe(21)
  })

  it('15. Available / Booked / Completed / Closed counts are correct together, slot by slot', () => {
    // "Today" is 2026-09-04 at 12:00. Slots whose END has passed (start <= 690)
    // are finished: the two that were booked read Completed, the four that were
    // never booked read Closed. Future booked slots stay Booked.
    const appointments = [
      booking(TODAY, 540, 570, 'Completed'), // ended + booked -> Completed
      booking(TODAY, 570, 600), // ended + booked -> Completed (auto, by time)
      booking(TODAY, 990, 1020), // future + booked -> Booked
      booking(TODAY, 1140, 1170), // future + booked -> Booked
    ]
    const s = summary(template(), TODAY, appointments)
    expect(s.booked).toBe(2)
    expect(s.completed).toBe(2)
    expect(s.closed).toBe(4) // 600, 630, 660, 690 never booked and ended
    expect(s.available).toBe(13)
    expect(s.remaining).toBe(s.available)
    expect(s.slots.filter((slot) => slot.status === 'booked')).toHaveLength(2)
    expect(s.slots.filter((slot) => slot.status === 'completed')).toHaveLength(2)
    expect(s.slots.filter((slot) => slot.status === 'closed')).toHaveLength(4)
    expect(s.slots.filter((slot) => slot.status === 'available')).toHaveLength(13)
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('completed')
    expect(s.slots.find((slot) => slot.startMin === 600).status).toBe('closed')
    expect(s.slots.find((slot) => slot.startMin === 990).status).toBe('booked')
  })

  it('16. the date summary keeps every count on one readable line when Completed is present', () => {
    const appointments = [
      booking(TODAY, 540, 570, 'Completed'),
      booking(TODAY, 570, 600),
      booking(TODAY, 990, 1020),
      booking(TODAY, 1140, 1170),
    ]
    const s = summary(template(), TODAY, appointments)
    // This is exactly the line the Monthly cell renders under the date.
    const line = [
      `${s.available} Available`,
      s.booked > 0 ? `\u00b7 ${s.booked} Booked` : '',
      s.completed > 0 ? `\u00b7 ${s.completed} Completed` : '',
    ]
      .filter(Boolean)
      .join(' ')
    expect(line).toBe('13 Available \u00b7 2 Booked \u00b7 2 Completed')
    expect(line).toContain(`${s.completed} Completed`)
    // All three counts survive the compact line; nothing is dropped...
    expect(line.split('\u00b7')).toHaveLength(3)
    // ...and Closed is a separate status, never folded into the Completed count.
    expect(line).not.toContain('Closed')
    expect(s.closed).toBe(4)
  })

  it('17. a past date can never create a new booking', () => {
    // Even with a bogus availability period that spans yesterday, the booking
    // engine refuses past dates entirely.
    const widePeriod = { start: '2026-09-01', end: '2026-12-04' }
    expect(
      generateAppointmentSlots({
        template: template({ availabilityPeriod: widePeriod }),
        date: YESTERDAY,
        appointments: [],
        now: NOW,
        availabilityPeriod: widePeriod,
      }),
    ).toEqual([])
    // And the panel summaries agree: no Available, only Closed history.
    const s = getAppointmentSlotSummary({
      template: template({ availabilityPeriod: widePeriod }),
      date: YESTERDAY,
      appointments: [],
      now: NOW,
      availabilityPeriod: widePeriod,
    })
    expect(s.available).toBe(0)
    expect(s.slots.every((slot) => slot.status === 'closed')).toBe(true)
  })

  it('publishedCellState reports a past date as Closed and not actionable', () => {
    const cell = publishedCellState({
      inViewMonth: true,
      isPast: true,
      historicalView: false,
      withinPeriod: true,
      hasSnapshot: true,
      summaryTotal: 21,
      remaining: 0,
      isHoliday: false,
    })
    expect(cell.state).toBe('closed')
    expect(cell.label).toBe('Closed')
    expect(cell.actionable).toBe(false)
  })
})

describe('regression: slot status is strictly time-based (a future slot can never be Completed)', () => {
  // "Today" is Saturday 2026-09-06 at 2:00 PM (840). Monday 2026-09-07 is a
  // normal future date. The template enables Monday only so every date tested
  // shares exactly the 3 working-hour ranges below.
  const THREE_RANGES = [
    { start: '09:00', end: '16:00' },
    { start: '16:30', end: '18:00' },
    { start: '19:00', end: '21:00' },
  ]
  const NOW = new Date('2026-09-06T14:00:00+05:30')
  const PERIOD = { start: '2026-09-06', end: '2026-12-06' }
  const TODAY = '2026-09-06' // Sunday -> dayIndex 0
  const FUTURE = '2026-09-07' // Monday -> dayIndex 1
  const PAST = '2026-09-05' // Saturday -> dayIndex 6

  const template = (over = {}) => ({
    appointmentDuration: 30,
    appointmentBuffer: 0,
    weeklySchedule: [
      { dayIndex: 0, enabled: true, slots: THREE_RANGES, breaks: [], continueWithoutBreak: false },
      { dayIndex: 1, enabled: true, slots: THREE_RANGES, breaks: [], continueWithoutBreak: false },
      { dayIndex: 6, enabled: true, slots: THREE_RANGES, breaks: [], continueWithoutBreak: false },
    ],
    dateOverrides: {},
    availabilityPeriod: PERIOD,
    ...over,
  })

  const summary = (tpl, date, appointments = [], now = NOW) =>
    getAppointmentSlotSummary({ template: tpl, date, appointments, now, availabilityPeriod: PERIOD })

  const book = (dateIso, start, end, status = 'Booked') => ({
    id: `time-${dateIso}-${start}-${status}`,
    astrologerId: 'a1',
    dateIso,
    time: '04:30 PM',
    start,
    end,
    status,
  })

  // No forced "now" here: engine implements the date+time comparison.
  it('1. future unbooked slot -> Available', () => {
    const s = summary(template(), FUTURE)
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('available')
    expect(s.slots.find((slot) => slot.startMin === 540).label).toBe('Available')
  })

  it('2. future booked slot -> Booked', () => {
    const s = summary(template(), FUTURE, [book(FUTURE, 540, 570)])
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('booked')
    expect(s.slots.find((slot) => slot.startMin === 540).label).toBe('Booked')
  })

  it('3. future slot -> NEVER Completed, even with a preset Completed record', () => {
    const s = summary(template(), FUTURE, [book(FUTURE, 540, 570, 'Completed')])
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('booked')
    expect(s.slots.find((slot) => slot.startMin === 540).label).toBe('Booked')
    expect(s.completed).toBe(0)
    expect(s.slots.some((slot) => slot.status === 'completed')).toBe(false)
    expect(s.slots.some((slot) => slot.status === 'closed')).toBe(false)
  })

  it('4. today\u2019s future (late-day) unbooked slot -> Available', () => {
    const s = summary(template(), TODAY)
    expect(s.slots.find((slot) => slot.startMin === 1140).status).toBe('available') // 19:00
    expect(s.slots.find((slot) => slot.startMin === 1140).label).toBe('Available')
  })

  it('5. today\u2019s future (late-day) booked slot -> Booked', () => {
    const s = summary(template(), TODAY, [book(TODAY, 1140, 1170)])
    expect(s.slots.find((slot) => slot.startMin === 1140).status).toBe('booked')
    expect(s.slots.find((slot) => slot.startMin === 1140).label).toBe('Booked')
  })

  it('6. current/in-progress booked slot (end not passed) -> Booked', () => {
    // 2:15 PM, slot 2:00-2:30 booked: inside its window, end not passed -> Booked.
    const s = summary(template(), TODAY, [book(TODAY, 840, 870)], new Date('2026-09-06T14:15:00+05:30'))
    expect(s.slots.find((slot) => slot.startMin === 840).status).toBe('booked')
    expect(s.slots.find((slot) => slot.startMin === 840).label).toBe('Booked')
  })

  it('7. today\u2019s ended booked slot -> Completed (2:00 PM, slot ended at 1:30)', () => {
    // Slot 09:00-09:30 with a genuine booking; its end (570) is far past NOW.
    const s = summary(template(), TODAY, [book(TODAY, 540, 570)])
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('completed')
    expect(s.slots.find((slot) => slot.startMin === 540).label).toBe('Completed')
    expect(s.completed).toBe(1)
  })

  it('8. today\u2019s ended unbooked slot -> Closed (never Available, never Completed)', () => {
    const s = summary(template(), TODAY)
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('closed')
    expect(s.slots.find((slot) => slot.startMin === 540).label).toBe('Closed')
    expect(s.closed).toBeGreaterThan(0)
    expect(s.completed).toBe(0)
  })

  it('9. past booked slot -> Completed', () => {
    const s = summary(template(), PAST, [book(PAST, 540, 570)])
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('completed')
    expect(s.slots.find((slot) => slot.startMin === 540).label).toBe('Completed')
    expect(s.booked).toBe(0)
    expect(s.completed).toBe(1)
  })

  it('10. past unbooked slot -> Closed', () => {
    const s = summary(template(), PAST)
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('closed')
    expect(s.available).toBe(0)
    expect(s.slots.every((slot) => slot.status === 'closed' || slot.status === 'completed')).toBe(true)
  })

  it('11. Completed count reflects exactly the ended booked slots (real-time)', () => {
    // 3 genuine historic/ended bookings on a past date -> Completed = 3.
    const s = summary(template(), PAST, [
      book(PAST, 540, 570),
      book(PAST, 570, 600),
      book(PAST, 600, 630),
    ])
    expect(s.completed).toBe(3)
    expect(s.booked).toBe(0)
    // The same record set on a FUTURE date counts 0 Completed, 3 Booked.
    const future = summary(template(), FUTURE, [
      book(FUTURE, 540, 570),
      book(FUTURE, 570, 600),
      book(FUTURE, 600, 630),
    ])
    expect(future.completed).toBe(0)
    expect(future.booked).toBe(3)
  })

  it('12. ended unbooked (Closed) slots are NOT counted as Completed', () => {
    const s = summary(template(), TODAY)
    expect(s.closed).toBeGreaterThan(0)
    expect(s.completed).toBe(0)
    expect(s.available + s.booked + s.completed + s.closed).toBe(s.total)
    expect(s.slots.filter((slot) => slot.status === 'completed')).toHaveLength(0)
  })

  it('13. future booked slots are NOT counted as Completed', () => {
    const s = summary(template(), FUTURE, [book(FUTURE, 540, 570)])
    expect(s.booked).toBe(1)
    expect(s.completed).toBe(0)
    expect(s.slots.filter((slot) => slot.status === 'completed')).toHaveLength(0)
  })

  it('14. status is calculated per slot, not per date (mixed statuses on today)', () => {
    const s = summary(template(), TODAY, [
      book(TODAY, 540, 570), // ended   -> Completed
      book(TODAY, 990, 1020), // future -> Booked
    ])
    expect(s.slots.find((slot) => slot.startMin === 540).status).toBe('completed')
    expect(s.slots.find((slot) => slot.startMin === 570).status).toBe('closed') // ended, unbooked
    expect(s.slots.find((slot) => slot.startMin === 600).status).toBe('closed')
    expect(s.slots.find((slot) => slot.startMin === 990).status).toBe('booked')
    expect(s.slots.find((slot) => slot.startMin === 1140).status).toBe('available')
    const counts = { completed: 0, closed: 0, booked: 0, available: 0 }
    s.slots.forEach((slot) => { counts[slot.status] += 1 })
    // 21 slots total, all four statuses represented on ONE date.
    expect(counts.completed).toBe(1)
    expect(counts.closed + counts.booked + counts.available).toBe(20)
  })

  it('15. Monthly and Appointment Slots derive from the same status engine', () => {
    // A future date with a mix of a preset-Completed record and a real booking:
    // the same engine drives the Monthly cell and the Appointment Slots list.
    const withBookings = [
      book(FUTURE, 540, 570, 'Completed'),
      book(FUTURE, 990, 1020),
    ]
    const monthly = summary(template(), FUTURE, withBookings)
    const appointmentSlots = generateAppointmentSlots({
      template: template(),
      date: FUTURE,
      appointments: withBookings,
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    const offeredStarts = new Set(appointmentSlots.map((slot) => slot.startMin))
    monthly.slots.forEach((slot) => {
      if (slot.status === 'available') expect(offeredStarts.has(slot.startMin)).toBe(true)
      else expect(offeredStarts.has(slot.startMin)).toBe(false)
    })
    expect(monthly.available).toBe(appointmentSlots.length)
    expect(monthly.total).toBe(monthly.booked + monthly.completed + monthly.closed + monthly.available)
  })

  it('16. existing booking + cancellation behaviour still works', () => {
    // Booking occupies the slot; a fresh cancellation frees it again.
    const booked = summary(template(), FUTURE, [book(FUTURE, 540, 570)])
    expect(booked.slots.find((slot) => slot.startMin === 540).status).toBe('booked')
    expect(booked.slots.find((slot) => slot.startMin === 540).appointment).toBeTruthy()
    // Cancelled records never occupy a slot.
    const cancelled = summary(template(), FUTURE, [book(FUTURE, 540, 570, 'Cancelled by User')])
    expect(cancelled.slots.find((slot) => slot.startMin === 540).status).toBe('available')
    expect(cancelled.booked).toBe(0)
    expect(cancelled.completed).toBe(0)
    // And the booking engine refuses to offer a cancelled-then-available slot
    // only if it is actually still bookable (future): here it is.
    const offered = generateAppointmentSlots({
      template: template(),
      date: FUTURE,
      appointments: [book(FUTURE, 540, 570, 'Cancelled by User')],
      now: NOW,
      availabilityPeriod: PERIOD,
    })
    expect(offered.some((slot) => slot.startMin === 540)).toBe(true)
  })
})

describe('history view-only gating (isPastDate + action rules)', () => {
  // Demo "today": September 4, 2026 (same reference the Appointment History demo
  // data uses). The Appointment Details drawer must only offer Start Call /
  // Cancel on non-past Booked records; anything on a past calendar day is
  // view-only history regardless of status.
  const now = new Date('2026-09-04T12:00:00+05:30')
  const base = (over) => ({
    id: 'apt-view-test',
    dateIso: '2026-09-10',
    start: '10:00',
    end: '10:30',
    status: 'Booked',
    type: 'Audio Call',
    callType: 'Audio',
    ...over,
  })

  it('2.12 isPastDate classifies dates strictly by calendar day', () => {
    expect(isPastDate('2026-09-03', now)).toBe(true)
    expect(isPastDate('2026-08-20', now)).toBe(true)
    expect(isPastDate('2026-01-01', now)).toBe(true)
    expect(isPastDate('2026-09-04', now)).toBe(false) // today
    expect(isPastDate('2026-09-05', now)).toBe(false)
    expect(isPastDate('2026-12-31', now)).toBe(false)
  })

  it('2.13 isPastDate is stable across the whole boundary day', () => {
    expect(isPastDate('2026-09-04', new Date('2026-09-04T00:00:01+05:30'))).toBe(false)
    expect(isPastDate('2026-09-04', new Date('2026-09-04T23:59:59+05:30'))).toBe(false)
    expect(isPastDate('2026-09-03', new Date('2026-09-04T00:00:01+05:30'))).toBe(true)
    expect(isPastDate('2026-09-03', new Date('2026-09-04T23:59:59+05:30'))).toBe(true)
  })

  it('2.14 a Booked call on yesterday is view-only for Start Call and Upcoming', () => {
    const appt = base({ dateIso: '2026-09-03' })
    expect(isPastDate(appt.dateIso, now)).toBe(true)
    expect(canStartCall(appt, now)).toBe(false)
    expect(isAppointmentUpcoming(appt, now)).toBe(false)
  })

  it('2.15 an appointment without a dateIso is never upcoming or startable', () => {
    expect(isAppointmentUpcoming(base({ dateIso: undefined }), now)).toBe(false)
    expect(canStartCall(base({ dateIso: undefined }), now)).toBe(false)
  })

  it('2.16 a Booked call whose end has already passed today is view-only', () => {
    // Same calendar day (not a "past date") but the slot end (09:30) is behind
    // `now` (12:00) — the drawer must treat it as finished history.
    const appt = base({ dateIso: '2026-09-04', start: '09:00', end: '09:30' })
    expect(isPastDate(appt.dateIso, now)).toBe(false)
    expect(isAppointmentUpcoming(appt, now)).toBe(false)
    expect(canStartCall(appt, now)).toBe(false)
  })

  it('2.17 future Booked audio inside the upcoming window stays actionable (regression guard)', () => {
    const appt = base({ dateIso: '2026-10-15' })
    expect(isPastDate(appt.dateIso, now)).toBe(false)
    expect(isAppointmentUpcoming(appt, now)).toBe(true)
    expect(canStartCall(appt, now)).toBe(true)
  })

  it('2.18 future Booked beyond the upcoming window is view-only', () => {
    const appt = base({ dateIso: '2026-12-01' })
    expect(isPastDate(appt.dateIso, now)).toBe(false)
    expect(isAppointmentUpcoming(appt, now)).toBe(false)
    expect(canStartCall(appt, now)).toBe(false)
  })

  it('2.19 a Booked reschedule replacement dated in the past stays view-only', () => {
    const appt = base({ dateIso: '2026-07-16', rescheduledFrom: 'apt-h-rs-7-14' })
    expect(isPastDate(appt.dateIso, now)).toBe(true)
    expect(isAppointmentUpcoming(appt, now)).toBe(false)
    expect(canStartCall(appt, now)).toBe(false)
  })

  it('2.20 terminal past records are never actionable', () => {
    ;['Completed', 'No-show', 'Cancelled by Astrologer', 'Cancelled by User', 'Auto-cancelled'].forEach((status) => {
      const appt = base({ dateIso: '2026-08-20', status })
      expect(isAppointmentUpcoming(appt, now)).toBe(false)
      expect(canStartCall(appt, now)).toBe(false)
    })
  })

  it('2.21 a rescheduled-original Booked record is view-only', () => {
    const appt = base({ dateIso: '2026-09-20', rescheduledTo: 'apt-h-rs-9-22' })
    expect(isAppointmentUpcoming(appt, now)).toBe(false)
    expect(canStartCall(appt, now)).toBe(false)
  })

  it('2.22 past date ⇒ never upcoming or startable for every status the drawer can show', () => {
    const statuses = ['Booked', 'Completed', 'No-show', 'Cancelled by Astrologer', 'Cancelled by User', 'Auto-cancelled']
    statuses.forEach((status) => {
      const appt = base({ dateIso: '2026-09-03', status })
      expect(isPastDate(appt.dateIso, now)).toBe(true)
      expect(isAppointmentUpcoming(appt, now)).toBe(false)
      expect(canStartCall(appt, now)).toBe(false)
    })
  })
})
