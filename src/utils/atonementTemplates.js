// "Saved" atonement content: the records the astrologer saved on the Atonement page, as offered by every
// "Attach → Saved" flow (call end, question answer). One reader, so each flow shows exactly the same list.
export const COMPLETION_PERIODS = [1, 3, 5, 7, 15, 21, 30]

export function readSavedAtonementContent(astrologerUserId) {
  if (typeof window === 'undefined') return []
  try {
    const records = JSON.parse(window.localStorage.getItem(`astroconnect:atonement:${astrologerUserId || 'guest'}:records`) || '[]')
    return records.map((record) => {
      const form = record.form || {}
      const item = form.attachment || form.content || {}
      const type = item.type || (item.url ? 'Link' : item.name ? (item.mimeType?.startsWith('image/') ? 'Image' : 'PDF') : 'Text')
      return { id: record.id, name: item.name || form.name || 'Untitled Atonement', type, date: record.updatedAt || record.createdAt, preview: item.preview || item.dataUrl || '', url: item.url || '', content: form }
    })
  } catch {
    return []
  }
}

export function defaultCompletionDays(item) {
  const days = Number.parseInt(String(item?.content?.duration || '').match(/\d+/)?.[0] || '', 10)
  return Number.isFinite(days) && days > 0 ? days : 7
}

// Payload for assignAtonementFromQuestion: references the saved record (templateId), no copy is stored.
export function buildRecommendation(item, days) {
  if (!item) return null
  return {
    templateId: item.id,
    title: item.name,
    content: item.content || {},
    completionDays: Number(days) || defaultCompletionDays(item),
    startAt: new Date().toISOString(),
  }
}
