// Pure helpers behind the astrologer dashboard charts (weekly trend + services mix).
// Everything is derived from the app's existing records; nothing here is sample data.

export const SERVICE_KEYS = ['call', 'chat', 'text', 'atonement']
export const SERVICE_LABELS = { call: 'Instant Call', chat: 'Instant Chat', text: 'Text Answers', atonement: 'Atonements' }

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const mine = (record, astrologerId) => !record?.astrologerId || !astrologerId || record.astrologerId === astrologerId
const time = (value) => { const t = new Date(value).getTime(); return Number.isFinite(t) ? t : null }

/** Flat list of delivered services: { service: 'call'|'chat'|'text', at, amount }. */
function deliveredServices({ instant = [], consultations = [], questions = [], astrologerId }) {
  const rows = []
  instant.filter((r) => mine(r, astrologerId) && r.startedAt && ['accepted', 'ended'].includes(r.status)).forEach((r) => {
    rows.push({ service: r.type === 'chat' ? 'chat' : 'call', at: time(r.startedAt), amount: Number(r.amountPaid ?? r.amount) || 0 })
  })
  consultations.filter((r) => mine(r, astrologerId) && r.status === 'Completed').forEach((r) => {
    rows.push({ service: /chat/i.test(r.type) ? 'chat' : 'call', at: time(r.startedAt), amount: Number(r.amount) || 0 })
  })
  questions.filter((r) => mine(r, astrologerId) && r.status === 'Answered' && r.answeredAt).forEach((r) => {
    rows.push({ service: 'text', at: time(r.answeredAt), amount: Number(r.purchaseAmount) || 0 })
  })
  return rows.filter((row) => row.at !== null)
}

/** Monday..Sunday of the week containing `now` (local time): revenue (₹) and session count per day. */
export function buildWeeklyTrend(sources, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start); date.setDate(start.getDate() + index)
    return { date, short: DAY_NAMES[date.getDay()].slice(0, 3), dayName: DAY_NAMES[date.getDay()], dateLabel: `${date.getDate()} ${MONTHS[date.getMonth()]}`, revenue: 0, sessions: 0 }
  })
  deliveredServices(sources).forEach((row) => {
    const index = days.findIndex((day) => row.at >= day.date.getTime() && row.at < day.date.getTime() + 86400000)
    if (index >= 0) { days[index].revenue += row.amount; days[index].sessions += 1 }
  })
  return days
}

/** A round axis for the revenue values: { min, max, ticks (top → bottom) }. */
export function buildRevenueAxis(values) {
  const peak = Math.max(0, ...values)
  const step = [250, 500, 1000, 1500, 2500, 5000, 10000, 25000, 50000, 100000].find((s) => peak <= s * 3) || Math.ceil(peak / 3 / 100000) * 100000
  const max = Math.max(step * 3, step)
  return { min: 0, max, ticks: [max, step * 2, step, 0] }
}

/** Counts per service for the doughnut (all recorded consultations of this astrologer). */
export function buildServiceMix({ atonements = [], ...sources }) {
  const counts = { call: 0, chat: 0, text: 0, atonement: 0 }
  deliveredServices(sources).forEach((row) => { counts[row.service] += 1 })
  counts.atonement = atonements.filter((r) => mine(r, sources.astrologerId)).length
  const total = SERVICE_KEYS.reduce((sum, key) => sum + counts[key], 0)
  return SERVICE_KEYS.map((key) => ({ key, label: SERVICE_LABELS[key], count: counts[key], percent: total ? (counts[key] / total) * 100 : 0 }))
}

export const formatPercent = (value) => `${Number.isInteger(Math.round(value * 10) / 10) ? Math.round(value) : (Math.round(value * 10) / 10).toFixed(1)}%`
export const formatRupees = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`
