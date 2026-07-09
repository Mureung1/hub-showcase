import { useMemo, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Card from '../components/Card.jsx'
import MealTypeBadge from '../components/MealTypeBadge.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import { getManualDayStatus, setManualDayStatus } from '../lib/dayStatus.js'
import { getMeals, sumNutrients } from '../lib/mealStore.js'
import { calcDayStatus, countSatisfiedNutrients, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { getAllRecords, toDateKey } from '../lib/records.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_COLORS = { good: colors.satisfied, normal: colors.deficient, bad: colors.danger }
const AUTO_STATUS_LABELS = { good: '좋음', normal: '보통', bad: '위험' }
const MANUAL_STATUS_LABELS = { good: '좋음', normal: '보통', bad: '나쁨' }

function buildMonthCells(year, month) {
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array(startWeekday).fill(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)
  return cells
}

function StatusBadge({ status, label }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: font.size.xs,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: radius.pill,
        background: STATUS_COLORS[status],
        color: '#fff',
      }}
    >
      {label}
    </span>
  )
}

export default function Calendar() {
  const { user } = useUser()
  const today = new Date()
  const todayKey = toDateKey(today)
  const currentMonthTotal = today.getFullYear() * 12 + today.getMonth()

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDateKey, setSelectedDateKey] = useState(null)
  const [futureNotice, setFutureNotice] = useState(false)
  const [statusVersion, setStatusVersion] = useState(0) // 수동 상태 저장 후 재조회 트리거

  const isCurrentMonth = cursor.year * 12 + cursor.month >= currentMonthTotal

  const records = useMemo(() => getAllRecords(user?.id), [user?.id])
  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor])

  // 보이는 달의 날짜별 상태 맵: 기록 있는 날은 자동 판정(source:'auto'), 없는 날은 수동 선택값(source:'manual')
  const dayInfoMap = useMemo(() => {
    const map = {}
    if (!user) return map

    for (const day of cells) {
      if (day === null) continue
      const dateKey = toDateKey(new Date(cursor.year, cursor.month, day))
      if (dateKey > todayKey) continue

      const meals = getMeals(user.id, dateKey)
      const total = meals.length > 0 ? sumNutrients(meals) : records[dateKey]?.total
      const autoStatus = total ? calcDayStatus(user.recommended, total) : null

      if (autoStatus) {
        map[dateKey] = { status: autoStatus, source: 'auto', total }
        continue
      }
      const manual = getManualDayStatus(user.id, dateKey)
      if (manual) {
        map[dateKey] = { status: manual.status, source: 'manual' }
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, cursor, user, records, todayKey, statusVersion])

  const selectedInfo = selectedDateKey ? dayInfoMap[selectedDateKey] : null
  const selectedRecord = selectedDateKey ? records[selectedDateKey] : null
  const selectedItems = selectedRecord?.items?.length ? selectedRecord.items : selectedDateKey ? getMeals(user?.id, selectedDateKey) : []

  function goMonth(delta) {
    setCursor((c) => {
      const target = c.year * 12 + c.month + delta
      if (target > currentMonthTotal) return c // 미래 달로는 이동 불가
      return { year: Math.floor(target / 12), month: ((target % 12) + 12) % 12 }
    })
    setSelectedDateKey(null)
    setFutureNotice(false)
  }

  function handleSelectDay(dateKey) {
    if (dateKey > todayKey) {
      setFutureNotice(true)
      setSelectedDateKey(null)
      return
    }
    setFutureNotice(false)
    setSelectedDateKey((prev) => (prev === dateKey ? null : dateKey))
  }

  function handlePickManualStatus(status) {
    if (!user || !selectedDateKey) return
    setManualDayStatus(user.id, selectedDateKey, status)
    setStatusVersion((v) => v + 1)
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="달력" subtitle="날짜별 식사 기록과 영양 상태를 확인해보세요" />

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
            disabled={isCurrentMonth}
            aria-label="다음 달"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              color: colors.textStrong,
              cursor: isCurrentMonth ? 'default' : 'pointer',
              opacity: isCurrentMonth ? 0.25 : 1,
              padding: `${spacing.xs}px ${spacing.md}px`,
            }}
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
            const isFuture = dateKey > todayKey
            const isToday = dateKey === todayKey
            const isSelected = dateKey === selectedDateKey
            const info = dayInfoMap[dateKey]
            const statusColor = info ? STATUS_COLORS[info.status] : null

            return (
              <button
                key={i}
                type="button"
                className="tds-press"
                onClick={() => handleSelectDay(dateKey)}
                style={{
                  border: 'none',
                  background: isSelected ? statusColor || colors.primary : 'transparent',
                  color: isSelected ? '#fff' : isToday ? colors.primary : isFuture ? colors.muted : colors.textStrong,
                  opacity: isFuture ? 0.4 : 1,
                  borderRadius: radius.pill,
                  height: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: isToday || isSelected ? 700 : 500,
                  fontSize: font.size.sm,
                }}
              >
                <span>{day}</span>
                {info && !isSelected && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, marginTop: 2 }} />
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {futureNotice && (
        <Card style={{ background: colors.dangerSurface, boxShadow: 'none' }}>
          <p style={{ margin: 0, color: colors.danger, fontWeight: 600, fontSize: font.size.sm, textAlign: 'center' }}>
            미래 날짜는 선택할 수 없습니다.
          </p>
        </Card>
      )}

      {!futureNotice && !selectedDateKey && (
        <Card style={{ textAlign: 'center' }}>
          <p style={{ color: colors.textSub, margin: 0 }}>날짜를 선택하면 그날의 기록과 영양 상태를 볼 수 있어요.</p>
        </Card>
      )}

      {selectedDateKey && selectedInfo?.source === 'auto' && (
        <Card style={{ background: colors.primarySurface, boxShadow: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <h3 style={{ margin: 0, color: colors.textStrong }}>{selectedDateKey}</h3>
            <StatusBadge status={selectedInfo.status} label={`자동 판정 · ${AUTO_STATUS_LABELS[selectedInfo.status]}`} />
          </div>
          <div style={{ marginBottom: spacing.xs }}>
            {selectedItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                  padding: `${spacing.xs}px 0`,
                }}
              >
                <span style={{ color: colors.textSub, fontSize: font.size.sm }}>{item.name}</span>
                <MealTypeBadge mealType={item.mealType} />
              </div>
            ))}
          </div>
          <p style={{ margin: `0 0 ${spacing.sm}px`, color: colors.textSub, fontSize: font.size.xs }}>
            {NUTRIENT_LABELS.length}개 영양소 중 {countSatisfiedNutrients(user.recommended, selectedInfo.total)}개 충족
          </p>
          {typeof selectedRecord?.achievementPercent === 'number' && (
            <p style={{ margin: 0, fontWeight: 700, color: colors.primary }}>
              하루 목표 달성률 {selectedRecord.achievementPercent}%
            </p>
          )}
        </Card>
      )}

      {selectedDateKey && selectedInfo?.source !== 'auto' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <h3 style={{ margin: 0, color: colors.textStrong }}>{selectedDateKey}</h3>
            {selectedInfo?.source === 'manual' && (
              <StatusBadge status={selectedInfo.status} label={`내가 선택 · ${MANUAL_STATUS_LABELS[selectedInfo.status]}`} />
            )}
          </div>
          <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
            분석 기록이 없는 날이에요. 이 날의 영양 상태를 직접 선택해보세요.
          </p>
          <div style={{ display: 'flex', gap: spacing.sm }}>
            {Object.entries(MANUAL_STATUS_LABELS).map(([status, label]) => {
              const active = selectedInfo?.status === status
              return (
                <button
                  key={status}
                  type="button"
                  className="tds-press"
                  onClick={() => handlePickManualStatus(status)}
                  style={{
                    flex: 1,
                    padding: `${spacing.md}px 0`,
                    borderRadius: radius.sm,
                    border: 'none',
                    background: active ? STATUS_COLORS[status] : colors.bg,
                    color: active ? '#fff' : colors.textSub,
                    fontWeight: 700,
                    fontSize: font.size.md,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
