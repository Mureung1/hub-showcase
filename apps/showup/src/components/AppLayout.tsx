import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { signOutUser } from '@/services/auth'
import { toast } from 'sonner'

const navItems = [
  { path: '/app/dashboard', label: '대시보드', icon: '🏠' },
  { path: '/app/customers', label: '고객', icon: '👥' },
  { path: '/app/reservations', label: '예약', icon: '📅' },
  { path: '/app/settings', label: '내 정보', icon: '⚙️' },
]

const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
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
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive(item.path) ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-full h-full text-gray-500"
          >
            <span className="text-xl">🚪</span>
            <span className="text-xs mt-1">로그아웃</span>
          </button>
        </div>
      </nav>

      {/* PC sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-gray-200 flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">ShowUp</h1>
          <p className="text-xs text-gray-500 mt-1">소상공인 고객 이력 관리</p>
        </div>
        <nav className="flex-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg mb-1 ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 text-gray-700 hover:bg-gray-50 rounded-lg w-full"
          >
            <span className="text-xl">🚪</span>
            <span className="font-medium">로그아웃</span>
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