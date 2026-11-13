// Real Vedic (sidereal, Lahiri) horoscope calculation from birth date, time and place.
//
// Positions come from astronomy-engine (geocentric apparent positions, true ecliptic of
// date). Lahiri ayanamsa follows the Swiss Ephemeris definition (22.460148 deg at 1900.0
// plus general precession). Rahu/Ketu use the mean lunar node. Nothing here is sample
// data: if the inputs cannot produce a chart, computeChart returns { ok: false, reason }.
import * as Astronomy from 'astronomy-engine'
import { findBirthPlace } from '../data/birthPlaces.js'

export const SIGNS = [
  { sa: 'Mesha', en: 'Aries' }, { sa: 'Vrishabha', en: 'Taurus' }, { sa: 'Mithuna', en: 'Gemini' },
  { sa: 'Karka', en: 'Cancer' }, { sa: 'Simha', en: 'Leo' }, { sa: 'Kanya', en: 'Virgo' },
  { sa: 'Tula', en: 'Libra' }, { sa: 'Vrischika', en: 'Scorpio' }, { sa: 'Dhanu', en: 'Sagittarius' },
  { sa: 'Makara', en: 'Capricorn' }, { sa: 'Kumbha', en: 'Aquarius' }, { sa: 'Meena', en: 'Pisces' },
]

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

const YOGAS = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula',
  'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
]

const TITHIS = [
  'Prathama', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami',
  'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
]

const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti']

export const PLANETS = [
  { key: 'sun', sa: 'Surya', en: 'Sun', abbr: 'Su', body: Astronomy.Body.Sun },
  { key: 'moon', sa: 'Chandra', en: 'Moon', abbr: 'Mo', body: Astronomy.Body.Moon },
  { key: 'mars', sa: 'Mangala', en: 'Mars', abbr: 'Ma', body: Astronomy.Body.Mars },
  { key: 'mercury', sa: 'Budha', en: 'Mercury', abbr: 'Me', body: Astronomy.Body.Mercury },
  { key: 'jupiter', sa: 'Guru', en: 'Jupiter', abbr: 'Ju', body: Astronomy.Body.Jupiter },
  { key: 'venus', sa: 'Shukra', en: 'Venus', abbr: 'Ve', body: Astronomy.Body.Venus },
  { key: 'saturn', sa: 'Shani', en: 'Saturn', abbr: 'Sa', body: Astronomy.Body.Saturn },
  { key: 'rahu', sa: 'Rahu', en: 'Rahu', abbr: 'Ra', node: true },
  { key: 'ketu', sa: 'Ketu', en: 'Ketu', abbr: 'Ke', node: true },
]

const EXALTED = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6 }
const DEBILITATED = { sun: 6, moon: 7, mars: 3, mercury: 11, jupiter: 9, venus: 5, saturn: 0 }
const OWN = {
  sun: [4], moon: [3], mars: [0, 7], mercury: [2, 5], jupiter: [8, 11], venus: [1, 6], saturn: [9, 10],
}

const norm = (deg) => ((deg % 360) + 360) % 360
const rad = (deg) => (deg * Math.PI) / 180
const deg = (radians) => (radians * 180) / Math.PI

/** Lahiri ayanamsa in degrees for a given instant (Swiss Ephemeris SE_SIDM_LAHIRI definition). */
export function lahiriAyanamsa(date) {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * 86400000)
  const precession = (t) => (5028.796195 * t + 1.1054348 * t * t) / 3600
  return 22.460148 + (precession(T) - precession(-1))
}

function tzOffsetMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(utcMs))
  const get = (type) => Number(parts.find((part) => part.type === type).value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/** Converts a local wall-clock birth time in an IANA zone to a UTC Date (handles historical offsets). */
export function localBirthToUtc(dob, time, timeZone) {
  const [year, month, day] = String(dob).split('-').map(Number)
  const [hour, minute] = String(time).split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  let utc = wall - tzOffsetMs(wall, timeZone)
  utc = wall - tzOffsetMs(utc, timeZone)
  return new Date(utc)
}

function tropicalLongitude(body, date) {
  const vector = Astronomy.GeoVector(body, date, true)
  return norm(Astronomy.Ecliptic(vector).elon)
}

function meanNodeLongitude(date) {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * 86400000)
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T)
}

function ascendantLongitude(date, lat, lon) {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * 86400000)
  const obliquity = rad(23.4392911 - 0.0130042 * T)
  const ramc = rad(norm(Astronomy.SiderealTime(date) * 15 + lon))
  const y = Math.cos(ramc)
  const x = -(Math.sin(ramc) * Math.cos(obliquity) + Math.tan(rad(lat)) * Math.sin(obliquity))
  return norm(deg(Math.atan2(y, x)))
}

const signIndex = (longitude) => Math.floor(norm(longitude) / 30)
const navamsaSign = (longitude) => Math.floor(norm(longitude) / (10 / 3)) % 12

function describePosition(longitude) {
  const lon = norm(longitude)
  const sign = signIndex(lon)
  const inSign = lon - sign * 30
  const nakshatraSpan = 360 / 27
  const nakshatra = Math.floor(lon / nakshatraSpan)
  const pada = Math.floor((lon - nakshatra * nakshatraSpan) / (nakshatraSpan / 4)) + 1
  return { longitude: lon, sign, inSign, nakshatra, nakshatraName: NAKSHATRAS[nakshatra], pada }
}

export const formatDegrees = (value) => {
  const whole = Math.floor(value)
  const minutesFloat = (value - whole) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = Math.floor((minutesFloat - minutes) * 60)
  return `${whole}°${String(minutes).padStart(2, '0')}′${String(seconds).padStart(2, '0')}″`
}

export function planetaryStatus(key, sign) {
  if (EXALTED[key] === sign) return 'Exalted'
  if (DEBILITATED[key] === sign) return 'Debilitated'
  if (OWN[key]?.includes(sign)) return 'Own sign'
  return ''
}

function panchang(sunSid, moonSid) {
  const elongation = norm(moonSid - sunSid)
  const tithiNumber = Math.floor(elongation / 12) + 1
  const paksha = tithiNumber <= 15 ? 'Shukla' : 'Krishna'
  const inPaksha = ((tithiNumber - 1) % 15) + 1
  const tithiName = inPaksha === 15 ? (paksha === 'Shukla' ? 'Pournami' : 'Amavasya') : TITHIS[inPaksha - 1]
  const yogaIndex = Math.floor(norm(sunSid + moonSid) / (360 / 27))
  const half = Math.floor(elongation / 6)
  let karana
  if (half === 0) karana = 'Kimstughna'
  else if (half >= 57) karana = ['Shakuni', 'Chatushpada', 'Naga'][half - 57]
  else karana = MOVABLE_KARANAS[(half - 1) % 7]
  return { tithi: `${paksha} ${tithiName}`, tithiNumber, yogam: YOGAS[yogaIndex], karanam: karana }
}

// ---- Vimshottari dasha (120-year cycle, years of 365.25 days) -------------------------------------
const DASHA_ORDER = [['ketu', 7], ['venus', 20], ['sun', 6], ['moon', 10], ['mars', 7], ['rahu', 18], ['jupiter', 16], ['saturn', 19], ['mercury', 17]]
const DASHA_YEAR_MS = 365.25 * 86400000
const dashaName = (key) => PLANETS.find((planet) => planet.key === key).sa

/** Splits a period of `lengthMs` starting at `startMs` into sub-periods that begin with `lordIndex`. */
function subPeriods(lordIndex, startMs, lengthMs) {
  let cursor = startMs
  return Array.from({ length: 9 }, (_, step) => {
    const [key, years] = DASHA_ORDER[(lordIndex + step) % 9]
    const length = (lengthMs * years) / 120
    const period = { key, start: cursor, end: cursor + length }
    cursor += length
    return period
  })
}

/**
 * Vimshottari dasha at `nowMs` from the Moon's sidereal longitude and the birth instant.
 * Returns the running Maha dasha, Bhukti (antardasha), Antharam (pratyantar) and the next bhuktis.
 */
export function vimshottariDasha(moonLongitude, birthMs, nowMs) {
  const span = 360 / 27
  const lon = norm(moonLongitude)
  const nakshatra = Math.floor(lon / span)
  const elapsedFraction = (lon - nakshatra * span) / span
  const startIndex = nakshatra % 9
  // Balance of the birth dasha: the part of the first maha dasha not yet lived at birth.
  const firstLength = DASHA_ORDER[startIndex][1] * DASHA_YEAR_MS
  let mahaStart = birthMs - elapsedFraction * firstLength
  for (let cycle = 0; cycle < 27; cycle += 1) {
    const index = (startIndex + cycle) % 9
    const length = DASHA_ORDER[index][1] * DASHA_YEAR_MS
    const mahaEnd = mahaStart + length
    if (nowMs < mahaEnd) {
      const bhuktis = subPeriods(index, mahaStart, length)
      const bhuktiIndex = bhuktis.findIndex((period) => nowMs < period.end)
      const bhukti = bhuktis[bhuktiIndex]
      const bhuktiLord = DASHA_ORDER.findIndex(([key]) => key === bhukti.key)
      const antharam = subPeriods(bhuktiLord, bhukti.start, bhukti.end - bhukti.start).find((period) => nowMs < period.end)
      const nextMahaIndex = (index + 1) % 9
      // Each upcoming bhukti is tagged with the Maha lord it belongs to (the list can cross into the next Maha dasha).
      const following = [
        ...bhuktis.slice(bhuktiIndex + 1).map((period) => ({ ...period, maha: DASHA_ORDER[index][0] })),
        ...subPeriods(nextMahaIndex, mahaEnd, DASHA_ORDER[nextMahaIndex][1] * DASHA_YEAR_MS).map((period) => ({ ...period, maha: DASHA_ORDER[nextMahaIndex][0] })),
      ]
      return {
        maha: { key: DASHA_ORDER[index][0], name: dashaName(DASHA_ORDER[index][0]), start: mahaStart, end: mahaEnd },
        bhukti: { key: bhukti.key, name: dashaName(bhukti.key), start: bhukti.start, end: bhukti.end, progress: (nowMs - bhukti.start) / (bhukti.end - bhukti.start) },
        antharam: { key: antharam.key, name: dashaName(antharam.key) },
        upcoming: following.slice(0, 2).map((period) => ({ maha: dashaName(period.maha), bhukti: dashaName(period.key), bhuktiEn: PLANETS.find((planet) => planet.key === period.key).en, start: period.start, end: period.end })),
      }
    }
    mahaStart = mahaEnd
  }
  return null
}

/** Rajayogas judged from natal positions: Gaja Kesari and Budha Aditya. */
function buildYogas(planets) {
  const byKey = Object.fromEntries(planets.map((planet) => [planet.key, planet]))
  const fromMoon = ((byKey.jupiter.sign - byKey.moon.sign + 12) % 12) + 1
  const gajaKesari = [1, 4, 7, 10].includes(fromMoon)
  const budhaAditya = byKey.sun.sign === byKey.mercury.sign
  return [
    { key: 'gajakesari', name: 'Gaja Kesari', present: gajaKesari, detail: gajaKesari ? `Guru is in house ${fromMoon} from Chandra (a kendra)` : 'Guru is not in a kendra from Chandra' },
    { key: 'budhaaditya', name: 'Budha Aditya', present: budhaAditya, detail: budhaAditya ? 'Surya and Budha share a sign' : 'Surya and Budha are in different signs' },
  ]
}

function buildDoshas(planets, lagnaSign, transitSaturnSign) {
  const byKey = Object.fromEntries(planets.map((planet) => [planet.key, planet]))
  const houseOf = (planet) => ((planet.sign - lagnaSign + 12) % 12) + 1

  const marsHouse = houseOf(byKey.mars)
  const mangalHouses = [1, 2, 4, 7, 8, 12]
  const mangalPresent = mangalHouses.includes(marsHouse)
  const marsRelief = [0, 7, 9].includes(byKey.mars.sign)

  const rahuLon = byKey.rahu.longitude
  const arcFromRahu = (planet) => norm(planet.longitude - rahuLon)
  const seven = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'].map((key) => byKey[key])
  const kaalSarp = seven.every((planet) => arcFromRahu(planet) < 180) || seven.every((planet) => arcFromRahu(planet) > 180)

  const guruChandal = byKey.jupiter.sign === byKey.rahu.sign

  const fromMoon = ((transitSaturnSign - byKey.moon.sign + 12) % 12) + 1
  let shani = { present: false, detail: 'Saturn is not transiting 12th, 1st, 2nd, 4th or 8th from natal Moon' }
  if ([12, 1, 2].includes(fromMoon)) shani = { present: true, detail: `Sade Sati: transit Saturn in ${SIGNS[transitSaturnSign].sa}, ${fromMoon === 12 ? '12th' : fromMoon === 1 ? '1st' : '2nd'} from natal Moon` }
  else if ([4, 8].includes(fromMoon)) shani = { present: true, detail: `Shani Dhaiya: transit Saturn in ${SIGNS[transitSaturnSign].sa}, ${fromMoon}th from natal Moon` }

  return [
    { key: 'mangal', name: 'Mangal Dosha', present: mangalPresent, detail: mangalPresent ? `Mars in house ${marsHouse} from Lagna${marsRelief ? ' (in own/exalted sign, effect reduced)' : ''}` : `Mars in house ${marsHouse} from Lagna` },
    { key: 'kaalsarp', name: 'Kaal Sarp Dosha', present: kaalSarp, detail: kaalSarp ? 'All seven planets lie between Rahu and Ketu' : 'Planets are on both sides of the Rahu–Ketu axis' },
    { key: 'guruchandal', name: 'Guru Chandal Yoga', present: guruChandal, detail: guruChandal ? `Jupiter conjunct Rahu in ${SIGNS[byKey.jupiter.sign].sa}` : 'Jupiter is not conjunct Rahu' },
    { key: 'shani', name: 'Sade Sati / Shani Dhaiya', present: shani.present, detail: shani.detail },
  ]
}

/**
 * Computes the full chart. Returns { ok: false, reason } if date, time or place are missing
 * or the place is not in the offline gazetteer.
 */
export function computeChart(details = {}, now = new Date()) {
  const { dob, time, place } = details
  if (!dob || !time) return { ok: false, reason: 'Date or time of birth is missing.' }
  if (!place) return { ok: false, reason: 'Birthplace is missing.' }
  // Coordinates saved with the user's profile win over the offline city list.
  const lat = Number(details.latitude)
  const lon = Number(details.longitude)
  const hasCoords = details.latitude !== '' && details.latitude != null && details.longitude !== '' && details.longitude != null
    && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && details.timezone
  const location = hasCoords ? { name: String(place).split(',')[0].trim(), region: String(place).split(',').slice(1).join(',').trim(), lat, lon, timeZone: details.timezone } : findBirthPlace(place)
  if (!location) return { ok: false, reason: `Birthplace “${place}” has no saved coordinates and is not in the built-in city list, so the chart cannot be calculated. The user can choose the exact place with “Find location” in the call form.` }
  const utc = localBirthToUtc(dob, time, location.timeZone)
  if (!utc || Number.isNaN(utc.getTime())) return { ok: false, reason: 'Date or time of birth is invalid.' }

  const ayanamsa = lahiriAyanamsa(utc)
  const day = 86400000
  const planets = PLANETS.map((planet) => {
    let tropical
    let retro = false
    if (planet.node) {
      tropical = meanNodeLongitude(utc)
      if (planet.key === 'ketu') tropical = norm(tropical + 180)
      retro = true
    } else {
      tropical = tropicalLongitude(planet.body, utc)
      if (planet.key !== 'sun' && planet.key !== 'moon') {
        const before = tropicalLongitude(planet.body, new Date(utc.getTime() - day))
        const after = tropicalLongitude(planet.body, new Date(utc.getTime() + day))
        retro = norm(after - before + 180) - 180 < 0
      }
    }
    const sidereal = norm(tropical - ayanamsa)
    const position = describePosition(sidereal)
    return { ...planet, ...position, retrograde: retro, status: planetaryStatus(planet.key, position.sign), navamsaSign: navamsaSign(sidereal) }
  })

  const lagnaLongitude = norm(ascendantLongitude(utc, location.lat, location.lon) - ayanamsa)
  const lagna = { ...describePosition(lagnaLongitude), navamsaSign: navamsaSign(lagnaLongitude) }
  const withHouses = planets.map((planet) => ({ ...planet, house: ((planet.sign - lagna.sign + 12) % 12) + 1, navamsaHouse: ((planet.navamsaSign - lagna.navamsaSign + 12) % 12) + 1 }))
  const sun = withHouses.find((planet) => planet.key === 'sun')
  const moon = withHouses.find((planet) => planet.key === 'moon')

  const transitSaturn = norm(tropicalLongitude(Astronomy.Body.Saturn, now) - lahiriAyanamsa(now))

  return {
    ok: true,
    location,
    utc,
    ayanamsa,
    lagna,
    planets: withHouses,
    panchang: {
      lagna: `${SIGNS[lagna.sign].sa} (${SIGNS[lagna.sign].en}) ${formatDegrees(lagna.inSign)}`,
      janmaRashi: `${SIGNS[moon.sign].sa} (${SIGNS[moon.sign].en})`,
      nakshatra: `${moon.nakshatraName} / Pada ${moon.pada}`,
      ...panchang(sun.longitude, moon.longitude),
      source: 'Drik-style sidereal calculation · Lahiri ayanamsa · mean node',
    },
    doshas: buildDoshas(withHouses, lagna.sign, signIndex(transitSaturn)),
    yogas: buildYogas(withHouses),
    dasha: vimshottariDasha(moon.longitude, utc.getTime(), now.getTime()),
  }
}

/** Planets grouped by sign for a South Indian chart. kind: 'rashi' | 'navamsa'. */
export function groupBySign(chart, kind = 'rashi') {
  const cells = Array.from({ length: 12 }, () => ({ planets: [], lagna: false }))
  const lagnaSign = kind === 'navamsa' ? chart.lagna.navamsaSign : chart.lagna.sign
  cells[lagnaSign].lagna = true
  chart.planets.forEach((planet) => {
    const sign = kind === 'navamsa' ? planet.navamsaSign : planet.sign
    cells[sign].planets.push(planet)
  })
  return cells
}
