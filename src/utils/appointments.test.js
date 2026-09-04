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

  it('generates 40-min slots at a 15-min interval, fully inside the window', () => {
    const slots = run(template({ appointmentDuration: 40 }))
    expect(slots.every((s) => s.endMin - s.startMin === 40)).toBe(true)
    // 10:00-13:00 with 40-min slots on a 15-min grid gives starts 600,615,630,...
    expect(slots.map((s) => s.startMin)).toContain(600)
    expect(slots.map((s) => s.startMin)).toContain(615)
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
    })
    expect(summary.slots.some((s) => s.status === 'booked')).toBe(true)
    expect(summary.slots.some((s) => s.status === 'available')).toBe(true)
    expect(summary.total).toBe(summary.booked + summary.available)
  })
})
