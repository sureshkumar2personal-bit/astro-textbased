import { describe, expect, it } from 'vitest'
import {
  HOROSCOPE_MODE_NONE,
  HOROSCOPE_MODE_SAVED,
  HOROSCOPE_MODE_UPLOAD,
  HOROSCOPE_SOURCE_NONE,
  HOROSCOPE_SOURCE_SAVED,
  HOROSCOPE_SOURCE_UPLOAD,
  buildQuestionHoroscope,
  getDefaultHoroscopeMode,
  getSavedHoroscopeLabel,
  getSavedHoroscopeSummary,
  readSavedHoroscope,
  validateHoroscopeSelection,
} from './horoscope.js'

const USER = { id: 'user-demo', name: 'Priya V.', email: 'user@astroconnect.com' }

function storageWith(value) {
  return { getItem: () => (value == null ? null : JSON.stringify(value)) }
}

describe('reading the saved horoscope (reuses the existing profile data)', () => {
  it('reports nothing saved when birth details are missing', () => {
    const saved = readSavedHoroscope({ ...USER, dateOfBirth: '', birthTime: '' }, storageWith(null))
    expect(saved.exists).toBe(false)
  })

  it('reads the auth user when there is no storage mirror', () => {
    const saved = readSavedHoroscope({ ...USER, dateOfBirth: '1995-03-12', birthTime: '06:45 AM', birthPlace: 'Chennai', rasi: 'Meenam', nakshatra: 'Revathi', lagna: 'Meena Lagna', horoscopeDetails: 'Notes' }, storageWith(null))
    expect(saved.exists).toBe(true)
    expect(saved).toMatchObject({
      dateOfBirth: '1995-03-12',
      timeOfBirth: '06:45 AM',
      placeOfBirth: 'Chennai',
      rasi: 'Meenam',
      nakshatra: 'Revathi',
      lagna: 'Meena Lagna',
      horoscopeDetails: 'Notes',
      reference: 'profile:user-demo',
    })
  })

  it('prefers the storage mirror, with the short-key aliases the app already writes', () => {
    const saved = readSavedHoroscope(
      { ...USER, dateOfBirth: '1990-01-01', birthTime: '01:00 AM', birthPlace: 'Old' },
      storageWith({ name: 'Priya V.', dateOfBirth: '1995-03-12', time: '06:45 AM', place: 'Chennai' }),
    )
    expect(saved).toMatchObject({ dateOfBirth: '1995-03-12', timeOfBirth: '06:45 AM', placeOfBirth: 'Chennai' })
  })

  it('labels it with the owner name for the UI', () => {
    const saved = readSavedHoroscope({ ...USER, dateOfBirth: '1995-03-12', birthTime: '06:45 AM', birthPlace: 'Chennai', rasi: 'Meenam' }, storageWith(null))
    expect(getSavedHoroscopeLabel(saved)).toBe("Priya's Saved Horoscope")
    expect(getSavedHoroscopeSummary(saved)).toBe('1995-03-12 · 06:45 AM · Chennai · Meenam')
    expect(getSavedHoroscopeSummary({ exists: false })).toBe('')
  })
})

describe('horoscope stays optional', () => {
  it('defaults a General question to no horoscope', () => {
    const saved = { exists: true }
    expect(getDefaultHoroscopeMode({ questionType: 'General Question', savedHoroscope: saved })).toBe(HOROSCOPE_MODE_NONE)
  })

  it('pre-selects the saved horoscope for a Personal question when one exists', () => {
    expect(getDefaultHoroscopeMode({ questionType: 'Individual (Personal) Question', savedHoroscope: { exists: true } })).toBe(HOROSCOPE_MODE_SAVED)
  })

  it('never pre-selects a saved horoscope that does not exist', () => {
    expect(getDefaultHoroscopeMode({ questionType: 'Individual (Personal) Question', savedHoroscope: { exists: false } })).toBe(HOROSCOPE_MODE_NONE)
    expect(getDefaultHoroscopeMode({ questionType: 'Individual (Personal) Question', savedHoroscope: null })).toBe(HOROSCOPE_MODE_NONE)
  })

  it('accepts a submission with no horoscope at all', () => {
    expect(validateHoroscopeSelection({ mode: HOROSCOPE_MODE_NONE, savedHoroscope: { exists: false }, uploadedFile: null })).toBe('')
    expect(validateHoroscopeSelection({ mode: HOROSCOPE_MODE_NONE, savedHoroscope: { exists: true }, uploadedFile: null })).toBe('')
  })
})

describe('horoscope validation only blocks an impossible choice', () => {
  it('rejects picking the saved horoscope when nothing is saved', () => {
    const error = validateHoroscopeSelection({ mode: HOROSCOPE_MODE_SAVED, savedHoroscope: { exists: false }, uploadedFile: null })
    expect(error).toMatch(/No saved horoscope/)
  })

  it('accepts the saved horoscope when it exists', () => {
    expect(validateHoroscopeSelection({ mode: HOROSCOPE_MODE_SAVED, savedHoroscope: { exists: true }, uploadedFile: null })).toBe('')
  })

  it('rejects choosing upload without picking a file', () => {
    expect(validateHoroscopeSelection({ mode: HOROSCOPE_MODE_UPLOAD, savedHoroscope: { exists: true }, uploadedFile: null })).toMatch(/Choose a horoscope file/)
    expect(validateHoroscopeSelection({
      mode: HOROSCOPE_MODE_UPLOAD,
      savedHoroscope: { exists: false },
      uploadedFile: { name: 'BirthChart.pdf', kind: 'pdf', size: 10, type: 'application/pdf', dataUrl: 'data:application/pdf;base64,x' },
    })).toBe('')
  })
})

describe('what the submitted question carries', () => {
  const savedHoroscope = {
    exists: true,
    reference: 'profile:user-demo',
    name: 'Priya V.',
    dateOfBirth: '1995-03-12',
    timeOfBirth: '06:45 AM',
    placeOfBirth: 'Chennai',
    rasi: 'Meenam',
    nakshatra: 'Revathi',
    lagna: 'Meena Lagna',
    horoscopeDetails: 'Notes',
  }

  it('references the saved horoscope instead of duplicating a file', () => {
    const result = buildQuestionHoroscope({ mode: HOROSCOPE_MODE_SAVED, savedHoroscope, uploadedFile: null, userId: 'user-demo' })
    expect(result).toMatchObject({
      horoscopeMode: HOROSCOPE_MODE_SAVED,
      horoscopeSource: HOROSCOPE_SOURCE_SAVED,
      horoscopeReference: 'profile:user-demo',
      horoscopeAttachment: null,
      attachmentNames: [],
    })
    // The birth details go to the `customer` field the astrologer view already reads.
    expect(result.customer).toEqual({
      id: 'user-demo',
      name: 'Priya V.',
      dateOfBirth: '1995-03-12',
      timeOfBirth: '06:45 AM',
      birthPlace: 'Chennai',
      rasi: 'Meenam',
      nakshatra: 'Revathi',
      lagna: 'Meena Lagna',
      horoscopeDetails: 'Notes',
    })
  })

  it('attaches a new upload using the existing attachment shape', () => {
    const upload = { id: 'h1', kind: 'image', name: 'kundli.png', size: 2048, type: 'image/png', dataUrl: 'data:image/png;base64,x' }
    const result = buildQuestionHoroscope({ mode: HOROSCOPE_MODE_UPLOAD, savedHoroscope, uploadedFile: upload, userId: 'user-demo' })
    expect(result).toMatchObject({
      horoscopeMode: HOROSCOPE_MODE_UPLOAD,
      horoscopeSource: HOROSCOPE_SOURCE_UPLOAD,
      horoscopeReference: 'kundli.png',
      attachmentNames: ['kundli.png'],
      customer: null,
    })
    expect(result.horoscopeAttachment).toEqual(upload)
  })

  it('records no horoscope when the user continues without one', () => {
    const result = buildQuestionHoroscope({ mode: HOROSCOPE_MODE_NONE, savedHoroscope, uploadedFile: null, userId: 'user-demo' })
    expect(result).toMatchObject({
      horoscopeMode: HOROSCOPE_MODE_NONE,
      horoscopeSource: HOROSCOPE_SOURCE_NONE,
      horoscopeReference: null,
      horoscopeAttachment: null,
      attachmentNames: [],
      customer: null,
    })
  })

  it('falls back to no horoscope rather than claiming a missing one', () => {
    const result = buildQuestionHoroscope({ mode: HOROSCOPE_MODE_SAVED, savedHoroscope: { exists: false }, uploadedFile: null, userId: 'user-demo' })
    expect(result.horoscopeMode).toBe(HOROSCOPE_MODE_NONE)
    expect(result.customer).toBe(null)
  })
})