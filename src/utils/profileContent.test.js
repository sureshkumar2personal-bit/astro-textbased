import { describe, expect, it } from 'vitest'
import { normalizeInteractionAccess, normalizeLiveSession, normalizePost, normalizeVisibility, selectVisiblePosts } from '../state/AppDataContext.jsx'

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
    expect(post.commentsEnabled).toBe(true)
    expect(post.interactionAccess).toEqual({ like: true, comment: true, share: true, save: true })
    expect(post.updatedAt).toBe(post.createdAt)
  })

  it('preserves disabled comments when normalizing a post', () => {
    expect(normalizePost({ commentsEnabled: false }).commentsEnabled).toBe(false)
    expect(normalizePost({ commentsEnabled: false }).interactionAccess.comment).toBe(false)
  })

  it('normalizes each interaction access independently', () => {
    expect(normalizeInteractionAccess({ interactionAccess: { like: false, share: false } })).toEqual({
      like: false,
      comment: true,
      share: false,
      save: true,
    })
  })

  it('filters posts by public, follower, subscriber, and private access', () => {
    const posts = [
      { id: 'public', astrologerId: 'astro-1', visibility: 'public' },
      { id: 'follower', astrologerId: 'astro-1', visibility: 'followers' },
      { id: 'subscriber', astrologerId: 'astro-1', visibility: 'subscribers' },
      { id: 'private', astrologerId: 'astro-1', visibility: 'private' },
    ]
    const visible = selectVisiblePosts(posts, {
      userId: 'user-1',
      followedAstrologerIds: ['astro-1'],
      subscriptions: [{ userId: 'user-1', astrologerId: 'astro-1', expiresAt: '2099-01-01T00:00:00.000Z' }],
    })
    expect(visible.map((post) => post.id)).toEqual(['public', 'follower', 'subscriber'])
  })

  it('does not expose private posts to another user', () => {
    const posts = [{ id: 'private', astrologerId: 'astro-1', visibility: 'private' }]
    expect(selectVisiblePosts(posts, { userId: 'user-1' })).toEqual([])
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
