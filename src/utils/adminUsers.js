import { ROLES } from './roleRoutes.js'
import { getUserActivityLog } from './userActivityLog.js'
import { parseDisplayDate, sortByDateDesc } from './date.js'

// Pure selectors for the Admin -> Users module.
//
// Every function here reads existing data only. Nothing in this file writes to
// storage, mutates app state, or duplicates domain business logic. Where a data
// source cannot be linked to a specific user without changing that domain's
// behaviour, the selector simply returns an empty list and the page renders its
// normal empty state instead of inventing records.

export const ADMIN_USER_STATUS_FILTERS = ['All', 'Active', 'Blocked', 'Suspended']

// The current user record in AuthContext has no account-state field, and login()
// checks nothing but email and password, so there is no blocked/suspended state
// anywhere in the app yet. A stored value is used when one exists so this stays
// correct the moment the model gains one; otherwise the account is reported as
// Active because nothing in the app can currently prevent it from signing in.
// This is a read-only derivation. It does not add a status field to any user.
export function getUserAccountStatus(user) {
  const stored = String(user?.status || user?.accountStatus || '').trim().toLowerCase()
  if (stored === 'blocked') return 'Blocked'
  if (stored === 'suspended') return 'Suspended'
  if (stored === 'active') return 'Active'
  return 'Active'
}

export function getUserJoinedDate(user) {
  const stored = user?.createdAt || user?.joinedAt || user?.registeredAt
  if (!stored) return null
  const parsed = parseDisplayDate(stored)
  return parsed.getTime() > 0 ? parsed : null
}

// login() in AuthContext records a 'security' / 'Account sign-in' entry against
// the user id, so the newest one is the last time that account signed in here.
// Only meaningful for accounts that have actually signed in on this device.
export function getUserLastLogin(user) {
  const entry = getUserActivityLog(user?.id).find((item) => item.type === 'security' && item.title === 'Account sign-in')
  if (!entry?.occurredAt) return null
  const parsed = parseDisplayDate(entry.occurredAt)
  return parsed.getTime() > 0 ? parsed : null
}

export function formatDisplayDate(value) {
  if (!value) return 'Not available'
  const parsed = value instanceof Date ? value : parseDisplayDate(value)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() === 0) return 'Not available'
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Astrologers have their own admin module, so the Users list is scoped to
// accounts registered as users.
export function selectCustomerUsers(users) {
  return (Array.isArray(users) ? users : []).filter((user) => user.role === ROLES.USER)
}

export function matchesUserQuery(user, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  return [user?.id, user?.name, user?.email, user?.phone].some((field) => String(field || '').toLowerCase().includes(search))
}

export function filterAdminUsers(users, { query = '', status = 'All' } = {}) {
  return selectCustomerUsers(users).filter((user) => {
    if (!matchesUserQuery(user, query)) return false
    if (status && status !== 'All' && getUserAccountStatus(user) !== status) return false
    return true
  })
}

export function findAdminUser(users, userId) {
  return selectCustomerUsers(users).find((user) => user.id === userId) || null
}

// Mirrors the question owner resolution already used by
// memberCommunicationActivity.js: questions carry both a display-side userId and
// the account that submitted them.
function questionOwnerId(question) {
  return question.submittedByUserId || question.userId || null
}

export function selectUserSubscriptions(subscriptions, userId) {
  if (!userId) return []
  return (Array.isArray(subscriptions) ? subscriptions : [])
    .filter((subscription) => subscription.userId === userId)
    .slice()
    .sort((a, b) => sortByDateDesc(a, b, (item) => item.subscribedAt))
}

export function selectUserQuestions(questions, userId) {
  if (!userId) return []
  return (Array.isArray(questions) ? questions : [])
    .filter((question) => questionOwnerId(question) === userId)
    .slice()
    .sort((a, b) => sortByDateDesc(a, b, (item) => item.raisedAt || item.raised))
}

export function selectUserAppointments(appointments, userId) {
  if (!userId) return []
  return (Array.isArray(appointments) ? appointments : [])
    .filter((appointment) => appointment.userId === userId)
    .slice()
    .sort((a, b) => sortByDateDesc(a, b, (item) => item.date || item.bookingDate))
}

// Disputes are not a separate store. They live on the question they were raised
// against, which is how DisputeManagement.jsx already reads them.
export function selectUserDisputes(questions, userId) {
  return selectUserQuestions(questions, userId).filter((question) => question.dispute)
}

export function selectUserReviews() {
  // Reviews DO exist and are readable — Admin Reviews lists them from the REVIEWS
  // array exported by ReviewsRatings.jsx. But those records carry only
  // { id, name, rating, type, date, text, helpful }: `id` is a sequence number and
  // `name` is a bare display string. There is no user id, email or any other
  // account reference, so a review cannot be matched to a specific user without
  // guessing. Matching on name, astrologer or position would invent ownership
  // that the data does not contain, so this stays empty until reviews record who
  // wrote them.
  return []
}

export function selectUserPayments() {
  // AppDataContext exposes a single userWallet, not one wallet per user, so its
  // transactions cannot be attributed to a specific account.
  return []
}
