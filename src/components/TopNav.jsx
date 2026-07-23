import { Link, useLocation } from 'react-router-dom'
import mascotKkini from '../assets/마스코트-끼니.png'

const NAV_LINKS = [
  { label: '냉장고', to: '/', activeOn: ['/'] },
  { label: '레시피', to: '/home', activeOn: ['/home'] },
]

// 상단 고정 네비게이션 — prototype-v2에서 검증한 레이아웃(마스코트 로고 + 링크 + 검색창)을 그대로 포팅
function TopNav() {
  const location = useLocation()

  return (
    <div className="flex flex-wrap items-center gap-6 border-b-2 border-ink bg-bg-surface px-6 py-0.5">
      <div className="flex items-center gap-1.5">
        <img src={mascotKkini} alt="끼니픽" className="block h-[90px] w-[90px] object-contain" />
        <span className="font-display text-[28.5px] text-text-primary">끼니픽</span>
      </div>
      <div className="flex flex-wrap gap-5">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            to={link.to}
            className={`font-display text-xl border-b-2 pb-0.5 ${
              link.activeOn.includes(location.pathname)
                ? 'border-primary text-text-primary'
                : 'border-transparent text-text-secondary'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="ml-auto rounded-full border-2 border-border bg-bg-page px-4 py-2 text-sm text-text-secondary">
        🔍 레시피 검색
      </div>
    </div>
  )
}

export default TopNav
