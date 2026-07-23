import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import AuthStatus from './AuthStatus.tsx'
import { CalendarIcon, CameraIcon, HomeIcon, SettingsIcon, UsersIcon } from './icons.tsx'

const NAV_ITEMS = [
  { to: '/', Icon: HomeIcon, label: '홈' },
  { to: '/record', Icon: CameraIcon, label: '기록' },
  { to: '/calendar', Icon: CalendarIcon, label: '캘린더' },
  { to: '/rooms', Icon: UsersIcon, label: '친구 방' },
  { to: '/settings', Icon: SettingsIcon, label: '설정' },
]

type LayoutProps = {
  title: string
  children: ReactNode
  hideNav?: boolean
}

function Layout({ title, children, hideNav = false }: LayoutProps) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[420px] flex-col bg-surface">
      <header className="px-5 pb-1 pt-5">
        <AuthStatus />
        <h1 className="mt-1.5 text-[22px] text-heading">{title}</h1>
      </header>

      <main className="flex-1 px-5 pb-24 pt-4">{children}</main>

      {!hideNav && (
        <nav className="sticky bottom-0 flex w-full border-t border-border bg-card">
          {NAV_ITEMS.map(({ to, Icon, label }) => (
            <NavLink
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-[3px] py-2.5 pb-3 text-[11px] ${
                  isActive ? 'font-semibold text-accent' : 'text-muted'
                }`
              }
              end={to === '/'}
              key={to}
              to={to}
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

export default Layout
