import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ChevronIcon from '../components/ChevronIcon.jsx'
import DateRangeExport from '../components/DateRangeExport.jsx'
import MealTypeBadge from '../components/MealTypeBadge.jsx'
import NutritionStatusPanel from '../components/NutritionStatusPanel.jsx'
import Spinner from '../components/Spinner.jsx'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { getMealsByDateRange } from '../lib/dataStore.js'
import { getManualDayStatus, setManualDayStatus } from '../lib/dayStatus.js'
import { flattenMealItems, sumMealRecordsNutrients } from '../lib/mealStore.js'
import { calcDayStatus, formatNutrientOrDash, NUTRIENT_LABELS } from '../lib/nutrition.js'
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

// 화면 가로를 꽉 채우는 1열 카드. 이름 + 시간대 배지 + 카드 표시 설정에서 켠 영양소를 보여준다.
function MiniMealCard({ item }) {
  const visible = useVisibleNutrients()
  const n = item.nutrients || {}
  const labels = NUTRIENT_LABELS.filter(({ key }) => visible[key])
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        padding: spacing.md,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md }}>
        <span
          style={{
            fontSize: font.size.md,
            fontWeight: 700,
            color: colors.textStrong,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {item.name}
        </span>
        <MealTypeBadge mealType={item.mealType} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: spacing.sm, columnGap: spacing.xs }}>
        {labels.map(({ key, label, unit }) => (
          <div key={key}>
            <span style={{ display: 'block', fontSize: font.size.xs, color: colors.muted }}>{label}</span>
            <span style={{ fontSize: font.size.sm, fontWeight: 700, color: colors.textStrong }}>
              {formatNutrientOrDash(n[key], unit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Calendar() {
  const { effectiveUserId, effectiveRecommended } = useUser()
  const today = new Date()
  const todayKey = toDateKey(today)
  const currentMonthTotal = today.getFullYear() * 12 + today.getMonth()

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  // 탭에 들어오자마자 오늘이 선택돼 있다 — 예전처럼 "날짜를 선택해보세요" 안내만 띄우고 기다리면,
  // 대부분의 사용자가 가장 먼저 보고 싶어 하는 오늘 상태를 한 번 더 눌러야 볼 수 있다.
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey)
  const [futureNotice, setFutureNotice] = useState(false)
  const [statusVersion, setStatusVersion] = useState(0) // 수동 상태 저장 후 재조회 트리거
  const [foodListOpen, setFoodListOpen] = useState(false) // "그날 먹은 음식" 아코디언, 날짜를 새로 고를 때마다 접힘으로 초기화

  const isCurrentMonth = cursor.year * 12 + cursor.month >= currentMonthTotal

  const records = useMemo(() => getAllRecords(effectiveUserId), [effectiveUserId])
  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor])

  const monthStart = toDateKey(new Date(cursor.year, cursor.month, 1))
  const monthEnd = toDateKey(new Date(cursor.year, cursor.month + 1, 0))

  // 보이는 달 전체의 끼니 기록을 Supabase에서 한 번에 조회한다({ [date]: mealRecord[] }) — 날짜마다
  // 따로 쿼리하지 않고 달 단위로 묶어서 조회 횟수를 최소화한다.
  const [monthMeals, setMonthMeals] = useState({})
  const [monthLoading, setMonthLoading] = useState(true)
  const [monthError, setMonthError] = useState('')
  const [monthReloadTick, setMonthReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setMonthLoading(true)
    setMonthError('')

    getMealsByDateRange(monthStart, monthEnd)
      .then((byDate) => {
        if (!cancelled) setMonthMeals(byDate)
      })
      .catch((err) => {
        if (!cancelled) setMonthError(err.message || '기록을 불러오지 못했어요.')
      })
      .finally(() => {
        if (!cancelled) setMonthLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [effectiveUserId, monthStart, monthEnd, monthReloadTick])

  function retryMonth() {
    setMonthReloadTick((t) => t + 1)
  }

  // 보이는 달의 날짜별 상태 맵: 기록 있는 날은 자동 판정(source:'auto'), 없는 날은 수동 선택값(source:'manual')
  const dayInfoMap = useMemo(() => {
    const map = {}

    for (const day of cells) {
      if (day === null) continue
      const dateKey = toDateKey(new Date(cursor.year, cursor.month, day))
      if (dateKey > todayKey) continue

      const meals = monthMeals[dateKey] || []
      const total = meals.length > 0 ? sumMealRecordsNutrients(meals) : records[dateKey]?.total
      const autoStatus = total ? calcDayStatus(effectiveRecommended, total) : null

      if (autoStatus) {
        map[dateKey] = { status: autoStatus, source: 'auto', total }
        continue
      }
      const manual = getManualDayStatus(effectiveUserId, dateKey)
      if (manual) {
        map[dateKey] = { status: manual.status, source: 'manual' }
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, cursor, effectiveUserId, effectiveRecommended, records, todayKey, statusVersion, monthMeals])

  const selectedInfo = selectedDateKey ? dayInfoMap[selectedDateKey] : null
  const selectedRecord = selectedDateKey ? records[selectedDateKey] : null
  // 이번 달 조회 결과(monthMeals, Supabase meals 테이블)를 항상 우선한다. records[dateKey]는 저장할
  // 때마다 그 순간의 분석 1건으로 통째로 덮어써지는 legacy 스냅샷이라, 하루에 여러 번 저장하면 마지막
  // 1건만 남는다(dayInfoMap의 total 계산과 동일한 우선순위). monthMeals에 그 날짜 기록이 아예 없을
  // 때만(마이그레이션 이전의 오래된 날짜) legacy records로 폴백한다.
  const selectedMeals = selectedDateKey ? monthMeals[selectedDateKey] || [] : []
  const selectedItems = selectedMeals.length > 0 ? flattenMealItems(selectedMeals) : selectedRecord?.items || []

  // 오늘인데 자동 판정(분석 기록)도 수동 선택도 없는 상태 = 기록 유도 빈 상태.
  // selectedInfo가 있으면(과거에 직접 고른 상태가 남아 있는 경우 등) 그 값을 숨기지 않고 그대로 보여준다.
  const showTodayEmptyState = selectedDateKey === todayKey && !monthLoading && !selectedInfo

  // 달을 옮기면 그 달의 1일을 고른다(이번 달로 돌아왔을 때는 오늘). 예전에는 선택을 비웠지만,
  // 이제는 항상 한 날짜가 선택돼 있어야 아래 상세 영역이 비지 않는다.
  function goMonth(delta) {
    const target = cursor.year * 12 + cursor.month + delta
    if (target > currentMonthTotal) return // 미래 달로는 이동 불가
    const next = { year: Math.floor(target / 12), month: ((target % 12) + 12) % 12 }

    setCursor(next)
    // 이번 달로 돌아오면 오늘, 지난 달이면 그 달 1일을 고른다.
    setSelectedDateKey(target === currentMonthTotal ? todayKey : toDateKey(new Date(next.year, next.month, 1)))
    setFoodListOpen(false)
    setFutureNotice(false)
  }

  // 선택을 비우는(toggle-off) 동작은 없앴다 — 안내 카드를 걷어낸 지금은 선택이 비면 달력 아래가
  // 통째로 비어 화면이 고장 난 것처럼 보인다. 미래 날짜를 눌렀을 때도 안내만 띄우고 직전 선택은 둔다.
  function handleSelectDay(dateKey) {
    if (dateKey > todayKey) {
      setFutureNotice(true)
      return
    }
    setFutureNotice(false)
    if (dateKey === selectedDateKey) return
    setSelectedDateKey(dateKey)
    setFoodListOpen(false)
  }

  function handlePickManualStatus(status) {
    if (!selectedDateKey) return
    setManualDayStatus(effectiveUserId, selectedDateKey, status)
    setStatusVersion((v) => v + 1)
  }

  return (
    <div style={styles.page}>
      {/* 화면 제목("달력")과 설명 줄은 두지 않는다 — 하단 탭바가 이미 현재 화면을 알려주고,
          달력 UI 자체가 무슨 화면인지 바로 보여준다. */}
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
          <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontWeight: 700, fontSize: font.size.lg, color: colors.textStrong }}>
            {cursor.year}년 {cursor.month + 1}월
            {monthLoading && <Spinner size={14} />}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: spacing.sm, justifyItems: 'center' }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />

            const dateKey = toDateKey(new Date(cursor.year, cursor.month, day))
            const isFuture = dateKey > todayKey
            const isToday = dateKey === todayKey
            const isSelected = dateKey === selectedDateKey
            const info = dayInfoMap[dateKey]
            const statusColor = info ? STATUS_COLORS[info.status] : null

            // 상태가 있는 날은 날짜 숫자를 감싸는 큰 원(지름 36px)을 상태 색으로 채운다(기존의 작은 5px 점을
            // 대체 — 한눈에 그날 상태가 보이게). 오늘은 원 안쪽 테두리로 강조(색이 채워진 원 위에서는 흰색,
            // 빈 원에서는 포인트색), 선택된 날은 원 바깥에 간격을 둔 어두운 링으로 강조한다 — 안쪽 테두리=오늘,
            // 바깥 링=선택이라 한 칸이 둘 다여도 서로 겹치지 않고 구분된다.
            const todayRingColor = statusColor ? '#fff' : colors.primary
            return (
              <button
                key={i}
                type="button"
                className="tds-press"
                onClick={() => handleSelectDay(dateKey)}
                aria-label={`${cursor.month + 1}월 ${day}일${info ? ` · ${AUTO_STATUS_LABELS[info.status]}` : ''}`}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: isFuture ? 0.4 : 1,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    background: statusColor || (isToday ? colors.primarySurface : 'transparent'),
                    color: statusColor ? '#fff' : isToday ? colors.primary : isFuture ? colors.muted : colors.textStrong,
                    fontWeight: statusColor || isToday || isSelected ? 700 : 500,
                    fontSize: font.size.sm,
                    border: isToday ? `2px solid ${todayRingColor}` : 'none',
                    boxShadow: isSelected ? `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.textStrong}` : 'none',
                  }}
                >
                  {day}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      {monthError && (
        <Card style={{ background: colors.dangerSurface, boxShadow: 'none', textAlign: 'center' }}>
          <p style={{ ...styles.errorText, margin: `0 0 ${spacing.md}px` }}>{monthError}</p>
          <AppButton variant="secondary" onClick={retryMonth}>
            다시 시도
          </AppButton>
        </Card>
      )}

      {futureNotice && (
        <Card style={{ background: colors.dangerSurface, boxShadow: 'none' }}>
          <p style={{ margin: 0, color: colors.danger, fontWeight: 600, fontSize: font.size.sm, textAlign: 'center' }}>
            미래 날짜는 선택할 수 없습니다.
          </p>
        </Card>
      )}

      {selectedDateKey && monthLoading && (
        <Card style={{ textAlign: 'center' }}>
          <Spinner size={20} />
        </Card>
      )}

      {selectedDateKey && !monthLoading && selectedInfo?.source === 'auto' && (
        <Card style={{ background: colors.primarySurface, boxShadow: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <h3 style={{ margin: 0, color: colors.textStrong }}>
              {selectedDateKey}
              {selectedDateKey === todayKey && <span style={{ color: colors.primary }}> · 오늘</span>}
            </h3>
            <StatusBadge status={selectedInfo.status} label={`자동 판정 · ${AUTO_STATUS_LABELS[selectedInfo.status]}`} />
          </div>

          <NutritionStatusPanel recommended={effectiveRecommended} total={selectedInfo.total} />

          <button
            type="button"
            className="tds-press"
            onClick={() => setFoodListOpen((v) => !v)}
            aria-expanded={foodListOpen}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              borderTop: `1px solid ${colors.border}`,
              marginTop: spacing.lg,
              padding: `${spacing.md}px 0 0`,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: font.size.sm, fontWeight: 600, color: colors.textStrong }}>
              {foodListOpen ? '접기' : '그날 먹은 음식 보기'}
            </span>
            <ChevronIcon open={foodListOpen} />
          </button>

          {foodListOpen && (
            selectedItems.length === 0 ? (
              <p style={{ margin: `${spacing.md}px 0 0`, color: colors.textSub, fontSize: font.size.sm, textAlign: 'center' }}>
                그날 먹은 음식 기록이 없어요.
              </p>
            ) : (
              <div style={{ maxHeight: 480, overflowY: 'auto', marginTop: spacing.md }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                  {selectedItems.map((item, i) => (
                    <MiniMealCard key={i} item={item} />
                  ))}
                </div>
              </div>
            )
          )}
        </Card>
      )}

      {/* 오늘인데 분석 기록도, 직접 고른 상태도 없는 경우 — 수동 상태 선택 대신 기록을 유도한다.
          "오늘 뭘 먹었는지 직접 좋음/보통/나쁨으로 고르세요"보다 촬영으로 보내는 편이 자연스럽고,
          달력에 처음 들어온 사람이 다음에 뭘 해야 할지 바로 알 수 있다. 과거 날짜는 이미 지나가서
          촬영할 수 없으므로 기존의 수동 선택 UI를 그대로 쓴다. */}
      {showTodayEmptyState && (
        <Card style={{ textAlign: 'center', padding: `${spacing.xxxl}px ${spacing.xl}px` }}>
          <p style={{ color: colors.textStrong, fontWeight: 700, marginBottom: spacing.sm }}>아직 오늘 기록이 없어요</p>
          <p style={{ color: colors.textSub, marginBottom: spacing.lg }}>식사를 기록해보세요.</p>
          <Link
            to="/analyze"
            className="tds-press"
            style={{ ...styles.buttonPrimary, display: 'flex', textDecoration: 'none' }}
          >
            음식 촬영하러 가기
          </Link>
        </Card>
      )}

      {selectedDateKey && !monthLoading && !showTodayEmptyState && selectedInfo?.source !== 'auto' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <h3 style={{ margin: 0, color: colors.textStrong }}>
              {selectedDateKey}
              {selectedDateKey === todayKey && <span style={{ color: colors.primary }}> · 오늘</span>}
            </h3>
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

      <DateRangeExport />
    </div>
  )
}
