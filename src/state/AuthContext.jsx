/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { inferRoleFromEmail, ROLES } from '../utils/roleRoutes.js'
import { recordUserActivity } from '../utils/userActivityLog.js'
import { deriveUsername, validateProfilePayload } from '../utils/profile.js'

const AUTH_STORAGE_KEY = 'astroconnect-auth-session'
const EDITOR_SESSION_KEY = 'astroconnect-editor-session'
const USERS_STORAGE_KEY = 'astroconnect-auth-users'

const defaultUsers = [
  {
    id: 'user-demo',
    role: ROLES.USER,
    name: 'Priya V.',
    email: 'user@astroconnect.com',
    phone: '+91 98765 43210',
    password: 'User@123',
    specialization: '',
    experience: '',
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
  },
]

const AuthContext = createContext(null)

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase().replace(/\.app$/, '.com')
}

function normalizeUser(user) {
  if (!user) return user
  const normalized = {
    ...user,
    email: normalizeEmail(user.email),
    username: String(user.username || deriveUsername(user.name)).replace(/^@+/, '').toLowerCase(),
  }
  if (user.role !== ROLES.USER) return normalized

  const savedPreferences = user.astrologerPreferences && typeof user.astrologerPreferences === 'object' ? user.astrologerPreferences : {}
  const preferenceValues = (primary, legacy, fallback) => {
    const values = [savedPreferences[primary], savedPreferences[legacy]].find((entry) => Array.isArray(entry) && entry.length)
    return values || [fallback]
  }
  return {
    ...normalized,
    gender: normalized.gender || 'Female',
    dateOfBirth: normalized.dateOfBirth || '1995-03-12',
    birthTime: normalized.birthTime || '07:05',
    birthPlace: normalized.birthPlace || 'Theni, Tamil Nadu, India',
    latitude: normalized.latitude || '10.0104',
    longitude: normalized.longitude || '77.4768',
    timezone: normalized.timezone || 'Asia/Kolkata',
    languages: Array.isArray(normalized.languages) && normalized.languages.length ? normalized.languages : ['Tamil'],
    rasi: normalized.rasi || 'Rishabam',
    nakshatra: normalized.nakshatra || 'Rohini',
    lagna: normalized.lagna || 'Vrishabha',
    horoscopeDetails: normalized.horoscopeDetails || 'A grounded chart with a practical Taurus influence and a creative Rohini Moon.',
    phoneVisibility: normalized.phoneVisibility || 'private',
    emailVisibility: normalized.emailVisibility || 'private',
    astrologerPreferencesEnabled: true,
    astrologerPreferences: {
      ...savedPreferences,
      languages: preferenceValues('languages', 'preferredLanguages', 'Tamil'),
      astrologerTypes: preferenceValues('astrologerTypes', 'methods', 'Vedic Astrology'),
      consultationTitles: preferenceValues('consultationTitles', 'topics', 'Marriage'),
      methods: preferenceValues('methods', 'astrologerTypes', 'Vedic Astrology'),
      topics: preferenceValues('topics', 'consultationTitles', 'Marriage'),
    },
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
  const normalized = defaultUsers.map(normalizeUser)
  writeJSON(USERS_STORAGE_KEY, normalized)
  return normalized
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(seedUsers)
  const [currentUser, setCurrentUser] = useState(() => normalizeUser(readJSON(AUTH_STORAGE_KEY, null) || readJSON(EDITOR_SESSION_KEY, null)))

  useEffect(() => {
    writeJSON(USERS_STORAGE_KEY, users)
  }, [users])

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === ROLES.EDITOR) writeJSON(EDITOR_SESSION_KEY, currentUser)
      else writeJSON(AUTH_STORAGE_KEY, currentUser)
    } else if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      window.localStorage.removeItem(EDITOR_SESSION_KEY)
    }
  }, [currentUser])

  const auth = useMemo(() => ({
    currentUser,
    users,
    login({ email, password, role }) {
      const normalizedEmail = normalizeEmail(email)
      const user = users.find((entry) => entry.email.toLowerCase() === normalizedEmail)
      if (!user || user.password !== password) {
        throw new Error('Invalid email or password.')
      }
      if (role && user.role !== role) {
        throw new Error(`This account is registered as a ${user.role === ROLES.ASTROLOGER ? 'Astrologer' : 'User'}. Choose the correct login portal.`)
      }
      setCurrentUser(user)
      recordUserActivity({ userId: user.id, type: 'security', title: 'Account sign-in', summary: 'You signed in to Astro Connect.', metadata: user.email })
      return user
    },
    register(payload) {
      const email = normalizeEmail(payload.email)
      const role = payload.role || inferRoleFromEmail(email)
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
        username: String(payload.username || deriveUsername(payload.name)).replace(/^@+/, '').toLowerCase(),
        email,
        phone: payload.phone || '',
        dateOfBirth: payload.dateOfBirth || '',
        birthTime: payload.birthTime || '',
        birthPlace: payload.birthPlace || '',
        horoscopeDetails: payload.horoscopeDetails || '',
        password: payload.password,
        specialization: payload.specialization || '',
        languages: payload.languages || [],
        experience: payload.experience || '',
        astrologerPreferencesEnabled: false,
        astrologerPreferences: { languages: [], astrologerTypes: [], consultationTitles: [], methods: [], topics: [] },
      }

      setUsers((prev) => [user, ...prev])
      setCurrentUser(user)
      return user
    },
    startEditorSession(editor) {
      const session = { ...editor, role: ROLES.EDITOR }
      setCurrentUser(session)
      writeJSON(EDITOR_SESSION_KEY, session)
      return session
    },
    endEditorSession() {
      setCurrentUser(null)
      if (typeof window !== 'undefined') window.localStorage.removeItem(EDITOR_SESSION_KEY)
    },
    updateProfile(payload) {
      if (!currentUser) throw new Error('No profile is currently signed in.')
      const { name, username } = validateProfilePayload({ ...currentUser, ...payload }, users, currentUser.id)
      const email = normalizeEmail(payload.email)
      if (!name) throw new Error('Enter your name.')
      if (!email || !email.endsWith('.com')) throw new Error('Enter a valid .com email address.')
      if (users.some((entry) => entry.id !== currentUser.id && entry.email.toLowerCase() === email)) {
        throw new Error('An account with this email already exists.')
      }

      const updatedUser = {
        ...currentUser,
        name,
        username,
        email,
        phone: String(payload.phone ?? currentUser.phone ?? '').trim(),
        phoneVisibility: payload.phoneVisibility || currentUser.phoneVisibility || 'private',
        emailVisibility: payload.emailVisibility || currentUser.emailVisibility || 'private',
        gender: String(payload.gender ?? currentUser.gender ?? '').trim(),
        dateOfBirth: String(payload.dateOfBirth ?? currentUser.dateOfBirth ?? '').trim(),
        birthTime: String(payload.birthTime ?? currentUser.birthTime ?? '').trim(),
        birthPlace: String(payload.birthPlace ?? currentUser.birthPlace ?? '').trim(),
        latitude: String(payload.latitude ?? currentUser.latitude ?? '').trim(),
        longitude: String(payload.longitude ?? currentUser.longitude ?? '').trim(),
        timezone: String(payload.timezone ?? currentUser.timezone ?? '').trim(),
        horoscopeDetails: String(payload.horoscopeDetails ?? currentUser.horoscopeDetails ?? '').trim(),
        rasi: String(payload.rasi ?? currentUser.rasi ?? '').trim(),
        nakshatra: String(payload.nakshatra ?? currentUser.nakshatra ?? '').trim(),
        lagna: String(payload.lagna ?? currentUser.lagna ?? '').trim(),
        specialization: String(payload.specialization ?? currentUser.specialization ?? '').trim(),
        experience: String(payload.experience ?? currentUser.experience ?? '').trim(),
        bio: String(payload.bio ?? currentUser.bio ?? '').trim(),
        languages: Array.isArray(payload.languages)
          ? payload.languages
          : String(payload.languages ?? currentUser.languages ?? '').split(',').map((language) => language.trim()).filter(Boolean),
        profileImage: String(payload.profileImage ?? currentUser.profileImage ?? '').trim(),
        astrologerPreferencesEnabled: Boolean(payload.astrologerPreferencesEnabled ?? currentUser.astrologerPreferencesEnabled ?? false),
        astrologerPreferences: payload.astrologerPreferences || currentUser.astrologerPreferences || { languages: [], astrologerTypes: [], consultationTitles: [], methods: [], topics: [] },
      }
      const profileFields = ['name', 'username', 'email', 'phone', 'phoneVisibility', 'emailVisibility', 'bio', 'profileImage']
      const birthFields = ['gender', 'dateOfBirth', 'birthTime', 'birthPlace', 'latitude', 'longitude', 'timezone', 'horoscopeDetails', 'rasi', 'nakshatra', 'lagna']
      const changedProfileFields = profileFields.filter((field) => updatedUser[field] !== currentUser[field])
      const changedBirthFields = birthFields.filter((field) => updatedUser[field] !== currentUser[field])
      if (changedProfileFields.length) {
        recordUserActivity({ userId: currentUser.id, type: 'profile', title: 'Profile updated', summary: `Updated ${changedProfileFields.join(', ')}.`, metadata: changedProfileFields.join(', ') })
      }
      if (changedBirthFields.length) {
        recordUserActivity({ userId: currentUser.id, type: 'horoscope', title: 'Horoscope details updated', summary: 'Your birth or horoscope details were updated.', metadata: changedBirthFields.join(', ') })
      }
      if (payload.dateOfBirth !== undefined || payload.birthTime !== undefined || payload.birthPlace !== undefined || payload.latitude !== undefined || payload.longitude !== undefined || payload.timezone !== undefined || payload.horoscopeDetails !== undefined || payload.rasi !== undefined || payload.nakshatra !== undefined || payload.lagna !== undefined) {
        writeJSON('astroconnect-user-birth-details', {
          name: updatedUser.name,
          dateOfBirth: updatedUser.dateOfBirth,
          timeOfBirth: updatedUser.birthTime,
          placeOfBirth: updatedUser.birthPlace,
          latitude: updatedUser.latitude,
          longitude: updatedUser.longitude,
          timezone: updatedUser.timezone,
          horoscopeDetails: updatedUser.horoscopeDetails,
          rasi: updatedUser.rasi,
          nakshatra: updatedUser.nakshatra,
          lagna: updatedUser.lagna,
        })
      }
      setUsers((prev) => prev.map((entry) => (entry.id === currentUser.id ? updatedUser : entry)))
      setCurrentUser(updatedUser)
      return updatedUser
    },
    logout() {
      setCurrentUser(null)
      if (typeof window !== 'undefined') window.localStorage.removeItem(EDITOR_SESSION_KEY)
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
