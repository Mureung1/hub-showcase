// server/data/recipeDB.json(scripts/buildRecipeDB.js가 생성) 기반 로컬 레시피 매칭.
// foodLookup.js와 같은 매칭 전략(nameMatcher.js 공유)을 쓰되, **데이터 단위가 다르다**.
//
//   foodLookup(식약처 음식DB) : nutrientsPer100    — 100g당. 섭취 g을 곱해서 환산한다.
//   recipeLookup(레시피DB)    : nutrientsPerServing — 그 레시피 1인분 전체. 곱하지 않는다.
//
// 그리고 "그 1인분이 몇 g인가"는 대부분 모른다 — 원본 INFO_WGT가 채워진 항목이 1,141건 중
// 282건(24.7%)뿐이다. 모르는 항목의 중량을 추정해 per-100g으로 환산해두면 없는 정밀도를 지어내는
// 셈이라, 번들 단계에서도 여기서도 환산하지 않는다. servingGram: null을 "모른다"는 사실 그대로
// 넘기고, 환산이 필요한 시점의 가정은 resolveFood.js가 confidence를 낮추며 책임진다.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCanonicalName } from '../../src/lib/foodData.js'
import { createNameIndex } from './nameIndex.js'
import { createNameMatcher } from './nameMatcher.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RECIPE_DB_PATH = path.join(__dirname, '..', 'data', 'recipeDB.json')

let matcher = null // createNameMatcher(...)의 반환 함수 — 지연 로드
let index = null // createNameIndex(...)의 반환 함수

function load() {
  if (matcher) return
  const raw = JSON.parse(readFileSync(RECIPE_DB_PATH, 'utf8'))
  const options = { getName: (item) => item.name, getAliases: (item) => item.aliases }
  matcher = createNameMatcher(raw.items, { ...options, getCanonicalName })
  index = createNameIndex(raw.items, options)
}

// 서버 재기동 없이 recipeDB.json을 다시 만들었을 때 테스트/스크립트에서 강제로 다시 읽고 싶을 때만 사용.
export function _resetForTest() {
  matcher = null
  index = null
}

// 반환: { item, matchType: 'exact'|'alias'|'partial'|'fuzzy' } | null
// item: { id, name, aliases, category, servingGram(대개 null), nutrientsPerServing }
export function lookupRecipe(menuName) {
  load()
  return matcher(menuName)
}

// retrieval 전용 — 정확도 판정 없이 "이름이 닮은 것들"을 넓게 회수한다. 고르는 건 호출부의 게이트다.
export function searchRecipeCandidates(menuName, limit) {
  load()
  return index(menuName, limit)
}
