import { Link, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AuthStatus from './AuthStatus'
import { QnaPanelProvider } from '../features/qna/context/QnaPanelContext'
import { AuthProvider } from '../features/auth/context/AuthContext'

export default function MainLayout() {
  return (
    <AuthProvider>
      <QnaPanelProvider>
        <div
          className="flex h-screen flex-col"
          style={{ background: 'var(--color-bg-page)', color: 'var(--color-text-primary)' }}
        >
          <header
            className="flex h-14 shrink-0 items-center gap-2.5 border-b px-6"
            style={{ borderColor: 'var(--color-border-card)' }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-[7px]"
              style={{ background: 'var(--color-accent-fill)', color: 'var(--color-accent)', boxShadow: '0 0 14px rgba(34,211,238,0.35)' }}
            >
              <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <circle cx="8" cy="3" r="1.4" />
                <line x1="8" y1="4.4" x2="4.3" y2="8" />
                <line x1="8" y1="4.4" x2="11.7" y2="8" />
                <circle cx="4.3" cy="9.4" r="1.4" />
                <circle cx="11.7" cy="9.4" r="1.4" />
              </svg>
            </span>
            <Link to="/" className="text-sm font-semibold tracking-wide">
              <span style={{ color: 'var(--color-accent)' }}>전공</span> 시각화 학습실
            </Link>
            <AuthStatus />
          </header>
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">
              <Outlet />
            </main>
          </div>
        </div>
      </QnaPanelProvider>
    </AuthProvider>
  )
}
