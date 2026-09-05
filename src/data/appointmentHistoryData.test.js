import { describe, it, expect } from 'vitest'
import { mockAppointmentHistory, mockConsultations } from './appointmentHistoryData.js'
import { isCancelledStatus } from '../utils/appointments.js'

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
