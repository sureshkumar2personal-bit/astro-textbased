export function deriveUsername(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30) || 'profile'
}

const BIRTH_PLACE_DETAILS = {
  'Ahmedabad, Gujarat, India': { latitude: '23.0225', longitude: '72.5714', timezone: 'Asia/Kolkata' },
  'Bengaluru, Karnataka, India': { latitude: '12.9716', longitude: '77.5946', timezone: 'Asia/Kolkata' },
  'Chennai, Tamil Nadu, India': { latitude: '13.0827', longitude: '80.2707', timezone: 'Asia/Kolkata' },
  'Chengalpattu, Tamil Nadu, India': { latitude: '12.6819', longitude: '79.9888', timezone: 'Asia/Kolkata' },
  'Chidambaram, Tamil Nadu, India': { latitude: '11.3993', longitude: '79.6914', timezone: 'Asia/Kolkata' },
  'Coimbatore, Tamil Nadu, India': { latitude: '11.0168', longitude: '76.9558', timezone: 'Asia/Kolkata' },
  'Cuddalore, Tamil Nadu, India': { latitude: '11.7480', longitude: '79.7714', timezone: 'Asia/Kolkata' },
  'Delhi, India': { latitude: '28.6139', longitude: '77.2090', timezone: 'Asia/Kolkata' },
  'Hyderabad, Telangana, India': { latitude: '17.3850', longitude: '78.4867', timezone: 'Asia/Kolkata' },
  'Kochi, Kerala, India': { latitude: '9.9312', longitude: '76.2673', timezone: 'Asia/Kolkata' },
  'Kolkata, West Bengal, India': { latitude: '22.5726', longitude: '88.3639', timezone: 'Asia/Kolkata' },
  'Madurai, Tamil Nadu, India': { latitude: '9.9252', longitude: '78.1198', timezone: 'Asia/Kolkata' },
  'Mumbai, Maharashtra, India': { latitude: '19.0760', longitude: '72.8777', timezone: 'Asia/Kolkata' },
  'Pune, Maharashtra, India': { latitude: '18.5204', longitude: '73.8567', timezone: 'Asia/Kolkata' },
  'Theni, Tamil Nadu, India': { latitude: '10.0104', longitude: '77.4768', timezone: 'Asia/Kolkata' },
  'Tiruchirappalli, Tamil Nadu, India': { latitude: '10.7905', longitude: '78.7047', timezone: 'Asia/Kolkata' },
  'Tirunelveli, Tamil Nadu, India': { latitude: '8.7139', longitude: '77.7567', timezone: 'Asia/Kolkata' },
  'Visakhapatnam, Andhra Pradesh, India': { latitude: '17.6868', longitude: '83.2185', timezone: 'Asia/Kolkata' },
}

export function getBirthPlaceDetails(place) {
  return BIRTH_PLACE_DETAILS[String(place || '').trim()] || null
}

export function isFutureDate(value) {
  if (!value) return false
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date > today
}

export function validateProfilePayload(payload, users = [], currentUserId = null) {
  const name = String(payload?.name || '').trim()
  const username = String(payload?.username || '').trim().replace(/^@+/, '').toLowerCase()

  if (!name) throw new Error('Enter your full name.')
  if (!username) throw new Error('Enter a username.')
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
    throw new Error('Username must be 3–30 characters and use letters, numbers, dots, hyphens, or underscores.')
  }
  if (users.some((entry) => entry.id !== currentUserId && String(entry.username || '').toLowerCase() === username)) {
    throw new Error('That username is already in use.')
  }
  if (isFutureDate(payload?.dateOfBirth)) throw new Error('Date of birth cannot be in the future.')

  return { name, username }
}
