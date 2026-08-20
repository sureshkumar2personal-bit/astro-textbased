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
    phone: '+91 98765 43210',
    password: 'User@123',

    bio: '',
    profileImage: '',

    dob: '',
    birthTime: '',
    birthPlace: '',
    city: '',
    state: '',
    country: 'India',
    pinCode: '',
    address: '',
    saveHoroscope: true,
  },
  {
    id: 'astrologer-demo',
    role: ROLES.ASTROLOGER,
    name: 'Dr. Rani',
    email: 'astro@astroconnect.com',
    phone: '+91 98765 43210',
    password: 'Astro@123',
    specialization: 'Marriage, Career, Business',
    experience: '8 years',

    bio: '',
    profileImage: '',
    dob: '',
    birthTime: '',
    birthPlace: '',
    city: '',
    state: '',
    country: 'India',
    pinCode: '',
    address: '',
    saveHoroscope: true,
  },
  {
    id: 'astrologer-demo-alias',
    role: ROLES.ASTROLOGER,
    name: 'Dr. Rani',
    email: 'dr.rani@astroconnect.com',
    phone: '+91 98765 43210',
    password: 'Astro@123',
    specialization: 'Marriage, Career, Business',
    experience: '8 years',

    bio: '',
    profileImage: '',
    dob: '',
    birthTime: '',
    birthPlace: '',
    city: '',
    state: '',
    country: 'India',
    pinCode: '',
    address: '',
    saveHoroscope: true,
  },
]

const AuthContext = createContext(null)

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/\.app$/, '.com')
}

function normalizeUser(user) {
  if (!user) return user

  return {
    ...user,
    email: normalizeEmail(user.email),
    bio: user.bio || '',
    profileImage: user.profileImage || '',
    dob: user.dob || '',
    birthTime: user.birthTime || '',
    birthPlace: user.birthPlace || '',
    city: user.city || '',
    state: user.state || '',
    country: user.country || 'India',
    pinCode: user.pinCode || '',
    address: user.address || '',
    saveHoroscope:
      typeof user.saveHoroscope === 'boolean'
        ? user.saveHoroscope
        : true,
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

  const normalizedDefaults = defaultUsers.map(normalizeUser)

  writeJSON(USERS_STORAGE_KEY, normalizedDefaults)

  return normalizedDefaults
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(seedUsers)

  const [currentUser, setCurrentUser] = useState(() =>
    normalizeUser(readJSON(AUTH_STORAGE_KEY, null))
  )

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

  const auth = useMemo(
    () => ({
      currentUser,
      users,

      login({ email, password }) {
        const normalizedEmail = normalizeEmail(email)

        const user = users.find(
          (entry) =>
            normalizeEmail(entry.email) === normalizedEmail
        )

        if (!user || user.password !== password) {
          throw new Error('Invalid email or password.')
        }

        const normalizedUser = normalizeUser(user)

        setCurrentUser(normalizedUser)

        return normalizedUser
      },

      register(payload) {
        const email = normalizeEmail(payload.email)
        const role = inferRoleFromEmail(email)

        if (!role) {
          throw new Error(
            'Use a .com email. Astrologer accounts should start with astro@.'
          )
        }

        if (
          users.some(
            (entry) =>
              entry.role === role &&
              normalizeEmail(entry.email) === email
          )
        ) {
          throw new Error(
            'An account with this email already exists for this domain.'
          )
        }

        const user = normalizeUser({
          id: crypto.randomUUID(),
          role,
          name: String(payload.name || '').trim(),
          email,
          phone: payload.phone || '',
          password: payload.password,
          specialization: payload.specialization || '',
          experience: payload.experience || '',
        })

        setUsers((prev) => [user, ...prev])
        setCurrentUser(user)

        return user
      },

      updateProfile(payload) {
        if (!currentUser) {
          throw new Error('No profile is currently signed in.')
        }

        const name = String(payload.name || '').trim()
        const email = normalizeEmail(payload.email)

        if (!name) {
          throw new Error('Enter your name.')
        }

        if (!email || !email.endsWith('.com')) {
          throw new Error(
            'Enter a valid .com email address.'
          )
        }

        if (
          users.some(
            (entry) =>
              entry.id !== currentUser.id &&
              normalizeEmail(entry.email) === email
          )
        ) {
          throw new Error(
            'An account with this email already exists.'
          )
        }

        const updatedUser = normalizeUser({
          ...currentUser,

          name,
          email,
          phone: String(payload.phone || '').trim(),

          bio: String(payload.bio || '').trim(),
          profileImage: payload.profileImage || '',

          dob: payload.dob || '',
          birthTime: payload.birthTime || '',
          birthPlace: String(payload.birthPlace || '').trim(),

          city: String(payload.city || '').trim(),
          state: String(payload.state || '').trim(),
          country: String(payload.country || '').trim(),
          pinCode: String(payload.pinCode || '').trim(),
          address: String(payload.address || '').trim(),

          saveHoroscope:
            typeof payload.saveHoroscope === 'boolean'
              ? payload.saveHoroscope
              : true,

          specialization: String(
            payload.specialization ||
              currentUser.specialization ||
              ''
          ).trim(),

          experience: String(
            payload.experience ||
              currentUser.experience ||
              ''
          ).trim(),
        })

        setUsers((prev) =>
          prev.map((entry) =>
            entry.id === currentUser.id
              ? updatedUser
              : entry
          )
        )

        setCurrentUser(updatedUser)

        return updatedUser
      },

      logout() {
        setCurrentUser(null)
      },
    }),
    [currentUser, users]
  )

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    )
  }

  return value
}