import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', label: '홈', icon: 'home', end: true },
  { to: '/trend', label: '트렌드', icon: 'trending_up' },
  { to: '/insight', label: '인사이트', icon: 'insights' },
  { to: '/mypage', label: '마이페이지', icon: 'person' },
  { to: '/settings', label: '설정', icon: 'settings' },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex bg-surface">
      <aside className="w-[280px] shrink-0 border-r border-outline-variant flex flex-col justify-between sticky top-0 h-screen overflow-y-auto">
        <div>
          <div className="px-stack-lg py-stack-lg">
            <span className="font-display-lg text-on-surface" style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 700 }}>
              Newssist
            </span>
            <div className="font-label-mono text-label-mono uppercase tracking-wide text-primary mt-1">
              AI Intelligence
            </div>
          </div>

          <nav className="px-stack-md flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-stack-sm px-stack-md py-2.5 rounded font-body-md text-body-md ${
                    isActive ? 'bg-btn-gray text-on-surface' : 'text-on-surface-variant'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="px-stack-md pb-stack-lg">
          <div className="rounded-xl bg-surface-container-low p-stack-md mb-stack-md">
            <div className="font-label-mono text-label-mono uppercase tracking-wide text-on-surface-variant mb-1">
              PRO 업그레이드
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-stack-sm">
              난이도별 요약 무제한 이용
            </p>
            <button
              type="button"
              title="준비 중"
              className="w-full bg-primary text-on-primary rounded-lg py-2 font-body-md text-body-md"
            >
              업그레이드
            </button>
          </div>

          <div className="flex items-center justify-between px-stack-sm font-label-mono text-label-mono uppercase tracking-wide text-on-surface-variant">
            <span>도움말</span>
            <button type="button" onClick={signOut} className="text-error">
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-[80px] shrink-0 border-b border-outline-variant bg-surface px-container-padding flex items-center justify-between gap-stack-md">
          <div className="relative w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              placeholder="키워드, 기사 검색"
              className="w-full border border-outline-variant rounded-lg pl-9 pr-3 py-2 font-body-md text-body-md bg-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-stack-sm shrink-0">
            <button type="button" className="w-9 h-9 flex items-center justify-center rounded bg-btn-gray" title="알림">
              <span className="material-symbols-outlined text-[20px] text-on-surface">notifications</span>
            </button>
            <div
              className="w-9 h-9 flex items-center justify-center rounded-full bg-btn-gray font-label-mono text-label-mono text-on-surface"
              title={user?.email}
            >
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
