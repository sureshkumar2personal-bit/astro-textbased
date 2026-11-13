// Birthplace lookup. Nothing is guessed: the user searches, sees the candidate places with
// their coordinates, and picks one. Coordinates come from OpenStreetMap Nominatim (public
// endpoint, ~1 request/second policy, so lookups only run on an explicit "Find" click) and
// the IANA time zone is derived offline from those coordinates with tz-lookup.
import tzLookup from 'tz-lookup'

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export function timeZoneFor(lat, lon) {
  try {
    return tzLookup(lat, lon) || ''
  } catch {
    return ''
  }
}

/** Returns [{ id, label, type, latitude, longitude, timeZone }]. Throws on network/HTTP failure. */
export async function searchPlaces(query, { fetchImpl = globalThis.fetch, signal } = {}) {
  const text = String(query || '').trim()
  if (text.length < 2) return []
  const url = `${NOMINATIM_URL}?${new URLSearchParams({ q: text, format: 'jsonv2', limit: '6', addressdetails: '0' })}`
  const response = await fetchImpl(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Place search failed (${response.status})`)
  const rows = await response.json()
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const latitude = Number(row.lat)
      const longitude = Number(row.lon)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
      const timeZone = timeZoneFor(latitude, longitude)
      if (!timeZone) return null
      return { id: String(row.place_id), label: row.display_name, type: row.type || row.category || '', latitude, longitude, timeZone }
    })
    .filter(Boolean)
}
