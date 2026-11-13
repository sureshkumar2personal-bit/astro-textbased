import { describe, expect, it } from 'vitest'
import { isSyncable, mergeLists, mergeRequest } from './consultationMerge.js'

const msg = (id, sentAt) => ({ id, sender: 'user', text: id, sentAt })

describe('isSyncable', () => {
  it('skips demo history and flagged test requests', () => {
    expect(isSyncable({ id: 'instant-call-2026-001' })).toBe(false)
    expect(isSyncable({ id: 'abc', isTestRequest: true })).toBe(false)
    expect(isSyncable({ id: 'abc', isSimulated: true })).toBe(false)
    expect(isSyncable({ id: 'abc' })).toBe(true)
    expect(isSyncable({})).toBe(false)
  })
})

describe('mergeRequest', () => {
  it('keeps the newest fields and unions messages', () => {
    const a = { id: '1', status: 'ringing', updatedAt: '2026-01-01T00:00:01Z', messages: [msg('m1', '2026-01-01T00:00:01Z')] }
    const b = { id: '1', status: 'accepted', updatedAt: '2026-01-01T00:00:05Z', messages: [msg('m2', '2026-01-01T00:00:05Z')] }
    const merged = mergeRequest(a, b)
    expect(merged.status).toBe('accepted')
    expect(merged.messages.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(mergeRequest(b, a).status).toBe('accepted')
  })
})

describe('mergeLists', () => {
  it('adds remote requests and reports no change when identical', () => {
    const remote = [{ id: 'r1', status: 'ringing', updatedAt: '2026-01-01T00:00:00Z' }]
    const first = mergeLists([], remote)
    expect(first.changed).toBe(true)
    expect(first.merged).toHaveLength(1)
    expect(mergeLists(first.merged, remote).changed).toBe(false)
  })
})
