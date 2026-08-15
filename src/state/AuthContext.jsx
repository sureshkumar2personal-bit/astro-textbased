/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { inferRoleFromEmail, ROLES } from '../utils/roleRoutes.js'

const AUTH_STORAGE_KEY = 'astroconnect-auth-session'
const USERS_STORAGE_KEY = 'astroconnect-auth-users'

const defaultUsers = [
  {
    id: 'user-demo',
    role: ROLES.USER,
    name: 'Priya V.',
    email: 'user@astroconnect.com',
    password: 'User@123',
    specialization: '',
    experience: '',
  },
  {
    id: 'astrologer-demo',
    role: ROLES.ASTROLOGER,
    name: 'Dr. Rani',
    email: 'astro@astroconnect.com',
    password: 'Astro@123',
    specialization: 'Marriage, Career, Business',
    experience: '8 years',
  },
  {
    id: 'astrologer-demo-alias',
    role: ROLES.ASTROLOGER,
    name: 'Dr. Rani',
    email: 'dr.rani@astroconnect.com',
    password: 'Astro@123',
    specialization: 'Marriage, Career, Business',
    experience: '8 years',
  },
]

const AuthContext = createContext(null)

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase().replace(/\.app$/, '.com')
}

function normalizeUser(user) {
  if (!user) return user
  return {
    ...user,
    email: normalizeEmail(user.email),
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

function seedUsers() {
  const stored = readJSON(USERS_STORAGE_KEY, null)
  if (Array.isArray(stored) && stored.length) {
    const normalized = stored.map(normalizeUser)
    writeJSON(USERS_STORAGE_KEY, normalized)
    return normalized
  }
  writeJSON(USERS_STORAGE_KEY, defaultUsers)
  return defaultUsers
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(seedUsers)
  const [currentUser, setCurrentUser] = useState(() => readJSON(AUTH_STORAGE_KEY, null))

  useEffect(() => {
    writeJSON(USERS_STORAGE_KEY, users)
  }, [users])

  useEffect(() => {
    if (currentUser) {
      writeJSON(AUTH_STORAGE_KEY, currentUser)
    } else if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [currentUser])

  const auth = useMemo(() => ({
    currentUser,
    users,
    login({ email, password }) {
      const normalizedEmail = normalizeEmail(email)
      const user = users.find((entry) => entry.email.toLowerCase() === normalizedEmail)
      if (!user || user.password !== password) {
        throw new Error('Invalid email or password.')
      }
      setCurrentUser(user)
      return user
    },
    register(payload) {
      const email = normalizeEmail(payload.email)
      const role = inferRoleFromEmail(email)
      if (!role) {
        throw new Error('Use a .com email. Astrologer accounts should start with astro@.')
      }
      if (users.some((entry) => entry.role === role && entry.email.toLowerCase() === email)) {
        throw new Error('An account with this email already exists for this domain.')
      }

      const user = {
        id: crypto.randomUUID(),
        role,
        name: payload.name.trim(),
        email,
        password: payload.password,
        specialization: payload.specialization || '',
        experience: payload.experience || '',
      }

      setUsers((prev) => [user, ...prev])
      setCurrentUser(user)
      return user
    },
    logout() {
      setCurrentUser(null)
    },
  }), [currentUser, users])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return value
}
