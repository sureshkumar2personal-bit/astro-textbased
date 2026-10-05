const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export class AstrologyServiceUnavailableError extends Error {
  constructor(message = 'Astrology calculation service is not configured.') {
    super(message)
    this.name = 'AstrologyServiceUnavailableError'
  }
}

function assertRawBirthDetails(details = {}) {
  if (!details.dateOfBirth || !details.timeOfBirth || !details.birthPlace) {
    throw new Error('Date of birth, exact time of birth, and birth place are required.')
  }
}

/**
 * Boundary for the future astrology engine/API. This intentionally does not
 * calculate or invent derived values in the frontend.
 */
export async function calculateBirthChart(details, { apiBaseUrl = DEFAULT_API_BASE_URL, fetchImpl = fetch } = {}) {
  assertRawBirthDetails(details)
  if (!apiBaseUrl) return { status: 'unavailable', data: null }

  const response = await fetchImpl(`${apiBaseUrl}/api/profile/birth-chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(details),
  })
  if (!response.ok) throw new AstrologyServiceUnavailableError(`Astrology service returned ${response.status}.`)
  return { status: 'ready', data: await response.json() }
}
