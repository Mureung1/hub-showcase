import type { NavItem, View } from '../types/festival'

type BottomNavProps = {
  activeView: View
  items: NavItem[]
  onNavigate: (view: View) => void
}

export function BottomNav({ activeView, items, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="주요 화면">
      {items.map((item) => {
        const Icon = item.icon
        const isActive =
          activeView === item.id ||
          (item.id === 'more' && activeView === 'notices')

        return (
          <button
            className={isActive ? 'nav-item active' : 'nav-item'}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <Icon aria-hidden="true" size={24} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
