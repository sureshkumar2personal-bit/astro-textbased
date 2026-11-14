// Instant-consultation availability rules. Shared by the browser and the API routes (api/availability.js,
// api/consultations.js) so the dashboard, the customer pages and the server all apply the same priority:
//
//   DND ON                      -> no instant chat, no instant call
//   DND OFF, Chat ON,  Call ON  -> chat and call
//   DND OFF, Chat ON,  Call OFF -> chat only
//   DND OFF, Chat OFF, Call ON  -> call only
//   DND OFF, Chat OFF, Call OFF -> nothing
//
// Only new instant requests are gated. Accepted/active sessions and scheduled appointments are never touched here.

export const DEFAULT_AVAILABILITY = { chatEnabled: true, callEnabled: true, dndEnabled: false }

/** Missing fields keep the defaults (chat and call on, DND off); only an explicit `false` / `true` changes them. */
export function normalizeAvailability(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    chatEnabled: source.chatEnabled !== false,
    callEnabled: source.callEnabled !== false,
    dndEnabled: source.dndEnabled === true,
  }
}

/** { chat, call, reason } where reason explains why a service is off (null when both are on). */
export function instantAvailability(settings) {
  const { chatEnabled, callEnabled, dndEnabled } = normalizeAvailability(settings)
  if (dndEnabled) return { chat: false, call: false, reason: 'dnd' }
  return { chat: chatEnabled, call: callEnabled, reason: chatEnabled && callEnabled ? null : 'service-off' }
}

export const canStartInstant = (settings, type) => {
  const state = instantAvailability(settings)
  return type === 'chat' ? state.chat : type === 'call' ? state.call : false
}

/** Customer-facing explanation for a refused request. */
export function unavailableMessage(settings, type) {
  const noun = type === 'chat' ? 'chat' : 'call'
  if (normalizeAvailability(settings).dndEnabled) return `This astrologer is not taking instant ${noun}s right now.`
  return `This astrologer is not accepting instant ${noun}s right now.`
}

export const UNAVAILABLE_REASON = 'astrologer-unavailable'
