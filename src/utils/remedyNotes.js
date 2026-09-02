export const REMEDY_NOTE_FIELDS = [
  { key: 'summary', label: 'Remedy summary', type: 'textarea', required: true, placeholder: 'Summarize the guidance in one clear note.' },
  { key: 'day', label: 'Program day', type: 'text', required: true, placeholder: 'Friday' },
  { key: 'hour', label: 'Program hour', type: 'time', required: true, placeholder: '06:30' },
  { key: 'place', label: 'Place', type: 'text', required: true, placeholder: 'Temple, home, or a specific location' },
  { key: 'god', label: 'God / deity', type: 'text', required: true, placeholder: 'Lord Shiva, Ganesha, etc.' },
  { key: 'things', label: 'Things to keep', type: 'textarea', required: true, placeholder: 'List the items, flowers, or offerings to use.' },
  { key: 'poojas', label: 'Do poojas', type: 'textarea', required: true, placeholder: 'Write the pooja or ritual steps to follow.' },
  { key: 'extraNotes', label: 'Additional notes', type: 'textarea', required: false, placeholder: 'Optional extra guidance.' },
]

export function createEmptyRemedyNotes() {
  return REMEDY_NOTE_FIELDS.reduce((acc, field) => {
    acc[field.key] = ''
    return acc
  }, {})
}

function normalizeValue(value) {
  return String(value || '').trim()
}

export function normalizeRemedyNotes(notes = {}) {
  return REMEDY_NOTE_FIELDS.reduce((acc, field) => {
    acc[field.key] = normalizeValue(notes[field.key])
    return acc
  }, {})
}

export function formatRemedyHour(value) {
  const text = normalizeValue(value)
  if (!text) return ''
  const [hoursText, minutesText] = text.split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return text
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date)
}
