import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useInstantCall } from '../../state/InstantCallContext.jsx'

/**
 * Deep-link shim for /user/instantchat/:astrologerId. The popup and the floating
 * panel both live in InstantCallProvider, so this just asks it to open.
 */
export default function InstantChatUser() {
  const { astrologerId } = useParams()
  const { openInstantChat } = useInstantCall()

  useEffect(() => {
    openInstantChat(astrologerId)
  }, [astrologerId, openInstantChat])

  return null
}
