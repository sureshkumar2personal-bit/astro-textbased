import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCheck, RefreshCw } from 'lucide-react'
import { createMockNotifications, mockError } from '../../data/mockNotifications.js'
import { selectSections, selectTabBadgeCounts, TABS } from '../../utils/selectSections.js'
import { NOTIF_HEADER_HEIGHT, NOTIF_ROW_HEIGHT } from '../../utils/notificationLayout.js'
import TabBar from './TabBar.jsx'
import EmptyState from './EmptyState.jsx'
import SkeletonRow from './SkeletonRow.jsx'
import NotificationRow from './NotificationRow.jsx'

const EMPTY_MESSAGES = {
  all: 'No notifications right now.',
  work: 'No new questions right now.',
  money: 'No money updates right now.',
  clients: 'No client activity right now.',
  system: 'No system notifications right now.',
}

function useElementHeight() {
  const ref = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    setHeight(el.clientHeight)
    const observer = new ResizeObserver((entries) => {
      setHeight(entries[0].contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, height]
}

function buildListItems(sections) {
  const items = []
  for (const section of sections) {
    items.push({ kind: 'header', key: `header-${section.key}`, title: section.title })
    for (const notification of section.data) {
      items.push({ kind: 'row', key: notification.id, notification, sectionKey: section.key })
    }
  }
  return items
}

function buildOffsets(items) {
  const offsets = [0]
  for (const item of items) {
    const height = item.kind === 'header' ? NOTIF_HEADER_HEIGHT : NOTIF_ROW_HEIGHT
    offsets.push(offsets[offsets.length - 1] + height)
  }
  return offsets
}

function findVisibleRange(offsets, scrollTop, viewportHeight, overscanPx) {
  const count = offsets.length - 1
  if (count <= 0) return [0, -1]
  const viewStart = scrollTop - overscanPx
  const viewEnd = scrollTop + viewportHeight + overscanPx

  let start = 0
  while (start < count - 1 && offsets[start + 1] < viewStart) start++
  let end = start
  while (end < count - 1 && offsets[end] < viewEnd) end++
  return [start, end]
}

export default function NotificationScreen({ onClose, onNavigate }) {
  const [notifications, setNotifications] = useState(() => createMockNotifications())
  const [status, setStatus] = useState('loading')
  const [activeTab, setActiveTab] = useState('all')
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollRef, viewportHeight] = useElementHeight()
  const scrollRafRef = useRef(null)
  const latestScrollTop = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => setStatus('idle'), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => () => {
    if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
  }, [])

  const badgeCounts = useMemo(() => selectTabBadgeCounts(notifications), [notifications])
  const sections = useMemo(
    () => selectSections(notifications, activeTab, Date.now()),
    [notifications, activeTab],
  )
  const listItems = useMemo(() => buildListItems(sections), [sections])
  const offsets = useMemo(() => buildOffsets(listItems), [listItems])
  const totalHeight = offsets[offsets.length - 1]

  const [startIndex, endIndex] = useMemo(
    () => findVisibleRange(offsets, scrollTop, viewportHeight || 480, 240),
    [offsets, scrollTop, viewportHeight],
  )

  const handleScroll = useCallback((e) => {
    latestScrollTop.current = e.currentTarget.scrollTop
    if (scrollRafRef.current != null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      setScrollTop(latestScrollTop.current)
      scrollRafRef.current = null
    })
  }, [])

  const handlePressRow = useCallback((id, deepLink) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    onNavigate?.(deepLink)
  }, [onNavigate])

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const handlePressAction = useCallback((id, action) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n
        if (action === 'accept' || action === 'decline') {
          return { ...n, read: true, actions: [] }
        }
        return { ...n, read: true }
      }),
    )
    if (action === 'reply') {
      const notification = notifications.find((n) => n.id === id)
      if (notification) onNavigate?.(notification.deepLink)
    }
  }, [notifications, onNavigate])

  const handleRefresh = useCallback(() => {
    setStatus('loading')
    setTimeout(() => {
      setNotifications(createMockNotifications())
      setStatus('idle')
    }, 800)
  }, [])

  const handleRetry = useCallback(() => {
    setStatus('loading')
    setTimeout(() => setStatus('idle'), 500)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="notif-screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div className="popover-title" style={{ marginBottom: 0 }}>Notifications</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {unreadCount > 0 && status === 'idle' && (
            <button type="button" className="link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13 }} onClick={handleMarkAllRead}>
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            aria-label="Refresh notifications"
            onClick={handleRefresh}
            disabled={status === 'loading'}
          >
            <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <TabBar tabs={TABS} activeTab={activeTab} badgeCounts={badgeCounts} onSelect={setActiveTab} />

      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {status === 'loading' && (
          <div>
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="notif-empty">
            <div>{mockError.message}</div>
            <button type="button" className="link-btn" style={{ marginTop: 8 }} onClick={handleRetry}>
              Retry
            </button>
          </div>
        )}

        {status === 'idle' && listItems.length === 0 && (
          <EmptyState message={EMPTY_MESSAGES[activeTab] || EMPTY_MESSAGES.all} />
        )}

        {status === 'idle' && listItems.length > 0 && (
          <div style={{ height: totalHeight, position: 'relative' }}>
            {listItems.slice(startIndex, endIndex + 1).map((item, i) => {
              const actualIndex = startIndex + i
              const top = offsets[actualIndex]
              const height = item.kind === 'header' ? NOTIF_HEADER_HEIGHT : NOTIF_ROW_HEIGHT
              return (
                <div key={item.key} style={{ position: 'absolute', top, left: 0, right: 0, height }}>
                  {item.kind === 'header' ? (
                    <div className="notif-section-title">{item.title}</div>
                  ) : (
                    <NotificationRow
                      notification={item.notification}
                      sectionKey={item.sectionKey}
                      now={Date.now()}
                      onPressRow={handlePressRow}
                      onPressAction={handlePressAction}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
