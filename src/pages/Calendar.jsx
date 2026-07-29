import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ChevronIcon from '../components/ChevronIcon.jsx'
import DateRangeExport from '../components/DateRangeExport.jsx'
import DietAnalysisCard from '../components/DietAnalysisCard.jsx'
import MealTypeBadge from '../components/MealTypeBadge.jsx'
import NutritionStatusPanel from '../components/NutritionStatusPanel.jsx'
import SegmentedControl from '../components/SegmentedControl.jsx'
import Spinner from '../components/Spinner.jsx'
import StreakBadge from '../components/StreakBadge.jsx'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { getMealsByDateRange } from '../lib/dataStore.js'
import { getManualDayStatus, setManualDayStatus } from '../lib/dayStatus.js'
import { flattenMealItems, sumMealRecordsNutrients } from '../lib/mealStore.js'
import {
  buildNutrientStatusRows,
  calcAchievementPercent,
  calcDayStatus,
  formatNutrientOrDash,
  NUTRIENT_LABELS,
  NUTRIENT_STATUS,
} from '../lib/nutrition.js'
import { mondayKeyOf, weekDateKeys } from '../lib/questWeekContext.js'
import { getAllRecords, toDateKey } from '../lib/records.js'
import { TABS } from '../lib/tabs.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const WEEKDAY_SHORT = ['월', '화', '수', '목', '금', '토', '일']

const STATUS_COLORS = { good: colors.satisfied, normal: colors.deficient, bad: colors.danger }
// 자동판정과 수동선택이 같은 빨강(bad)을 서로 다른 단어("위험"/"나쁨")로 불러 화면마다 다르게
// 읽히던 것을 하나로 통일한다 — 스크린리더 aria-label도 이 맵 하나만 참조한다(리뷰에서 발견:
// 이전엔 aria-label이 상황과 무관하게 항상 AUTO_STATUS_LABELS를 썼다).
const STATUS_LABELS = { good: '좋음', normal: '보통', bad: '나쁨' }
// 수동 상태 선택 SegmentedControl의 옵션 — 좋음/보통/나쁨마다 선택됐을 때의 배경색이 서로 달라야 해서
// (전부 초록인 다른 세그먼트 컨트롤과 달리) 옵션마다 activeColor를 함께 싣는다.
const MANUAL_STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([key, label]) => ({
  key,
  label,
  activeColor: STATUS_COLORS[key],
}))

// 달력 개편(리텐션 강화 v7) — 날짜 상세 카드의 3-way 탭. "AI 분석"은 선택한 날짜와 무관한(최근
// 7/30일 롤링 집계) 콘텐츠지만, 목업처럼 이 탭 그룹 안에 두는 게 화면 하나에 흩어져 있던 걸
// 모으는 방향이라 사용자가 확인 후 그렇게 결정했다.
const DETAIL_TABS = [
  { key: 'nutrients', label: '영양소' },
  { key: 'meals', label: '먹은 음식' },
  { key: 'ai', label: 'AI 분석' },
]

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

// 주간 스트립(기본 뷰) — 선택된 날짜가 속한 주(월~일) 7일만 보여준다. 셀 디자인은 기존 월 그리드의
// "상태색 원"을 그대로 재사용하되 요일 라벨과 함께 두 줄로 쌓는다.
function WeekStrip({ weekDates, selectedDateKey, todayKey, dayInfoMap, onSelectDay }) {
  return (
    <Card style={{ padding: '10px 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', justifyItems: 'center' }}>
        {weekDates.map((dateKey, i) => {
          const isFuture = dateKey > todayKey
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDateKey
          const info = dayInfoMap[dateKey]
          const statusColor = info ? STATUS_COLORS[info.status] : null
          const day = Number(dateKey.slice(-2))
          const todayRingColor = statusColor ? '#fff' : colors.primary

          return (
            <button
              key={dateKey}
              type="button"
              className="tds-press"
              onClick={() => onSelectDay(dateKey)}
              aria-label={`${dateKey}${info ? ` · ${STATUS_LABELS[info.status]}` : ''}`}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: spacing.xs,
                cursor: 'pointer',
                opacity: isFuture ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: font.size.xs, color: colors.muted, fontWeight: 600 }}>{WEEKDAY_SHORT[i]}</span>
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
  )
}

const RING_SIZE = 96
const RING_STROKE = 10
const COUNT_ORDER = [NUTRIENT_STATUS.SATISFIED, NUTRIENT_STATUS.DEFICIENT, NUTRIENT_STATUS.EXCEEDED]
const COUNT_LABELS = { [NUTRIENT_STATUS.SATISFIED]: '충족', [NUTRIENT_STATUS.DEFICIENT]: '부족', [NUTRIENT_STATUS.EXCEEDED]: '초과' }
const COUNT_COLORS = { [NUTRIENT_STATUS.SATISFIED]: colors.satisfied, [NUTRIENT_STATUS.DEFICIENT]: colors.deficientText, [NUTRIENT_STATUS.EXCEEDED]: colors.muted }

// 달력 탭 개편(지도·달력 모바일 개편 3안) — 날짜를 고르면 항상 보이는 요약 카드(달성률 링 + 충족/
// 부족/초과 3행 + 자동 판정 배지). 자동 판정 데이터(실측 기록)가 있는 날에만 보여준다 — 계산 자체는
// 예전 NutritionStatusPanel의 도넛 로직을 그대로 옮긴 것뿐(같은 nutrition.js 함수 재사용). 수동
// 선택(기록 없는 과거 날짜)은 계산할 실측치가 없어 이 카드 대신 아래 탭 카드의 좋음/보통/나쁨
// 선택 UI를 그대로 쓴다(예전과 동일, 이 카드가 대체하지 않는다).
function DaySummaryCard({ selectedDateKey, isSelectedToday, status, total, recommended }) {
  const achievementPercent = Math.max(0, Math.min(100, calcAchievementPercent(recommended, total)))
  const rows = buildNutrientStatusRows(recommended, total)
  const counts = COUNT_ORDER.reduce((acc, s) => {
    acc[s] = rows.filter((r) => r.status === s).length
    return acc
  }, {})
  const ringRadius = (RING_SIZE - RING_STROKE) / 2
  const circumference = 2 * Math.PI * ringRadius
  const offset = circumference * (1 - achievementPercent / 100)

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.lg }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: colors.textStrong, whiteSpace: 'nowrap' }}>
          {selectedDateKey}
          {isSelectedToday && <span style={{ color: colors.primary }}> · 오늘</span>}
        </h3>
        <StatusBadge status={status} label={`자동 판정 · ${STATUS_LABELS[status]}`} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
        <div style={{ width: RING_SIZE, height: RING_SIZE, position: 'relative', flexShrink: 0 }}>
          <svg
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
            role="img"
            aria-label="하루 목표 달성률"
          >
            <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={ringRadius} fill="none" stroke={colors.track} strokeWidth={RING_STROKE} />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={ringRadius}
              fill="none"
              stroke={colors.primary}
              strokeWidth={RING_STROKE}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: colors.textStrong }}>{achievementPercent}%</span>
            <span style={{ fontSize: 10.5, color: colors.muted }}>달성률</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {COUNT_ORDER.map((s) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, color: colors.textSub }}>{COUNT_LABELS[s]}</span>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: COUNT_COLORS[s] }}>{counts[s]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default function Calendar() {
  useDocumentTitle(TABS.find((t) => t.key === 'calendar').label)
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
  const [detailTab, setDetailTab] = useState('nutrients') // 날짜 상세 카드의 영양소/먹은음식/AI분석 탭
  // "월간 보기" — 기본은 접힘(주간 스트립만 보임). 펼치면 기존 월 전체 그리드가 그대로 나타난다.
  const [monthExpanded, setMonthExpanded] = useState(false)

  const isCurrentMonth = cursor.year * 12 + cursor.month >= currentMonthTotal

  const records = useMemo(() => getAllRecords(effectiveUserId), [effectiveUserId])
  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor])

  const monthStart = toDateKey(new Date(cursor.year, cursor.month, 1))
  const monthEnd = toDateKey(new Date(cursor.year, cursor.month + 1, 0))

  // 주간 스트립은 "선택된 날짜가 속한 주"를 보여준다 — 별도 주 탐색 UI 없이 선택 날짜에서 파생된다
  // (다른 주로 옮기려면 "월간 보기"를 펼쳐 다른 날짜를 고른다).
  const weekDates = useMemo(() => weekDateKeys(mondayKeyOf(selectedDateKey)), [selectedDateKey])

  // 보이는 달 전체의 끼니 기록을 Supabase에서 한 번에 조회한다({ [date]: mealRecord[] }) — 날짜마다
  // 따로 쿼리하지 않고 달 단위로 묶어서 조회 횟수를 최소화한다. 주간 스트립이 달 경계를 걸치는 주(예:
  // 월말 며칠)를 보여줄 수도 있으므로, 조회 범위를 "이번 달"과 "선택된 주" 중 더 넓은 쪽으로 맞춰
  // 항상 둘 다 커버한다(주는 최대 6일까지만 달 밖으로 나갈 수 있어 범위가 크게 늘지 않는다).
  const fetchStart = weekDates[0] < monthStart ? weekDates[0] : monthStart
  const fetchEnd = weekDates[6] > monthEnd ? weekDates[6] : monthEnd
  const [monthMeals, setMonthMeals] = useState({})
  const [monthLoading, setMonthLoading] = useState(true)
  const [monthError, setMonthError] = useState('')
  const [monthReloadTick, setMonthReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setMonthLoading(true)
    setMonthError('')

    getMealsByDateRange(fetchStart, fetchEnd)
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
  }, [effectiveUserId, fetchStart, fetchEnd, monthReloadTick])

  function retryMonth() {
    setMonthReloadTick((t) => t + 1)
  }

  // 보이는 범위(이번 달 + 선택된 주)의 날짜별 상태 맵: 기록 있는 날은 자동 판정(source:'auto'),
  // 없는 날은 수동 선택값(source:'manual').
  const dayInfoMap = useMemo(() => {
    const map = {}
    const allDateKeys = new Set([...cells.filter((d) => d !== null).map((d) => toDateKey(new Date(cursor.year, cursor.month, d))), ...weekDates])

    for (const dateKey of allDateKeys) {
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
  }, [cells, weekDates, cursor, effectiveUserId, effectiveRecommended, records, todayKey, statusVersion, monthMeals])

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
    setDetailTab('nutrients')
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
    // 월간 보기에서 날짜를 고르면 항상 접힌다(이미 선택돼 있던 날짜를 다시 눌러도 마찬가지) — 그래야
    // "달력 안 아무 날짜나 탭하면 접힌다"는 기대와 어긋나지 않는다(리뷰에서 발견: 이 줄이 아래 동일
    // 날짜 조기 반환보다 뒤에 있으면 이미 선택된 날짜를 다시 눌렀을 때만 그리드가 안 접혔다).
    setMonthExpanded(false)
    if (dateKey === selectedDateKey) return
    setSelectedDateKey(dateKey)
    setDetailTab('nutrients')
  }

  function handlePickManualStatus(status) {
    if (!selectedDateKey) return
    setManualDayStatus(effectiveUserId, selectedDateKey, status)
    setStatusVersion((v) => v + 1)
  }

  const isSelectedToday = selectedDateKey === todayKey

  return (
    <div style={styles.page}>
      {/* 화면 제목("달력")과 설명 줄은 두지 않는다 — 하단 탭바가 이미 현재 화면을 알려주고,
          달력 UI 자체가 무슨 화면인지 바로 보여준다. 달력 탭 개편(지도·달력 모바일 개편 3안) —
          "OOOO년 O월" 타이틀을 새로 상단에 항상 노출하고, 그 옆에 연속 기록 배지(트랙 1 §4, 홈과
          같은 컴포넌트지만 이 화면에서만 tone="warm"으로 주황 톤 — 달력이 보여주는 월과 무관하게
          항상 "오늘 기준" 연속 기록이라 보고 있는 달이 지난 달이어도 값이 바뀌지 않는다). */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: colors.textStrong }}>
          {cursor.year}년 {cursor.month + 1}월
        </span>
        <StreakBadge tone="warm" />
      </div>

      <WeekStrip
        weekDates={weekDates}
        selectedDateKey={selectedDateKey}
        todayKey={todayKey}
        dayInfoMap={dayInfoMap}
        onSelectDay={handleSelectDay}
      />

      <button
        type="button"
        className="tds-press"
        onClick={() => setMonthExpanded((v) => !v)}
        aria-expanded={monthExpanded}
        style={{
          ...styles.linkButton,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          margin: `${spacing.xs}px auto ${spacing.md}px`,
        }}
      >
        월간 보기
        <ChevronIcon open={monthExpanded} />
      </button>

      {monthExpanded && (
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

              // 상태가 있는 날은 날짜 숫자를 감싸는 큰 원(지름 36px)을 상태 색으로 채운다. 오늘은 원
              // 안쪽 테두리로 강조(색이 채워진 원 위에서는 흰색, 빈 원에서는 포인트색), 선택된 날은
              // 원 바깥에 간격을 둔 어두운 링으로 강조한다 — 안쪽 테두리=오늘, 바깥 링=선택이라 한
              // 칸이 둘 다여도 서로 겹치지 않고 구분된다.
              const todayRingColor = statusColor ? '#fff' : colors.primary
              return (
                <button
                  key={i}
                  type="button"
                  className="tds-press"
                  onClick={() => handleSelectDay(dateKey)}
                  aria-label={`${cursor.month + 1}월 ${day}일${info ? ` · ${STATUS_LABELS[info.status]}` : ''}`}
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
      )}

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

      {/* 오늘인데 분석 기록도, 직접 고른 상태도 없는 경우 — 수동 상태 선택 대신 기록을 유도한다.
          "오늘 뭘 먹었는지 직접 좋음/보통/나쁨으로 고르세요"보다 촬영으로 보내는 편이 자연스럽고,
          달력에 처음 들어온 사람이 다음에 뭘 해야 할지 바로 알 수 있다. 과거 날짜는 이미 지나가서
          촬영할 수 없으므로 날짜 상세 카드의 "영양소" 탭 안에서 수동 선택 UI를 보여준다. */}
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

      {/* 달력 탭 개편(지도·달력 모바일 개편 3안) — 자동 판정(실측 기록)이 있는 날은 달성률 링 +
          충족/부족/초과 요약 카드를 항상 먼저 보여준다(날짜/배지 헤더도 이 카드가 담당). 수동 선택
          (기록 없는 과거 날짜)은 보여줄 실측치가 없어 이 카드를 건너뛰고, 아래 탭 카드가 예전처럼
          자체 헤더 + 좋음/보통/나쁨 선택 UI를 그대로 보여준다. */}
      {selectedDateKey && !monthLoading && !showTodayEmptyState && selectedInfo?.source === 'auto' && (
        <DaySummaryCard
          selectedDateKey={selectedDateKey}
          isSelectedToday={isSelectedToday}
          status={selectedInfo.status}
          total={selectedInfo.total}
          recommended={effectiveRecommended}
        />
      )}

      {/* 달력 개편 — 예전엔 "자동 판정 카드"와 "수동 선택 카드"가 서로 다른 두 Card였다. 이제 하나의
          카드 + 영양소/먹은 음식/AI 분석 3-way 탭으로 통합한다. 자동 판정 데이터가 없는 날은 "영양소"
          탭 안에서 수동 선택 UI를 보여줘(기존 좋음/보통/나쁨 SegmentedControl 그대로), 어떤 날을
          골라도 항상 같은 카드 구조를 본다. */}
      {selectedDateKey && !monthLoading && !showTodayEmptyState && (
        <Card>
          {/* 자동 판정인 날은 위 DaySummaryCard가 이미 날짜+배지를 보여주므로 여기서 중복 표시하지
              않는다 — 수동 선택/기록 없음인 날만 이 카드가 유일한 헤더라 그대로 보여준다. */}
          {selectedInfo?.source !== 'auto' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <h3 style={{ margin: 0, color: colors.textStrong }}>
                {selectedDateKey}
                {isSelectedToday && <span style={{ color: colors.primary }}> · 오늘</span>}
              </h3>
              {selectedInfo?.source === 'manual' && (
                <StatusBadge status={selectedInfo.status} label={`내가 선택 · ${STATUS_LABELS[selectedInfo.status]}`} />
              )}
            </div>
          )}

          <SegmentedControl options={DETAIL_TABS} value={detailTab} onChange={setDetailTab} />

          <div style={{ marginTop: spacing.lg }}>
            {detailTab === 'nutrients' &&
              (selectedInfo?.source === 'auto' ? (
                <NutritionStatusPanel recommended={effectiveRecommended} total={selectedInfo.total} />
              ) : (
                <>
                  <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
                    분석 기록이 없는 날이에요. 이 날의 영양 상태를 직접 선택해보세요.
                  </p>
                  <SegmentedControl
                    options={MANUAL_STATUS_OPTIONS}
                    value={selectedInfo?.status ?? null}
                    onChange={handlePickManualStatus}
                  />
                </>
              ))}

            {detailTab === 'meals' &&
              (selectedItems.length === 0 ? (
                <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm, textAlign: 'center' }}>
                  그날 먹은 음식 기록이 없어요.
                </p>
              ) : (
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    {selectedItems.map((item, i) => (
                      <MiniMealCard key={i} item={item} />
                    ))}
                  </div>
                </div>
              ))}

            {detailTab === 'ai' && (
              <>
                <p style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.xs, color: colors.muted, textAlign: 'center' }}>
                  최근 7일/30일 기준이에요 — 선택한 날짜와는 무관해요
                </p>
                <DietAnalysisCard bare />
              </>
            )}
          </div>
        </Card>
      )}

      <DateRangeExport />
    </div>
  )
}
