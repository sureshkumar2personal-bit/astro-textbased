import {
  Clock3,
  Compass,
  Edit3,
  Maximize2,
  MessageCircle,
  Phone,
  PhoneOff,
  Plus,
  Send,
  Sparkles,
  Volume2,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { consultationAstrologers } from '../../data/consultationAstrologers.js'
import { getAstrologerPhoto } from '../../data/astrologerPhotos.js'
import { useAuth } from '../../state/AuthContext.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import {
  addConsultationMinutes,
  getConsultationSecondsLeft,
  getConsultationTotalMinutes,
  getInstantConsultation,
  subscribeToInstantConsultations,
  appendConsultationMessage,
  updateInstantConsultation,
} from '../../utils/instantConsultation.js'
import './floatingconsultationpanel.css'

const DURATIONS = [5, 10, 15, 30]
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

const BIRTH_STORAGE_KEY = 'astroconnect-user-birth-details'

function readPanelBirth(currentUser, sessionBirth) {
  let saved = {}
  try {
    saved = JSON.parse(window.localStorage.getItem(BIRTH_STORAGE_KEY) || '{}') || {}
  } catch {
    saved = {}
  }
  const source = { ...saved, ...(sessionBirth || {}) }
  return {
    name: source.name || currentUser?.name || 'Priya V.',
    gender: source.gender || currentUser?.gender || 'Female',
    place: source.place || currentUser?.birthPlace || 'Theni, Tamil Nadu, India',
    dob: source.dob || currentUser?.dateOfBirth || '1995-03-12',
    time: source.time || currentUser?.birthTime || '07:05',
    lagna: source.lagna || 'Simha (Leo)',
    rashi: source.rashi || 'Mithuna (Gemini)',
    nakshatra: source.nakshatra || 'Punarvasu-3',
  }
}

// 12 South Indian chart houses data (D1 Rashi)
const D1_HOUSES = [
  { id: 'meena', name: 'மீனம்', nameEn: 'Meena', house: '8th House', planets: 'சனி (Sa-R)', lord: 'Guru (Jupiter)', sig: 'Longevity & Occult', aspect: 'Saturn retrograde in 8th house brings deep analytical thought and sudden career shifts.' },
  { id: 'mesha', name: 'மேஷம்', nameEn: 'Mesha', house: '9th House', planets: 'கே (Ke)', lord: 'Kuja (Mars)', sig: 'Bhagya & Higher Learning', aspect: 'Ketu in 9th house enhances spiritual inclination, higher learning and pilgrimage.' },
  { id: 'vrishabha', name: 'ரிஷபம்', nameEn: 'Vrishabha', house: '10th House', planets: '—', lord: 'Shukra (Venus)', sig: 'Career & Karma Sthana', aspect: 'Strong 10th house indicates leadership roles in tech, management and independent ventures.' },
  { id: 'mithuna', name: 'மிதுனம்', nameEn: 'Mithuna', house: '11th House', planets: 'சந் (Mo)', lord: 'Budha (Mercury)', sig: 'Labha Sthana & Desires', aspect: 'Chandra in 11th creates Chandra-Budha yoga, ensuring steady liquid wealth and supportive networks.' },
  { id: 'kataka', name: 'கடகம்', nameEn: 'Kataka', house: '12th House', planets: 'சூ (Su), சு (Ve)', lord: 'Chandra (Moon)', sig: 'Moksha & Foreign Travel', aspect: 'Sun and Venus combination promotes opportunities abroad and creative expenditures.' },
  { id: 'simha', name: 'சிம்மம்', nameEn: 'Simha', house: '1st House (Lagna)', planets: 'லக் (Asc), பு (Me)', lord: 'Surya (Sun)', sig: 'Self, Vitality & Intellect', isLagna: true, aspect: 'Lagna lord Sun aspected by auspicious planets grants strong confidence, charisma, and clarity.' },
  { id: 'kanya', name: 'கன்னி', nameEn: 'Kanya', house: '2nd House', planets: 'செ (Ma)', lord: 'Budha (Mercury)', sig: 'Dhana & Family Speech', aspect: 'Mars in 2nd house gives decisive communication, boldness in financial planning and real estate.' },
  { id: 'tula', name: 'துலாம்', nameEn: 'Tula', house: '3rd House', planets: 'ரா (Ra)', lord: 'Shukra (Venus)', sig: 'Courage & Siblings', aspect: 'Rahu in 3rd gives powerful drive, media acumen and fearlessness in negotiations.' },
  { id: 'vrischika', name: 'விருச்சிகம்', nameEn: 'Vris', house: '4th House', planets: 'கு (Ju)', lord: 'Kuja (Mars)', sig: 'Sukha Sthana & Property', aspect: 'Jupiter in 4th bestows mother’s blessings, property acquisition and peace of mind.' },
  { id: 'dhanus', name: 'தனுசு', nameEn: 'Dhanus', house: '5th House', planets: '—', lord: 'Guru (Jupiter)', sig: 'Poorva Punya & Intuition', aspect: 'Auspicious 5th house promotes sound investments and sharp strategic intuition.' },
  { id: 'makara', name: 'மகரம்', nameEn: 'Makara', house: '6th House', planets: '—', lord: 'Shani (Saturn)', sig: 'Shatru & Daily Service', aspect: 'Saturn-ruled 6th house guarantees victory over competitors and resilience under pressure.' },
  { id: 'kumbha', name: 'கும்பம்', nameEn: 'Kumbha', house: '7th House', planets: '—', lord: 'சனி (Saturn)', sig: 'Marriage & Partnership', aspect: 'Lord: சனி (Saturn) • Current Guru Aspect active on 7th Bhava, opening favorable alliance window.' },
]

// 12 South Indian chart houses data (D9 Navamsa)
const D9_HOUSES = [
  { id: 'meena', name: 'மீனம்', nameEn: 'Meena', house: '8th House', planets: 'சூ (Su)', lord: 'Guru', sig: 'Spiritual Wisdom', aspect: 'Sun in Navamsa 8th reveals inner discipline and perseverance.' },
  { id: 'mesha', name: 'மேஷம்', nameEn: 'Mesha', house: '9th House', planets: 'சந் (Mo)', lord: 'Kuja', sig: 'Dharma & Travel', aspect: 'Moon in 9th enhances emotional poise and righteous counsel.' },
  { id: 'vrishabha', name: 'ரிஷபம்', nameEn: 'Vrishabha', house: '10th House', planets: 'பு (Me)', lord: 'Shukra', sig: 'Professional Growth', aspect: 'Mercury in 10th favors analytical communications.' },
  { id: 'mithuna', name: 'மிதுனம்', nameEn: 'Mithuna', house: '11th House', planets: '—', lord: 'Budha', sig: 'Gains', aspect: 'Benefic aspects bring steady social associations.' },
  { id: 'kataka', name: 'கடகம்', nameEn: 'Kataka', house: '12th House', planets: 'கு (Ju)', lord: 'Chandra', sig: 'Inner Peace', aspect: 'Jupiter in 12th confers peaceful introspection.' },
  { id: 'simha', name: 'சிம்மம்', nameEn: 'Simha', house: '1st House (Lagna)', planets: 'லக் (Asc)', lord: 'Surya', isLagna: true, sig: 'Inherent Nature', aspect: 'Ascendant in Leo establishes firm self-respect.' },
  { id: 'kanya', name: 'கன்னி', nameEn: 'Kanya', house: '2nd House', planets: 'சு (Ve)', lord: 'Budha', sig: 'Family Wealth', aspect: 'Venus in 2nd refines speech and aesthetic tastes.' },
  { id: 'tula', name: 'துலாம்', nameEn: 'Tula', house: '3rd House', planets: 'சனி (Sa)', lord: 'Shukra', sig: 'Initiatives', aspect: 'Saturn in 3rd ensures patient execution of goals.' },
  { id: 'vrischika', name: 'விருச்சிகம்', nameEn: 'Vris', house: '4th House', planets: 'ரா (Ra)', lord: 'Kuja', sig: 'Home Comforts', aspect: 'Rahu in 4th prompts desire for expansive living.' },
  { id: 'dhanus', name: 'தனுசு', nameEn: 'Dhanus', house: '5th House', planets: 'செ (Ma)', lord: 'Guru', sig: 'Intellect', aspect: 'Mars in 5th gives dynamic problem-solving acuity.' },
  { id: 'makara', name: 'மகரம்', nameEn: 'Makara', house: '6th House', planets: '—', lord: 'Shani', sig: 'Overcoming Obstacles', aspect: 'Favorable placement for health recovery.' },
  { id: 'kumbha', name: 'கும்பம்', nameEn: 'Kumbha', house: '7th House', planets: 'கே (Ke)', lord: 'Shani', sig: 'Partnerships', aspect: 'Ketu in 7th inspires deep mutual understanding in alliances.' },
]

/**
 * Post-accept surface for the user, mirroring the floating panel the astrologer
 * gets on their side. Attached by InstantCallProvider the moment a session is
 * accepted, so it follows the user across pages.
 */
export default function FloatingConsultationPanel({ session, onDismiss, onEnded }) {
  const { currentUser } = useAuth()
  const { userWallet, actions } = useAppData()
  const navigate = useNavigate()

  const isCall = session.type === 'call'
  const astrologer = useMemo(
    () => consultationAstrologers.find((entry) => entry.id === session.astrologerId) || consultationAstrologers[0],
    [session.astrologerId],
  )

  const [request, setRequest] = useState(() => getInstantConsultation(session.id) || session)
  const [remaining, setRemaining] = useState(0)
  const [speaker, setSpeaker] = useState(false)
  const [draft, setDraft] = useState('')
  const [extensionOpen, setExtensionOpen] = useState(false)
  const [extensionDuration, setExtensionDuration] = useState(10)
  const [error, setError] = useState('')

  // Horoscope & Kundli tab states
  const [activeTab, setActiveTab] = useState('call') // 'call' | 'kundli'
  const [chartMode, setChartMode] = useState('D1') // 'D1' | 'D9'
  const [selectedHouseId, setSelectedHouseId] = useState('kumbha')
  const [editingBirth, setEditingBirth] = useState(false)
  const [birthDetails, setBirthDetails] = useState(() =>
    readPanelBirth(currentUser, request?.birthDetails || session?.birthDetails)
  )
  const [birthForm, setBirthForm] = useState(birthDetails)

  const userId = session.userId
  const unitRate = Number(isCall ? astrologer.callRate : astrologer.chatRate || 0)
  const balance = Number(userWallet?.balance || 0)
  const extensionPrice = unitRate * extensionDuration

  // Current inspected house in Kundli chart
  const currentHouseList = chartMode === 'D1' ? D1_HOUSES : D9_HOUSES
  const inspectedHouse = useMemo(() => {
    return currentHouseList.find((h) => h.id === selectedHouseId) || currentHouseList[0]
  }, [currentHouseList, selectedHouseId])

  // Sync session birthDetails if updated externally
  useEffect(() => {
    if (request?.birthDetails) {
      setBirthDetails((prev) => ({ ...prev, ...request.birthDetails }))
    }
  }, [request?.birthDetails])

  // Subscribe so messages from the astrologer, extensions, and status changes
  // land live in the panel.
  useEffect(() => {
    const refresh = () => setRequest(getInstantConsultation(session.id) || null)
    refresh()
    return subscribeToInstantConsultations(refresh)
  }, [session.id])

  useEffect(() => {
    if (request?.status !== 'accepted') return undefined
    const tick = () => setRemaining(getConsultationSecondsLeft(request))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [request])

  const end = () => request && updateInstantConsultation(request.id, { status: 'ended', endedAt: new Date().toISOString() })

  const send = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || request?.status !== 'accepted') return
    appendConsultationMessage(request.id, 'user', text)
    setDraft('')
  }

  const buyExtension = () => {
    if (!request) return
    if (balance < extensionPrice) {
      setError(`You need ${money(extensionPrice - balance)} more to extend.`)
      return
    }
    actions.debitUserWallet({
      amount: extensionPrice,
      astrologer: astrologer.name,
      duration: extensionDuration,
      service: isCall ? 'Call Extension' : 'Chat Extension',
      transactionId: `astro-connect:${session.type}-extension:${userId}:${request.id}:${extensionDuration}:${Date.now()}`,
    })
    updateInstantConsultation(request.id, { extensionAmount: extensionPrice })
    addConsultationMinutes(request.id, extensionDuration)
    setError('')
    setExtensionOpen(false)
  }

  // Save edited birth details
  const handleSaveBirth = (event) => {
    event?.preventDefault()
    const updated = { ...birthForm }
    setBirthDetails(updated)
    try {
      window.localStorage.setItem(BIRTH_STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // storage optional
    }
    if (request?.id) {
      updateInstantConsultation(request.id, { birthDetails: updated })
      appendConsultationMessage(
        request.id,
        'system',
        `Updated birth details for ${updated.name} shared with ${astrologer.name}. Kundli chart refreshed.`
      )
    }
    setEditingBirth(false)
  }

  const ringing = request?.status === 'ringing'
  const timeUp = request?.status === 'accepted' && remaining === 0

  return createPortal(
    <aside className={`floating-consult-panel${activeTab === 'kundli' ? ' has-kundli-view' : ''}`} aria-live="polite">
      <section className={`floating-consult-card${ringing ? ' is-ringing' : ''}${timeUp ? ' is-timeup' : ''}${activeTab === 'kundli' ? ' is-expanded-kundli' : ''}`}>
        <button
          type="button"
          className="floating-consult-card__expand"
          onClick={() => navigate(`/user/instantchat/${astrologer.id}`)}
          aria-label="Expand to full workspace"
          title="Expand to full workspace"
          style={{
            position: 'absolute',
            top: 10,
            right: 36,
            background: 'transparent',
            border: 'none',
            color: '#7346a3',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Maximize2 size={14} />
        </button>
        <button
          type="button"
          className="floating-consult-card__dismiss"
          onClick={() => (ringing ? onEnded?.(request.id) : onDismiss?.(request.id))}
          aria-label={ringing ? 'Cancel request' : 'Hide panel'}
          title={ringing ? 'Cancel request' : 'Hide panel'}
        >
          <X size={14} />
        </button>

        {ringing && (
          <div className="floating-consult-request">
            <div className="floating-consult-icon">{isCall ? <Phone size={22} /> : <MessageCircle size={22} />}</div>
            <span className="floating-consult-badge">{isCall ? 'INSTANT CALL' : 'INSTANT CHAT'}</span>
            <h2>Ringing {astrologer.name}</h2>
            <p><Clock3 size={14} /> {getConsultationTotalMinutes(request)} min booked</p>
            {request.topic && (
              <div className="floating-consult-topic-pill">
                <Sparkles size={11} /> Topic: {request.topic}
              </div>
            )}
            <div className="floating-consult-actions">
              <button type="button" className="floating-consult-accept" onClick={() => end()}>
                <PhoneOff size={17} /> Cancel Request
              </button>
            </div>
          </div>
        )}

        {request?.status === 'accepted' && (
          <div className="floating-consult-active">
            <header>
              <span className="floating-consult-live"><span /> Live {isCall ? 'call' : 'chat'}</span>
              <strong>{formatTime(remaining)}</strong>
            </header>

            <div className="floating-consult-person">
              <div className="floating-consult-avatar">
                {getAstrologerPhoto(astrologer) ? (
                  <img src={getAstrologerPhoto(astrologer)} alt={`${astrologer.name} profile`} />
                ) : (
                  astrologer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')
                )}
              </div>
              <div className="floating-consult-person__meta">
                <h2>{astrologer.name}</h2>
                <p>{isCall ? 'Voice' : 'Text'} consultation · {getConsultationTotalMinutes(request)} min</p>
                {request.topic && (
                  <span className="floating-consult-topic-tag">
                    <Sparkles size={10} /> {request.topic}
                  </span>
                )}
              </div>
            </div>

            {/* Sub-Tabs: Call Audio/Messages vs Horoscope & Kundli */}
            <nav className="floating-consult-tabs-nav" role="tablist" aria-label="Consultation views">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'call'}
                className={`floating-consult-tab ${activeTab === 'call' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('call')}
              >
                {isCall ? <Phone size={12} /> : <MessageCircle size={12} />} {isCall ? 'Audio Call' : 'Messages'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'kundli'}
                className={`floating-consult-tab ${activeTab === 'kundli' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('kundli')}
              >
                <Compass size={12} /> Horoscope &amp; Kundli
              </button>
            </nav>

            {timeUp && !extensionOpen && (
              <div className="floating-consult-timeup">
                <Clock3 size={14} />
                <span>Time is up. Extend to keep going.</span>
              </div>
            )}

            {/* TAB 1: CALL CONVERSATION & CONTROLS */}
            {activeTab === 'call' && (
              <>
                {extensionOpen ? (
                  <div className="floating-consult-extension">
                    <strong>Extend {isCall ? 'call' : 'chat'}</strong>
                    <div className="floating-consult-durations">
                      {DURATIONS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={extensionDuration === value ? 'is-selected' : ''}
                          onClick={() => setExtensionDuration(value)}
                        >
                          {value}m<small>{money(unitRate * value)}</small>
                        </button>
                      ))}
                    </div>
                    {error && <p className="floating-consult-error">{error}</p>}
                    {balance < extensionPrice ? (
                      <button type="button" className="floating-consult-addmoney" onClick={() => navigate('/user/wallet-history')}>
                        <Wallet size={15} /> Add {money(extensionPrice - balance)} to wallet
                      </button>
                    ) : (
                      <button type="button" className="floating-consult-extend" onClick={buyExtension}>
                        <Plus size={15} /> Extend &amp; Pay {money(extensionPrice)}
                      </button>
                    )}
                    <button type="button" className="floating-consult-cancel" onClick={() => setExtensionOpen(false)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="floating-consult-conversation">
                      {(request.messages || []).map((message) => (
                        <p key={message.id} className={`floating-consult-message floating-consult-message--${message.sender}`}>{message.text}</p>
                      ))}
                      {!isCall && !(request.messages || []).length && <small className="floating-consult-hint">Say hello to begin.</small>}
                      {isCall && <small><MessageCircle size={13} /> You can send a message while speaking</small>}
                    </div>

                    <form className="floating-consult-composer" onSubmit={send}>
                      <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={isCall ? 'Send a message...' : 'Write a message...'}
                      />
                      <button type="submit" disabled={!draft.trim()}><Send size={16} /></button>
                    </form>

                    {isCall && !timeUp && (
                      <button
                        type="button"
                        className={`floating-consult-speaker${speaker ? ' is-active' : ''}`}
                        onClick={() => setSpeaker((value) => !value)}
                      >
                        <Volume2 size={16} /> {speaker ? 'Speaker on' : 'Speaker'}
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* TAB 2: HOROSCOPE & KUNDLI VIEW WITH EDIT OPTION */}
            {activeTab === 'kundli' && (
              <div className="floating-consult-kundli-body">
                {/* User Birth Details Card with Edit Trigger */}
                <div className="floating-consult-birth-card">
                  <div className="floating-consult-birth-head">
                    <div>
                      <strong>{birthDetails.name}</strong>
                      <p>{birthDetails.dob} • {birthDetails.time} • {birthDetails.place}</p>
                    </div>
                    <button
                      type="button"
                      className="floating-consult-edit-btn"
                      onClick={() => {
                        setBirthForm(birthDetails)
                        setEditingBirth((prev) => !prev)
                      }}
                    >
                      <Edit3 size={12} /> {editingBirth ? 'Close' : 'Edit'}
                    </button>
                  </div>

                  <div className="floating-consult-birth-pills">
                    <span className="floating-consult-birth-pill">
                      <em>Lagna</em> {birthDetails.lagna.split(' ')[0]}
                    </span>
                    <span className="floating-consult-birth-pill">
                      <em>Rashi</em> {birthDetails.rashi.split(' ')[0]}
                    </span>
                    <span className="floating-consult-birth-pill">
                      <em>Nakshatra</em> {birthDetails.nakshatra}
                    </span>
                  </div>
                </div>

                {/* Edit Birth Details Form */}
                {editingBirth ? (
                  <form className="floating-consult-edit-form" onSubmit={handleSaveBirth}>
                    <h4>Edit Birth Details</h4>
                    <label>
                      <span>Full Name</span>
                      <input
                        type="text"
                        className="text-input"
                        value={birthForm.name}
                        onChange={(e) => setBirthForm({ ...birthForm, name: e.target.value })}
                        required
                      />
                    </label>
                    <div className="floating-consult-edit-row">
                      <label>
                        <span>Date of Birth</span>
                        <input
                          type="date"
                          className="text-input"
                          value={birthForm.dob}
                          onChange={(e) => setBirthForm({ ...birthForm, dob: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        <span>Time of Birth</span>
                        <input
                          type="time"
                          className="text-input"
                          value={birthForm.time}
                          onChange={(e) => setBirthForm({ ...birthForm, time: e.target.value })}
                          required
                        />
                      </label>
                    </div>
                    <label>
                      <span>Place of Birth</span>
                      <input
                        type="text"
                        className="text-input"
                        value={birthForm.place}
                        onChange={(e) => setBirthForm({ ...birthForm, place: e.target.value })}
                        required
                      />
                    </label>
                    <div className="floating-consult-edit-row">
                      <label>
                        <span>Lagna</span>
                        <input
                          type="text"
                          className="text-input"
                          value={birthForm.lagna}
                          onChange={(e) => setBirthForm({ ...birthForm, lagna: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>Rashi</span>
                        <input
                          type="text"
                          className="text-input"
                          value={birthForm.rashi}
                          onChange={(e) => setBirthForm({ ...birthForm, rashi: e.target.value })}
                        />
                      </label>
                    </div>
                    <label>
                      <span>Nakshatra</span>
                      <input
                        type="text"
                        className="text-input"
                        value={birthForm.nakshatra}
                        onChange={(e) => setBirthForm({ ...birthForm, nakshatra: e.target.value })}
                      />
                    </label>

                    <div className="floating-consult-edit-actions">
                      <button type="submit" className="floating-consult-save-btn">
                        Update Chart &amp; Share
                      </button>
                      <button
                        type="button"
                        className="floating-consult-cancel-btn"
                        onClick={() => setEditingBirth(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* South Indian Chart Section */}
                    <div className="floating-consult-chart-section">
                      <div className="floating-consult-chart-head">
                        <div>
                          <h5>South Indian Chart ({chartMode})</h5>
                          <small>Tap house to inspect</small>
                        </div>
                        <div className="floating-consult-chart-toggles">
                          <button
                            type="button"
                            className={`floating-consult-toggle-btn ${chartMode === 'D1' ? 'is-active' : ''}`}
                            onClick={() => setChartMode('D1')}
                          >
                            D1 Rashi
                          </button>
                          <button
                            type="button"
                            className={`floating-consult-toggle-btn ${chartMode === 'D9' ? 'is-active' : ''}`}
                            onClick={() => setChartMode('D9')}
                          >
                            D9 Navamsa
                          </button>
                        </div>
                      </div>

                      {/* 4x4 South Indian Grid */}
                      <div className="floating-consult-south-grid">
                        {/* Row 1: Meena, Mesha, Vrishabha, Mithuna */}
                        {['meena', 'mesha', 'vrishabha', 'mithuna'].map((hId) => {
                          const item = currentHouseList.find((h) => h.id === hId)
                          const isSelected = selectedHouseId === hId
                          return (
                            <div
                              key={hId}
                              role="button"
                              tabIndex={0}
                              className={`floating-chart-box ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => setSelectedHouseId(hId)}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId(hId)}
                            >
                              <span className="floating-chart-box__sign">{item.nameEn}</span>
                              {item.planets && item.planets !== '—' && (
                                <span className="floating-chart-box__planets">{item.planets}</span>
                              )}
                              <span className="floating-chart-box__house">{item.house.split(' ')[0]}</span>
                            </div>
                          )
                        })}

                        {/* Row 2: Kumbha (Left), Center (2x2), Kataka (Right) */}
                        {(() => {
                          const kumbha = currentHouseList.find((h) => h.id === 'kumbha')
                          const kataka = currentHouseList.find((h) => h.id === 'kataka')
                          return (
                            <>
                              <div
                                role="button"
                                tabIndex={0}
                                className={`floating-chart-box ${selectedHouseId === 'kumbha' ? 'is-selected' : ''}`}
                                onClick={() => setSelectedHouseId('kumbha')}
                                onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId('kumbha')}
                              >
                                <span className="floating-chart-box__sign">{kumbha.nameEn}</span>
                                {kumbha.planets && kumbha.planets !== '—' && (
                                  <span className="floating-chart-box__planets">{kumbha.planets}</span>
                                )}
                                <span className="floating-chart-box__house">{kumbha.house.split(' ')[0]}</span>
                              </div>

                              {/* Center 2x2 Cell */}
                              <div className="floating-chart-center">
                                <strong>{chartMode === 'D1' ? 'ராசி (D1)' : 'நவாம்சம் (D9)'}</strong>
                                <span>{birthDetails.rashi.split(' ')[0]} • {birthDetails.lagna.split(' ')[0]}</span>
                              </div>

                              <div
                                role="button"
                                tabIndex={0}
                                className={`floating-chart-box ${selectedHouseId === 'kataka' ? 'is-selected' : ''}`}
                                onClick={() => setSelectedHouseId('kataka')}
                                onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId('kataka')}
                              >
                                <span className="floating-chart-box__sign">{kataka.nameEn}</span>
                                {kataka.planets && kataka.planets !== '—' && (
                                  <span className="floating-chart-box__planets">{kataka.planets}</span>
                                )}
                                <span className="floating-chart-box__house">{kataka.house.split(' ')[0]}</span>
                              </div>
                            </>
                          )
                        })()}

                        {/* Row 3: Makara (Left), Simha (Right) */}
                        {(() => {
                          const makara = currentHouseList.find((h) => h.id === 'makara')
                          const simha = currentHouseList.find((h) => h.id === 'simha')
                          return (
                            <>
                              <div
                                role="button"
                                tabIndex={0}
                                className={`floating-chart-box ${selectedHouseId === 'makara' ? 'is-selected' : ''}`}
                                onClick={() => setSelectedHouseId('makara')}
                                onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId('makara')}
                              >
                                <span className="floating-chart-box__sign">{makara.nameEn}</span>
                                {makara.planets && makara.planets !== '—' && (
                                  <span className="floating-chart-box__planets">{makara.planets}</span>
                                )}
                                <span className="floating-chart-box__house">{makara.house.split(' ')[0]}</span>
                              </div>

                              <div
                                role="button"
                                tabIndex={0}
                                className={`floating-chart-box ${selectedHouseId === 'simha' ? 'is-selected' : ''}`}
                                onClick={() => setSelectedHouseId('simha')}
                                onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId('simha')}
                              >
                                <span className="floating-chart-box__sign">{simha.nameEn} (Lagna)</span>
                                {simha.planets && simha.planets !== '—' && (
                                  <span className="floating-chart-box__planets">{simha.planets}</span>
                                )}
                                <span className="floating-chart-box__house">1st House</span>
                              </div>
                            </>
                          )
                        })()}

                        {/* Row 4: Dhanus, Vrischika, Tula, Kanya */}
                        {['dhanus', 'vrischika', 'tula', 'kanya'].map((hId) => {
                          const item = currentHouseList.find((h) => h.id === hId)
                          const isSelected = selectedHouseId === hId
                          return (
                            <div
                              key={hId}
                              role="button"
                              tabIndex={0}
                              className={`floating-chart-box ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => setSelectedHouseId(hId)}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId(hId)}
                            >
                              <span className="floating-chart-box__sign">{item.nameEn}</span>
                              {item.planets && item.planets !== '—' && (
                                <span className="floating-chart-box__planets">{item.planets}</span>
                              )}
                              <span className="floating-chart-box__house">{item.house.split(' ')[0]}</span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Inspected House Significance */}
                      {inspectedHouse && (
                        <div className="floating-consult-house-detail">
                          <div className="floating-consult-house-detail__head">
                            <strong>{inspectedHouse.nameEn} ({inspectedHouse.house})</strong>
                            <small>Lord: {inspectedHouse.lord}</small>
                          </div>
                          {inspectedHouse.sig && <p><strong>Significance:</strong> {inspectedHouse.sig}</p>}
                          {inspectedHouse.aspect && <p className="floating-consult-house-aspect">{inspectedHouse.aspect}</p>}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sticky Actions in Active Mode */}
            <div className="floating-consult-footer-controls">
              <button type="button" className="floating-consult-extend-link" onClick={() => setExtensionOpen(true)}>
                <Plus size={15} /> Extend Consultation
              </button>

              <button type="button" className="floating-consult-end" onClick={end}>
                <PhoneOff size={17} /> End {isCall ? 'Call' : 'Chat'}
              </button>
            </div>
          </div>
        )}
      </section>
    </aside>,
    document.body,
  )
}