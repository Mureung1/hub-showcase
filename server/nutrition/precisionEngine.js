// 6주차 §1 — 정밀 영양 산출 엔진.
//
// 5단계 파이프라인(PRD §1.2):
//  ① 각 메뉴를 foodLookup으로 매칭
//  ② 중량 결정: DB servingGram 우선, 없으면 mealPortions role 표준 중량 — 여기에 schoolType 계수
//     (elementary 0.75/middle 0.95/high 1.05/univ 1.0)를 곱한다(초등학생은 적게, 고등학생은
//     많이 먹는다는 상식적 보정)
//  ③ 매칭된 항목은 per100 영양값 × 중량/100으로 직접 계산. 매칭 실패분만 모아 Gemini 1회 호출로
//     일괄 추정(항목별 호출 금지 — 비용·지연 모두 늘어난다)
//  ④ 캘리브레이션: officialTotals(NEIS 공식 수치)가 있으면 영양소별로 독립적인 비례 스케일을 적용해
//     합계를 공식 수치에 정확히 맞춘다(kcal은 필수, 단백질·탄수화물·지방도 값이 있으면 각자 스케일).
//     없으면(학식) KDRIs 한 끼 상식 범위를 벗어날 때만 전체 항목을 한 번 더 Gemini로 교차검증해
//     그 결과로 스케일을 보정한다
//  ⑤ 서버 메모리 캐시(TTL 7일) — 같은 메뉴 조합+schoolType+공식 수치면 항상 같은 결과(결정성)
//
// 기존 src/lib/prompts/trayAnalysis.js(5주차 §3-B, 프론트가 직접 Gemini를 호출하던 경로)의
// buildTrayAnalysisPrompt/parseTrayAnalysisResult를 그대로 재사용한다 — "이름+중량을 주면 영양
// 성분만 추정해 준다"는 계약이 이 엔진이 필요로 하는 것과 정확히 같다. 이 모듈은 매칭 "실패분"만,
// 그리고 sanity check 실패 시엔 "전체 항목"을 그 프롬프트에 태워 서버에서 직접 OpenRouter를 부른다
// (6주차 §1-B에서 화면이 이 모듈을 거치게 바뀌면 프론트는 더 이상 Gemini를 직접 호출하지 않는다).
//
// 실측 정확도(scripts/precisionEngineAccuracy.js, 캘리브레이션 off, 실제 NEIS 20샘플): 11/20
// 오차≤20%(목표 16/20 미달, 평균 오차 22.8% — 사용자 확인 후 진행). 세 차례 원인 수정(DB
// servingGram 이상치 클램프 → foodData.js 기준 중량 우선 참조 → foodDB 우선순위를 급식·기관
// 출처로 전환)으로 6/20→11/20까지 끌어올렸다. 남은 오차는 대부분 mealPortions.js의 8개 role
// 어디에도 안 걸리는 창작 메뉴명이 기본값(50g)으로 떨어지는 경우인데, 그 상수는 이미 배포된
// 5주차 "한 판 통합 분석" 기능도 같이 쓰고 있어 여기서 임의로 올리면 기존 기능이 조용히 바뀐다 —
// 그래서 더 손대지 않았다. NEIS 급식은 이 엔진의 원본 추정치가 아니라 officialTotals로
// 캘리브레이션된 합계를 쓰므로(④), 이 오차는 캘리브레이션이 없는 학식(대학) 케이스에만 직접
// 영향을 준다.
import NodeCache from 'node-cache'
import { lookupFood, pickVariantForContext } from './foodLookup.js'
import { lookupRecipe } from './recipeLookup.js'
import { recipeToPer100 } from './resolveFood.js'
import { resolveStandardServingGram } from './servingWeight.js'
import { FOOD_MATCH_SIMILARITY_THRESHOLD, foodNameSimilarity } from '../../src/lib/foodMatch.js'
import { classifyMenuRole } from '../../src/lib/mealPortions.js'
import { applyOfficialAnchors, applyProportionalCalibration } from '../../src/lib/anchoredNutrients.js'
import { correctMealMacros } from '../../src/lib/macroPlausibility.js'
import { clampToPlausibleNutrients, NUTRITION_SOURCE } from '../../src/lib/nutrition.js'
import { buildTrayAnalysisPrompt, parseTrayAnalysisResult } from '../../src/lib/prompts/trayAnalysis.js'

export const PORTION_FACTORS = {
  elementary: 0.75,
  middle: 0.95,
  high: 1.05,
  univ: 1.0,
}

const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium']

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-3-flash-preview'
const APP_TITLE = 'Mealyze'
const APP_REFERER = process.env.APP_URL || 'http://localhost:5173'
const GEMINI_TIMEOUT_MS = 20000
// 결정성 우선(가이드 §1-A 요구사항 3: "같은 입력 → 캐시로 같은 출력") — 매칭 실패분 추정이
// 호출마다 흔들리지 않도록 온도를 낮게 잡는다.
const GEMINI_TEMPERATURE = 0.1

// KDRIs(한국인 영양섭취기준) 한 끼 상식 범위 — officialTotals가 없는 학식에서만 쓰는 sanity check.
const PLAUSIBLE_MEAL_KCAL = { min: 300, max: 1400 }
const EXTREME_FAT_CALORIE_RATIO = 0.6 // 지방 유래 칼로리 비중이 이 이상이면 이상치로 본다

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7일

// 안정성 점검(Phase B)에서 일반 Map → node-cache로 교체했다 — menus/officialTotals로 키가 갈리는
// 요청은 두 번 다시 안 들어오면(예: 매번 다른 급식 메뉴 조합) 예전 Map은 그 항목을 절대 안 지웠다
// (조회 시점에만 만료를 확인했으므로). node-cache는 checkperiod마다 스스로 정리한다.
const cache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS, checkperiod: 3600 })

function round2(n) {
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

// 가이드 원문 스펙(정렬 메뉴명 해시 + schoolType)에 officialTotals 전체를 더한다 — 같은 메뉴 조합이
// 서로 다른 날짜·학교에서 다른 공식 수치로 나올 수 있어(레시피/배식량 차이), 원문 스펙대로만 키를
// 잡으면 먼저 계산된 캘리브레이션 결과가 다른 날의 요청에도 재사용돼 조용히 틀린 값을 돌려줄 여지가
// 있다. 처음엔 calories만 키에 넣었지만, 캘리브레이션(④)은 protein/carbs/fat도 각자 독립적으로
// 스케일하므로 calories만으로는 부족하다(리뷰에서 발견 — 같은 메뉴·같은 공식 칼로리인데 단백질만
// 다른 두 요청이 캐시를 잘못 공유할 수 있었다) — 6개 영양소 전부를 키에 넣는다. 공식 수치가 없는
// 학식은 그대로 메뉴+schoolType만으로 캐시된다.
function cacheKey(menuNames, schoolType, officialTotals) {
  const sortedNames = [...menuNames]
    .map((n) => n.trim())
    .sort()
    .join('|')
  const officialPart = officialTotals ? NUTRIENT_KEYS.map((k) => `${k}=${officialTotals[k] ?? ''}`).join(',') : 'none'
  return `${schoolType}::${officialPart}::${sortedNames}`
}

function getCached(key) {
  return cache.get(key) ?? null
}

function setCached(key, value) {
  cache.set(key, value)
}

export function _clearCacheForTest() {
  cache.flushAll()
}

// 중량 결정 규칙은 servingWeight.js가 단일 소스다 — 예전엔 이 파일과 resolveFood.js가 서로 다른
// 규칙을 갖고 있었고 그 차이가 "돼지갈비 70kcal"의 원인이었다(그 파일 헤더 주석에 전말이 있다).
// 이 엔진은 학식·급식 전용이라 context는 항상 'cafeteria' — DB가 가진 제공량이 그 급식의 실제
// 배식량이므로 우리 외식 정량 사전보다 먼저 믿는다.
const SERVING_CONTEXT = 'cafeteria'

// 메뉴 하나를 로컬 DB에서 찾는다: 식약처 음식DB(foodDB.json) 우선, 없으면 레시피DB(recipeDB.json).
//
// 레시피DB는 급식표에 자주 오르는 창작·조합형 메뉴명(예: "닭고기김치찌개")을 보완한다 — 이 엔진의
// 실측 정확도 리포트(위 헤더 주석)에서 "매칭 실패분이 mealPortions 기본값으로 떨어지는 것"이 남은
// 최대 오차 원인으로 지목됐는데, 그 실패분을 직접 줄이는 게 목적이다.
//
// 여기서 통합 해석 엔진(resolveFood.js)을 쓰지 않는 이유: 이 엔진은 학교급 배식량 계수
// (PORTION_FACTORS)·NEIS 공식 수치 캘리브레이션처럼 트레이 전용 로직을 중량 결정에 얽어 놓았다.
// 그 계약을 건드리지 않으면서 레시피DB만 얻는 게 목적이라, 조회 단계만 확장한다.
// **소스 순서가 아니라 매칭 신뢰도 순으로 고른다.** 예전엔 foodDB 결과가 있으면 그게 편집거리로
// 겨우 걸린 엉뚱한 음식이어도 무조건 채택했다 — 실측으로 "가자미쑥국"이 "가자미구이"(구이 vs 국물),
// "가지겉절이"가 "배추 겉절이"로 잡히는 걸 확인했고, 정작 레시피DB엔 두 메뉴 다 정확히 있었다.
// 완전일치/별칭은 어느 DB에서 나왔든 편집거리 매칭보다 항상 신뢰할 수 있다.
const MATCH_TYPE_RANK = { exact: 0, alias: 1, partial: 2, fuzzy: 3 }

// exact/alias는 매처가 이름을 정확히(또는 등록된 별칭으로) 맞춘 것이라 그대로 믿는다.
// partial/fuzzy는 재검증 대상 — 편집거리 단계는 오탈자 구제가 목적이라 **의미가 전혀 다른 음식**을
// 물어온다. 실측: "콩자반"→"간자장"(유사도 0.0), "양념갈비"→"양념두부", "치킨"→"제육(돼지고기 수육)".
// resolveFood.js는 예전부터 이 게이트를 갖고 있었는데 이 엔진에만 없어서, 한 판 통합 분석에서만
// 엉뚱한 음식의 영양값이 무검증으로 합산되고 있었다(단백질·지방이 비현실적으로 높게 나온 원인).
// 통과 못 하면 "매칭 실패"로 떨어뜨려 기존 Gemini 추정 경로가 그 항목을 맡는다.
const TRUSTED_MATCH_TYPES = new Set(['exact', 'alias'])

function isVerifiedMatch(menuName, matchType, matchedName) {
  if (TRUSTED_MATCH_TYPES.has(matchType)) return true
  return foodNameSimilarity(menuName, matchedName) >= FOOD_MATCH_SIMILARITY_THRESHOLD
}

function lookupMenuItem(menuName) {
  const foodRaw = lookupFood(menuName)
  const recipeRaw = lookupRecipe(menuName)
  const food = foodRaw && isVerifiedMatch(menuName, foodRaw.matchType, foodRaw.item.name) ? foodRaw : null
  const recipe = recipeRaw && isVerifiedMatch(menuName, recipeRaw.matchType, recipeRaw.item.name) ? recipeRaw : null

  const candidates = []
  if (food) {
    // 출처 변형(외식/급식) 선택은 foodLookup의 규칙을 그대로 쓴다 — 여기서 item을 직접 읽기 때문에
    // toFoodItemResponse를 안 거치고, 그러면 대표값(빌드 순서상 급식)에 우연히 기대게 된다.
    const item = pickVariantForContext(food.item, SERVING_CONTEXT)
    candidates.push({ rank: MATCH_TYPE_RANK[food.matchType] ?? 9, build: () => ({ ...food, item, kind: 'food' }) })
  }
  if (recipe) {
    candidates.push({
      rank: MATCH_TYPE_RANK[recipe.matchType] ?? 9,
      build: () => {
        // 레시피DB는 1인분 전체 기준이라 이 엔진이 기대하는 per-100g 모양으로 맞춰준다. 1인분 중량을
        // 모르는 항목이 대부분이라(1,141건 중 282건만 앎) recipeToPer100이 표준 중량을 가정한다.
        const per100 = recipeToPer100(recipe.item)
        if (!per100) return null
        return {
          matchType: recipe.matchType,
          kind: 'recipe',
          item: {
            name: recipe.item.name,
            // RCP_PAT2(반찬/국&찌개/…)는 mealPortions의 role 체계와 달라 그대로 쓰면 안 된다 —
            // null로 넘겨 호출부가 메뉴명 기반 classifyMenuRole로 판정하게 한다.
            category: null,
            servingGram: recipe.item.servingGram ?? null,
            nutrientsPer100: per100.nutrients,
          },
        }
      },
    })
  }

  // 동점이면 먼저 담긴 foodDB(식약처 공식 수치)가 이긴다 — sort가 안정 정렬이라 순서가 유지된다.
  for (const candidate of candidates.sort((a, b) => a.rank - b.rank)) {
    const built = candidate.build()
    if (built) return built
  }
  return null
}

// dbItem.category는 DB 레코드에 붙어 있는 역할이다. 메뉴명이 창작·조합형이라 이름 패턴으로는 역할을
// 못 읽어도(급식표에 흔하다: "새콤달콤오이무침무침" 류) 매칭된 레코드 쪽 이름으로는 읽히는 경우가
// 있어, 그걸 힌트로 넘긴다. 예전엔 이 값을 Gemini 프롬프트용 role로만 쓰고 정작 **중량 계산은 원래
// 메뉴명으로 다시 분류**해서, 같은 항목의 역할이 두 곳에서 달라질 수 있었다.
//
// ⚠️ dbItem.category는 classifyMenuRole이 이름 패턴에 못 걸려도 DEFAULT_ROLE('side')로 항상 채워져
// 있다 — categoryMatched가 true일 때만 "진짜로 안다"이므로, false면 힌트를 아예 넘기지 않는다(넘기면
// resolveStandardServingGram이 이걸 "AI가 확인한 역할"로 오인해 근거 있는 foodData/DB 중량을
// 반찬 기본값으로 덮어쓴다 — 리뷰에서 돈가스가 200g→50g로 4배 축소되는 것으로 재현됨).
function resolveWeightGram(menuName, dbItem, schoolType) {
  const factor = PORTION_FACTORS[schoolType] ?? 1
  const base = resolveStandardServingGram(menuName, dbItem?.servingGram, {
    context: SERVING_CONTEXT,
    roleHint: dbItem?.categoryMatched ? dbItem.category : null,
  })
  return Math.round(base * factor)
}

function scaleFromPer100(nutrientsPer100, weightGram) {
  const ratio = weightGram / 100
  const scaled = {}
  for (const key of NUTRIENT_KEYS) {
    const v = nutrientsPer100[key]
    scaled[key] = typeof v === 'number' ? round2(v * ratio) : null
  }
  return scaled
}

function sumNutrients(items) {
  const total = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0]))
  for (const item of items) {
    for (const key of NUTRIENT_KEYS) {
      const v = item.nutrients[key]
      if (typeof v === 'number') total[key] += v
    }
  }
  for (const key of NUTRIENT_KEYS) total[key] = round2(total[key])
  return total
}

// total.fat은 sumNutrients가 항상 숫자로 채우고, calories 범위 체크를 이미 통과했다면 calories > 0도
// 이미 보장돼 있다 — 두 값 모두 여기서 다시 typeof/0 초과를 확인할 필요가 없다(리뷰에서 발견한
// 도달 불가능한 방어 코드를 제거).
function isNutritionallyPlausible(total) {
  if (total.calories < PLAUSIBLE_MEAL_KCAL.min || total.calories > PLAUSIBLE_MEAL_KCAL.max) return false
  const fatCalorieRatio = (total.fat * 9) / total.calories
  return fatCalorieRatio <= EXTREME_FAT_CALORIE_RATIO
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// trayItems: [{name, role, weight}] — buildTrayAnalysisPrompt/parseTrayAnalysisResult(트레이 §3-B와
// 동일 계약)를 그대로 태운다. 매칭 실패분 추정(③)과 sanity 교차검증(④) 둘 다 이 함수 하나로 처리한다.
async function geminiEstimateDefault(trayItems) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured on the server')

  const prompt = buildTrayAnalysisPrompt(trayItems)
  const requestBody = { model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: GEMINI_TEMPERATURE }

  const res = await fetchWithTimeout(
    OPENROUTER_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': APP_REFERER,
        'X-Title': APP_TITLE,
      },
      body: JSON.stringify(requestBody),
    },
    GEMINI_TIMEOUT_MS,
  )
  if (!res.ok) {
    const errBody = await res.json().catch(() => null)
    throw new Error(`OpenRouter API error(${res.status}): ${errBody?.error?.message || ''}`)
  }
  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content
  const parsed = parseTrayAnalysisResult(raw)
  if (!parsed) throw new Error('Gemini 추정 응답 파싱 실패')
  return parsed // { items:[{name,weight,calories,protein,carbs,fat,sodium,fiber}], total:{...} }
}

// 영양소별 독립 스케일 — src/lib/anchoredNutrients.js의 applyProportionalCalibration(단일 소스,
// Analyze.jsx 사진 분석 경로도 이걸 공유한다)을 그대로 쓴다. officialTotals에 값이 있는 항목만
// 그 값에 정확히 맞춘다. kcal이 없으면(필수 조건) 캘리브레이션 자체를 하지 않는다.

// menus: string[], mealType: 'breakfast'|'lunch'|'dinner', schoolType: 'elementary'|'middle'|'high'|'univ',
// officialTotals: { calories, protein?, carbs?, fat? } | null(NEIS 공식 수치 — 없으면 학식).
// options.calibrate=false면 ④(캘리브레이션/sanity 교차검증)를 건너뛴 원본을 반환한다(정확도 테스트 전용).
// options.geminiEstimate로 실제 OpenRouter 호출을 교체할 수 있다(단위 테스트에서 목 주입).
export async function analyzeTray({ menus, mealType, schoolType, officialTotals = null }, options = {}) {
  const { geminiEstimate = geminiEstimateDefault, calibrate = true, useCache = true } = options

  const menuNames = (menus || []).filter(Boolean)
  const key = cacheKey(menuNames, schoolType, officialTotals)
  if (useCache && calibrate) {
    const cached = getCached(key)
    if (cached) return cached
  }

  // ① + ②
  const resolved = menuNames.map((name) => {
    const lookup = lookupMenuItem(name)
    const dbItem = lookup?.item ?? null
    const role = dbItem?.category ?? classifyMenuRole(name).role
    const weight = resolveWeightGram(name, dbItem, schoolType)
    return { name, dbItem, matchType: lookup?.matchType ?? null, kind: lookup?.kind ?? null, role, weight }
  })

  // ③
  const matched = resolved.filter((r) => r.dbItem)
  const failed = resolved.filter((r) => !r.dbItem)

  // macroPlausibility.js의 correctMealMacros는 item.source로 "근거가 얼마나 확실한지"를 판단해
  // 부족분을 근거가 약한 항목(추정)부터 깎는다. 이 필드가 없으면 모든 항목이 같은 취급(rank 0)을
  // 받아 배열 삽입 순서(=DB 실측값이 먼저 온다)로 우선순위가 정해져, 실측값이 AI 추정치보다 먼저
  // 깎이는 정반대 결과가 난다(리뷰에서 발견 — 학식·급식 통합분석에서 재현됨).
  const matchedItems = matched.map((r) => ({
    name: r.name,
    matched: true,
    matchType: r.matchType,
    weight: r.weight,
    nutrients: scaleFromPer100(r.dbItem.nutrientsPer100, r.weight),
    source: r.kind === 'recipe' ? NUTRITION_SOURCE.RECIPE_DB : NUTRITION_SOURCE.DB,
  }))

  // 매칭 실패분 추정은 이미 항목 대부분이 DB로 해결된 요청까지 통째로 실패시키면 안 된다 — Gemini
  // 호출 자체가 실패하거나(API 키 누락·타임아웃) 응답이 요청한 이름 일부를 빠뜨리면, 그 항목만
  // null 영양값으로 남기고(= sumNutrients가 0으로 취급) 나머지 DB 매칭분은 그대로 살린다. 이
  // "일부 누락" 상태는 아래 confidence 계산에 반영한다(리뷰에서 발견 — 이전엔 조용히 0으로
  // 합산되고도 confidence가 그대로 'high'가 나올 수 있었다).
  let estimatedItems = []
  let hasIncompleteEstimate = false
  if (failed.length > 0) {
    try {
      const estimate = await geminiEstimate(failed.map((r) => ({ name: r.name, role: r.role, weight: r.weight })), mealType)
      const byName = new Map(estimate.items.map((e) => [e.name, e]))
      estimatedItems = failed.map((r) => {
        const est = byName.get(r.name)
        if (!est) hasIncompleteEstimate = true
        return {
          name: r.name,
          matched: false,
          matchType: null,
          weight: r.weight,
          nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, est && typeof est[k] === 'number' ? est[k] : null])),
          source: NUTRITION_SOURCE.ESTIMATED,
        }
      })
    } catch (err) {
      console.error('precisionEngine 매칭 실패분 추정 실패(해당 항목만 결측 처리):', err.message)
      hasIncompleteEstimate = true
      estimatedItems = failed.map((r) => ({
        name: r.name,
        matched: false,
        matchType: null,
        weight: r.weight,
        nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])),
        source: NUTRITION_SOURCE.ESTIMATED,
      }))
    }
  }

  // 사진·텍스트 분석 경로는 항목마다 clampToPlausibleNutrients(Atwater 탄단지-칼로리 정합 + 음식별
  // 현실범위)를 거치는데, 트레이 경로만 이 보정을 통째로 건너뛰고 있었다 — 같은 앱에서 같은 음식이
  // 어느 화면으로 들어왔느냐에 따라 다른 수치로 나오던 원인이다. 여기서 같은 보정을 적용해 맞춘다.
  //
  // 아래 KDRI sanity 교차검증(메뉴 2개 이상일 때만)과 역할이 다르다: 저건 "트레이 전체 칼로리가
  // 한 끼로 말이 되는가"고, 이건 "이 음식 하나의 수치가 그 음식의 현실 범위 안인가"다. 그래서 단일
  // 메뉴 조회도 최소한 이 검증은 받게 된다(예전엔 아무 검증도 못 받고 나갔다).
  // 영양값이 null인 항목(추정 실패분)은 clamp 내부에서 그대로 통과한다.
  let items = [...matchedItems, ...estimatedItems].map((item) => ({
    ...item,
    nutrients: clampToPlausibleNutrients(item.nutrients, item.name, item.weight),
  }))
  let total = sumNutrients(items)
  let method = 'estimated' // 화면 표기는 6주차 §1-B에서 이 값을 한국어 문구로 매핑한다
  let macroCorrection = null
  let calibration = null
  let calibrated = false

  // ④. sanity 교차검증(officialTotals 없을 때)은 트레이 전체를 대상으로 한 KDRI 한 끼 범위라, 메뉴
  // 하나만 조회하는 단일 항목 모드(6주차 §1-B의 메뉴별 [영양 분석])에는 애초에 맞지 않는 기준이다 —
  // 반찬 하나가 300kcal 미만인 건 지극히 정상인데 이 기준을 그대로 적용하면 식약처 DB 실측값이
  // 불필요한 LLM 재추정으로 덮어써진다(리뷰에서 발견). 메뉴가 2개 이상일 때만 적용한다.
  if (calibrate) {
    if (officialTotals?.calories > 0) {
      // NEIS 공식 수치는 영양(교)사가 표준레시피로 산출해 공시한 값이라 우리 추정보다 정확하다.
      // **공식으로 받은 항목은 그대로 확정**하고, 안 받은 항목(학교마다 다르고 식이섬유·나트륨은
      // NEIS에 아예 없다)만 남은 열량에서 역산해 6영양소를 채운다. 예전엔 공식 값이 있는 항목만
      // 스케일하고 나머지는 원래 추정값을 그대로 둬서, 열량은 0.8배로 줄었는데 나트륨은 1.0배로
      // 남는 앞뒤 안 맞는 합계가 나왔다.
      const anchored = applyOfficialAnchors(total, officialTotals)
      const scales = applyProportionalCalibration(items, anchored.nutrients, total)
      if (scales) {
        total = sumNutrients(items)
        // 항목 스케일은 반올림 오차가 쌓이므로 합계는 확정/역산된 값으로 덮는다.
        for (const key2 of NUTRIENT_KEYS) {
          if (typeof anchored.nutrients[key2] === 'number') total[key2] = anchored.nutrients[key2]
        }
        calibration = { scales, reason: 'official', confirmed: anchored.confirmed, derived: anchored.derived }
        method = 'official'
        calibrated = true
      }
    } else if (menuNames.length > 1 && !isNutritionallyPlausible(total)) {
      try {
        const reviewed = await geminiEstimate(
          resolved.map((r) => ({ name: r.name, role: r.role, weight: r.weight })),
          mealType,
        )
        if (reviewed?.total?.calories > 0) {
          const scales = applyProportionalCalibration(items, reviewed.total, total)
          if (scales) {
            total = sumNutrients(items)
            calibration = { scales, reason: 'sanity_check' }
            method = 'llm_reviewed'
            calibrated = true
          }
        }
      } catch (err) {
        console.error('precisionEngine sanity 교차검증 실패(원본 유지):', err.message)
      }
    }
  }

  // 단백질·지방 현실성 보정 — **공식 수치가 없을 때만**(학식·대학). NEIS 공식 값이 있으면 그게
  // 정답지라 일반 규칙으로 덮으면 안 된다. 근거가 약한 항목부터 깎고, foodData가 검증해둔 음식
  // (치킨·삼겹살처럼 원래 치우친 것)은 건드리지 않는다 — macroPlausibility.js 주석 참고.
  if (!(officialTotals?.calories > 0)) {
    const corrected = correctMealMacros(items)
    if (Object.keys(corrected.corrections).length > 0) {
      items = corrected.items
      total = sumNutrients(items)
      macroCorrection = corrected.corrections
    }
  }

  // confidence는 입력(officialTotals 유무)이 아니라 실제로 무슨 일이 있었는지를 반영해야 한다 —
  // 캘리브레이션이 실제로 적용됐는지(calibrated), Gemini 추정이 온전했는지(hasIncompleteEstimate)를
  // 먼저 보고, 그다음에야 DB 매칭 비율을 본다(리뷰에서 발견 — 이전엔 officialTotals가 있다는
  // 이유만으로 캘리브레이션이 끝내 안 걸려도 'high'였다).
  const matchRatio = resolved.length > 0 ? matched.length / resolved.length : 1
  const confidence = calibrated
    ? 'high'
    : hasIncompleteEstimate
      ? 'low'
      : matchRatio === 1
        ? 'high'
        : matchRatio >= 0.5
          ? 'medium'
          : 'low'

  const result = { items, total, method, confidence, calibration, macroCorrection }
  if (useCache && calibrate) setCached(key, result)
  return result
}
