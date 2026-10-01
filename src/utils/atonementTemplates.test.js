import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildRecommendation, defaultCompletionDays, readSavedAtonementContent } from './atonementTemplates.js'
import { createAtonementRecord, getAtonementProgress } from './atonements.js'

function stubStorage(records) {
  vi.stubGlobal('window', { localStorage: { getItem: (key) => (key === 'astroconnect:atonement:astro-1:records' ? JSON.stringify(records) : null) } })
}

afterEach(() => vi.unstubAllGlobals())

describe('saved atonement content (shared by call end and question answer)', () => {
  it('lists every record the astrologer saved, in the shape the Saved modal renders', () => {
    stubStorage([
      { id: 'a1', kind: 'saved-method', updatedAt: '2026-10-01', form: { name: 'Career Obstacle Pariharam', duration: '7 days' } },
      { id: 'a2', status: 'Published', form: { name: 'Rahu Dosha Pariharam', duration: '11 days' } },
    ])
    const items = readSavedAtonementContent('astro-1')
    expect(items.map((item) => [item.id, item.name, item.type])).toEqual([
      ['a1', 'Career Obstacle Pariharam', 'Text'],
      ['a2', 'Rahu Dosha Pariharam', 'Text'],
    ])
    expect(items[0].content.name).toBe('Career Obstacle Pariharam')
  })

  it('is empty for another astrologer or when nothing is saved', () => {
    stubStorage([])
    expect(readSavedAtonementContent('astro-1')).toEqual([])
    expect(readSavedAtonementContent('someone-else')).toEqual([])
  })

  it('attaches a reference to the saved record and defaults the period from its duration', () => {
    stubStorage([{ id: 'a1', kind: 'saved-method', form: { name: 'X', duration: '5 days' } }])
    const [item] = readSavedAtonementContent('astro-1')
    expect(defaultCompletionDays(item)).toBe(5)
    expect(buildRecommendation(item)).toMatchObject({ templateId: 'a1', title: 'X', completionDays: 5 })
    expect(buildRecommendation(item, 3).completionDays).toBe(3)
    expect(buildRecommendation(null)).toBeNull()
  })

  it('a record built from the recommendation starts at 0 of N days and keeps the template id', () => {
    const record = createAtonementRecord({
      id: 'ATN-QTN-1', sourceType: 'question', sourceId: 'QTN-1', templateId: 'a1', title: 'X',
      days: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-0${i + 1}`, dayNumber: i + 1, completed: false })),
    })
    expect(record.templateId).toBe('a1')
    expect(getAtonementProgress(record)).toEqual({ completed: 0, total: 7, percent: 0 })
  })
})
