import { useMemo, useState } from 'react'
import { Bell, CalendarCheck, CheckCheck, ChevronRight, Flame, MessagesSquare, Radio, Tag, UserPlus } from 'lucide-react'
import { ASTROLOGER_NOTIFICATION_TABS, NOTIFICATION_TABS } from '../data/notificationData.js'
import { ROLES } from '../utils/roleRoutes.js'

const CATEGORY_META = {
  follow: { icon: UserPlus, tone: 'tone-coral', label: 'Follow' },
  appointments: { icon: CalendarCheck, tone: 'tone-sky', label: 'Appointments' },
  consultations: { icon: MessagesSquare, tone: 'tone-violet', label: 'Consultations' },
  questions: { icon: MessagesSquare, tone: 'tone-violet', label: 'Questions' },
  pooja: { icon: Flame, tone: 'tone-gold', label: 'Pooja' },
  live: { icon: Radio, tone: 'tone-red', label: 'Live' },
  offers: { icon: Tag, tone: 'tone-teal', label: 'Offers' },
}
const DEFAULT_META = { icon: Bell, tone: 'tone-violet', label: 'General' }

export default function NotificationsPanel({ notifications, role, onSelect, onMarkAllRead }) {
  const tabs = role === ROLES.USER ? NOTIFICATION_TABS : ASTROLOGER_NOTIFICATION_TABS
  const [activeTab, setActiveTab] = useState('all')

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  const tabCounts = useMemo(() => {
    const counts = { all: notifications.length, unread: unreadCount }
    tabs.forEach((tab) => {
      if (tab.key === 'all' || tab.key === 'unread') return
      counts[tab.key] = notifications.filter((item) => item.category === tab.key).length
    })
    return counts
  }, [notifications, tabs, unreadCount])

  const filtered = notifications.filter((item) => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !item.read
    return item.category === activeTab
  })

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-['Space_Grotesk'] font-bold text-[color:var(--text-primary)]">Notifications</div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary-dark)]"
            onClick={onMarkAllRead}
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {tabs.map((tab) => {
          const count = tabCounts[tab.key] || 0
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-150',
                isActive
                  ? 'border-transparent bg-[linear-gradient(135deg,var(--secondary),var(--accent))] text-white shadow-[0_6px_16px_rgba(15,23,42,0.24)]'
                  : 'border-[color:var(--border)] bg-white/90 text-[color:var(--body)] hover:border-[color:var(--secondary)]',
              ].join(' ')}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={[
                    'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                    isActive ? 'bg-white/25 text-white' : 'bg-[color:var(--primary-bg)] text-[color:var(--primary)]',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm text-[color:var(--text-secondary)]">No notifications in this category yet.</div>
        )}
        {filtered.map((item) => {
          const meta = CATEGORY_META[item.category] || DEFAULT_META
          const Icon = meta.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="flex items-start gap-3 rounded-[12px] border px-3 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--secondary)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.10)]"
              style={{
                borderColor: item.read ? 'var(--primary-bg)' : 'var(--secondary)',
                background: item.read ? 'rgba(255,255,255,0.7)' : 'linear-gradient(180deg,var(--primary-bg),#fff)',
                borderLeft: item.read ? undefined : '3px solid var(--secondary)',
                paddingLeft: item.read ? undefined : 9,
              }}
            >
              <span className={`stat-icon h-8 w-8 shrink-0 ${meta.tone}`} style={{ width: 32, height: 32, borderRadius: 10 }}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate ${item.read ? 'font-semibold' : 'font-bold'} text-[color:var(--text-primary)]`}>{item.title}</span>
                  {!item.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--danger)]" />}
                </span>
                <span className="block text-sm text-[color:var(--text-secondary)]">{item.detail}</span>
                <span className="mt-1 block text-xs text-[color:var(--text-secondary)]">{item.time}</span>
              </span>
              <ChevronRight size={16} className="mt-1 shrink-0 text-[color:var(--text-secondary)]" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
