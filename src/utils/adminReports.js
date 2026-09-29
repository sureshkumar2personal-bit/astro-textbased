// Pure selectors for the Admin -> Reports / Analytics module.
//
// Counts and status breakdowns only, derived directly from the same persisted
// stores the other admin modules already read. No store is duplicated, no
// statistic is estimated, and no status is derived for a record that does not
// carry one.
//
// Deliberately absent: revenue, retention, growth, trends and time series.
// The data behind those does not exist reliably for an admin (see the notes on
// each function), so producing them would mean inventing numbers.

function countBy(items, getKey) {
  const counts = new Map()
  for (const item of Array.isArray(items) ? items : []) {
    const key = String(getKey(item) ?? '').trim()
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// Users have no account-state field in the model, so there is no breakdown to
// report. The total is still real.
export function summariseUsers(customerUsers) {
  return { total: (Array.isArray(customerUsers) ? customerUsers : []).length, breakdown: null }
}

export function summariseAstrologers(astrologers) {
  const list = Array.isArray(astrologers) ? astrologers : []
  return {
    total: list.length,
    // `availability` is the only state a catalog entry carries. It is labelled
    // as availability, never as an account status.
    breakdown: { title: 'Astrologers by availability', rows: countBy(list, (a) => a.availability) },
  }
}

export function summariseAppointments(appointments) {
  const list = Array.isArray(appointments) ? appointments : []
  return { total: list.length, breakdown: { title: 'Appointments by status', rows: countBy(list, (a) => a.status) } }
}

export function summariseQuestions(questions) {
  const list = Array.isArray(questions) ? questions : []
  return { total: list.length, breakdown: { title: 'Questions by status', rows: countBy(list, (q) => q.status) } }
}

export function summariseDisputes(disputes) {
  const list = Array.isArray(disputes) ? disputes : []
  return { total: list.length, breakdown: { title: 'Disputes by status', rows: countBy(list, (d) => d.status) } }
}

export function summariseContent(posts) {
  const list = Array.isArray(posts) ? posts : []
  return {
    total: list.length,
    // Posts carry a visibility setting but no draft/published lifecycle, so
    // this is a visibility breakdown rather than a status breakdown.
    breakdown: { title: 'Content by visibility', rows: countBy(list, (p) => p.visibility) },
  }
}

export function summariseReports({ customerUsers = [], astrologers = [], appointments = [], questions = [], disputes = [], posts = [] } = {}) {
  return {
    users: summariseUsers(customerUsers),
    astrologers: summariseAstrologers(astrologers),
    appointments: summariseAppointments(appointments),
    questions: summariseQuestions(questions),
    disputes: summariseDisputes(disputes),
    content: summariseContent(posts),
  }
}
