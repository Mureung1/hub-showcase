// 통합 해석 엔진 — "AI가 식별한 음식명" → "실제 영양수치".
//
// 예전엔 같은 일을 하는 구현이 서로 다르게 세 벌 있었다:
//   ① src/pages/Analyze.jsx findFoodMatch  — 원격 7단계 **순차** 조회(최악 ~75초) + 로컬/레시피 폴백
//   ② server/nutrition/precisionEngine.js  — 로컬 foodDB.json**만**(레시피DB·원격 못 봄)
//   ③ src/lib/menuNutrition.js doLookupMenu — 원격 음식DB**만**(로컬·레시피 못 봄)
// 그래서 레시피DB가 8개 분석 경로 중 2개에만 붙었고, 한 곳을 고쳐도 나머지에 반영되지 않았다.
// 이 모듈이 그 셋을 대체한다.
//
// 설계 원칙 세 가지:
//
//  1. **로컬 먼저, 원격은 놓친 것만.** 로컬 foodDB.json(11,347건)은 원격 음식DB와 같은 API를 떠온
//     스냅샷이라 원격 조회 대부분과 중복이다. 게다가 조회가 0.3ms라 사실상 공짜다. 그래서 로컬을
//     ①번으로 올리고, 로컬이 못 잡은 것만 원격에 묻는다 — 일반적인 한식은 원격 왕복이 0회가 된다.
//  2. **원격은 순차가 아니라 병렬 1라운드.** 예전 7단계 순차 캐스케이드가 지연의 주범이었다.
//  3. **낮은 신뢰도 매칭은 반드시 재검증.** 로컬 매처의 편집거리 단계는 오탈자 구제가 목적이라
//     의미가 다른 음식을 물어온다(실측: "치킨"→"제육(돼지고기 수육)", "파스타"→"토스트(식빵)").
//     예전 코드는 이걸 유사도 검증 없이 그대로 채택했다. 여기서는 exact/alias만 즉시 신뢰하고,
//     partial/fuzzy는 "보류 후보"로만 들고 있다가 원격이 실패했을 때 유사도 기준(0.7)을 통과할
//     때만 채택한다.
//
// 단위 주의: 음식DB는 100g당(nutrientsPer100)이고 레시피DB는 1인분 전체(nutrientsPerServing)다.
// 레시피DB는 그 1인분이 몇 g인지 대부분 모른다(1,141건 중 282건만 앎) — 아래 recipeToPer100이
// 그 가정을 한 곳에 모아두고, 가정을 쓴 경우 confidence를 낮춘다.
import { getPlausibility } from '../../src/lib/foodData.js'
import { foodNameSimilarity, FOOD_MATCH_SIMILARITY_THRESHOLD, pickBestFoodMatch } from '../../src/lib/foodMatch.js'
import { classifyMenuRole } from '../../src/lib/mealPortions.js'
import { lookupFood, toFoodItemResponse } from './foodLookup.js'
import { lookupRecipe } from './recipeLookup.js'

// 로컬 매처가 준 matchType 중 "그대로 믿어도 되는" 등급. partial/fuzzy는 재검증 대상이다.
const TRUSTED_MATCH_TYPES = new Set(['exact', 'alias'])

// 해석 단계에 허용하는 총 예산(ms). Gemini 식별(2~4초)과 합쳐 전체 7초 목표를 맞추기 위한 값이다.
// 로컬 조회는 이 예산을 거의 쓰지 않으므로, 실질적으로는 "원격 조회를 몇 초까지 기다려줄지"다.
// 초과하면 에러가 아니라 **그 시점까지 확보한 결과로 정상 응답**한다(안정성 — 느려도 답은 나온다).
export const DEFAULT_DEADLINE_MS = 2500

export const RESOLVE_SOURCE = {
  DB: '식약처DB',
  DB_PROCESS: '식약처DB(가공)',
  RECIPE_DB: '레시피DB',
  ESTIMATED: '추정',
}

function nowMs() {
  return Date.now()
}

// 레시피DB 레코드를 음식DB와 같은 "100g당" 모양으로 맞춘다.
// servingGram을 알면 그걸로 나누고(known), 모르면 mealPortions의 역할별 표준 중량을 가정한다
// (assumed). 가정을 쓴 경우 호출부가 confidence를 낮출 수 있도록 assumed 플래그를 함께 돌려준다.
export function recipeToPer100(item) {
  const known = item.servingGram > 0
  // foodData.js의 표준 1인분(referenceGrams)이 있으면 그게 가장 정확하고, 없으면 메뉴명에서
  // 역할을 추정해 그 역할의 표준 중량을 쓴다(밥 210g / 국 300g / 반찬 50g …).
  const assumedGram = getPlausibility(item.name)?.referenceGrams ?? classifyMenuRole(item.name).weight
  const servingGram = known ? item.servingGram : assumedGram
  if (!(servingGram > 0)) return null

  const factor = 100 / servingGram
  const nutrients = {}
  for (const [key, value] of Object.entries(item.nutrientsPerServing)) {
    nutrients[key] = typeof value === 'number' ? Math.round(value * factor * 100) / 100 : null
  }
  return { nutrients, servingGram, assumed: !known }
}

// 로컬 두 DB를 동시에 본다(둘 다 인메모리라 순서를 따질 이유가 없다).
// 음식DB를 우선하되, 음식DB가 신뢰 등급(exact/alias)이 아니고 레시피DB가 신뢰 등급이면 레시피를 쓴다.
function lookupLocal(term) {
  if (!term) return null

  const food = lookupFood(term)
  if (food && TRUSTED_MATCH_TYPES.has(food.matchType)) {
    return { kind: 'food', match: toFoodItemResponse(food.item), matchType: food.matchType, name: food.item.name }
  }

  const recipe = lookupRecipe(term)
  if (recipe && TRUSTED_MATCH_TYPES.has(recipe.matchType)) {
    const per100 = recipeToPer100(recipe.item)
    if (per100) {
      return {
        kind: 'recipe',
        match: {
          name: recipe.item.name,
          baseQuantity: { value: 100, unit: 'g', raw: null },
          // 레시피DB가 1인분 중량을 아는 경우엔 그게 사진 추정보다 정확한 근거라 servSize로 넘긴다.
          servSize: recipe.item.servingGram > 0 ? { value: recipe.item.servingGram, unit: 'g', raw: null } : null,
          foodSize: null,
          brand: null,
          nutrients: per100.nutrients,
        },
        matchType: recipe.matchType,
        name: recipe.item.name,
        assumedServing: per100.assumed,
      }
    }
  }

  // 신뢰 등급이 아니면 버리지 않고 "보류 후보"로 넘긴다 — 원격이 전부 실패했을 때 유사도 검증을
  // 통과하면 그때 쓴다(무검증 채택은 하지 않는다).
  const pending = food ?? recipe
  if (!pending) return null
  const isRecipe = pending === recipe && !food
  if (isRecipe) {
    const per100 = recipeToPer100(pending.item)
    if (!per100) return null
    return {
      kind: 'recipe',
      pending: true,
      matchType: pending.matchType,
      name: pending.item.name,
      assumedServing: per100.assumed,
      match: {
        name: pending.item.name,
        baseQuantity: { value: 100, unit: 'g', raw: null },
        servSize: pending.item.servingGram > 0 ? { value: pending.item.servingGram, unit: 'g', raw: null } : null,
        foodSize: null,
        brand: null,
        nutrients: per100.nutrients,
      },
    }
  }
  return { kind: 'food', pending: true, match: toFoodItemResponse(pending.item), matchType: pending.matchType, name: pending.item.name }
}

// 이 음식의 "표준 1인분"이 몇 g인가 — 사진에 보이는 양이 아니라 메뉴명만 아는 상황(식당 대표 메뉴,
// 보충 추천)에서 100g당 수치를 환산할 기준이다.
//
// ⚠️ 이 값은 사진 분석 경로의 섭취량 판단에 쓰면 안 된다. 사진 경로는 AI가 실제로 보이는 양을
// 추정하는 게 핵심이라(resolveConsumedGrams), 여기서 표준값을 강제하면 곱빼기·소식을 전부 표준
// 1인분으로 뭉개버린다. 그래서 match.servSize(포장 단위처럼 진짜 근거가 있는 값)와는 별도 필드로 둔다.
//
// 예전엔 이 판단을 src/lib/menuNutrition.js가 foodData.js(40개 표)만 보고 했는데, 표에 없으면
// DB 조회 자체를 건너뛰어 식당 메뉴 대부분이 AI 추정치로 남았다. 로컬 음식DB엔 servingGram이
// 11,347건 중 10,349건 있어서, 그걸 먼저 보는 것만으로 커버리지가 크게 늘어난다.
function standardServingGram(resolved) {
  const fromMatch = resolved.match?.servSize?.value ?? resolved.match?.servSize
  if (typeof fromMatch === 'number' && fromMatch > 0) return fromMatch
  const name = resolved.name
  const plausible = getPlausibility(name)?.referenceGrams
  if (plausible > 0) return plausible
  const role = classifyMenuRole(name).weight
  return role > 0 ? role : null
}

// 보류 후보(partial/fuzzy)를 채택할지 판정 — 클라이언트가 원격 결과에 쓰는 것과 **같은 기준**
// (foodNameSimilarity ≥ 0.7)을 적용한다. "치킨"→"제육"(유사도 0)이 여기서 걸러진다.
function acceptPending(pending, term) {
  if (!pending || !term) return null
  const score = foodNameSimilarity(term, pending.name)
  return score >= FOOD_MATCH_SIMILARITY_THRESHOLD ? pending : null
}

// items: [{ dbSearchName, fallbackSearchName, displayName, estimatedGrams, estimatedNutrients }]
// searchRemote(term, source): 원격 조회 주입점(server/proxy.js가 식약처 조회 함수를 넣는다).
//   테스트에서는 목으로 대체한다. 주지 않으면 원격 단계를 통째로 건너뛴다(로컬만으로 동작).
//
// 반환: items와 같은 길이의 배열
//   [{ matchedName, match, source, matchType, confidence, assumedServing }]
//   match가 null이면 DB 매칭 실패 — 호출부가 AI 추정치(estimatedNutrients)로 폴백한다.
export async function resolveFoodItems(items, { deadlineMs = DEFAULT_DEADLINE_MS, searchRemote } = {}) {
  const startedAt = nowMs()
  const list = Array.isArray(items) ? items : []

  // ── 1단계: 로컬 즉시 조회(네트워크 0) ────────────────────────────────────────
  // 검색어 후보는 기존 findFoodMatch와 같은 우선순위(구체적인 이름 → 일반적인 이름)를 쓴다.
  const states = list.map((item) => {
    // 구체적인 이름 → 일반적인 이름 순. 둘이 같은 경우가 흔해(AI가 같은 값을 넣는다) 중복을 없앤다 —
    // 그대로 두면 원격 조회 요청 수가 그냥 두 배가 된다. 반드시 trim한 값을 담아야 한다 — /api/fooddb
    // 라우트는 foodName.trim()으로 캐시 키를 만드는데(server/proxy.js), 여기서 트림 없이 넘기면 앞뒤
    // 공백이 섞인 검색어가 다른 캐시 키로 갈려 같은 음식이 두 번 조회되고, 식약처 API는 완전일치만
    // 지원해 공백이 남은 검색어는 조용히 매칭 실패로 이어질 수 있다.
    const terms = [...new Set([item?.dbSearchName, item?.fallbackSearchName].map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean))]

    let pending = null
    let pendingTerm = null
    for (const term of terms) {
      const local = lookupLocal(term)
      if (!local) continue
      // 신뢰 등급(exact/alias)이면 즉시 확정하고 나머지 검색어는 볼 필요가 없다.
      if (!local.pending) return { item, terms, resolved: local, usedTerm: term }
      // 보류 후보는 가장 구체적인 검색어(첫 번째)의 것만 남긴다 — 뒤의 더 일반적인 이름으로 잡힌
      // 후보는 유사도 검증에서 어차피 더 불리하다.
      if (!pending) {
        pending = local
        pendingTerm = term
      }
    }
    return { item, terms, resolved: null, pending, pendingTerm }
  })

  // ── 2단계: 미해결 항목만 원격 병렬 조회 ───────────────────────────────────────
  const unresolved = states.filter((s) => !s.resolved)
  if (unresolved.length > 0 && typeof searchRemote === 'function') {
    const remaining = deadlineMs - (nowMs() - startedAt)
    if (remaining > 0) {
      // 항목 × 검색어 × (음식DB, 가공식품DB)를 전부 동시에 던진다 — 예전의 7단계 순차를 1라운드로
      // 압축한 것이다. 검색어는 구체적인 이름과 일반적인 이름 둘 다 쓴다(예전 캐스케이드가
      // dbSearchName/fallbackSearchName/정규화명을 차례로 시도하던 것과 같은 커버리지) — 식약처
      // API는 완전일치만 지원해서 어느 표기가 등록돼 있는지 미리 알 수 없기 때문이다.
      const jobs = []
      for (const state of unresolved) {
        for (const term of state.terms) {
          for (const source of ['food', 'process']) {
            jobs.push(
              Promise.resolve()
                .then(() => searchRemote(term, source))
                .then((results) => ({ state, term, source, results }))
                .catch(() => null),
            )
          }
        }
      }

      // 예산을 넘기면 그 시점까지 끝난 것만 쓰고 나머지는 버린다(요청 자체는 백그라운드에서 끝나며
      // 서버 캐시를 채우므로 다음 요청이 이득을 본다).
      const settled = await Promise.race([
        Promise.allSettled(jobs),
        new Promise((resolve) => setTimeout(() => resolve(null), Math.max(0, deadlineMs - (nowMs() - startedAt)))),
      ])

      if (settled) {
        for (const outcome of settled) {
          if (outcome.status !== 'fulfilled' || !outcome.value) continue
          const { state, term, source, results } = outcome.value
          if (state.resolved) continue // 이미 다른 소스가 채웠다(음식DB 우선)
          const match = pickBestFoodMatch(results, term, { averageExactMatches: source === 'food' })
          if (match) {
            state.resolved = {
              kind: source === 'process' ? 'process' : 'food',
              match,
              matchType: 'remote',
              name: match.name,
            }
            state.usedTerm = term
          }
        }
      }
    }
  }

  // ── 3단계: 보류 후보 재검증 → 그래도 없으면 AI 추정 폴백 ──────────────────────
  return states.map((state) => {
    if (state.resolved) {
      const r = state.resolved
      return {
        matchedName: r.name,
        match: r.match,
        source: r.kind === 'process' ? RESOLVE_SOURCE.DB_PROCESS : r.kind === 'recipe' ? RESOLVE_SOURCE.RECIPE_DB : RESOLVE_SOURCE.DB,
        matchType: r.matchType,
        // 레시피DB인데 1인분 중량을 가정한 경우엔 확신을 낮춘다(수치 자체는 실측이지만 환산이 가정).
        confidence: r.assumedServing ? 'medium' : 'high',
        assumedServing: Boolean(r.assumedServing),
        servingGram: standardServingGram(r),
      }
    }

    const accepted = acceptPending(state.pending, state.pendingTerm)
    if (accepted) {
      return {
        matchedName: accepted.name,
        match: accepted.match,
        source: accepted.kind === 'recipe' ? RESOLVE_SOURCE.RECIPE_DB : RESOLVE_SOURCE.DB,
        matchType: accepted.matchType,
        confidence: 'low', // partial/fuzzy가 유사도는 통과했지만 완전일치는 아니다
        assumedServing: Boolean(accepted.assumedServing),
        servingGram: standardServingGram(accepted),
      }
    }

    return {
      matchedName: null,
      match: null,
      source: RESOLVE_SOURCE.ESTIMATED,
      matchType: null,
      confidence: 'low',
      assumedServing: false,
      servingGram: null,
    }
  })
}
