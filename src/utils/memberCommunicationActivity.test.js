import { describe, expect, it } from 'vitest'
import { ACTIVITY_TYPES, getMemberCommunicationActivity } from './memberCommunicationActivity.js'

const question = {
  id: 'question-1',
  userId: 'user-1',
  astrologerId: 'astro-1',
  question: 'Should I change careers?',
  answer: 'Take time to prepare first.',
  status: 'Answered',
  raisedAt: '2026-08-20T10:00:00Z',
  dispute: { reason: 'I need more detail.', status: 'Open', raisedAt: '2026-08-21T10:00:00Z' },
}

describe('getMemberCommunicationActivity', () => {
  it('returns only communication for the selected user and astrologer', () => {
    const activity = getMemberCommunicationActivity({
      questions: [question, { ...question, id: 'other-user', userId: 'user-2' }, { ...question, id: 'other-astro', astrologerId: 'astro-2' }],
      consultationHistory: [{ id: 'chat-1', userId: 'user-1', astrologerId: 'astro-1', type: 'Chat', status: 'Completed', startedAt: '2026-08-19T10:00:00Z', durationMinutes: 20 }],
      userId: 'user-1',
      astrologerId: 'astro-1',
    })

    expect(activity.map((entry) => entry.type)).toEqual([
      ACTIVITY_TYPES.DISPUTE,
      ACTIVITY_TYPES.QUESTION,
      ACTIVITY_TYPES.ANSWER,
      ACTIVITY_TYPES.CONSULTATION,
    ])
    expect(activity).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'other-user-question' })]))
  })

  it('returns an empty history when either relationship does not match', () => {
    expect(getMemberCommunicationActivity({ questions: [question], userId: 'user-1', astrologerId: 'astro-2' })).toEqual([])
  })
})
