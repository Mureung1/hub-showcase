import { useState, useEffect } from 'react'
import { Bell, ChevronRight, TrendingUp, TrendingDown, Coffee, ShoppingCart, Utensils, Zap, Package, X, Search } from 'lucide-react'
import SurvivalModeScreen from './SurvivalModeScreen'
import { getNextBillingInfo } from './MyPageScreen'
import { getCategoryMeta } from '../lib/categoryMeta'
import {
  getBudget, getPrediction, getSubscriptions, getDailyExpenses, getRecentExpenses, getDailyCalendar, getContext,
  updateExpense, deleteExpense,
  type Prediction, type Subscription, type DailyAmount, type AuthUser, type RecentExpense, type DailySpend, type Context,
} from '../lib/api'
const CALENDAR_DAYS = ['일', '월', '화', '수', '목', '금', '토']

const CATEGORY_ICON: Record<string, typeof Coffee> = {
  CAFE: Coffee,
  CONVENIENCE_STORE: Package,
  DELIVERY: Utensils,
  MART: ShoppingCart,
  MEAL_KIT: Package,
  CAMPUS_MEAL: Utensils,
  SHOPPING: Package,
  OTHER: Package,
}

/** "오늘 08:30" / "어제" / "N일 전" 형태로 상대 시간을 표시 */
function formatRelativeTime(spentAt: string) {
  const date = new Date(spentAt)
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000)

  if (diffDays === 0) {
    return `오늘 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  if (diffDays === 1) return '어제'
  if (diffDays > 1) return `${diffDays}일 전`
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function buildCalendar() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return { cells, today: today.getDate(), month: month + 1 }
}

/** 하루 지출 합계를 캘린더 점 색깔(low/mid/high)로 나눈다 — 임의 기준이 아니라 실제 금액 구간으로 나눈 것 */
function spendLevel(amount: number): 'low' | 'mid' | 'high' {
  if (amount >= 30000) return 'high'
  if (amount >= 10000) return 'mid'
  return 'low'
}

/** 홈 화면 AI 코치 카드 문구를 실제 Context 수치로 구성한다 (신호 → 코칭, 가짜 확신도 숫자 없이) */
function renderHomeInsight(ctx: Context | null) {
  if (!ctx) {
    return <>데이터를 불러오는 중이에요...</>
  }
  const { deliveryIncreaseRate, budgetUsageRate } = ctx
  if (deliveryIncreaseRate !== null && deliveryIncreaseRate > 20) {
    return (
      <>
        이번 달 <strong style={{ color: '#FF6B6B' }}>배달비가 {Math.round(deliveryIncreaseRate)}% 증가</strong>했어요. 배달 대신 학식이나 집밥으로 대체해보는 건 어떨까요?
      </>
    )
  }
  if (budgetUsageRate !== null && budgetUsageRate >= 80) {
    return (
      <>
        이번 달 예산을 <strong style={{ color: '#FF6B6B' }}>{Math.round(budgetUsageRate)}% 사용</strong>했어요. 남은 기간 지출에 조금 더 신경 써보세요.
      </>
    )
  }
  if (budgetUsageRate !== null) {
    return (
      <>
        이번 달 예산 사용률은 <strong style={{ color: '#4F8EF7' }}>{Math.round(budgetUsageRate)}%</strong>예요. 지금 페이스면 여유 있어요 👍
      </>
    )
  }
  return <>아직 분석할 데이터가 부족해요. 지출을 기록하면 AI 코치가 소비 패턴을 분석해드려요 ✨</>
}

/* ── 전체 지출 목록 모달 ── */
function AllExpensesModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<RecentExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentExpenses(100).then(setExpenses).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const categories = Object.keys(CATEGORY_ICON)

  const filtered = expenses.filter(e => {
    const label = getCategoryMeta(e.category).label
    const matchSearch = e.name.includes(search) || label.includes(search)
    const matchCat = !selectedCat || e.category === selectedCat
    return matchSearch && matchCat
  })

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0)
  const month = new Date().getMonth() + 1

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
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>{month}월 · 총 {filtered.length}건 · {totalAmount.toLocaleString()}원</p>
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
            <button
              onClick={() => setSelectedCat(null)}
              style={{
                whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 99, border: '1.5px solid',
                borderColor: !selectedCat ? '#4F8EF7' : 'var(--border)',
                background: !selectedCat ? '#EBF2FF' : 'white',
                color: !selectedCat ? '#4F8EF7' : 'var(--muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Pretendard',
                transition: 'all 0.15s',
              }}
            >
              전체
            </button>
            {categories.map(cat => {
              const meta = getCategoryMeta(cat)
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  style={{
                    whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 99, border: '1.5px solid',
                    borderColor: selectedCat === cat ? '#4F8EF7' : 'var(--border)',
                    background: selectedCat === cat ? '#EBF2FF' : 'white',
                    color: selectedCat === cat ? '#4F8EF7' : 'var(--muted)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Pretendard',
                    transition: 'all 0.15s',
                  }}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Expense List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }} className="no-scrollbar">
          {loading ? null : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 8 }}>
              <span style={{ fontSize: 40 }}>🔍</span>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                {expenses.length === 0 ? '아직 등록된 지출이 없어요' : '검색 결과가 없어요'}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                {expenses.length === 0 ? '지출을 추가하면 여기에 표시돼요' : '다른 키워드로 검색해보세요'}
              </p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              {filtered.map((item, idx) => {
                const meta = getCategoryMeta(item.category)
                const Icon = CATEGORY_ICON[item.category] ?? Package
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '14px 16px',
                      borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, marginLeft: 12 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{item.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, padding: '2px 6px', borderRadius: 99 }}>{meta.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{formatRelativeTime(item.spentAt)}</span>
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

/* ── 지출 수정/삭제 모달 ── */
function EditExpenseModal({ expense, onClose, onSaved, onDeleted }: {
  expense: RecentExpense
  onClose: () => void
  onSaved: (updated: RecentExpense) => void
  onDeleted: (id: number) => void
}) {
  const [amount, setAmount] = useState(String(expense.amount))
  const [category, setCategory] = useState(expense.category)
  const [memo, setMemo] = useState(expense.name)
  const [date, setDate] = useState(expense.spentAt.slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = Object.keys(CATEGORY_ICON)

  const handleSave = async () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError('금액을 입력해주세요.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const updated = await updateExpense(expense.id, amt, category, memo, `${date}T00:00:00`)
      onSaved(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '수정에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setError(null)
    setDeleting(true)
    try {
      await deleteExpense(expense.id)
      onDeleted(expense.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했어요.')
      setDeleting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 393, maxHeight: '85%', background: 'var(--background)', borderRadius: '28px 28px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>
        <div style={{ padding: '8px 20px 32px', overflowY: 'auto' }} className="no-scrollbar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--foreground)' }}>지출 수정</h2>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 99, background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="var(--muted)" />
            </button>
          </div>

          {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#FF6B6B', fontWeight: 600 }}>{error}</p>}

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>금액</p>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              style={{ width: '100%', background: 'white', border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 20, fontWeight: 800, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>카테고리</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {categories.map(cat => {
                const meta = getCategoryMeta(cat)
                const Icon = CATEGORY_ICON[cat]
                const selected = category === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    style={{
                      padding: '10px 4px', borderRadius: 12, border: `1.5px solid ${selected ? meta.color : 'var(--border)'}`,
                      background: selected ? meta.bg : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      cursor: 'pointer', fontFamily: 'Pretendard',
                    }}
                  >
                    <Icon size={16} color={selected ? meta.color : 'var(--muted)'} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: selected ? meta.color : 'var(--muted)' }}>{meta.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>날짜</p>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', background: 'white', border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 14, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>메모</p>
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              style={{ width: '100%', background: 'white', border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 14, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              style={{
                flex: 1, height: 52, borderRadius: 16, border: 'none', cursor: deleting ? 'default' : 'pointer',
                background: '#FFF0F0', color: '#FF6B6B', fontSize: 15, fontWeight: 800, fontFamily: 'Pretendard',
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || deleting}
              style={{
                flex: 2, height: 52, borderRadius: 16, border: 'none', cursor: saving ? 'default' : 'pointer',
                background: 'linear-gradient(135deg, #4F8EF7, #6B5CF0)', color: 'white', fontSize: 15, fontWeight: 800, fontFamily: 'Pretendard',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface HomeScreenProps {
  survivalModeOff: boolean
  onGoToSettings: () => void
  onGoToStats: () => void
  onGoToCoach: () => void
  onGoToSurvival: () => void
  onGoToSubscriptions: () => void
  user: AuthUser | null
}

export default function HomeScreen({ survivalModeOff, onGoToSettings, onGoToStats, onGoToCoach, onGoToSurvival, onGoToSubscriptions, user }: HomeScreenProps) {
  const { cells, today, month } = buildCalendar()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showAllExpenses, setShowAllExpenses] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const [budgetTotal, setBudgetTotal] = useState<number | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [dailyExpenses, setDailyExpenses] = useState<DailyAmount[]>([])
  const [allRecentExpenses, setAllRecentExpenses] = useState<RecentExpense[]>([])
  const [monthlyDaily, setMonthlyDaily] = useState<DailySpend[]>([])
  const [context, setContext] = useState<Context | null>(null)
  const [editingExpense, setEditingExpense] = useState<RecentExpense | null>(null)

  useEffect(() => {
    getBudget().then(b => setBudgetTotal(b.amount)).catch(() => {})
    getPrediction().then(setPrediction).catch(() => {})
    getSubscriptions().then(setSubscriptions).catch(() => {})
    getDailyExpenses().then(setDailyExpenses).catch(() => {})
    getRecentExpenses(200).then(setAllRecentExpenses).catch(() => {})
    getDailyCalendar().then(setMonthlyDaily).catch(() => {})
    getContext().then(setContext).catch(() => {})
  }, [])

  // 지출을 수정/삭제하면 캘린더 점·오늘 지출 카드도 같이 바뀔 수 있어서 다시 불러온다.
  const refreshAfterExpenseChange = () => {
    getDailyCalendar().then(setMonthlyDaily).catch(() => {})
    getDailyExpenses().then(setDailyExpenses).catch(() => {})
  }

  const spendByDay: Record<number, 'low' | 'mid' | 'high'> = {}
  for (const d of monthlyDaily) {
    if (d.amount != null) spendByDay[d.day] = spendLevel(d.amount)
  }

  // 결제일이 7일 이내로 다가온 구독 — 홈 알림 벨의 실제 알림 내용으로 쓴다 (마이페이지의 "결제일 임박" 배너와 같은 기준).
  const dueSoonSubscriptions = subscriptions
    .map(s => ({ ...s, ...getNextBillingInfo(s.billingDay) }))
    .filter(s => s.dday <= 7)
    .sort((a, b) => a.dday - b.dday)

  const realTodayForFilter = new Date()
  const selectedDayExpenses = selectedDay
    ? allRecentExpenses.filter(e => {
        const d = new Date(e.spentAt)
        return d.getFullYear() === realTodayForFilter.getFullYear()
          && d.getMonth() === realTodayForFilter.getMonth()
          && d.getDate() === selectedDay
      })
    : null
  const recentExpenses = selectedDayExpenses ?? allRecentExpenses.slice(0, 5)

  const budget = budgetTotal ?? 0
  const remaining = prediction?.remainingBudget ?? 0
  const spent = budget - remaining
  const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0

  const realToday = new Date()
  const lastDayOfRealMonth = new Date(realToday.getFullYear(), realToday.getMonth() + 1, 0).getDate()
  const daysLeft = lastDayOfRealMonth - realToday.getDate() + 1
  const inSurvivalMode = (prediction?.survivalMode ?? false) && !survivalModeOff

  const todaySpend = dailyExpenses.length > 0 ? dailyExpenses[dailyExpenses.length - 1].amount : 0
  const dailyLimit = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0
  const subTotal = subscriptions.reduce((s, x) => s + x.price, 0)
  const subLabel = subscriptions.length > 0
    ? `${subscriptions[0].name}${subscriptions.length > 1 ? ` 등` : ''} 포함 ${subscriptions.length}건 · ${subTotal.toLocaleString()}원`
    : '등록된 구독이 없어요'

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
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>안녕하세요, {user?.nickname ?? '사용자'}님 👋</p>
            <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--foreground)' }}>SpendMate</h1>
          </div>
          <button
            onClick={() => setShowNotifications(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 8, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell size={22} color="var(--foreground)" />
            {dueSoonSubscriptions.length > 0 && (
              <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: '#FF6B6B', borderRadius: '50%', border: '2px solid var(--background)' }} />
            )}
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
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>{todaySpend.toLocaleString()}원</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>하루 한도</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>{dailyLimit.toLocaleString()}원</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>남은 일수</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>{daysLeft}일</p>
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
                {renderHomeInsight(context)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={onGoToStats} style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: '#EBF2FF', border: 'none', color: '#4F8EF7', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', minHeight: 44 }}>
              분석 보기
            </button>
            <button onClick={onGoToCoach} style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: '#E8F8F6', border: 'none', color: '#3DBD9E', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', minHeight: 44 }}>
              절약 팁 받기
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ margin: '16px 16px 0', borderRadius: 20, background: 'white', padding: '18px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>{month}월 캘린더</h2>
            <button onClick={onGoToStats} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, color: 'var(--muted)', fontSize: 13, minHeight: 44 }}>
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
              const spend = day ? spendByDay[day] : null
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
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>
              {selectedDay ? `${month}월 ${selectedDay}일 지출` : '최근 지출'}
            </h2>
            {selectedDay ? (
              <button
                onClick={() => setSelectedDay(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, color: 'var(--muted)', fontSize: 13, fontWeight: 600, fontFamily: 'Pretendard', minHeight: 44 }}
              >
                선택 해제
              </button>
            ) : (
              <button
                onClick={() => setShowAllExpenses(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, color: '#4F8EF7', fontSize: 13, fontWeight: 600, fontFamily: 'Pretendard', minHeight: 44 }}
              >
                전체보기 <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div style={{ borderRadius: 20, background: 'white', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
            {recentExpenses.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  {selectedDay ? '이 날짜엔 등록된 지출이 없어요' : '아직 등록된 지출이 없어요'}
                </p>
              </div>
            ) : recentExpenses.map((item, idx) => {
              const meta = getCategoryMeta(item.category)
              const Icon = CATEGORY_ICON[item.category] ?? Package
              return (
                <div
                  key={item.id}
                  onClick={() => setEditingExpense(item)}
                  style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: idx < recentExpenses.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, marginLeft: 12 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{item.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{formatRelativeTime(item.spentAt)} · {meta.label}</p>
                  </div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>-{item.amount.toLocaleString()}원</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Survival Mode Teaser */}
        <div onClick={onGoToSurvival} style={{ margin: '16px 16px 0', borderRadius: 20, background: '#1A1D27', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #FFC857, #FF6B6B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={20} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>생존 모드</p>
            <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 800, color: 'white' }}>오늘 한도까지 {Math.max(dailyLimit - todaySpend, 0).toLocaleString()}원 남았어요</p>
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
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{subLabel}</p>
          </div>
          <button onClick={onGoToSubscriptions} style={{ background: '#EBF2FF', border: 'none', borderRadius: 10, padding: '8px 12px', color: '#4F8EF7', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', whiteSpace: 'nowrap', minHeight: 44 }}>
            관리
          </button>
        </div>
      </div>

      {showAllExpenses && <AllExpensesModal onClose={() => setShowAllExpenses(false)} />}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSaved={(updated) => {
            setAllRecentExpenses(prev => prev.map(e => e.id === updated.id ? updated : e))
            refreshAfterExpenseChange()
          }}
          onDeleted={(id) => {
            setAllRecentExpenses(prev => prev.filter(e => e.id !== id))
            refreshAfterExpenseChange()
          }}
        />
      )}
      {showNotifications && (
        <NotificationsModal dueSoonSubscriptions={dueSoonSubscriptions} onClose={() => setShowNotifications(false)} />
      )}
    </>
  )
}

type DueSoonSubscription = Subscription & { label: string; dday: number }

/* ── 알림 모달 — 구독 결제 임박 알림을 보여준다 (실제 구독 데이터 기반, D-7 이내) ── */
function NotificationsModal({ dueSoonSubscriptions, onClose }: { dueSoonSubscriptions: DueSoonSubscription[]; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 393, maxHeight: '80%', background: 'var(--background)', borderRadius: '28px 28px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>
        <div style={{ padding: '8px 20px 40px', overflowY: 'auto' }} className="no-scrollbar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--foreground)' }}>알림</h2>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 99, background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="var(--muted)" />
            </button>
          </div>
          {dueSoonSubscriptions.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 8 }}>
              <Bell size={36} color="var(--muted)" />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>아직 알림이 없어요</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>구독 결제일이 다가오면 여기에 표시돼요</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dueSoonSubscriptions.map(s => (
                <div key={s.id} style={{ background: 'white', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={18} color="#FFC857" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{s.name} 결제 예정</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{s.label} · {s.price.toLocaleString()}원</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: s.dday <= 3 ? '#FF6B6B' : '#FFC857' }}>
                    {s.dday === 0 ? '오늘' : `D-${s.dday}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
