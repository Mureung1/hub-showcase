import { LAYOUT, COLORS } from '../../constants'
import type { NavItem } from '../../types'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: '대시보드', href: '#dashboard' },
    { id: 'analysis', label: '분석', href: '#analysis' },
    { id: 'financial', label: '재무', href: '#financial' },
    { id: 'upload', label: '업로드', href: '#upload' },
  ]

  return (
    <aside
      className="w-sidebar bg-bg-card border-r border-border-color flex flex-col fixed h-screen"
      style={{ width: LAYOUT.sidebarWidth }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-border-color">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: COLORS.brand }}
          >
            S
          </div>
          <h1 className="text-lg font-bold text-text-primary">SmartFF</h1>
        </div>
        <p className="text-xs text-text-secondary mt-1">AI 발주 추천 시스템</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={`
                  w-full px-4 py-3 rounded text-sm font-medium transition-colors
                  ${
                    currentPage === item.id
                      ? 'bg-brand text-white'
                      : 'text-text-secondary hover:bg-bg-primary'
                  }
                `}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile (Placeholder) */}
      <div className="p-4 border-t border-border-color">
        <div className="flex items-center gap-3 px-2 py-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: COLORS.brand }}
          >
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">점주님</p>
            <p className="text-xs text-text-secondary truncate">GS25 매장</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
