import { useState } from 'react'
import { Home, BarChart2, Plus, MessageCircle, User } from 'lucide-react'
import HomeScreen from './screens/HomeScreen'
import StatsScreen from './screens/StatsScreen'
import AICoachScreen from './screens/AICoachScreen'
import AddExpenseScreen from './screens/AddExpenseScreen'
import MyPageScreen from './screens/MyPageScreen'

type Tab = 'home' | 'stats' | 'add' | 'coach' | 'mypage'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [showAdd, setShowAdd] = useState(false)

  const handleTabPress = (tab: Tab) => {
    if (tab === 'add') {
      setShowAdd(true)
      return
    }
    setActiveTab(tab)
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div
        style={{
          width: 393,
          height: 852,
          background: 'var(--background)',
          borderRadius: 44,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 40px 100px rgba(0,0,0,0.25), 0 0 0 10px #1A1D27',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Status Bar */}
        <div
          style={{
            height: 50,
            background: 'var(--background)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 28,
            paddingRight: 24,
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--foreground)' }}>9:41</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 18, height: 12, border: '1.5px solid var(--foreground)', borderRadius: 3, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 2, left: 2, right: 3, bottom: 2, background: 'var(--foreground)', borderRadius: 1 }} />
              <div style={{ position: 'absolute', top: 3, right: -4, width: 2, height: 6, background: 'var(--foreground)', borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* Screen Content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="no-scrollbar">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'stats' && <StatsScreen />}
          {activeTab === 'coach' && <AICoachScreen />}
          {activeTab === 'mypage' && <MyPageScreen />}
        </div>

        {/* Bottom Navigation */}
        <div
          style={{
            height: 82,
            background: 'white',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingBottom: 16,
            paddingTop: 8,
            flexShrink: 0,
          }}
        >
          <NavItem icon={<Home size={22} />} label="홈" active={activeTab === 'home'} onPress={() => handleTabPress('home')} />
          <NavItem icon={<BarChart2 size={22} />} label="통계" active={activeTab === 'stats'} onPress={() => handleTabPress('stats')} />
          <button
            onClick={() => handleTabPress('add')}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #4F8EF7, #6ED6C8)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(79,142,247,0.4)',
              marginTop: -16,
            }}
          >
            <Plus size={26} color="white" strokeWidth={2.5} />
          </button>
          <NavItem icon={<MessageCircle size={22} />} label="AI 코치" active={activeTab === 'coach'} onPress={() => handleTabPress('coach')} />
          <NavItem icon={<User size={22} />} label="마이페이지" active={activeTab === 'mypage'} onPress={() => handleTabPress('mypage')} />
        </div>
      </div>

      {showAdd && <AddExpenseScreen onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function NavItem({ icon, label, active, onPress }: { icon: React.ReactNode; label: string; active: boolean; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--primary)' : '#9CA3AF',
        minWidth: 56,
      }}
    >
      {icon}
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: 'Pretendard' }}>{label}</span>
    </button>
  )
}
