/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { inferRoleFromEmail, ROLES } from '../utils/roleRoutes.js'
import { recordUserActivity } from '../utils/userActivityLog.js'

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
  // Demo customer accounts.
  //
  // These exist so the Admin -> Users module can be evaluated against a realistic
  // list instead of a single row. They are ordinary accounts: identical shape,
  // identical storage key, identical sign-in path as any self-registered user, and
  // no behaviour is special-cased for them anywhere.
  //
  // Extra fields are set only where they are meaningful:
  //   createdAt — the registration timestamp that utils/adminUsers.js
  //               (getUserJoinedDate) already reads. user-demo above predates it
  //               and is left untouched, so it still reports "Not available".
  //   status    — read by getUserAccountStatus(). Only the two accounts that
  //               demonstrate the admin status filter carry one; the rest rely on
  //               the documented Active default.
  //   subscriptionTier - read by utils/adminUsers.js getUserSubscription().
  //               Users without it are treated as "Normal" (no subscription).
  // No payments, subscriptions, reviews, disputes or appointments are attached:
  // those live in other stores and are not invented here.
  {
    id: 'user-aditya-rao',
    role: ROLES.USER,
    name: 'Aditya Rao',
    email: 'aditya.rao@astroconnect.com',
    phone: '+91 90001 20001',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-01-18T09:20:00+05:30',
    subscriptionTier: 'Silver',
  },
  {
    id: 'user-nisha-pillai',
    role: ROLES.USER,
    name: 'Nisha Pillai',
    email: 'nisha.pillai@astroconnect.com',
    phone: '+91 90001 20002',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    createdAt: '2026-02-11T14:05:00+05:30',
  },
  {
    id: 'user-harish-menon',
    role: ROLES.USER,
    name: 'Harish Menon',
    email: 'harish.menon@astroconnect.com',
    phone: '+91 90001 20003',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-03-06T11:40:00+05:30',
    subscriptionTier: 'Gold',
  },
  {
    id: 'user-bhavana-iyer',
    role: ROLES.USER,
    name: 'Bhavana Iyer',
    email: 'bhavana.iyer@astroconnect.com',
    phone: '+91 90001 20004',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    createdAt: '2026-04-22T08:15:00+05:30',
  },
  {
    id: 'user-rakesh-shetty',
    role: ROLES.USER,
    name: 'Rakesh Shetty',
    email: 'rakesh.shetty@astroconnect.com',
    phone: '+91 90001 20005',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-05-14T19:30:00+05:30',
    subscriptionTier: 'Platinum',
  },
  {
    id: 'user-sneha-kulkarni',
    role: ROLES.USER,
    name: 'Sneha Kulkarni',
    email: 'sneha.kulkarni@astroconnect.com',
    phone: '+91 90001 20006',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-06-09T16:50:00+05:30',
    subscriptionTier: 'Silver',
  },
  {
    id: 'user-imran-sheikh',
    role: ROLES.USER,
    name: 'Imran Sheikh',
    email: 'imran.sheikh@astroconnect.com',
    phone: '+91 90001 20007',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-07-21T10:10:00+05:30',
    subscriptionTier: 'Gold',
  },
  {
    id: 'user-leela-krishnan',
    role: ROLES.USER,
    name: 'Leela Krishnan',
    email: 'leela.krishnan@astroconnect.com',
    phone: '+91 90001 20008',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-08-13T13:25:00+05:30',
    subscriptionTier: 'Platinum',
  },
  {
    id: 'user-farhan-qureshi',
    role: ROLES.USER,
    name: 'Farhan Qureshi',
    email: 'farhan.qureshi@astroconnect.com',
    phone: '+91 90001 20009',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-09-16T17:45:00+05:30',
    subscriptionTier: 'Silver',
  },
  {
    id: 'user-tara-nair',
    role: ROLES.USER,
    name: 'Tara Nair',
    email: 'tara.nair@astroconnect.com',
    phone: '+91 90001 20010',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Silver',
    createdAt: '2026-10-02T09:00:00+05:30',
  },
  {
    id: 'user-vivek-das',
    role: ROLES.USER,
    name: 'Vivek Das',
    email: 'vivek.das@astroconnect.com',
    phone: '+91 90001 20011',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Gold',
    createdAt: '2026-10-07T15:20:00+05:30',
  },
  {
    id: 'user-ananya-bhat',
    role: ROLES.USER,
    name: 'Ananya Bhat',
    email: 'ananya.bhat@astroconnect.com',
    phone: '+91 90001 20012',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Platinum',
    createdAt: '2026-10-11T18:45:00+05:30',
  },
  {
    id: 'user-dev-kapoor',
    role: ROLES.USER,
    name: 'Dev Kapoor',
    email: 'dev.kapoor@astroconnect.com',
    phone: '+91 90001 20013',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Silver',
    createdAt: '2026-10-15T12:10:00+05:30',
  },
  {
    id: 'user-pooja-mehta',
    role: ROLES.USER,
    name: 'Pooja Mehta',
    email: 'pooja.mehta@astroconnect.com',
    phone: '+91 90001 20014',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Gold',
    createdAt: '2026-10-18T21:05:00+05:30',
  },
  {
    id: 'user-vikram-joshi',
    role: ROLES.USER,
    name: 'Vikram Joshi',
    email: 'vikram.joshi@astroconnect.com',
    phone: '+91 90001 20015',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Platinum',
    createdAt: '2026-10-20T08:30:00+05:30',
  },
  {
    id: 'user-aarav-nair-1',
    role: ROLES.USER,
    name: 'Aarav Nair',
    email: 'aarav.nair10@astroconnect.com',
    phone: '+91 90010 000',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-01-01T10:30:00+05:30',
  },
  {
    id: 'user-diya-verma-2',
    role: ROLES.USER,
    name: 'Diya Verma',
    email: 'diya.verma11@astroconnect.com',
    phone: '+91 90010 138',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-02-06T10:30:00+05:30',
  },
  {
    id: 'user-kabir-bose-3',
    role: ROLES.USER,
    name: 'Kabir Bose',
    email: 'kabir.bose12@astroconnect.com',
    phone: '+91 90010 276',
    password: 'User@123',
    specialization: '',
    experience: '',
    createdAt: '2026-03-11T10:30:00+05:30',
  },
  {
    id: 'user-saanvi-menon-4',
    role: ROLES.USER,
    name: 'Saanvi Menon',
    email: 'saanvi.menon13@astroconnect.com',
    phone: '+91 90010 411',
    password: 'User@123',
    specialization: '',
    experience: '',
    subscriptionTier: 'Silver',
    createdAt: '2026-04-10T10:30:00+05:30',
  },
  {
    id: 'user-neha-saxena-5',
    role: ROLES.USER,
    name: 'Neha Saxena',
    email: 'neha.saxena14@astroconnect.com',
    phone: '+91 90010 549',
    password: 'User@123',
    specialization: '',
    experience: '',
    subscriptionTier: 'Silver',
    createdAt: '2026-05-15T10:30:00+05:30',
  },
  {
    id: 'user-aditya-hegde-6',
    role: ROLES.USER,
    name: 'Aditya Hegde',
    email: 'aditya.hegde15@astroconnect.com',
    phone: '+91 90010 687',
    password: 'User@123',
    specialization: '',
    experience: '',
    subscriptionTier: 'Silver',
    createdAt: '2026-06-20T10:30:00+05:30',
  },
  {
    id: 'user-maya-pandey-7',
    role: ROLES.USER,
    name: 'Maya Pandey',
    email: 'maya.pandey16@astroconnect.com',
    phone: '+91 90010 822',
    password: 'User@123',
    specialization: '',
    experience: '',
    subscriptionTier: 'Gold',
    createdAt: '2026-07-19T10:30:00+05:30',
  },
  {
    id: 'user-sana-khan-8',
    role: ROLES.USER,
    name: 'Sana Khan',
    email: 'sana.khan17@astroconnect.com',
    phone: '+91 90010 960',
    password: 'User@123',
    specialization: '',
    experience: '',
    subscriptionTier: 'Gold',
    createdAt: '2026-08-24T10:30:00+05:30',
  },
  {
    id: 'user-zara-kulkarni-9',
    role: ROLES.USER,
    name: 'Zara Kulkarni',
    email: 'zara.kulkarni18@astroconnect.com',
    phone: '+91 90011 098',
    password: 'User@123',
    specialization: '',
    experience: '',
    subscriptionTier: 'Gold',
    createdAt: '2026-09-02T10:30:00+05:30',
  },
  {
    id: 'user-yash-pillai-10',
    role: ROLES.USER,
    name: 'Yash Pillai',
    email: 'yash.pillai19@astroconnect.com',
    phone: '+91 90011 233',
    password: 'User@123',
    specialization: '',
    experience: '',
    subscriptionTier: 'Platinum',
    createdAt: '2026-01-01T10:30:00+05:30',
  },
  {
    id: 'user-kian-ali-11',
    role: ROLES.USER,
    name: 'Kian Ali',
    email: 'kian.ali20@astroconnect.com',
    phone: '+91 90011 371',
    password: 'User@123',
    specialization: '',
    experience: '',
    subscriptionTier: 'Platinum',
    createdAt: '2026-02-06T10:30:00+05:30',
  },
  {
    id: 'user-arun-bhatia-12',
    role: ROLES.USER,
    name: 'Arun Bhatia',
    email: 'arun.bhatia21@astroconnect.com',
    phone: '+91 90011 509',
    password: 'User@123',
    specialization: '',
    experience: '',
    subscriptionTier: 'Platinum',
    createdAt: '2026-03-11T10:30:00+05:30',
  },
  {
    id: 'user-aarav-gill-13',
    role: ROLES.USER,
    name: 'Aarav Gill',
    email: 'aarav.gill22@astroconnect.com',
    phone: '+91 90011 644',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    createdAt: '2026-04-10T10:30:00+05:30',
  },
  {
    id: 'user-diya-sharma-14',
    role: ROLES.USER,
    name: 'Diya Sharma',
    email: 'diya.sharma23@astroconnect.com',
    phone: '+91 90011 782',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    createdAt: '2026-05-15T10:30:00+05:30',
  },
  {
    id: 'user-kabir-das-15',
    role: ROLES.USER,
    name: 'Kabir Das',
    email: 'kabir.das24@astroconnect.com',
    phone: '+91 90011 920',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    createdAt: '2026-06-20T10:30:00+05:30',
  },
  {
    id: 'user-saanvi-gupta-16',
    role: ROLES.USER,
    name: 'Saanvi Gupta',
    email: 'saanvi.gupta25@astroconnect.com',
    phone: '+91 90012 055',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Silver',
    createdAt: '2026-07-19T10:30:00+05:30',
  },
  {
    id: 'user-neha-bhat-17',
    role: ROLES.USER,
    name: 'Neha Bhat',
    email: 'neha.bhat26@astroconnect.com',
    phone: '+91 90012 193',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Silver',
    createdAt: '2026-08-24T10:30:00+05:30',
  },
  {
    id: 'user-aditya-chauhan-18',
    role: ROLES.USER,
    name: 'Aditya Chauhan',
    email: 'aditya.chauhan27@astroconnect.com',
    phone: '+91 90012 331',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Silver',
    createdAt: '2026-09-02T10:30:00+05:30',
  },
  {
    id: 'user-maya-malhotra-19',
    role: ROLES.USER,
    name: 'Maya Malhotra',
    email: 'maya.malhotra28@astroconnect.com',
    phone: '+91 90012 466',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Gold',
    createdAt: '2026-01-01T10:30:00+05:30',
  },
  {
    id: 'user-sana-roy-20',
    role: ROLES.USER,
    name: 'Sana Roy',
    email: 'sana.roy29@astroconnect.com',
    phone: '+91 90012 604',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Gold',
    createdAt: '2026-02-06T10:30:00+05:30',
  },
  {
    id: 'user-zara-reddy-21',
    role: ROLES.USER,
    name: 'Zara Reddy',
    email: 'zara.reddy30@astroconnect.com',
    phone: '+91 90012 742',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Gold',
    createdAt: '2026-03-11T10:30:00+05:30',
  },
  {
    id: 'user-yash-nair-22',
    role: ROLES.USER,
    name: 'Yash Nair',
    email: 'yash.nair31@astroconnect.com',
    phone: '+91 90012 877',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Platinum',
    createdAt: '2026-04-10T10:30:00+05:30',
  },
  {
    id: 'user-kian-verma-23',
    role: ROLES.USER,
    name: 'Kian Verma',
    email: 'kian.verma32@astroconnect.com',
    phone: '+91 90013 015',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Platinum',
    createdAt: '2026-05-15T10:30:00+05:30',
  },
  {
    id: 'user-arun-bose-24',
    role: ROLES.USER,
    name: 'Arun Bose',
    email: 'arun.bose33@astroconnect.com',
    phone: '+91 90013 153',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'suspended',
    subscriptionTier: 'Platinum',
    createdAt: '2026-06-20T10:30:00+05:30',
  },
  {
    id: 'user-aarav-menon-25',
    role: ROLES.USER,
    name: 'Aarav Menon',
    email: 'aarav.menon34@astroconnect.com',
    phone: '+91 90013 288',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    createdAt: '2026-07-19T10:30:00+05:30',
  },
  {
    id: 'user-diya-saxena-26',
    role: ROLES.USER,
    name: 'Diya Saxena',
    email: 'diya.saxena35@astroconnect.com',
    phone: '+91 90013 426',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    createdAt: '2026-08-24T10:30:00+05:30',
  },
  {
    id: 'user-kabir-hegde-27',
    role: ROLES.USER,
    name: 'Kabir Hegde',
    email: 'kabir.hegde36@astroconnect.com',
    phone: '+91 90013 564',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    createdAt: '2026-09-02T10:30:00+05:30',
  },
  {
    id: 'user-saanvi-pandey-28',
    role: ROLES.USER,
    name: 'Saanvi Pandey',
    email: 'saanvi.pandey37@astroconnect.com',
    phone: '+91 90013 699',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Silver',
    createdAt: '2026-01-01T10:30:00+05:30',
  },
  {
    id: 'user-neha-khan-29',
    role: ROLES.USER,
    name: 'Neha Khan',
    email: 'neha.khan38@astroconnect.com',
    phone: '+91 90013 837',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Silver',
    createdAt: '2026-02-06T10:30:00+05:30',
  },
  {
    id: 'user-aditya-kulkarni-30',
    role: ROLES.USER,
    name: 'Aditya Kulkarni',
    email: 'aditya.kulkarni39@astroconnect.com',
    phone: '+91 90013 975',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Silver',
    createdAt: '2026-03-11T10:30:00+05:30',
  },
  {
    id: 'user-maya-pillai-31',
    role: ROLES.USER,
    name: 'Maya Pillai',
    email: 'maya.pillai40@astroconnect.com',
    phone: '+91 90014 110',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Gold',
    createdAt: '2026-04-10T10:30:00+05:30',
  },
  {
    id: 'user-sana-ali-32',
    role: ROLES.USER,
    name: 'Sana Ali',
    email: 'sana.ali41@astroconnect.com',
    phone: '+91 90014 248',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Gold',
    createdAt: '2026-05-15T10:30:00+05:30',
  },
  {
    id: 'user-zara-bhatia-33',
    role: ROLES.USER,
    name: 'Zara Bhatia',
    email: 'zara.bhatia42@astroconnect.com',
    phone: '+91 90014 386',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Gold',
    createdAt: '2026-06-20T10:30:00+05:30',
  },
  {
    id: 'user-yash-gill-34',
    role: ROLES.USER,
    name: 'Yash Gill',
    email: 'yash.gill43@astroconnect.com',
    phone: '+91 90014 521',
    password: 'User@123',
    specialization: '',
    experience: '',
    status: 'blocked',
    subscriptionTier: 'Platinum',
    createdAt: '2026-07-19T10:30:00+05:30',
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

// The three account states the record can hold. These are exactly the values
// utils/adminUsers.js#getUserAccountStatus reads back (`status`, then
// `accountStatus`, defaulting to active), so writing one here is immediately
// visible to the admin Users list, the profile page and its status filter.
const USER_ACCOUNT_STATUSES = ['active', 'suspended', 'blocked']

function seedUsers() {
  const stored = readJSON(USERS_STORAGE_KEY, null)
  if (Array.isArray(stored) && stored.length) {
    const defaultsById = new Map(defaultUsers.map((entry) => [entry.id, entry]))
    const merged = stored.map((entry) => {
      const fallback = defaultsById.get(entry.id)
      if (!fallback) return normalizeUser(entry)
      // Demo backfill: a stored copy from before a demo field existed keeps its
      // stored value for everything else, but picks up a missing demo-only field
      // (status, subscriptionTier, createdAt) so the seeded demo data stays
      // visible across reloads.
      return normalizeUser({
        ...entry,
        status: entry.status ?? fallback.status,
        subscriptionTier: entry.subscriptionTier ?? fallback.subscriptionTier,
        createdAt: entry.createdAt ?? fallback.createdAt,
      })
    })
    const storedIds = new Set(stored.map((entry) => entry.id))
    for (const entry of defaultUsers) {
      if (!storedIds.has(entry.id)) merged.push(normalizeUser(entry))
    }
    writeJSON(USERS_STORAGE_KEY, merged)
    return merged
  }
  writeJSON(USERS_STORAGE_KEY, defaultUsers)
  return defaultUsers
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(seedUsers)
  const [currentUser, setCurrentUser] = useState(() => readJSON(AUTH_STORAGE_KEY, null) || readJSON(EDITOR_SESSION_KEY, null))

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
      const name = String(payload.name || '').trim()
      const email = normalizeEmail(payload.email)
      if (!name) throw new Error('Enter your name.')
      if (!email || !email.endsWith('.com')) throw new Error('Enter a valid .com email address.')
      if (users.some((entry) => entry.id !== currentUser.id && entry.email.toLowerCase() === email)) {
        throw new Error('An account with this email already exists.')
      }

      const updatedUser = {
        ...currentUser,
        name,
        email,
        phone: String(payload.phone || '').trim(),
        gender: String(payload.gender ?? currentUser.gender ?? '').trim(),
        dateOfBirth: String(payload.dateOfBirth ?? currentUser.dateOfBirth ?? '').trim(),
        birthTime: String(payload.birthTime ?? currentUser.birthTime ?? '').trim(),
        birthPlace: String(payload.birthPlace ?? currentUser.birthPlace ?? '').trim(),
        horoscopeDetails: String(payload.horoscopeDetails ?? currentUser.horoscopeDetails ?? '').trim(),
        rasi: String(payload.rasi ?? currentUser.rasi ?? '').trim(),
        nakshatra: String(payload.nakshatra ?? currentUser.nakshatra ?? '').trim(),
        lagna: String(payload.lagna ?? currentUser.lagna ?? '').trim(),
        specialization: String(payload.specialization || '').trim(),
        experience: String(payload.experience || '').trim(),
        bio: String(payload.bio || '').trim(),
        languages: Array.isArray(payload.languages)
          ? payload.languages
          : String(payload.languages || '').split(',').map((language) => language.trim()).filter(Boolean),
        profileImage: String(payload.profileImage || '').trim(),
        astrologerPreferencesEnabled: Boolean(payload.astrologerPreferencesEnabled ?? currentUser.astrologerPreferencesEnabled ?? false),
        astrologerPreferences: payload.astrologerPreferences || currentUser.astrologerPreferences || { languages: [], astrologerTypes: [], consultationTitles: [], methods: [], topics: [] },
      }
      const profileFields = ['name', 'email', 'phone', 'bio', 'profileImage']
      const birthFields = ['gender', 'dateOfBirth', 'birthTime', 'birthPlace', 'horoscopeDetails', 'rasi', 'nakshatra', 'lagna']
      const changedProfileFields = profileFields.filter((field) => updatedUser[field] !== currentUser[field])
      const changedBirthFields = birthFields.filter((field) => updatedUser[field] !== currentUser[field])
      if (changedProfileFields.length) {
        recordUserActivity({ userId: currentUser.id, type: 'profile', title: 'Profile updated', summary: `Updated ${changedProfileFields.join(', ')}.`, metadata: changedProfileFields.join(', ') })
      }
      if (changedBirthFields.length) {
        recordUserActivity({ userId: currentUser.id, type: 'horoscope', title: 'Horoscope details updated', summary: 'Your birth or horoscope details were updated.', metadata: changedBirthFields.join(', ') })
      }
      if (payload.dateOfBirth !== undefined || payload.birthTime !== undefined || payload.birthPlace !== undefined || payload.horoscopeDetails !== undefined || payload.rasi !== undefined || payload.nakshatra !== undefined || payload.lagna !== undefined) {
        writeJSON('astroconnect-user-birth-details', {
          name: updatedUser.name,
          dateOfBirth: updatedUser.dateOfBirth,
          timeOfBirth: updatedUser.birthTime,
          placeOfBirth: updatedUser.birthPlace,
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
    // Admin status management. Writes only the account's existing `status` field,
    // using the same three values the admin status filter already understands.
    // Persistence needs nothing new: the effect above already mirrors `users` into
    // localStorage, so the change survives a reload.
    //
    // This deliberately does NOT touch login(). A blocked or suspended account is
    // recorded and displayed, but sign-in enforcement is a separate correction and
    // is intentionally left alone here.
    setUserAccountStatus(userId, status) {
      const normalized = String(status || '').trim().toLowerCase()
      if (!USER_ACCOUNT_STATUSES.includes(normalized)) {
        throw new Error(`Unsupported account status: ${status}`)
      }
      setUsers((prev) => prev.map((entry) => (entry.id === userId ? { ...entry, status: normalized } : entry)))
      return normalized
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
