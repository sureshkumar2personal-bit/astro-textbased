import { mockAstrologers } from '../data/notificationData.js'
import { consultationAstrologers } from '../data/consultationAstrologers.js'
import { SERVICE_DEFINITIONS, effectiveVisibility } from './astrologerProfile.js'

// One public record per astrologer, generated from the private profile whenever it changes.
// Both the astrologer's "Preview Public Profile" and every user-facing astrologer view read this
// record, so private fields (phone, email, dob, documents, review state) are never part of it.
export const publicProfileStorageKey = (astrologerId) => `astroconnect-public-astrologer:${astrologerId}`

const filled = (value) => String(value ?? '').trim() !== ''

/** Builds the public record from the private profile. Only approved/public data is included. */
export function buildPublicProfile(profile, { astrologerId, isOnline = true, acceptingConsultations = true, hasAvailability = false } = {}) {
  const services = SERVICE_DEFINITIONS
    .filter(({ key }) => profile.services?.[key]?.enabled)
    .map(({ key, label, unit }) => ({
      key, label, unit,
      price: Number(profile.services[key].price) > 0 ? Number(profile.services[key].price) : null,
      duration: profile.services[key].duration || '',
    }))
  const priceOf = (key) => services.find((service) => service.key === key)?.price ?? null
  return {
    id: astrologerId,
    name: profile.displayName,
    photo: profile.photo || '',
    yearsOfExperience: profile.yearsOfExperience,
    primarySystem: profile.primarySystem,
    expertise: profile.expertise || [],
    languages: profile.languages || [],
    primaryLanguage: profile.primaryLanguage,
    tagline: profile.tagline,
    bio: profile.bio,
    approach: profile.approach,
    consultationStyle: profile.consultationStyle || [],
    guidanceAreas: profile.guidanceAreas || [],
    expectations: profile.expectations,
    services,
    chatEnabled: Boolean(profile.services?.chat?.enabled),
    voiceEnabled: Boolean(profile.services?.voice?.enabled),
    chatRate: priceOf('chat'),
    callRate: priceOf('voice'),
    isOnline,
    acceptingConsultations,
    hasAvailability,
    // Only approved credentials are public; pending/rejected ones and documents never leave the astrologer side.
    credentials: (profile.credentials || [])
      .filter((item) => item.verificationStatus === 'Verified')
      .map(({ id, name, institution, year }) => ({ id, name, institution, year })),
    visibility: effectiveVisibility(profile),
    updatedAt: profile.lastUpdated || '',
  }
}

export function publishPublicProfile(astrologerId, publicProfile) {
  try {
    window.localStorage.setItem(publicProfileStorageKey(astrologerId), JSON.stringify(publicProfile))
  } catch { /* storage unavailable; user side falls back to the base record */ }
}

export function readPublicProfile(astrologerId) {
  try {
    return JSON.parse(window.localStorage.getItem(publicProfileStorageKey(astrologerId)) || 'null')
  } catch {
    return null
  }
}

const fallbackRates = (id) => consultationAstrologers.find((item) => item.id === id) || {}

/** Merges the published public record over the base astrologer record into the shape the user UI consumes. */
export function applyPublicProfile(base, published) {
  const rates = fallbackRates(base.id)
  const years = parseInt(base.experience, 10)
  const merged = {
    ...base,
    photo: '',
    profileImage: rates.profileImage || '',
    expertise: String(base.type || '').split(',').map((item) => item.trim()).filter(Boolean),
    consultationStyle: [],
    guidanceAreas: [],
    credentials: [],
    services: [],
    approach: '',
    expectations: '',
    tagline: rates.tagline || '',
    chatRate: rates.chatRate ?? null,
    callRate: rates.callRate ?? null,
    chatEnabled: true,
    voiceEnabled: true,
    acceptingConsultations: true,
    ratingValue: Number(String(base.rating || '').split('/')[0]) || null,
    reviewCount: Number(String(base.reviews || '').replace(/[^0-9]/g, '')) || 0,
    visible: true,
    yearsOfExperience: Number.isFinite(years) ? String(years) : '',
  }
  if (!published) return merged
  merged.visible = published.visibility === 'Visible'
  if (filled(published.name)) merged.name = published.name
  if (published.photo) merged.photo = published.photo
  if (filled(published.primarySystem)) merged.specialization = published.primarySystem
  if (filled(published.yearsOfExperience)) {
    merged.yearsOfExperience = String(published.yearsOfExperience)
    merged.experience = `${published.yearsOfExperience} ${Number(published.yearsOfExperience) === 1 ? 'year' : 'years'}`
  }
  if (published.expertise?.length) {
    merged.expertise = published.expertise
    merged.type = published.expertise.join(', ')
  }
  if (published.languages?.length) {
    const primary = published.primaryLanguage
    merged.languages = primary ? [primary, ...published.languages.filter((item) => item !== primary)] : published.languages
  }
  if (filled(published.bio)) merged.bio = published.bio
  if (filled(published.tagline)) merged.tagline = published.tagline
  merged.approach = published.approach || ''
  merged.expectations = published.expectations || ''
  merged.consultationStyle = published.consultationStyle || []
  merged.guidanceAreas = published.guidanceAreas || []
  merged.credentials = published.credentials || []
  merged.services = published.services || []
  merged.chatEnabled = published.chatEnabled
  merged.voiceEnabled = published.voiceEnabled
  if (published.chatRate) merged.chatRate = published.chatRate
  if (published.callRate) merged.callRate = published.callRate
  merged.acceptingConsultations = published.acceptingConsultations
  merged.availability = published.isOnline ? 'Online' : 'Offline'
  merged.hasAvailability = published.hasAvailability
  return merged
}

export function getPublicAstrologer(id) {
  const base = mockAstrologers.find((item) => item.id === id)
  return base ? applyPublicProfile(base, readPublicProfile(id)) : null
}

/** Every astrologer users may see: the visibility rule is applied here, once. */
export function getPublicAstrologers() {
  return mockAstrologers.map((item) => applyPublicProfile(item, readPublicProfile(item.id))).filter((item) => item.visible)
}

export function getPublicAstrologersByIds(ids) {
  const wanted = new Set(ids)
  return getPublicAstrologers().filter((item) => wanted.has(item.id))
}

/** Lowest enabled per-minute price, used as the card's headline rate. */
export function getStartingRate(astrologer) {
  const rates = [
    astrologer.chatEnabled !== false && astrologer.chatRate,
    astrologer.voiceEnabled !== false && astrologer.callRate,
  ].filter((rate) => Number(rate) > 0).map(Number)
  return rates.length ? Math.min(...rates) : null
}

/** Resolves any list of base astrologer records (e.g. suggestions) to their public form, dropping hidden ones. */
export function resolvePublicAstrologers(list) {
  return list.map((item) => applyPublicProfile(item, readPublicProfile(item.id))).filter((item) => item.visible)
}
