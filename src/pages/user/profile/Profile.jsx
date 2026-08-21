import { Mail, Phone, UserCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../../../components/ui/Card.jsx'
import PageHeader from '../../../../components/ui/PageHeader.jsx'
import Section from '../../../../components/ui/Section.jsx'
import { useAuth } from '../../../../state/AuthContext.jsx'
import { getRoleRoutes, ROLES } from '../../../../utils/roleRoutes.js'

export default function Profile() {
  const { currentUser, updateProfile } = useAuth()
  const navigate = useNavigate()
  const routes = getRoleRoutes(currentUser?.role)
  const isAstrologer = currentUser?.role === ROLES.ASTROLOGER
  const [editing, setEditing] = useState(isAstrologer)
  const [form, setForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', specialization: currentUser?.specialization || '', experience: currentUser?.experience || '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const startEditing = () => {
    setForm({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', specialization: currentUser?.specialization || '', experience: currentUser?.experience || '' })
    setError('')
    setSaved(false)
    setEditing(true)
  }

  const handleSave = () => {
    try {
      updateProfile(form)
      setEditing(false)
      setSaved(true)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update your profile.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={isAstrologer ? 'Astrologer' : 'User portal'}
        title="Profile"
        subtitle="View your account and contact details."
        showBack
        backTo={routes.dashboard}
        actions={!editing && <button type="button" className="btn btn-primary" onClick={startEditing}>Edit Profile</button>}
      />

      <Section title="Account Details" icon={UserCircle2}>
        <Card>
          <div className="flex flex-wrap items-center gap-4" style={{ marginBottom: 24 }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] text-xl font-bold text-white">
              {currentUser?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{currentUser?.name || 'User'}</h2>
              <div className="muted" style={{ marginTop: 5 }}>{isAstrologer ? 'Astrologer' : 'User'}</div>
            </div>
          </div>

          {editing ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Name</span><input className="text-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Email Address</span><input type="email" className="text-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Phone Number</span><input type="tel" className="text-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
              {isAstrologer && <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Specialization</span><input className="text-input" value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} /></label>}
              {isAstrologer && <label className="field-group" style={{ margin: 0 }}><span className="field-label-top">Experience</span><input className="text-input" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} placeholder="8 years" /></label>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="field-group" style={{ margin: 0 }}><span className="field-label-top">Email Address</span><div className="flex min-h-[42px] items-center gap-2 rounded-[14px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] px-4 text-[color:var(--text-primary)]"><Mail size={16} className="text-[color:var(--primary)]" />{currentUser?.email || '—'}</div></div>
              <div className="field-group" style={{ margin: 0 }}><span className="field-label-top">Phone Number</span><div className="flex min-h-[42px] items-center gap-2 rounded-[14px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] px-4 text-[color:var(--text-primary)]"><Phone size={16} className="text-[color:var(--primary)]" />{currentUser?.phone || 'Not added'}</div></div>
              {isAstrologer && <div className="field-group" style={{ margin: 0 }}><span className="field-label-top">Specialization</span><div className="min-h-[42px] rounded-[14px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] px-4 py-3 text-[color:var(--text-primary)]">{currentUser?.specialization || 'Not added'}</div></div>}
              {isAstrologer && <div className="field-group" style={{ margin: 0 }}><span className="field-label-top">Experience</span><div className="min-h-[42px] rounded-[14px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] px-4 py-3 text-[color:var(--text-primary)]">{currentUser?.experience || 'Not added'}</div></div>}
            </div>
          )}
          {error && <div className="mt-4 rounded-[14px] bg-[color:var(--danger-bg)] px-4 py-3 text-sm font-medium text-[color:var(--danger)]">{error}</div>}
          {saved && <div className="mt-4 rounded-[14px] bg-[color:var(--success-bg)] px-4 py-3 text-sm font-medium text-[color:var(--green-600)]">Profile updated successfully.</div>}
        </Card>
      </Section>

      <div className="flex justify-center">
        {editing ? (
          <div className="mt-5 flex w-full justify-center gap-4"><button type="button" className="btn btn-ghost min-w-[120px]" onClick={() => setEditing(false)}>Cancel</button><button type="button" className="btn btn-primary min-w-[150px]" onClick={handleSave}>Save Changes</button></div>
        ) : <button type="button" className="btn btn-outline" onClick={() => navigate(routes.dashboard)}>Back to Dashboard</button>}
      </div>
    </div>
  )
}
