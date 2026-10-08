import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useInstantCall } from '../../state/InstantCallContext.jsx'

/**
 * Deep-link shim for /user/call/:astrologerId. The popup itself lives in
 * InstantCallProvider, so this just asks it to open for the route's astrologer.
 */
export default function CallUser() {
  const { astrologerId } = useParams()
  const { openInstantCall } = useInstantCall()

  useEffect(() => {
    openInstantCall(astrologerId)
  }, [astrologerId, openInstantCall])

  return null
}