import { useEffect, useState } from 'react'
import { getInstantConsultations, subscribeToInstantConsultations } from '../../../../utils/instantConsultation.js'

/** Live view of the astrologer's chat sessions from the shared instant-consultation store, plus a 1 s clock. */
export default function useInstantChats(astrologerId) {
  const [state, setState] = useState(() => ({ sessions: getInstantConsultations(), now: Date.now() }))
  useEffect(() => {
    const refresh = (sessions = getInstantConsultations()) => setState({ sessions, now: Date.now() })
    refresh()
    const unsubscribe = subscribeToInstantConsultations(refresh)
    const timer = window.setInterval(() => setState((current) => ({ ...current, now: Date.now() })), 1000)
    return () => { unsubscribe(); window.clearInterval(timer) }
  }, [])
  const chats = state.sessions.filter((item) => item.astrologerId === astrologerId && item.type === 'chat')
  return { chats, now: state.now }
}
