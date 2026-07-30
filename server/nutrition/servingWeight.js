// "이 메뉴 1인분은 몇 g인가" — 중량 결정 규칙의 단일 소스.
//
// 이 파일이 생긴 이유: 같은 판단을 resolveFood.js(standardServingGram)와 precisionEngine.js
// (resolveWeightGram)가 서로 다르게 하고 있었고, 그 차이가 "돼지갈비 73kcal / 110kcal"의 직접
// 원인이었다. 두 엔진이 같은 입력에 다른 답을 내지 않도록 규칙을 여기 한 곳에 모은다.
//
// ── 이 파일이 반복해서 틀렸던 한 가지 ──
// **근거 없는 기본값을 기준 삼아 근거 있는 값을 기각하는 순환.** 세 번 다른 얼굴로 나왔다:
//
//  ① (해결) 비율 가드의 분모 — "돼지갈비"가 어떤 패턴에도 안 걸려 기준이 50g이 되면 DB의 정확한
//     220g이 "4.4배 이상치"로 기각됐다. → 분모를 **근거 있는 기준값**으로 좁혀 해결.
//  ② (해결) 절대 범위의 역할 — 역할을 못 알아본 음식은 기본값 side가 되고, 그 범위 20~150g이
//     그대로 검사에 쓰였다. 실측: 프랜차이즈 레코드 8,259건 중 **57.5%가 이 규칙 하나로 진짜
//     제공량을 기각**당했다(도시락 500g, 음료 350ml…). ①과 정확히 같은 오류가 범위 검사 쪽에
//     남아 있던 것이다. → **역할을 실제로 알아본 경우에만** 그 역할의 범위를 쓴다.
//  ③ 남아 있는 형태 — 역할 자체를 모르는 음식이 11,347종 중 3,606종(31.8%)이다. 그건 이 파일이
//     혼자 풀 수 없어서, 호출부가 AI가 판단한 역할(roleHint)을 넘겨줄 수 있게 열어뒀다.
//
// 규칙을 고쳤으면 반드시 `npm run check:nutrition` — DB의 실측 제공량 8천 건을 정답지로
// hold-out 오차와 "근거 폐기율"을 잰다(무과금).
import { getPlausibility } from '../../src/lib/foodData.js'
import { classifyMenuRole, PORTION_WEIGHTS } from '../../src/lib/mealPortions.js'

// 역할별로 "1인분이 이 범위를 벗어나면 제공량 데이터가 잘못된 것"이라고 볼 절대 상·하한(g).
// 벗어난 값은 경계로 접지 않고 **버린다** — 크게 벗어난 값에서 경계값은 근거 있는 추정이 아니라서,
// 우리가 검증한 정량 사전으로 폴백하는 편이 낫다. 실제 사례 두 방향이 여기서 걸린다:
// "연포탕" foodSize=1000g(soup 상한 초과), "미역국" foodSize=122g(soup 하한 미만 — 국 1인분이
// 122g일 리 없다).
//
// ⚠️ 이 표는 **역할을 실제로 알아본 음식에만** 적용된다(위 ②). 모르는 음식에 기본값 side의
// 20~150g을 들이대면 정상적인 도시락·음료·1인분 포장이 전부 이상치로 기각된다.
const ROLE_SERVING_BOUNDS = {
  rice: [100, 500],
  noodle: [200, 900],
  soup: [200, 900],
  main: [80, 400],
  side: [20, 150],
  kimchi: [10, 120],
  dessert: [30, 300],
  drink: [100, 500],
}
// 역할을 모를 때 쓰는 범용 범위 — "사람이 한 번에 먹는 양"의 물리적 바깥선일 뿐, 역할 판정이
// 아니다. 여기 걸리는 건 단위 오기(1회 제공량에 총 내용량이 들어간 경우 등)뿐이어야 한다.
const FALLBACK_BOUNDS = [10, 1200]

// 식약처 foodSize가 정확히 "100g"인 레코드가 10,349건 중 871건 있는데, 이건 1회 제공량이 아니라
// **영양성분 기준량(100g)이 그대로 새어 들어온 값**이다. 제공량으로 쓰면 실제 1인분의 절반쯤으로
// 계산된다(예: 갈비구이_돼지고기 294kcal/100g × 100g = 294kcal, 실제 1인분 200g이면 588kcal).
// 진짜로 1인분이 100g인 음식도 있지만, 그런 경우 아래 폴백(정량 사전 → 역할 표준)이 비슷한 값을
// 주므로 잃는 것보다 얻는 게 크다.
const BASE_QUANTITY_PLACEHOLDER_G = 100

// 정량 사전에도 역할에도 안 걸리는 단품을 식당 맥락에서 만났을 때 쓸 중립값.
// 트레이 기본값(반찬 50g)을 그대로 쓰면 "모르는 메뉴 = 반찬"이 되어 크게 과소 계산된다.
const UNMATCHED_RESTAURANT_G = 200

// 기준값 대비 비율 가드. 절대 범위(위)만으로는 너무 느슨하다 — 실측: 급식 "잡곡밥" 레코드의
// foodSize가 473g인데 rice 절대 범위 100~500 안이라 통과해버려, 급식 한 끼가 2000kcal로 계산됐다.
// 분모는 **근거 있는 기준값일 때만** 쓴다(위 ①).
const MIN_SERVING_RATIO = 0.4
const MAX_SERVING_RATIO = 2.0

// 포장·프랜차이즈 제품의 1회 제공량이 물리적으로 말이 되는 범위. 역할 표준과 달리 제품군 편차가
// 워낙 커서(젤리 20g ~ 대용량 도시락 800g) 단위 오기만 잡는 수준으로 넓게 둔다.
const PACKAGED_BOUNDS = [5, 2000]

// context:
//   'restaurant' — 사진/텍스트 분석, 지도 탭 식당 메뉴. 우리가 손으로 검증한 외식 1인분 사전을
//                  DB 제공량보다 먼저 믿는다(사전에 있는 메뉴 = 우리가 DB보다 잘 아는 메뉴).
//   'packaged'   — 포장식품·프랜차이즈 제품. **제조사가 표시한 1회 제공량이 곧 정답**이라 DB 값을
//                  최우선으로 쓰고, 한식 역할 표준(반찬 50g 등)은 적용하지 않는다. 그 표준은
//                  "밥·국·반찬으로 차린 상"의 개념이라 초코바·아메리카노·도시락엔 의미가 없다.
//   'cafeteria'  — 학식·급식. 배식 정책상 역할별로 양이 표준화돼 있고, 그걸 고정해 재현 가능하게
//                  만드는 게 mealPortions.js의 존재 이유라 역할 표준이 최우선이다.
//
// roleHint: AI가 사진/메뉴명을 보고 판단한 역할(rice/soup/main/side/…). 이름 패턴이 역할을 못
//   알아냈을 때만 쓴다 — 패턴이 걸렸으면 그쪽이 재현 가능해서 항상 우선한다. 이게 위 ③에 대한
//   답이다: 규칙 기반 분류가 닿지 못하는 31.8%를 사람이 표를 늘리는 대신 AI가 메운다.
export function resolveStandardServingGram(menuName, dbServingGram, options = {}) {
  return resolveServingWeight(menuName, dbServingGram, options).grams
}

// 같은 판단에 **근거가 무엇이었는지**까지 함께 돌려주는 버전.
//
// founded=false는 "이 숫자는 아무 근거 없는 중립값"이라는 뜻이다. 호출부가 이걸 구분해야 하는
// 이유: 사진 경로의 배식비율 계산(표준 1인분 × portionRatio)은 표준값에 근거가 있을 때만 AI의 절대
// 그램 추정보다 낫다. 근거 없는 200g에 비율을 곱하면 "모르는 값 × 모르는 값"이 되어 오히려 나빠진다.
// 반환: { grams, source: 'declared'|'reference'|'db'|'role'|'neutral', founded }
export function resolveServingWeight(menuName, dbServingGram, { context = 'restaurant', roleHint = null } = {}) {
  const reference = getPlausibility(menuName)?.referenceGrams
  const role = effectiveRole(menuName, roleHint)
  const roleWeight = role.known ? role.weight : null

  // 포장·프랜차이즈: 표시된 1회 제공량 > 정량 사전 > (알아본 경우에만) 역할 표준 > 중립값.
  // 역할 범위 검사와 비율 가드는 걸지 않는다 — 제품 제공량은 제조사가 표시한 사실이지 추정이
  // 아니라서, 우리 한식 역할 표준으로 "이상치"를 판정할 근거가 없다(초코바 20g도 도시락 700g도
  // 전부 정상이다). 단위 오기만 PACKAGED_BOUNDS로 거른다.
  if (context === 'packaged') {
    const declared = isUsableServingGram(dbServingGram) && withinBounds(dbServingGram, PACKAGED_BOUNDS) ? dbServingGram : null
    return pickFirst(
      [
        ['declared', declared],
        ['reference', reference],
        ['role', roleWeight],
      ],
      UNMATCHED_RESTAURANT_G,
    )
  }

  // 근거 있는 기준값만 비율 가드의 분모로 쓴다. 미매칭 기본값(반찬 50g)은 근거가 아니다.
  const trustedReference = reference > 0 ? reference : roleWeight

  let usableDb = null
  if (isUsableServingGram(dbServingGram) && withinBounds(dbServingGram, boundsFor(role))) {
    const ratio = trustedReference ? dbServingGram / trustedReference : null
    usableDb = ratio === null || (ratio >= MIN_SERVING_RATIO && ratio <= MAX_SERVING_RATIO) ? dbServingGram : null
  }

  // 맥락에 따라 후보 자체가 다르다.
  //
  //   cafeteria(트레이) — **역할 표준만 쓴다.** 다른 두 후보는 둘 다 트레이 기준이 아니다 —
  //     foodData의 referenceGrams는 명시적으로 "식당 1인분"이고(잡채 200g은 급식 부찬으론 두 배
  //     넘는다), 식약처 foodSize는 같은 '밥'인데도 레코드마다 제각각이라(실측: 쌀밥 450g ·
  //     차조밥 290g · 강낭콩밥 300g) 한 트레이 안에서 밥 무게가 메뉴 이름에 따라 달라진다.
  //     역할을 못 알아본 음식도 마찬가지다 — mealPortions.js가 적어둔 대로 "한 판에는 주찬보다
  //     부찬이 많아서 모르면 반찬이 통계적으로 맞다"가 트레이 기본값의 근거이고, 그게 식당 1인분·
  //     외식 포장량보다 낫다.
  //     ⚠️ 한때 이 자리에서 role을 `known`일 때만 후보로 넣고 reference/db로 흘려보낸 적이 있다
  //     (역할 미상 31.8%가 전부 해당). NEIS 실제 115끼로 재보니 DB매칭분이 공식 열량의 53.9% →
  //     61.4%로 부풀고, **DB 매칭분만으로 공식 열량을 넘긴 끼니가 5 → 13끼**로 늘었다
  //     (쇠고기샤브샤브 50g→930g, 삼치카레구이 50g→450g, 메밀소바 50g→400g). 이 저장소가 반복해서
  //     틀린 패턴의 거울상이다 — 그때는 근거 없는 값으로 근거 있는 값을 기각했고, 이때는 이 맥락의
  //     근거가 아닌 값(식당 1인분)을 급식 배식량으로 승격시켰다. 되돌리지 말 것.
  //   restaurant(단품) — 반대로 우리가 검증한 식당 1인분 > 제품 실제 1회량 > 카테고리 평균 순.
  const ordered =
    context === 'cafeteria'
      ? [['role', roleWeight]]
      : [
          ['reference', reference],
          ['db', usableDb],
          ['role', roleWeight],
        ]

  // 어떤 근거도 없는 경우 — 트레이라면 기본값(반찬)이 통계적으로 맞고, 식당 단품이면 중립값이 낫다.
  // 역할을 못 알아본 트레이 항목이 여기로 온다: 값은 반찬 표준이되 founded=false라, 배식비율을
  // 곱하는 경로(resolveConsumedGrams)는 열리지 않는다("모르는 값 × 모르는 값" 방지).
  return pickFirst(ordered, context === 'cafeteria' ? role.weight : UNMATCHED_RESTAURANT_G)
}

function pickFirst(candidates, neutral) {
  for (const [source, value] of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return { grams: value, source, founded: true }
  }
  return { grams: neutral, source: 'neutral', founded: false }
}

// 이름 패턴이 이겼는지, AI 힌트로 메웠는지, 아무것도 모르는지. known=false면 role/weight는 기본값
// (반찬 50g)이라 **근거가 아니다** — 범위 검사에도 비율 가드 분모에도 쓰면 안 된다.
export function effectiveRole(menuName, roleHint = null) {
  const classified = classifyMenuRole(menuName)
  if (classified.matched) return { role: classified.role, weight: classified.weight, known: true, source: 'pattern' }
  if (roleHint && PORTION_WEIGHTS[roleHint] > 0) return { role: roleHint, weight: PORTION_WEIGHTS[roleHint], known: true, source: 'hint' }
  return { role: classified.role, weight: classified.weight, known: false, source: 'default' }
}

// DB가 준 제공량을 그대로 믿어도 되는지. 숫자가 아니거나, 0 이하거나, 기준량 placeholder면 안 된다.
export function isUsableServingGram(grams) {
  return typeof grams === 'number' && Number.isFinite(grams) && grams > 0 && grams !== BASE_QUANTITY_PLACEHOLDER_G
}

function boundsFor(role) {
  return role.known ? (ROLE_SERVING_BOUNDS[role.role] ?? FALLBACK_BOUNDS) : FALLBACK_BOUNDS
}

function withinBounds(grams, [min, max]) {
  return grams >= min && grams <= max
}

// 그 역할의 1인분으로 말이 되는 범위인지 — 역할을 알아본 경우에만 역할 범위를 쓴다.
export function isWithinRoleBounds(grams, menuName, roleHint = null) {
  return withinBounds(grams, boundsFor(effectiveRole(menuName, roleHint)))
}
