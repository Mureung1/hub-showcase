import { Store, BarChart3, Video, Archive } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { path: '/setup', label: '내 가게 정보', icon: Store },
    { path: '/dashboard', label: '대시보드', icon: BarChart3 },
    { path: '/generate', label: '릴스 생성', icon: Video },
    { path: '/archive', label: '보관함', icon: Archive }
  ];

  return (
    <aside className="w-[260px] bg-white p-8 shadow-sm sticky top-0 h-screen overflow-y-auto border-r border-[#F1F3F9]">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#151D48]">ShortsGen</h1>
        <p className="text-xs text-[#737791] mt-1">AI 콘텐츠 대시보드</p>
      </div>

      <nav className="space-y-2">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#5D5FEF] text-white shadow-[0_4px_10px_rgba(93,95,239,0.3)]'
                    : 'text-[#151D48] hover:bg-[#F4F7FE]'
                }`
              }
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-8 pt-8 border-t border-[#F1F3F9]">
        <div className="bg-[#F4F7FE] rounded-[20px] p-4">
          <p className="text-xs font-semibold text-[#151D48]">가게 정보</p>
          <p className="text-xs text-[#737791] mt-2">가게명: 로딩 중...</p>
          <p className="text-xs text-[#737791]">업종: 로딩 중...</p>
        </div>
      </div>
    </aside>
  );
}
