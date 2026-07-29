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
import { lookupFood } from './foodLookup.js'
import { classifyMenuRole } from '../../src/lib/mealPortions.js'
import { getPlausibility } from '../../src/lib/foodData.js'
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

// 식약처 DB의 foodSize(1회 제공량)는 일반 외식·가정식 기준이라 "탕"류처럼 원래 여럿이 나눠 먹는
// 음식은 학교 급식 트레이 1인분보다 훨씬 크게 잡혀 있다(실측: "연포탕" servingGram=1000g vs
// mealPortions role 표준 soup=300g — 정확도 테스트에서 이 격차가 최악 오차 사례의 공통 원인으로
// 확인됨). mealPortions role 표준 중량 대비 너무 벗어난 DB 값은 신뢰하지 않고 대체한다.
const MAX_SERVING_RATIO_TO_ROLE = 2.0
const MIN_SERVING_RATIO_TO_ROLE = 0.4

// 대체·판정 기준 중량: foodData.js(사진 분석용으로 이미 검증된 ~30개 음식의 표준 1인분)가 있으면
// 그 값을 우선한다 — mealPortions role 8종은 폭넓은 카테고리 하나로 뭉뚱그려서, "카레라이스"처럼
// 밥 한 공기가 아니라 그 자체로 한 끼인 메뉴를 '밥'류 210g으로만 잡으면 실측보다 한참 작게 나온다
// (foodData.js엔 이미 카레라이스=450g처럼 그런 메뉴별 보정이 있다). 없는 메뉴만 role 표준으로 폴백.
function resolveReferenceWeight(menuName) {
  const plausibility = getPlausibility(menuName)
  return plausibility?.referenceGrams ?? classifyMenuRole(menuName).weight
}

function resolveWeightGram(menuName, dbItem, schoolType) {
  const factor = PORTION_FACTORS[schoolType] ?? 1
  const referenceWeight = resolveReferenceWeight(menuName)
  let base = referenceWeight
  if (typeof dbItem?.servingGram === 'number' && dbItem.servingGram > 0) {
    const ratio = dbItem.servingGram / referenceWeight
    base = ratio >= MIN_SERVING_RATIO_TO_ROLE && ratio <= MAX_SERVING_RATIO_TO_ROLE ? dbItem.servingGram : referenceWeight
  }
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

// 영양소별 독립 스케일 — officialTotals에 값이 있는 항목만 그 값에 정확히 맞춘다. kcal이 없으면
// (필수 조건) 캘리브레이션 자체를 하지 않는다. referenceTotals.calories > 0은 호출부(analyzeTray)가
// 이미 확인하고 부르므로 여기서 다시 검사하지 않는다 — currentTotal.calories(항목이 전부 실패해
// 합계가 0인 경우 등)만 이 함수 자체가 지켜야 하는 조건이다.
function applyProportionalCalibration(items, referenceTotals, currentTotal) {
  if (!(currentTotal.calories > 0)) return null

  const scales = {}
  for (const key of NUTRIENT_KEYS) {
    const reference = referenceTotals[key]
    const current = currentTotal[key]
    if (typeof reference === 'number' && reference > 0 && typeof current === 'number' && current > 0) {
      scales[key] = reference / current
    }
  }

  for (const item of items) {
    for (const key of NUTRIENT_KEYS) {
      if (scales[key] && typeof item.nutrients[key] === 'number') {
        item.nutrients[key] = round2(item.nutrients[key] * scales[key])
      }
    }
  }
  return scales
}

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
    const lookup = lookupFood(name)
    const dbItem = lookup?.item ?? null
    const role = dbItem?.category ?? classifyMenuRole(name).role
    const weight = resolveWeightGram(name, dbItem, schoolType)
    return { name, dbItem, matchType: lookup?.matchType ?? null, role, weight }
  })

  // ③
  const matched = resolved.filter((r) => r.dbItem)
  const failed = resolved.filter((r) => !r.dbItem)

  const matchedItems = matched.map((r) => ({
    name: r.name,
    matched: true,
    matchType: r.matchType,
    weight: r.weight,
    nutrients: scaleFromPer100(r.dbItem.nutrientsPer100, r.weight),
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
      }))
    }
  }

  const items = [...matchedItems, ...estimatedItems]
  let total = sumNutrients(items)
  let method = 'estimated' // 화면 표기는 6주차 §1-B에서 이 값을 한국어 문구로 매핑한다
  let calibration = null
  let calibrated = false

  // ④. sanity 교차검증(officialTotals 없을 때)은 트레이 전체를 대상으로 한 KDRI 한 끼 범위라, 메뉴
  // 하나만 조회하는 단일 항목 모드(6주차 §1-B의 메뉴별 [영양 분석])에는 애초에 맞지 않는 기준이다 —
  // 반찬 하나가 300kcal 미만인 건 지극히 정상인데 이 기준을 그대로 적용하면 식약처 DB 실측값이
  // 불필요한 LLM 재추정으로 덮어써진다(리뷰에서 발견). 메뉴가 2개 이상일 때만 적용한다.
  if (calibrate) {
    if (officialTotals?.calories > 0) {
      const scales = applyProportionalCalibration(items, officialTotals, total)
      if (scales) {
        total = sumNutrients(items)
        for (const key2 of Object.keys(scales)) {
          if (typeof officialTotals[key2] === 'number') total[key2] = officialTotals[key2] // 반올림 누적오차 제거
        }
        calibration = { scales, reason: 'official' }
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

  const result = { items, total, method, confidence, calibration }
  if (useCache && calibrate) setCached(key, result)
  return result
}
