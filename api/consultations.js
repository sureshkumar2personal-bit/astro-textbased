// Shared instant-consultation store (Upstash Redis via the Vercel Marketplace).
//   GET  /api/consultations            -> { requests: [...] }  (updated within the last 30 days)
//   POST /api/consultations {requests} -> upserts (newest updatedAt wins, messages unioned) and returns { requests }
import { Redis } from '@upstash/redis'
import { isSyncable, mergeRequest } from '../src/utils/consultationMerge.js'

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const db = getRedis()
    if (req.method === 'GET') return res.status(200).json({ requests: await listRecent(db) })

    if (req.method === 'POST') {
      const incoming = Array.isArray(req.body?.requests) ? req.body.requests.slice(0, MAX_BATCH) : []
      for (const request of incoming) {
        if (!isSyncable(request) || request.id.length > 100) continue
        if (JSON.stringify(request).length > MAX_RECORD_BYTES) continue
        const current = parse(await db.hget(KEY, request.id))
        await db.hset(KEY, { [request.id]: JSON.stringify(mergeRequest(current, request)) })
      }
      return res.status(200).json({ requests: await listRecent(db) })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('consultations api error', error)
    return res.status(500).json({ error: 'Consultation store unavailable' })
  }
}
