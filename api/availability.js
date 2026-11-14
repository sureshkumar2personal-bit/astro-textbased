// Astrologer instant-consultation availability (Upstash Redis via the Vercel Marketplace).
//   GET  /api/availability?astrologerId=ID -> { availability: { chatEnabled, callEnabled, dndEnabled, updatedAt } }
//   GET  /api/availability                 -> { availabilities: { [astrologerId]: {...} } }  (everyone who ever saved settings)
//   POST /api/availability { astrologerId, chatEnabled?, callEnabled?, dndEnabled? } -> same shape (partial update)
//
// api/consultations.js reads the same record, so a request for an unavailable astrologer is refused by the
// server even if the browser skips its own checks. Active sessions and appointments are never touched here.
//
// NOTE: this demo has no server-side sessions (sign-in lives in the browser), so POST cannot prove who the caller
// is. Before production, require a verified astrologer identity here (and match it to astrologerId).
import { Redis } from '@upstash/redis'
import { instantAvailability, normalizeAvailability } from '../src/utils/astrologerAvailability.js'

export const AVAILABILITY_KEY = 'astroconnect:astrologer-availability'
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/
const FLAGS = ['chatEnabled', 'callEnabled', 'dndEnabled']

let redis
function getRedis() {
  if (!redis) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) throw new Error('Redis environment variables are not configured')
    redis = new Redis({ url, token })
  }
  return redis
}

const parse = (value) => {
  if (value && typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return null }
}

/** Stored settings for one astrologer (defaults when none were saved), plus derived chat/call availability. */
export async function readAvailability(db, astrologerId) {
  const stored = parse(await db.hget(AVAILABILITY_KEY, astrologerId))
  const settings = normalizeAvailability(stored)
  return { ...settings, updatedAt: stored?.updatedAt || null, ...instantAvailability(settings) }
}

const present = ({ chatEnabled, callEnabled, dndEnabled, updatedAt, chat, call }) => ({ chatEnabled, callEnabled, dndEnabled, updatedAt, chatAvailable: chat, callAvailable: call })

export function createAvailabilityHandler(getDb = getRedis) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    try {
      const db = getDb()
      if (req.method === 'GET') {
        const id = String(req.query?.astrologerId || '')
        if (!id) {
          const all = (await db.hgetall(AVAILABILITY_KEY)) || {}
          const availabilities = {}
          for (const [key, value] of Object.entries(all)) {
            const stored = parse(value)
            if (stored) availabilities[key] = present({ ...normalizeAvailability(stored), updatedAt: stored.updatedAt || null, ...instantAvailability(normalizeAvailability(stored)) })
          }
          return res.status(200).json({ availabilities })
        }
        if (!ID_PATTERN.test(id)) return res.status(400).json({ error: 'astrologerId is invalid' })
        return res.status(200).json({ availability: present(await readAvailability(db, id)) })
      }

      if (req.method === 'POST') {
        const body = req.body && typeof req.body === 'object' ? req.body : {}
        const id = String(body.astrologerId || '')
        if (!ID_PATTERN.test(id)) return res.status(400).json({ error: 'astrologerId is required' })
        const patch = {}
        for (const flag of FLAGS) {
          if (body[flag] === undefined) continue
          if (typeof body[flag] !== 'boolean') return res.status(400).json({ error: `${flag} must be true or false` })
          patch[flag] = body[flag]
        }
        if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update' })
        const current = normalizeAvailability(parse(await db.hget(AVAILABILITY_KEY, id)))
        await db.hset(AVAILABILITY_KEY, { [id]: JSON.stringify({ ...current, ...patch, updatedAt: new Date().toISOString() }) })
        return res.status(200).json({ availability: present(await readAvailability(db, id)) })
      }

      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ error: 'Method not allowed' })
    } catch (error) {
      console.error('availability api error', error)
      return res.status(500).json({ error: 'Availability store unavailable' })
    }
  }
}

export default createAvailabilityHandler()
