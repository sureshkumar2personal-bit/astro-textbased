import { useEffect, useState } from 'react'
import { consultationAstrologers } from '../data/consultationAstrologers.js'

// Prices are saved per astrologer from Consultation → Pricing and read by every user-side surface.
export const CONSULTATION_PRICING_STORAGE_KEY = 'astroconnect-consultation-pricing'
const PRICING_EVENT = 'astroconnect:consultation-pricing'
// Earlier builds kept one global price set in the shared astrologerServices store (demo astrologer only).
export const ASTROLOGER_SERVICES_STORAGE_KEY = 'astroconnect-astrologer-services'
const LEGACY_SERVICES_OWNER_ID = 'astrologer-demo'

const readJson = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || 'null')
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}
const validPrice = (value) => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) > 0

export function saveConsultationPricing(astrologerId, { call, chat }) {
  const all = readJson(CONSULTATION_PRICING_STORAGE_KEY) || {}
  all[astrologerId] = { call: Number(call), chat: Number(chat) }
  try { window.localStorage.setItem(CONSULTATION_PRICING_STORAGE_KEY, JSON.stringify(all)) } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(PRICING_EVENT))
}

/** Saved per-minute price for one astrologer and kind ('call' | 'chat'), or null when none was saved. */
export function getSavedRate(astrologerId, type) {
  if (typeof window === 'undefined') return null
  const kind = type === 'chat' ? 'chat' : 'call'
  const saved = readJson(CONSULTATION_PRICING_STORAGE_KEY)?.[astrologerId]?.[kind]
  if (validPrice(saved)) return Number(saved)
  if (astrologerId === LEGACY_SERVICES_OWNER_ID) {
    const legacy = readJson(ASTROLOGER_SERVICES_STORAGE_KEY)?.[`${kind}PricePerMinute`]
    if (validPrice(legacy)) return Number(legacy)
  }
  return null
}

/** Per-minute price for an instant session: the astrologer's saved price, else the directory rate. */
export function getInstantRate(astrologerId, type) {
  const saved = getSavedRate(astrologerId, type)
  if (saved != null) return saved
  const profile = consultationAstrologers.find((item) => item.id === astrologerId)
  return Number(type === 'chat' ? profile?.chatRate : profile?.callRate) || 0
}

/** Copy of an astrologer record whose callRate/chatRate reflect the astrologer's saved prices. */
export function withSavedRates(astrologer) {
  if (!astrologer) return astrologer
  const call = getSavedRate(astrologer.id, 'call')
  const chat = getSavedRate(astrologer.id, 'chat')
  if (call == null && chat == null) return astrologer
  return { ...astrologer, callRate: call ?? astrologer.callRate, chatRate: chat ?? astrologer.chatRate }
}

/** Re-renders the caller whenever pricing is saved (this tab or another). */
export function usePricingVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const bump = () => setVersion((value) => value + 1)
    window.addEventListener(PRICING_EVENT, bump)
    window.addEventListener('storage', bump)
    return () => { window.removeEventListener(PRICING_EVENT, bump); window.removeEventListener('storage', bump) }
  }, [])
  return version
}

export const calculateInstantAmount = (durationMinutes, pricePerMinute) =>
  Math.round((Number(durationMinutes) || 0) * (Number(pricePerMinute) || 0))
