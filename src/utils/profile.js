export function deriveUsername(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30) || 'profile'
}

export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say',
]

export const BIRTH_PLACE_DETAILS = {
  'Ahmedabad, Gujarat, India': { latitude: '23.0225', longitude: '72.5714', timezone: 'Asia/Kolkata' },
  'Amritsar, Punjab, India': { latitude: '31.6340', longitude: '74.8723', timezone: 'Asia/Kolkata' },
  'Bengaluru, Karnataka, India': { latitude: '12.9716', longitude: '77.5946', timezone: 'Asia/Kolkata' },
  'Bhopal, Madhya Pradesh, India': { latitude: '23.2599', longitude: '77.4126', timezone: 'Asia/Kolkata' },
  'Bhubaneswar, Odisha, India': { latitude: '20.2961', longitude: '85.8245', timezone: 'Asia/Kolkata' },
  'Chandigarh, India': { latitude: '30.7333', longitude: '76.7794', timezone: 'Asia/Kolkata' },
  'Chennai, Tamil Nadu, India': { latitude: '13.0827', longitude: '80.2707', timezone: 'Asia/Kolkata' },
  'Chengalpattu, Tamil Nadu, India': { latitude: '12.6819', longitude: '79.9888', timezone: 'Asia/Kolkata' },
  'Chidambaram, Tamil Nadu, India': { latitude: '11.3993', longitude: '79.6914', timezone: 'Asia/Kolkata' },
  'Coimbatore, Tamil Nadu, India': { latitude: '11.0168', longitude: '76.9558', timezone: 'Asia/Kolkata' },
  'Cuddalore, Tamil Nadu, India': { latitude: '11.7480', longitude: '79.7714', timezone: 'Asia/Kolkata' },
  'Dehradun, Uttarakhand, India': { latitude: '30.3165', longitude: '78.0322', timezone: 'Asia/Kolkata' },
  'Delhi, India': { latitude: '28.6139', longitude: '77.2090', timezone: 'Asia/Kolkata' },
  'Erode, Tamil Nadu, India': { latitude: '11.3410', longitude: '77.7172', timezone: 'Asia/Kolkata' },
  'Guwahati, Assam, India': { latitude: '26.1445', longitude: '91.7362', timezone: 'Asia/Kolkata' },
  'Hyderabad, Telangana, India': { latitude: '17.3850', longitude: '78.4867', timezone: 'Asia/Kolkata' },
  'Indore, Madhya Pradesh, India': { latitude: '22.7196', longitude: '75.8577', timezone: 'Asia/Kolkata' },
  'Jaipur, Rajasthan, India': { latitude: '26.9124', longitude: '75.7873', timezone: 'Asia/Kolkata' },
  'Kanpur, Uttar Pradesh, India': { latitude: '26.4499', longitude: '80.3319', timezone: 'Asia/Kolkata' },
  'Kochi, Kerala, India': { latitude: '9.9312', longitude: '76.2673', timezone: 'Asia/Kolkata' },
  'Kolkata, West Bengal, India': { latitude: '22.5726', longitude: '88.3639', timezone: 'Asia/Kolkata' },
  'Kozhikode, Kerala, India': { latitude: '11.2588', longitude: '75.7804', timezone: 'Asia/Kolkata' },
  'Lucknow, Uttar Pradesh, India': { latitude: '26.8467', longitude: '80.9462', timezone: 'Asia/Kolkata' },
  'Madurai, Tamil Nadu, India': { latitude: '9.9252', longitude: '78.1198', timezone: 'Asia/Kolkata' },
  'Mumbai, Maharashtra, India': { latitude: '19.0760', longitude: '72.8777', timezone: 'Asia/Kolkata' },
  'Nagpur, Maharashtra, India': { latitude: '21.1458', longitude: '79.0882', timezone: 'Asia/Kolkata' },
  'Nashik, Maharashtra, India': { latitude: '19.9975', longitude: '73.7898', timezone: 'Asia/Kolkata' },
  'Patna, Bihar, India': { latitude: '25.5941', longitude: '85.1376', timezone: 'Asia/Kolkata' },
  'Pune, Maharashtra, India': { latitude: '18.5204', longitude: '73.8567', timezone: 'Asia/Kolkata' },
  'Raipur, Chhattisgarh, India': { latitude: '21.2514', longitude: '81.6296', timezone: 'Asia/Kolkata' },
  'Ranchi, Jharkhand, India': { latitude: '23.3441', longitude: '85.3096', timezone: 'Asia/Kolkata' },
  'Salem, Tamil Nadu, India': { latitude: '11.6643', longitude: '78.1460', timezone: 'Asia/Kolkata' },
  'Surat, Gujarat, India': { latitude: '21.1702', longitude: '72.8311', timezone: 'Asia/Kolkata' },
  'Theni, Tamil Nadu, India': { latitude: '10.0104', longitude: '77.4768', timezone: 'Asia/Kolkata' },
  'Thiruvananthapuram, Kerala, India': { latitude: '8.5241', longitude: '76.9366', timezone: 'Asia/Kolkata' },
  'Tiruchirappalli, Tamil Nadu, India': { latitude: '10.7905', longitude: '78.7047', timezone: 'Asia/Kolkata' },
  'Tirunelveli, Tamil Nadu, India': { latitude: '8.7139', longitude: '77.7567', timezone: 'Asia/Kolkata' },
  'Vadodara, Gujarat, India': { latitude: '22.3072', longitude: '73.1812', timezone: 'Asia/Kolkata' },
  'Varanasi, Uttar Pradesh, India': { latitude: '25.3176', longitude: '82.9739', timezone: 'Asia/Kolkata' },
  'Vijayawada, Andhra Pradesh, India': { latitude: '16.5062', longitude: '80.6480', timezone: 'Asia/Kolkata' },
  'Visakhapatnam, Andhra Pradesh, India': { latitude: '17.6868', longitude: '83.2185', timezone: 'Asia/Kolkata' },
  'Dubai, United Arab Emirates': { latitude: '25.2048', longitude: '55.2708', timezone: 'Asia/Dubai' },
  'London, United Kingdom': { latitude: '51.5074', longitude: '-0.1278', timezone: 'Europe/London' },
  'New York, USA': { latitude: '40.7128', longitude: '-74.0060', timezone: 'America/New_York' },
  'Singapore': { latitude: '1.3521', longitude: '103.8198', timezone: 'Asia/Singapore' },
}

export const BIRTH_PLACE_OPTIONS = Object.keys(BIRTH_PLACE_DETAILS).sort((first, second) => first.localeCompare(second))

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

export function validateProfileFieldErrors(payload, users = [], currentUserId = null) {
  const errors = {}
  const name = String(payload?.name || '').trim()
  const username = String(payload?.username || '').trim().replace(/^@+/, '').toLowerCase()
  const profileImage = String(payload?.profileImage || '').trim()
  const dateOfBirth = payload?.dateOfBirth
  const latitude = payload?.latitude
  const longitude = payload?.longitude

  if (!name) {
    errors.name = 'Enter your full name.'
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }

  if (!username) {
    errors.username = 'Enter a username.'
  } else if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
    errors.username = 'Username must be 3–30 characters and use letters, numbers, dots, hyphens, or underscores.'
  } else if (users.some((entry) => entry.id !== currentUserId && String(entry.username || '').toLowerCase() === username)) {
    errors.username = 'That username is already in use.'
  }

  if (profileImage) {
    if (/^blob:/i.test(profileImage)) {
      errors.profileImage = 'Temporary blob URLs cannot be used. Enter a public https:// URL or leave blank.'
    } else if (!/^(https?:\/\/|\/|data:image\/)/i.test(profileImage)) {
      errors.profileImage = 'Enter a valid image URL starting with https://'
    }
  }

  if (dateOfBirth && isFutureDate(dateOfBirth)) {
    errors.dateOfBirth = 'Date of birth cannot be in the future.'
  }

  if (latitude !== '' && latitude !== null && latitude !== undefined) {
    const latNum = Number(latitude)
    if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
      errors.latitude = 'Latitude must be between -90 and 90.'
    }
  }

  if (longitude !== '' && longitude !== null && longitude !== undefined) {
    const lngNum = Number(longitude)
    if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      errors.longitude = 'Longitude must be between -180 and 180.'
    }
  }

  return errors
}

export function validateProfilePayload(payload, users = [], currentUserId = null) {
  const errors = validateProfileFieldErrors(payload, users, currentUserId)
  const firstError = Object.values(errors)[0]
  if (firstError) {
    throw new Error(firstError)
  }

  const name = String(payload?.name || '').trim()
  const username = String(payload?.username || '').trim().replace(/^@+/, '').toLowerCase()

  return { name, username }
}
