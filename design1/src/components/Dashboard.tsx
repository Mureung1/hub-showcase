import React from 'react';
import { 
  Bell, Search, Settings, Home, BookOpen, 
  CheckCircle, Clock, AlertCircle, ChevronRight 
} from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Background ambient light effects */}
      <div className="absolute top-0 left-1/2 w-full h-[500px] bg-blue-900/10 rounded-full blur-[150px] -translate-x-1/2 pointer-events-none"></div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col z-10">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
            <span className="font-bold text-white text-sm">AI</span>
          </div>
          <span className="font-bold text-lg text-white tracking-wide">StudentAgent</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { icon: Home, label: 'Dashboard', active: true },
            { icon: CheckCircle, label: 'Action Items', active: false },
            { icon: BookOpen, label: 'Raw Info', active: false },
            { icon: Settings, label: 'Settings', active: false },
          ].map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                item.active 
                  ? 'bg-slate-800 text-white shadow-md border border-slate-700/50' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-blue-400' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-300">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">John Doe</p>
              <p className="text-xs text-slate-400 truncate">Computer Science</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-md">
          <div>
            <h2 className="text-2xl font-bold text-white">Welcome back, John 👋</h2>
            <p className="text-sm text-slate-400 mt-1">Here is your AI brief for today.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-slate-800/50 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors w-64"
              />
            </div>
            <button className="w-10 h-10 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-auto p-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column (Action Items) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span className="w-2 h-6 rounded-full bg-blue-500"></span>
                  <span>Today's Brief</span>
                </h3>
                <button className="text-sm text-blue-400 hover:text-blue-300">View all</button>
              </div>

              <div className="space-y-4">
                {/* Action Item 1 */}
                <div className="glass-panel p-5 rounded-2xl group hover:border-blue-500/30 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex space-x-4">
                      <div className="mt-1">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-semibold px-2 py-1 bg-red-500/10 text-red-400 rounded-md">Urgent</span>
                          <span className="text-xs text-slate-400">Score: 98</span>
                        </div>
                        <h4 className="text-lg font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">운영체제 3차 과제 제출</h4>
                        <p className="text-sm text-slate-400 mt-1 flex items-center">
                          <Clock className="w-4 h-4 mr-1 inline" /> Due tomorrow at 11:59 PM
                        </p>
                      </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Action Item 2 */}
                <div className="glass-panel p-5 rounded-2xl group hover:border-purple-500/30 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex space-x-4">
                      <div className="mt-1">
                        <CheckCircle className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-semibold px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md">Scholarship</span>
                          <span className="text-xs text-slate-400">Score: 85</span>
                        </div>
                        <h4 className="text-lg font-semibold text-slate-100 group-hover:text-purple-400 transition-colors">2026학년도 2학기 장학금 신청</h4>
                        <p className="text-sm text-slate-400 mt-1 flex items-center">
                          <Clock className="w-4 h-4 mr-1 inline" /> Due in 5 days
                        </p>
                      </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Raw Info Stream) */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <span className="w-2 h-6 rounded-full bg-purple-500"></span>
                <span>Recent Notices</span>
              </h3>

              <div className="glass-panel rounded-2xl p-1">
                <div className="p-4 border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors rounded-t-xl cursor-pointer">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400 mb-1 block">CS Dept</span>
                  <p className="text-sm font-medium text-slate-200 leading-snug">졸업논문 예비심사 신청 안내</p>
                  <p className="text-xs text-slate-500 mt-2">Just now</p>
                </div>
                
                <div className="p-4 border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors cursor-pointer">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-purple-400 mb-1 block">School</span>
                  <p className="text-sm font-medium text-slate-200 leading-snug">가을 축제 부스 운영진 모집</p>
                  <p className="text-xs text-slate-500 mt-2">2 hours ago</p>
                </div>

                <div className="p-4 hover:bg-slate-800/30 transition-colors rounded-b-xl cursor-pointer">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 mb-1 block">LMS</span>
                  <p className="text-sm font-medium text-slate-200 leading-snug">[알고리즘] 중간고사 성적 이의신청</p>
                  <p className="text-xs text-slate-500 mt-2">5 hours ago</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
