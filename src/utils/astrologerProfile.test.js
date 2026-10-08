import { describe, expect, it } from 'vitest'
import { calculateCompletion, createDefaultProfile, validateCredential, validatePhoto, validateSection } from './astrologerProfile.js'

const today = new Date('2026-10-02T00:00:00')

describe('astrologerProfile validation', () => {
  it('requires names and rejects future dob / bad contact info', () => {
    const profile = { ...createDefaultProfile(), fullName: '', displayName: '', email: 'nope', phone: 'abc', dob: '2030-01-01' }
    const errors = validateSection('basic', profile, today)
    expect(Object.keys(errors).sort()).toEqual(['displayName', 'dob', 'email', 'fullName', 'phone'])
  })

  it('requires experience, system and expertise', () => {
    const errors = validateSection('experience', createDefaultProfile(), today)
    expect(Object.keys(errors).sort()).toEqual(['expertise', 'primarySystem', 'yearsOfExperience'])
    expect(validateSection('experience', { ...createDefaultProfile(), yearsOfExperience: '-1', primarySystem: 'Tarot', expertise: ['Vastu'] }).yearsOfExperience).toBeTruthy()
  })

  it('requires a language and a primary language', () => {
    expect(validateSection('languages', createDefaultProfile()).languages).toBeTruthy()
    expect(validateSection('languages', { ...createDefaultProfile(), languages: ['Tamil'] }).primaryLanguage).toBeTruthy()
    expect(validateSection('languages', { ...createDefaultProfile(), languages: ['Tamil'], primaryLanguage: 'Tamil' })).toEqual({})
  })

  it('rejects negative prices and over-long bios', () => {
    const profile = createDefaultProfile()
    profile.services.video.price = '-5'
    expect(validateSection('pricing', profile)['video.price']).toBeTruthy()
    expect(validateSection('about', { ...profile, bio: 'x'.repeat(1501) }).bio).toBeTruthy()
    expect(validateSection('about', { ...profile, bio: 'x'.repeat(1500) })).toEqual({})
  })

  it('validates credentials and photos', () => {
    expect(validateCredential({ name: '', institution: '', year: '1800' }, today)).toEqual({ name: expect.any(String), institution: expect.any(String), year: expect.any(String) })
    expect(validateCredential({ name: 'Jyotish', institution: 'Guru', year: '2015' }, today)).toEqual({})
    expect(validatePhoto({ type: 'image/gif', size: 10 })).toBeTruthy()
    expect(validatePhoto({ type: 'image/png', size: 3 * 1024 * 1024 })).toBeTruthy()
    expect(validatePhoto({ type: 'image/jpeg', size: 1024 })).toBe('')
  })

  it('computes completion and lists what is missing', () => {
    const empty = calculateCompletion(createDefaultProfile())
    expect(empty.percent).toBe(0)
    const profile = { ...createDefaultProfile({ name: 'Dr. Rani' }), yearsOfExperience: '8', primarySystem: 'Vedic Astrology', expertise: ['Vastu'], languages: ['Tamil'], primaryLanguage: 'Tamil', bio: 'Hi' }
    profile.services.chat.enabled = true
    const result = calculateCompletion(profile, { hasAvailability: true })
    expect(result.missing).toEqual(['Profile Photo', 'Credentials'])
    expect(result.percent).toBe(75)
  })
})
