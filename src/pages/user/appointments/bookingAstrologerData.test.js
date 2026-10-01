import { describe, expect, it } from 'vitest'
import { countAvailableSlots } from './bookingAstrologerData.js'

describe('countAvailableSlots', () => {
  it('counts each available date/time pair once', () => {
    expect(countAvailableSlots({
      astrologerId: 'astro-1',
      availability: {
        '2026-09-05': ['10:00 AM', '10:00 AM', '02:00 PM'],
        '2026-09-06': ['10:00 AM'],
      },
      now: new Date(2026, 8, 1),
    })).toBe(3)
  })

  it('does not count a slot already booked by the same astrologer', () => {
    expect(countAvailableSlots({
      astrologerId: 'astro-1',
      availability: { '2026-09-05': ['10:00 AM', '02:00 PM'] },
      appointments: [{ astrologerId: 'astro-1', dateIso: '2026-09-05', time: '10:00 AM', status: 'Booked' }],
      now: new Date(2026, 8, 1),
    })).toBe(1)
  })
})
