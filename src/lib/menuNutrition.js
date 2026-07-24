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

// 이번 라운드에서 메뉴 DB 조회를 기다려줄 상한. 넘기면 이 라운드는 AI 추정치를 쓰되, 조회 자체는
// 백그라운드에서 계속 진행돼 캐시를 채운다(다음 라운드는 즉시 캐시 히트). 서버의 식약처 타임아웃
// (5초, 키 방식 재시도 포함 최대 ~10초)보다 짧아 추천 전체가 붙잡히지 않는다.
const MENU_DB_TIMEOUT_MS = 3000

// 식약처 연결 자체가 안 되는 상황(FOODDB_CONNECTION_FAILED — 일부 배포 리전)에서 검색 라운드마다
// 타임아웃 비용을 반복 지불하지 않도록, 판명 후 일정 시간 DB 보강 전체를 건너뛰는 쿨다운.
// 연결 실패 신호는 서버 타임아웃 후에야 도착해 그 라운드의 3초 대기에는 늦지만, 캐시된 promise가
// 그 결과를 받아 이 값을 세팅하므로 다음 라운드부터 작동한다.
const FOODDB_DOWN_COOLDOWN_MS = 5 * 60 * 1000
let fooddbDownUntil = 0

const NUTRIENT_KEYS = NUTRIENT_LABELS.map((n) => n.key)

// 같은 메뉴명은 세션 동안 한 번만 조회하는 메모리 캐시. **진행 중 promise를 저장**해 같은 배치에
// 동일 대표 메뉴가 여럿이어도 중복 병렬 호출이 나가지 않는다.
// resolve 값: { baseValue, nutrients, grams, term } (조회 성공) | null (결과 없음 — 재검색해도 없으니 유지).
// reject(네트워크 오류)는 캐시에서 지워 다음 라운드에 재시도한다.
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
// 캐시에 진행 중 promise를 먼저 넣어 같은 배치의 동일 메뉴가 중복 조회되지 않게 한다.
function lookupMenuFromDB(menuName) {
  if (menuCache.has(menuName)) return menuCache.get(menuName)
  const promise = doLookupMenu(menuName)
  menuCache.set(menuName, promise)
  // 네트워크 오류는 "결과 없음"과 달리 확정이 아니므로 캐시에서 지워 다음 라운드에 재시도한다.
  promise.catch(() => menuCache.delete(menuName))
  return promise
}

async function doLookupMenu(menuName) {
  const attempts = [...new Set([menuName, getCanonicalName(menuName)].filter(Boolean))]
  for (const term of attempts) {
    const grams = standardServingGrams(term) ?? standardServingGrams(menuName)
    if (!grams) continue // 표준 1인분을 모르는 음식 — DB 100g값을 환산할 근거가 없어 AI 추정 유지
    try {
      const results = await searchFoodDB(term, 'food')
      const match = pickBestFoodMatch(results, term, { averageExactMatches: true })
      if (match) {
        const baseValue = match.baseQuantity?.value > 0 ? match.baseQuantity.value : 100
        return { baseValue, nutrients: match.nutrients, grams, term }
      }
    } catch (err) {
      if (err.code === 'FOODDB_CONNECTION_FAILED') {
        // 연결 자체가 안 되는 상황 — 이후 라운드의 DB 보강을 쿨다운 동안 통째로 쉬게 한다.
        fooddbDownUntil = Date.now() + FOODDB_DOWN_COOLDOWN_MS
      }
      throw err
    }
  }
  return null // 결과 없음은 세션 동안 확정 — 캐시에 남아 반복 조회를 막는다
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

  // 연결 실패 쿨다운 중 — 호출 없이 즉시 (보정된) AI 추정을 유지한다.
  if (Date.now() < fooddbDownUntil) {
    if (import.meta.env.DEV) console.log('[메뉴영양 진단] 식약처 연결 실패 쿨다운 중 — DB 보강 건너뜀')
    return items.map((item) => (item?.expected && getMenuName(item) ? { ...item, expectedSource: 'ai' } : item))
  }

  const startedAt = Date.now()

  const enriched = await Promise.all(
    items.map(async (item) => {
      const menuName = getMenuName(item)
      if (!item?.expected || !menuName) return item
      // 이번 라운드의 대기만 3초로 자른다 — 조회 promise는 계속 진행돼 캐시를 채우고,
      // 타임아웃·오류 시 이 항목은 AI 추정을 유지한다(부분 실패 허용).
      const found = await withTimeout(lookupMenuFromDB(menuName), MENU_DB_TIMEOUT_MS).catch(() => null)
      if (!found) return { ...item, expectedSource: 'ai' }
      return { ...item, expected: mergeExpected(item.expected, found, menuName), expectedSource: 'db' }
    }),
  )

  if (import.meta.env.DEV) {
    const dbCount = enriched.filter((i) => i.expectedSource === 'db').length
    console.log(`[메뉴영양 진단] ${items.length}개 중 ${dbCount}개 식약처DB 매칭, ${Date.now() - startedAt}ms`)
  }

  return enriched
}
