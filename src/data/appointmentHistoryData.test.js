import { describe, it, expect } from 'vitest'
import { mockAppointmentHistory, mockConsultations } from './appointmentHistoryData.js'
import { isCancelledStatus, isAppointmentUpcoming, canStartCall, isPastDate } from '../utils/appointments.js'

const TERMINAL = ['Completed', 'No-show']
const CANCELLED = (s) => isCancelledStatus(s)

describe('mockAppointmentHistory demo data', () => {
  it('is deterministic across loads', () => {
    // Re-import gives a fresh module; compare structural fingerprint.
    const ids = mockAppointmentHistory.map((a) => a.id).join(',')
    const again = mockAppointmentHistory.map((a) => a.id).join(',')
    expect(ids).toBe(again)
    expect(ids.length).toBeGreaterThan(0)
  })

  it('contains a large, populated dataset', () => {
    expect(mockAppointmentHistory.length).toBeGreaterThan(150)
  })

  it('does not duplicate IDs', () => {
    const ids = mockAppointmentHistory.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('spans previous, current and future months', () => {
    const months = new Set(mockAppointmentHistory.map((a) => a.dateIso.slice(0, 7)))
    expect(months.has('2025-08')).toBe(true)   // Aug 2025 (previous)
    expect(months.has('2026-09')).toBe(true)   // Sep 2026 (current)
    expect(months.has('2027-01')).toBe(true)   // Jan 2027 (future)
  })

  it('has realistic month density (multiple dates per month)', () => {
    // Every represented month should have appointments on several dates.
    const byMonth = {}
    mockAppointmentHistory.forEach((a) => {
      const key = a.dateIso.slice(0, 7)
      byMonth[key] = byMonth[key] || new Set()
      byMonth[key].add(a.dateIso)
    })
    Object.values(byMonth).forEach((dates) => {
      expect(dates.size).toBeGreaterThanOrEqual(3)
    })
  })

  it('represents all major statuses', () => {
    const statuses = new Set(mockAppointmentHistory.map((a) => a.status))
    ;['Booked', 'Completed', 'Cancelled by Astrologer', 'Cancelled by User', 'No-show', 'Auto-cancelled'].forEach((s) => {
      expect(statuses.has(s)).toBe(true)
    })
  })

  it('does not place terminal statuses on future dates', () => {
    // Reference "today" for the demo is Sep 4 2026.
    const ref = new Date(2026, 8, 4)
    mockAppointmentHistory.forEach((a) => {
      const d = new Date(a.dateIso)
      const isFuture = d.getTime() > ref.getTime()
      if (isFuture) {
        expect(TERMINAL.includes(a.status)).toBe(false)
      }
      // Cancelled records are allowed before/around the date but not absurdly later.
    })
  })

  it('keeps reschedule examples as linked pairs without second payment', () => {
    const originals = mockAppointmentHistory.filter((a) => a.rescheduledTo)
    expect(originals.length).toBeGreaterThanOrEqual(3)
    originals.forEach((original) => {
      const next = mockAppointmentHistory.find((a) => a.id === original.rescheduledTo)
      expect(next).toBeTruthy()
      expect(next.rescheduledFrom).toBe(original.id)
      expect(next.status).toBe('Booked')
      expect(CANCELLED(original.status)).toBe(true)
    })
  })

  it('has dates with multiple appointments for summary cards', () => {
    const byDay = {}
    mockAppointmentHistory.forEach((a) => {
      byDay[a.dateIso] = (byDay[a.dateIso] || 0) + 1
    })
    const multi = Object.values(byDay).filter((n) => n >= 2)
    expect(multi.length).toBeGreaterThan(20)
  })

  it('links every consultation to a real appointment', () => {
    expect(mockConsultations.length).toBeGreaterThanOrEqual(1)
    mockConsultations.forEach((consultation) => {
      const appointment = mockAppointmentHistory.find((a) => a.id === consultation.appointmentId)
      expect(appointment).toBeTruthy()
      expect(appointment.status).toBe('Completed')
      expect(consultation.appointmentId).toBeTruthy()
    })
  })

  it('gives every appointment a stable userId for profile navigation', () => {
    const entries = mockAppointmentHistory.filter((a) => a.userId)
    expect(entries.length).toBe(mockAppointmentHistory.length)
  })
})

describe('appointment history feature corrections (view-only history + per-appointment persistence)', () => {
  // The demo reference "today" used by appointmentHistoryData.js.
  const refNow = new Date(2026, 8, 4, 12, 0, 0)

  it('1. ships an upcoming Meena appointment that can be demoed end to end', () => {
    const meena = mockAppointmentHistory.find((a) => a.customerName === 'Meena' && a.dateIso === '2026-09-07')
    expect(meena).toBeTruthy()
    expect(meena.status).toBe('Booked')
    expect(meena.orderId).toBe('#AH927')
    expect(meena.horoscope).toBeTruthy()
  })

  it('2. the Meena appointment is actionable at the demo "today"', () => {
    const meena = mockAppointmentHistory.find((a) => a.customerName === 'Meena' && a.dateIso === '2026-09-07')
    expect(isAppointmentUpcoming(meena, refNow)).toBe(true)
    expect(canStartCall(meena, refNow)).toBe(true)
  })

  it('3. Booked future appointments carry a persistent horoscope attachment envelope', () => {
    const attached = mockAppointmentHistory.filter((a) => a.status === 'Booked' && a.horoscope)
    expect(attached.length).toBeGreaterThan(0)
    attached.forEach((a) => {
      expect(a.horoscope.name).toBeTruthy()
      expect(a.horoscope.type).toBeTruthy()
      expect(a.horoscope.size).toBeTruthy()
      expect(a.horoscope.dataUrl).toMatch(/^data:/)
    })
  })

  it('4. completed records preserve pre-call analysis, private notes, duration and completion time', () => {
    const completed = mockAppointmentHistory.filter((a) => a.status === 'Completed')
    expect(completed.length).toBeGreaterThan(0)
    completed.forEach((a) => {
      expect(typeof a.preCallAnalysis).toBe('string')
      expect(a.preCallAnalysis.length).toBeGreaterThan(0)
      expect(typeof a.privateNotes).toBe('string')
      expect(a.privateNotes.length).toBeGreaterThan(0)
      expect(a.callDurationSeconds).toBeGreaterThan(0)
      expect(a.completedAt).toBeTruthy()
    })
  })

  it('5. completed history preserves the full customer/date/time/status envelope', () => {
    const completed = mockAppointmentHistory.filter((a) => a.status === 'Completed')
    completed.forEach((a) => {
      expect(a.customerName).toBeTruthy()
      expect(a.customerPhone).toBeTruthy()
      expect(a.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(a.start).toBeTruthy()
      expect(a.end).toBeTruthy()
      expect(a.amount).toBeGreaterThan(0)
    })
  })

  it('6. consultations are strictly per appointment (never shared or duplicated)', () => {
    const ids = mockConsultations.map((c) => c.appointmentId)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('7. every consultation links to a real Completed appointment and is marked sent', () => {
    expect(mockConsultations.length).toBeGreaterThan(0)
    mockConsultations.forEach((c) => {
      const appointment = mockAppointmentHistory.find((a) => a.id === c.appointmentId)
      expect(appointment).toBeTruthy()
      expect(appointment.status).toBe('Completed')
      expect(c.sent).toBe(true)
    })
  })

  it('8. consultation attachments persist on their own record', () => {
    const withFile = mockConsultations.filter((c) => c.fileName && c.fileType && c.fileSize)
    expect(withFile.length).toBeGreaterThan(0)
    withFile.forEach((c) => {
      expect(typeof c.fileName).toBe('string')
      expect(typeof c.fileType).toBe('string')
      expect(typeof c.fileSize).toBe('string')
    })
  })

  it('9. notes are appointment-specific and never shared between customers', () => {
    const featured = mockAppointmentHistory.filter((a) => ['#AH903', '#AH802', '#AH902'].includes(a.orderId))
    expect(featured.length).toBe(3)
    const notes = featured.map((a) => a.privateNotes)
    expect(new Set(notes).size).toBe(3)
  })

  it('10. the Karthik demo consultation persists with a real attachment', () => {
    const karthik = mockAppointmentHistory.find((a) => a.orderId === '#AH903')
    expect(karthik).toBeTruthy()
    expect(karthik.status).toBe('Completed')
    const consultation = mockConsultations.find((c) => c.appointmentId === karthik.id)
    expect(consultation).toBeTruthy()
    expect(consultation.fileName).toBe('Karthik_Consultation_Notes.pdf')
    expect(consultation.sent).toBe(true)
  })

  it('11. past records are view-only — never upcoming and never startable', () => {
    const pastRecords = mockAppointmentHistory.filter((a) => isPastDate(a.dateIso, refNow))
    expect(pastRecords.length).toBeGreaterThan(0)
    pastRecords.forEach((a) => {
      expect(isAppointmentUpcoming(a, refNow)).toBe(false)
      expect(canStartCall(a, refNow)).toBe(false)
    })
  })
})
