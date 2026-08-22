import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BookOpen, CalendarDays, ChevronRight, CircleHelp, Globe2, Languages, MapPin, MoreHorizontal, Pencil, Settings, Sparkles, UserRound, Users } from 'lucide-react'
import { useAuth } from '../../../../state/AuthContext.jsx'
import { getRoleRoutes } from '../../../../utils/roleRoutes.js'

const initials = (name = '') => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'

export default function Profile() {
  const { currentUser, updateProfile } = useAuth()
  const routes = getRoleRoutes(currentUser?.role)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '' })
  const [tab, setTab] = useState('Overview')
  const save = () => { updateProfile(form); setEditing(false); setSaved(true) }
  const stats = [['12', 'Posts'], ['28', 'Following'], ['146', 'Followers'], ['8', 'Questions Asked'], ['5', 'Consultations']]
  const actions = [[CircleHelp, 'Ask a Question', routes.askQuestion], [Sparkles, 'Explore Astrologers', routes.astrologers], [BookOpen, 'My Questions', routes.trackQuestions], [CalendarDays, 'My Consultations', routes.consultationHistory]]
  return <div className="member-profile">
    <div className="member-profile__intro"><div><span className="profile-kicker">YOUR ASTRO CONNECT SPACE</span><h1>Profile</h1><p>Keep your journey, questions and consultations in one place.</p></div><button className="icon-btn" aria-label="Profile settings"><Settings size={18} /></button></div>
    <section className="member-profile__hero">
      <div className="member-profile__identity"><div className="member-avatar">{initials(currentUser?.name)}</div><div><div className="member-profile__name-row"><h2>{currentUser?.name || 'Astro Connect Member'}</h2><span className="member-badge">✦ Astro Connect Member</span></div><p className="profile-handle">@{(currentUser?.name || 'member').toLowerCase().replace(/[^a-z0-9]+/g, '')}</p><div className="profile-meta"><span><MapPin size={14} /> India</span><span><Globe2 size={14} /> Exploring the stars</span></div><p className="member-bio">Curious about the patterns shaping your next chapter. Ask, reflect and find clarity with trusted astrologers.</p></div></div>
      <div className="member-profile__hero-actions"><button className="btn btn-primary" onClick={() => setEditing(true)}><Pencil size={15} /> Edit Profile</button><button className="icon-btn" aria-label="More profile actions"><MoreHorizontal size={19} /></button></div>
      <div className="profile-stats">{stats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    </section>
    <div className="member-profile__layout"><main>
      <section className="profile-section"><div className="section-heading"><div><span className="profile-kicker">MAKE YOUR NEXT MOVE</span><h2>Quick actions</h2></div></div><div className="quick-actions">{actions.map(([Icon, label, to]) => <Link to={to} key={label}><span><Icon size={18} /></span><b>{label}</b><ChevronRight size={15} /></Link>)}</div></section>
      <section className="profile-section"><div className="profile-tabs">{['Overview', 'Questions', 'Posts', 'Following', 'Activity'].map((item) => <button className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</div><div className="profile-empty"><span><Sparkles size={20} /></span><h3>{tab === 'Questions' ? 'No questions yet' : `Your ${tab.toLowerCase()} will appear here`}</h3><p>Ask an astrologer and start your journey toward greater clarity.</p><Link to={routes.askQuestion} className="btn btn-primary">Ask a Question</Link></div></section>
    </main><aside><section className="about-card"><div className="section-heading"><h2>About</h2><button className="icon-btn" onClick={() => setEditing(true)}><Pencil size={15} /></button></div><p className="about-copy">{currentUser?.bio || 'A thoughtful space for reflection, questions and meaningful guidance.'}</p><div className="about-list"><div><Languages size={16} /><span><b>Languages</b>English, Hindi</span></div><div><Sparkles size={16} /><span><b>Interests</b>Relationships · Career · Wellbeing</span></div><div><Activity size={16} /><span><b>Member since</b>January 2025</span></div></div></section><section className="profile-tip"><Sparkles size={18} /><div><b>Your journey is personal</b><p>Save questions and revisit guidance whenever you need a little perspective.</p></div></section></aside></div>
    {editing && <div className="modal-overlay" onClick={() => setEditing(false)}><div className="modal-card" onClick={(e) => e.stopPropagation()}><div className="modal-card__header"><h2>Edit Profile</h2></div><div className="modal-card__content profile-edit-form">{[['name','Name'],['email','Email address'],['phone','Phone number']].map(([key, label]) => <label className="field-group" key={key}><span className="field-label-top">{label}</span><input className="text-input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}</div><div className="modal-card__footer"><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Changes</button></div></div></div>}
    {saved && <div className="profile-toast">Profile updated successfully.</div>}
  </div>
}
