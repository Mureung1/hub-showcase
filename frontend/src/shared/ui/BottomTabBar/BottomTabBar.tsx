import './BottomTabBar.css'

export type MainTab = 'today' | 'myGgaem'

type BottomTabBarProps = {
  activeTab: MainTab
  onChange: (tab: MainTab) => void
}

export default function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <footer className="bottom-tabbar">
      <button
        type="button"
        className={`bottom-tab${activeTab === 'today' ? ' bottom-tab--active' : ''}`}
        aria-current={activeTab === 'today' ? 'page' : undefined}
        onClick={() => onChange('today')}
      >
        <HomeIcon />
        오늘의 깸
      </button>
      <button
        type="button"
        className={`bottom-tab${activeTab === 'myGgaem' ? ' bottom-tab--active' : ''}`}
        aria-current={activeTab === 'myGgaem' ? 'page' : undefined}
        onClick={() => onChange('myGgaem')}
      >
        <CalendarIcon />
        나의 깸
      </button>
    </footer>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 11L12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 9h16M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
