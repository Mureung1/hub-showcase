import React, { useEffect, useState } from 'react';
import { 
  Bell, Search, Settings, Home, BookOpen, 
  CheckCircle, Clock, AlertCircle, ChevronRight, GraduationCap, Flame, AlertTriangle
} from 'lucide-react';

interface ActionItem {
  id: number;
  actionTitle: string;
  category: string;
  priorityScore: number;
  actionDeadline: string;
  irreversibility: string;
  resolutionRationale: string;
  isCompleted: boolean;
}

interface RawInfo {
  id: number;
  title: string;
  sourceType: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [rawInfos, setRawInfos] = useState<RawInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');

  const fetchData = async () => {
    try {
      const [actionRes, rawRes] = await Promise.all([
        fetch('http://localhost:8080/api/dashboard/action-items'),
        fetch('http://localhost:8080/api/dashboard/raw-infos')
      ]);
      
      if (actionRes.ok) {
        setActionItems(await actionRes.json());
      }
      if (rawRes.ok) {
        setRawInfos(await rawRes.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleComplete = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/dashboard/action-items/${id}/complete`, {
        method: 'PUT'
      });
      if (res.ok) {
        setActionItems(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error("Error completing action item:", error);
    }
  };

  const handleAcceptConflict = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/dashboard/resolve-conflict', {
        method: 'POST'
      });
      if (res.ok) {
        // 데이터 다시 불러오기
        setLoading(true);
        fetchData();
      }
    } catch (error) {
      console.error("Error resolving conflict:", error);
    }
  };

  // Conflict 확인 로직 (간단히 3일 이내 마감인 항목이 2개 이상일 때)
  const hasConflict = actionItems.filter(item => {
    if (!item.actionDeadline) return false;
    const days = (new Date(item.actionDeadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return days <= 3 && days >= 0;
  }).length >= 2;

  const getBadgeClass = (irreversibility: string) => {
    if (irreversibility === 'high') return 'badge-coral';
    if (irreversibility === 'medium') return 'badge-mint';
    return 'badge-blue';
  };

  const getIcon = (category: string, irreversibility: string) => {
    if (irreversibility === 'high') return <AlertCircle className="w-6 h-6 text-dark-coral" />;
    if (category === 'SCHOLARSHIP') return <CheckCircle className="w-6 h-6 text-dark-mint" />;
    return <Clock className="w-6 h-6 text-dark-blue" />;
  };

  const getBgClass = (irreversibility: string) => {
    if (irreversibility === 'high') return 'bg-pastel-coral';
    if (irreversibility === 'medium') return 'bg-pastel-mint';
    return 'bg-pastel-blue';
  };

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden font-nunito">
      
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r-2 border-slate-100 flex flex-col z-10 relative">
        <div className="p-8 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-pastel-blue flex items-center justify-center border-2 border-brand-blue/20">
            <GraduationCap className="w-7 h-7 text-dark-blue" />
          </div>
          <span className="font-extrabold text-2xl text-slate-800 tracking-tight">AI Agent</span>
        </div>

        <nav className="flex-1 px-6 py-4 space-y-3">
          {[
            { icon: Home, label: 'Dashboard', bg: 'bg-pastel-blue border-brand-blue/30', color: 'text-brand-blue' },
            { icon: CheckCircle, label: 'Action Items', bg: 'hover:bg-slate-50', color: 'text-slate-400' },
            { icon: BookOpen, label: 'Raw Info', bg: 'hover:bg-slate-50', color: 'text-slate-400' },
            { icon: Settings, label: 'Settings', bg: 'hover:bg-slate-50', color: 'text-slate-400' },
          ].map((item, idx) => {
            const isActive = activeTab === item.label;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(item.label)}
                className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-bold transition-all duration-200 border-2 border-transparent ${
                  isActive 
                    ? 'bg-pastel-blue border-brand-blue/30 text-dark-blue' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'text-brand-blue' : 'text-slate-400'}`} />
                <span className="text-[1.05rem]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="flat-card p-4 flex items-center space-x-4 bg-slate-50 border-slate-200">
            <div className="w-12 h-12 rounded-full bg-pastel-yellow border-2 border-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex items-center justify-center">
              <span className="text-base font-extrabold text-dark-yellow">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-extrabold text-slate-800 truncate">John Doe</p>
              <p className="text-sm font-semibold text-slate-500 truncate">Comp. Science</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden bg-[#F8FAFC]">
        {/* Header */}
        <header className="h-24 px-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800">Hi, John! 🚀</h2>
            <p className="text-base font-semibold text-slate-500 mt-1">Let's check what AI found for you today.</p>
          </div>
          
          <div className="flex items-center space-x-5">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-white border-2 border-slate-200 rounded-full py-3 pl-12 pr-5 text-sm font-semibold text-slate-700 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-pastel-blue transition-all w-72 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]"
              />
            </div>
            <button className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex items-center justify-center text-slate-500 hover:text-brand-blue hover:border-pastel-blue transition-all relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2.5 right-3 w-3 h-3 bg-brand-coral border-2 border-white rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-auto px-10 pb-10">
          {activeTab === 'Dashboard' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column (Action Items) */}
              <div className="lg:col-span-2 space-y-6">
                
                {hasConflict && (
                  <div className="bg-pastel-yellow border-2 border-brand-yellow/50 rounded-2xl p-6 mb-6">
                    <div className="flex items-start space-x-4">
                      <AlertTriangle className="w-8 h-8 text-dark-yellow flex-shrink-0" />
                      <div>
                        <h4 className="text-xl font-extrabold text-dark-yellow mb-2">⚠ 일정 충돌 감지 (Conflict Resolution)</h4>
                        <p className="text-sm font-bold text-slate-700 mb-4">가까운 시일 내에 여러 일정이 겹칩니다. AI가 다음과 같이 재배치를 제안합니다.</p>
                        <div className="space-y-3">
                          {actionItems.slice(0, 2).map(item => (
                            <div key={`conflict-${item.id}`} className="bg-white/60 p-3 rounded-xl border border-brand-yellow/30">
                              <span className="font-extrabold text-slate-800">{item.actionTitle}</span>
                              <p className="text-sm text-slate-600 mt-1">{item.resolutionRationale}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex space-x-3">
                          <button onClick={handleAcceptConflict} className="bg-brand-yellow text-white px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-dark-yellow transition-colors">제안 수락 (Calendar 반영)</button>
                          <button onClick={() => alert("기능 준비 중입니다.")} className="bg-white text-slate-600 px-4 py-2 rounded-xl font-bold border-2 border-slate-200 hover:bg-slate-50 transition-colors">내가 직접 조정</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-extrabold text-slate-800 flex items-center space-x-2">
                    <Flame className="w-7 h-7 text-brand-coral" />
                    <span>Today's Priorities</span>
                  </h3>
                  <button className="text-sm font-bold text-dark-blue hover:text-brand-blue bg-pastel-blue px-4 py-2 rounded-xl transition-colors">View all</button>
                </div>

                <div className="space-y-5">
                  {loading ? (
                    <p className="text-slate-500 font-bold p-4">Loading AI Actions...</p>
                  ) : actionItems.length === 0 ? (
                    <p className="text-slate-500 font-bold p-4">No action items found.</p>
                  ) : (
                    actionItems.map(item => (
                      <div key={item.id} className="flat-card flat-card-hover p-6 cursor-pointer group">
                        <div className="flex items-start justify-between">
                          <div className="flex space-x-5">
                            <div className="mt-1">
                              <div className={`w-12 h-12 rounded-2xl ${getBgClass(item.irreversibility)} flex items-center justify-center`}>
                                {getIcon(item.category, item.irreversibility)}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${getBadgeClass(item.irreversibility)}`}>
                                  {item.category}
                                </span>
                                <span className="text-sm font-bold text-slate-400">Score: {item.priorityScore}</span>
                              </div>
                              <h4 className="text-xl font-extrabold text-slate-800 group-hover:text-dark-blue transition-colors">
                                {item.actionTitle}
                              </h4>
                              {item.actionDeadline && (
                                <p className="text-sm font-semibold text-slate-500 mt-1.5 flex items-center">
                                  <Clock className="w-4 h-4 mr-1.5" /> 
                                  {new Date(item.actionDeadline).toLocaleDateString()}까지
                                </p>
                              )}
                              <p className="text-sm font-medium text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                🤖 {item.resolutionRationale}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => handleComplete(item.id)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-pastel-blue group-hover:text-dark-blue transition-colors flex-shrink-0 relative overflow-hidden">
                            <ChevronRight className="w-5 h-5 stroke-[3] group-hover:opacity-0 transition-opacity absolute" />
                            <CheckCircle className="w-5 h-5 stroke-[3] opacity-0 group-hover:opacity-100 transition-opacity absolute" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column (Raw Info Stream) */}
              <div className="space-y-6">
                <h3 className="text-2xl font-extrabold text-slate-800 flex items-center space-x-2">
                  <span className="w-3 h-7 rounded-full bg-brand-blue"></span>
                  <span>Recent Notices</span>
                </h3>

                <div className="flat-card p-2">
                  {loading ? (
                    <p className="text-slate-500 font-bold p-4 text-center">Loading notices...</p>
                  ) : rawInfos.length === 0 ? (
                    <p className="text-slate-500 font-bold p-4 text-center">No notices found.</p>
                  ) : (
                    rawInfos.map((info, idx) => (
                      <div key={info.id} onClick={() => window.open(info.url, '_blank')} className={`p-4 border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${idx !== rawInfos.length - 1 ? 'border-b-2' : ''} ${idx === 0 ? 'rounded-t-2xl' : ''} ${idx === rawInfos.length - 1 ? 'rounded-b-2xl' : ''}`}>
                        <span className="text-xs font-extrabold tracking-wide uppercase text-dark-blue mb-1 block">
                          {info.sourceType}
                        </span>
                        <p className="text-base font-bold text-slate-700 leading-snug">{info.title}</p>
                        <p className="text-sm font-semibold text-slate-400 mt-1">
                          {new Date(info.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <h3 className="text-3xl font-extrabold text-slate-800 mb-4">{activeTab}</h3>
              <p className="text-lg font-bold text-slate-500">해당 페이지는 준비 중입니다. (MVP 범위 외)</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
