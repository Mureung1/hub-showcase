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
import SegmentedControl from './SegmentedControl.jsx'
import Skeleton from './Skeleton.jsx'
import { MILAIZE_ALLERGENS } from '../lib/allergyRules.js'
import { CNU1_EXTERNAL_LINK, CNU_BUILDINGS, getSelectedCnuBuilding, setSelectedCnuBuilding } from '../lib/cnuBuildings.js'
import { buildDaySlots, isDayEmpty } from '../lib/cnuDayView.js'
import { openExternalLink } from '../lib/externalLink.js'
import { NUTRITION_SOURCE } from '../lib/nutrition.js'
import { requestPrecisionAnalysis } from '../lib/precisionAnalysis.js'
import { getSchoolMeals } from '../lib/schoolMeal.js'
import { get, set } from '../lib/storage.js'
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

// ── 한 판 통합 분석 / 메뉴별 분석(6주차 §1-B) ────────────────────────────────
// 식별 단계 없이(무엇을 먹었는지는 이미 앎) server/nutrition/precisionEngine.js(정밀 영양 산출
// 엔진)에 메뉴명만 넘긴다 — 식약처 DB 매칭·중량 배분·Gemini 폴백·NEIS 공식 수치 캘리브레이션을
// 전부 서버가 처리한다(5주차 §3-B엔 프론트가 직접 Gemini를 불러 추정만 했지만, 이제 식약처 DB
// 매칭이 성공한 항목은 실측값을 쓴다). 결과는 Analyze.jsx의 기존 결과 카드 상태 머신
// (STATUS.RESULT → AnalysisResultCard → 저장)에 그대로 얹는다 — 이 파일은 그 입력을 만들어
// navigate로 건네주기만 한다. 한 판(트레이) 통합 분석과 메뉴별 개별 분석이 이 엔진 하나를
// 공유해 학식·급식 두 경로가 항상 같은 방식으로 계산된다.
const TRAY_ANALYSIS_FAILURE_MESSAGE = '통합 분석에 실패했어요. 메뉴별 분석을 이용해주세요.'
const MENU_ANALYSIS_FAILURE_MESSAGE = '영양 분석에 실패했어요. 잠시 후 다시 시도해주세요.'

const METHOD_SOURCE_NOTE = {
  official: '공식 영양정보 기준',
  llm_reviewed: '식약처 DB 기반 추정(교차검증)',
  estimated: '식약처 DB 기반 추정',
}

// precisionEngine이 준 item.matched(식약처 DB 실측 매칭 여부)를 기존 SourceBadge 배지 체계
// (AnalysisResultCard가 항목별로 그린다)로 바로 매핑해, 어디까지 실측이고 어디부터 AI 추정인지
// 항목 단위로 투명하게 보여준다. matchType(exact/alias/partial/fuzzy/null)도 함께 넘겨 트랙 2 §2의
// 항목별 매칭 방식 칩이 그릴 수 있게 한다 — 지금까지는 응답에만 실려오고 화면 어디서도 안 썼다.
function toAnalysisItems(items) {
  return items.map((item) => ({
    name: item.name,
    nutrients: item.nutrients,
    source: item.matched ? NUTRITION_SOURCE.DB : NUTRITION_SOURCE.ESTIMATED,
    matchType: item.matchType ?? null,
  }))
}

// isTray: 트레이(여러 메뉴) 분석이면 "(통합)"을 붙이고, 메뉴 하나만 조회하는 단일 항목 모드면
// 그 메뉴 이름을 그대로 제목으로 쓴다 — 예전엔 항상 "(통합)"을 붙여서 "떡갈비(통합)"처럼 단일
// 항목인데도 뭔가를 합친 것처럼 보이는 오표기가 있었다(리뷰에서 발견).
function buildTrayAnalysisNavState(result, { mealTypeKey, mealTypeLabel, isTray = true }) {
  return {
    prefillTrayAnalysis: {
      pendingAnalysis: { items: toAnalysisItems(result.items), total: result.total },
      mealType: mealTypeKey,
      titleOverride: isTray ? `${mealTypeLabel}(통합)` : mealTypeLabel,
      sourceNote: METHOD_SOURCE_NOTE[result.method] ?? '추정',
      confidence: result.confidence,
    },
  }
}

// CafeteriaPanel이 다시 마운트될 때(학식·급식 탭 재진입)마다 초기화된다 — "이번에 이 화면에 머무는
// 동안 이미 다른 카드의 분석 요청이 먼저 끝나 결과 화면으로 넘어갔는지"를 추적한다. 카드마다 독립된
// useTrayAnalysis/useMenuAnalysis 인스턴스를 쓰므로(카드별 로딩 상태를 따로 두려고), 늦게 끝난 다른
// 카드의 분석 요청(최대 45초 걸릴 수 있음)이 사용자가 이미 보고 있는/편집 중인 결과 화면을 조용히
// 덮어쓰는 걸 막으려면 카드를 넘나드는 공유 상태가 필요하다(리뷰에서 발견한 레이스 컨디션).
let hasNavigatedThisVisit = false

// officialCalories: NEIS 급식만 넘긴다 — precisionEngine이 서버에서 직접 공식 수치로 캘리브레이션한다
// (5주차엔 프론트가 total.calories를 직접 덮어썼지만, 이제 항목별 비례 스케일까지 서버가 계산해준다).
function useTrayAnalysis(navigate) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  async function run(menuNames, { mealTypeKey, mealTypeLabel, schoolType, officialCalories = null }) {
    if (analyzing) return
    setAnalyzing(true)
    setError('')
    try {
      const result = await requestPrecisionAnalysis({
        menus: menuNames,
        mealType: mealTypeKey,
        schoolType,
        officialTotals: Number.isFinite(officialCalories) ? { calories: officialCalories } : null,
      })
      if (hasNavigatedThisVisit) return // 다른 카드의 분석이 먼저 끝나 이미 결과 화면으로 넘어갔다 — 이 결과는 버린다
      hasNavigatedThisVisit = true
      navigate('/analyze', { state: buildTrayAnalysisNavState(result, { mealTypeKey, mealTypeLabel, isTray: true }) })
    } catch (err) {
      setError(err.message || TRAY_ANALYSIS_FAILURE_MESSAGE)
    } finally {
      setAnalyzing(false)
    }
  }

  return { analyzing, error, run }
}

// 메뉴별 개별 [영양 분석] — precisionEngine의 단일 항목 모드(menus 배열에 1개만 담아 호출). 예전엔
// Analyze.jsx로 메뉴명만 넘겨 사용자가 다시 분석을 눌러야 했지만(4주차), 이제 여기서 바로 계산해
// 한 판 통합 분석과 동일한 결과 카드로 넘어간다. 여러 메뉴가 한 카드에 나열되므로, 지금 분석 중인
// 메뉴명 하나만 상태로 들고 있다가 그 버튼에만 로딩을 표시한다(다른 메뉴 버튼은 그대로 눌림).
function useMenuAnalysis(navigate) {
  const [analyzingMenu, setAnalyzingMenu] = useState(null)
  const [error, setError] = useState('')

  async function run(menuName, { mealTypeKey, schoolType }) {
    if (analyzingMenu) return
    setAnalyzingMenu(menuName)
    setError('')
    try {
      const result = await requestPrecisionAnalysis({ menus: [menuName], mealType: mealTypeKey, schoolType, officialTotals: null })
      if (hasNavigatedThisVisit) return
      hasNavigatedThisVisit = true
      navigate('/analyze', { state: buildTrayAnalysisNavState(result, { mealTypeKey, mealTypeLabel: menuName, isTray: false }) })
    } catch (err) {
      setError(err.message || MENU_ANALYSIS_FAILURE_MESSAGE)
    } finally {
      setAnalyzingMenu(null)
    }
  }

  return { analyzingMenu, error, run }
}

// school.kind(NEIS SCHUL_KND_SC_NM: "초등학교"/"중학교"/"고등학교" 등) → precisionEngine.schoolType.
// 매칭 안 되면(값이 없거나 못 보던 표기) undefined를 돌려주고, precisionEngine이 계수 1(보정 없음)로
// 안전하게 폴백한다.
function mapSchoolKindToType(kind) {
  if (typeof kind !== 'string') return undefined
  if (kind.includes('초등')) return 'elementary'
  if (kind.includes('중학교')) return 'middle'
  if (kind.includes('고등') || kind.includes('고교')) return 'high'
  return undefined
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

const MEAL_KIND_OPTIONS = [
  { key: 'university', label: '대학 학식' },
  { key: 'k12', label: '급식' },
]

// 급식/대학 학식 토글도 건물 선택(cnuBuildings.js)과 같은 이유로 기기(localStorage)에 저장한다 —
// 상단 "주변 식당 ↔ 학식·급식" 토글을 오가면 CafeteriaPanel이 매번 마운트/언마운트돼(MapPage.jsx가
// view==='cafeteria'일 때만 조건부 렌더), 컴포넌트 내부 state만으로는 재진입할 때마다 프로필 기본값
// 으로 되돌아가 버린다(직접 학식으로 바꿔놔도 기억되지 않는 비대칭 — 리뷰에서 발견).
const MEAL_KIND_STORAGE_KEY = 'mapSettings:mealKind'
const VALID_MEAL_KINDS = ['k12', 'university']

function getSelectedMealKind(fallback) {
  const saved = get(MEAL_KIND_STORAGE_KEY, null)
  return VALID_MEAL_KINDS.includes(saved) ? saved : fallback
}

// 지도 탭 개편(지도·달력 모바일 개편 3안) — 예전엔 profile.school.type으로만 자동 결정되고 사용자가
// 직접 바꿀 방법이 없었다. 이제 눈에 보이는 토글로 직접 전환할 수 있다(초기값만 저장된 학교 종류를
// 따름). 시안은 이 토글을 흰 Card가 아니라 어두운 필(active #191f28)로 그린다 — SegmentedControl의
// accentColor/inactiveBg를 그 값으로 바꿔주는 것만으로 충분해 별도 마크업 없이 재사용한다.
function MealKindToggle({ mealKind, onChange }) {
  return (
    <SegmentedControl
      options={MEAL_KIND_OPTIONS}
      value={mealKind}
      onChange={onChange}
      accentColor={colors.textStrong}
      inactiveBg="transparent"
      inactiveTextColor={colors.muted}
      fontSize={12.5}
      padding="9px 0"
      style={{ background: colors.bg, borderRadius: radius.sm, padding: 4 }}
    />
  )
}

function WeekTabs({ weekDates, selectedKey, todayKey, onSelect }) {
  const options = weekDates.map((d) => {
    const key = toDateKey(d)
    return {
      key,
      ring: key === todayKey,
      label: (
        <>
          {WEEKDAY_LABEL[d.getDay()]}
          <br />
          {d.getDate()}
        </>
      ),
    }
  })
  return (
    <div style={{ background: colors.bg, borderRadius: radius.md, padding: '8px 6px' }}>
      <SegmentedControl
        options={options}
        value={selectedKey}
        onChange={onSelect}
        gap={4}
        padding={`${spacing.sm}px 0`}
        fontSize={font.size.xs}
        fontWeight={600}
        lineHeight={1.5}
        inactiveBg="transparent"
        inactiveTextColor={colors.textStrong}
      />
    </div>
  )
}

function NeisMealCard({ meal, schoolType }) {
  const navigate = useNavigate()
  const { profile } = useUser()
  const { analyzing, error, run } = useTrayAnalysis(navigate)
  const label = MEAL_TYPE_LABEL[meal.mealType] || meal.mealType

  return (
    <MealCard
      title={label}
      calories={meal.calories}
      menus={meal.menus}
      nutrients={buildNutrientRows(meal.nutrients)}
      estimated={false}
      layout="stacked"
      profileAllergies={profile?.allergies}
      onAnalyzeTray={() =>
        run(
          meal.menus.map((m) => m.name),
          { mealTypeKey: meal.mealType, mealTypeLabel: label, schoolType, officialCalories: meal.calories },
        )
      }
      trayAnalyzing={analyzing}
      trayError={error}
    />
  )
}

const MEAL_TIME_ORDER = ['breakfast', 'lunch', 'dinner']

// 지도·달력 모바일 개편 3안 — 급식은 그날 나온 조식/중식/석식을 전부 세로로 쌓아 보여주던 것에서,
// 필 3분할로 하나씩만 보여주는 방식으로 바꿨다(대학 학식은 여러 식당 슬롯을 한 화면에서 비교할
// 일이 많아 기존처럼 전부 보여주되, 급식은 하루 최대 3끼라 하나씩 보는 쪽이 화면을 덜 차지한다).
function MealTimePills({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 7, margin: `${spacing.md}px 0` }}>
      {MEAL_TIME_ORDER.map((key) => {
        const active = key === value
        return (
          <button
            key={key}
            type="button"
            className="tds-press"
            onClick={() => onChange(key)}
            style={{
              flex: 1,
              border: 'none',
              padding: '9px 0',
              borderRadius: radius.pill,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 700,
              background: active ? colors.primary : colors.bg,
              color: active ? '#fff' : colors.muted,
            }}
          >
            {MEAL_TYPE_LABEL[key]}
          </button>
        )
      })}
    </div>
  )
}

function K12MealSection({ school, weekDates, selectedKey, todayKey, onSelectDay }) {
  const schoolType = mapSchoolKindToType(school.kind)
  const [daysByKey, setDaysByKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mealTime, setMealTime] = useState('breakfast')

  // 날짜를 바꾸면 항상 조식부터 다시 본다(달력 탭이 날짜를 바꿀 때 상세 탭을 초기화하는 것과 같은
  // 규칙) — 어제 골라둔 "석식"이 오늘 날짜에도 그대로 남아있으면 자연스럽지 않다.
  useEffect(() => {
    setMealTime('breakfast')
  }, [selectedKey])

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
  const activeMeal = selectedMeals.find((m) => m.mealType === mealTime) ?? null

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
      {!loading && !error && selectedMeals.length > 0 && (
        <>
          <MealTimePills value={mealTime} onChange={setMealTime} />
          {activeMeal ? (
            <NeisMealCard meal={activeMeal} schoolType={schoolType} />
          ) : (
            <Card>
              <p style={{ margin: 0, color: colors.textSub, fontSize: font.size.sm, textAlign: 'center' }}>
                {MEAL_TYPE_LABEL[mealTime]}은 운영하지 않아요
              </p>
            </Card>
          )}
        </>
      )}
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

// 지도·달력 모바일 개편 3안 — 예전엔 5개 식당이 폭을 균등하게 나눠 갖는 세그먼트였지만, 시안은
// 가로 스크롤 칩으로 바꿨다(fill=false로 각 칩이 내용만큼만 차지 + 바깥 div가 overflow-x 담당).
function CnuBuildingSelector({ selected, onSelect }) {
  return (
    <div className="tds-no-scrollbar" style={{ overflowX: 'auto' }}>
      <SegmentedControl
        options={CNU_BUILDINGS}
        value={selected}
        onChange={onSelect}
        fill={false}
        gap={7}
        padding="8px 15px"
        radius={radius.pill}
        fontSize={12.5}
        fontWeight={600}
        inactiveBg={colors.bg}
        inactiveTextColor={colors.textSub}
        style={{ flexWrap: 'nowrap', width: 'max-content' }}
      />
    </div>
  )
}

const TRACK_OPTIONS = [
  { key: 'student', label: '학생' },
  { key: 'staff', label: '직원' },
]

function TrackToggle({ track, onChange }) {
  return (
    <SegmentedControl
      options={TRACK_OPTIONS}
      value={track}
      onChange={onChange}
      fill={false}
      radius={radius.pill}
      padding="6px 14px"
      fontSize={12}
      fontWeight={700}
      inactiveBg="transparent"
      inactiveBorder={`1px solid ${colors.border}`}
      style={{ justifyContent: 'center', margin: `0 0 ${spacing.sm}px` }}
    />
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
  const { profile } = useUser()
  const { analyzing, error, run } = useTrayAnalysis(navigate)
  const { analyzingMenu, error: menuError, run: runMenu } = useMenuAnalysis(navigate)

  return (
    <MealCard
      title={label}
      price={slot.price}
      // slot.menus는 이미 cnuWeeklyParser.js가 allergyCodes까지 계산해서 준다(주석 기반 태깅 +
      // 키워드 태깅 합집합) — 여기서 다시 추정하면 오히려 정확도가 떨어져(주석은 서버가 이미
      // 제거함) 그대로 쓴다.
      menus={slot.menus}
      estimated
      profileAllergies={profile?.allergies}
      // 메뉴별 개별 [영양 분석]도 6주차 §1-B부터 precisionEngine의 단일 항목 모드를 쓴다(4주차엔
      // Analyze.jsx로 메뉴명만 넘겨 사용자가 직접 분석을 다시 눌러야 했다).
      onAnalyzeMenu={(menuName) => runMenu(menuName, { mealTypeKey: mealKey, schoolType: 'univ' })}
      analyzingMenu={analyzingMenu}
      menuError={menuError}
      onAnalyzeTray={() =>
        run(
          slot.menus.map((m) => m.name),
          { mealTypeKey: mealKey, mealTypeLabel: label, schoolType: 'univ', officialCalories: null },
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
            <p key={key} style={{ margin: '4px 0', fontSize: font.size.xs, color: colors.deficientText, textAlign: 'center' }}>
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

  // 급식/대학 학식 중 어느 쪽을 보고 있는지 — 기기에 저장된 마지막 선택을 우선하고, 저장된 게
  // 없으면(첫 방문) 프로필의 학교 종류를 기본값으로 따른다. 사용자는 MealKindToggle로 언제든 직접
  // 전환할 수 있다(급식/학식 둘 다 프로필에 학교가 없으면 NoSchoolCard로 유도).
  const [mealKind, setMealKindState] = useState(() => getSelectedMealKind(school?.type === 'university' ? 'university' : 'k12'))

  function handleChangeMealKind(key) {
    setMealKindState(key)
    set(MEAL_KIND_STORAGE_KEY, key)
  }

  function handleSelectBuilding(key) {
    setBuilding(key)
    setSelectedCnuBuilding(key)
  }

  // 학식·급식 탭에 새로 들어올 때마다 "이번에 이미 분석 결과 화면으로 넘어갔는지" 기록을 지운다 —
  // 그래야 이전 방문에서 걸린 레이스 컨디션 가드가 이번 방문의 정상적인 분석 요청까지 막지 않는다.
  useEffect(() => {
    hasNavigatedThisVisit = false
  }, [])

  return (
    <>
      <MealKindToggle mealKind={mealKind} onChange={handleChangeMealKind} />

      {mealKind === 'k12' &&
        (school?.type === 'k12' ? (
          <K12MealSection
            school={school}
            weekDates={weekDates}
            selectedKey={selectedKey}
            todayKey={todayKey}
            onSelectDay={setSelectedKey}
          />
        ) : (
          <NoSchoolCard />
        ))}

      {mealKind === 'university' &&
        (school?.type === 'university' ? (
          <>
            <UnivMealSection
              univCode={school.code}
              weekDates={weekDates}
              selectedKey={selectedKey}
              todayKey={todayKey}
              onSelectDay={setSelectedKey}
              building={building}
              onSelectBuilding={handleSelectBuilding}
            />
            <CnuCafeteriaLocationCard selectedBuilding={building} />
          </>
        ) : (
          <NoSchoolCard />
        ))}

      <AllergyCodeSheet />
    </>
  )
}
