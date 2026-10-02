export const PROFILE_SECTIONS = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'experience', label: 'Experience & Expertise' },
  { id: 'languages', label: 'Languages' },
  { id: 'services', label: 'Consultation Services' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'about', label: 'About Me' },
  { id: 'availability', label: 'Availability' },
]

export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']
export const ASTROLOGY_SYSTEMS = ['Vedic Astrology', 'KP Astrology', 'Nadi Astrology', 'Western Astrology', 'Numerology', 'Tarot', 'Other']
export const EXPERTISE_OPTIONS = [
  'Marriage Astrology', 'Career Astrology', 'Finance Astrology', 'Relationship Astrology', 'Health Astrology', 'Vedic Astrology',
  'Kundli Reading', 'Prashna', 'Muhurtham', 'Numerology', 'Vastu', 'Gemstone Consultation',
]
export const LANGUAGE_OPTIONS = ['Tamil', 'English', 'Hindi', 'Telugu', 'Malayalam', 'Kannada', 'Other']
export const CONSULTATION_STYLES = ['Traditional', 'Practical', 'Spiritual', 'Detailed', 'Friendly', 'Guidance-focused']
export const BIO_LIMIT = 1500
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png']
export const PROFILE_STATUSES = ['Draft', 'Pending Review', 'Approved', 'Rejected']
export const VERIFICATION_STATUSES = ['Pending', 'Verified', 'Rejected']

// `shared` services (chat, voice) are stored by the existing astrologerServices
// settings so the dashboard, wallet and booking flows keep a single source of truth.
export const SERVICE_DEFINITIONS = [
  { key: 'chat', label: 'Chat Consultation', unit: 'minute', shared: 'chat' },
  { key: 'voice', label: 'Voice Call', unit: 'minute', shared: 'call' },
  { key: 'video', label: 'Video Call', unit: 'minute' },
  { key: 'live', label: 'Live Session', unit: 'session' },
  { key: 'question', label: 'Question Answer', unit: 'question' },
  { key: 'horoscope', label: 'Horoscope Reading', unit: 'session' },
  { key: 'kundli', label: 'Kundli Consultation', unit: 'session' },
  { key: 'compatibility', label: 'Marriage Compatibility', unit: 'session' },
  { key: 'career', label: 'Career Guidance', unit: 'session' },
  { key: 'muhurtham', label: 'Muhurtham Consultation', unit: 'session' },
]

export const PRICING_FIELDS = [
  { key: 'chat', label: 'Chat', suffix: 'per minute' },
  { key: 'voice', label: 'Voice', suffix: 'per minute' },
  { key: 'video', label: 'Video', suffix: 'per minute' },
  { key: 'question', label: 'Question', suffix: 'fixed price' },
  { key: 'live', label: 'Live Session', suffix: 'session price' },
]

// Which stored keys each section owns, so saving one section never writes another.
export const SECTION_KEYS = {
  basic: ['photo', 'fullName', 'displayName', 'phone', 'email', 'gender', 'dob', 'city', 'state', 'country'],
  experience: ['yearsOfExperience', 'primarySystem', 'expertise'],
  languages: ['languages', 'primaryLanguage'],
  services: ['services'],
  pricing: ['services'],
  credentials: ['credentials'],
  about: ['bio', 'tagline', 'consultationStyle'],
  availability: [],
}

export function createDefaultProfile(user = {}) {
  const services = {}
  SERVICE_DEFINITIONS.forEach(({ key }) => {
    services[key] = { enabled: false, duration: '', price: '' }
  })
  return {
    photo: '',
    fullName: user.name || '',
    displayName: user.name || '',
    phone: user.phone || '',
    email: user.email || '',
    gender: '',
    dob: '',
    city: '',
    state: '',
    country: 'India',
    yearsOfExperience: String(parseInt(user.experience, 10) || ''),
    primarySystem: '',
    expertise: String(user.specialization || '').split(',').map((item) => item.trim()).filter((item) => EXPERTISE_OPTIONS.includes(item)),
    languages: [],
    primaryLanguage: '',
    services,
    credentials: [],
    bio: '',
    tagline: '',
    consultationStyle: [],
    status: 'Draft',
  }
}

export function mergeProfile(stored, user) {
  const base = createDefaultProfile(user)
  if (!stored || typeof stored !== 'object') return base
  return {
    ...base,
    ...stored,
    services: { ...base.services, ...(stored.services || {}) },
    expertise: Array.isArray(stored.expertise) ? stored.expertise : base.expertise,
    languages: Array.isArray(stored.languages) ? stored.languages : [],
    credentials: Array.isArray(stored.credentials) ? stored.credentials : [],
    consultationStyle: Array.isArray(stored.consultationStyle) ? stored.consultationStyle : [],
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,17}$/
const isBlank = (value) => String(value ?? '').trim() === ''
const isNegativeOrInvalid = (value) => !Number.isFinite(Number(value)) || Number(value) < 0

export function validateSection(sectionId, data, today = new Date()) {
  const errors = {}
  if (sectionId === 'basic') {
    if (isBlank(data.fullName)) errors.fullName = 'Name is required.'
    if (isBlank(data.displayName)) errors.displayName = 'Display name is required.'
    if (!isBlank(data.email) && !EMAIL_PATTERN.test(data.email.trim())) errors.email = 'Enter a valid email address.'
    if (!isBlank(data.phone) && !PHONE_PATTERN.test(data.phone.trim())) errors.phone = 'Enter a valid phone number.'
    if (data.dob) {
      const dob = new Date(`${data.dob}T00:00:00`)
      if (Number.isNaN(dob.getTime())) errors.dob = 'Enter a valid date.'
      else if (dob > today) errors.dob = 'Date of birth cannot be in the future.'
    }
  }
  if (sectionId === 'experience') {
    if (isBlank(data.yearsOfExperience)) errors.yearsOfExperience = 'Years of experience is required.'
    else if (isNegativeOrInvalid(data.yearsOfExperience)) errors.yearsOfExperience = 'Enter 0 or more years.'
    if (isBlank(data.primarySystem)) errors.primarySystem = 'Select your primary astrology system.'
    if (!data.expertise.length) errors.expertise = 'Select at least one area of expertise.'
  }
  if (sectionId === 'languages') {
    if (!data.languages.length) errors.languages = 'Select at least one language.'
    else if (!data.primaryLanguage) errors.primaryLanguage = 'Choose a primary language.'
  }
  if (sectionId === 'services') {
    Object.entries(data.services).forEach(([key, service]) => {
      if (!isBlank(service.duration) && (isNegativeOrInvalid(service.duration) || Number(service.duration) === 0)) {
        errors[`${key}.duration`] = 'Enter a duration above 0.'
      }
    })
  }
  if (sectionId === 'pricing') {
    PRICING_FIELDS.forEach(({ key }) => {
      const price = data.services[key]?.price
      if (!isBlank(price) && isNegativeOrInvalid(price)) errors[`${key}.price`] = 'Price cannot be negative.'
    })
  }
  if (sectionId === 'about') {
    if (data.bio.length > BIO_LIMIT) errors.bio = `Bio must be ${BIO_LIMIT} characters or fewer.`
  }
  return errors
}

export function validateCredential(credential, today = new Date()) {
  const errors = {}
  if (isBlank(credential.name)) errors.name = 'Certification name is required.'
  if (isBlank(credential.institution)) errors.institution = 'Institution is required.'
  if (!isBlank(credential.year)) {
    const year = Number(credential.year)
    if (!Number.isInteger(year) || year < 1950 || year > today.getFullYear()) errors.year = 'Enter a valid year.'
  }
  return errors
}

export function validatePhoto(file) {
  if (!file) return ''
  if (!PHOTO_TYPES.includes(file.type)) return 'Upload a JPG or PNG image.'
  if (file.size > PHOTO_MAX_BYTES) return 'Photo must be 2MB or smaller.'
  return ''
}

/** `shared` carries the live chat/voice values owned by the astrologerServices settings. */
export function calculateCompletion(profile, { hasAvailability = false } = {}) {
  const services = profile.services || {}
  const enabled = Object.values(services).filter((service) => service.enabled)
  const checks = [
    ['Basic Information', !isBlank(profile.displayName) && !isBlank(profile.fullName)],
    ['Profile Photo', Boolean(profile.photo)],
    ['Experience & Expertise', !isBlank(profile.yearsOfExperience) && !isBlank(profile.primarySystem) && profile.expertise.length > 0],
    ['Languages', profile.languages.length > 0 && Boolean(profile.primaryLanguage)],
    ['Consultation Services', enabled.length > 0],
    ['Credentials', profile.credentials.length > 0],
    ['About Me', !isBlank(profile.bio)],
    ['Availability', hasAvailability],
  ]
  const missing = checks.filter(([, done]) => !done).map(([label]) => label)
  return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing }
}

export function profileStorageKey(userId) {
  return `astroconnect-astrologer-profile:${userId}`
}
