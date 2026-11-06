import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  User,
  Shield,
  Star,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  MapPin,
  Award,
  UploadCloud,
  AlertCircle,
  LogIn,
  UserPlus,
  ArrowRight,
  Smartphone,
  Key,
} from 'lucide-react'
import { useAuth } from '../state/AuthContext.jsx'
import { useEditor } from '../state/EditorContext.jsx'
import { getRoleRoutes, ROLES } from '../utils/roleRoutes.js'
import './auth-portal.css'

export default function AuthPage({ mode = 'login', selectedRole }) {
  const navigate = useNavigate()
  const { currentUser, login, register } = useAuth()
  const { editors, loginEditor } = useEditor()

  // Mode: 'signin' or 'signup'
  const [authMode, setAuthMode] = useState(mode === 'register' ? 'signup' : 'signin')

  // Role: 'user', 'astrologer', or 'admin'
  const initialRole = selectedRole === ROLES.ASTROLOGER
    ? 'astrologer'
    : selectedRole === 'admin' || selectedRole === ROLES.EDITOR
      ? 'admin'
      : 'user'
  const [currentRole, setCurrentRole] = useState(initialRole)

  // Core Auth Fields (Preserved Email & Password)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')

  // Sign Up Fields
  const [fullName, setFullName] = useState('')

  // User Specific Birth Details (For Kundli Chart)
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [birthPlace, setBirthPlace] = useState('')

  // Astrologer Specific Fields
  const [experience, setExperience] = useState('5')
  const [specialization, setSpecialization] = useState('vedic')

  // Admin Specific Fields
  const [adminKey, setAdminKey] = useState('')

  useEffect(() => {
    document.title = 'AstroConnect - Unified Authentication Portal'
  }, [])

  // Compute redirect route
  const targetRoleConstant = currentRole === 'astrologer'
    ? ROLES.ASTROLOGER
    : currentRole === 'admin'
      ? ROLES.EDITOR
      : ROLES.USER
  const routes = useMemo(() => getRoleRoutes(targetRoleConstant), [targetRoleConstant])

  if (currentUser) {
    navigate(getRoleRoutes(currentUser.role).dashboard, { replace: true })
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    try {
      if (authMode === 'signin') {
        if (!email.trim()) throw new Error('Please enter your email address.')
        if (!password) throw new Error('Please enter your password.')

        if (currentRole === 'admin') {
          // Check editor list
          const invitedEditor = editors.find((ed) => ed.email === email.trim().toLowerCase())
          if (invitedEditor) {
            loginEditor(invitedEditor, password)
            navigate('/editor/dashboard', { replace: true })
            return
          }
          // Default admin/editor login
          login({ email, password, role: ROLES.EDITOR })
          navigate('/editor/dashboard', { replace: true })
        } else if (currentRole === 'astrologer') {
          const invitedEditor = editors.find((ed) => ed.email === email.trim().toLowerCase())
          if (invitedEditor) {
            loginEditor(invitedEditor, password)
            navigate('/editor/dashboard', { replace: true })
            return
          }
          login({ email, password, role: ROLES.ASTROLOGER })
          navigate(routes.dashboard, { replace: true })
        } else {
          login({ email, password, role: ROLES.USER })
          navigate(routes.dashboard, { replace: true })
        }
      } else {
        // Sign Up Mode
        if (!fullName.trim()) throw new Error('Please enter your full name.')
        if (!email.trim()) throw new Error('Please enter your email address.')
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.')
        if (!agreedToTerms) throw new Error('Please agree to the Terms of Service and Privacy Policy.')

        if (currentRole === 'user') {
          if (!dateOfBirth || !birthTime || !birthPlace) {
            throw new Error('Please fill in your birth details for your Kundli chart.')
          }
          register({
            role: ROLES.USER,
            name: fullName,
            email,
            password,
            dateOfBirth,
            birthTime,
            birthPlace,
          })
          navigate('/user', { replace: true })
        } else if (currentRole === 'astrologer') {
          register({
            role: ROLES.ASTROLOGER,
            name: fullName,
            email,
            password,
            experience: `${experience} years`,
            specialization,
            languages: ['English', 'Hindi'],
          })
          navigate('/astrologer', { replace: true })
        } else if (currentRole === 'admin') {
          if (!adminKey.trim()) {
            throw new Error('Please provide the Administrative Security Passcode.')
          }
          login({ email, password, role: ROLES.EDITOR })
          navigate('/editor/dashboard', { replace: true })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify your credentials.')
    }
  }

  const roleLabels = {
    user: 'User',
    astrologer: 'Astrologer',
    admin: 'Admin',
  }

  return (
    <div className="auth-portal-page">
      {/* Animated Starry Background */}
      <div className="stars-bg" aria-hidden="true" />

      {/* Ambient Cosmic Lighting Blur FX */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Brand Logo */}
      <header className="w-full max-w-5xl flex justify-between items-center py-4 mb-2 z-10">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 via-purple-500 to-amber-400 flex items-center justify-center shadow-lg shadow-purple-600/30 text-slate-950 font-bold text-xl select-none">
            ॐ
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold auth-portal-brand-font tracking-widest text-amber-400">
              ASTROCONNECT
            </h1>
            <p className="text-[10px] text-purple-300/70 tracking-widest uppercase">Online Astrology Platform</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-4 text-xs font-medium text-slate-300">
          <span className="flex items-center gap-1.5">
            <Shield className="text-amber-400 w-3.5 h-3.5 fill-amber-400/20" /> 100% Encrypted
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <Star className="text-amber-400 w-3.5 h-3.5 fill-amber-400" /> 24/7 Live Consultations
          </span>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="w-full max-w-md my-auto z-10 py-2">
        {/* ================= AUTH CARD ================= */}
        <div id="authCard" className="auth-portal-glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          
          {/* Subtle Decorative Astrological Watermarks */}
          <span className="absolute -bottom-8 -left-8 text-9xl text-purple-500/5 select-none pointer-events-none font-serif">
            ☸
          </span>
          <span className="absolute -top-6 -right-6 text-8xl text-amber-500/5 select-none pointer-events-none font-serif">
            ☼
          </span>

          {/* Form Mode Switcher (Sign In / Create Account) */}
          <div className="flex bg-[#090818] p-1.5 rounded-2xl border border-purple-950/70 mb-6 relative">
            <button
              type="button"
              id="signInTabBtn"
              onClick={() => { setAuthMode('signin'); setError('') }}
              className={`flex-1 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                authMode === 'signin' ? 'auth-portal-tab-active' : 'auth-portal-tab-inactive'
              }`}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              type="button"
              id="signUpTabBtn"
              onClick={() => { setAuthMode('signup'); setError('') }}
              className={`flex-1 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                authMode === 'signup' ? 'auth-portal-tab-active' : 'auth-portal-tab-inactive'
              }`}
            >
              <UserPlus size={15} /> Create Account
            </button>
          </div>

          {/* Card Header Text */}
          <div className="text-center mb-6">
            <h2 id="formTitle" className="text-2xl font-bold text-white mb-1 tracking-wide">
              {authMode === 'signin' ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p id="formSubtitle" className="text-xs text-slate-400">
              {authMode === 'signin'
                ? 'Sign in to access personalized astrological insights'
                : 'Fill in your details to get started with AstroConnect'}
            </p>
          </div>

          {/* UNIFIED ROLE SELECTOR */}
          <div id="roleSelectorContainer" className="mb-6">
            <label className="block text-[10px] font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
              Select Account Type
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* User Role */}
              <button
                type="button"
                onClick={() => { setCurrentRole('user'); setError('') }}
                id="roleBtn-user"
                className={`auth-portal-role-btn flex flex-col items-center justify-center py-2.5 px-3 rounded-xl ${
                  currentRole === 'user' ? 'active' : ''
                }`}
              >
                <User className={`mb-1 w-4 h-4 ${currentRole === 'user' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="text-xs font-medium">User</span>
              </button>

              {/* Astrologer Role */}
              <button
                type="button"
                onClick={() => { setCurrentRole('astrologer'); setError('') }}
                id="roleBtn-astrologer"
                className={`auth-portal-role-btn flex flex-col items-center justify-center py-2.5 px-3 rounded-xl ${
                  currentRole === 'astrologer' ? 'active' : ''
                }`}
              >
                <Sparkles className={`mb-1 w-4 h-4 ${currentRole === 'astrologer' ? 'text-purple-400' : 'text-slate-400'}`} />
                <span className="text-xs font-medium">Astrologer</span>
              </button>

              {/* Admin Role */}
              <button
                type="button"
                onClick={() => { setCurrentRole('admin'); setError('') }}
                id="roleBtn-admin"
                className={`auth-portal-role-btn flex flex-col items-center justify-center py-2.5 px-3 rounded-xl ${
                  currentRole === 'admin' ? 'active' : ''
                }`}
              >
                <Shield className={`mb-1 w-4 h-4 ${currentRole === 'admin' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="text-xs font-medium">Admin</span>
              </button>
            </div>
          </div>

          {/* AUTH FORM */}
          <form id="astroAuthForm" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="auth-portal-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* DYNAMIC SIGN UP FIELDS */}
            {authMode === 'signup' && (
              <div id="signUpFields" className="space-y-4">
                {/* Full Name Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      id="fullNameInput"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="auth-portal-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* USER SPECIFIC FIELDS */}
                {currentRole === 'user' && (
                  <div id="userSpecificFields" className="space-y-3 p-3.5 bg-[#090818]/80 rounded-2xl border border-amber-500/25">
                    <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                      <Sparkles size={14} /> Birth Information (For Kundli Chart)
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1 flex items-center gap-1">
                          <Calendar size={12} /> Date of Birth
                        </label>
                        <input
                          type="date"
                          required
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="auth-portal-input w-full px-3 py-2 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1 flex items-center gap-1">
                          <Clock size={12} /> Time of Birth
                        </label>
                        <input
                          type="time"
                          required
                          value={birthTime}
                          onChange={(e) => setBirthTime(e.target.value)}
                          className="auth-portal-input w-full px-3 py-2 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 flex items-center gap-1">
                        <MapPin size={12} /> Place of Birth
                      </label>
                      <input
                        type="text"
                        required
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        placeholder="e.g. New York, USA"
                        className="auth-portal-input w-full px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* ASTROLOGER SPECIFIC FIELDS */}
                {currentRole === 'astrologer' && (
                  <div id="astrologerSpecificFields" className="space-y-3 p-3.5 bg-[#090818]/80 rounded-2xl border border-purple-500/25">
                    <p className="text-xs font-semibold text-purple-300 flex items-center gap-1.5 mb-1">
                      <Award size={14} /> Professional Details
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Experience (Years)</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={experience}
                          onChange={(e) => setExperience(e.target.value)}
                          className="auth-portal-input w-full px-3 py-2 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Specialization</label>
                        <select
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                          className="auth-portal-input w-full px-3 py-2 rounded-xl text-xs"
                        >
                          <option value="vedic">Vedic Astrology</option>
                          <option value="kp">KP System</option>
                          <option value="nadi">Nadi Astrology</option>
                          <option value="numerology">Numerology</option>
                          <option value="tarot">Tarot Reading</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Upload Certification Document</label>
                      <div className="border-2 border-dashed border-purple-500/30 rounded-xl p-2.5 text-center bg-[#090818] hover:border-purple-400 transition-colors cursor-pointer">
                        <UploadCloud className="mx-auto text-purple-400 mb-1 w-5 h-5" />
                        <p className="text-[10px] text-slate-400">Upload PDF or JPG (Max 5MB)</p>
                      </div>
                    </div>

                    {/* Verification Alert Banner */}
                    <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl flex items-start space-x-2">
                      <AlertCircle className="text-amber-400 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-amber-200/90 leading-snug">
                        <strong>Note:</strong> Registration requires Admin approval before profile activation.
                      </p>
                    </div>
                  </div>
                )}

                {/* ADMIN SPECIFIC FIELDS */}
                {currentRole === 'admin' && (
                  <div id="adminSpecificFields" className="space-y-3 p-3.5 bg-[#090818]/80 rounded-2xl border border-emerald-500/25">
                    <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                      <Key size={14} /> Administrative Authorization
                    </p>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Admin Passcode / Security Key</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-emerald-400">
                          <Shield size={14} />
                        </span>
                        <input
                          type="password"
                          value={adminKey}
                          onChange={(e) => setAdminKey(e.target.value)}
                          placeholder="Enter Security Secret"
                          className="auth-portal-input w-full pl-9 pr-3 py-2 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    id="forgotPassLink"
                    onClick={() => alert('Password reset instructions have been sent to your email.')}
                    className="text-xs text-amber-400 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  id="passwordInput"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-portal-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Terms and Conditions Checkbox (Sign Up Only) */}
            {authMode === 'signup' && (
              <div id="termsCheckbox" className="flex items-start space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="termsAgreement"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-amber-400"
                />
                <label htmlFor="termsAgreement" className="text-xs text-slate-400">
                  I agree to the <a href="#" className="text-amber-300 hover:underline">Terms of Service</a> and <a href="#" className="text-amber-300 hover:underline">Privacy Policy</a>
                </label>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button (Amber Gradient with bold arrow) */}
            <button
              type="submit"
              id="submitAuthBtn"
              className="auth-portal-submit-btn w-full py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer border-0 mt-3"
            >
              <span id="submitBtnText">
                {authMode === 'signin'
                  ? `Sign In - ${roleLabels[currentRole]}`
                  : `Register as ${roleLabels[currentRole]}`}
              </span>
              <ArrowRight size={16} className="font-bold stroke-[2.5]" />
            </button>

            {/* Social / Alternative Auth Section (Sign In Only) */}
            {authMode === 'signin' && (
              <div id="socialAuthSection" className="mt-4 pt-1">
                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-[#121127] px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider relative z-10">
                    Or continue with
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Google Login (Demo credentials pre-filled) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (currentRole === 'astrologer') {
                        setEmail('astro@astroconnect.com')
                        setPassword('Astro@123')
                      } else {
                        setEmail('user@astroconnect.com')
                        setPassword('User@123')
                      }
                    }}
                    className="auth-portal-alt-btn flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Google</span>
                  </button>

                  {/* OTP Login */}
                  <button
                    type="button"
                    onClick={() => {
                      const mobileNumber = prompt('Enter your 10-digit mobile number for OTP login:', '+91 ')
                      if (mobileNumber) {
                        setEmail(currentRole === 'astrologer' ? 'astro@astroconnect.com' : 'user@astroconnect.com')
                        setPassword(currentRole === 'astrologer' ? 'Astro@123' : 'User@123')
                        alert(`OTP has been sent to ${mobileNumber}. (Credentials pre-filled for instant verification)`)
                      }
                    }}
                    className="auth-portal-alt-btn flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <Smartphone size={14} className="text-amber-400" />
                    <span>OTP Login</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-4 text-center text-xs text-slate-500 z-10">
        <p>© 2026 AstroConnect Platform. All rights reserved.</p>
      </footer>
    </div>
  )
}
