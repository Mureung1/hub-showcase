import { useState } from 'react'
import { Link } from 'react-router-dom'
import PhotoUpload from '../components/PhotoUpload.jsx'
import MealTypePicker from '../components/MealTypePicker.jsx'
import NutritionCard from '../components/NutritionCard.jsx'
import Spinner from '../components/Spinner.jsx'
import Skeleton from '../components/Skeleton.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { useUser } from '../context/UserContext.jsx'
import { pickBestFoodMatch, searchFoodDB } from '../lib/fooddb.js'
import { geminiComplete, parseJsonLoose } from '../lib/gemini.js'
import { getRecommendedMealType } from '../lib/mealType.js'
import { sumNutrients } from '../lib/mealStore.js'
import {
  calcAchievementPercent,
  clampEstimatedGrams,
  clampToPlausibleNutrients,
  fillMissingNutrients,
  isMealAnalysis,
  isNutrientSet,
  NUTRITION_SOURCE,
  resolveConsumedGrams,
  scaleNutrients,
} from '../lib/nutrition.js'
import { saveRecord, toDateKey } from '../lib/records.js'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// AI에게는 "무슨 음식인지"와 "양"만 판단시킨다. 실제 영양수치는 이후 식약처 DB 조회로 채우고,
// estimatedNutrients는 DB 매칭이 실패했을 때만 쓰는 참고용 대체값이다.
const IDENTIFICATION_SYSTEM_PROMPT = `당신은 한국 음식 인식·영양 분석 전문가다. 사진 속 음식을 정확히 식별하고, 식약처 식품영양성분DB 검색에 쓸 표준 식품명과 사용자에게 보여줄 이름, 섭취량을 판단한다. DB 매칭이 실패할 경우를 대비해 참고용 영양성분 추정치도 함께 낸다. 다음 절차를 반드시 내부적으로 따른다(최종 출력은 JSON만):

1. 음식 식별: 사진 속 음식이 정확히 무엇인지, 단일 메뉴인지 여러 반찬이 있는 상차림인지 판단한다. 여러 개면 각각 분리한다. 사용자가 준 메뉴명/브랜드 힌트는 강하게 참고하되, 사진과 명백히 모순되면 사진을 우선한다.
2. DB 검색명 결정: 각 음식마다 식약처 식품영양성분DB에서 검색할 표준 일반 명칭(dbSearchName)을 정한다. 이 DB는 이름이 정확히 일치해야만 검색되고 부분(포함) 일치는 지원하지 않으니, 메뉴판 표현이 아니라 그 DB에 실제로 등록돼 있을 법한 짧고 표준적인 한식명을 써야 한다(예: "짜장면", "비빔밥", "김치찌개" 같은 대표 표준명). 브랜드명·강도 수식어(맵게/곱빼기 등)는 반드시 뺀다(예: "죠스떡볶이 매운맛" → "떡볶이"). 조리도구/재료가 붙은 변형 메뉴(예: "돌솥비빔밥", "참치김치찌개")는 dbSearchName엔 그 변형명을 그대로 쓰되, fallbackSearchName에는 반드시 그 상위 표준 카테고리명(각각 "비빔밥", "김치찌개")을 넣어 dbSearchName 검색이 실패해도 기본 음식으로는 매칭되게 한다. fallbackSearchName은 항상 dbSearchName보다 더 일반적인 이름이어야 한다.
3. 표시 이름: 사용자에게 보여줄 이름(displayName)을 정한다. 브랜드/프랜차이즈가 식별되면 "음식명 (브랜드명)" 형식으로 괄호에 브랜드를 표기하고, 아니면 음식명만 쓴다.
4. 양 추정: 사진에 보이는 양을 그램(g) 단위로 추정한다(estimatedGrams). 아래 한식 표준 1인분 기준량(그릇에 담긴 상태 기준, 국물 포함)을 기준점으로 그릇 크기·음식 높이를 보고 보수적으로 추정하고, 이 범위를 크게 벗어나지 않게 한다: 짜장면/자장면 약 650g, 비빔밥류 약 500g, 찌개류(김치찌개 등) 1인분 약 400g, 라면(국물 포함) 약 500g, 공기밥 약 210g. 목록에 없는 음식은 일반적인 한국 1인분 상식 범위로 추정한다. 비현실적으로 크거나 작은 값(예: 떡볶이 1000g)은 현실적인 1인분 범위로 스스로 보정한다.
5. 참고용 영양성분 추정(estimatedNutrients): DB 매칭이 실패하거나 일부 항목이 없을 때만 쓰이는 참고값이다. calories, protein, carbs, fat, fiber, sodium 여섯 키를 반드시 모두 포함하고, 어떤 값도 누락하거나 0으로 비워두지 말고 한국 표준 1인분 기준값으로 채운다. 나트륨과 식이섬유도 절대 생략하지 않는다.
6. 검증(sanity check): 각 값이 한국 표준 1인분의 현실 범위를 벗어나면 재조정한다. 특히 단백질과 지방을 과대추정하지 않는다. 참고 기준(1인분, 대략):
   - 짜장면/자장면: 단백질 12~16g, 탄수 110~130g, 지방 12~18g, 열량 650~800kcal, 나트륨 1200~1800mg
   - 돌솥비빔밥/비빔밥: 단백질 12~16g, 지방 8~14g, 탄수 90~110g, 열량 550~700kcal
   - 김치찌개: 단백질 12~18g, 나트륨 1500~2000mg
   - 김밥 1줄: 단백질 6~9g, 열량 320~450kcal
   - 삼겹살 1인분(150g): 단백질 25~30g, 지방 40~50g
   - 라면 1개: 단백질 10~12g, 나트륨 1500~1900mg
   이 예시는 감각을 잡기 위한 참고일 뿐, 실제 사진의 양에 맞춰 조정한다.

주의: 특정 웹사이트를 실시간 조회하는 게 아니라, 위 기준 데이터베이스 '수준'의 표준값에 맞춰 추정하라는 의미다. 계산 근거나 설명은 출력하지 말고 JSON만 반환한다.`

function buildIdentificationPrompt(menuName, brand) {
  const hints = []
  if (menuName) hints.push(`메뉴명 힌트: ${menuName}`)
  if (brand) hints.push(`브랜드 힌트: ${brand}`)
  const hintText = hints.length ? `\n${hints.join('\n')}` : ''

  return `이 음식 사진을 분석해서 각 음식을 식별해줘.${hintText}

설명이나 마크다운, 계산 근거 없이, 아래 스키마와 정확히 일치하는 JSON만 반환해:
{
  "items": [
    {
      "dbSearchName": "식약처 식품영양성분DB 검색용 표준 식품명",
      "fallbackSearchName": "dbSearchName 검색 실패 시 쓸 더 일반적인 대체 검색명",
      "displayName": "사용자에게 보여줄 이름(브랜드가 있으면 \\"음식명 (브랜드명)\\" 형식)",
      "estimatedGrams": 0,
      "estimatedNutrients": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sodium": 0 }
    }
  ]
}`
}

function isIdentificationResult(value) {
  return (
    Boolean(value) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every(
      (item) =>
        item &&
        typeof item.dbSearchName === 'string' &&
        typeof item.displayName === 'string' &&
        typeof item.estimatedGrams === 'number' &&
        isNutrientSet(item.estimatedNutrients),
    )
  )
}

// displayName이 "음식명 (브랜드명)" 형식이면 괄호 안 브랜드를 뽑아낸다(출처 배지 판정용).
function extractBrand(displayName) {
  const match = /\(([^)]+)\)\s*$/.exec(displayName || '')
  return match ? match[1] : null
}

// 식약처 DB는 이름이 정확히 일치해야만 검색되고(부분/포함 일치 없음) 접두 수식어의 띄어쓰기까지 등록된
// 표기와 달라도 실패한다(예: "돌솥비빔밥"은 0건, DB에는 "돌솥 비빔밥"으로 등록). dbSearchName이 2글자
// 수식어+기본 음식명 형태의 복합어(예: "돌솥비빔밥", "참치김치찌개")인데 그 자체로 매칭되지 않으면, 앞
// 2글자를 뗀 기본 음식명("비빔밥", "김치찌개")으로도 한 번 더 시도해 AI의 fallbackSearchName이 충분히
// 일반적이지 않은 경우까지 보완한다.
function stripLeadingModifier(term) {
  return typeof term === 'string' && term.length >= 5 ? term.slice(2) : null
}

// DB 검색 우선순위: ① dbSearchName-음식 ② dbSearchName-가공식품 ③ dbSearchName 수식어 제거-음식
// ④ fallbackSearchName-음식 ⑤ fallbackSearchName-가공식품. 가공식품 DB는 편의점/포장/프랜차이즈 제품처럼
// "음식"(조리식) DB에 없는 제품을 보완하는 폴백이다.
async function findFoodMatch(idItem) {
  const attempts = [
    { term: idItem.dbSearchName, dbSource: 'food' },
    { term: idItem.dbSearchName, dbSource: 'process' },
    { term: stripLeadingModifier(idItem.dbSearchName), dbSource: 'food' },
    { term: idItem.fallbackSearchName, dbSource: 'food' },
    { term: idItem.fallbackSearchName, dbSource: 'process' },
  ]

  for (const attempt of attempts) {
    if (!attempt.term) continue
    try {
      const results = await searchFoodDB(attempt.term, attempt.dbSource)
      const match = pickBestFoodMatch(results, attempt.term, { averageExactMatches: attempt.dbSource === 'food' })
      if (match) return { match, dbSource: attempt.dbSource }
    } catch (err) {
      console.error(`fooddb search failed (${attempt.dbSource}, ${attempt.term}):`, err)
      // 식약처 서버 연결 자체가 안 되는 상황(배포 리전 등)이면 나머지 소스/재검색어도 똑같이
      // 실패할 뿐이니 즉시 포기하고 AI 추정치 폴백으로 넘어간다. "결과 없음"은 이 코드가 아니므로
      // 계속 다음 시도로 진행한다.
      if (err.code === 'FOODDB_CONNECTION_FAILED') break
    }
  }

  return null
}

// AI가 식별한 음식 하나를 식약처 DB(음식→가공식품 순)로 조회해 실제 영양수치를 채운다.
// 전부 매칭에 실패하면 AI의 참고용 추정치(estimatedNutrients)를 그대로 쓴다.
async function resolveFoodItem(idItem) {
  const name = idItem.displayName || idItem.dbSearchName
  const found = await findFoodMatch(idItem)

  if (found) {
    const { match, dbSource } = found
    const baseValue = match.baseQuantity?.value > 0 ? match.baseQuantity.value : 100
    const grams = resolveConsumedGrams(match, idItem.estimatedGrams, idItem.dbSearchName)
    const scaled = scaleNutrients(match.nutrients, baseValue, grams)
    const source = dbSource === 'process' ? NUTRITION_SOURCE.DB_PROCESS : NUTRITION_SOURCE.DB
    const nutrients = clampToPlausibleNutrients(fillMissingNutrients(scaled, idItem.estimatedNutrients), idItem.dbSearchName, grams)
    return { name, nutrients, source }
  }

  const brand = extractBrand(name)
  const source = brand ? NUTRITION_SOURCE.OFFICIAL : NUTRITION_SOURCE.ESTIMATED
  const grams = clampEstimatedGrams(idItem.estimatedGrams, idItem.dbSearchName)
  const nutrients = clampToPlausibleNutrients(fillMissingNutrients({}, idItem.estimatedNutrients), idItem.dbSearchName, grams)
  return { name, nutrients, source }
}

function AnalyzingSkeleton() {
  return (
    <div style={styles.card}>
      <Skeleton height={96} radius={radius.sm} style={{ marginBottom: spacing.lg }} />
      <Skeleton height={20} width="55%" style={{ marginBottom: spacing.lg }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={14} style={{ marginBottom: spacing.sm }} />
      ))}
    </div>
  )
}

export default function Analyze() {
  const { user, setTodayMeal, addTodayMeal } = useUser()
  const [photo, setPhoto] = useState(null) // { base64, mimeType, dataUrl, width, height }
  const [menuName, setMenuName] = useState('')
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 분석은 끝났지만 아직 저장 전인 결과(식사 시간대 확정 대기). 저장하면 lastAnalysis로 넘어간다.
  const [pendingAnalysis, setPendingAnalysis] = useState(null)
  const [mealType, setMealType] = useState(() => getRecommendedMealType())
  // 방금 이 화면에서 저장까지 마친 결과(로컬 상태). 홈을 떠나면 사라져서, 다시 돌아와도 카드가 재표시되지 않는다.
  const [lastAnalysis, setLastAnalysis] = useState(null)

  async function handleAnalyze() {
    setError('')
    setPendingAnalysis(null)

    if (!photo) {
      setError('사진을 먼저 업로드해주세요.')
      return
    }

    setLoading(true)
    try {
      const prompt = buildIdentificationPrompt(menuName, brand)
      const text = await geminiComplete({
        prompt,
        system: IDENTIFICATION_SYSTEM_PROMPT,
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
      })
      const identified = parseJsonLoose(text)

      if (!isIdentificationResult(identified)) {
        throw new Error('분석 결과 형식이 올바르지 않습니다.')
      }

      const items = await Promise.all(identified.items.map(resolveFoodItem))
      const total = sumNutrients(items)
      const parsed = { items, total }

      if (!isMealAnalysis(parsed)) {
        throw new Error('영양 계산 결과 형식이 올바르지 않습니다.')
      }

      setPendingAnalysis(parsed)
    } catch (err) {
      console.error('meal analysis failed:', err)
      setError('분석에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirmSave() {
    if (!pendingAnalysis) return

    // 이번 식사의 모든 음식에 같은 시간대(mealType)를 붙인다. 합계(total)는 그대로 두어 mealType이 영향을 주지 않는다.
    const items = pendingAnalysis.items.map((item) => ({ ...item, mealType }))
    const parsed = { items, total: pendingAnalysis.total }

    setTodayMeal(parsed)

    // 이번 분석에서 나온 음식 전체를 하나의 끼니 기록으로 오늘 식단 목록(mealStore)에 추가
    // (음식이 1개면 단일 메뉴, 2개 이상이면 한 끼 세트로 식단 탭에서 구분해 보여준다)
    addTodayMeal(parsed.items, mealType)

    if (user) {
      const achievementPercent = calcAchievementPercent(user.recommended, parsed.total)
      saveRecord(user.id, toDateKey(new Date()), {
        items: parsed.items,
        total: parsed.total,
        achievementPercent,
        savedAt: new Date().toISOString(),
      })
    }

    setLastAnalysis(parsed)
    setPendingAnalysis(null)
  }

  return (
    <div style={styles.page}>
      <ScreenHeader title={`안녕하세요, ${user?.id ?? ''}님 👋`} subtitle="오늘 점심을 찍어볼까요?" />

      <Card style={pendingAnalysis ? { background: colors.infoSurface, boxShadow: 'none' } : undefined}>
        <PhotoUpload onChange={setPhoto} />

        <div style={{ marginTop: spacing.lg }}>
          <TextField label="메뉴 이름 (선택)" id="menuName" value={menuName} onChange={(e) => setMenuName(e.target.value)} />
          <TextField label="브랜드 (선택)" id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
          <AppButton
            variant={pendingAnalysis ? 'secondary' : 'primary'}
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading && <Spinner size={16} />}
            {loading
              ? '분석 중...'
              : pendingAnalysis
                ? '다른 사진으로 다시 분석'
                : error && photo
                  ? '다시 시도'
                  : '촬영 후 분석하기'}
          </AppButton>
          {!loading && pendingAnalysis && (
            <span style={{ color: colors.info, fontSize: font.size.sm, fontWeight: 700 }}>분석 완료</span>
          )}
        </div>

        {error && <p style={styles.errorText}>{error}</p>}
      </Card>

      <Card>
        <h3 style={{ fontSize: font.size.md, fontWeight: 600, margin: `0 0 ${spacing.xs}px`, color: colors.textStrong }}>
          언제 드셨어요?
        </h3>
        <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSub, fontSize: font.size.sm }}>
          시간대를 선택하면 식단 기록에 함께 표시돼요.
        </p>
        <MealTypePicker value={mealType} recommended={getRecommendedMealType()} onChange={setMealType} />
      </Card>

      {!loading && pendingAnalysis && (
        <AppButton onClick={handleConfirmSave} style={{ marginTop: spacing.md }}>
          저장하기
        </AppButton>
      )}

      {loading && <AnalyzingSkeleton />}

      {!loading && pendingAnalysis && <NutritionCard analysis={pendingAnalysis} />}

      {!loading && !pendingAnalysis && lastAnalysis && (
        <>
          <NutritionCard analysis={lastAnalysis} />
          <Link
            to="/result"
            className="tds-press"
            style={{ ...styles.linkButton, display: 'block', textAlign: 'center', marginTop: spacing.md }}
          >
            오늘의 영양 진단 보기
          </Link>
        </>
      )}
    </div>
  )
}
