import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck, Sparkles } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import { useAdmin } from '../../state/AdminContext.jsx'
import { getRoleRoutes, ROLES } from '../../utils/roleRoutes.js'

// Admin sign-in, modelled on pages/editor/EditorLogin.jsx and styled with the
// same design tokens as the rest of the app (no separate stylesheet, so it
// inherits light/dark for free).
//
// Sign-in contract, stated plainly: this page performs NO credential
// verification. An address is accepted when it appears in the admin store
// (`astroconnect-admin-users`), which is populated from the VITE_ADMIN_EMAILS
// allowlist or provisioned externally. That is a demo-grade placeholder that
// matches how the app's other staff role works today, and it is NOT access
// control: anyone can add an address to localStorage. Before this portal is
// exposed to real operators it must be replaced with server-verified
// credentials and server-side authorization on every admin request.

const ADMIN_ROUTES = getRoleRoutes(ROLES.ADMIN)

export default function AdminLogin() {
  const { currentAdmin, loginAdmin, isAdminConfigured, adminEmailsEnv } = useAdmin()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  if (currentAdmin) {
    return <Navigate to={ADMIN_ROUTES.dashboard} replace />
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    try {
      loginAdmin({ email })
      navigate(ADMIN_ROUTES.dashboard, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_8%,rgba(139,92,246,0.08),transparent_42%),radial-gradient(circle_at_90%_92%,rgba(255,138,76,0.07),transparent_44%),linear-gradient(180deg,var(--surface-strong)_0%,var(--primary-bg)_100%)] px-5 py-8 sm:px-8">
      <ThemeToggle className="absolute right-5 top-5 z-10" />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div className="rounded-[28px] border border-[color:var(--surface-border)] bg-[color:var(--surface-strong)] p-7 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-9">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--gold-400),var(--coral-500))]">
              <ShieldCheck size={22} color="var(--primary-dark)" />
            </span>
            <div>
              <div className="font-['Space_Grotesk'] text-lg font-bold text-[color:var(--ink)]">Astro Connect</div>
              <div className="text-sm text-[color:var(--muted)]">Platform administration</div>
            </div>
          </div>

          <div className="mt-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--primary-bg)] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--primary)]">
              <Sparkles size={13} /> Restricted access
            </div>
            <h1 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold text-[color:var(--ink)]">Administrator sign in</h1>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              This portal is for platform administrators only. Use the address your platform operator provisioned.
            </p>
          </div>

          {!isAdminConfigured && (
            <div className="mt-6 rounded-[14px] border border-[color:var(--gold-400)] bg-[color:var(--primary-bg)] p-4 text-sm leading-6 text-[color:var(--body)]">
              No administrator is provisioned on this device yet. Add an address to the{' '}
              <code className="font-semibold text-[color:var(--ink)]">astroconnect-admin-users</code> store, or set{' '}
              <code className="font-semibold text-[color:var(--ink)]">{adminEmailsEnv}</code> and reload.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
              Administrator email
              <input
                type="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-[12px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-[color:var(--ink)] outline-none transition focus:border-[color:var(--secondary)]"
              />
            </label>

            {error && (
              <div className="rounded-[14px] border border-[color:var(--red-100)] bg-[color:var(--red-100)] px-4 py-3 text-sm font-medium text-[color:var(--red-600)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,var(--primary),var(--primary-light))] px-4 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(109,40,217,0.24)] transition duration-200 hover:-translate-y-0.5"
            >
              Sign in to Platform Admin
            </button>
          </form>

          <div className="mt-5 text-center text-xs leading-5 text-[color:var(--muted)]">
            Sessions are stored per device and are not secured by a server. Every action taken here is recorded to the
            admin audit log.
          </div>
        </div>

        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-[color:var(--primary)]">
          ← Back to role selection
        </Link>
      </main>
    </div>
  )
}
