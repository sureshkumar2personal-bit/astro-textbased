import { PhoneCall, MessageCircle } from 'lucide-react'

export const CALL_TYPE_META = {
  Audio: {
    icon: PhoneCall,
    label: 'Audio Call',
    action: 'Start Audio Call',
    actionShort: 'Start Call',
    emptyHint: 'No dial-in yet',
  },
  Text: {
    icon: MessageCircle,
    label: 'Text Consultation',
    action: 'Open Chat',
    actionShort: 'Open Chat',
    emptyHint: 'No chat yet',
  },
}

export function callTypeMeta(callType) {
  return CALL_TYPE_META[callType] || CALL_TYPE_META.Audio
}
