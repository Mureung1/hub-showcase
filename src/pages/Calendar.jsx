import { useMemo, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import { getAllRecords, toDateKey } from '../lib/records.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function buildMonthCells(year, month) {
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array(startWeekday).fill(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)
  return cells
}

export default function Calendar() {
  const { user } = useUser()
  const today = new Date()
  const todayKey = toDateKey(today)

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDateKey, setSelectedDateKey] = useState(null)

  const records = useMemo(() => getAllRecords(user?.id), [user?.id])
  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor])
  const selectedRecord = selectedDateKey ? records[selectedDateKey] : null

  function goMonth(delta) {
    setCursor((c) => {
      const total = c.year * 12 + c.month + delta
      return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
    })
    setSelectedDateKey(null)
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="달력" subtitle="날짜별 식사 기록을 확인해보세요" />

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <button
            type="button"
            className="tds-press"
            onClick={() => goMonth(-1)}
            aria-label="이전 달"
            style={{ background: 'none', border: 'none', fontSize: 22, color: colors.textStrong, cursor: 'pointer', padding: `${spacing.xs}px ${spacing.md}px` }}
          >
            ‹
          </button>
          <span style={{ fontWeight: 700, fontSize: font.size.lg, color: colors.textStrong }}>
            {cursor.year}년 {cursor.month + 1}월
          </span>
          <button
            type="button"
            className="tds-press"
            onClick={() => goMonth(1)}
            aria-label="다음 달"
            style={{ background: 'none', border: 'none', fontSize: 22, color: colors.textStrong, cursor: 'pointer', padding: `${spacing.xs}px ${spacing.md}px` }}
          >
            ›
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: spacing.sm }}>
          {WEEKDAYS.map((w) => (
            <span key={w} style={{ fontSize: font.size.xs, color: colors.muted, fontWeight: 600 }}>
              {w}
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: spacing.xs }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />

            const dateKey = toDateKey(new Date(cursor.year, cursor.month, day))
            const hasRecord = Boolean(records[dateKey])
            const isToday = dateKey === todayKey
            const isSelected = dateKey === selectedDateKey

            return (
              <button
                key={i}
                type="button"
                className="tds-press"
                disabled={!hasRecord}
                onClick={() => setSelectedDateKey((prev) => (prev === dateKey ? null : dateKey))}
                style={{
                  border: 'none',
                  background: isSelected ? colors.primary : 'transparent',
                  color: isSelected ? '#fff' : isToday ? colors.primary : colors.textStrong,
                  borderRadius: radius.pill,
                  height: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: hasRecord ? 'pointer' : 'default',
                  fontWeight: isToday || isSelected ? 700 : 500,
                  fontSize: font.size.sm,
                }}
              >
                <span>{day}</span>
                {hasRecord && !isSelected && (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: colors.primary, marginTop: 2 }} />
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {selectedRecord ? (
        <Card style={{ background: colors.primarySurface, boxShadow: 'none' }}>
          <h3 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.textStrong }}>{selectedDateKey}</h3>
          <p style={{ margin: `0 0 ${spacing.sm}px`, color: colors.textSub, fontSize: font.size.sm }}>
            {selectedRecord.items?.length ? selectedRecord.items.map((item) => item.name).join(', ') : '기록된 음식이 없어요'}
          </p>
          <p style={{ margin: 0, fontWeight: 700, color: colors.primary }}>
            하루 목표 달성률 {selectedRecord.achievementPercent ?? 0}%
          </p>
        </Card>
      ) : (
        <Card style={{ textAlign: 'center' }}>
          <p style={{ color: colors.textSub, margin: 0 }}>표시된 날짜를 선택하면 그날의 기록을 볼 수 있어요.</p>
        </Card>
      )}
    </div>
  )
}
