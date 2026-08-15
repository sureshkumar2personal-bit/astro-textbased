import { describe, expect, it } from 'vitest'
import { selectSections, selectTabBadgeCounts } from './selectSections.js'

const NOW = Date.parse('2026-01-01T12:00:00.000Z')

function iso(minutesFromNow) {
  return new Date(NOW + minutesFromNow * 60_000).toISOString()
}

function make(overrides) {
  return {
    id: 'id',
    type: 'system',
    category: 'system',
    title: 'title',
    createdAt: iso(0),
    read: false,
    deepLink: '/x',
    ...overrides,
  }
}

describe('selectSections', () => {
  it('does not filter by type on the "all" tab', () => {
    const notifications = [make({ id: '1', type: 'payout', category: 'money' }), make({ id: '2', type: 'system' })]
    const sections = selectSections(notifications, 'all', NOW)
    const ids = sections.flatMap((s) => s.data.map((n) => n.id))
    expect(ids.sort()).toEqual(['1', '2'])
  })

  it('filters to only the types belonging to a tab', () => {
    const notifications = [
      make({ id: 'work-1', type: 'booking_new' }),
      make({ id: 'money-1', type: 'payout' }),
      make({ id: 'clients-1', type: 'review' }),
    ]
    const sections = selectSections(notifications, 'money', NOW)
    const ids = sections.flatMap((s) => s.data.map((n) => n.id))
    expect(ids).toEqual(['money-1'])
  })

  it('splits actionable items into Needs Action and the rest into Earlier', () => {
    const notifications = [
      make({ id: 'actionable', actions: ['reply'] }),
      make({ id: 'passive' }),
    ]
    const sections = selectSections(notifications, 'all', NOW)
    const needsAction = sections.find((s) => s.key === 'needs_action')
    const earlier = sections.find((s) => s.key === 'earlier')
    expect(needsAction.data.map((n) => n.id)).toEqual(['actionable'])
    expect(earlier.data.map((n) => n.id)).toEqual(['passive'])
  })

  it('omits a section entirely when it has no items', () => {
    const notifications = [make({ id: 'passive' })]
    const sections = selectSections(notifications, 'all', NOW)
    expect(sections.map((s) => s.key)).toEqual(['earlier'])
  })

  it('sorts Needs Action by soonest expiresAt first', () => {
    const notifications = [
      make({ id: 'in-40', actions: ['reply'], expiresAt: iso(40) }),
      make({ id: 'in-2', actions: ['reply'], expiresAt: iso(2) }),
      make({ id: 'in-10', actions: ['reply'], expiresAt: iso(10) }),
    ]
    const sections = selectSections(notifications, 'all', NOW)
    const needsAction = sections.find((s) => s.key === 'needs_action')
    expect(needsAction.data.map((n) => n.id)).toEqual(['in-2', 'in-10', 'in-40'])
  })

  it('sorts Needs Action items without expiresAt after those with one, by newest createdAt', () => {
    const notifications = [
      make({ id: 'no-expiry-older', actions: ['accept'], createdAt: iso(-30) }),
      make({ id: 'no-expiry-newer', actions: ['accept'], createdAt: iso(-5) }),
      make({ id: 'with-expiry', actions: ['reply'], expiresAt: iso(15) }),
    ]
    const sections = selectSections(notifications, 'all', NOW)
    const needsAction = sections.find((s) => s.key === 'needs_action')
    expect(needsAction.data.map((n) => n.id)).toEqual(['with-expiry', 'no-expiry-newer', 'no-expiry-older'])
  })

  it('demotes an actionable item whose deadline has already passed into Earlier', () => {
    const notifications = [
      make({ id: 'overdue', actions: ['reply'], expiresAt: iso(-5) }),
      make({ id: 'still-open', actions: ['reply'], expiresAt: iso(5) }),
    ]
    const sections = selectSections(notifications, 'all', NOW)
    const needsAction = sections.find((s) => s.key === 'needs_action')
    const earlier = sections.find((s) => s.key === 'earlier')
    expect(needsAction.data.map((n) => n.id)).toEqual(['still-open'])
    expect(earlier.data.map((n) => n.id)).toEqual(['overdue'])
  })

  it('sorts Earlier by newest createdAt first', () => {
    const notifications = [
      make({ id: 'oldest', createdAt: iso(-100) }),
      make({ id: 'newest', createdAt: iso(-1) }),
      make({ id: 'middle', createdAt: iso(-50) }),
    ]
    const sections = selectSections(notifications, 'all', NOW)
    const earlier = sections.find((s) => s.key === 'earlier')
    expect(earlier.data.map((n) => n.id)).toEqual(['newest', 'middle', 'oldest'])
  })
})

describe('selectTabBadgeCounts', () => {
  it('counts unread actionable-type notifications per tab', () => {
    const notifications = [
      make({ id: '1', type: 'booking_new', read: false }),
      make({ id: '2', type: 'client_message', read: false }),
      make({ id: '3', type: 'payout', read: false }),
    ]
    const counts = selectTabBadgeCounts(notifications)
    expect(counts.work).toBe(1)
    expect(counts.clients).toBe(1)
    expect(counts.money).toBe(0)
    expect(counts.all).toBe(2)
  })

  it('never counts read notifications', () => {
    const notifications = [make({ id: '1', type: 'booking_new', read: true })]
    const counts = selectTabBadgeCounts(notifications)
    expect(counts.work).toBe(0)
    expect(counts.all).toBe(0)
  })

  it('never badges review, follower, sales_summary, or system even when unread', () => {
    const notifications = [
      make({ id: '1', type: 'review', read: false }),
      make({ id: '2', type: 'follower', read: false }),
      make({ id: '3', type: 'sales_summary', read: false }),
      make({ id: '4', type: 'system', read: false }),
    ]
    const counts = selectTabBadgeCounts(notifications)
    expect(counts).toEqual({ all: 0, work: 0, money: 0, clients: 0, system: 0 })
  })
})
