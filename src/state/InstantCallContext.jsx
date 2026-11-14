/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InstantCallModal from '../components/user/InstantCallModal.jsx'
import FloatingConsultationPanel from '../components/user/FloatingConsultationPanel.jsx'
import ConsultationRatingModal from '../components/user/ConsultationRatingModal.jsx'
import { useAuth } from './AuthContext.jsx'
import { getInstantConsultations, subscribeToInstantConsultations } from '../utils/instantConsultation.js'

const InstantCallContext = createContext(null)

/**
 * Owns instant call + chat for the whole app:
 *
 *  - `openInstantCall` / `openInstantChat` raise the popup, used to pick a
 *    duration and pay before the astrologer is disturbed.
 *  - once the astrologer accepts, the popup hands over to a floating panel that
 *    mirrors the one on their side.
 *  - dismissing that panel leaves the session running, and the header chip is
 *    the way back in.
 */
export function InstantCallProvider({ children }) {
  const { currentUser } = useAuth()
  let navigate = null
  try {
    navigate = useNavigate()
  } catch {
    // Safe when mounted outside BrowserRouter
  }

  const [popup, setPopup] = useState(null)
  const [dismissed, setDismissed] = useState(null)
  const [hiddenChips, setHiddenChips] = useState({})
  const [active, setActive] = useState(null)
  const [ratingSession, setRatingSession] = useState(null)
  const lastAcceptedRef = useRef(null)

  const userId = currentUser?.id || 'guest'

  useEffect(() => {
    if (active && active.status === 'accepted') {
      setPopup(null)
      lastAcceptedRef.current = active
    }
  }, [active])

  // Track the one live session this user has, so the panel can attach itself
  // the moment it is accepted — regardless of which page they're on.
  useEffect(() => {
    const refresh = (requests = getInstantConsultations()) => {
      const mine = requests.filter(
        (entry) => entry.userId === userId && (entry.status === 'ringing' || entry.status === 'accepted'),
      )
      const call = mine.find((entry) => entry.type === 'call') || null
      const chat = mine.find((entry) => entry.type === 'chat') || null
      setActive(chat || call || null)

      // If active call was accepted and transitioned to ended without a rating yet
      if (lastAcceptedRef.current) {
        const endedMatch = requests.find(
          (entry) =>
            entry.id === lastAcceptedRef.current.id &&
            entry.status === 'ended' &&
            !entry.rating &&
            !entry.skippedRating,
        )
        if (endedMatch && !ratingSession) {
          setRatingSession(endedMatch)
        }
      }
    }
    refresh()
    return subscribeToInstantConsultations(refresh)
  }, [userId, ratingSession])

  // One live session at a time, but no interruption dialog: the newest request
  // simply takes over the visible surface.
  const openSession = useCallback((type, astrologerId) => {
    setDismissed(null)
    setPopup({ type, astrologerId })
  }, [])

  const openInstantCall = useCallback((astrologerId) => openSession('call', astrologerId), [openSession])
  const openInstantChat = useCallback((astrologerId) => openSession('chat', astrologerId), [openSession])

  const closePopup = useCallback(() => setPopup(null), [])

  // Dismissing the panel only hides it. The session keeps running and the
  // header chip offers to bring it back.
  const dismissPanel = useCallback((sessionId) => {
    setDismissed((current) => (current === sessionId ? current : sessionId))
  }, [])

  // Hiding the chip leaves the session running and the panel as it was; the
  // Call / Chat buttons can still reopen it.
  const hideChip = useCallback((sessionId) => {
    setHiddenChips((current) => ({ ...current, [sessionId]: true }))
  }, [])

  const forgetSession = useCallback((id) => {
    setDismissed((current) => (current === id ? null : current))
    setHiddenChips((current) => {
      if (!current[id]) return current
      const next = { ...current }
      delete next[id]
      return next
    })
    // `id` may be a session id or the astrologer the popup was opened for.
    setPopup((current) => (current && (current.sessionId === id || current.astrologerId === id) ? null : current))
  }, [])

  // After astrologer confirms/accepts an instant chat consultation:
  // automatically transition from ringing popup to the live Gemini consultation workspace
  useEffect(() => {
    if (active && active.status === 'accepted' && active.type === 'chat') {
      const targetAstrologerId = active.astrologerId || 'astrologer-demo'
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/user/instantchat')) {
        setPopup(null)
        if (navigate) {
          navigate(`/user/instantchat/${targetAstrologerId}`)
        } else {
          window.location.href = `/user/instantchat/${targetAstrologerId}`
        }
      }
    }
  }, [active?.id, active?.status, active?.type, active?.astrologerId, navigate])

    const value = useMemo(
    () => ({
      popup,
      isOpen: Boolean(popup),
      active,
      isChipHidden: Boolean(active && hiddenChips[active.id]),
      openInstantCall,
      openInstantChat,
      openRating: (session) => setRatingSession(session),
      closePopup,
      dismissPanel,
      hideChip,
      forgetSession,
    }),
    [popup, active, hiddenChips, openInstantCall, openInstantChat, closePopup, dismissPanel, hideChip, forgetSession],
  )

  // The popup owns the request while it is ringing (duration, payment, waiting).
  // Once the astrologer accepts, the popup hands over to the floating panel
  // rather than leaving two surfaces on screen.
  const isAccepted = Boolean(active && active.status === 'accepted')
  const popupHandled = Boolean(popup && isAccepted && active.astrologerId === popup.astrologerId && active.type === popup.type)
  const isInstantChatRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/user/instantchat')
  const panel = isAccepted && dismissed !== active.id && !isInstantChatRoute ? active : null

  return (
    <InstantCallContext.Provider value={value}>
      {children}
      {popup && !popupHandled && (
        <InstantCallModal
          type={popup.type}
          astrologerId={popup.astrologerId}
          onClose={closePopup}
          onEnded={forgetSession}
        />
      )}
      {panel && (
        <FloatingConsultationPanel
          session={panel}
          onDismiss={dismissPanel}
          onEnded={forgetSession}
          onRate={(endedRecord) => setRatingSession(endedRecord)}
        />
      )}
      {ratingSession && (
        <ConsultationRatingModal
          session={ratingSession}
          onClose={() => {
            forgetSession(ratingSession.id)
            setRatingSession(null)
          }}
          onSubmitted={() => {
            forgetSession(ratingSession.id)
            setTimeout(() => setRatingSession(null), 1200)
          }}
        />
      )}
    </InstantCallContext.Provider>
  )
}

export function useInstantCall() {
  const value = useContext(InstantCallContext)
  if (!value) {
    throw new Error('useInstantCall must be used within InstantCallProvider')
  }
  return value
}