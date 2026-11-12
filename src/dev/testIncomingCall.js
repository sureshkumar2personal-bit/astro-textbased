// TEMPORARY, development-only. Seeds one flagged test request into the existing instant-consultation
// store so the real Live Consultation Request Queue shows a card and the real Accept Call handler
// opens the real workspace. It never touches the wallet or payments, and it only ever creates,
// replaces or removes records flagged `isTestRequest`.
import { createInstantConsultation, getInstantConsultations, updateInstantConsultation, INSTANT_CONSULTATION_STORAGE_KEY } from '../utils/instantConsultation.js'

const TEST_USER_ID = 'user-demo'
const ASTROLOGER_ID = 'astrologer-demo'
const RING_MS = 60 * 1000 // matches INCOMING_CALL_TIMEOUT_MS in Dashboard.jsx

const readUsers = () => {
  try { return JSON.parse(window.localStorage.getItem('astroconnect-auth-users') || '[]') } catch { return [] }
}

const isTest = (request) => request?.isTestRequest === true

function readRaw() {
  try { return JSON.parse(window.localStorage.getItem(INSTANT_CONSULTATION_STORAGE_KEY) || '[]') } catch { return [] }
}

/** Removes only the flagged test records. Returns how many were removed. */
export function clearTestIncomingCall() {
  const all = readRaw()
  const kept = all.filter((request) => !isTest(request))
  if (kept.length !== all.length) {
    window.localStorage.setItem(INSTANT_CONSULTATION_STORAGE_KEY, JSON.stringify(kept))
    window.dispatchEvent(new CustomEvent('astroconnect:instant-consultation', { detail: kept }))
  }
  return all.length - kept.length
}

/** Seeds one ringing test call for the astrologer unless a live test request already exists. */
export function seedTestIncomingCall(astrologerId) {
  if (astrologerId !== ASTROLOGER_ID) return null
  const live = getInstantConsultations().find((request) => isTest(request) && (request.status === 'accepted' || (request.status === 'ringing' && Date.now() - new Date(request.createdAt).getTime() < RING_MS)))
  if (live) return live
  clearTestIncomingCall() // drop finished/expired test records so history stays clean

  const user = readUsers().find((entry) => entry.id === TEST_USER_ID)
  if (!user) return null
  const created = createInstantConsultation({
    type: 'call',
    userId: user.id,
    userName: user.name,
    astrologerId,
    astrologerName: 'Dr. Rani',
    durationMinutes: 10,
    userPhone: user.phone,
    language: user.languages?.[0],
    topic: 'Marriage timing',
    userAvatar: user.avatar || user.photo || user.profileImage || '',
    // The test user's own saved birth details and coordinates (nothing is guessed).
    birthDetails: {
      name: user.name, gender: user.gender, place: user.birthPlace, dob: user.dateOfBirth, time: user.birthTime,
      latitude: Number(user.latitude), longitude: Number(user.longitude), timezone: user.timezone, coordsPlace: user.birthPlace,
      // Labeled test partner so the Partner Chart can be inspected.
      partner: { name: 'Test Partner', dob: '1993-08-21', time: '10:30', place: 'Salem, Tamil Nadu, India' },
    },
  })
  // Flag it as test data. Nothing was debited: createInstantConsultation is a pure record write.
  return updateInstantConsultation(created.id, { isTestRequest: true, paymentMethod: 'TEST – no payment', amountPaid: 0, transactionId: `TEST-${created.id.slice(0, 8)}` })
}

if (typeof window !== 'undefined') window.clearTestIncomingCall = clearTestIncomingCall
