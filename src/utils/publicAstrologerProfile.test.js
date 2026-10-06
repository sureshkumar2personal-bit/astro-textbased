import { describe, expect, it } from 'vitest'
import { createDefaultProfile } from './astrologerProfile.js'
import { applyPublicProfile, buildPublicProfile } from './publicAstrologerProfile.js'
import { mockAstrologers } from '../data/notificationData.js'

const profile = () => ({
  ...createDefaultProfile({ name: 'Dr. Rani', phone: '+91 99999 11111', email: 'rani@example.com' }),
  displayName: 'Dr. Rani K', yearsOfExperience: '9', primarySystem: 'KP Astrology', expertise: ['Vastu'], languages: ['Tamil'], primaryLanguage: 'Tamil',
  credentials: [
    { id: 'a', name: 'Approved', institution: 'Inst', year: '2015', verificationStatus: 'Verified', document: 'private.pdf', number: '123' },
    { id: 'b', name: 'Pending one', institution: 'Inst', year: '2020', verificationStatus: 'Pending' },
  ],
})

describe('public astrologer profile', () => {
  it('exposes only approved credentials and no private data', () => {
    const data = buildPublicProfile(profile(), { astrologerId: 'astrologer-demo' })
    expect(data.credentials.map((item) => item.id)).toEqual(['a'])
    const json = JSON.stringify(data)
    ;['99999', 'rani@example.com', 'private.pdf', '123', 'Pending one'].forEach((secret) => expect(json).not.toContain(secret))
  })

  it('overrides the base record and hides the astrologer when visibility is off', () => {
    const base = mockAstrologers[0]
    const shown = applyPublicProfile(base, buildPublicProfile(profile(), { astrologerId: base.id, isOnline: false }))
    expect(shown).toMatchObject({ name: 'Dr. Rani K', specialization: 'KP Astrology', experience: '9 years', availability: 'Offline', visible: true })
    const hidden = applyPublicProfile(base, buildPublicProfile({ ...profile(), showInExplore: false }, { astrologerId: base.id }))
    expect(hidden.visible).toBe(false)
    expect(applyPublicProfile(base, buildPublicProfile({ ...profile(), visibility: 'Suspended' }, { astrologerId: base.id })).visible).toBe(false)
  })
})
