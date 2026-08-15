const TAB_LABELS = {
  all: 'All',
  work: 'Work',
  money: 'Money',
  clients: 'Clients',
  system: 'System',
}

export default function TabBar({ tabs, activeTab, badgeCounts, onSelect }) {
  return (
    <div className="notif-tabbar" role="tablist" aria-label="Notification categories">
      {tabs.map((tab) => {
        const isSelected = tab === activeTab
        const count = badgeCounts[tab] || 0
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`notif-tab${isSelected ? ' selected' : ''}`}
            onClick={() => onSelect(tab)}
          >
            {TAB_LABELS[tab]}
            {count > 0 && <span className="notif-tab-badge">{count > 9 ? '9+' : count}</span>}
          </button>
        )
      })}
    </div>
  )
}
