// 지도 탭의 "학식·급식" 서브 뷰 — 초중고 급식(NEIS, 공식 알레르기 정보)과 대학 학식(자동 태깅)을
// 프로필에 저장된 school.type에 따라 갈라 보여준다(PRD 4주차 1절). 급식·학식 카드는 MealCard.jsx
// 하나를 공유한다(4주차 보강 Step 6) — 표시 레이어만 간소화했고 데이터 흐름은 그대로다.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from './AppButton.jsx'
import Card from './Card.jsx'
import ChevronIcon from './ChevronIcon.jsx'
import CnuCafeteriaLocationCard from './CnuCafeteriaLocationCard.jsx'
import MealCard from './MealCard.jsx'
import Skeleton from './Skeleton.jsx'
import { MILAIZE_ALLERGENS } from '../lib/allergyRules.js'
import { CNU1_EXTERNAL_LINK, CNU_BUILDINGS, getSelectedCnuBuilding, setSelectedCnuBuilding } from '../lib/cnuBuildings.js'
import { buildDaySlots, isDayEmpty } from '../lib/cnuDayView.js'
import { openExternalLink } from '../lib/externalLink.js'
import { geminiCompleteWithRetry } from '../lib/gemini.js'
import { GEMINI_TEMPERATURE, TRAY_ANALYSIS_SCHEMA } from '../lib/geminiSchemas.js'
import { assignTrayWeights } from '../lib/mealPortions.js'
import { NUTRITION_SOURCE } from '../lib/nutrition.js'
import { buildTrayAnalysisPrompt, parseTrayAnalysisResult } from '../lib/prompts/trayAnalysis.js'
import { getSchoolMeals } from '../lib/schoolMeal.js'
import { getUnivWeek } from '../lib/univMeal.js'
import { toDateKey } from '../lib/records.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

const MEAL_TYPE_LABEL = { breakfast: '조식', lunch: '중식', dinner: '석식' }
const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토']

// NEIS가 주는 순서(탄수화물·단백질·지방 먼저) 그대로 — MealCard가 앞 3개만 기본 노출하고
// 나머지(칼슘·철분·비타민C)는 "더보기"로 펼친다.
const NEIS_NUTRIENT_DISPLAY = [
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'calcium', label: '칼슘', unit: 'mg' },
  { key: 'iron', label: '철분', unit: 'mg' },
  { key: 'vitaminC', label: '비타민C', unit: 'mg' },
]

// NEIS meal.nutrients({key:value}) -> MealCard가 기대하는 [{key,label,unit,value}] 목록으로.
function buildNutrientRows(nutrients) {
  if (!nutrients) return []
  return NEIS_NUTRIENT_DISPLAY.filter(({ key }) => nutrients[key] != null).map(({ key, label, unit }) => ({
    key,
    label,
    unit,
    value: nutrients[key],
  }))
}

// ── 한 판 통합 분석(5주차 §3-B) ──────────────────────────────────────────────
// 식별 단계 없이(무엇을 먹었는지는 이미 앎) 중량만 배분(mealPortions.js)해 영양 성분 추정을
// Gemini에 맡긴다. 기존 /api/gemini 경로를 그대로 쓰고, 결과는 Analyze.jsx의 기존 결과 카드
// 상태 머신(STATUS.RESULT → AnalysisResultCard → 저장)에 그대로 얹는다 — 이 파일은 그 입력을
// 만들어 navigate로 건네주기만 한다.
const TRAY_ANALYSIS_FAILURE_MESSAGE = '통합 분석에 실패했어요. 메뉴별 분석을 이용해주세요.'

async function requestTrayAnalysis(menuNames) {
  const trayItems = assignTrayWeights(menuNames)
  const prompt = buildTrayAnalysisPrompt(trayItems)
  const callOnce = () =>
    geminiCompleteWithRetry({
      prompt,
      schema: TRAY_ANALYSIS_SCHEMA,
      schemaName: 'tray_analysis',
      temperature: GEMINI_TEMPERATURE.trayAnalysis,
    })

  let result = parseTrayAnalysisResult(await callOnce())
  if (!result) {
    result = parseTrayAnalysisResult(await callOnce())
  }
  if (!result) {
    throw new Error(TRAY_ANALYSIS_FAILURE_MESSAGE)
  }
  return result
}

function toAnalysisItems(trayItems) {
  return trayItems.map((item) => ({
    name: item.name,
    nutrients: {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      sodium: item.sodium,
    },
    source: NUTRITION_SOURCE.ESTIMATED,
  }))
}

// officialCalories: NEIS 급식만 넘긴다 — 있으면 합계 칼로리를 NEIS 공식값으로 덮어써 "공식
// 영양정보 기준"으로 표기하고(항목별 배분은 여전히 Gemini 추정 참고용), 없으면(학식) Gemini
// 합계를 그대로 "추정"으로 표기한다.
function buildTrayAnalysisNavState(trayResult, { mealTypeKey, mealTypeLabel, officialCalories }) {
  // NEIS 파싱이 실패하면 meal.calories가 NaN일 수 있다(server/proxy.js가 Number.parseFloat 실패를
  // null로 거르지 않는 지점이 있음) — NaN은 `!= null`을 통과해버려 그대로 total.calories에 들어가면
  // isMealAnalysis의 typeof==='number' 체크(NaN도 통과)까지 뚫고 화면·저장 데이터에 NaN이 섞인다.
  // Number.isFinite로 NaN/null/undefined를 한 번에 걸러 "공식 값이 실제로 유효할 때만" 덮어쓴다.
  const hasOfficialCalories = Number.isFinite(officialCalories)
  const items = toAnalysisItems(trayResult.items)
  const total = hasOfficialCalories ? { ...trayResult.total, calories: officialCalories } : trayResult.total
  return {
    prefillTrayAnalysis: {
      pendingAnalysis: { items, total },
      mealType: mealTypeKey,
      titleOverride: `${mealTypeLabel}(통합)`,
      sourceNote: hasOfficialCalories ? '공식 영양정보 기준' : '추정',
    },
  }
}

function useTrayAnalysis(navigate) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  async function run(menuNames, options) {
    if (analyzing) return
    setAnalyzing(true)
    setError('')
    try {
      const trayResult = await requestTrayAnalysis(menuNames)
      navigate('/analyze', { state: buildTrayAnalysisNavState(trayResult, options) })
    } catch (err) {
      setError(err.message || TRAY_ANALYSIS_FAILURE_MESSAGE)
    } finally {
      setAnalyzing(false)
    }
  }

  return { analyzing, error, run }
}

function startOfWeek(date) {
  const day = date.getDay() // 0=일요일
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function buildWeekDates(anchor) {
  const monday = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

// FR-1.4b/c: 태그를 탭하지 않아도 전체 코드표를 확인할 수 있어야 한다 — 접었다 펼 수 있는 카드로 상시 노출.
export function AllergyCodeSheet() {
  const [open, setOpen] = useState(false)
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        className="tds-press"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          background: 'none',
          border: 'none',
          padding: spacing.lg,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: font.size.sm, fontWeight: 600, color: colors.textStrong }}>알레르기 유발 식품 안내</span>
        <span style={{ color: colors.muted }}>
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div style={{ padding: `0 ${spacing.lg}px ${spacing.lg}px`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {MILAIZE_ALLERGENS.map((a) => (
            <span key={a.code} style={{ fontSize: font.size.xs, color: colors.textSub }}>
              {a.code}.{a.name}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

function NoSchoolCard() {
  const navigate = useNavigate()
  return (
    <Card>
      <p style={{ margin: 0, color: colors.textStrong, fontSize: font.size.md, fontWeight: 600 }}>
        내 학교를 설정하면 이번 주 식단을 볼 수 있어요
      </p>
      <p style={{ margin: `${spacing.sm}px 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
        급식(초·중·고)이나 학식(대학) 중 다니는 학교를 프로필에서 골라주세요.
      </p>
      <AppButton onClick={() => navigate('/profile')}>내 학교 설정하러 가기</AppButton>
    </Card>
  )
}

function WeekTabs({ weekDates, selectedKey, todayKey, onSelect }) {
  return (
    <Card style={{ padding: spacing.md }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {weekDates.map((d) => {
          const key = toDateKey(d)
          const active = key === selectedKey
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              className="tds-press"
              onClick={() => onSelect(key)}
              style={{
                flex: 1,
                padding: `${spacing.sm}px 0`,
                borderRadius: radius.sm,
                border: isToday && !active ? `1px solid ${colors.primary}` : 'none',
                background: active ? colors.primary : 'transparent',
                color: active ? '#fff' : colors.textStrong,
                fontSize: font.size.xs,
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: 1.5,
              }}
            >
              {WEEKDAY_LABEL[d.getDay()]}
              <br />
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function NeisMealCard({ meal }) {
  const navigate = useNavigate()
  const { analyzing, error, run } = useTrayAnalysis(navigate)
  const label = MEAL_TYPE_LABEL[meal.mealType] || meal.mealType

  return (
    <MealCard
      title={label}
      calories={meal.calories}
      menus={meal.menus}
      nutrients={buildNutrientRows(meal.nutrients)}
      estimated={false}
      onAnalyzeTray={() =>
        run(
          meal.menus.map((m) => m.name),
          { mealTypeKey: meal.mealType, mealTypeLabel: label, officialCalories: meal.calories },
        )
      }
      trayAnalyzing={analyzing}
      trayError={error}
    />
  )
}

function K12MealSection({ school, weekDates, selectedKey, todayKey, onSelectDay }) {
  const [daysByKey, setDaysByKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const from = toDateKey(weekDates[0]).replace(/-/g, '')
    const to = toDateKey(weekDates[weekDates.length - 1]).replace(/-/g, '')

    getSchoolMeals({ officeCode: school.officeCode, schoolCode: school.code, from, to })
      .then((days) => {
        if (cancelled) return
        const byKey = {}
        for (const day of days) {
          const key = `${day.date.slice(0, 4)}-${day.date.slice(4, 6)}-${day.date.slice(6, 8)}`
          byKey[key] = day.meals
        }
        setDaysByKey(byKey)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '급식 정보를 불러오지 못했어요.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [school.officeCode, school.code, weekDates])

  const selectedMeals = daysByKey?.[selectedKey] ?? []

  return (
    <>
      <WeekTabs weekDates={weekDates} selectedKey={selectedKey} todayKey={todayKey} onSelect={onSelectDay} />

      {loading && <Skeleton height={140} radius={radius.lg} />}
      {!loading && error && (
        <Card style={{ background: colors.deficientSurface, boxShadow: 'none' }}>
          <p style={{ margin: 0, color: colors.textStrong, fontSize: font.size.sm }}>{error}</p>
        </Card>
      )}
      {!loading && !error && selectedMeals.length === 0 && (
        <Card>
          <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm, textAlign: 'center' }}>
            이 날은 급식 정보가 없어요
          </p>
        </Card>
      )}
      {!loading && !error && selectedMeals.map((meal) => <NeisMealCard key={meal.mealType} meal={meal} />)}
    </>
  )
}

// updatedAt: 'YYYY-MM-DD'. 폴백 데이터일 때만 노출하는 "○월 ○일 기준" 안내(PRD 1.2) — 오래된 데이터를
// 최신처럼 보이지 않게 한다.
function formatFallbackNotice(updatedAt) {
  if (!updatedAt) return '최근 확인된 식단 기준이에요'
  const [, m, d] = updatedAt.split('-')
  return `${Number(m)}월 ${Number(d)}일 기준으로 확인된 식단이에요`
}

function CnuBuildingSelector({ selected, onSelect }) {
  return (
    <Card style={{ padding: spacing.md }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {CNU_BUILDINGS.map((b) => {
          const active = b.key === selected
          return (
            <button
              key={b.key}
              type="button"
              className="tds-press"
              onClick={() => onSelect(b.key)}
              style={{
                flex: 1,
                padding: `${spacing.sm}px 2px`,
                borderRadius: radius.sm,
                border: 'none',
                background: active ? colors.primary : colors.bg,
                color: active ? '#fff' : colors.textStrong,
                fontWeight: 700,
                fontSize: font.size.xs,
                cursor: 'pointer',
              }}
            >
              {b.label}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

const TRACK_OPTIONS = [
  { key: 'student', label: '학생' },
  { key: 'staff', label: '직원' },
]

function TrackToggle({ track, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.sm, margin: `0 0 ${spacing.sm}px` }}>
      {TRACK_OPTIONS.map((opt) => {
        const active = track === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            className="tds-press"
            onClick={() => onChange(opt.key)}
            style={{
              padding: `4px ${spacing.md}px`,
              borderRadius: radius.pill,
              border: active ? 'none' : `1px solid ${colors.border}`,
              background: active ? colors.primary : 'transparent',
              color: active ? '#fff' : colors.textSub,
              fontWeight: 600,
              fontSize: font.size.xs,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// 제1학생회관은 이 시스템에 실제 식단 데이터가 없다(실측) — 조/중/석 카드 대신 안내 배너 하나만 보여준다.
function Cnu1ExternalBanner() {
  return (
    <Card style={{ textAlign: 'center' }}>
      <p style={{ margin: 0, color: colors.textStrong, fontSize: font.size.sm }}>{CNU1_EXTERNAL_LINK.note}</p>
      <button
        type="button"
        className="tds-press"
        onClick={() => openExternalLink(CNU1_EXTERNAL_LINK.url)}
        style={{ ...styles.linkButton, marginTop: spacing.md }}
      >
        안내 페이지 열기
      </button>
    </Card>
  )
}

const PERIOD_NOTE_TEXT = {
  closed: '운영하지 않아요',
  unknown: '정보를 확인할 수 없어요',
}

// 열린 한 끼(조식/중식/석식) 카드 — 메뉴별 분석(기존)과 한 판 통합 분석(5주차 §3-B) 버튼을 함께
// 그린다. 자체 useTrayAnalysis 인스턴스를 가지므로, 같은 날 조식 카드가 분석 중이어도 중식 카드는
// 영향받지 않는다(카드별로 독립된 로딩/에러).
function UnivMealSlotCard({ mealKey, label, slot }) {
  const navigate = useNavigate()
  const { analyzing, error, run } = useTrayAnalysis(navigate)

  return (
    <MealCard
      title={label}
      price={slot.price}
      // slot.menus는 이미 cnuWeeklyParser.js가 allergyCodes까지 계산해서 준다(주석 기반 태깅 +
      // 키워드 태깅 합집합) — 여기서 다시 추정하면 오히려 정확도가 떨어져(주석은 서버가 이미
      // 제거함) 그대로 쓴다.
      menus={slot.menus}
      estimated
      // 학식은 영양 정보가 없어 기존 텍스트 분석 경로로 넘겨 추정한다(FR-1.3) — 새 파이프라인을
      // 만들지 않고 Analyze.jsx의 4번째 입구(prefillMenuName)만 쓴다.
      onAnalyzeMenu={(menuName) => navigate('/analyze', { state: { prefillMenuName: menuName } })}
      onAnalyzeTray={() =>
        run(
          slot.menus.map((m) => m.name),
          { mealTypeKey: mealKey, mealTypeLabel: label, officialCalories: null },
        )
      }
      trayAnalyzing={analyzing}
      trayError={error}
    />
  )
}

// 선택한 날짜·건물·트랙(학생/직원)의 조식/중식/석식을 그린다. open만 전체 MealCard, 나머지
// (closed/suspended/unknown)는 한 줄 안내로 공간을 아낀다 — 하루 전체가 비면 기존 빈 상태 문구.
function UnivDayMeals({ meals, track, source, updatedAt }) {
  const slots = buildDaySlots(meals, track)

  if (isDayEmpty(slots)) {
    return (
      <Card>
        <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm, textAlign: 'center' }}>
          이 날은 학식 정보가 없어요
        </p>
      </Card>
    )
  }

  return (
    <>
      {source === 'fallback' && (
        <p style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.xs, color: colors.textSub, textAlign: 'center' }}>
          {formatFallbackNotice(updatedAt)}
        </p>
      )}
      {slots.map(({ key, label, slot }) => {
        if (!slot || slot.status === 'closed' || slot.status === 'unknown') {
          const text = !slot ? PERIOD_NOTE_TEXT.unknown : PERIOD_NOTE_TEXT[slot.status]
          return (
            <p key={key} style={{ margin: `4px 0`, fontSize: font.size.xs, color: colors.muted, textAlign: 'center' }}>
              {label} · {text}
            </p>
          )
        }
        if (slot.status === 'suspended') {
          return (
            <p key={key} style={{ margin: '4px 0', fontSize: font.size.xs, color: colors.deficient, textAlign: 'center' }}>
              {label} · {slot.note || '운영 중단'}
            </p>
          )
        }
        return <UnivMealSlotCard key={key} mealKey={key} label={label} slot={slot} />
      })}
    </>
  )
}

function UnivMealSection({ univCode, weekDates, selectedKey, todayKey, onSelectDay, building, onSelectBuilding }) {
  const [track, setTrack] = useState('student')
  const [weekResult, setWeekResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 이번 주 전체(5개 식당 × 6일)를 한 번만 받는다 — 날짜·식당·트랙을 바꿔도 이미 받은 데이터
  // 안에서 골라 보여줄 뿐 서버를 다시 부르지 않는다(요일 탭 클릭마다 API를 부르던 이전보다 훨씬 빠르다).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getUnivWeek({ univ: univCode })
      .then((data) => {
        if (!cancelled) setWeekResult(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '학식 정보를 불러오지 못했어요.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [univCode])

  const selectedDay = weekResult?.days?.find((d) => `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}` === selectedKey)
  const cafeteria = selectedDay?.cafeterias?.[building]

  return (
    <>
      <CnuBuildingSelector selected={building} onSelect={onSelectBuilding} />
      <WeekTabs weekDates={weekDates} selectedKey={selectedKey} todayKey={todayKey} onSelect={onSelectDay} />

      {loading && <Skeleton height={140} radius={radius.lg} />}
      {!loading && error && (
        <Card style={{ background: colors.deficientSurface, boxShadow: 'none' }}>
          <p style={{ margin: 0, color: colors.textStrong, fontSize: font.size.sm }}>{error}</p>
        </Card>
      )}
      {!loading && !error && building === 'cnu1' && <Cnu1ExternalBanner />}
      {!loading && !error && building !== 'cnu1' && (
        <>
          <TrackToggle track={track} onChange={setTrack} />
          {cafeteria ? (
            <UnivDayMeals meals={cafeteria.meals} track={track} source={weekResult.source} updatedAt={weekResult.updatedAt} />
          ) : (
            <Card>
              <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm, textAlign: 'center' }}>
                이 날은 학식 정보가 없어요
              </p>
            </Card>
          )}
        </>
      )}
    </>
  )
}

export default function CafeteriaPanel() {
  const { profile } = useUser()
  const school = profile?.school ?? null

  const [anchorDate] = useState(() => new Date())
  const weekDates = useMemo(() => buildWeekDates(anchorDate), [anchorDate])
  const todayKey = toDateKey(anchorDate)
  const [selectedKey, setSelectedKey] = useState(todayKey)

  // 식비 선택은 대학 학식에서만 의미가 있지만, 위치 카드(CnuCafeteriaLocationCard)가 건물 선택 버튼
  // (UnivMealSection 안)과는 형제 컴포넌트라 같은 선택값을 공유하려면 여기 최상위로 끌어올려야 한다.
  const [building, setBuilding] = useState(() => getSelectedCnuBuilding())

  function handleSelectBuilding(key) {
    setBuilding(key)
    setSelectedCnuBuilding(key)
  }

  if (!school) {
    return <NoSchoolCard />
  }

  return (
    <>
      {school.type === 'k12' && (
        <K12MealSection
          school={school}
          weekDates={weekDates}
          selectedKey={selectedKey}
          todayKey={todayKey}
          onSelectDay={setSelectedKey}
        />
      )}
      {school.type === 'university' && (
        <UnivMealSection
          univCode={school.code}
          weekDates={weekDates}
          selectedKey={selectedKey}
          todayKey={todayKey}
          onSelectDay={setSelectedKey}
          building={building}
          onSelectBuilding={handleSelectBuilding}
        />
      )}
      <AllergyCodeSheet />
      {school.type === 'university' && <CnuCafeteriaLocationCard selectedBuilding={building} />}
    </>
  )
}
