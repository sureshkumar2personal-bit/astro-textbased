// Runs the Vercel serverless functions in /api inside `vite` (npm run dev) and `vite preview` (npm run preview).
//
// Why: on Vercel, /api/<name> executes api/<name>.js. Plain Vite has no idea about that folder, so locally
// `GET /api/consultations` returned the function's *source code* as JavaScript (HTTP 200), the client could
// not parse it as JSON, and cross-browser / cross-device request sync silently stayed off.
//
// This plugin only exists in the dev/preview servers (it is not part of `vite build`). It reads the same
// environment variables Vercel provides (.env.local from `vercel env pull`, or your shell) and never contains
// credentials itself. Set LOCAL_API=off to disable it and keep everything browser-local.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

const MAX_BODY_BYTES = 1024 * 1024
// Each entry is a list of alternatives; at least one variable of every group must be set.
const REQUIRED_ENV = {
  consultations: [['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL'], ['KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN']],
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) { reject(new Error('Request body too large')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

// Vercel's Node helpers: res.status(code).json(body) and a parsed req.body / req.query.
function addVercelHelpers(res) {
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (body) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
    return res
  }
}

export default function localApi({ apiDir = 'api' } = {}) {
  let root = process.cwd()
  let warned = false

  const warnOnce = (message) => {
    if (warned) return
    warned = true
    console.warn(`\n[local-api] ${message}\n`)
  }

  const createMiddleware = (loadModule) => async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')
    const match = /^\/api\/([a-z0-9-]+)\/?$/i.exec(url.pathname)
    if (!match) return next()
    const name = match[1]
    const file = path.join(root, apiDir, `${name}.js`)
    if (!existsSync(file)) return next()

    addVercelHelpers(res)
    res.setHeader('Cache-Control', 'no-store')
    try {
      const missing = (REQUIRED_ENV[name] || []).find((group) => !group.some((key) => process.env[key]))
      if (missing) {
        warnOnce(`/api/${name} is disabled: set ${missing.join(' or ')} in .env.local (run \`vercel env pull .env.local\`) to share requests across browsers. The app keeps working with browser-local data.`)
        return res.status(503).json({ error: 'Shared store is not configured for local development' })
      }
      const raw = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' ? await readBody(req) : ''
      try { req.body = raw && /json/i.test(req.headers['content-type'] || '') ? JSON.parse(raw) : raw || undefined } catch { req.body = undefined }
      req.query = Object.fromEntries(url.searchParams)
      const handler = (await loadModule(file)).default
      if (typeof handler !== 'function') throw new Error(`api/${name}.js has no default export function`)
      await handler(req, res)
    } catch (error) {
      console.error(`[local-api] /api/${name} failed:`, error)
      if (!res.headersSent) res.status(500).json({ error: 'Local API error' })
      else res.end()
    }
  }

  const prepare = (config) => {
    root = config.root
    // Mirror `vercel dev`: variables from .env* files fill in whatever the shell has not already set.
    const fileEnv = loadEnv(config.mode, config.envDir || root, '')
    for (const [key, value] of Object.entries(fileEnv)) if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    name: 'local-vercel-api',
    apply: (_config, { command }) => command === 'serve' && process.env.LOCAL_API !== 'off',
    configResolved: prepare,
    // Registered directly (not in a returned hook), so it runs before Vite serves /api/*.js as a source file.
    configureServer(server) {
      server.middlewares.use(createMiddleware((file) => server.ssrLoadModule(file))) // dev: picks up edits to api/*.js
    },
    configurePreviewServer(server) {
      server.middlewares.use(createMiddleware((file) => import(pathToFileURL(file).href)))
    },
  }
}
