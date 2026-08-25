import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Sparkles, Shield, UserRound } from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { getRoleRoutes, ROLES } from '../utils/roleRoutes.js'

export default function AuthPage({ mode, selectedRole }) {
  const navigate = useNavigate()
  const { currentUser, login, register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registering, setRegistering] = useState(false)
  const [name, setName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [horoscopeDetails, setHoroscopeDetails] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [experience, setExperience] = useState('')
  const [languages, setLanguages] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const isLogin = mode === 'login' && !registering
  const role = selectedRole === ROLES.ASTROLOGER ? ROLES.ASTROLOGER : ROLES.USER
  const routes = useMemo(() => getRoleRoutes(role), [role])

  if (currentUser) {
    return <Navigate to={getRoleRoutes(currentUser.role).dashboard} replace />
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    try {
      if (isLogin) {
        login({ email, password, role })
      } else {
        if (!name.trim()) throw new Error('Enter your name.')
        if (role === ROLES.USER && (!dateOfBirth || !birthTime || !birthPlace)) throw new Error('Complete your birth details to create a User account.')
        if (role === ROLES.ASTROLOGER && (!specialization.trim() || !experience.trim() || !languages.trim())) throw new Error('Complete your professional details to create an Astrologer account.')
        register({ role, name, email, password, dateOfBirth, birthTime, birthPlace, horoscopeDetails, specialization, experience, languages: languages.split(',').map((value) => value.trim()).filter(Boolean) })
      }

      navigate(routes.dashboard, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_6%,rgba(139,92,246,0.08),transparent_42%),radial-gradient(circle_at_92%_90%,rgba(255,138,76,0.07),transparent_44%),linear-gradient(180deg,var(--surface-strong)_0%,var(--primary-bg)_100%)] px-5 py-8 text-[color:var(--body)] sm:px-8">
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/70 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-[18px] lg:grid-cols-[1.05fr_0.95fr]">
        <ThemeToggle className="absolute right-5 top-5 z-10" />
        <div className="flex flex-col justify-between bg-[linear-gradient(180deg,var(--sidebar-from)_0%,var(--sidebar-to)_100%)] p-8 text-white sm:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--gold-400),var(--coral-500))] shadow-[0_12px_26px_rgba(15,23,42,0.18)]">
              <Sparkles size={20} color="var(--primary-dark)" />
            </div>
            <div>
              <div className="font-['Space_Grotesk'] text-lg font-bold">Astro Connect</div>
              <div className="text-sm text-violet-200">Separate portals for every role</div>
            </div>
          </div>

          <div className="max-w-md space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-violet-100">
              Login Portal
            </div>
            <h1 className="font-['Space_Grotesk'] text-4xl font-bold leading-tight text-white sm:text-5xl">
              {role === ROLES.USER ? 'User access for purchases, questions, and disputes' : 'Astrologer access for queues, answers, and sales'}
            </h1>
            <p className="max-w-lg text-sm leading-6 text-violet-100">
              Each role has its own authentication path and dashboard. Use a `.com` email for User access or an `astro@...com` email for Astrologer access.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: UserRound,
                title: 'User Portal',
                text: 'Use a .com email to buy packages, ask questions, track answers, and raise disputes.',
              },
              {
                icon: Shield,
                title: 'Astrologer Workspace',
                text: 'Use an astro@...com email to review question queues, respond to users, and manage dispute resolution.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[18px] border border-white/10 bg-white/10 p-4">
                <item.icon size={18} />
                <div className="mt-3 font-['Space_Grotesk'] text-base font-bold text-white">{item.title}</div>
                <div className="mt-1 text-sm leading-6 text-violet-100">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.08em] text-[color:var(--violet-700)]">
                {role === ROLES.USER ? 'User Login' : 'Astrologer Login'}
              </div>
              <h2 className="mt-1 font-['Space_Grotesk'] text-3xl font-bold text-[color:var(--ink)]">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Sign in to your {role === ROLES.USER ? 'user' : 'astrologer'} portal.
              </p>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
                  {!isLogin && <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">Name<input required className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--ink)]" value={name} onChange={(event) => setName(event.target.value)} placeholder={role === ROLES.USER ? 'Your name' : 'Your professional name'} /></label>}
                  Email
                  <input
                    type="email"
                    className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--ink)] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_18px_rgba(15,23,42,0.04)] outline-none transition focus:border-[color:var(--secondary)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.16)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <div className="text-xs text-[color:var(--muted)]">
                    Use your email and password to sign in.
                  </div>
                </label>

                {!isLogin && role === ROLES.USER && <><label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">Date of Birth<input required type="date" className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--ink)]" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">Time of Birth<input required type="time" className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--ink)]" value={birthTime} onChange={(event) => setBirthTime(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">Place of Birth<input required className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--ink)]" value={birthPlace} onChange={(event) => setBirthPlace(event.target.value)} placeholder="City, Country" /></label><label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">Horoscope / Kundli Details<textarea className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--ink)]" value={horoscopeDetails} onChange={(event) => setHoroscopeDetails(event.target.value)} rows="2" /></label></>}
                {!isLogin && role === ROLES.ASTROLOGER && <><label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">Specializations<input required className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--ink)]" value={specialization} onChange={(event) => setSpecialization(event.target.value)} placeholder="Vedic, Marriage, Career" /></label><label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">Experience<input required className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--ink)]" value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="8 years" /></label><label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">Languages<input required className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 text-[color:var(--ink)]" value={languages} onChange={(event) => setLanguages(event.target.value)} placeholder="English, Hindi" /></label></>}

                <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
                  Password
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full rounded-[12px] border border-[color:var(--line)] bg-white px-4 py-3 pr-12 text-[color:var(--ink)] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_18px_rgba(15,23,42,0.04)] outline-none transition focus:border-[color:var(--secondary)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.16)]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={role === ROLES.USER ? 'User@123' : 'Astro@123'}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[color:var(--muted)] transition hover:text-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--secondary)]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </label>

              </div>

              {error && (
                <div className="mt-4 rounded-[14px] border border-[color:var(--red-100)] bg-[color:var(--red-100)] px-4 py-3 text-sm font-medium text-[color:var(--red-600)]">
                  {error}
                </div>
              )}

                <button
                  type="submit"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,var(--primary),var(--primary-light))] px-4 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(109,40,217,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(109,40,217,0.28)]"
                >
                {isLogin ? 'Login' : 'Create Account'}
                </button>
            </div>
            <button type="button" className="block w-full text-center text-sm font-semibold text-[color:var(--primary)]" onClick={() => { setRegistering((value) => !value); setError('') }}>{isLogin ? 'Create a new account' : 'Already have an account? Login'}</button>
            <Link to="/" className="block text-center text-sm font-semibold text-[color:var(--primary)]">← Choose a different role</Link>
          </form>
        </div>
      </div>
    </div>
  )
}
