import { createInstantConsultation, updateInstantConsultation } from '../../../../utils/instantConsultation.js'
import { SIMULATED_CALLERS } from '../../../../utils/instantCallConsole.js'

/** Queues the next unused sample seeker as a chat request. Flagged: never synced, never paid, never expires. Returns null when all are in use. */
export function simulateIncomingChat(astrologerId, astrologerName, inUseUserIds) {
  const seeker = SIMULATED_CALLERS.find((caller) => !inUseUserIds.includes(caller.userId))
  if (!seeker) return null
  const created = createInstantConsultation({
    type: 'chat', userId: seeker.userId, userName: seeker.userName, astrologerId, astrologerName: astrologerName || 'Astrologer',
    durationMinutes: seeker.durationMinutes, language: seeker.language, topic: seeker.topic, birthDetails: seeker.birthDetails, bypassAvailability: true,
  })
  // No wallet or payment is touched: createInstantConsultation is a plain record write.
  return updateInstantConsultation(created.id, { isSimulated: true, paymentMethod: 'SIMULATED – no payment', amountPaid: 0, transactionId: `SIM-${created.id.slice(0, 8)}` })
}
