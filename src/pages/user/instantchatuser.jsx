import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Clock3,
  MessageCircle,
  PhoneOff,
  Send,
  Sparkles,
  Paperclip,
  Check,
  ChevronRight,
  Plus,
  Play,
  Pause,
  Volume2,
  Wallet,
  X,
  User,
  Calendar,
  MapPin,
  Compass,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { useAuth } from '../../state/AuthContext.jsx'
import { useAppData } from '../../state/AppDataContext.jsx'
import { useInstantCall } from '../../state/InstantCallContext.jsx'
import { consultationAstrologers } from '../../data/consultationAstrologers.js'
import { getAstrologerPhoto } from '../../data/astrologerPhotos.js'
import {
  getInstantConsultation,
  updateInstantConsultation,
  createInstantConsultation,
  getInstantConsultations,
  getConsultationSecondsLeft,
} from '../../utils/instantConsultation.js'
import ConsultationRatingModal from '../../components/user/ConsultationRatingModal.jsx'
import './instantchatuser.css'

const BIRTH_STORAGE_KEY = 'astroconnect-user-birth-details'

function readSavedBirth(currentUser, sessionBirth) {
  let saved = {}
  try {
    saved = JSON.parse(window.localStorage.getItem(BIRTH_STORAGE_KEY) || '{}') || {}
  } catch {
    saved = {}
  }
  const source = { ...saved, ...(sessionBirth || {}) }
  return {
    name: source.name || currentUser?.name || 'Arjun Karthik',
    gender: source.gender || currentUser?.gender || 'Male',
    place: source.place || currentUser?.birthPlace || 'Chennai, TN',
    dob: source.dob || currentUser?.dateOfBirth || '14 Aug 1996',
    time: source.time || currentUser?.birthTime || '06:42 AM',
    lagna: source.lagna || 'Simha (Leo)',
    rashi: source.rashi || 'Mithuna (Gemini)',
    nakshatra: source.nakshatra || 'Punarvasu-3',
  }
}

function formatTime(totalSeconds) {
  const m = Math.floor(Math.max(0, totalSeconds) / 60)
  const s = Math.max(0, totalSeconds) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 12 South Indian chart houses data
const D1_HOUSES = [
  { id: 'meena', name: 'மீனம்', nameEn: 'Meena (Pisces)', house: '8th House', planets: 'சனி (Sa-R)', lord: 'Guru (Jupiter)', sig: 'Longevity & Occult', aspect: 'Saturn retrograde in 8th house brings deep analytical thought and sudden career shifts.' },
  { id: 'mesha', name: 'மேஷம்', nameEn: 'Mesha (Aries)', house: '9th House', planets: 'கே (Ke)', lord: 'Kuja (Mars)', sig: 'Bhagya & Higher Learning', aspect: 'Ketu in 9th house enhances spiritual inclination, higher learning and pilgrimage.' },
  { id: 'vrishabha', name: 'ரிஷபம்', nameEn: 'Vrishabha (Taurus)', house: '10th House', planets: '—', lord: 'Shukra (Venus)', sig: 'Career & Karma Sthana', aspect: 'Strong 10th house indicates leadership roles in tech, management and independent ventures.' },
  { id: 'mithuna', name: 'மிதுனம்', nameEn: 'Mithuna (Gemini)', house: '11th House', planets: 'சந் (Mo)', lord: 'Budha (Mercury)', sig: 'Labha Sthana & Desires', aspect: 'Chandra in 11th creates Chandra-Budha yoga, ensuring steady liquid wealth and supportive networks.' },
  { id: 'kataka', name: 'கடகம்', nameEn: 'Kataka (Cancer)', house: '12th House', planets: 'சூ (Su), சு (Ve)', lord: 'Chandra (Moon)', sig: 'Moksha & Foreign Travel', aspect: 'Sun and Venus combination promotes opportunities abroad and creative expenditures.' },
  { id: 'simha', name: 'சிம்மம்', nameEn: 'Simha (Leo)', house: '1st House (Lagna)', planets: 'லக் (Asc), பு (Me)', lord: 'Surya (Sun)', sig: 'Self, Vitality & Intellect', isLagna: true, aspect: 'Lagna lord Sun aspected by auspicious planets grants strong confidence, charisma, and clarity.' },
  { id: 'kanya', name: 'கன்னி', nameEn: 'Kanya (Virgo)', house: '2nd House', planets: 'செ (Ma)', lord: 'Budha (Mercury)', sig: 'Dhana & Family Speech', aspect: 'Mars in 2nd house gives decisive communication, boldness in financial planning and real estate.' },
  { id: 'tula', name: 'துலாம்', nameEn: 'Tula (Libra)', house: '3rd House', planets: 'ரா (Ra)', lord: 'Shukra (Venus)', sig: 'Courage & Siblings', aspect: 'Rahu in 3rd gives powerful drive, media acumen and fearlessness in negotiations.' },
  { id: 'vrischika', name: 'விருச்சிகம்', nameEn: 'Vris (Scorpio)', house: '4th House', planets: 'கு (Ju)', lord: 'Kuja (Mars)', sig: 'Sukha Sthana & Property', aspect: 'Jupiter in 4th bestows mother’s blessings, property acquisition and peace of mind.' },
  { id: 'dhanus', name: 'தனுசு', nameEn: 'Dhanus (Sagittarius)', house: '5th House', planets: '—', lord: 'Guru (Jupiter)', sig: 'Poorva Punya & Intuition', aspect: 'Auspicious 5th house promotes sound investments and sharp strategic intuition.' },
  { id: 'makara', name: 'மகரம்', nameEn: 'Makara (Capricorn)', house: '6th House', planets: '—', lord: 'Shani (Saturn)', sig: 'Shatru & Daily Service', aspect: 'Saturn-ruled 6th house guarantees victory over competitors and resilience under pressure.' },
  { id: 'kumbha', name: 'கும்பம்', nameEn: 'Kumbha (Aquarius)', house: '7th House', planets: '—', lord: 'சனி (Saturn)', sig: 'Marriage & Partnership', aspect: 'Lord: சனி (Saturn) • Current Guru Aspect active on 7th Bhava, opening favorable alliance window.' },
]

const D9_HOUSES = [
  { id: 'meena', name: 'மீனம்', nameEn: 'Meena', house: '8th House', planets: 'சூ (Su)', lord: 'Guru' },
  { id: 'mesha', name: 'மேஷம்', nameEn: 'Mesha', house: '9th House', planets: 'சந் (Mo)', lord: 'Kuja' },
  { id: 'vrishabha', name: 'ரிஷபம்', nameEn: 'Vrishabha', house: '10th House', planets: 'பு (Me)', lord: 'Shukra' },
  { id: 'mithuna', name: 'மிதுனம்', nameEn: 'Mithuna', house: '11th House', planets: '—', lord: 'Budha' },
  { id: 'kataka', name: 'கடகம்', nameEn: 'Kataka', house: '12th House', planets: 'கு (Ju)', lord: 'Chandra' },
  { id: 'simha', name: 'சிம்மம்', nameEn: 'Simha', house: '1st House (Lagna)', planets: 'லக் (Asc)', lord: 'Surya', isLagna: true },
  { id: 'kanya', name: 'கன்னி', nameEn: 'Kanya', house: '2nd House', planets: 'சு (Ve)', lord: 'Budha' },
  { id: 'tula', name: 'துலாம்', nameEn: 'Tula', house: '3rd House', planets: 'சனி (Sa)', lord: 'Shukra' },
  { id: 'vrischika', name: 'விருச்சிகம்', nameEn: 'Vris', house: '4th House', planets: 'ரா (Ra)', lord: 'Kuja' },
  { id: 'dhanus', name: 'தனுசு', nameEn: 'Dhanus', house: '5th House', planets: 'செ (Ma)', lord: 'Guru' },
  { id: 'makara', name: 'மகரம்', nameEn: 'Makara', house: '6th House', planets: '—', lord: 'Shani' },
  { id: 'kumbha', name: 'கும்பம்', nameEn: 'Kumbha', house: '7th House', planets: 'கே (Ke)', lord: 'Shani' },
]

export default function InstantChatUser() {
  const { astrologerId: paramAstrologerId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { userWallet, actions } = useAppData()
  const { dismissPanel } = useInstantCall()

  // Match astrologer from directory (defaults to Acharya Raghavan from Gemini prototype)
  const astrologer = useMemo(() => {
    if (paramAstrologerId) {
      const match = consultationAstrologers.find((a) => a.id === paramAstrologerId)
      if (match) return match
    }
    return {
      id: 'acharya-raghavan',
      name: 'Acharya Raghavan',
      specialization: 'Vedic & Nadi Astrologer',
      experience: '18 Yrs Exp',
      languages: ['Tamil', 'English'],
      rating: 4.9,
      reviewsCount: 384,
      chatRate: 15,
      callRate: 20,
      chatStatus: 'Available',
      callStatus: 'Available',
      photo: '/astrologer-photos/acharya-raghavan.png',
    }
  }, [paramAstrologerId])

  // Look up active consultation session
  const activeSession = useMemo(() => {
    const list = getInstantConsultations()
    const mine = list.filter(
      (s) => s.userId === (currentUser?.id || 'guest') || (currentUser?.role === 'user' && s.userId === 'user-demo'),
    )
    return (
      mine.find((s) => s.astrologerId === astrologer.id && s.type === 'chat' && s.status !== 'ended') ||
      mine.find((s) => s.type === 'chat' && s.status !== 'ended') ||
      null
    )
  }, [currentUser?.id, currentUser?.role, astrologer.id])

  // Birth details
  const [birthDetails, setBirthDetails] = useState(() => readSavedBirth(currentUser, activeSession?.birthDetails))
  const [activeProfileTab, setActiveProfileTab] = useState('my-chart') // 'my-chart' | 'partner-chart'

  // Chart settings
  const [chartMode, setChartMode] = useState('D1') // 'D1' | 'D9'
  const [selectedHouseId, setSelectedHouseId] = useState('kumbha')

  // Mobile navigation tab
  const [mobileTab, setMobileTab] = useState('chat') // 'horoscope' | 'chat'

  // Modals state
  const [showEditBirthModal, setShowEditBirthModal] = useState(false)
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false)
  const [showRemediesModal, setShowRemediesModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [ratingSession, setRatingSession] = useState(null)
  const [tempBirth, setTempBirth] = useState(birthDetails)

  // Wallet & Timer state
  const unitRate = Number(astrologer.chatRate || 15)
  const balance = Number(userWallet?.balance || 0)
  const [sessionSeconds, setSessionSeconds] = useState(() => {
    if (activeSession) {
      const left = getConsultationSecondsLeft(activeSession)
      if (left > 0) return left
      if (activeSession.durationMinutes) return Number(activeSession.durationMinutes) * 60
    }
    return 600
  })
  const [spentThisSession, setSpentThisSession] = useState(() => {
    if (activeSession?.amountPaid) return Number(activeSession.amountPaid)
    if (activeSession?.amount) return Number(activeSession.amount)
    return 98.25
  })
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isTransitSaved, setIsTransitSaved] = useState(false)

  // Message composer
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 'msg-sys-1',
      sender: 'system',
      text: `Session connected • ${birthDetails.name}'s D1 & D9 Birth Chart shared automatically`,
    },
    {
      id: 'msg-astro-1',
      sender: 'astrologer',
      text: `Vanakkam ${birthDetails.name.split(' ')[0]}! 🙏 Unge Simha Lagna, Mithuna Rashi (${birthDetails.nakshatra}) jathagam paarthuttu irukken. Currently Guru Maha Dasha – Shani Bhukti nadakkuthu. Marriage & career pathi keppoma?`,
      time: '11:58 AM',
    },
    {
      id: 'msg-user-1',
      sender: 'user',
      text: `Vanakkam Guruji! Enakku ippo Bengaluru-la oru senior tech lead role offer vanthirukku, plus veetla marriage alliance-um paakuranga. Ennoda 7th & 10th house eppadi irukku?`,
      time: '11:59 AM',
    },
    {
      id: 'msg-card-1',
      sender: 'astrologer',
      type: 'transit-card',
      title: 'Jupiter Transit in 11th House (Labha Sthanam)',
      window: 'Nov 2026 – Apr 2027',
      chips: [
        { label: '92% Yoga', accent: true },
        { label: '10th House (Career) Rishabha • Strong' },
        { label: '7th House (Vivaha) Guru Aspect ↑' },
        { label: 'Gaja Kesari Active Yoga' },
      ],
      text: `Unge Simha Lagna-kku 11th house-la Guru transit aagurathala Bengaluru career switch romba nalla growth tharum—neenga தைரியமா accept pannalam! Athe samayam Guru-oda 9th aspect 7th house (Kumbha) mela vizhurathala, Nov 2026 to Apr 2027 kulla nalla varan amaiyum.`,
      time: '12:01 PM',
    },
    {
      id: 'msg-audio-1',
      sender: 'astrologer',
      type: 'audio-pariharam',
      title: 'Audio Pariharam: Guru & Shani Shanti',
      duration: '0:24',
      time: '12:02 PM',
    },
  ])

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Dismiss small floating panel while in this full workspace
  useEffect(() => {
    dismissPanel?.(astrologer.id)
  }, [astrologer.id, dismissPanel])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Ticking timer & Per-minute billing deduction
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Per minute auto-deduction
    const minuteBilling = setInterval(() => {
      if (balance >= unitRate) {
        actions.debitUserWallet({
          amount: unitRate,
          astrologer: astrologer.name,
          duration: 1,
          service: 'Instant Chat (Per Minute)',
          transactionId: `astro-connect:chat-auto:${Date.now()}`,
        })
        setSpentThisSession((prev) => prev + unitRate)
      }
    }, 60000)

    return () => {
      clearInterval(timer)
      clearInterval(minuteBilling)
    }
  }, [actions, astrologer.name, balance, unitRate])

  // Current inspected house
  const currentHouseList = chartMode === 'D1' ? D1_HOUSES : D9_HOUSES
  const inspectedHouse = useMemo(() => {
    return currentHouseList.find((h) => h.id === selectedHouseId) || currentHouseList[0]
  }, [currentHouseList, selectedHouseId])

  // Send message helper
  const sendMessage = (rawText) => {
    const text = (rawText || '').trim()
    if (!text) return

    const newMsg = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, newMsg])
    setDraft('')

    // Astrologer simulated reply tailored to the question
    setTimeout(() => {
      let replyText = `Nalla kelvi! Ungaloda Simha lagnam & Mithuna rashi-kku ${inspectedHouse.name} bhava amsam nalla balamaaga irukku.`
      const lower = text.toLowerCase()
      if (lower.includes('marriage') || lower.includes('varan') || lower.includes('alliance')) {
        replyText = `Ungaloda 7th house Kumbham (Saturn lord). Guru-oda 9th aspect vizhurathala, Nov 2026 to Apr 2027 kulla nalla varan koodum. Auspicious vivaha yoga running! 🙏`
      } else if (lower.includes('gemstone') || lower.includes('stone') || lower.includes('ratna')) {
        replyText = `Simha Lagna & Mithuna Rashi-kku Yellow Sapphire (Pushparagam) or Emerald (Maragatham) romba yogam tharum. Silver or Gold ring-la potukalam. 💎`
      } else if (lower.includes('pariharam') || lower.includes('remedy') || lower.includes('remedies')) {
        replyText = `Eliya pariharam: Vyazhakizhamai thorum Guru dhinam anru Dakshinamurthy-kku manjal malai & kadalai saathi deepam etravum. Manathil nimmathi pirakkum. 🪔`
      } else if (lower.includes('career') || lower.includes('job') || lower.includes('role') || lower.includes('bangalore')) {
        replyText = `Ungaloda 10th house Rishabham balama irukku. 11th house Labha sthanathil Guru transit aagurathal, Bangalore tech lead switch romba nalla growth tharum. தைரியமா accept pannunga! 💼`
      } else if (lower.includes('house') || lower.includes('bhava')) {
        replyText = `Ungaloda ${inspectedHouse.house} (${inspectedHouse.name}) pathi paarkaiyil: Lord ${inspectedHouse.lord} nalla sthanathil irukkar. ${inspectedHouse.planets !== '—' ? `Planets present: ${inspectedHouse.planets}.` : 'No malefic afflictions here.'} Subha dhrishti kooda irukku.`
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `astro-reply-${Date.now()}`,
          sender: 'astrologer',
          text: replyText,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }, 1100)
  }

  // Handle Ask about house
  const askAboutHouse = () => {
    const houseQuery = `Guruji, could you explain my ${inspectedHouse.house} (${inspectedHouse.name} - ${inspectedHouse.sig})?`
    sendMessage(houseQuery)
    setMobileTab('chat')
  }

  // Handle Send message
  const handleSend = (e) => {
    e?.preventDefault()
    sendMessage(draft)
  }

  // Quick Chips
  const sendQuickChip = (chipText) => {
    sendMessage(chipText)
  }

  // Play synthetic sacred chime sound for voice note
  const togglePlayAudio = () => {
    if (!isAudioPlaying) {
      setIsAudioPlaying(true)
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(528, audioCtx.currentTime) // 528 Hz Love/Healing frequency
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5)
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start()
        osc.stop(audioCtx.currentTime + 2.5)
      } catch {
        // audio context optional
      }
      setTimeout(() => {
        setIsAudioPlaying(false)
      }, 4000)
    } else {
      setIsAudioPlaying(false)
    }
  }

  // Save transit recommendation to remedies
  const handleSaveTransitToRemedies = () => {
    setIsTransitSaved(true)
    actions.createAtonement({
      id: `atn-instant-${Date.now()}`,
      userId: currentUser?.id || 'user-demo',
      astrologerName: astrologer.name,
      astrologerId: astrologer.id,
      summary: 'Guru Preeti & Shani Shanti Pariharam for Career & Marriage Yoga',
      sourceType: 'chat',
      days: [
        {
          date: new Date().toISOString().slice(0, 10),
          day: 'Day 1',
          god: 'Lord Dakshinamurthy & Lord Shiva',
          poojas: 'Chant Guru Gayatri 108 times and light sesame oil deepam at Shiva temple.',
          completed: false,
        },
      ],
    })
  }

  // Save edited birth details
  const handleSaveBirth = () => {
    setBirthDetails(tempBirth)
    try {
      window.localStorage.setItem(BIRTH_STORAGE_KEY, JSON.stringify(tempBirth))
    } catch {
      // storage
    }
    setShowEditBirthModal(false)
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-birth-${Date.now()}`,
        sender: 'system',
        text: `Updated birth details for ${tempBirth.name} shared with ${astrologer.name}. Chart refreshed.`,
      },
    ])
  }

  // Top up wallet
  const handleTopUp = (amount) => {
    actions.topUpUserWallet({
      amount,
      method: 'UPI / Quick Pay',
      transactionId: `astro-connect:topup:${Date.now()}`,
    })
    setShowAddMoneyModal(false)
  }

  // End consultation
  const handleEndConsultation = () => {
    let endedRecord = null
    if (activeSession?.id) {
      endedRecord = updateInstantConsultation(activeSession.id, {
        status: 'ended',
        endedAt: new Date().toISOString(),
      })
    }
    setShowEndModal(false)
    const sessionToRate = endedRecord || {
      id: activeSession?.id || `ended-chat-${Date.now()}`,
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      astrologerSpecialization: astrologer.specialization || 'Vedic Astrology',
      astrologerPhoto: astrologer.photo,
      type: 'chat',
      topic: activeSession?.topic || 'Career guidance',
      durationMinutes: activeSession?.durationMinutes || Math.max(1, Math.round(spentThisSession / unitRate)),
      amountPaid: spentThisSession || activeSession?.amountPaid || unitRate,
      userId: currentUser?.id || 'guest',
      userName: currentUser?.name || 'You',
      status: 'ended',
      endedAt: new Date().toISOString(),
    }
    setRatingSession(sessionToRate)
  }

  return (
    <div className="instant-chat-workspace">
      {/* Mobile Tab Toggle */}
      <nav className="instant-chat-mobile-nav" aria-label="Mobile view switcher">
        <button
          type="button"
          className={`instant-chat-mobile-tab ${mobileTab === 'horoscope' ? 'is-active' : ''}`}
          onClick={() => setMobileTab('horoscope')}
        >
          <Compass size={15} /> Horoscope &amp; Chart
        </button>
        <button
          type="button"
          className={`instant-chat-mobile-tab ${mobileTab === 'chat' ? 'is-active' : ''}`}
          onClick={() => setMobileTab('chat')}
        >
          <MessageCircle size={15} /> Live Consultation Chat
        </button>
      </nav>

      <div className="instant-chat-body">
        {/* ====================================================================
            LEFT COLUMN: Horoscope & Consultation Details Panel
            ==================================================================== */}
        <aside className={`instant-chat-sidebar ${mobileTab === 'horoscope' ? 'is-active-tab' : ''}`}>
          <div className="instant-chat-sidebar__header">
            <h2>My Horoscope &amp; Consultation Details</h2>
            <p>Shared Live with Guruji ({astrologer.name})</p>
          </div>

          {/* Wallet Balance Card */}
          <div className="ic-wallet-card">
            <div className="ic-wallet-card__top">
              <span className="ic-wallet-card__label">
                <Wallet size={13} /> Wallet Balance
              </span>
              <span className="ic-wallet-card__rate">₹{unitRate}/min</span>
            </div>
            <div className="ic-wallet-card__mid">
              <span className="ic-wallet-card__balance">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="ic-wallet-card__timeleft">
                ~{Math.floor(balance / unitRate)}m {Math.floor((balance % unitRate) * (60 / unitRate))}s left
              </span>
            </div>
            <div className="ic-wallet-card__actions">
              <span className="ic-wallet-card__subtext">
                Auto-deducts per min · Spent: ₹{spentThisSession.toFixed(2)}
              </span>
              <button type="button" className="ic-wallet-add-btn" onClick={() => setShowAddMoneyModal(true)}>
                <Plus size={12} /> Add Money
              </button>
            </div>
          </div>

          {/* Profile Switcher Tabs */}
          <div className="ic-profile-tabs">
            <button
              type="button"
              className={`ic-profile-tab ${activeProfileTab === 'my-chart' ? 'is-active' : ''}`}
              onClick={() => setActiveProfileTab('my-chart')}
            >
              My Chart ({birthDetails.name.split(' ')[0]})
            </button>
            <button
              type="button"
              className={`ic-profile-tab ${activeProfileTab === 'partner-chart' ? 'is-active' : ''}`}
              onClick={() => setActiveProfileTab('partner-chart')}
            >
              Partner Chart (Kavya S.)
            </button>
            <button
              type="button"
              className="ic-profile-tab ic-profile-tab--edit"
              onClick={() => {
                setTempBirth(birthDetails)
                setShowEditBirthModal(true)
              }}
            >
              Edit Birth Details
            </button>
          </div>

          {/* User Birth Details Card */}
          <div className="ic-birth-info-card">
            <div className="ic-birth-info-card__head">
              <span className="ic-birth-info-card__name">
                {activeProfileTab === 'my-chart' ? `${birthDetails.name} (Self)` : 'Kavya S. (Partner)'}
              </span>
              <button
                type="button"
                className="ic-birth-info-card__edit-btn"
                onClick={() => {
                  setTempBirth(birthDetails)
                  setShowEditBirthModal(true)
                }}
              >
                Edit
              </button>
            </div>
            <div className="ic-birth-info-card__datetime">
              {activeProfileTab === 'my-chart'
                ? `${birthDetails.dob} • ${birthDetails.time} • ${birthDetails.place}`
                : '22 Nov 1997 • 08:15 AM • Coimbatore, TN'}
            </div>
            <div className="ic-birth-pills">
              <div className="ic-birth-pill">
                <span className="ic-birth-pill__label">Lagna</span>
                <span className="ic-birth-pill__val">{birthDetails.lagna.split(' ')[0]}</span>
              </div>
              <div className="ic-birth-pill">
                <span className="ic-birth-pill__label">Rashi</span>
                <span className="ic-birth-pill__val">{birthDetails.rashi.split(' ')[0]}</span>
              </div>
              <div className="ic-birth-pill">
                <span className="ic-birth-pill__label">Nakshatra</span>
                <span className="ic-birth-pill__val">{birthDetails.nakshatra}</span>
              </div>
            </div>
          </div>

          {/* South Indian Rashi Chart (12 Houses) */}
          <div className="ic-rashi-chart-section">
            <div className="ic-rashi-chart-head">
              <div>
                <h3>South Indian Rashi Chart ({chartMode})</h3>
                <p>Tap any house to inspect &amp; ask Guruji</p>
              </div>
              <div className="ic-chart-toggles">
                <button
                  type="button"
                  className={`ic-chart-toggle-btn ${chartMode === 'D1' ? 'is-active' : ''}`}
                  onClick={() => setChartMode('D1')}
                >
                  D1 Rashi
                </button>
                <button
                  type="button"
                  className={`ic-chart-toggle-btn ${chartMode === 'D9' ? 'is-active' : ''}`}
                  onClick={() => setChartMode('D9')}
                >
                  D9 Navamsa
                </button>
              </div>
            </div>

            {/* 4x4 Authentic South Indian Chart Grid */}
            <div className="ic-south-indian-grid">
              {/* Row 1: Meena, Mesha, Vrishabha, Mithuna */}
              {['meena', 'mesha', 'vrishabha', 'mithuna'].map((hId) => {
                const item = currentHouseList.find((h) => h.id === hId)
                const isSelected = selectedHouseId === hId
                return (
                  <div
                    key={hId}
                    role="button"
                    tabIndex={0}
                    className={`ic-chart-box ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedHouseId(hId)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId(hId)}
                  >
                    <span className="ic-chart-box__sign">
                      {item.name}
                      <span className="ic-chart-box__sign-en">{item.nameEn.split(' ')[0]}</span>
                    </span>
                    {item.planets && item.planets !== '—' && (
                      <span className="ic-chart-box__planets">{item.planets}</span>
                    )}
                    <span className="ic-chart-box__house">{item.house.split(' ')[0]}</span>
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
                      className={`ic-chart-box ${selectedHouseId === 'kumbha' ? 'is-selected' : ''}`}
                      onClick={() => setSelectedHouseId('kumbha')}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId('kumbha')}
                    >
                      <span className="ic-chart-box__sign">
                        {kumbha.name}
                        <span className="ic-chart-box__sign-en">Kumbha</span>
                      </span>
                      {kumbha.planets && kumbha.planets !== '—' && (
                        <span className="ic-chart-box__planets">{kumbha.planets}</span>
                      )}
                      <span className="ic-chart-box__house">{kumbha.house.split(' ')[0]}</span>
                    </div>

                    {/* Center 2x2 Box */}
                    <div className="ic-chart-center">
                      <span className="ic-chart-center__tag">South Indian</span>
                      <strong className="ic-chart-center__title">
                        {chartMode === 'D1' ? 'ராசி (Rashi D1)' : 'நவாம்சம் (Navamsa D9)'}
                      </strong>
                      <span className="ic-chart-center__sub">
                        {birthDetails.rashi.split(' ')[0]} ராசி • {birthDetails.lagna.split(' ')[0]} லக்னம்
                      </span>
                      <span className="ic-chart-center__star">{birthDetails.nakshatra}</span>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      className={`ic-chart-box ${selectedHouseId === 'kataka' ? 'is-selected' : ''}`}
                      onClick={() => setSelectedHouseId('kataka')}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId('kataka')}
                    >
                      <span className="ic-chart-box__sign">
                        {kataka.name}
                        <span className="ic-chart-box__sign-en">Kataka</span>
                      </span>
                      {kataka.planets && kataka.planets !== '—' && (
                        <span className="ic-chart-box__planets">{kataka.planets}</span>
                      )}
                      <span className="ic-chart-box__house">{kataka.house.split(' ')[0]}</span>
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
                      className={`ic-chart-box ${selectedHouseId === 'makara' ? 'is-selected' : ''}`}
                      onClick={() => setSelectedHouseId('makara')}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId('makara')}
                    >
                      <span className="ic-chart-box__sign">
                        {makara.name}
                        <span className="ic-chart-box__sign-en">Makara</span>
                      </span>
                      {makara.planets && makara.planets !== '—' && (
                        <span className="ic-chart-box__planets">{makara.planets}</span>
                      )}
                      <span className="ic-chart-box__house">{makara.house.split(' ')[0]}</span>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      className={`ic-chart-box is-lagna ${selectedHouseId === 'simha' ? 'is-selected' : ''}`}
                      onClick={() => setSelectedHouseId('simha')}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId('simha')}
                    >
                      <span className="ic-chart-box__sign">
                        {simha.name}
                        <span className="ic-chart-box__sign-en">Simha (Lagna)</span>
                      </span>
                      {simha.planets && simha.planets !== '—' && (
                        <span className="ic-chart-box__planets">{simha.planets}</span>
                      )}
                      <span className="ic-chart-box__house">1st House</span>
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
                    className={`ic-chart-box ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedHouseId(hId)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedHouseId(hId)}
                  >
                    <span className="ic-chart-box__sign">
                      {item.name}
                      <span className="ic-chart-box__sign-en">{item.nameEn.split(' ')[0]}</span>
                    </span>
                    {item.planets && item.planets !== '—' && (
                      <span className="ic-chart-box__planets">{item.planets}</span>
                    )}
                    <span className="ic-chart-box__house">{item.house.split(' ')[0]}</span>
                  </div>
                )
              })}
            </div>

            {/* Interactive House Details Card */}
            {inspectedHouse && (
              <div className="ic-house-inspector">
                <div className="ic-house-inspector__head">
                  <span className="ic-house-inspector__title">
                    {inspectedHouse.house} • {inspectedHouse.name} ({inspectedHouse.nameEn.split(' ')[0]})
                  </span>
                  <span className="ic-house-inspector__badge">{inspectedHouse.sig}</span>
                </div>
                <p className="ic-house-inspector__desc">{inspectedHouse.aspect}</p>
                <button type="button" className="ic-house-inspector__ask-btn" onClick={askAboutHouse}>
                  Ask Astrologer about this House →
                </button>
              </div>
            )}
          </div>

          {/* Active Dasha & Dosha Status */}
          <div className="ic-dasha-section">
            <h4 className="ic-dasha-section__title">Active Dasha &amp; Dosha Status</h4>
            <div className="ic-dasha-card">
              <div className="ic-dasha-card__row">
                <span className="ic-dasha-card__name">● Running: Guru Maha Dasha • Shani Bhukti</span>
                <span className="ic-dasha-card__pct">68%</span>
              </div>
              <div className="ic-dasha-progress">
                <div className="ic-dasha-progress-bar" style={{ width: '68%' }} />
              </div>
              <p className="ic-dasha-sub">Aug 2024 – Feb 2027 • Antharam: Budha</p>
            </div>
            <div className="ic-dosha-badges">
              <span className="ic-dosha-badge">Mangal Dosha: Low / Cancelled</span>
              <span className="ic-dosha-badge ic-dosha-badge--active">Gaja Kesari: Active ★</span>
            </div>
          </div>
        </aside>

        {/* ====================================================================
            RIGHT COLUMN: Instant Chat Room
            ==================================================================== */}
        <main className={`instant-chat-main ${mobileTab === 'chat' ? 'is-active-tab' : ''}`}>
          {/* Header */}
          <header className="ic-chat-header">
            <div className="ic-chat-astrologer-info">
              <div className="ic-chat-avatar-wrap">
                <img
                  src={getAstrologerPhoto(astrologer) || '/astrologer-photos/acharya-raghavan.png'}
                  alt={astrologer.name}
                  className="ic-chat-avatar"
                />
                <span className="ic-chat-status-dot" />
              </div>
              <div className="ic-chat-astrologer-meta">
                <div className="ic-chat-astrologer-name-row">
                  <h1 className="ic-chat-astrologer-name">{astrologer.name}</h1>
                  <span className="ic-chat-astrologer-rating">★ 4.9</span>
                  <span className="ic-chat-astrologer-status-tag">Online • In Session</span>
                </div>
                <p className="ic-chat-astrologer-sub">
                  Vedic &amp; Nadi Astrologer • 18 Yrs Exp • Tamil / English
                </p>
              </div>
            </div>

            <div className="ic-chat-header-actions">
              <div className={`ic-chat-timer-badge ${sessionSeconds < 120 ? 'ic-chat-timer-badge--warning' : ''}`}>
                <Clock3 size={15} />
                <span>{formatTime(sessionSeconds)}</span>
              </div>
              <button
                type="button"
                className="ic-chat-remedies-btn"
                onClick={() => setShowRemediesModal(true)}
              >
                <Sparkles size={14} /> Remedies{' '}
                <span className="ic-chat-remedies-count">{isTransitSaved ? '3' : '2'}</span>
              </button>
              <button type="button" className="ic-chat-end-btn" onClick={() => setShowEndModal(true)}>
                End Chat
              </button>
            </div>
          </header>

          {/* Session Info Banner */}
          <div className="ic-chat-shared-banner">
            <ShieldCheck size={14} />
            <span>Session connected • {birthDetails.name}&apos;s D1 &amp; D9 Birth Chart shared automatically</span>
          </div>

          {/* Messages Stream */}
          <div className="ic-chat-messages-container">
            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="ic-chat-system-notice-wrap">
                    <span className="ic-chat-system-notice">
                      {msg.text}
                    </span>
                  </div>
                )
              }

              const isUser = msg.sender === 'user'
              return (
                <div
                  key={msg.id}
                  className={`ic-message-row ${isUser ? 'ic-message-row--user' : 'ic-message-row--astrologer'}`}
                >
                  {!isUser && (
                    <img
                      src={getAstrologerPhoto(astrologer) || '/astrologer-photos/acharya-raghavan.png'}
                      alt={astrologer.name}
                      className="ic-message-avatar"
                    />
                  )}
                  <div className="ic-message-bubble">
                    {msg.type === 'transit-card' ? (
                      <div className="ic-transit-card">
                        <div className="ic-transit-card__head">
                          <h4 className="ic-transit-card__title">
                            <Sparkles size={16} className="ic-transit-sparkle" /> {msg.title}
                          </h4>
                          <span className="ic-transit-card__window">Favorable Window: {msg.window}</span>
                        </div>
                        <div className="ic-transit-card__chips">
                          {msg.chips?.map((c, i) => (
                            <span
                              key={i}
                              className={`ic-transit-chip ${c.accent ? 'ic-transit-chip--accent' : ''}`}
                            >
                              {c.label}
                            </span>
                          ))}
                        </div>
                        <p className="ic-transit-card__text">{msg.text}</p>
                        <button
                          type="button"
                          className={`ic-transit-card__action ${isTransitSaved ? 'is-saved' : ''}`}
                          onClick={handleSaveTransitToRemedies}
                        >
                          {isTransitSaved ? <Check size={13} /> : <Plus size={13} />}
                          {isTransitSaved ? 'Saved to Remedies' : 'Save to Remedies'}
                        </button>
                      </div>
                    ) : msg.type === 'audio-pariharam' ? (
                      <div className={`ic-audio-card ${isAudioPlaying ? 'is-playing' : ''}`}>
                        <button
                          type="button"
                          className="ic-audio-play-btn"
                          onClick={togglePlayAudio}
                          aria-label={isAudioPlaying ? 'Pause audio' : 'Play audio'}
                        >
                          {isAudioPlaying ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <div className="ic-audio-meta">
                          <span className="ic-audio-title">{msg.title}</span>
                          <div className="ic-audio-waveform">
                            <span className="ic-wave-bar" />
                            <span className="ic-wave-bar" />
                            <span className="ic-wave-bar" />
                            <span className="ic-wave-bar" />
                            <span className="ic-wave-bar" />
                            <span className="ic-wave-bar" />
                            <span className="ic-wave-bar" />
                            <span className="ic-wave-bar" />
                          </div>
                        </div>
                        <span className="ic-audio-duration">{msg.duration}</span>
                      </div>
                    ) : (
                      <span>{msg.text}</span>
                    )}

                    {msg.time && (
                      <span className="ic-message-time">
                        {msg.time} {msg.type === 'audio-pariharam' ? '• Voice Note' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Question Chips */}
          <div className="ic-quick-chips-wrap">
            <button
              type="button"
              className="ic-quick-chip-btn"
              onClick={() => sendQuickChip('💍 When is my marriage yoga?')}
            >
              💍 When is my marriage yoga?
            </button>
            <button
              type="button"
              className="ic-quick-chip-btn"
              onClick={() => sendQuickChip('💎 Best gemstone for me?')}
            >
              💎 Best gemstone for me?
            </button>
            <button
              type="button"
              className="ic-quick-chip-btn"
              onClick={() => sendQuickChip('🪔 Simple Pariharam?')}
            >
              🪔 Simple Pariharam?
            </button>
            <button
              type="button"
              className="ic-quick-chip-btn"
              onClick={() => sendQuickChip('💼 Career change timing?')}
            >
              💼 Career change timing?
            </button>
          </div>

          {/* Composer */}
          <form className="ic-composer-wrap" onSubmit={handleSend}>
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `img-${Date.now()}`,
                      sender: 'user',
                      text: `[Attached Photo: ${file.name}]`,
                      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
              }}
            />
            <button
              type="button"
              className="ic-composer-btn-attach"
              title="Attach Palm Photo, Partner Chart, or Prashna Number"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={18} />
            </button>

            <div className="ic-composer-input-wrap">
              <input
                type="text"
                className="ic-composer-input"
                placeholder="Type your question in Tamil or English..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="button"
                className="ic-composer-emoji-btn"
                title="Add Namaste / Blessing"
                onClick={() => setDraft((prev) => `${prev} 🙏 `)}
              >
                🙏
              </button>
            </div>

            <button
              type="submit"
              className="ic-composer-send-btn"
              disabled={!draft.trim()}
            >
              <Send size={15} /> Send
            </button>
          </form>
        </main>
      </div>

      {/* ====================================================================
          MODAL: Edit Birth Details
          ==================================================================== */}
      {showEditBirthModal && (
        <div className="ic-modal-backdrop" onClick={() => setShowEditBirthModal(false)}>
          <div className="ic-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ic-modal-head">
              <h3>Edit Birth Details</h3>
              <button type="button" className="ic-modal-close-btn" onClick={() => setShowEditBirthModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="ic-modal-form-label">Full Name</span>
                <input
                  type="text"
                  className="ic-composer-input"
                  value={tempBirth.name}
                  onChange={(e) => setTempBirth({ ...tempBirth, name: e.target.value })}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="ic-modal-form-label">Date of Birth</span>
                  <input
                    type="date"
                    className="ic-composer-input"
                    value={tempBirth.dob}
                    onChange={(e) => setTempBirth({ ...tempBirth, dob: e.target.value })}
                  />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="ic-modal-form-label">Time of Birth</span>
                  <input
                    type="time"
                    className="ic-composer-input"
                    value={tempBirth.time}
                    onChange={(e) => setTempBirth({ ...tempBirth, time: e.target.value })}
                  />
                </label>
              </div>

              <label style={{ display: 'grid', gap: 4 }}>
                <span className="ic-modal-form-label">Place of Birth</span>
                <input
                  type="text"
                  className="ic-composer-input"
                  value={tempBirth.place}
                  onChange={(e) => setTempBirth({ ...tempBirth, place: e.target.value })}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="ic-modal-form-label">Lagna</span>
                  <input
                    type="text"
                    className="ic-composer-input"
                    value={tempBirth.lagna}
                    onChange={(e) => setTempBirth({ ...tempBirth, lagna: e.target.value })}
                  />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="ic-modal-form-label">Rashi</span>
                  <input
                    type="text"
                    className="ic-composer-input"
                    value={tempBirth.rashi}
                    onChange={(e) => setTempBirth({ ...tempBirth, rashi: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              className="ic-composer-send-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleSaveBirth}
            >
              Update Birth Chart &amp; Share
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: Add Money (Quick Wallet Top-up)
          ==================================================================== */}
      {showAddMoneyModal && (
        <div className="ic-modal-backdrop" onClick={() => setShowAddMoneyModal(false)}>
          <div className="ic-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ic-modal-head">
              <h3>Add Money to Wallet</h3>
              <button type="button" className="ic-modal-close-btn" onClick={() => setShowAddMoneyModal(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="ic-modal-subtext">
              Current balance: <strong>₹{balance.toFixed(2)}</strong>. Chat rate is <strong>₹{unitRate}/min</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="ic-modal-topup-btn"
                  onClick={() => handleTopUp(amt)}
                >
                  +₹{amt}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', borderRadius: 10 }}
              onClick={() => navigate('/user/wallet-history')}
            >
              Manage Full Wallet
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: Remedies Recommended
          ==================================================================== */}
      {showRemediesModal && (
        <div className="ic-modal-backdrop" onClick={() => setShowRemediesModal(false)}>
          <div className="ic-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ic-modal-head">
              <h3>Remedies &amp; Pariharams (Session)</h3>
              <button type="button" className="ic-modal-close-btn" onClick={() => setShowRemediesModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="ic-modal-remedy-card">
                <strong className="ic-modal-remedy-title">
                  1. Guru Preeti Pariharam
                </strong>
                <p className="ic-modal-remedy-desc">
                  Chant Guru Gayatri 108 times on Thursdays and offer yellow flowers to Lord Dakshinamurthy.
                </p>
              </div>
              <div className="ic-modal-remedy-card">
                <strong className="ic-modal-remedy-title">
                  2. Shani Shanti Sesame Deepam
                </strong>
                <p className="ic-modal-remedy-desc">
                  Light sesame oil lamp on Saturdays at Shiva/Shani shrine for smooth career progression.
                </p>
              </div>
            </div>
            <Link
              to="/user/atonements"
              className="ic-composer-send-btn"
              style={{ textDecoration: 'none', textAlign: 'center', justifyContent: 'center' }}
            >
              View Full Atonements &amp; Remedies Tracker →
            </Link>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: End Chat Confirmation & Summary
          ==================================================================== */}
      {showEndModal && (
        <div className="ic-modal-backdrop" onClick={() => setShowEndModal(false)}>
          <div className="ic-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ic-modal-head">
              <h3>End Consultation?</h3>
              <button type="button" className="ic-modal-close-btn" onClick={() => setShowEndModal(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="ic-modal-subtext">
              You have been in session with <strong>{astrologer.name}</strong>.
            </p>
            <div className="ic-modal-cost-alert">
              Total paid: <strong>₹{spentThisSession.toFixed(2)}</strong>. You can view transcript and remedies in your history.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowEndModal(false)}
              >
                Keep Chatting
              </button>
              <button
                type="button"
                className="ic-chat-end-btn"
                style={{ flex: 1 }}
                onClick={handleEndConsultation}
              >
                Confirm End
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ====================================================================
          MODAL: Consultation Rating & Review After Ending Chat
          ==================================================================== */}
      {ratingSession && (
        <ConsultationRatingModal
          session={ratingSession}
          astrologer={astrologer}
          onClose={() => {
            setRatingSession(null)
            navigate(`/user/astrologer/${astrologer.id}`)
          }}
          onSubmitted={() => {
            setTimeout(() => {
              setRatingSession(null)
              navigate(`/user/astrologer/${astrologer.id}`)
            }, 1200)
          }}
        />
      )}
    </div>
  )
}
