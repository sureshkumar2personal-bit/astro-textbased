// Demo/dev only (also runs on the Vercel demo host; see docs/DEMO_DEPLOYMENT.md). Seeds one flagged test request into the existing instant-consultation
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

const WAITING_DEMO_USERS = [
  { id: 'test-waiting-anitha', name: 'Anitha R.', birth: { gender: 'Female', dob: '1992-04-18', time: '07:20', place: 'Madurai, Tamil Nadu, India', latitude: 9.9252, longitude: 78.1198, timezone: 'Asia/Kolkata' } },
  { id: 'test-waiting-divya', name: 'Divya M.', birth: { gender: 'Female', dob: '1996-11-03', time: '21:10', place: 'Coimbatore, Tamil Nadu, India', latitude: 11.0168, longitude: 76.9558, timezone: 'Asia/Kolkata' } },
  { id: 'test-waiting-kumar', name: 'Kumar S.', birth: { gender: 'Male', dob: '1989-09-27', time: '05:45', place: 'Chennai, Tamil Nadu, India', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' } },
]

/** Keeps a few flagged chat requests ringing so the "Users Waiting to Connect" banner shows in the live workspace. */
function seedWaitingUsers(astrologerId) {
  const live = getInstantConsultations().filter((request) => isTest(request) && request.type === 'chat' && request.status === 'ringing')
  WAITING_DEMO_USERS.forEach((user) => {
    if (live.some((request) => request.userId === user.id)) return
    const created = createInstantConsultation({ type: 'chat', userId: user.id, userName: user.name, astrologerId, astrologerName: 'Dr. Rani', durationMinutes: 10, language: 'Tamil', topic: 'Career guidance', birthDetails: { name: user.name, ...user.birth, coordsPlace: user.birth.place }, bypassAvailability: true })
    updateInstantConsultation(created.id, { isTestRequest: true, paymentMethod: 'TEST – no payment', amountPaid: 0, transactionId: `TEST-${created.id.slice(0, 8)}` })
  })
}

/** Seeds one ringing test call for the astrologer unless a live test request already exists. */
export function seedTestIncomingCall(astrologerId) {
  if (astrologerId !== ASTROLOGER_ID) return null
  const live = getInstantConsultations().find((request) => isTest(request) && (request.status === 'accepted' || (request.status === 'ringing' && Date.now() - new Date(request.createdAt).getTime() < RING_MS)))
  if (live) { seedWaitingUsers(astrologerId); return live }
  clearTestIncomingCall() // drop finished/expired test records so history stays clean

  const user = readUsers().find((entry) => entry.id === TEST_USER_ID)
  if (!user) return null
  const created = createInstantConsultation({
    type: 'call',
    bypassAvailability: true, // demo seed for the astrologer's own dashboard; not a customer request
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
  const flagged = updateInstantConsultation(created.id, { isTestRequest: true, paymentMethod: 'TEST – no payment', amountPaid: 0, transactionId: `TEST-${created.id.slice(0, 8)}` })
  seedWaitingUsers(astrologerId)
  return flagged
}

if (typeof window !== 'undefined') window.clearTestIncomingCall = clearTestIncomingCall
