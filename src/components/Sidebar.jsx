import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: '오늘의 루틴', to: '/routine', enabled: true },
  { label: '주간 플랜', enabled: false },
  { label: '운동 기록', enabled: false },
  { label: '통증 이력', enabled: false },
  { label: '설정', enabled: false },
]

function NavDot({ active }) {
  return <span className={`h-1.5 w-1.5 rounded-[2px] ${active ? 'bg-accent' : 'bg-nav-inactive'}`} />
}

function Sidebar({ weekProgress, routine }) {
  const percent = weekProgress.total > 0 ? Math.round((weekProgress.completed / weekProgress.total) * 100) : 0

  return (
    <aside className="sticky top-0 flex h-screen w-[238px] flex-none flex-col gap-[30px] border-r border-border px-[18px] py-[26px]">
      <div className="flex items-center gap-2.5 px-2">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-xs bg-accent">
          <div className="h-[9px] w-[9px] rotate-45 rounded-[2px] bg-bg" />
        </div>
        <span className="font-display text-[19px] font-bold tracking-[.14em]">REFIT</span>
      </div>

      <nav className="flex flex-col gap-[3px]">
        {NAV_ITEMS.map((item) =>
          item.enabled ? (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-[11px] rounded-sm px-3 py-[11px] ${
                  isActive ? 'border border-border bg-surface' : 'hover:bg-[#151515]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <NavDot active={isActive} />
                  <span className={`text-sm ${isActive ? 'font-semibold text-text' : 'font-medium text-text-secondary'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ) : (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center gap-[11px] rounded-sm px-3 py-[11px] hover:bg-[#151515]"
            >
              <NavDot active={false} />
              <span className="text-sm font-medium text-text-secondary">{item.label}</span>
            </div>
          ),
        )}
      </nav>

      <div className="mt-auto rounded-md border border-border bg-panel p-3.5">
        <div className="font-display mb-[9px] text-[10px] tracking-[.16em] text-text-secondary">THIS WEEK</div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[30px] font-bold text-accent">{weekProgress.completed}</span>
          <span className="text-[13px] text-text-secondary">/ {weekProgress.total} 세션 완료</span>
        </div>
        <div className="mt-[11px] h-[5px] overflow-hidden rounded-[3px] bg-disabled">
          <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-2">
        <div className="h-8 w-8 rounded-full border border-border bg-disabled" />
        <div className="leading-[1.25]">
          <div className="text-[13px] font-semibold text-text">데모 사용자</div>
          <div className="text-[11px] text-text-secondary">
            {routine.splitType} · 주 {routine.daysPerWeek}회
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
