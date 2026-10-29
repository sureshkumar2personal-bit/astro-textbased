import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEditor } from '../../state/EditorContext.jsx'
import './editor-login.css'

export default function EditorLogin() {
  const { editors, invitations, loginEditor } = useEditor()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    const normalized = email.trim().toLowerCase()
    const editor = editors.find((item) => item.email === normalized)
    if (editor) {
      try {
        loginEditor(editor, password)
        navigate('/editor/dashboard', { replace: true })
      } catch (loginError) {
        setError(loginError.message)
      }
      return
    }
    const invitation = invitations.find((item) => item.email === normalized)
    if (invitation) return setError(`This invitation is ${invitation.status}. Accept the invitation before signing in.`)
    setError('No editor or assistant access was found for this email.')
  }

  return <div className="editor-invite-page"><div className="editor-invite-card"><span className="editor-invite-mark">✦</span><span className="editor-eyebrow">EDITOR SIGN IN</span><h1>Return to your workspace</h1><p>Use the email address and password from your accepted invitation.</p><form className="editor-login-form" onSubmit={handleSubmit}><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="editor@example.com" type="email" autoComplete="email" required /><div className="editor-password-field"><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required /><button type="button" className="editor-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{error && <p className="editor-error">{error}</p>}<button type="submit">Sign In</button></form></div></div>
}
