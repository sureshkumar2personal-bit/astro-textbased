// Pure selectors for the Admin -> Admin & Audit module.
//
// Merges the two activity sources the app already records. Neither source is
// an admin log: the editor audit and the astrologer activity log both describe
// actions taken by astrologers and their assistants. This application has no
// admin write path, so no admin actions exist to record and none are invented.
//
// Timestamps are read only from the fields the records already carry. No audit
// history is reconstructed from other created/updated fields.

export const AUDIT_SOURCE_EDITOR = 'editor-audit'
export const AUDIT_SOURCE_ASTROLOGER = 'astrologer-activity'

// Any entry whose actor is an admin role would be a genuine admin record. The
// editor audit entry has no role field, so this deliberately matches nothing
// rather than guessing an actor's role from an id.
export function isAdminActivity(entry) {
  return entry?.actorRole === 'admin'
}

function normalizeEditorAuditEntry(entry) {
  return {
    key: `editor-${entry.id}`,
    id: entry.id,
    source: AUDIT_SOURCE_EDITOR,
    sourceLabel: 'Editor audit',
    occurredAt: entry.occurredAt || '',
    module: entry.module || '',
    actor: entry.editorName || entry.editorId || '',
    action: entry.action || '',
    details: entry.details || '',
  }
}

function normalizeAstrologerActivityEntry(entry) {
  return {
    key: `astrologer-${entry.id}`,
    id: entry.id,
    source: AUDIT_SOURCE_ASTROLOGER,
    sourceLabel: 'Astrologer activity',
    occurredAt: entry.createdAt || '',
    // The astrologer activity log has no `module` field. Its own `kind` and
    // `type` are kept as they are and are NOT mapped onto module.
    module: '',
    kind: entry.kind || '',
    type: entry.type || '',
    actor: entry.customerName || entry.astrologerId || '',
    action: entry.title || '',
    details: entry.description || '',
    relatedId: entry.relatedId || '',
  }
}

function toTime(value) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

// Newest first, which is the order both sources already store in.
export function mergeActivity(audit = [], activityLog = []) {
  return [
    ...(Array.isArray(audit) ? audit : []).map(normalizeEditorAuditEntry),
    ...(Array.isArray(activityLog) ? activityLog : []).map(normalizeAstrologerActivityEntry),
  ]
    .filter((entry) => entry.occurredAt)
    .sort((a, b) => toTime(b.occurredAt) - toTime(a.occurredAt))
}

// Only the editor audit records carry a `module`, so the filter is built from
// those values alone and never from the astrologer log's `kind`.
export function selectAuditModuleFilters(activity) {
  const modules = new Set()
  for (const entry of Array.isArray(activity) ? activity : []) {
    if (entry.module) modules.add(entry.module)
  }
  return ['All', ...Array.from(modules).sort((a, b) => a.localeCompare(b))]
}

export function matchesActivityQuery(entry, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  const fields = [entry.action, entry.details, entry.actor, entry.module, entry.type, entry.id]
  return fields.some((field) => String(field || '').toLowerCase().includes(search))
}

export function filterAuditActivity(activity, { query = '', module = 'All' } = {}) {
  return (Array.isArray(activity) ? activity : []).filter((entry) => {
    if (module && module !== 'All' && entry.module !== module) return false
    if (!matchesActivityQuery(entry, query)) return false
    return true
  })
}

// Approval records are a stateful queue, not chronological events, so they are
// surfaced separately and never merged into the activity feed.
export function summariseApprovals(approvals) {
  const list = Array.isArray(approvals) ? approvals : []
  return {
    total: list.length,
    pending: list.filter((item) => String(item.status || '').toLowerCase() === 'pending').length,
    rows: list,
  }
}
