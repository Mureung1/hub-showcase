// 식품 검색 결과 중 "이게 정말 그 음식인가"를 판정하는 순수 로직 — 이름 유사도 + 최적 후보 선택.
//
// 원래 src/lib/fooddb.js 안에 있었는데, 그 파일은 fetchWithTimeout → apiBase.js(import.meta.env)를
// 끌고 들어와 **Node(서버)에서 import할 수 없다**. 서버의 통합 해석 엔진(server/nutrition/
// resolveFood.js)이 클라이언트와 **똑같은 기준**으로 매칭을 검증해야 해서(기준이 갈리면 "웹에선
// 잡히는데 급식 분석에선 안 잡힌다" 같은 문제가 조용히 생긴다) 브라우저 의존이 전혀 없는 이 파일로
// 뽑았다. fooddb.js는 이 모듈을 그대로 재수출하므로 기존 import 경로·테스트는 손대지 않아도 된다.
import { jamoSimilarity } from './hangul.js'

const NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium']

// 공백 무시 정규화 — 식약처 DB에는 같은 음식이 "돌솥 비빔밥"처럼 띄어쓰기만 다른 표기로 등록된
// 경우가 있어, 이름 비교는 공백을 무시하는 게 맞다.
export function normalizeName(name) {
  return typeof name === 'string' ? name.replace(/\s+/g, '') : ''
}

// 식약처 DB의 변형명 체계는 "기본명_수식어"다 — `김치찌개_돼지고기`, `갈비구이_소고기_양념`,
// `제육볶음_채소`처럼 밑줄 뒤에 재료·양념을 붙인다. 이건 접두 수식어 변형과 **방향만 반대일 뿐
// 같은 음식**이므로 endsWith와 같은 등급으로 본다.
const DB_VARIANT_SEPARATOR = '_'

// 조리법 접미사 — `돼지갈비` → `돼지갈비찜`처럼 재료는 같고 조리법만 붙은 경우. 엄밀히는 다른
// 음식이지만, 여기서 떨어뜨리면 AI 추정치로 폴백해 훨씬 큰 오차가 난다(실측: 돼지갈비가
// resolveFood 경로에서 통째로 매칭 실패했다). 접두 수식어 변형보다는 낮게, 통과선보다는 살짝 위로.
const COOKING_METHOD_SUFFIXES = ['찜', '구이', '볶음', '조림', '탕', '전골', '강정', '튀김', '무침', '절임']
const COOKING_METHOD_SCORE = 0.72

// 한국어 급식/식당 메뉴명의 지배적인 패턴은 **가운데에 재료가 끼어드는 것**이다:
//   꽁치김치조림 ↔ 꽁치조림 · 참치야채죽 ↔ 참치죽 · 감자채볶음 ↔ 감자볶음 · 들깨무채국 ↔ 들깨국
// 이건 endsWith도 startsWith도 includes도 아니라서 위 규칙들로는 전부 0점이 나온다. 실측: NEIS 급식
// 288개 항목에서 DB가 찾아낸 198건 중 **57건(29%)이 이런 좋은 매칭인데 0점으로 버려지고 있었다.**
// 그래서 "앞머리(재료)와 꼬리(조리법)를 얼마나 공유하는가"를 마지막 판정으로 쓴다 —
// 그게 두 이름이 같은 음식 계열인지를 가르는 실제 신호다.
//
// 다른 규칙이 하나도 안 걸릴 때만 적용한다. 그래야 "라면→라면땅"처럼 startsWith로 이미 낮은 점수를
// 받아 걸러지던 케이스가 이 규칙으로 되살아나지 않는다(라면땅은 앞머리를 100% 공유해서, 여기까지
// 오면 통과해버린다).
const AFFIX_MIN_RATIO = 0.6

// 꼬리만 공유할 때는 기준을 더 높인다. 이 규칙의 취지는 "재료가 **가운데** 끼어든 같은 음식"인데
// (꽁치김치조림 ↔ 꽁치조림 — 앞머리 `꽁치`와 꼬리 `조림`을 둘 다 공유), 앞머리가 아예 다르면
// 그건 **재료가 다른 음식**일 가능성이 높다. 실측으로 확인한 오매칭: `콩자반`↔`김자반`(2/3=0.667로
// 통과했는데 180 vs 500kcal/100g). 앞뒤를 다 공유하는 경우와 같은 기준을 쓸 근거가 없다.
// 0.7로 잡으면 `팬케이크`↔`핫케이크`(3/4=0.75, 사실상 같은 음식)는 남고 위 사례는 걸러진다.
const SUFFIX_ONLY_MIN_RATIO = 0.7

// 한국어 음식명의 **꼬리가 곧 음식의 종류**다. 앞머리(재료)가 같아도 꼬리가 다르면 다른 음식이다:
//   계란국(국) ↔ 계란빵(빵) · 콩나물국(국) ↔ 잔치국수(국수) · 볶음밥(밥) ↔ 오징어볶음(볶음)
// 위 앞머리·꼬리 공유도 규칙만으로는 "계란국 → 계란빵"이 0.75로 통과해버린다(실측: 그래서 급식
// 트레이의 계란국이 158kcal/100g짜리 빵으로 계산돼 한 그릇 474kcal이 나왔다).
// 그래서 양쪽 다 알아볼 수 있는 꼬리를 갖고 있고 그 꼬리가 다르면, 다른 검사를 하기 전에 잘라낸다.
// 긴 꼬리를 먼저 봐야 한다 — '국수'가 '국'으로, '케이크'가 '크'로 읽히면 안 된다.
const DISH_TYPE_TAILS = [
  '샌드위치', '샐러드', '케이크', '스파게티', '햄버거', '장아찌', '국수', '찌개', '전골', '볶음', '조림', '튀김',
  '무침', '절임', '강정', '만두', '김치', '주스', '우유', '피자', '버거', '구이', '수프', '스프', '국', '탕',
  '죽', '밥', '면', '빵', '떡', '찜', '전', '차',
]

function dishTypeTail(name) {
  return DISH_TYPE_TAILS.find((tail) => name.endsWith(tail)) ?? null
}

// 식약처 변형명은 `_`로 마디를 나누는데, **그 마디의 순서가 우리말 어순과 반대인 경우가 많다**:
//   샌드위치_바삭몬테크리스토  ↔  몬테크리스토샌드위치
//   김치찌개_돼지고기          ↔  돼지고기김치찌개
// 앞뒤 관계(endsWith/startsWith)나 앞머리·꼬리 공유도는 **순서**를 전제하므로 이런 쌍을 전부 0점으로
// 떨어뜨린다. 그래서 `_`가 있는 후보에 한해 순서를 무시하고 **글자 구성**만 비교한다.
//
// `_` 후보로 한정하는 게 중요하다 — 일반 이름에까지 순서 무시를 허용하면 `우유`↔`유우` 같은 것까지
// 통과한다. 변형명은 "같은 재료를 어떤 순서로 적었나"의 문제라는 게 확실한 경우에만 쓴다.
const UNORDERED_MIN_DICE = 0.8

function charCounts(text) {
  const counts = new Map()
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  return counts
}

// 글자 다중집합 Dice 계수(0~1) — 순서를 무시하고 "같은 글자를 얼마나 공유하는가"만 본다.
function unorderedCharDice(a, b) {
  const ca = charCounts(a)
  const cb = charCounts(b)
  let shared = 0
  for (const [ch, n] of ca) shared += Math.min(n, cb.get(ch) ?? 0)
  return (2 * shared) / (a.length + b.length)
}

// 이 이상이면 "오타 하나 수준"으로 본다. 자모 해상도라 받침 하나 차이가 0.9 근처로 남는다.
// 낮추면 안 된다 — 실측 확인: 라면↔라면땅 0.63, 된장↔된장찌개 0.55, 계란국↔계란빵 0.63으로,
// 0.85는 그 전부보다 확실히 위다(오타만 잡고 다른 음식은 안 잡는 경계).
const JAMO_TYPO_THRESHOLD = 0.85

// 반환: { ratio, prefix, suffix } — 앞머리·꼬리를 각각 몇 글자 공유했는지까지 알려준다.
// 비율만으로는 "앞뒤를 고르게 공유(꽁치조림)"와 "꼬리만 공유(김자반)"를 구분할 수 없어서다.
function commonAffix(a, b) {
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a
  let prefix = 0
  while (prefix < shorter.length && a[prefix] === b[prefix]) prefix += 1
  let suffix = 0
  while (suffix < shorter.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix += 1
  return { ratio: Math.min(prefix + suffix, shorter.length) / longer.length, prefix, suffix }
}

// 한국어 음식명 유사도(0~1). 핵심 직관: 한국어 복합 음식명은 핵심 음식명이 **뒤**에 온다
// ("돌솥비빔밥", "참치김치찌개"). 그래서
//   - 긴 쪽이 짧은 쪽으로 "끝나면"(접두 수식어 변형) 같은 음식일 가능성이 높고     → 높은 점수
//   - 긴 쪽이 짧은 쪽으로 "시작하면"("라면"→"라면땅", "김밥"→"김밥천국") 다른 음식 → 낮은 점수
//   - 중간 포함은 그 사이의 애매한 경우                                            → 낮은 점수
// 여기에 위 두 예외(DB 변형명·조리법 접미사)를 얹는다 — startsWith를 통째로 완화하는 게 아니라,
// 실제로 같은 음식임이 확인된 두 패턴만 끌어올린다("라면"→"라면땅"은 여전히 탈락해야 한다).
// 순수 함수라 테스트로 기준을 고정한다(fooddb.test.js).
export function foodNameSimilarity(searchName, resultName) {
  const a = normalizeName(searchName)
  const b = normalizeName(resultName)
  if (!a || !b) return 0
  if (a === b) return 1

  // 음식 종류가 다르면(국 vs 빵) 앞머리가 아무리 같아도 다른 음식이다 — 다른 판정보다 먼저 자른다.
  // ⚠️ **veto는 절대적이다.** 아래 어떤 신호도 이 0을 되돌리지 못한다(그래서 여기서 즉시 반환한다).
  // 자모 유사도나 순서 무시 비교를 max()로 얹으면 계란국→계란빵이 되살아난다.
  const tailA = dishTypeTail(a)
  const tailB = dishTypeTail(b)
  if (tailA && tailB && tailA !== tailB) return 0

  // ⚠️ 식약처 변형명 `기본명_수식어`에서 **음식의 정체는 `_` 앞**이다. 이걸 무시하고 전체 문자열에
  // endsWith를 걸면 `햄버거_치킨`이 "치킨의 접두 수식어 변형"으로 읽혀 0.80을 받는다 — 실제로는
  // 햄버거다. 같은 이유로 `김치찌개_돼지고기`가 검색어 "돼지고기"에 붙는다. 그래서 `_`가 있는 쪽은
  // **기본명만** 순서 규칙에 태우고, 수식어까지 포함한 비교는 아래 순서 무시 규칙에 맡긴다.
  const baseA = a.split(DB_VARIANT_SEPARATOR)[0]
  const baseB = b.split(DB_VARIANT_SEPARATOR)[0]
  const hasVariant = a.includes(DB_VARIANT_SEPARATOR) || b.includes(DB_VARIANT_SEPARATOR)

  const shorter = baseA.length <= baseB.length ? baseA : baseB
  const longer = baseA.length <= baseB.length ? baseB : baseA
  const lengthRatio = shorter.length / longer.length

  // null = 두 기본명 사이에 앞뒤 관계가 **전혀** 없다는 뜻. 0점과 구분해야 한다 — 관계가 있는데
  // 점수가 낮은 것(라면→라면땅 0.2)은 "다른 음식"이라는 판정이므로, 뒤의 완화 규칙으로 되살리면 안 된다.
  let ordered = null
  if (baseA === baseB) {
    // 기본명이 같고 한쪽에만 수식어가 붙은 경우(김치찌개 ↔ 김치찌개_돼지고기) — 같은 음식의 변형이다.
    // 전체 길이 비로 점수를 매겨, 수식어가 길수록(= 더 특정된 레코드일수록) 조금 낮게 준다.
    ordered = hasVariant ? 0.7 + 0.3 * (Math.min(a.length, b.length) / Math.max(a.length, b.length)) : 1
  } else if (longer.endsWith(shorter)) {
    ordered = 0.7 + 0.3 * lengthRatio
  } else if (longer.startsWith(shorter)) {
    const rest = longer.slice(shorter.length)
    ordered = COOKING_METHOD_SUFFIXES.includes(rest) ? COOKING_METHOD_SCORE : 0.3 * lengthRatio
  } else if (longer.includes(shorter)) {
    ordered = 0.4 * lengthRatio
  }
  if (ordered !== null && ordered >= FOOD_MATCH_SIMILARITY_THRESHOLD) return ordered

  // 식약처 변형명(`_` 포함)은 마디 순서가 우리말 어순과 반대일 수 있어, 순서를 무시하고 글자 구성만 본다.
  if (hasVariant) {
    const dice = unorderedCharDice(a.replaceAll(DB_VARIANT_SEPARATOR, ''), b.replaceAll(DB_VARIANT_SEPARATOR, ''))
    if (dice >= UNORDERED_MIN_DICE) {
      return FOOD_MATCH_SIMILARITY_THRESHOLD + (1 - FOOD_MATCH_SIMILARITY_THRESHOLD) * ((dice - UNORDERED_MIN_DICE) / (1 - UNORDERED_MIN_DICE))
    }
  }

  // 순수 오탈자 구제 — 자모 해상도로 봤을 때 "한 글자 어긋난 정도"면 같은 음식으로 본다.
  // 음절 단위로는 `닭갈비`↔`닥갈비`가 33% 손실로 보이지만 자모로는 12%다(hangul.js 주석 참고).
  if (jamoSimilarity(a, b) >= JAMO_TYPO_THRESHOLD) return COOKING_METHOD_SCORE

  // ⚠️ 앞뒤 관계가 **하나라도 있었으면** 그 판정이 최종이다. 앞머리·꼬리 공유도는 관계가 전혀 없을
  // 때만 쓰는 최후 규칙이다 — 이걸 지키지 않으면 `라면`→`라면땅`이 앞머리를 100% 공유한다는 이유로
  // 0.75를 받아 되살아난다(startsWith로 이미 "다른 음식"이라 판정한 것을 뒤집는 셈).
  if (ordered !== null) return ordered

  // 0.6에서 정확히 통과선(0.7)을 넘도록 매핑해, 점수 크기 비교(pickBestFoodMatch)도 그대로 쓸 수 있게 한다.
  const { ratio, prefix } = commonAffix(a, b)
  const minRatio = prefix > 0 ? AFFIX_MIN_RATIO : SUFFIX_ONLY_MIN_RATIO
  if (ratio >= minRatio) {
    return FOOD_MATCH_SIMILARITY_THRESHOLD + (1 - FOOD_MATCH_SIMILARITY_THRESHOLD) * ((ratio - AFFIX_MIN_RATIO) / (1 - AFFIX_MIN_RATIO))
  }
  return 0.4 * ratio
}

// 이 값 이상이어야 비정확 매칭을 인정한다. endsWith(접두 수식어 변형)는 항상 0.7 초과라 통과하고,
// startsWith/중간 포함(최대 0.3/0.4)은 전부 탈락하도록 설계된 경계값. 완화가 필요하면 이 값만 낮추면 된다.
export const FOOD_MATCH_SIMILARITY_THRESHOLD = 0.7

// baseQuantity(보통 100g/100ml)가 100이 아닌 항목이 섞여 있어도 공정하게 평균 내기 위해 "100 기준"으로 환산한다.
function nutrientsPerHundred(match) {
  const base = match.baseQuantity?.value > 0 ? match.baseQuantity.value : 100
  const factor = 100 / base
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const value = match.nutrients?.[key]
      return [key, typeof value === 'number' ? value * factor : null]
    }),
  )
}

function averageNutrientSets(nutrientSets) {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const values = nutrientSets.map((n) => n[key]).filter((v) => typeof v === 'number')
      return [key, values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null]
    }),
  )
}

// 같은 이름으로 여러 항목이 매칭되면(학교급식/외식 등 레시피별 변형) 임의로 첫 항목만 쓰지 않고 평균해서
// 더 대표성 있는 표준값을 만든다. 항목 하나를 그대로 고르는 것보다 레시피 변형 간 편차(예: 저지방 급식
// 레시피 vs 고지방 외식 레시피)로 인한 오차를 줄여준다.
function averageFoodMatches(exactMatches) {
  return {
    name: exactMatches[0].name,
    baseQuantity: { value: 100, unit: exactMatches[0].baseQuantity?.unit ?? 'g', raw: null },
    servSize: null,
    foodSize: null,
    brand: null,
    nutrients: averageNutrientSets(exactMatches.map(nutrientsPerHundred)),
  }
}

// searchFoodDB 결과 중 가장 적합한 항목 선택: 검색어와 이름이 정확히 일치(공백 무시)하는 항목들을
// 우선한다. averageExactMatches가 true면(음식/조리식 DB) 이름이 일치하는 항목이 여럿일 때 평균값을
// 쓰고, false면(가공식품 DB — 이름이 같아도 서로 다른 브랜드 제품일 수 있어 평균하면 실존하지 않는
// 값이 나올 수 있다) 첫 번째 일치 항목을 그대로 쓴다.
//
// 정확 일치가 없으면 유사도 검증을 거친다 — 예전엔 results[0]을 무조건 썼는데, 그러면 업스트림이
// 부분일치 결과를 돌려주는 순간 "라면" 검색에 "라면땅"이 조용히 선택될 수 있다. 기준 미달이면 매칭
// 실패(null)로 처리해 호출부의 다음 폴백 단계로 넘긴다.
//
// onDebug: 개발 빌드 진단 로그를 붙이고 싶을 때만 주입한다(이 모듈 자체는 import.meta.env를 모른다 —
// 그래야 서버에서도 import할 수 있다).
export function pickBestFoodMatch(results, searchName, { averageExactMatches = false, onDebug } = {}) {
  if (!Array.isArray(results) || results.length === 0) return null

  const target = normalizeName(searchName)
  const exact = results.filter((r) => normalizeName(r.name) === target)
  if (exact.length === 1 || (exact.length > 1 && !averageExactMatches)) return exact[0]
  if (exact.length > 1) return averageFoodMatches(exact)

  let best = null
  let bestScore = 0
  for (const r of results) {
    const score = foodNameSimilarity(searchName, r.name)
    if (score > bestScore) {
      best = r
      bestScore = score
    }
  }
  const accepted = bestScore >= FOOD_MATCH_SIMILARITY_THRESHOLD
  onDebug?.(results, best, bestScore, accepted)
  return accepted ? best : null
}
