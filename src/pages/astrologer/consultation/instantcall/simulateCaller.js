import { createInstantConsultation, updateInstantConsultation } from '../../../../utils/instantConsultation.js'
import { SIMULATED_CALLERS, nextSimulatedCaller } from '../../../../utils/instantCallConsole.js'

/** Queues one demo caller. Flagged so it is never synced, never expires and is never mistaken for a paid request. */
export function queueCaller(caller, astrologerId, astrologerName) {
  const created = createInstantConsultation({
    type: 'call', userId: caller.userId, userName: caller.userName, astrologerId, astrologerName: astrologerName || 'Astrologer',
    durationMinutes: caller.durationMinutes, language: caller.language, topic: caller.topic, birthDetails: caller.birthDetails,
  })
  const patch = { isSimulated: true, walletBalance: caller.walletBalance, paymentMethod: 'SIMULATED – no payment', amountPaid: 0, transactionId: `SIM-${created.id.slice(0, 8)}` }
  // Seeded callers look like they have already been waiting a few seconds, in a fixed order.
  if (caller.queuedSecondsAgo) patch.createdAt = new Date(Date.now() - caller.queuedSecondsAgo * 1000).toISOString()
  // No wallet or payment is touched: createInstantConsultation is a plain record write.
  return updateInstantConsultation(created.id, patch)
}

/** Adds the next demo caller that is not already in use; returns null when every demo caller is already queued. */
export function addSimulatedCaller(astrologerId, astrologerName, inUseUserIds) {
  const caller = nextSimulatedCaller(inUseUserIds)
  return caller ? queueCaller(caller, astrologerId, astrologerName) : null
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
