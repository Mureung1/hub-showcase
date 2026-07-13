import { Store, BarChart3, Video, Archive } from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView }) {
  const navItems = [
    { id: 'setup', label: '내 가게 정보', icon: Store },
    { id: 'dashboard', label: '대시보드', icon: BarChart3 },
    { id: 'generate', label: '릴스 생성', icon: Video },
    { id: 'archive', label: '보관함', icon: Archive }
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
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#5D5FEF] text-white shadow-primary'
                  : 'text-[#151D48] hover:bg-[#F4F7FE]'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-8 pt-8 border-t border-[#F1F3F9]">
        <div className="bg-[#F4F7FE] rounded-[20px] p-4">
          <p className="text-xs font-semibold text-[#151D48]">가게 정보</p>
          <p className="text-xs text-[#737791] mt-2">가게명: 미등록</p>
          <p className="text-xs text-[#737791]">업종: 미등록</p>
        </div>
      </div>
    </aside>
  );
}
