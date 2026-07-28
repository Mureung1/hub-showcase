import { useState, useEffect } from 'react'
import { Home, BarChart2, Plus, MessageCircle, User } from 'lucide-react'
import HomeScreen from './screens/HomeScreen'
import StatsScreen from './screens/StatsScreen'
import AICoachScreen, { INITIAL_COACH_MESSAGES, type Message } from './screens/AICoachScreen'
import AddExpenseScreen from './screens/AddExpenseScreen'
import MyPageScreen from './screens/MyPageScreen'
import AuthScreen from './screens/AuthScreen'
import { getCurrentUser, type AuthUser } from './lib/api'

type Tab = 'home' | 'stats' | 'add' | 'coach' | 'mypage'
export type MyPageIntent = 'survival' | 'subscriptions' | null

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [showAdd, setShowAdd] = useState(false)
  const [survivalModeOff, setSurvivalModeOff] = useState(false)
  const [coachMessages, setCoachMessages] = useState<Message[]>(INITIAL_COACH_MESSAGES)
  const [hasUnreadCoachMessage, setHasUnreadCoachMessage] = useState(false)
  const [mypageIntent, setMypageIntent] = useState<MyPageIntent>(null)

  // 새로고침해도 세션이 살아있으면 로그인 화면으로 안 튕기도록 마운트 시 한 번 확인한다 (#60).
  useEffect(() => {
    getCurrentUser()
      .then(user => {
        setCurrentUser(user)
        setAuthed(user !== null)
      })
      .finally(() => setCheckingSession(false))
  }, [])

  const handleAuth = (user: AuthUser) => {
    setCurrentUser(user)
    setAuthed(true)
  }

  const handleTabPress = (tab: Tab) => {
    if (tab === 'add') {
      setShowAdd(true)
      return
    }
    if (tab === 'coach') {
      setHasUnreadCoachMessage(false)
    }
    setActiveTab(tab)
  }

  // 지출 추가(#41)로 AI 코치가 먼저 말을 걸기로 판단했을 때, 챗봇 대화 목록에 그대로 추가한다.
  const pushAgentMessage = (text: string) => {
    setCoachMessages(prev => [...prev, { id: Date.now(), role: 'ai', text }])
    if (activeTab !== 'coach') setHasUnreadCoachMessage(true)
  }

  // 홈 화면의 생존모드/구독 카드에서 마이페이지로 넘어갈 때, 어느 패널을 열어둘지 같이 전달한다.
  const goToMyPage = (intent: MyPageIntent) => {
    setMypageIntent(intent)
    setActiveTab('mypage')
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
          {checkingSession ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} />
          ) : !authed ? (
            <AuthScreen onAuth={handleAuth} />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeScreen
                  survivalModeOff={survivalModeOff}
                  onGoToSettings={() => setActiveTab('mypage')}
                  onGoToStats={() => setActiveTab('stats')}
                  onGoToCoach={() => { setHasUnreadCoachMessage(false); setActiveTab('coach') }}
                  onGoToSurvival={() => goToMyPage('survival')}
                  onGoToSubscriptions={() => goToMyPage('subscriptions')}
                  user={currentUser}
                />
              )}
              {activeTab === 'stats' && <StatsScreen />}
              {/* 탭을 오갈 때 대화 내역이 사라지지 않도록 언마운트 대신 숨김 처리 */}
              <div style={{ display: activeTab === 'coach' ? 'block' : 'none', height: '100%' }}>
                <AICoachScreen messages={coachMessages} setMessages={setCoachMessages} />
              </div>
              {activeTab === 'mypage' && (
                <MyPageScreen
                  survivalModeOff={survivalModeOff}
                  onToggleSurvivalMode={() => setSurvivalModeOff((v) => !v)}
                  user={currentUser}
                  onUserUpdated={setCurrentUser}
                  openIntent={mypageIntent}
                  onIntentHandled={() => setMypageIntent(null)}
                />
              )}
            </>
          )}
        </div>

        {/* Bottom Navigation — 인증 후에만 표시 */}
        {authed && <div
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
          <NavItem icon={<MessageCircle size={22} />} label="AI 코치" active={activeTab === 'coach'} onPress={() => handleTabPress('coach')} showDot={hasUnreadCoachMessage} />
          <NavItem icon={<User size={22} />} label="마이페이지" active={activeTab === 'mypage'} onPress={() => handleTabPress('mypage')} />
        </div>}
      </div>

      {showAdd && <AddExpenseScreen onClose={() => setShowAdd(false)} onAgentMessage={pushAgentMessage} />}
    </div>
  )
}

function NavItem({ icon, label, active, onPress, showDot }: { icon: React.ReactNode; label: string; active: boolean; onPress: () => void; showDot?: boolean }) {
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
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative' }}>
        {icon}
        {showDot && (
          <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 99, background: '#FF6B6B', border: '1.5px solid white' }} />
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: 'Pretendard' }}>{label}</span>
    </button>
  )
}
