import { Clock, Check, X } from 'lucide-react'
import {
  getAppointmentPhase,
  resolveAppointmentWindow,
  format12h,
  countdownLabel,
} from '../../../utils/appointments.js'
import { callTypeMeta } from './meta.jsx'

function IconButton({ icon: Icon, children, className = '', ...props }) {
  return (
    <button type="button" className={className} {...props}>
      <Icon size={16} />
      <span>{children}</span>
    </button>
  )
}

export default function CallButton({
  appointment,
  now,
  inProgress = false,
  onStart,
  onViewDetails,
  size = 'md',
}) {
  const phaseResult = getAppointmentPhase(appointment, now)
  const phase = typeof phaseResult === 'string' ? phaseResult : phaseResult.phase
  const meta = callTypeMeta(appointment.callType)
  const Icon = meta.icon
  const { startMin } = resolveAppointmentWindow(appointment)
  const sizeClass = size === 'lg' ? 'apt-call-btn--lg' : ''

  if (phase === 'cancelled') {
    return (
      <IconButton icon={X} className={`apt-call-btn apt-call-btn--disabled ${sizeClass}`} disabled>
        Cancelled
      </IconButton>
    )
  }

  if (phase === 'completed') {
    return (
      <IconButton icon={Check} className={`apt-call-btn apt-call-btn--completed ${sizeClass}`} onClick={onViewDetails}>
        Completed · View Details
      </IconButton>
    )
  }

  if (phase === 'pending') {
    return (
      <IconButton icon={Clock} className={`apt-call-btn apt-call-btn--disabled ${sizeClass}`} disabled>
        Pending confirmation
      </IconButton>
    )
  }

  if (phase === 'live') {
    if (inProgress) {
      return (
        <IconButton icon={Icon} className={`apt-call-btn apt-call-btn--live ${sizeClass}`} onClick={onStart}>
          Join Call · In Progress
        </IconButton>
      )
    }
    return (
      <IconButton icon={Icon} className={`apt-call-btn apt-call-btn--live apt-call-btn--pulse ${sizeClass}`} onClick={onStart}>
        {meta.action}
      </IconButton>
    )
  }

  // upcoming
  const ms = phaseResult.msUntilStart
  const countdown = countdownLabel(ms)
  return (
    <div className="apt-call-wrap">
      <IconButton icon={Icon} className={`apt-call-btn apt-call-btn--disabled ${sizeClass}`} disabled>
        {appointment.callType === 'Text' ? 'Chat opens' : 'Call starts'} in {countdown}
      </IconButton>
      <div className="apt-call-sub">Available at {format12h(startMin)}</div>
    </div>
  )
}
