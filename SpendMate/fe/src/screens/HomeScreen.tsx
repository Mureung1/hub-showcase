import { useState } from 'react'
import { Bell, ChevronRight, TrendingUp, TrendingDown, Coffee, ShoppingCart, Utensils, Car, Zap, Package, X, Search } from 'lucide-react'
import SurvivalModeScreen from './SurvivalModeScreen'
const CALENDAR_DAYS = ['일', '월', '화', '수', '목', '금', '토']

const ALL_EXPENSES = [
  { id: 1, name: '스타벅스', category: '카페', amount: 6500, time: '오늘 08:30', icon: Coffee, color: '#6F4E37', bg: '#FFF3E0' },
  { id: 2, name: 'GS25 편의점', category: '편의점', amount: 4200, time: '오늘 11:15', icon: Package, color: '#4F8EF7', bg: '#EBF2FF' },
  { id: 3, name: '배달의민족', category: '외식', amount: 18500, time: '어제', icon: Utensils, color: '#00C4B3', bg: '#E8F8F6' },
  { id: 4, name: '이마트', category: '식료품', amount: 32700, time: '어제', icon: ShoppingCart, color: '#FF6B6B', bg: '#FFF0F0' },
  { id: 5, name: '카카오T', category: '교통', amount: 9800, time: '2일 전', icon: Car, color: '#FFC857', bg: '#FFF8E8' },
  { id: 6, name: '쿠팡', category: '쇼핑', amount: 45200, time: '3일 전', icon: Package, color: '#9B8FFF', bg: '#F0EFFF' },
  { id: 7, name: '파리바게뜨', category: '카페', amount: 8900, time: '3일 전', icon: Coffee, color: '#6F4E37', bg: '#FFF3E0' },
  { id: 8, name: '버스', category: '교통', amount: 1350, time: '4일 전', icon: Car, color: '#FFC857', bg: '#FFF8E8' },
  { id: 9, name: '세븐일레븐', category: '편의점', amount: 3600, time: '4일 전', icon: Package, color: '#4F8EF7', bg: '#EBF2FF' },
  { id: 10, name: '홈플러스', category: '식료품', amount: 54100, time: '5일 전', icon: ShoppingCart, color: '#FF6B6B', bg: '#FFF0F0' },
  { id: 11, name: '요기요', category: '외식', amount: 22000, time: '5일 전', icon: Utensils, color: '#00C4B3', bg: '#E8F8F6' },
  { id: 12, name: 'CGV', category: '문화', amount: 14000, time: '6일 전', icon: TrendingUp, color: '#9B8FFF', bg: '#F0EFFF' },
]

function buildCalendar() {
  const today = new Date(2026, 6, 8)
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return { cells, today: today.getDate() }
}

const SPEND_DAYS: Record<number, 'low' | 'mid' | 'high'> = {
  1: 'low', 2: 'mid', 3: 'low', 4: 'high', 5: 'mid',
  7: 'low', 8: 'mid', 10: 'high', 11: 'low', 14: 'mid',
}

/* ── 전체 지출 목록 모달 ── */
function AllExpensesModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)

  const categories = ['전체', '카페', '외식', '식료품', '편의점', '교통', '쇼핑', '문화']

  const filtered = ALL_EXPENSES.filter(e => {
    const matchSearch = e.name.includes(search) || e.category.includes(search)
    const matchCat = !selectedCat || selectedCat === '전체' || e.category === selectedCat
    return matchSearch && matchCat
  })

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div
        style={{
          position: 'relative', width: 393, maxHeight: '85%', background: 'var(--background)',
          borderRadius: '28px 28px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
          animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--foreground)' }}>전체 지출 내역</h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>7월 · 총 {filtered.length}건 · {totalAmount.toLocaleString()}원</p>
            </div>
            <button
              onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: 99, background: 'var(--border)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color="var(--muted)" />
            </button>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', marginBottom: 12 }}>
            <Search size={16} color="var(--muted)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="지출 검색..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--foreground)', fontFamily: 'Pretendard' }}
            />
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} className="no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat === '전체' ? null : cat)}
                style={{
                  whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 99, border: '1.5px solid',
                  borderColor: (selectedCat === cat || (!selectedCat && cat === '전체')) ? '#4F8EF7' : 'var(--border)',
                  background: (selectedCat === cat || (!selectedCat && cat === '전체')) ? '#EBF2FF' : 'white',
                  color: (selectedCat === cat || (!selectedCat && cat === '전체')) ? '#4F8EF7' : 'var(--muted)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Pretendard',
                  transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Expense List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }} className="no-scrollbar">
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 8 }}>
              <span style={{ fontSize: 40 }}>🔍</span>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>검색 결과가 없어요</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              {filtered.map((item, idx) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '14px 16px',
                      borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={item.color} />
                    </div>
                    <div style={{ flex: 1, marginLeft: 12 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{item.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: item.color, background: item.bg, padding: '2px 6px', borderRadius: 99 }}>{item.category}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.time}</span>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>-{item.amount.toLocaleString()}원</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface HomeScreenProps {
  survivalModeOff: boolean
  onGoToSettings: () => void
}

export default function HomeScreen({ survivalModeOff, onGoToSettings }: HomeScreenProps) {
  const { cells, today } = buildCalendar()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showAllExpenses, setShowAllExpenses] = useState(false)
  const budget = 600000
  const spent = 287400
  const remaining = budget - spent
  const percent = Math.round((spent / budget) * 100)
  const recentExpenses = ALL_EXPENSES.slice(0, 5)

  const lastDayOfMonth = new Date(2026, 7, 0).getDate()
  const daysLeft = lastDayOfMonth - today + 1
  const inSurvivalMode = remaining / budget < 0.15 && !survivalModeOff

  if (inSurvivalMode) {
    return (
      <SurvivalModeScreen
        remaining={remaining}
        total={budget}
        daysLeft={daysLeft}
        onGoToSettings={onGoToSettings}
      />
    )
  }

  return (
    <>
      <div style={{ padding: '0 0 24px', background: 'var(--background)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>안녕하세요, 사용자님 👋</p>
            <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--foreground)' }}>SpendMate</h1>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 8, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={22} color="var(--foreground)" />
            <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: '#FF6B6B', borderRadius: '50%', border: '2px solid var(--background)' }} />
          </button>
        </div>

        {/* Budget Hero Card */}
        <div style={{ margin: '0 16px', borderRadius: 24, background: 'linear-gradient(135deg, #4F8EF7 0%, #6B5CF0 100%)', padding: '24px 24px 20px', color: 'white', boxShadow: '0 8px 32px rgba(79,142,247,0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.8, fontWeight: 500 }}>이번 달 남은 예산</p>
              <p style={{ margin: '4px 0 0', fontSize: 34, fontWeight: 900, letterSpacing: '-1px' }}>
                {remaining.toLocaleString()}원
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>총 예산</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>{budget.toLocaleString()}원</p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, opacity: 0.85 }}>사용 {spent.toLocaleString()}원</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{percent}%</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 99 }}>
              <div
                style={{
                  height: '100%',
                  width: `${percent}%`,
                  background: percent > 80 ? '#FF6B6B' : percent > 60 ? '#FFC857' : '#6ED6C8',
                  borderRadius: 99,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>오늘 지출</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>10,700원</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>하루 한도</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>20,000원</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>남은 일수</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>23일</p>
            </div>
          </div>
        </div>

        {/* AI Coach Card */}
        <div style={{ margin: '16px 16px 0', borderRadius: 20, background: 'white', padding: '16px 18px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #6ED6C8, #4F8EF7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={18} color="white" strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>AI 코치</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#4F8EF7', background: '#EBF2FF', padding: '2px 6px', borderRadius: 99 }}>오늘 분석</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--foreground)', lineHeight: 1.55, fontWeight: 500 }}>
                이번 주 <strong style={{ color: '#FF6B6B' }}>배달비가 42% 증가</strong>했어요. 편의점 도시락으로 대체하면 주 <strong style={{ color: '#4F8EF7' }}>12,000원</strong> 절약 가능해요! 🍱
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: '#EBF2FF', border: 'none', color: '#4F8EF7', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', minHeight: 44 }}>
              분석 보기
            </button>
            <button style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: '#E8F8F6', border: 'none', color: '#3DBD9E', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', minHeight: 44 }}>
              절약 팁 받기
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ margin: '16px 16px 0', borderRadius: 20, background: 'white', padding: '18px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>7월 캘린더</h2>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, color: 'var(--muted)', fontSize: 13, minHeight: 44 }}>
              이동 <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 8 }}>
            {CALENDAR_DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9CA3AF', paddingBottom: 4 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              const isToday = day === today
              const isSelected = day === selectedDay
              const spend = day ? SPEND_DAYS[day] : null
              return (
                <div
                  key={i}
                  onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                  style={{
                    height: 38, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 2, borderRadius: 10,
                    cursor: day ? 'pointer' : 'default',
                    background: isToday ? '#4F8EF7' : isSelected ? '#EBF2FF' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {day && (
                    <>
                      <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? 'white' : 'var(--foreground)' }}>{day}</span>
                      {spend && (
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: spend === 'high' ? '#FF6B6B' : spend === 'mid' ? '#FFC857' : '#6ED6C8',
                          opacity: isToday ? 0.9 : 1,
                        }} />
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Expenses */}
        <div style={{ margin: '16px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>최근 지출</h2>
            <button
              onClick={() => setShowAllExpenses(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, color: '#4F8EF7', fontSize: 13, fontWeight: 600, fontFamily: 'Pretendard', minHeight: 44 }}
            >
              전체보기 <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ borderRadius: 20, background: 'white', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
            {recentExpenses.map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: idx < recentExpenses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={item.color} />
                  </div>
                  <div style={{ flex: 1, marginLeft: 12 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{item.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{item.time} · {item.category}</p>
                  </div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>-{item.amount.toLocaleString()}원</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Survival Mode Teaser */}
        <div style={{ margin: '16px 16px 0', borderRadius: 20, background: '#1A1D27', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #FFC857, #FF6B6B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={20} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>생존 모드</p>
            <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: 'white' }}>오늘 한도까지 9,300원 남았어요</p>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
        </div>

        {/* Subscription Teaser */}
        <div style={{ margin: '12px 16px 0', borderRadius: 20, background: 'white', padding: '16px 18px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color="#4F8EF7" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>이번 달 구독 결제</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>넷플릭스·유튜브 포함 4건 · 48,500원</p>
          </div>
          <button style={{ background: '#EBF2FF', border: 'none', borderRadius: 10, padding: '8px 12px', color: '#4F8EF7', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', whiteSpace: 'nowrap', minHeight: 44 }}>
            관리
          </button>
        </div>
      </div>

      {showAllExpenses && <AllExpensesModal onClose={() => setShowAllExpenses(false)} />}
    </>
  )
}
