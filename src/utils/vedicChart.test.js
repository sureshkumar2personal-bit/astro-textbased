import { describe, expect, it } from 'vitest'
import { computeChart, lahiriAyanamsa, localBirthToUtc, groupBySign, vimshottariDasha } from './vedicChart.js'
import { findBirthPlace } from '../data/birthPlaces.js'

describe('vedicChart', () => {
  it('Lahiri ayanamsa at J2000 is about 23.857 degrees', () => {
    expect(lahiriAyanamsa(new Date(Date.UTC(2000, 0, 1, 12)))).toBeCloseTo(23.8567, 3)
  })

  it('converts IST wall time to UTC', () => {
    expect(localBirthToUtc('1994-08-14', '06:45', 'Asia/Kolkata').toISOString()).toBe('1994-08-14T01:15:00.000Z')
  })

  it('finds a place from "City, ST" text and rejects unknown places', () => {
    expect(findBirthPlace('Coimbatore, TN').timeZone).toBe('Asia/Kolkata')
    expect(findBirthPlace('Nowhereville, XX')).toBeNull()
  })

  it('uses profile coordinates for places outside the city list', () => {
    const chart = computeChart({ dob: '1995-03-12', time: '07:05', place: 'Theni, Tamil Nadu, India', latitude: 10.0104, longitude: 77.4768, timezone: 'Asia/Kolkata' })
    expect(chart.ok).toBe(true)
    expect(chart.location.lat).toBeCloseTo(10.0104, 3)
    expect(computeChart({ dob: '1995-03-12', time: '07:05', place: 'Theni', latitude: 95, longitude: 77, timezone: 'Asia/Kolkata' }).ok).toBe(false)
  })

  it('reports an honest reason for unsupported places', () => {
    const result = computeChart({ dob: '1994-08-14', time: '06:45', place: 'Nowhereville' })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/no saved coordinates/)
  })

  it('computes a coherent chart for 14 Aug 1994 06:45 Coimbatore', () => {
    const chart = computeChart({ dob: '1994-08-14', time: '06:45', place: 'Coimbatore, TN' }, new Date(Date.UTC(2026, 10, 12)))
    expect(chart.ok).toBe(true)
    const sun = chart.planets.find((p) => p.key === 'sun')
    // Tropical Sun is ~21 deg Leo (141 deg); minus ayanamsa ~23.8 => ~117 deg sidereal = Karka (index 3).
    expect(sun.longitude).toBeGreaterThan(116)
    expect(sun.longitude).toBeLessThan(119)
    expect(sun.sign).toBe(3)
    expect(chart.planets).toHaveLength(9)
    const rahu = chart.planets.find((p) => p.key === 'rahu')
    const ketu = chart.planets.find((p) => p.key === 'ketu')
    expect(Math.abs(((rahu.longitude - ketu.longitude + 360) % 360) - 180)).toBeLessThan(1e-6)
    expect(Object.keys(chart.panchang)).toEqual(expect.arrayContaining(['lagna', 'janmaRashi', 'nakshatra', 'tithi', 'yogam', 'karanam']))
    expect(chart.doshas).toHaveLength(4)
    const rashi = groupBySign(chart, 'rashi')
    expect(rashi.reduce((sum, cell) => sum + cell.planets.length, 0)).toBe(9)
    expect(rashi.filter((cell) => cell.lagna)).toHaveLength(1)
    expect(groupBySign(chart, 'navamsa').reduce((sum, cell) => sum + cell.planets.length, 0)).toBe(9)
  })

  it('Moon nakshatra matches its longitude (1 Jan 2000, 12:00 UTC)', () => {
    const chart = computeChart({ dob: '2000-01-01', time: '17:30', place: 'Chennai' }) // 12:00 UTC
    const moon = chart.planets.find((p) => p.key === 'moon')
    const expected = Math.floor(moon.longitude / (360 / 27))
    expect(moon.nakshatra).toBe(expected)
    // 1 Jan 2000: tropical Moon ~223.3 => sidereal ~199.5 (Tula, Swati)
    expect(moon.longitude).toBeGreaterThan(198)
    expect(moon.longitude).toBeLessThan(201)
    expect(moon.nakshatraName).toBe('Swati')
  })
})

describe('vimshottariDasha', () => {
  const birth = Date.UTC(2000, 0, 1)
  it('starts the Maha dasha with the Moon nakshatra lord and the full balance at 0° Ashwini', () => {
    const dasha = vimshottariDasha(0, birth, birth + 86400000)
    expect(dasha.maha.key).toBe('ketu')
    expect(dasha.maha.start).toBe(birth)
    expect(dasha.maha.end - dasha.maha.start).toBeCloseTo(7 * 365.25 * 86400000, -3)
    expect(dasha.bhukti.key).toBe('ketu')
  })
  it('leaves half of the first dasha at birth when the Moon is mid-nakshatra', () => {
    const half = 360 / 27 / 2
    const dasha = vimshottariDasha(half, birth, birth + 86400000)
    expect(dasha.maha.start).toBeLessThan(birth)
    expect(birth - dasha.maha.start).toBeCloseTo(3.5 * 365.25 * 86400000, -3)
  })
  it('moves on to the next lord once the first dasha is over', () => {
    const dasha = vimshottariDasha(0, birth, birth + 8 * 365.25 * 86400000)
    expect(dasha.maha.key).toBe('venus')
  })
  it('lists bhuktis in order and sums sub-periods to the maha length', () => {
    const dasha = vimshottariDasha(100, birth, birth + 5 * 365.25 * 86400000)
    expect(dasha.upcoming).toHaveLength(2)
    expect(dasha.upcoming[0].start).toBeCloseTo(dasha.bhukti.end, -3)
    expect(dasha.upcoming[0].maha).toBe(dasha.maha.name)
    expect(dasha.bhukti.progress).toBeGreaterThanOrEqual(0)
    expect(dasha.bhukti.progress).toBeLessThan(1)
  })
  it('names the next Maha lord for bhuktis that fall after the current Maha dasha ends', () => {
    // Late in the 7-year Ketu dasha (last bhukti), the next bhukti belongs to Venus Maha dasha.
    const dasha = vimshottariDasha(0, birth, birth + 6.99 * 365.25 * 86400000)
    expect(dasha.maha.key).toBe('ketu')
    expect(dasha.upcoming[0].maha).toBe('Shukra')
    expect(dasha.upcoming[0].bhukti).toBe('Shukra')
  })
})
