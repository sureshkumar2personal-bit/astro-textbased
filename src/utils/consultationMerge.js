// Shared by the browser (src/utils/instantConsultation.js) and the API route (api/consultations.js).

/** Local-only records are never synced: built-in demo history and flagged dev test requests. */
export function isSyncable(request) {
  if (!request || typeof request.id !== 'string' || !request.id) return false
  if (request.isTestRequest === true) return false
  if (request.id.startsWith('instant-demo-')) return false
  if (/^instant-(call|chat)-2026-\d{3}$/.test(request.id)) return false
  return true
}

function mergeMessages(a = [], b = []) {
  const seen = new Set()
  return [...a, ...b]
    .filter((message) => message?.id && !seen.has(message.id) && seen.add(message.id))
    .sort((x, y) => new Date(x.sentAt) - new Date(y.sentAt))
}

const time = (request) => new Date(request?.updatedAt || request?.createdAt || 0).getTime() || 0

/** Newest `updatedAt` wins for fields; messages are always unioned by id so none are lost. */
export function mergeRequest(current, incoming) {
  if (!current) return incoming
  if (!incoming) return current
  const winner = time(incoming) >= time(current) ? incoming : current
  const loser = winner === incoming ? current : incoming
  if (!loser.messages?.length && !winner.messages?.length) return winner
  return { ...winner, messages: mergeMessages(loser.messages, winner.messages) }
}

/** Merges two lists by id. Returns the merged list and whether it differs from `local`. */
export function mergeLists(local, remote) {
  const byId = new Map(local.map((request) => [request.id, request]))
  let changed = false
  for (const incoming of remote) {
    if (!isSyncable(incoming)) continue
    const current = byId.get(incoming.id)
    const merged = mergeRequest(current, incoming)
    if (!current || JSON.stringify(merged) !== JSON.stringify(current)) changed = true
    byId.set(incoming.id, merged)
  }
  return { merged: changed ? [...byId.values()].sort((a, b) => time(b) - time(a) || 0) : local, changed }
}
