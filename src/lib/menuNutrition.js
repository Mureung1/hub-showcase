// 식당·메뉴 추천의 "예상 섭취량(expected)" 품질 보강 — 2단계 구조.
//
//   1단계 clampExpectedForItems: AI 추정치를 사진 경로와 같은 현실 범위(foodData.js)로 보정.
//     추가 네트워크 비용 0. 항상 적용된다.
//   2단계 enrichExpectedFromDB: 대표 메뉴명을 식약처 조리식 DB에서 조회해 실측 기반 수치로 대체.
//     병렬 조회 + 세션 캐시 + 개별 타임아웃 + 부분 실패 허용으로 속도를 지킨다.
//     USE_DB_FOR_MENU_NUTRITION 플래그 하나로 끄면 1단계만 남는다(속도 문제 시 회귀 스위치).
//
// MapPage(식당 대표 메뉴)와 Result(보충 추천 메뉴)가 모양이 다른 항목을 넘기므로, 메뉴명을 꺼내는
// getMenuName 함수를 받아 제네릭하게 동작한다. 항목 원본은 변형하지 않고 새 객체를 반환한다.
import { pickBestFoodMatch, searchFoodDB } from './fooddb.js'
import { getCanonicalName, getPlausibility, getPortionRange } from './foodData.js'
import { clampToPlausibleNutrients, clampToStandardPlausibleNutrients, NUTRIENT_LABELS, scaleNutrients } from './nutrition.js'

// 속도 문제가 생기면 false로 — 2단계(DB 조회)만 꺼지고 1단계 보정은 유지된다.
export const USE_DB_FOR_MENU_NUTRITION = true

// 개별 메뉴 DB 조회가 이보다 오래 걸리면 포기하고 AI 추정치를 유지한다.
// (서버의 식약처 타임아웃 5초보다 짧게 잡아, 추천 전체가 붙잡히지 않게 한다.)
const MENU_DB_TIMEOUT_MS = 3000

const NUTRIENT_KEYS = NUTRIENT_LABELS.map((n) => n.key)

// 같은 메뉴명은 세션 동안 한 번만 조회하는 메모리 캐시.
// 값: { baseValue, nutrients, grams } (조회 성공) | null (결과 없음 — 재검색해도 없으니 캐시).
// 네트워크 오류는 캐시하지 않는다(다음 검색에서 재시도).
const menuCache = new Map()

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

// ── 2단계: 식약처 DB 조회 ─────────────────────────────────────────────────────

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('menu DB lookup timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

// 메뉴의 "표준 1인분" 무게(g). 현실 범위의 기준 무게(referenceGrams)가 가장 정확하고,
// 없으면 1인분 무게 범위의 중앙값. 둘 다 없으면 null — DB 100g값을 환산할 근거가 없어 조회를 접는다.
function standardServingGrams(menuName) {
  const ref = getPlausibility(menuName)?.referenceGrams
  if (ref > 0) return ref
  const range = getPortionRange(menuName)
  if (range) return Math.round((range.min + range.max) / 2)
  return null
}

// 메뉴명 하나를 조리식 DB에서 조회(메뉴명 → 정규화 표준명 순). 식당 메뉴라 가공식품 DB는 보지 않는다.
// state.connectionFailed: 식약처 연결 자체가 안 되면 이후 시작되는 조회·재검색을 건너뛴다.
// (배치가 병렬로 이미 시작한 조회들은 각자 MENU_DB_TIMEOUT_MS 안에 끝나므로 전체 지연은 3초로 유계.)
async function lookupMenuFromDB(menuName, state) {
  if (menuCache.has(menuName)) return menuCache.get(menuName)
  if (state.connectionFailed) return null

  const attempts = [...new Set([menuName, getCanonicalName(menuName)].filter(Boolean))]
  for (const term of attempts) {
    const grams = standardServingGrams(term) ?? standardServingGrams(menuName)
    if (!grams) continue // 표준 1인분을 모르는 음식 — AI 추정 유지가 안전하다
    try {
      const results = await withTimeout(searchFoodDB(term, 'food'), MENU_DB_TIMEOUT_MS)
      const match = pickBestFoodMatch(results, term, { averageExactMatches: true })
      if (match) {
        const baseValue = match.baseQuantity?.value > 0 ? match.baseQuantity.value : 100
        const found = { baseValue, nutrients: match.nutrients, grams, term }
        menuCache.set(menuName, found)
        return found
      }
    } catch (err) {
      if (err.code === 'FOODDB_CONNECTION_FAILED') {
        state.connectionFailed = true
        return null
      }
      // 타임아웃·일시 오류: 이 메뉴만 포기(캐시하지 않음), 나머지는 계속
      console.error(`menu DB lookup failed (${term}):`, err.message)
      return null
    }
  }

  menuCache.set(menuName, null) // 결과 없음은 세션 동안 확정 — 반복 조회 방지
  return null
}

// DB 수치(있는 키만)로 AI expected를 덮어쓰고, 최종적으로 현실 범위 보정을 한 번 더 거친다.
function mergeExpected(aiExpected, dbFound, menuName) {
  const scaled = scaleNutrients(dbFound.nutrients, dbFound.baseValue, dbFound.grams)
  const merged = { ...aiExpected }
  for (const key of NUTRIENT_KEYS) {
    if (typeof scaled[key] === 'number') merged[key] = scaled[key]
  }
  return clampToPlausibleNutrients(merged, dbFound.term || menuName, dbFound.grams)
}

// items 각각의 대표 메뉴를 병렬로 DB 조회해 expected를 실측 기반으로 보강한다.
// 결과 항목에 expectedSource('db'|'ai')를 남긴다 — 지금 화면엔 배지를 그리지 않지만(카드가 이미
// 대표메뉴·수치·추천이유로 빽빽해 정보 과잉), 출처 표시가 필요해지면 이 값으로 바로 그릴 수 있다.
// 일부 실패해도 나머지는 정상 반환한다(Promise.all이지만 개별 catch가 있어 reject되지 않는다).
export async function enrichExpectedFromDB(items, getMenuName) {
  if (!USE_DB_FOR_MENU_NUTRITION || !items || items.length === 0) return items

  const startedAt = Date.now()
  const state = { connectionFailed: false }

  const enriched = await Promise.all(
    items.map(async (item) => {
      const menuName = getMenuName(item)
      if (!item?.expected || !menuName) return item
      const found = await lookupMenuFromDB(menuName, state).catch(() => null)
      if (!found) return { ...item, expectedSource: 'ai' }
      return { ...item, expected: mergeExpected(item.expected, found, menuName), expectedSource: 'db' }
    }),
  )

  if (import.meta.env.DEV) {
    const dbCount = enriched.filter((i) => i.expectedSource === 'db').length
    console.log(
      `[메뉴영양 진단] ${items.length}개 중 ${dbCount}개 식약처DB 매칭, ${Date.now() - startedAt}ms` +
        (state.connectionFailed ? ' (식약처 연결 실패 → 나머지 AI 추정 유지)' : ''),
    )
  }

  return enriched
}
