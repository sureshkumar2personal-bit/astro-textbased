import { ROLES } from './roleRoutes.js'
import { mockAstrologers } from '../data/notificationData.js'

// Pure selectors for the Admin -> Astrologers module.
//
// Reads the astrologer catalog already used across the app (mockAstrologers,
// exported from data/notificationData.js) and enriches it with contact details
// from astrologer accounts that actually exist in AuthContext. Nothing here
// writes storage or mutates app state, and no astrologer record is invented.

// Contact details live on the astrologer account, not on the catalog entry.
// Accounts are matched by astrologer id first, then by name, because the seeded
// alias account ('astrologer-demo-alias') points at the same astrologer under a
// different id.
function matchAccount(accounts, astrologer) {
  const byId = accounts.find((account) => account.id === astrologer.id)
  if (byId) return byId
  const name = String(astrologer.name || '').trim().toLowerCase()
  return accounts.find((account) => String(account.name || '').trim().toLowerCase() === name) || null
}

export function selectAstrologerAccounts(users) {
  return (Array.isArray(users) ? users : []).filter((user) => user.role === ROLES.ASTROLOGER)
}

export function selectAdminAstrologers(users) {
  const accounts = selectAstrologerAccounts(users)
  return mockAstrologers.map((astrologer) => {
    const account = matchAccount(accounts, astrologer)
    return {
      ...astrologer,
      email: account?.email || '',
      phone: account?.phone || '',
      hasAccount: Boolean(account),
    }
  })
}

// The catalog has no separate verification or lifecycle field. `availability`
// ('Online' / 'Offline') is the only status the existing record actually carries,
// so that is what is displayed rather than inventing a status.
export function getAstrologerStatus(astrologer) {
  return String(astrologer?.availability || '').trim()
}

export function matchesAstrologerQuery(astrologer, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  return [astrologer?.name, astrologer?.email, astrologer?.phone].some((field) => String(field || '').toLowerCase().includes(search))
}

export function filterAdminAstrologers(users, query = '') {
  return selectAdminAstrologers(users).filter((astrologer) => matchesAstrologerQuery(astrologer, query))
}

export function findAdminAstrologer(users, astrologerId) {
  return selectAdminAstrologers(users).find((astrologer) => astrologer.id === astrologerId) || null
}
