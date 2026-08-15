import { NOTIF_ROW_HEIGHT } from '../../utils/notificationLayout.js'

export default function SkeletonRow() {
  return (
    <div className="notif-skeleton-row" style={{ height: NOTIF_ROW_HEIGHT, boxSizing: 'border-box' }} aria-hidden="true">
      <div className="notif-skeleton-bar" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="notif-skeleton-bar" style={{ width: '60%', height: 12 }} />
        <div className="notif-skeleton-bar" style={{ width: '85%', height: 10 }} />
        <div className="notif-skeleton-bar" style={{ width: '30%', height: 10 }} />
      </div>
    </div>
  )
}
