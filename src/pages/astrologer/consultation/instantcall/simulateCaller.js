import { createInstantConsultation, updateInstantConsultation } from '../../../../utils/instantConsultation.js'
import { SIMULATED_CALLERS, headOfQueueTime, nextSimulatedCaller } from '../../../../utils/instantCallConsole.js'

/** Queues one demo caller. Flagged so it is never synced, never expires and is never mistaken for a paid request. */
export function queueCaller(caller, astrologerId, astrologerName) {
  const created = createInstantConsultation({
    type: 'call', userId: caller.userId, userName: caller.userName, astrologerId, astrologerName: astrologerName || 'Astrologer',
    durationMinutes: caller.durationMinutes, language: caller.language, topic: caller.topic, birthDetails: caller.birthDetails, bypassAvailability: true,
  })
  const patch = { isSimulated: true, walletBalance: caller.walletBalance, paymentMethod: 'SIMULATED – no payment', amountPaid: 0, transactionId: `SIM-${created.id.slice(0, 8)}` }
  // Seeded callers look like they have already been waiting a few seconds, in a fixed order.
  if (caller.queuedSecondsAgo) patch.createdAt = new Date(Date.now() - caller.queuedSecondsAgo * 1000).toISOString()
  // No wallet or payment is touched: createInstantConsultation is a plain record write.
  return updateInstantConsultation(created.id, patch)
}

/**
 * "Simulate Incoming Call": the next unused sample caller rings now, as the incoming call (whoever was ringing goes back
 * to the front of the waiting queue). Returns the request, or null when every sample caller is already in use.
 */
export function simulateIncomingCall(astrologerId, astrologerName, waiting, inUseUserIds) {
  const caller = nextSimulatedCaller(inUseUserIds)
  if (!caller) return null
  const request = queueCaller({ ...caller, queuedSecondsAgo: 0 }, astrologerId, astrologerName)
  // Ordered ahead of the others, but its own waiting timer starts now (not at the older request's time).
  return updateInstantConsultation(request.id, { createdAt: headOfQueueTime(waiting), waitFrom: new Date().toISOString() })
}

/** First visit: Arjun K. (ringing) plus Sneha M. and Vikram R. waiting behind. */
export function seedDefaultQueue(astrologerId, astrologerName) {
  SIMULATED_CALLERS.filter((caller) => caller.queuedSecondsAgo).forEach((caller) => queueCaller(caller, astrologerId, astrologerName))
}

// The demo shows the queue the first time the console opens in a browser session.
const SEEDED_FLAG = 'astroconnect-icc-default-queue'
export const defaultCallerEnabled = () => import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE !== 'false'
export function claimDefaultCallerSeed() {
  try {
    if (window.sessionStorage.getItem(SEEDED_FLAG) === '1') return false
    window.sessionStorage.setItem(SEEDED_FLAG, '1')
  } catch { /* storage unavailable: fall through and seed once per mount */ }
  return true
}
