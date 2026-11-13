import { useEffect, useState } from 'react'
import { getInstantConsultation, getInstantConsultations, subscribeToInstantConsultations, updateInstantConsultation } from '../../../../utils/instantConsultation.js'
import { activeCall, staleRingingCalls, waitingCalls } from '../../../../utils/instantCallConsole.js'

/** Live view of this astrologer's instant calls: the store plus a 1s clock for waiting/billing timers. */
export default function useInstantCalls(astrologerId) {
  const [sessions, setSessions] = useState(() => getInstantConsultations())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => subscribeToInstantConsultations(setSessions), [])
  useEffect(() => {
    const tick = () => {
      const current = Date.now()
      // Same rule the dashboard applies: a call nobody answers inside the ring window becomes a missed call.
      staleRingingCalls(getInstantConsultations(), astrologerId, current)
        .forEach((request) => updateInstantConsultation(request.id, { status: 'expired', expiredAt: new Date(current).toISOString() }))
      setNow(current)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [astrologerId])

  return { sessions, now, waiting: waitingCalls(sessions, astrologerId, now), active: activeCall(sessions, astrologerId) }
}

/** Re-reads the stored request so one already answered, cancelled or expired is never answered twice. */
export const isStillRinging = (request) => getInstantConsultation(request.id)?.status === 'ringing'
