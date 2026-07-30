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
import { lookupFood, searchFoodCandidates, toFoodItemResponse } from './foodLookup.js'
import { lookupRecipe, searchRecipeCandidates } from './recipeLookup.js'
import { resolveServingWeight } from './servingWeight.js'

// 로컬 매처가 준 matchType 중 "그대로 믿어도 되는" 등급. partial/fuzzy는 재검증 대상이다.
const TRUSTED_MATCH_TYPES = new Set(['exact', 'alias'])

// 해석 단계에 허용하는 총 예산(ms). Gemini 식별(2~4초)과 합쳐 전체 7초 목표를 맞추기 위한 값이다.
// 로컬 조회는 이 예산을 거의 쓰지 않으므로, 실질적으로는 "원격 조회를 몇 초까지 기다려줄지"다.
// 초과하면 에러가 아니라 **그 시점까지 확보한 결과로 정상 응답**한다(안정성 — 느려도 답은 나온다).
export const DEFAULT_DEADLINE_MS = 2500

// 프롬프트는 nameCandidates를 "2~3개"로 요청하지만 스키마상 개수를 강제하지 않는다(모델이 더 낼 수도,
// 조작된 요청이 훨씬 더 많이 보낼 수도 있다). 항목당 검색어 수는 그대로 원격 조회 fan-out(검색어 ×
// 2소스)에 비례하므로, 여기서 자르지 않으면 요청 1건이 식약처 API에 과도한 동시 호출을 낼 수 있다
// (리뷰에서 발견). 상한을 넉넉히 잡아 정상적인 다중 후보는 그대로 통과시킨다.
const MAX_TERMS_PER_ITEM = 6

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
  //
  // ⚠️ classifyMenuRole은 이름 패턴에 못 걸려도 항상 role 문자열(기본값 side=50g)을 돌려준다 —
  // precisionEngine.js의 급식 중량 계산에서는 이걸 "AI가 확인한 값"으로 오인하는 게 실제 버그였지만
  // (matched를 확인해 고쳤다), 여기서는 성격이 다르다: 이 함수는 cafeteria(precisionEngine.js)와
  // restaurant(이 파일의 retrieval) 양쪽에서 공유되고, 레시피DB 자체가 반찬류 창작 레시피가 다수라
  // "역할 불명 = side 50g"이 두 맥락 모두에 걸쳐 검증된 기본 추정이다(회귀 테스트: 가지겉절이가
  // 배추겉절이 오매칭 19.68kcal이 아니라 50kcal 이상으로 나와야 한다 — 반찬 전용 상수를 다른 값으로
  // 바꾸면 이 검증이 깨진다). 그래서 classifyMenuRole의 role은 matched 여부와 무관하게 그대로 쓴다.
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

// ── retrieval-then-gate ───────────────────────────────────────────────────────
// 로컬 매처(nameMatcher)는 답을 **하나만** 준다. 그 하나가 틀리면 끝이고 실제로 자주 틀렸다
// (치킨→제육, 파스타→토스트, 콩자반→간자장). 유사도 게이트는 그 하나를 통과/탈락시킬 수만 있지
// 더 나은 후보로 바꿔주지 못해서, **게이트를 엄격하게 할수록 매칭 실패가 늘어나는** 구조였다.
//
// 그래서 순서를 뒤집는다: 자모 역색인으로 후보를 넓게 회수하고(nameIndex.js), 게이트가 그중 최선을
// 고른다. 이제 게이트를 엄격하게 유지해도 매칭률이 떨어지지 않는다.
const RETRIEVAL_LIMIT = 8

// 이 점수 이상이면 원격 조회를 건너뛰고 바로 확정한다("확실하지 않은 항목에만 비싼 일을 시킨다").
// 0.85는 접두 수식어 변형(돌솥비빔밥→비빔밥 0.88)이 확실히 넘고, 조리법 접미사(0.72)나 겨우 통과한
// 앞머리 공유(0.70~)는 못 넘는 선이다 — 후자는 원격에 더 나은 답이 있을 수 있으니 계속 물어본다.
const RETRIEVAL_CONFIDENT_SCORE = 0.85

// 최고점과 이 차이 안에 있는 후보들은 "이름만으로는 우열을 가릴 수 없다"고 보고 평균한다.
// 하나를 임의로 고르면 `파스타`가 `냉파스타`가 되는 식의 편향이 생긴다 — 식약처 DB에는 일반명
// 그대로인 레코드가 거의 없고 전부 특정 변형이라, 일반적인 검색어일수록 이 문제가 심하다.
// pickBestFoodMatch가 완전일치 다건에 이미 쓰는 논리("임의로 첫 항목만 쓰지 않고 평균해서 더
// 대표성 있는 표준값을 만든다")를 근사일치로 넓힌 것이다.
const TIE_SCORE_BAND = 0.05
const TIE_MAX_MEMBERS = 5

const NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium']

// 이름이 닮았다고 영양까지 맞는 건 아니다 — retrieval을 넓히면서 새로 생긴 위험이 이것이다.
// 실측: `치킨`이 레시피DB의 `삼계치킨`(120kcal/100g)에 0.85로 붙었는데, 우리가 검증해둔 치킨의
// 현실 범위는 180~326kcal/100g이다. 이름만 보면 "치킨의 한 종류"가 맞지만 대표값으로는 틀렸다.
//
// 그래서 foodData가 **검증 범위를 갖고 있는 음식에 한해**, 그 범위를 벗어나는 후보를 랭킹에서 뺀다.
// 여기서는 clampToPlausibleNutrients의 0.5/1.5 여유를 쓰지 않고 범위를 그대로 적용한다 —
// 저쪽은 "이미 채택한 값을 고칠지" 판단이라 오탐이 비싸지만, 여기는 "여러 후보 중 무엇을 고를지"라
// 애매한 후보 하나를 버려도 다음 후보나 AI 추정이 받아준다.
function violatesPlausibility(terms, per100) {
  const calories = per100?.calories
  if (!(calories > 0)) return false
  for (const term of terms) {
    const entry = getPlausibility(term)
    const range = entry?.ranges?.calories
    if (!range || !(entry.referenceGrams > 0)) continue
    const perServing = (calories * entry.referenceGrams) / 100
    // 검증 범위를 가진 검색어가 하나라도 있으면 그 판정을 따른다(가장 구체적인 검색어가 앞에 온다).
    return perServing < range[0] || perServing > range[1]
  }
  return false
}

function recipeCandidateMatch(item) {
  const per100 = recipeToPer100(item)
  if (!per100) return null
  return {
    match: {
      name: item.name,
      baseQuantity: { value: 100, unit: 'g', raw: null },
      // 레시피DB가 1인분 중량을 아는 경우엔 그게 사진 추정보다 정확한 근거라 servSize로 넘긴다.
      servSize: item.servingGram > 0 ? { value: item.servingGram, unit: 'g', raw: null } : null,
      foodSize: null,
      brand: null,
      nutrients: per100.nutrients,
    },
    assumedServing: per100.assumed,
  }
}

// terms 전부를 역색인에 던져 후보를 모으고, 게이트 점수가 가장 높은 하나를 고른다.
// 정렬은 (게이트 점수 → 역할 일치 → 음식DB 우선) 사전식. 역할 일치를 점수에 섞지 않고 tie-break로만
// 쓰는 이유는, 역할이 맞다는 것만으로 이름이 덜 닮은 후보가 이기면 안 되기 때문이다.
function retrieveBestLocal(terms, context, roleHint) {
  const pool = []
  const seen = new Set()
  for (const term of terms) {
    for (const { item } of searchFoodCandidates(term, RETRIEVAL_LIMIT)) pool.push({ kind: 'food', item })
    for (const { item } of searchRecipeCandidates(term, RETRIEVAL_LIMIT)) pool.push({ kind: 'recipe', item })
  }

  const passed = []
  for (const candidate of pool) {
    if (seen.has(candidate.item)) continue
    seen.add(candidate.item)
    const name = candidate.item.name
    if (rolesConflict(roleHint, name)) continue
    // 후보 이름 하나를 검색어 **전부**와 견줘 가장 높은 점수를 쓴다 — 후보를 여럿 받는 이유가
    // "하나가 틀려도 나머지가 살린다"이므로, 어느 검색어로 걸렸는지는 중요하지 않다.
    let score = 0
    for (const term of terms) score = Math.max(score, foodNameSimilarity(term, name))
    if (score < FOOD_MATCH_SIMILARITY_THRESHOLD) continue
    const per100 = candidate.kind === 'food' ? candidate.item.nutrientsPer100 : recipeToPer100(candidate.item)?.nutrients
    if (violatesPlausibility(terms, per100)) continue
    passed.push({
      ...candidate,
      score,
      roleMatch: roleHint && classifyMenuRole(name).role === roleHint ? 1 : 0,
      sourceRank: candidate.kind === 'food' ? 1 : 0, // 동점이면 식약처 음식DB(공식 수치)가 이긴다
    })
  }
  if (passed.length === 0) return null

  // (게이트 점수 → 역할 일치 → 음식DB 우선) 사전식. 역할 일치를 점수에 섞지 않고 tie-break로만 쓰는
  // 이유는, 역할이 맞다는 것만으로 이름이 덜 닮은 후보가 이기면 안 되기 때문이다.
  passed.sort((x, y) => y.score - x.score || y.roleMatch - x.roleMatch || y.sourceRank - x.sourceRank)

  const tied = passed.filter((p) => p.score >= passed[0].score - TIE_SCORE_BAND).slice(0, TIE_MAX_MEMBERS)
  const built = tied.map((p) => (p.kind === 'recipe' ? recipeCandidateMatch(p.item) : { match: toFoodItemResponse(p.item, context), assumedServing: false }))
  const usable = tied.map((p, i) => ({ ...p, built: built[i] })).filter((p) => p.built)
  if (usable.length === 0) return null

  const head = usable[0]
  const base = {
    kind: head.kind,
    matchType: 'retrieved',
    name: head.built.match.name,
    gateScore: head.score,
    // 평균에 1인분 중량을 가정한 레시피가 하나라도 섞였으면 그 불확실성을 그대로 알린다.
    assumedServing: usable.some((p) => p.built.assumedServing),
  }
  if (usable.length === 1) return { ...base, match: head.built.match }

  return {
    ...base,
    // 이름 대표는 최고점 후보로 두되(사용자에게 보여줄 이름), 수치는 동점군 평균이다.
    match: { ...head.built.match, nutrients: averageNutrients(usable.map((p) => p.built.match.nutrients)) },
    averagedFrom: usable.length,
  }
}

function averageNutrients(sets) {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const values = sets.map((n) => n?.[key]).filter((v) => typeof v === 'number')
      // 일부 후보에만 있는 항목(레시피DB엔 식이섬유가 없다)은 **있는 것들끼리만** 평균한다.
      // 없는 값을 0으로 치면 그 영양소만 조용히 과소 계산된다.
      return [key, values.length > 0 ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100 : null]
    }),
  )
}

// 로컬 두 DB를 동시에 본다(둘 다 인메모리라 순서를 따질 이유가 없다).
// 음식DB를 우선하되, 음식DB가 신뢰 등급(exact/alias)이 아니고 레시피DB가 신뢰 등급이면 레시피를 쓴다.
// context는 음식DB 레코드의 출처 변형(외식/급식)을 고르는 데 쓴다 — toFoodItemResponse가 처리한다.
function lookupLocal(term, context) {
  if (!term) return null

  const food = lookupFood(term)
  if (food && TRUSTED_MATCH_TYPES.has(food.matchType)) {
    return { kind: 'food', match: toFoodItemResponse(food.item, context), matchType: food.matchType, name: food.item.name }
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
  return { kind: 'food', pending: true, match: toFoodItemResponse(pending.item, context), matchType: pending.matchType, name: pending.item.name }
}

// 이 음식의 "표준 1인분"이 몇 g인가 — 사진에 보이는 양이 아니라 메뉴명만 아는 상황(식당 대표 메뉴,
// 보충 추천)에서 100g당 수치를 환산할 기준이다.
//
// ⚠️ 이 값은 사진 분석 경로의 섭취량 판단에 쓰면 안 된다. 사진 경로는 AI가 실제로 보이는 양을
// 추정하는 게 핵심이라(resolveConsumedGrams), 여기서 표준값을 강제하면 곱빼기·소식을 전부 표준
// 1인분으로 뭉개버린다. 그래서 match.servSize(포장 단위처럼 진짜 근거가 있는 값)와는 별도 필드로 둔다.
//
// 예전엔 DB의 servSize를 무조건 최우선으로 채택했는데, 그게 지도 탭 식당 메뉴 수치가 크게 어긋난
// 원인이었다 — 식약처 foodSize에는 기준량 placeholder(정확히 100g, 871건)와 "돼지갈비찜
// 간편조리세트 895g" 같은 포장 단위가 섞여 있다. 이제 servingWeight.js의 공통 규칙을 쓴다
// (외식 정량 사전 → 역할별 절대 범위로 클램프한 DB 값 → 역할 표준).
function standardServingGram(resolved, context, roleHint) {
  // referenceServingGram = 로컬 음식DB의 일반적인 1인분, servSize = 포장 단위처럼 근거 있는 1회량
  // (가공식품/레시피DB). 후자가 더 강한 근거지만 없을 때가 많다.
  const fromMatch = resolved.match?.servSize?.value ?? resolved.match?.referenceServingGram
  return resolveServingWeight(resolved.name, fromMatch, { context, roleHint })
}

// 상차림 역할이 범주적으로 다르면 같은 음식일 수 없다 — 국(soup)으로 식별된 음식에 후식(dessert)
// 레코드가 붙는 건 이름이 얼마나 닮았든 오매칭이다. 이름 꼬리 기반 차단(foodMatch.js의 DISH_TYPE_TAILS)이
// 이미 상당수를 막지만, 그건 **양쪽 다 알아볼 수 있는 꼬리를 가졌을 때만** 동작한다("푸팟퐁커리",
// "몬테크리스토샌드위치" 같은 창작·외래 메뉴명엔 안 걸린다). AI가 준 역할은 그 구멍을 메운다.
//
// 인접한 역할끼리는 막지 않는다 — main↔side는 같은 반찬이 양에 따라 갈리는 정도의 차이라
// (제육볶음이 주찬이기도 부찬이기도 하다) 여기서 자르면 정상 매칭이 대량으로 죽는다.
const ROLE_CONFLICT_EXEMPT = [
  new Set(['main', 'side']),
  new Set(['rice', 'noodle']),
  new Set(['side', 'kimchi']),
  new Set(['dessert', 'drink']),
]

function rolesConflict(roleHint, candidateName) {
  if (!roleHint) return false
  const candidate = classifyMenuRole(candidateName)
  // 후보 이름에서 역할을 못 읽으면 판단 근거가 없다 — 막지 않는다(모르면 통과).
  if (!candidate.matched || candidate.role === roleHint) return false
  return !ROLE_CONFLICT_EXEMPT.some((pair) => pair.has(roleHint) && pair.has(candidate.role))
}

// 보류 후보(partial/fuzzy)를 채택할지 판정 — 클라이언트가 원격 결과에 쓰는 것과 **같은 기준**
// (foodNameSimilarity ≥ 0.7)을 적용한다. "치킨"→"제육"(유사도 0)이 여기서 걸러진다.
function acceptPending(pending, terms, roleHint) {
  if (!pending || !terms?.length) return null
  if (rolesConflict(roleHint, pending.name)) return null
  // 검색어 후보 **전부**와 견줘 가장 높은 점수를 쓴다 — 하나가 틀려도 나머지가 살리라고 후보를
  // 여러 개 받는 것이므로, 어느 검색어로 걸렸는지로 벌점을 주면 그 취지가 무너진다.
  let score = 0
  for (const term of terms) score = Math.max(score, foodNameSimilarity(term, pending.name))
  return score >= FOOD_MATCH_SIMILARITY_THRESHOLD ? pending : null
}

// 신뢰도는 "무엇으로 맞췄나"에서 바로 나온다. 이름을 정확히(또는 등록된 별칭으로) 맞춘 것만 무조건
// 신뢰하고, 나머지는 근거의 세기를 그대로 반영한다 — 예전엔 매칭만 되면 전부 'high'라 실제로는
// 엉뚱한 음식을 물어온 결과에도 높은 신뢰 배지가 붙었다.
function confidenceOf(resolved) {
  if (resolved.assumedServing) return 'medium' // 수치는 실측이지만 100g 환산이 가정이다
  if (resolved.matchType === 'fuzzy') return 'medium'
  if (resolved.matchType === 'retrieved') return resolved.gateScore >= RETRIEVAL_CONFIDENT_SCORE ? 'high' : 'medium'
  return 'high'
}

// 항목이 지정한 맥락을 유효한 값으로 좁힌다(AI가 엉뚱한 문자열을 주더라도 기본값으로 떨어지게).
const VALID_CONTEXTS = new Set(['restaurant', 'packaged', 'cafeteria', 'home'])
function contextFor(item, fallback) {
  return VALID_CONTEXTS.has(item?.servingContext) ? item.servingContext : fallback
}

// 원격 조회 결과 채택 순서. 예전엔 **먼저 도착한 응답**이 이겼다(`if (state.resolved) continue`) —
// 음식DB와 가공식품DB에 같은 이름이 다 있으면 그날의 네트워크 사정에 따라 답이 달라졌다.
// 맥락에 따라 어느 DB가 맞는지는 정해져 있으므로 도착 순서 대신 이 순서로 고른다.
const REMOTE_SOURCE_PREFERENCE = {
  packaged: ['process', 'food'], // 포장·프랜차이즈 제품은 가공식품DB에 공식 표기가 있다
  restaurant: ['food', 'process'],
  cafeteria: ['food', 'process'],
  home: ['food', 'process'],
}

// items: [{ dbSearchName, fallbackSearchName, displayName, estimatedGrams, estimatedNutrients,
//           servingContext?, role? }]
// searchRemote(term, source): 원격 조회 주입점(server/proxy.js가 식약처 조회 함수를 넣는다).
//   테스트에서는 목으로 대체한다. 주지 않으면 원격 단계를 통째로 건너뛴다(로컬만으로 동작).
// context: 요청 전체의 기본 맥락. 'restaurant'(기본) | 'packaged' | 'cafeteria' | 'home'.
//   같은 음식이라도 어디서 나온 것이냐에 따라 영양밀도도 1인분 중량도 다르다(실측: 돼지갈비구이가
//   급식 132kcal/100g, 외식 294). 식약처 DB는 출처별로 서로 다른 레코드를 갖고 있으므로 어느 쪽을
//   볼지 정해야 한다. **항목이 servingContext를 직접 주면 그게 이긴다** — 한 사진 안에 급식 식판과
//   포장 음료가 같이 있을 수 있고, 그때 요청 단위 맥락 하나로는 둘 다 맞출 수 없다.
//
// 반환: items와 같은 길이의 배열
//   [{ matchedName, match, source, matchType, confidence, assumedServing, servingGram, context }]
//   match가 null이면 DB 매칭 실패 — 호출부가 AI 추정치(estimatedNutrients)로 폴백한다.
export async function resolveFoodItems(items, { deadlineMs = DEFAULT_DEADLINE_MS, searchRemote, context = 'restaurant' } = {}) {
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
    // AI가 낸 검색어 후보 전부(구체적인 이름 → 일반적인 이름 순). `nameCandidates`는 v2에서 추가된
    // 다중 후보이고, 없으면 기존 두 필드로 폴백한다 — **검색어 하나가 유일한 실패점이던 구조**를
    // 없애는 게 목적이다(AI가 이름을 하나 잘못 지어내면 뒤가 아무리 정확해도 전부 틀린 음식이 된다).
    // ⚠️ 상한은 **nameCandidates에만** 건다. 합친 뒤 자르면 배열 맨 뒤의 fallbackSearchName이 가장
    // 먼저 잘려나가는데, 그건 프롬프트가 "항상 dbSearchName보다 더 일반적인 상위 카테고리명"으로
    // 정의한 마지막 안전망이라 후보가 많을수록 안전망이 사라지는 정반대 결과가 된다(리뷰에서 발견:
    // 창작 메뉴명 6개 + fallback '돈가스' → 매칭 실패, 후보를 5개로 줄이면 정상 매칭).
    const candidates = (Array.isArray(item?.nameCandidates) ? item.nameCandidates : []).slice(0, MAX_TERMS_PER_ITEM - 2)
    const terms = [
      ...new Set(
        [...candidates, item?.dbSearchName, item?.fallbackSearchName]
          .map((t) => (typeof t === 'string' ? t.trim() : ''))
          .filter(Boolean),
      ),
    ].slice(0, MAX_TERMS_PER_ITEM)
    const itemContext = contextFor(item, context)
    const roleHint = typeof item?.role === 'string' ? item.role : null

    let pending = null
    let pendingTerm = null
    for (const term of terms) {
      const local = lookupLocal(term, itemContext)
      if (!local) continue
      // 신뢰 등급(exact/alias)이면 즉시 확정하고 나머지 검색어는 볼 필요가 없다.
      if (!local.pending) return { item, terms, itemContext, roleHint, resolved: local, usedTerm: term }
      // 보류 후보는 가장 구체적인 검색어(첫 번째)의 것만 남긴다 — 뒤의 더 일반적인 이름으로 잡힌
      // 후보는 유사도 검증에서 어차피 더 불리하다.
      if (!pending) {
        pending = local
        pendingTerm = term
      }
    }

    // 신뢰 등급이 없으면 역색인으로 넓게 회수해 게이트로 고른다. 점수가 확실히 높으면 원격을
    // 건너뛰고 바로 확정하고(속도), 애매하면 보류 후보로만 들고 원격에 한 번 더 물어본다.
    const retrieved = retrieveBestLocal(terms, itemContext, roleHint)
    if (retrieved && retrieved.gateScore >= RETRIEVAL_CONFIDENT_SCORE) {
      return { item, terms, itemContext, roleHint, resolved: retrieved, usedTerm: terms[0] }
    }
    // 역색인 후보가 기존 보류 후보보다 이름이 더 닮았으면 그쪽을 보류 후보로 삼는다.
    if (retrieved && (!pending || retrieved.gateScore > foodNameSimilarity(pendingTerm, pending.name))) {
      pending = { ...retrieved, pending: true }
      pendingTerm = terms[0]
    }
    return { item, terms, itemContext, roleHint, resolved: null, pending, pendingTerm }
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
        // 도착한 결과를 항목별로 모아두고, **정해진 우선순위로** 고른다. 예전엔 이 루프가 도착
        // 순서대로 첫 성공을 채택해서(`if (state.resolved) continue`) 같은 입력에 다른 답이 나올 수
        // 있었다 — 음식DB와 가공식품DB에 같은 이름이 다 있을 때 그날의 응답 속도가 결과를 갈랐다.
        const candidates = new Map() // state → { food: {...}, process: {...} }
        for (const outcome of settled) {
          if (outcome.status !== 'fulfilled' || !outcome.value) continue
          const { state, term, source, results } = outcome.value
          if (state.resolved) continue
          const match = pickBestFoodMatch(results, term, { averageExactMatches: source === 'food' })
          if (!match) continue
          if (rolesConflict(state.roleHint, match.name)) continue
          const bucket = candidates.get(state) ?? {}
          // 같은 소스 안에서는 먼저 온 것(= 더 구체적인 검색어 쪽)을 유지한다.
          if (!bucket[source]) bucket[source] = { match, term }
          candidates.set(state, bucket)
        }

        for (const [state, bucket] of candidates) {
          const order = REMOTE_SOURCE_PREFERENCE[state.itemContext] ?? REMOTE_SOURCE_PREFERENCE.restaurant
          const source = order.find((s) => bucket[s])
          if (!source) continue
          state.resolved = {
            kind: source === 'process' ? 'process' : 'food',
            match: bucket[source].match,
            matchType: 'remote',
            name: bucket[source].match.name,
          }
          state.usedTerm = bucket[source].term
        }
      }
    }
  }

  // ── 3단계: 보류 후보 재검증 → 그래도 없으면 AI 추정 폴백 ──────────────────────
  return states.map((state) => {
    if (state.resolved) {
      const r = state.resolved
      const serving = standardServingGram(r, state.itemContext, state.roleHint)
      return {
        matchedName: r.name,
        match: r.match,
        source: r.kind === 'process' ? RESOLVE_SOURCE.DB_PROCESS : r.kind === 'recipe' ? RESOLVE_SOURCE.RECIPE_DB : RESOLVE_SOURCE.DB,
        matchType: r.matchType,
        confidence: confidenceOf(r),
        gateScore: r.gateScore ?? null,
        assumedServing: Boolean(r.assumedServing),
        servingGram: serving.grams,
        servingGramFounded: serving.founded,
        context: state.itemContext,
      }
    }

    const accepted = acceptPending(state.pending, state.terms, state.roleHint)
    if (accepted) {
      const serving = standardServingGram(accepted, state.itemContext, state.roleHint)
      return {
        matchedName: accepted.name,
        match: accepted.match,
        source: accepted.kind === 'recipe' ? RESOLVE_SOURCE.RECIPE_DB : RESOLVE_SOURCE.DB,
        matchType: accepted.matchType,
        confidence: 'low', // 유사도는 통과했지만 완전일치도 아니고 원격도 못 찾았다
        gateScore: accepted.gateScore ?? null,
        assumedServing: Boolean(accepted.assumedServing),
        servingGram: serving.grams,
        servingGramFounded: serving.founded,
        context: state.itemContext,
      }
    }

    // DB 매칭에 실패해도 "이 음식의 표준 1인분"은 정량 사전·역할로 알 수 있다. 예전엔 여기서 null을
    // 내보내 호출부가 AI 그램 추정에만 의존했는데, 배식비율(portionRatio) 경로는 이 기준값이 있어야
    // 동작한다 — 매칭 실패야말로 AI의 절대 그램 추정이 가장 못 미더운 경우다.
    const serving = resolveServingWeight(state.item?.dbSearchName ?? '', null, {
      context: state.itemContext,
      roleHint: state.roleHint,
    })
    return {
      matchedName: null,
      match: null,
      source: RESOLVE_SOURCE.ESTIMATED,
      matchType: null,
      confidence: 'low',
      assumedServing: false,
      servingGram: serving.grams,
      servingGramFounded: serving.founded,
      context: state.itemContext,
    }
  })
}
