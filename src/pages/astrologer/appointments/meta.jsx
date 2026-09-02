import { Video, PhoneCall, MessageCircle } from 'lucide-react'

export const CALL_TYPE_META = {
  Video: {
    icon: Video,
    label: 'Video Call',
    action: 'Start Video Call',
    actionShort: 'Start Call',
    emptyHint: 'No video link yet',
  },
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
