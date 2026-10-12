/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import InstantCallModal from '../components/user/InstantCallModal.jsx'
import FloatingConsultationPanel from '../components/user/FloatingConsultationPanel.jsx'
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
  const [popup, setPopup] = useState(null)
  const [dismissed, setDismissed] = useState(null)
  const [hiddenChips, setHiddenChips] = useState({})
  const [active, setActive] = useState(null)

  const userId = currentUser?.id || 'guest'

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
    }
    refresh()
    return subscribeToInstantConsultations(refresh)
  }, [userId])

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

    const value = useMemo(
    () => ({
      popup,
      isOpen: Boolean(popup),
      active,
      isChipHidden: Boolean(active && hiddenChips[active.id]),
      openInstantCall,
      openInstantChat,
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
  const popupHandled = Boolean(popup && active && active.status === 'accepted' && active.astrologerId === popup.astrologerId && active.type === popup.type)
  const panel = active && active.status === 'accepted' && !popupHandled && dismissed !== active.id ? active : null

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