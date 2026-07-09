import { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'

const PERIODS = ['이번 주', '이번 달', '최근 3개월']

const CATEGORIES = [
  { name: '외식', amount: 87400, color: '#4F8EF7', percent: 30 },
  { name: '식료품', amount: 63200, color: '#6ED6C8', percent: 22 },
  { name: '카페', amount: 42800, color: '#FFC857', percent: 15 },
  { name: '구독', amount: 48500, color: '#9B8FFF', percent: 17 },
  { name: '교통', amount: 28600, color: '#FF6B6B', percent: 10 },
  { name: '기타', amount: 16900, color: '#E5E7EB', percent: 6 },
]

const BAR_DATA = [
  { day: '월', amount: 28000 },
  { day: '화', amount: 12000 },
  { day: '수', amount: 45000 },
  { day: '목', amount: 8000 },
  { day: '금', amount: 62000 },
  { day: '토', amount: 38000 },
  { day: '일', amount: 15000 },
]

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
  const [period, setPeriod] = useState(1)

  const total = CATEGORIES.reduce((s, c) => s + c.amount, 0)

  return (
    <div style={{ padding: '0 0 24px', background: 'var(--background)' }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 16px', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--foreground)' }}>소비 통계</h1>
      </div>

      {/* Period Selector */}
      <div style={{ margin: '16px 16px 0', background: 'white', borderRadius: 14, padding: 4, display: 'flex', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid var(--border)' }}>
        {PERIODS.map((p, i) => (
          <button key={p} onClick={() => setPeriod(i)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: period === i ? '#4F8EF7' : 'transparent', color: period === i ? 'white' : 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', transition: 'all 0.2s' }}>
            {p}
          </button>
        ))}
      </div>

      {/* Donut Chart */}
      <div style={{ margin: '16px 16px 0', background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>카테고리별 지출</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
            <PieChart width={140} height={140}>
              <Pie data={CATEGORIES} dataKey="amount" cx={70} cy={70} innerRadius={45} outerRadius={65} strokeWidth={2} stroke="white">
                {CATEGORIES.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
            </PieChart>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>총 지출</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--foreground)' }}>{(total / 10000).toFixed(1)}만</p>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CATEGORIES.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--foreground)', flex: 1, fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{c.percent}%</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', minWidth: 60, textAlign: 'right' }}>{(c.amount / 1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div style={{ margin: '16px 16px 0', background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>일별 지출</h2>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>이번 주</span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={BAR_DATA} barSize={24}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontFamily: 'Pretendard' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,142,247,0.08)', radius: 8 }} />
            <Bar dataKey="amount" fill="#4F8EF7" radius={[6, 6, 0, 0]}>
              {BAR_DATA.map((entry, idx) => (
                <Cell key={idx} fill={entry.amount === Math.max(...BAR_DATA.map(d => d.amount)) ? '#4F8EF7' : '#D1E4FE'} />
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
        {CATEGORIES.map((c) => (
          <div key={c.name} style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{c.name}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>{c.amount.toLocaleString()}원</span>
            </div>
            <div style={{ height: 6, background: 'var(--background)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${c.percent}%`, background: c.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        ))}
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
    </div>
  )
}
