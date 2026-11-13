import { describe, expect, it } from 'vitest'
import {
  billableSeconds, buildCallCompletion, buildHistoryCsv, earningsForSeconds, filterHistoryRows, formatRupees,
  historyRows, maxMinutesForWallet, nextSimulatedCaller, queueWaitMinutes, staleRingingCalls, todaysCallStats, todaysInstantEarnings, waitingCalls,
} from './instantCallConsole.js'

const NOW = new Date('2026-11-13T12:00:00').getTime()
const iso = (offsetMs) => new Date(NOW + offsetMs).toISOString()
const call = (patch) => ({ id: 'c', type: 'call', astrologerId: 'a1', userName: 'Priya V.', status: 'ended', startedAt: iso(-600000), createdAt: iso(-620000), durationMinutes: 10, pricePerMinute: 25, ...patch })

describe('live billing', () => {
  it('bills elapsed seconds at the per-minute rate', () => {
    const request = call({ status: 'accepted', startedAt: iso(-120000) })
    expect(billableSeconds(request, NOW)).toBe(120)
    expect(earningsForSeconds(120, 25)).toBe(50)
    expect(earningsForSeconds(30, 25)).toBe(12.5)
  })
  it('does not bill time on hold, including a hold in progress', () => {
    const request = call({ status: 'accepted', startedAt: iso(-300000), heldMs: 60000, holdSince: iso(-60000) })
    expect(billableSeconds(request, NOW)).toBe(180)
  })
  it('caps billing at what the wallet can pay for', () => {
    expect(maxMinutesForWallet(625, 25)).toBe(25)
    expect(maxMinutesForWallet(null, 25)).toBeNull()
    const request = call({ status: 'accepted', startedAt: iso(-40 * 60000), walletBalance: 625 })
    expect(billableSeconds(request, NOW)).toBe(25 * 60)
  })
  it('builds the completion patch used by End & Save Call', () => {
    const patch = buildCallCompletion(call({ status: 'accepted', startedAt: iso(-95000) }), NOW)
    expect(patch).toMatchObject({ status: 'ended', actualSeconds: 95, durationMinutes: 2, amount: 39.58, extraMinutes: 0, bookedMinutes: 10 })
  })
  it('never saves a zero-minute call', () => {
    expect(buildCallCompletion(call({ status: 'accepted', startedAt: iso(0) }), NOW)).toMatchObject({ durationMinutes: 1, amount: 0 })
  })
})

describe('kpis and earnings', () => {
  const sessions = [
    call({ id: '1', actualSeconds: 780, durationMinutes: 13, amount: 325 }),
    call({ id: '2', actualSeconds: 600, durationMinutes: 10, amount: 250 }),
    call({ id: '3', startedAt: iso(-3 * 86400000), durationMinutes: 15, amount: 375 }),
    call({ id: '4', astrologerId: 'other' }),
    call({ id: '5', status: 'rejected', startedAt: undefined }),
    call({ id: '6', type: 'chat', amount: 100, durationMinutes: 5 }),
  ]
  it('counts only today\'s completed calls for this astrologer', () => {
    const stats = todaysCallStats(sessions, 'a1', NOW)
    expect(stats.count).toBe(2)
    expect(stats.minutes).toBe(23)
    expect(stats.avgMinutes).toBeCloseTo(11.5)
    expect(todaysCallStats([], 'a1', NOW).avgMinutes).toBeNull()
  })
  it('sums today\'s completed call and chat earnings', () => {
    expect(todaysInstantEarnings(sessions, 'a1', NOW)).toBe(675)
  })
  it('lists waiting callers oldest first and drops ones past the ring window', () => {
    const waiting = waitingCalls([
      call({ id: 'new', status: 'ringing', createdAt: iso(-5000) }),
      call({ id: 'old', status: 'ringing', createdAt: iso(-20000) }),
      call({ id: 'gone', status: 'ringing', createdAt: iso(-90000) }),
    ], 'a1', NOW)
    expect(waiting.map((item) => item.id)).toEqual(['old', 'new'])
  })
  it('lets simulated callers wait past the ring window instead of expiring', () => {
    const sims = [call({ id: 'sim', status: 'ringing', isSimulated: true, createdAt: iso(-10 * 60000) })]
    expect(waitingCalls(sims, 'a1', NOW).map((item) => item.id)).toEqual(['sim'])
    expect(staleRingingCalls(sims, 'a1', NOW)).toEqual([])
  })
})

describe('history', () => {
  const sessions = [
    call({ id: 'a', userName: 'Priya V.', startedAt: iso(-1000), amount: 250 }),
    call({ id: 'b', userName: 'Arjun K.', status: 'expired', startedAt: undefined, createdAt: iso(-5000) }),
    call({ id: 'c', userName: 'Divya M.', status: 'rejected', startedAt: undefined, createdAt: iso(-9000) }),
    call({ id: 'd', status: 'ringing' }),
  ]
  it('builds newest-first rows with Completed / Missed / Declined statuses', () => {
    const rows = historyRows(sessions, 'a1')
    expect(rows.map((row) => [row.item.id, row.status])).toEqual([['a', 'Completed'], ['b', 'Missed'], ['c', 'Declined']])
  })
  it('filters by name and status', () => {
    const rows = historyRows(sessions, 'a1')
    expect(filterHistoryRows(rows, { query: 'ARJ' }).map((row) => row.item.id)).toEqual(['b'])
    expect(filterHistoryRows(rows, { status: 'Completed' }).map((row) => row.item.id)).toEqual(['a'])
    expect(filterHistoryRows(rows, { query: 'zzz' })).toEqual([])
  })
  it('exports a quoted CSV and neutralises formula-like cells', () => {
    const rows = historyRows([call({ id: 'x', userName: '=cmd|"x"', notes: 'Wear "red", pray', amount: 250 })], 'a1')
    const lines = buildHistoryCsv(rows).split('\r\n')
    expect(lines[0]).toBe('User,Date,Time,Duration (min),Amount (INR),Status,Topic,Notes')
    expect(lines[1].startsWith('"\'=cmd|""x"""')).toBe(true)
    expect(lines[1]).toContain('"Wear ""red"", pray"')
  })
  it('formats rupees without stray decimals', () => {
    expect(formatRupees(5420)).toBe('₹5,420')
    expect(formatRupees(12.5)).toBe('₹12.50')
    expect(formatRupees(0, { decimals: 2 })).toBe('₹0.00')
  })
})

describe('waiting queue', () => {
  const sneha = call({ id: 'sneha', status: 'ringing', durationMinutes: 20 })
  const vikram = call({ id: 'vikram', status: 'ringing', durationMinutes: 15 })
  const arjun = call({ id: 'arjun', status: 'ringing', durationMinutes: 10 })

  it('estimates each wait from the callers ahead when nobody is on a call', () => {
    expect(queueWaitMinutes({ active: null, waiting: [arjun, sneha, vikram], now: NOW })).toEqual({ arjun: 0, sneha: 10, vikram: 30 })
  })
  it('starts from what is left of the call in progress', () => {
    const active = call({ status: 'accepted', startedAt: iso(-4 * 60000), durationMinutes: 10 })
    expect(queueWaitMinutes({ active, waiting: [sneha, vikram], now: NOW })).toEqual({ sneha: 6, vikram: 26 })
  })
  it('never goes negative once the booked time is used up', () => {
    const active = call({ status: 'accepted', startedAt: iso(-30 * 60000), durationMinutes: 10 })
    expect(queueWaitMinutes({ active, waiting: [sneha], now: NOW })).toEqual({ sneha: 0 })
  })
  it('picks the next demo caller that is not already in use', () => {
    expect(nextSimulatedCaller([]).userName).toBe('Arjun K.')
    expect(nextSimulatedCaller(['simulated-arjun-k']).userName).toBe('Sneha M.')
    expect(nextSimulatedCaller(['simulated-arjun-k', 'simulated-sneha-m', 'simulated-vikram-r', 'simulated-meena-s']).userName).toBe('Karthik P.')
  })
  it('stops offering callers once every demo caller is queued', () => {
    const all = ['simulated-arjun-k', 'simulated-sneha-m', 'simulated-vikram-r', 'simulated-meena-s', 'simulated-karthik-p']
    expect(nextSimulatedCaller(all)).toBeNull()
  })
  it('keeps unanswered dev test rings out of the history', () => {
    const rows = historyRows([call({ id: 't', status: 'expired', isTestRequest: true, startedAt: undefined }), call({ id: 'm', status: 'expired', startedAt: undefined })], 'a1')
    expect(rows.map((row) => row.item.id)).toEqual(['m'])
  })
})

