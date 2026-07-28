import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { signOutUser } from '@/services/auth'
import { useAuthState } from '@/hooks/useAuth'
import { toast } from 'sonner'

const navItems = [
  { path: '/app/dashboard', label: '대시보드' },
  { path: '/app/customers', label: '고객' },
  { path: '/app/reservations', label: '예약' },
  { path: '/app/settings', label: '내 정보' },
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
    <div className="min-h-screen pb-16 md:pb-0 md:pl-56">
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full text-xs ${
                isActive(item.path) ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-full h-full text-xs text-gray-500"
          >
            로그아웃
          </button>
        </div>
      </nav>

      {/* PC sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-gray-200 flex-col">
        <div className="p-4 border-b border-gray-200 cursor-pointer" onClick={handleLogoClick}>
          <h1 className="text-xl font-bold text-gray-900">ShowUp</h1>
          <p className="text-xs text-gray-500 mt-1">소상공인 고객 이력 관리</p>
        </div>
        <nav className="flex-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-3 rounded-lg mb-1 text-sm ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-3 text-gray-700 hover:bg-gray-50 rounded-lg w-full text-sm"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="bg-gray-50 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout