/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ROLES } from '../utils/roleRoutes.js'

// Admin identity + session foundation, modelled on state/EditorContext.jsx.
//
// Deliberately a separate store from AuthContext: it never reads or writes
// `astroconnect-auth-session` or `astroconnect-auth-users`, and it never touches
// AuthContext's `currentUser`. An admin session therefore cannot collide with,
// or be mistaken for, a User or Astrologer session.
//
// Security posture, stated plainly: authentication here is entirely client-side,
// exactly as it is for User/Astrologer. Nothing in this file is an access-control
// boundary. `isSessionValid` exists for a route guard, which is UX gating only —
// a real boundary requires a server that verifies credentials and authorizes
// every admin request. Sign-in is therefore single-factor and credential-free by
// construction; see the contract documented in pages/admin/AdminLogin.jsx.

const ADMINS_KEY = 'astroconnect-admin-users'
const SESSION_KEY = 'astroconnect-admin-session'
const SESSIONS_KEY = 'astroconnect-admin-sessions'
const AUDIT_KEY = 'astroconnect-admin-audit'
const AUDIT_LIMIT = 500
const ADMIN_EMAILS_ENV = 'VITE_ADMIN_EMAILS'

export const ADMIN_ROLES = {
  ADMINISTRATOR: 'Administrator',
  AUDITOR: 'Auditor',
}

const now = () => new Date().toISOString()
const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'active') return 'active'
  if (value === 'suspended' || value === 'revoked') return 'suspended'
  return 'suspended'
}

function normalizeMember(member) {
  return {
    ...member,
    email: normalizeEmail(member.email),
    status: normalizeStatus(member.status),
    role: member.role === ADMIN_ROLES.AUDITOR ? ADMIN_ROLES.AUDITOR : ADMIN_ROLES.ADMINISTRATOR,
  }
}

function readJSON(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

// Deployment-time allowlist. Emails listed in VITE_ADMIN_EMAILS become eligible
// for admin access. This grants eligibility only: it never carries a credential,
// and it never re-activates an admin that was suspended locally.
function readEnvAdminEmails() {
  const raw = import.meta.env?.[ADMIN_EMAILS_ENV]
  if (!raw) return []
  return String(raw)
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter((entry) => entry.includes('@'))
}

function displayNameFromEmail(email) {
  return String(email)
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function provisionFromEnv(stored) {
  const allowed = readEnvAdminEmails()
  if (!allowed.length) return Array.isArray(stored) ? stored : []

  const list = Array.isArray(stored) ? stored.map(normalizeMember) : []
  for (const email of allowed) {
    if (list.some((admin) => admin.email === email)) continue
    list.push({
      id: id('admin'),
      name: displayNameFromEmail(email),
      email,
      role: ADMIN_ROLES.ADMINISTRATOR,
      status: 'active',
      provisionedFrom: 'env',
      createdAt: now(),
      lastActiveAt: now(),
    })
  }
  return list
}

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [admins, setAdmins] = useState(() => provisionFromEnv(readJSON(ADMINS_KEY, null)))
  const [sessions, setSessions] = useState(() => readJSON(SESSIONS_KEY, []))
  const [adminSession, setAdminSession] = useState(() => readJSON(SESSION_KEY, null))
  const [audit, setAudit] = useState(() => readJSON(AUDIT_KEY, []))

  useEffect(() => writeJSON(ADMINS_KEY, admins), [admins])
  useEffect(() => writeJSON(SESSIONS_KEY, sessions), [sessions])
  useEffect(() => writeJSON(AUDIT_KEY, audit), [audit])
  useEffect(() => {
    if (adminSession) writeJSON(SESSION_KEY, adminSession)
    else if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY)
  }, [adminSession])

  const currentAdmin = adminSession
    ? admins.find((admin) => admin.id === adminSession.adminId) || null
    : null

  const recordAudit = (action, module, details = '', actor = currentAdmin) => {
    const entry = {
      id: id('audit'),
      adminId: actor?.id || currentAdmin?.id || null,
      actorName: actor?.name || currentAdmin?.name || 'Administrator',
      // Recorded explicitly so the future admin audit module can tell these
      // entries apart via isAdminActivity() in utils/adminAudit.js.
      actorRole: ROLES.ADMIN,
      action,
      module,
      details,
      occurredAt: now(),
    }
    setAudit((items) => [entry, ...items].slice(0, AUDIT_LIMIT))
    return entry
  }

  const closeAdminSession = (adminId) => {
    setSessions((items) => items.filter((session) => session.adminId !== adminId))
    if (adminSession?.adminId === adminId) setAdminSession(null)
  }

  useEffect(() => {
    if (!adminSession) return
    const member = admins.find((admin) => admin.id === adminSession.adminId)
    if (!member || member.status !== 'active') closeAdminSession(adminSession.adminId)
  }, [admins, adminSession])

  const value = useMemo(() => ({
    admins,
    sessions,
    audit,
    adminSession,
    currentAdmin,
    isAdminConfigured: admins.length > 0,
    adminEmailsEnv: ADMIN_EMAILS_ENV,
    recordAudit,
    loginAdmin(credentials) {
      const email = normalizeEmail(typeof credentials === 'string' ? credentials : credentials?.email)
      if (!email.includes('@')) throw new Error('Enter your administrator email address.')

      const admin = admins.find((entry) => entry.email === email)
      // One message for "no such admin" and anything else unresolvable, so the
      // form cannot be used to enumerate which addresses have admin access.
      if (!admin) throw new Error('No administrator access was found for this address.')
      if (admin.status !== 'active') throw new Error(`This administrator account is ${admin.status}.`)

      const session = {
        adminId: admin.id,
        role: ROLES.ADMIN,
        adminRole: admin.role,
        name: admin.name,
        email: admin.email,
        status: 'active',
        signedInAt: now(),
        lastActiveAt: now(),
      }
      setAdmins((items) => items.map((entry) => (entry.id === admin.id ? { ...entry, lastActiveAt: session.lastActiveAt } : entry)))
      setSessions((items) => [session, ...items.filter((entry) => entry.adminId !== admin.id)])
      setAdminSession(session)
      recordAudit('Admin Login', 'Authentication', `${admin.name} signed in.`, admin)
      return session
    },
    logoutAdmin() {
      const actor = currentAdmin || adminSession
      if (actor) recordAudit('Admin Logout', 'Authentication', `${actor.name} signed out.`, actor)
      if (adminSession) setSessions((items) => items.filter((session) => session.adminId !== adminSession.adminId))
      setAdminSession(null)
    },
    isSessionValid(adminId) {
      const member = admins.find((admin) => admin.id === adminId)
      const sessionExists = sessions.some((session) => session.adminId === adminId && (session.status || 'active') === 'active')
        || (adminSession?.adminId === adminId && (adminSession.status || 'active') === 'active')
      return Boolean(member && member.status === 'active' && sessionExists)
    },
  }), [adminSession, admins, audit, currentAdmin, sessions])

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const value = useContext(AdminContext)
  if (!value) {
    throw new Error('useAdmin must be used within AdminProvider')
  }
  return value
}
