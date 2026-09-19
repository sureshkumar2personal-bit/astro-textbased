import { describe, expect, it } from 'vitest'
import { createAtonementRecord, getAtonementProgress, getFirstIncompleteAtonementDay, getNextActionableDayIndex, isAtonementDayActionable, isAtonementDayLocked, updateAtonementDay } from './atonements.js'

function fiveDayAtonement() {
  return createAtonementRecord({
    userId: 'user-1',
    astrologerId: 'astro-1',
    days: Array.from({ length: 5 }, (_, index) => ({ day: `Day ${index + 1}`, hour: '07:30', place: 'Temple', god: 'Ganesha', things: 'Flowers', poojas: 'Ganapati pooja' })),
  })
}

describe('atonement sequential day tracking', () => {
  it('enables only the first incomplete day', () => {
    const record = fiveDayAtonement()
    expect(getNextActionableDayIndex(record)).toBe(0)
    expect(isAtonementDayLocked(record, 0)).toBe(false)
    expect(isAtonementDayLocked(record, 1)).toBe(true)
  })

  it('returns only the first incomplete day for the user-facing card', () => {
    let record = fiveDayAtonement()
    record = updateAtonementDay(record, 0, true)
    record = updateAtonementDay(record, 1, true)
    expect(getFirstIncompleteAtonementDay(record)).toMatchObject({ index: 2, day: { day: 'Day 3' } })
  })

  it('unlocks the next day after completion', () => {
    let record = updateAtonementDay(fiveDayAtonement(), 0, true)
    expect(getNextActionableDayIndex(record)).toBe(1)
    record = updateAtonementDay(record, 1, true)
    expect(getNextActionableDayIndex(record)).toBe(2)
  })

  it('rejects skipping ahead', () => {
    const record = fiveDayAtonement()
    expect(updateAtonementDay(record, 2, true)).toEqual(record)
  })

  it('opens the next day on its scheduled date or when it is overdue', () => {
    const record = createAtonementRecord({ days: [
      { day: 'Thursday', date: '2026-09-17', completed: true, hour: '07:30', place: 'Temple', god: 'Ganesha', things: 'Flowers', poojas: 'Pooja' },
      { day: 'Friday', date: '2026-09-18', hour: '07:30', place: 'Temple', god: 'Ganesha', things: 'Flowers', poojas: 'Pooja' },
    ] })
    expect(isAtonementDayActionable(record, 1, new Date('2026-09-17T10:00:00+05:30'))).toBe(false)
    expect(isAtonementDayActionable(record, 1, new Date('2026-09-18T10:00:00+05:30'))).toBe(true)
    expect(isAtonementDayActionable(record, 1, new Date('2026-09-20T10:00:00+05:30'))).toBe(true)
    expect(updateAtonementDay(record, 1, true, new Date('2026-09-17T10:00:00+05:30'))).toEqual(record)
  })

  it('marks the record completed only after the final day', () => {
    let record = fiveDayAtonement()
    for (let index = 0; index < 5; index += 1) record = updateAtonementDay(record, index, true)
    expect(getAtonementProgress(record)).toMatchObject({ completed: 5, total: 5, percent: 100 })
    expect(record.status).toBe('completed')
  })

  it('undoes only the latest completion and locks later days', () => {
    let record = fiveDayAtonement()
    record = updateAtonementDay(record, 0, true)
    record = updateAtonementDay(record, 1, true)
    record = updateAtonementDay(record, 1, false)
    expect(getNextActionableDayIndex(record)).toBe(1)
    expect(record.days[2].completed).toBe(false)
    expect(isAtonementDayLocked(record, 2)).toBe(true)
  })
})
