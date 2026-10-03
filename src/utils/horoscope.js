// Saved horoscope support for the user question form.
//
// The app already stores a user's own horoscope/birth details in one place:
// AuthContext's `currentUser` (authoritative), mirrored to
// localStorage['astroconnect-user-birth-details']. Profile, FullHoroscope and
// MyAccount all read it with the same precedence, and this file reuses that
// precedence instead of adding another horoscope store.
//
// The same definition the horoscope page uses decides whether a saved horoscope
// exists: both a date of birth and a birth time are present.

export const SAVED_HOROSCOPE_STORAGE_KEY = 'astroconnect-user-birth-details'

// Existing values already used on a question record. Kept as-is so no new
// vocabulary is introduced.
export const HOROSCOPE_MODE_SAVED = 'Use Saved Horoscope'
export const HOROSCOPE_MODE_UPLOAD = 'Upload Horoscope'
export const HOROSCOPE_MODE_NONE = 'Continue Without Horoscope'

export const HOROSCOPE_SOURCE_SAVED = 'saved'
export const HOROSCOPE_SOURCE_UPLOAD = 'upload'
export const HOROSCOPE_SOURCE_NONE = 'none'

function readStorageMirror(storage) {
  try {
    const store = storage || (typeof window !== 'undefined' ? window.localStorage : null)
    if (!store) return {}
    return JSON.parse(store.getItem(SAVED_HOROSCOPE_STORAGE_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

// Resolves the saved horoscope exactly the way the profile and horoscope pages
// do: localStorage mirror first (long or short key), then the auth user.
export function readSavedHoroscope(currentUser = null, storage = null) {
  const stored = readStorageMirror(storage)
  const saved = {
    name: stored.name || currentUser?.name || '',
    dateOfBirth: stored.dateOfBirth || stored.dob || currentUser?.dateOfBirth || '',
    timeOfBirth: stored.timeOfBirth || stored.time || currentUser?.birthTime || '',
    placeOfBirth: stored.placeOfBirth || stored.place || currentUser?.birthPlace || '',
    rasi: stored.rasi || currentUser?.rasi || '',
    nakshatra: stored.nakshatra || currentUser?.nakshatra || '',
    lagna: stored.lagna || currentUser?.lagna || '',
    horoscopeDetails: stored.horoscopeDetails || currentUser?.horoscopeDetails || '',
  }

  // Same rule as FullHoroscope's needsBirthDetails.
  const exists = Boolean(saved.dateOfBirth && saved.timeOfBirth)
  return {
    exists,
    // Reference to the existing saved horoscope. The question stores this
    // reference, not a second copy of the chart.
    reference: `profile:${currentUser?.id || 'self'}`,
    ...saved,
  }
}

export function getSavedHoroscopeLabel(saved) {
  const firstName = String(saved?.name || '').trim().split(/\s+/)[0]
  return firstName ? `${firstName}'s Saved Horoscope` : 'Saved Horoscope'
}

export function getSavedHoroscopeSummary(saved) {
  if (!saved?.exists) return ''
  return [saved.dateOfBirth, saved.timeOfBirth, saved.placeOfBirth, saved.rasi]
    .filter(Boolean)
    .join(' · ')
}

// Picks the horoscope mode that should be pre-selected. A General question
// keeps its existing "no horoscope" default, and "Use Saved Horoscope" is never
// pre-selected when there is nothing saved to use - so a question can never
// claim a saved horoscope that does not exist.
export function getDefaultHoroscopeMode({ questionType, savedHoroscope }) {
  const isGeneral = String(questionType || '').startsWith('General')
  if (isGeneral) return HOROSCOPE_MODE_NONE
  return savedHoroscope?.exists ? HOROSCOPE_MODE_SAVED : HOROSCOPE_MODE_NONE
}

// Submit-time validation. Nothing here makes a horoscope mandatory: it only
// rejects a choice the user explicitly made that cannot be fulfilled.
export function validateHoroscopeSelection({ mode, savedHoroscope, uploadedFile }) {
  if (mode === HOROSCOPE_MODE_SAVED) {
    if (!savedHoroscope?.exists) return 'No saved horoscope found. Save your birth details in My Account, or upload a horoscope for this question.'
    return ''
  }
  if (mode === HOROSCOPE_MODE_UPLOAD) {
    if (!uploadedFile) return 'Choose a horoscope file to upload, or continue without a horoscope.'
    return ''
  }
  return ''
}

function describeUpload(uploadedFile) {
  if (!uploadedFile) return null
  return {
    id: uploadedFile.id || `horoscope-${Date.now()}`,
    kind: uploadedFile.kind || 'image',
    name: uploadedFile.name || 'Horoscope',
    size: Number(uploadedFile.size) || 0,
    type: uploadedFile.type || '',
    dataUrl: uploadedFile.dataUrl || '',
  }
}

// Everything the question record needs to identify the horoscope it carries:
//   - a saved horoscope is referenced by its existing profile reference
//   - a new upload keeps the existing attachment object shape used by answer
//     attachments, and its name is added to the record's `attachments` list
export function buildQuestionHoroscope({ mode, savedHoroscope, uploadedFile, userId = '' } = {}) {
  const upload = describeUpload(uploadedFile)

  if (mode === HOROSCOPE_MODE_SAVED && savedHoroscope?.exists) {
    return {
      horoscopeMode: HOROSCOPE_MODE_SAVED,
      horoscopeSource: HOROSCOPE_SOURCE_SAVED,
      horoscopeReference: savedHoroscope.reference || `profile:${userId || 'self'}`,
      horoscopeAttachment: null,
      attachmentNames: [],
      customer: {
        id: userId || '',
        name: savedHoroscope.name || '',
        dateOfBirth: savedHoroscope.dateOfBirth || '',
        timeOfBirth: savedHoroscope.timeOfBirth || '',
        birthPlace: savedHoroscope.placeOfBirth || '',
        rasi: savedHoroscope.rasi || '',
        nakshatra: savedHoroscope.nakshatra || '',
        lagna: savedHoroscope.lagna || '',
        horoscopeDetails: savedHoroscope.horoscopeDetails || '',
      },
    }
  }

  if (mode === HOROSCOPE_MODE_UPLOAD && upload) {
    return {
      horoscopeMode: HOROSCOPE_MODE_UPLOAD,
      horoscopeSource: HOROSCOPE_SOURCE_UPLOAD,
      horoscopeReference: upload.name,
      horoscopeAttachment: upload,
      attachmentNames: [upload.name],
      customer: null,
    }
  }

  return {
    horoscopeMode: HOROSCOPE_MODE_NONE,
    horoscopeSource: HOROSCOPE_SOURCE_NONE,
    horoscopeReference: null,
    horoscopeAttachment: null,
    attachmentNames: [],
    customer: null,
  }
}