import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { signOutUser } from '@/services/auth'
import { useAuthState } from '@/hooks/useAuth'
import { toast } from 'sonner'
import Icon, { type IconName } from '@/components/ui/Icon'

const navItems = [
  { path: '/app/dashboard', label: '대시보드', icon: 'dashboard' as IconName },
  { path: '/app/customers', label: '고객', icon: 'users' as IconName },
  { path: '/app/reservations', label: '예약', icon: 'calendar' as IconName },
  { path: '/app/settings', label: '내 정보', icon: 'users' as IconName },
]

const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthState()

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  const handleLogoClick = () => {
    if (user) {
      navigate('/app/dashboard')
    } else {
      navigate('/login')
    }
  }

  const handleLogout = async () => {
    try {
      await signOutUser()
      toast.success('로그아웃되었습니다')
      navigate('/login', { replace: true })
    } catch {
      toast.error('로그아웃 실패')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-16 md:pb-0 md:pl-60">
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white md:hidden">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={`flex h-full w-full flex-col items-center justify-center gap-1 text-xs transition-colors ${
                isActive(item.path) ? 'font-semibold text-blue-700' : 'text-slate-500'
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-800"
            aria-label="로그아웃"
          >
            <Icon name="logout" className="h-5 w-5" />
            로그아웃
          </button>
        </div>
      </nav>

      {/* PC sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 hidden w-60 flex-col border-r border-slate-200/80 bg-white md:flex">
        <button
          type="button"
          className="border-b border-slate-100 px-6 py-6 text-left transition-colors hover:bg-slate-50"
          onClick={handleLogoClick}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              S
            </span>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">ShowUp</h1>
          </div>
          <p className="mt-2 text-xs text-slate-500">소상공인 고객 이력 관리</p>
        </button>
        <nav className="flex-1 px-3 py-6" aria-label="주요 메뉴">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            관리
          </p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive(item.path) ? 'page' : undefined}
                className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none ${
                  isActive(item.path)
                    ? 'bg-blue-50 font-semibold text-blue-700 before:absolute before:left-0 before:h-6 before:w-1 before:rounded-r-full before:bg-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen bg-slate-100">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
