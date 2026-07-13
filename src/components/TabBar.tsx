import './TabBar.css'

interface TabItem {
  id: string
  icon: string
  label: string
}

const TABS: TabItem[] = [
  { id: 'home', icon: '🏠', label: '홈' },
  { id: 'history', icon: '📋', label: '지난 기록' },
  { id: 'my', icon: '👤', label: '마이' },
]

interface TabBarProps {
  activeId?: string
  onPlaceholderClick?: () => void
}

/** 와이어프레임 `.home-tabbar` — MVP: 비활성 탭 placeholder */
export default function TabBar({
  activeId = 'home',
  onPlaceholderClick,
}: TabBarProps) {
  return (
    <div className="home-tabbar">
      {TABS.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? 'home-tab active' : 'home-tab'}
            onClick={!isActive ? onPlaceholderClick : undefined}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
