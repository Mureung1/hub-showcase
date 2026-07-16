import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { getExpenseSummary, getDailyExpenses, type CategorySummaryItem, type DailyAmount, type SummaryPeriod } from '../lib/api'
import { getCategoryMeta } from '../lib/categoryMeta'

const PERIODS: { label: string; value: SummaryPeriod }[] = [
  { label: '이번 주', value: 'week' },
  { label: '이번 달', value: 'month' },
  { label: '최근 3개월', value: '3months' },
]

// AI_INSIGHTS는 F16(AI 소비 코치 Agent) 연동 전까지의 임시 mock — 실데이터 연결 대상 아님
const AI_INSIGHTS = [
  { icon: TrendingUp, color: '#FF6B6B', bg: '#FFF0F0', text: '외식 지출이 지난달 대비 23% 증가했어요. 주 2회 이상 직접 요리하면 월 3만원 절약 가능해요!' },
  { icon: TrendingDown, color: '#6ED6C8', bg: '#E8F8F6', text: '교통비가 지난달보다 15% 줄었어요. 대중교통 이용 습관이 좋아지고 있어요 👍' },
]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {payload[0].value.toLocaleString()}원
      </div>
    )
  }
  return null
}

export default function StatsScreen() {
  const [periodIndex, setPeriodIndex] = useState(1)
  const [categories, setCategories] = useState<CategorySummaryItem[]>([])
  const [total, setTotal] = useState(0)
  const [dailyData, setDailyData] = useState<DailyAmount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getExpenseSummary(PERIODS[periodIndex].value), getDailyExpenses()])
      .then(([summary, daily]) => {
        if (cancelled) return
        setCategories(summary.categories)
        setTotal(summary.total)
        setDailyData(daily)
      })
      .catch(() => {
        if (cancelled) return
        setError('소비 통계를 불러오지 못했어요.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [periodIndex])

  const maxDaily = Math.max(...dailyData.map(d => d.amount), 1)

  return (
    <div style={{ padding: '0 0 24px', background: 'var(--background)' }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 16px', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--foreground)' }}>소비 통계</h1>
      </div>

      {/* Period Selector */}
      <div style={{ margin: '16px 16px 0', background: 'white', borderRadius: 14, padding: 4, display: 'flex', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border)' }}>
        {PERIODS.map((p, i) => (
          <button key={p.value} onClick={() => setPeriodIndex(i)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: periodIndex === i ? '#4F8EF7' : 'transparent', color: periodIndex === i ? 'white' : 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', transition: 'all 0.2s' }}>
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ margin: '16px 16px 0', padding: '14px 16px', borderRadius: 14, background: '#FFF0F0', color: '#FF6B6B', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {!loading && !error && total === 0 && (
        <div style={{ margin: '16px 16px 0', padding: '40px 20px', borderRadius: 20, background: 'white', border: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>아직 이 기간에 등록된 지출이 없어요</p>
        </div>
      )}

      {!error && total > 0 && (
        <>
          {/* Donut Chart */}
          <div style={{ margin: '16px 16px 0', background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>카테고리별 지출</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
                <PieChart width={140} height={140}>
                  <Pie data={categories} dataKey="amount" cx={70} cy={70} innerRadius={45} outerRadius={65} strokeWidth={2} stroke="white">
                    {categories.map((c, i) => <Cell key={i} fill={getCategoryMeta(c.category).color} />)}
                  </Pie>
                </PieChart>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>총 지출</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--foreground)' }}>{(total / 10000).toFixed(1)}만</p>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categories.map(c => {
                  const meta = getCategoryMeta(c.category)
                  return (
                    <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--foreground)', flex: 1, fontWeight: 500 }}>{meta.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{c.percent}%</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', minWidth: 60, textAlign: 'right' }}>{(c.amount / 1000).toFixed(0)}k</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div style={{ margin: '16px 16px 0', background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>일별 지출</h2>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>최근 7일</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={dailyData} barSize={24}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontFamily: 'Pretendard' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,142,247,0.08)', radius: 8 }} />
                <Bar dataKey="amount" fill="#4F8EF7" radius={[6, 6, 0, 0]}>
                  {dailyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.amount === maxDaily ? '#4F8EF7' : '#D1E4FE'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category List */}
          <div style={{ margin: '16px 16px 0', background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 18px 14px' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>카테고리 상세</h2>
            </div>
            {categories.map((c) => {
              const meta = getCategoryMeta(c.category)
              return (
                <div key={c.category} style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: meta.color }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{meta.label}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>{c.amount.toLocaleString()}원</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--background)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${c.percent}%`, background: meta.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* AI Insights */}
          <div style={{ margin: '16px 16px 0' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>AI 인사이트</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {AI_INSIGHTS.map((insight, i) => {
                const Icon = insight.icon
                return (
                  <div key={i} style={{ background: 'white', borderRadius: 18, padding: '14px 16px', display: 'flex', gap: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: insight.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={insight.color} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, fontWeight: 500 }}>{insight.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
