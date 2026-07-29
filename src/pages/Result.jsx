import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AchievementRing from '../components/AchievementRing.jsx'
import AdCard from '../components/AdCard.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import DeficiencyBar from '../components/DeficiencyBar.jsx'
import MenuRecommendation from '../components/MenuRecommendation.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useVisibleNutrients } from '../lib/cardSettings.js'
import { displayProductName, nutrientLabel, productsForNutrient } from '../data/coupangProducts.js'
import { geminiCompleteWithRetry, parseJsonLoose } from '../lib/gemini.js'
import { GEMINI_TEMPERATURE, RECOMMENDATION_SCHEMA } from '../lib/geminiSchemas.js'
import { ALLERGY_OPTIONS, CONDITION_OPTIONS, labelizeTags } from '../lib/healthProfile.js'
import { clampExpectedForItems, enrichExpectedFromDB } from '../lib/menuNutrition.js'
import { buildDeficiencyRows, calcAchievementPercent, isSodiumExceeded, NUTRIENT_LABELS } from '../lib/nutrition.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// allergyLabels/conditionLabels가 비고 나트륨 정상이면(프로필 미입력 등) 기존 프롬프트와 완전히
// 동일하게 나간다 — 제약 문단 자체가 붙지 않는다.
function buildRecommendationPrompt(deficientRows, allergyLabels = [], conditionLabels = [], { sodiumExceeded = false } = {}) {
  const nutrientText = deficientRows.map((row) => `${row.label}(${row.key}) 약 ${row.deficiency}${row.unit} 부족`).join(', ')
  const deficientKeys = deficientRows.map((row) => `"${row.key}"`).join(', ')

  const constraints = []
  if (allergyLabels.length > 0) {
    constraints.push(`- 다음 알레르기 성분을 포함한 메뉴는 절대 추천하지 마라: ${allergyLabels.join(', ')}.`)
  }
  if (conditionLabels.length > 0) {
    constraints.push(`- 다음 기저질환에 부적합하거나 악화시킬 수 있는 메뉴(자극적/고나트륨/고당 등)는 피하라: ${conditionLabels.join(', ')}.`)
  }
  if (sodiumExceeded) {
    // 나트륨은 부족 영양소가 아니라 역방향(한도 초과) 제약으로만 반영한다(nutrition.js 분류 참고).
    constraints.push('- 사용자는 오늘 나트륨 섭취가 이미 권장 상한을 초과했다. 찌개·라면·국밥처럼 나트륨이 매우 높은 메뉴는 피하고, 가능한 한 나트륨이 낮은 메뉴를 골라라.')
  }
  const constraintBlock = constraints.length > 0 ? `\n\n반드시 지킬 제약:\n${constraints.join('\n')}` : ''

  return `대학생이 밖에서 사먹기 쉬운 저녁 메뉴 2~3개를 추천해줘.
오늘 부족한 영양소: ${nutrientText}.

조건:
1. 각 메뉴는 부족한 영양소를 실제로 잘 채울 수 있는 메뉴여야 하고, 어떤 부족 영양소를 채우는지 한 줄 이유(reason)를 포함해라.
2. 각 메뉴마다, 그 메뉴의 "한국 표준 1인분"을 먹었을 때 예상되는 주요 영양 섭취량을 expected 객체로 함께 계산해라.
   - 수치는 식품의약품안전처 한국식품영양성분 데이터베이스(국가표준식품성분표) 수준의 표준값 기준으로 계산해라. (URL 조회가 아니라 네가 아는 그 DB 수준의 기준값이라는 의미다.)
   - 과대추정 금지: 그 메뉴의 통상적인 1인분 현실 범위를 벗어나는 값이 나오면 스스로 재검토하고 보수적인 값으로 고쳐라.
   - expected에는 부족한 영양소 키(${deficientKeys})를 반드시 숫자로 포함하고, 나머지 키도 아는 값이면 숫자로, 확신이 없으면 null로 채워라.
   - 사용할 수 있는 키와 단위: calories(kcal), protein(g), carbs(g), fat(g), fiber(g), sodium(mg).${constraintBlock}

설명이나 마크다운 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "recommendations": [
    { "name": "메뉴명", "reason": "이 메뉴가 부족 영양소를 채우는 한 줄 이유", "expected": { "protein": 0, "fiber": 0 } }
  ]
}`
}

function isMenuRecommendationList(value) {
  return (
    Boolean(value) &&
    Array.isArray(value.recommendations) &&
    value.recommendations.length > 0 &&
    value.recommendations.every((r) => r && typeof r.name === 'string' && typeof r.reason === 'string')
  )
}

export default function Result() {
  useDocumentTitle('영양 진단')
  const {
    profile,
    todayMeals,
    todayMealsTotal,
    todayMealsLoading,
    todayMealsError,
    refetchTodayMeals,
    effectiveRecommended,
    isTempRecommended,
  } = useUser()
  const recommended = effectiveRecommended
  // 오늘 저장한 모든 끼니의 누적 합계(식단 탭과 동일한 소스) — 마지막 한 끼가 아니라 하루 전체 기준으로
  // 달성률을 계산한다. sumMealRecordsNutrients([])는 0으로 채운 객체를 반환해 항상 truthy이므로,
  // "기록 없음"은 이 값의 존재 여부가 아니라 todayMeals.length로 판정해야 한다.
  const todayTotal = todayMealsTotal
  const visible = useVisibleNutrients()

  const allergyLabels = useMemo(
    () => labelizeTags(profile?.allergies, ALLERGY_OPTIONS),
    [profile?.allergies],
  )
  const conditionLabels = useMemo(
    () => labelizeTags(profile?.conditions, CONDITION_OPTIONS),
    [profile?.conditions],
  )

  const rows = useMemo(() => {
    if (!recommended || !todayTotal) return []
    return NUTRIENT_LABELS.map(({ key, label, unit }) => ({
      key,
      label,
      unit,
      recommended: recommended[key],
      actual: todayTotal[key],
      deficiency: recommended[key] - todayTotal[key],
    }))
  }, [recommended, todayTotal])

  // 부족 영양소 상위 3개 — 4대 목표 영양소(탄수·단백·지방·식이섬유)만, 충족률 낮은 순
  // (nutrition.js buildDeficiencyRows — MapPage의 식당 추천과 같은 판정을 공유한다).
  const top3Rows = useMemo(() => buildDeficiencyRows(recommended, todayTotal), [recommended, todayTotal])
  const top3DeficientKeys = useMemo(() => top3Rows.map((row) => row.key), [top3Rows])
  // 나트륨 상한 초과 여부 — 보충 메뉴 추천에서 "짠 메뉴 피하기" 제약으로만 쓴다.
  const sodiumExceeded = useMemo(() => isSodiumExceeded(recommended, todayTotal), [recommended, todayTotal])

  // "부족한 영양소" 렌더링에만 쓴다 — top3Rows(AI 보충 메뉴 추천 프롬프트 입력값)는 표시 설정과
  // 무관하게 항상 rows(전체 6개) 기준으로 계산돼야 하므로 여기서 걸러낸 값을 쓰지 않는다.
  const visibleRows = useMemo(() => rows.filter((row) => visible[row.key]), [rows, visible])

  const achievementPercent = useMemo(
    () => calcAchievementPercent(recommended, todayTotal),
    [recommended, todayTotal],
  )

  const [recommendations, setRecommendations] = useState(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState('')
  const triedRef = useRef(false)

  async function fetchRecommendations() {
    // 안정성 점검(Phase B) — "다시 시도" 버튼에 disabled 가드가 없어 연타하면 유료 Gemini 호출이
    // 중복으로 나가고(공유 리미터 낭비), 먼저 끝난 응답이 나중 응답에 덮어써지는 경쟁이 생겼다.
    if (recLoading) return
    setRecLoading(true)
    setRecError('')
    try {
      const prompt = buildRecommendationPrompt(top3Rows, allergyLabels, conditionLabels, { sodiumExceeded })
      const text = await geminiCompleteWithRetry({
        prompt,
        schema: RECOMMENDATION_SCHEMA,
        schemaName: 'menu_recommendation',
        temperature: GEMINI_TEMPERATURE.recommendation,
      })
      const parsed = parseJsonLoose(text)

      if (!isMenuRecommendationList(parsed)) {
        throw new Error('추천 결과 형식이 올바르지 않습니다.')
      }

      // 식당 추천(MapPage)과 동일한 보강: AI 추정 expected를 현실 범위로 보정한 뒤
      // 식약처 DB 실측값으로 대체한다(실패 시 보정된 AI 추정 유지 — menuNutrition.js).
      // 이름·이유는 이미 완성됐으므로 즉시 표시하고, DB 보강은 끝나는 대로 수치만 덧입힌다 —
      // 완성된 추천을 보강 몇 초 때문에 스켈레톤 뒤에 숨겨둘 이유가 없다.
      const getMenu = (rec) => rec.name
      const clamped = clampExpectedForItems(parsed.recommendations, getMenu)
      setRecommendations(clamped)
      enrichExpectedFromDB(clamped, getMenu)
        .then(setRecommendations)
        .catch(() => {}) // 보강 실패는 무시 — 보정된 AI 추정이 이미 화면에 있다
    } catch (err) {
      console.error('menu recommendation failed:', err)
      setRecError('메뉴 추천을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setRecLoading(false)
    }
  }

  useEffect(() => {
    // todayMealsLoading 중엔 todayTotal이 아직 실제 값이 아닐 수 있어(초기값 []→0) 여기서 발사하면
    // 전부 0인 합계로 잘못된 추천을 만들고 공유 리미터의 Gemini 호출을 낭비한다.
    if (!todayMealsLoading && top3Rows.length > 0 && !triedRef.current) {
      triedRef.current = true
      fetchRecommendations()
    }
  }, [top3Rows, todayMealsLoading])

  if (!recommended) {
    // 게스트든 로그인 계정이든 여기 도달하는 건 "성별도 프로필도 아직 고르지 않음" 하나의 경우뿐이다
    // — 성별 선택 카드가 있는 홈(Analyze)으로 안내한다.
    return (
      <div style={styles.page}>
        <ScreenHeader title="오늘의 영양 진단" />
        <Card style={{ textAlign: 'center' }}>
          <p>성별을 선택하면 임시 기준으로 오늘의 진단을 볼 수 있어요.</p>
          <Link
            to="/analyze"
            className="tds-press"
            style={{ ...styles.buttonPrimary, display: 'block', marginTop: spacing.lg, textDecoration: 'none' }}
          >
            홈에서 성별 선택하기
          </Link>
        </Card>
      </div>
    )
  }

  if (todayMealsLoading) {
    return (
      <div style={styles.page}>
        <ScreenHeader title="오늘의 영양 진단" />
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Skeleton height={160} width={160} style={{ borderRadius: '50%' }} />
          <Skeleton height={14} width="40%" style={{ marginTop: spacing.sm }} />
        </Card>
      </div>
    )
  }

  if (todayMealsError) {
    return (
      <div style={styles.page}>
        <ScreenHeader title="오늘의 영양 진단" />
        <Card style={{ textAlign: 'center' }}>
          <p style={{ ...styles.errorText, margin: `0 0 ${spacing.md}px` }}>{todayMealsError}</p>
          <AppButton variant="secondary" onClick={refetchTodayMeals}>
            다시 시도
          </AppButton>
        </Card>
      </div>
    )
  }

  if (todayMeals.length === 0) {
    return (
      <div style={styles.page}>
        <ScreenHeader title="오늘의 영양 진단" />
        <Card style={{ textAlign: 'center' }}>
          <p>오늘 분석한 식사 기록이 없습니다. 먼저 사진을 분석해주세요.</p>
          <Link
            to="/analyze"
            className="tds-press"
            style={{ ...styles.buttonPrimary, display: 'block', marginTop: spacing.lg, textDecoration: 'none' }}
          >
            사진 분석하러 가기
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title="오늘의 영양 진단" subtitle="하루 목표 달성률을 확인해보세요" />

      {isTempRecommended && (
        <Card style={{ background: colors.deficientSurface, boxShadow: 'none' }}>
          <p style={{ margin: 0, color: colors.textStrong, fontSize: font.size.sm }}>
            임시 기준으로 계산된 결과예요.{' '}
            <Link to="/profile" style={{ color: colors.primary, fontWeight: 700 }}>
              프로필을 입력하면
            </Link>{' '}
            더 정확해져요.
          </p>
        </Card>
      )}

      <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ margin: `${spacing.sm}px 0` }}>
          <AchievementRing percent={achievementPercent} />
        </div>
        <p style={{ color: colors.muted, fontSize: font.size.sm }}>하루 목표 달성률</p>
      </Card>

      <SectionTitle>부족한 영양소</SectionTitle>
      {visibleRows.map(({ key, ...row }) => (
        <DeficiencyBar key={key} {...row} highlighted={top3DeficientKeys.includes(key)} />
      ))}

      {(() => {
        // 가장 부족한 영양소에 매핑된 쿠팡 파트너스 상품 1개. 상품 데이터는 src/data/coupangProducts.js
        // 한 곳에만 있고(식단 탭 배너와 동일한 소스), 매핑된 상품이 없는 영양소면 카드를 띄우지 않는다.
        const topKey = top3Rows[0]?.key
        const product = topKey ? productsForNutrient(topKey)[0] : null
        if (!product) return null
        return (
          <AdCard
            adId={product.id}
            title={displayProductName(product)}
            note={
              Number.isFinite(product.price)
                ? `${nutrientLabel(product.nutrient)} · ${Number(product.price).toLocaleString('ko-KR')}원`
                : `${nutrientLabel(product.nutrient)} 보충에 도움이 되는 상품이에요`
            }
            link={product.partnersUrl}
          />
        )
      })()}

      <SectionTitle>오늘의 보충 추천 메뉴</SectionTitle>
      {/* 4대 목표 영양소를 전부 충족한 날 — 추천할 부족 영양소가 없으므로 추천 대신 축하 안내를 보여준다. */}
      {top3Rows.length === 0 && (
        <Card style={{ background: colors.primarySurface, boxShadow: 'none' }}>
          <p style={{ margin: 0, color: colors.textStrong, fontWeight: 600 }}>
            오늘은 영양 균형이 좋아요 👍
          </p>
          <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.textSub, fontSize: font.size.sm }}>
            탄수화물·단백질·지방·식이섬유를 모두 충분히 채웠어요. 다음 끼니는 부담 없이 즐기세요.
          </p>
        </Card>
      )}
      {recLoading && (
        <>
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton height={18} width="40%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height={14} width="85%" />
            </Card>
          ))}
        </>
      )}
      {recError && (
        <Card>
          <p style={{ ...styles.errorText, margin: 0 }}>{recError}</p>
          <AppButton
            variant="secondary"
            onClick={fetchRecommendations}
            disabled={recLoading}
            style={{ marginTop: spacing.sm }}
          >
            다시 시도
          </AppButton>
        </Card>
      )}
      {!recLoading && !recError && <MenuRecommendation recommendations={recommendations} />}

      <Link
        to="/analyze"
        className="tds-press"
        style={{ ...styles.linkButton, display: 'block', textAlign: 'center', marginTop: spacing.xl }}
      >
        다른 음식 다시 분석하기
      </Link>
    </div>
  )
}
