// 6주차 §0 — server/data/foodDB.json(scripts/buildFoodDB.js가 생성) 기반 로컬 식품 매칭.
// 기존 /api/fooddb(findFoodMatch, 사진 분석용)는 요청마다 식약처 API를 실시간 호출하지만, 이 모듈은
// 서버 기동 시 1회 메모리에 올려두고 그 안에서만 찾는다 — precisionEngine(6주차 §1)이 요청마다
// 외부 API를 기다리지 않고 즉시 매칭하기 위한 것으로, 기존 findFoodMatch 경로와는 별개다.
//
// 매칭 순서(PRD): 정규화 → 완전일치 → 별칭 → 부분포함(긴 이름 우선) → 편집거리 ≤2.
// 이 전략 자체는 레시피DB(recipeLookup.js)와 공유하므로 nameMatcher.js로 뽑았다 — 이 파일은 이제
// "foodDB.json을 읽어 그 매처에 물리고, 응답 모양으로 변환"하는 역할만 한다(매칭 동작은 불변).
//
// ⚠️ 편집거리 단계는 오탈자 구제가 목적이라 의미가 다른 음식을 물어올 수 있다(실측: "치킨" →
// "제육(돼지고기 수육)", "파스타" → "토스트(식빵)"). 그래서 matchType을 반드시 함께 반환하며,
// 호출부는 'fuzzy'를 무검증으로 채택하면 안 된다 — resolveFood.js가 유사도 재검증으로 거른다.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCanonicalName } from '../../src/lib/foodData.js'
import { createNameMatcher } from './nameMatcher.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FOOD_DB_PATH = path.join(__dirname, '..', 'data', 'foodDB.json')

let matcher = null // createNameMatcher(...)의 반환 함수 — 지연 로드

function load() {
  if (matcher) return
  const raw = JSON.parse(readFileSync(FOOD_DB_PATH, 'utf8'))
  matcher = createNameMatcher(raw.items, {
    getName: (item) => item.name,
    getAliases: (item) => item.aliases,
    getCanonicalName,
  })
}

// 서버 재기동 없이 foodDB.json을 다시 만들었을 때 테스트/스크립트에서 강제로 다시 읽고 싶을 때만 사용.
export function _resetForTest() {
  matcher = null
}

// FR-8 — /api/fooddb의 기존 응답 모양(normalizeFoodItem 참고 — name/baseQuantity/servSize/foodSize/
// brand/nutrients)에 맞춰 이 모듈의 item(nutrientsPer100 등)을 변환한다. findFoodMatch(Analyze.jsx)의
// 나머지 7단계가 전부 이 모양을 기대하므로, 로컬 폴백만 다른 모양을 쓰면 호출부를 또 분기해야 한다.
export function toFoodItemResponse(item) {
  return {
    name: item.name,
    baseQuantity: 100, // nutrientsPer100 기준
    servSize: item.servingGram ?? null,
    foodSize: null,
    brand: null,
    nutrients: item.nutrientsPer100,
  }
}

// 반환: { item, matchType: 'exact'|'alias'|'partial'|'fuzzy' } | null
export function lookupFood(menuName) {
  load()
  return matcher(menuName)
}
