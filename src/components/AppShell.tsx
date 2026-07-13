import type { ReactNode } from 'react'
import './AppShell.css'

interface AppShellProps {
  children: ReactNode
}

/** 와이어프레임 `.app` — 모바일 풀뷰, PC(≥480px)에서 390×844 중앙 프레임 */
export default function AppShell({ children }: AppShellProps) {
  return <div className="app-shell">{children}</div>
}
