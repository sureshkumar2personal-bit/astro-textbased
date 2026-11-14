// Shared instant-consultation store (Upstash Redis via the Vercel Marketplace).
//   GET  /api/consultations            -> { requests: [...] }  (updated within the last 30 days)
//   POST /api/consultations {requests} -> upserts (newest updatedAt wins, messages unioned) and returns { requests }
import { Redis } from '@upstash/redis'
import { isSyncable, mergeRequest } from '../src/utils/consultationMerge.js'
import { UNAVAILABLE_REASON, canStartInstant } from '../src/utils/astrologerAvailability.js'
import { readAvailability } from './availability.js'

const KEY = 'astroconnect:instant-consultations'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const MAX_BATCH = 25
const MAX_RECORD_BYTES = 64 * 1024

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

async function listRecent(db) {
  const all = (await db.hgetall(KEY)) || {}
  const cutoff = Date.now() - MAX_AGE_MS
  return Object.values(all)
    .map(parse)
    .filter((request) => request && isSyncable(request) && new Date(request.updatedAt || request.createdAt || 0).getTime() >= cutoff)
}

const FINISHED = ['ended', 'cancelled', 'rejected']
const LOCK_SECONDS = 5

/**
 * Server-side gate for a NEW instant request (one the store has not seen yet). Existing records, finished records and
 * everything that is not a chat/call are untouched, so active sessions keep running when the astrologer turns a service off.
 * Returns a refusal reason, or null when the request may be stored.
 */
async function refuseNewRequest(db, request) {
  if (FINISHED.includes(request.status)) return null
  if (request.type !== 'chat' && request.type !== 'call') return 'invalid-type'
  if (typeof request.astrologerId !== 'string' || !request.astrologerId) return 'invalid-astrologer'
  const availability = await readAvailability(db, request.astrologerId)
  if (!canStartInstant(availability, request.type)) return UNAVAILABLE_REASON
  // One waiting request per user, astrologer and service: a short lock serialises concurrent creates for the same key.
  if (request.status === 'ringing') {
    const lockKey = `${KEY}:lock:${request.userId}:${request.astrologerId}:${request.type}`
    const locked = await db.set(lockKey, request.id, { nx: true, ex: LOCK_SECONDS })
    if (!locked) return 'duplicate'
    const all = Object.values((await db.hgetall(KEY)) || {}).map(parse)
    const duplicate = all.find((entry) => entry && entry.id !== request.id && entry.status === 'ringing' && entry.userId === request.userId && entry.astrologerId === request.astrologerId && entry.type === request.type)
    if (duplicate) return 'duplicate'
  }
  return null
}

export function createConsultationsHandler(getDb = getRedis) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    try {
      const db = getDb()
      if (req.method === 'GET') return res.status(200).json({ requests: await listRecent(db) })

      if (req.method === 'POST') {
        const incoming = Array.isArray(req.body?.requests) ? req.body.requests.slice(0, MAX_BATCH) : []
        const rejected = []
        for (const request of incoming) {
          if (!isSyncable(request) || request.id.length > 100) continue
          if (JSON.stringify(request).length > MAX_RECORD_BYTES) continue
          const current = parse(await db.hget(KEY, request.id))
          if (!current) {
            const reason = await refuseNewRequest(db, request)
            if (reason) { rejected.push({ id: request.id, reason }); continue }
          }
          await db.hset(KEY, { [request.id]: JSON.stringify(mergeRequest(current, request)) })
        }
        return res.status(200).json({ requests: await listRecent(db), rejected })
      }

      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ error: 'Method not allowed' })
    } catch (error) {
      console.error('consultations api error', error)
      return res.status(500).json({ error: 'Consultation store unavailable' })
    }
  }
}

export default createConsultationsHandler()
