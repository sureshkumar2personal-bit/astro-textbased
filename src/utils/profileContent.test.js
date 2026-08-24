import { describe, expect, it } from 'vitest'
import { normalizeLiveSession, normalizePost, normalizeVisibility } from '../state/AppDataContext.jsx'

describe('profile content normalization', () => {
  it('defaults unsupported visibility values to public', () => {
    expect(normalizeVisibility('friends')).toBe('public')
    expect(normalizeVisibility('subscribers')).toBe('subscribers')
  })

  it('normalizes posts with safe defaults', () => {
    const post = normalizePost({ title: '  Insight  ', body: '  Guidance  ', visibility: 'followers' })
    expect(post.id).toBeTruthy()
    expect(post.astrologerId).toBe('astrologer-demo')
    expect(post.title).toBe('Insight')
    expect(post.body).toBe('Guidance')
    expect(post.visibility).toBe('followers')
    expect(post.updatedAt).toBe(post.createdAt)
  })

  it('normalizes live sessions and preserves manual lifecycle state', () => {
    const session = normalizeLiveSession({
      title: 'Live Q&A',
      description: 'Ask anything',
      status: 'live',
      visibility: 'private',
      scheduledStartAt: '2026-08-24T10:00:00.000Z',
      scheduledEndAt: '2026-08-24T11:00:00.000Z',
    })
    expect(session.title).toBe('Live Q&A')
    expect(session.description).toBe('Ask anything')
    expect(session.status).toBe('live')
    expect(session.visibility).toBe('private')
    expect(session.startedAt).toBeNull()
    expect(session.endedAt).toBeNull()
  })
})
