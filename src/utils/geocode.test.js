import { describe, expect, it, vi } from 'vitest'
import { searchPlaces, timeZoneFor } from './geocode.js'

const rows = [
  { place_id: 1, lat: '10.0104', lon: '77.4768', display_name: 'Theni, Tamil Nadu, India', type: 'town' },
  { place_id: 2, lat: 'abc', lon: '1', display_name: 'Broken', type: 'x' },
]

describe('geocode', () => {
  it('derives IANA zones offline from coordinates', () => {
    expect(timeZoneFor(10.0104, 77.4768)).toBe('Asia/Kolkata')
    expect(timeZoneFor(40.7128, -74.006)).toBe('America/New_York')
  })

  it('returns candidates with coordinates + zone and drops unusable rows', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => rows })
    const result = await searchPlaces('Theni', { fetchImpl })
    expect(result).toEqual([{ id: '1', label: 'Theni, Tamil Nadu, India', type: 'town', latitude: 10.0104, longitude: 77.4768, timeZone: 'Asia/Kolkata' }])
    expect(fetchImpl.mock.calls[0][0]).toContain('q=Theni')
  })

  it('does not call the network for very short queries and surfaces HTTP errors', async () => {
    const fetchImpl = vi.fn()
    expect(await searchPlaces('a', { fetchImpl })).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
    await expect(searchPlaces('Theni', { fetchImpl: async () => ({ ok: false, status: 429 }) })).rejects.toThrow(/429/)
  })
})
