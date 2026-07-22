// 광고 추천 로직(src/utils/adRecommendation.js) 자체 검증 스크립트.
//
//   npm run check:ads
//
// 이 저장소에는 테스트 러너가 없어서(package.json에 test 스크립트/테스트 파일 없음), 별도 프레임워크
// 없이 노드로 바로 돌아가는 단언 스크립트로 대신한다 — 추천 함수가 순수 함수라 브라우저 API에 전혀
// 의존하지 않아 이게 가능하다. 실패하면 종료 코드 1로 끝나므로 CI에 그대로 붙일 수 있다.
//
// 검증하는 것(PRD v2.0 §3.2 / 3.4 수용 기준):
//   · 기록이 없으면 폴백 목록 기반으로 2~3개가 나온다(배너가 비지 않는다)
//   · 실측 부족 영양소가 있으면 그 영양소 상품이 달성률 낮은 순으로 나온다
//   · 기록이 있어도 전부 달성했으면 폴백으로 내려간다
//   · 나트륨은 초과해도 절대 광고로 나오지 않는다
//   · 폴백은 날짜에 따라 순환하되, 같은 날에는 항상 같은 결과가 나온다(렌더마다 흔들리지 않음)
//   · 어떤 입력에도 빈 배열을 반환하지 않는다

import { recommendAdProducts, MAX_AD_PRODUCTS } from '../src/utils/adRecommendation.js'
import { AD_NUTRIENTS, COUPANG_PRODUCTS, FALLBACK_NUTRIENT_ORDER } from '../src/data/coupangProducts.js'

let failed = 0
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const RECOMMENDED = { calories: 2200, protein: 110, carbs: 275, fat: 73, fiber: 30, sodium: 2000 }
const nutrientsOf = (result) => result.products.map((p) => p.nutrient)

console.log('\n[데이터 파일 무결성]')
{
  const ids = COUPANG_PRODUCTS.map((p) => p.id)
  check('상품 id가 중복되지 않음', new Set(ids).size === ids.length)
  check(
    '모든 상품의 nutrient가 AD_NUTRIENTS에 정의돼 있음',
    COUPANG_PRODUCTS.every((p) => p.nutrient in AD_NUTRIENTS),
    COUPANG_PRODUCTS.filter((p) => !(p.nutrient in AD_NUTRIENTS)).map((p) => p.id).join(', '),
  )
  check(
    '폴백 영양소 6개 모두 상품이 최소 1개씩 매핑됨',
    FALLBACK_NUTRIENT_ORDER.every((key) => COUPANG_PRODUCTS.some((p) => p.nutrient === key)),
  )
  check(
    '모든 상품에 productName/price/partnersUrl이 채워져 있음',
    COUPANG_PRODUCTS.every((p) => p.productName && Number.isFinite(p.price) && p.partnersUrl),
  )
  check('나트륨(sodium) 상품은 없음 — 한도형이라 보충 대상이 아님', !COUPANG_PRODUCTS.some((p) => p.nutrient === 'sodium'))
  check(
    '의약품 오인 표현(치료/예방/개선 보장)이 상품명에 없음',
    !COUPANG_PRODUCTS.some((p) => /치료|예방|개선\s*보장/.test(p.productName)),
  )
}

console.log('\n[2순위 — 폴백: 기록이 없을 때]')
{
  const noMeals = recommendAdProducts({ recommended: RECOMMENDED, total: null, mealCount: 0, dateKey: '2026-07-22' })
  check('source === "fallback"', noMeals.source === 'fallback', noMeals.source)
  check('2~3개 노출', noMeals.products.length >= 2 && noMeals.products.length <= MAX_AD_PRODUCTS, `${noMeals.products.length}개`)
  check('전부 폴백 목록 영양소', nutrientsOf(noMeals).every((n) => FALLBACK_NUTRIENT_ORDER.includes(n)), nutrientsOf(noMeals).join(', '))

  const noProfile = recommendAdProducts({ recommended: null, total: { protein: 10 }, mealCount: 3, dateKey: '2026-07-22' })
  check('신체정보(권장량)가 없어도 폴백으로 노출', noProfile.source === 'fallback' && noProfile.products.length >= 2)

  const empty = recommendAdProducts({})
  check('인자를 아무 것도 안 줘도 빈 배열이 아님', empty.products.length >= 2, `${empty.products.length}개`)
}

console.log('\n[2순위 — 폴백 순환]')
{
  const a = recommendAdProducts({ mealCount: 0, dateKey: '2026-07-22' })
  const b = recommendAdProducts({ mealCount: 0, dateKey: '2026-07-22' })
  check('같은 날짜면 항상 같은 결과(렌더마다 흔들리지 않음)', JSON.stringify(nutrientsOf(a)) === JSON.stringify(nutrientsOf(b)))

  const seen = new Set()
  for (let d = 1; d <= 28; d++) {
    const key = `2026-07-${String(d).padStart(2, '0')}`
    seen.add(nutrientsOf(recommendAdProducts({ mealCount: 0, dateKey: key })).join('|'))
  }
  check('한 달을 돌리면 조합이 2가지 이상 나온다(순환 동작)', seen.size >= 2, `${seen.size}가지`)

  const vitaminDFirstDays = ['2026-01-01', '2026-07-22', '2026-12-31'].filter(
    (k) => nutrientsOf(recommendAdProducts({ mealCount: 0, dateKey: k }))[0] === 'vitaminD',
  )
  console.log(`    (참고) 비타민D가 첫 카드인 날: ${vitaminDFirstDays.join(', ') || '없음'} — 순환이라 날짜별로 달라지는 게 정상`)
}

console.log('\n[1순위 — 실측 부족 영양소]')
{
  // 단백질 18%, 식이섬유 20%, 나머지는 충분 → 단백질/식이섬유 순으로 나와야 한다.
  const total = { calories: 2000, protein: 20, carbs: 260, fat: 70, fiber: 6, sodium: 1800 }
  const result = recommendAdProducts({ recommended: RECOMMENDED, total, mealCount: 2, dateKey: '2026-07-22' })

  check('source === "deficiency"', result.source === 'deficiency', result.source)
  check('달성률이 가장 낮은 단백질이 첫 번째', nutrientsOf(result)[0] === 'protein', nutrientsOf(result).join(', '))
  check('두 번째는 식이섬유', nutrientsOf(result)[1] === 'fiber', nutrientsOf(result).join(', '))
  check('최대 3개까지만', result.products.length <= MAX_AD_PRODUCTS, `${result.products.length}개`)
}

console.log('\n[1순위 — 나트륨 제외 / 전부 달성 시 폴백]')
{
  // 나트륨만 크게 초과, 나머지는 전부 달성 → 부족 영양소 0개 → 폴백으로 내려가야 한다.
  const total = { calories: 2200, protein: 115, carbs: 280, fat: 75, fiber: 32, sodium: 5000 }
  const result = recommendAdProducts({ recommended: RECOMMENDED, total, mealCount: 3, dateKey: '2026-07-22' })

  check('나트륨은 광고로 나오지 않음', !nutrientsOf(result).includes('sodium'), nutrientsOf(result).join(', '))
  check('전부 달성했으면 폴백으로 내려감', result.source === 'fallback', result.source)
  check('그래도 배너는 비지 않음', result.products.length >= 2, `${result.products.length}개`)
}

console.log('\n[경계값]')
{
  // 달성률 정확히 80%(NUTRIENT_SATISFY_RATIO)는 "부족"이 아니다 — 식단 탭의 판정 기준과 같아야 한다.
  // 지방만 80%가 아니라 82%로 둔 이유: 73 × 0.8 = 58.400000000000006이라 58.4/73은 이진 부동소수점에서
  // 0.7999999999999999가 되어 "정확히 80%"를 표현할 수 없다. 앱의 다른 화면(nutrition.js의
  // classifyNutrientStatus)도 동일한 비율 비교를 쓰므로 이 오차 특성은 앱 전체가 공유한다 — 여기서만
  // 다르게 처리하면 오히려 어긋난다. 그래서 경계 검증은 정확히 표현 가능한 값들로만 한다.
  const exactly80 = { calories: 1760, protein: 88, carbs: 220, fat: 60, fiber: 24, sodium: 1000 }
  const result = recommendAdProducts({ recommended: RECOMMENDED, total: exactly80, mealCount: 1, dateKey: '2026-07-22' })
  check('달성률 80%는 부족으로 치지 않음(폴백으로 내려감)', result.source === 'fallback', `${result.source}: ${nutrientsOf(result).join(', ')}`)

  const just79 = { ...exactly80, protein: 86 } // 78.2%
  const result2 = recommendAdProducts({ recommended: RECOMMENDED, total: just79, mealCount: 1, dateKey: '2026-07-22' })
  check('달성률 79%는 부족으로 잡힘', result2.source === 'deficiency' && nutrientsOf(result2)[0] === 'protein', nutrientsOf(result2).join(', '))
}

console.log('')
if (failed > 0) {
  console.error(`실패 ${failed}건`)
  process.exit(1)
}
console.log('전부 통과\n')
