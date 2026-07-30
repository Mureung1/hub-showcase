// 식당·메뉴 추천의 "예상 섭취량(expected)" 품질 보강 — 2단계 구조.
//
//   1단계 clampExpectedForItems: AI 추정치를 사진 경로와 같은 현실 범위(foodData.js)로 보정.
//     추가 네트워크 비용 0. 항상 적용된다.
//   2단계 enrichExpectedFromDB: 대표 메뉴명을 통합 해석 엔진(/api/resolve-food)에 **한 번에** 넘겨
//     실측 기반 수치로 대체. 서버가 로컬 음식DB·레시피DB·원격 식약처DB를 함께 보고 자체 데드라인을
//     지키므로, 예전에 이 파일이 들고 있던 세션 캐시·개별 타임아웃·연결실패 쿨다운은 전부 서버로
//     옮겨졌다(인플라이트 중복제거 + 네거티브 캐싱, server/proxy.js의 lookupFoodSafety 참고).
//     USE_DB_FOR_MENU_NUTRITION 플래그 하나로 끄면 1단계만 남는다(속도 문제 시 회귀 스위치).
//
// MapPage(식당 대표 메뉴)와 Result(보충 추천 메뉴)가 모양이 다른 항목을 넘기므로, 메뉴명을 꺼내는
// getMenuName 함수를 받아 제네릭하게 동작한다. 항목 원본은 변형하지 않고 새 객체를 반환한다.
import { clampToPlausibleNutrients, clampToStandardPlausibleNutrients, NUTRIENT_LABELS, scaleNutrients } from './nutrition.js'
import { resolveFoodItems as resolveFoodItemsApi } from './resolveFood.js'

// 속도 문제가 생기면 false로 — 2단계(DB 조회)만 꺼지고 1단계 보정은 유지된다.
export const USE_DB_FOR_MENU_NUTRITION = true

const NUTRIENT_KEYS = NUTRIENT_LABELS.map((n) => n.key)

// ── 1단계: 현실 범위 보정 ──────────────────────────────────────────────────────
// AI가 낸 expected를 foodData의 표준 1인분 범위로 보정한다(짜장면 단백질 40g 같은 튀는 값 방지).
// 메뉴명이 테이블에 없으면 원본 그대로 — 없는 값을 만들어내지 않는다.
export function clampExpectedForItems(items, getMenuName) {
  return (items || []).map((item) => {
    const menuName = getMenuName(item)
    if (!item?.expected || !menuName) return item
    return { ...item, expected: clampToStandardPlausibleNutrients(item.expected, menuName) }
  })
}

// ── 2단계: 통합 해석 엔진 조회 ────────────────────────────────────────────────

// DB 수치(있는 키만)로 AI expected를 덮어쓰고, 최종적으로 현실 범위 보정을 한 번 더 거친다.
function mergeExpected(aiExpected, dbFound, menuName) {
  const scaled = scaleNutrients(dbFound.nutrients, dbFound.baseValue, dbFound.grams)
  const merged = { ...aiExpected }
  for (const key of NUTRIENT_KEYS) {
    if (typeof scaled[key] === 'number') merged[key] = scaled[key]
  }
  return clampToPlausibleNutrients(merged, dbFound.term || menuName, dbFound.grams)
}

// items 각각의 대표 메뉴를 **한 번의 요청**으로 해석해 expected를 실측 기반으로 보강한다.
// 결과 항목에 expectedSource('db'|'ai')를 남긴다 — 지금 화면엔 배지를 그리지 않지만(카드가 이미
// 대표메뉴·수치·추천이유로 빽빽해 정보 과잉), 출처 표시가 필요해지면 이 값으로 바로 그릴 수 있다.
// 해석에 실패한 항목만 AI 추정을 유지한다(부분 실패 허용).
//
// 예전엔 메뉴마다 순차로 식약처 음식DB만 조회했고, 그마저도 foodData.js(40개 표)에 표준 1인분이
// 없으면 조회 자체를 건너뛰어 식당 메뉴 대부분이 AI 추정치로 남았다. 이제 서버의 통합 해석 엔진이
// 로컬 음식DB(11,347건, servingGram 10,349건)와 레시피DB(1,141건)까지 함께 보므로 그 게이트가
// 필요 없다 — 표준 1인분도 서버가 servingGram으로 함께 돌려준다.
export async function enrichExpectedFromDB(items, getMenuName) {
  if (!USE_DB_FOR_MENU_NUTRITION || !items || items.length === 0) return items

  const startedAt = Date.now()

  // 해석 대상(대표 메뉴명과 expected가 둘 다 있는 항목)만 추려 요청한다.
  const targets = []
  for (const [index, item] of items.entries()) {
    const menuName = getMenuName(item)
    // 전국 체인이면 업체가 식약처에 제출한 공식 영양성분(출처코드 2)이 있을 가능성이 높다 — 그쪽을
    // 먼저 보게 'packaged'로 보낸다. 동네 식당은 그런 레코드가 없으니 외식 분석 평균이 맞다.
    if (item?.expected && menuName) targets.push({ index, menuName, servingContext: item.isFranchise ? 'packaged' : 'restaurant' })
  }
  if (targets.length === 0) return items

  // 지도 탭 식당 대표 메뉴 = 명백히 외식 맥락. 기본값도 'restaurant'지만, 이 경로가 급식으로
  // 잘못 붙으면 김치찌개가 19kcal/100g짜리 급식 국물 수치로 나오므로 의도를 코드에 남긴다.
  const resolved = await resolveFoodItemsApi(
    targets.map((t) => ({ dbSearchName: t.menuName, fallbackSearchName: t.menuName, servingContext: t.servingContext })),
    { context: 'restaurant' },
  )

  const byIndex = new Map()
  for (const [i, target] of targets.entries()) byIndex.set(target.index, resolved[i])

  const enriched = items.map((item, index) => {
    const found = byIndex.get(index)
    if (!found) return item
    const menuName = getMenuName(item)
    // 표준 1인분을 모르면 100g당 수치를 환산할 근거가 없다 — AI 추정을 그대로 둔다.
    if (!found.match || !(found.servingGram > 0)) return { ...item, expectedSource: 'ai' }

    const baseValue = found.match.baseQuantity?.value > 0 ? found.match.baseQuantity.value : 100
    const merged = mergeExpected(item.expected, { nutrients: found.match.nutrients, baseValue, grams: found.servingGram, term: found.matchedName }, menuName)
    return { ...item, expected: merged, expectedSource: 'db' }
  })

  if (import.meta.env.DEV) {
    const dbCount = enriched.filter((i) => i.expectedSource === 'db').length
    console.log(`[메뉴영양 진단] ${targets.length}개 중 ${dbCount}개 DB 매칭, ${Date.now() - startedAt}ms`)
  }

  return enriched
}
