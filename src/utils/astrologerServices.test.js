import { describe, expect, it } from 'vitest'
import { getEffectiveAstrologerServices } from '../state/AppDataContext.jsx'

describe('getEffectiveAstrologerServices', () => {
  it('exposes enabled services while online', () => {
    expect(getEffectiveAstrologerServices({
      isOnline: true,
      callEnabled: true,
      chatEnabled: false,
      callPricePerMinute: 30,
      chatPricePerMinute: 20,
    })).toMatchObject({
      available: true,
      callAvailable: true,
      chatAvailable: false,
      callPricePerMinute: 30,
      chatPricePerMinute: 20,
    })
  })

  it('makes every service unavailable while Dyan/DND is active', () => {
    expect(getEffectiveAstrologerServices({
      isOnline: true,
      callEnabled: true,
      chatEnabled: true,
      dndEnabled: true,
    })).toMatchObject({
      dndEnabled: true,
      available: false,
      callAvailable: false,
      chatAvailable: false,
    })
  })

  it('keeps services unavailable while offline', () => {
    expect(getEffectiveAstrologerServices({
      isOnline: false,
      callEnabled: true,
      chatEnabled: true,
    })).toMatchObject({
      available: false,
      callAvailable: false,
      chatAvailable: false,
    })
  })
})
