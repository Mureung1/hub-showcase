import { Link, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function MainLayout() {
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex h-14 shrink-0 items-center border-b border-zinc-800 bg-zinc-950 px-6">
        <Link to="/" className="text-sm font-semibold tracking-wide">
          <span className="text-cyan-400">전공</span> 시각화 학습실
        </Link>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
