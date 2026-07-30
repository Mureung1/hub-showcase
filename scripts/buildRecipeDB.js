// 식품안전나라 "조리식품의 레시피 DB"(COOKRCP01) 로컬 스냅샷 구축.
//
//   node scripts/buildRecipeDB.js
//
// scripts/buildFoodDB.js와 같은 방식이다(오픈API 페이지네이션 → 정규화 → server/data/*.json).
// 다른 점은 데이터의 성격이다:
//
//  - 전체가 1,156건뿐이라 통째로 번들할 수 있다(foodDB.json은 11,347건 5.4MB). 그래서 이 DB는
//    런타임에 API를 호출하지 않는다 — FOODSAFETY_RECIPE_API_KEY는 **이 스크립트를 돌릴 때만**
//    필요하고, 서버는 키 없이도 레시피 매칭을 전부 수행한다(네트워크·키 장애의 영향권 밖).
//  - **단위가 다르다.** 식약처 음식DB는 100g당(nutrientsPer100)인데 COOKRCP01의 INFO_*는 그
//    레시피 1인분 전체 기준이다. 게다가 1인분이 몇 g인지 알려주는 INFO_WGT는 실측상 50건 중
//    2건(약 4%)만 채워져 있다(INFO_ENG는 50/50 전부 있음). 그래서 여기서 per-100g으로 환산해
//    저장하지 않는다 — 모르는 중량으로 나눠봐야 없는 정밀도를 지어내는 것이기 때문이다.
//    nutrientsPerServing 그대로 저장하고, 중량은 아는 것만 servingGram에 담는다(나머지는 null).
//    환산이 필요한 시점의 가정은 조회 측(server/nutrition/recipeLookup.js)이 책임진다.
//
// API 형태도 data.go.kr과 다르다: 쿼리스트링이 아니라 경로 기반이고(/api/{키}/COOKRCP01/json/
// {시작}/{끝}), 한 번에 최대 50건만 준다(1~100을 요청해도 50건만 온다 — 실측).
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FOOD_DATA } from '../src/lib/foodData.js'
import { normalizeFoodName } from '../server/nutrition/textNormalize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = path.join(__dirname, '..', 'server', 'data', 'recipeDB.json')

const BASE_URL = 'http://openapi.foodsafetykorea.go.kr/api'
const SERVICE = 'COOKRCP01'
const PAGE_SIZE = 50 // 실측 상한 — 더 큰 범위를 요청해도 50건만 온다
const MAX_RECORDS = 5000 // 폭주 방지 상한(현재 실제 총계는 1,156건)

function toNumber(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// buildFoodDB.js:108의 buildAliasMap과 같은 규칙 — foodData.js의 canonical/keywords 표에서
// canonical과 다른 진짜 이형 표기(돈까스/돈가스 등)만 별칭으로 뽑는다. 수식어가 붙은 긴 이름은
// 넣지 않는다(부분포함 단계가 동적으로 커버하므로).
function buildAliasMap() {
  const map = new Map()
  for (const entry of FOOD_DATA) {
    if (!entry.canonical) continue
    const aliases = entry.keywords.filter((k) => k !== entry.canonical)
    if (aliases.length === 0) continue
    map.set(entry.canonical, [...new Set([...(map.get(entry.canonical) ?? []), ...aliases])])
  }
  return map
}

async function fetchPage(apiKey, start, end) {
  const url = `${BASE_URL}/${apiKey}/${SERVICE}/json/${start}/${end}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`레시피DB 요청 실패 (${res.status}) start=${start}`)
  const data = await res.json()

  const code = data?.[SERVICE]?.RESULT?.CODE ?? ''
  // "ERROR-"로 시작하는 코드만 실패로 본다(키 인증 실패/파라미터 오류 등). 결과 없음은 row가 비어
  // 자연스럽게 종료되므로, 정확한 "무결과" 코드값을 하드코딩해 맞히려 하지 않는다.
  if (code.startsWith('ERROR')) {
    throw new Error(`레시피DB 오류 응답 (${code}) ${data?.[SERVICE]?.RESULT?.MSG ?? ''}`)
  }

  const rows = data?.[SERVICE]?.row
  return {
    rows: Array.isArray(rows) ? rows : [],
    totalCount: Number(data?.[SERVICE]?.total_count) || 0,
  }
}

async function main() {
  const apiKey = process.env.FOODSAFETY_RECIPE_API_KEY
  if (!apiKey) {
    console.error('FOODSAFETY_RECIPE_API_KEY가 .env에 없습니다. https://openapi.foodsafetykorea.go.kr 에서 무료 발급받으세요.')
    process.exit(1)
  }

  const aliasMap = buildAliasMap()
  const byName = new Map() // normalizeFoodName(name) -> item (먼저 나온 레코드 우선)
  let totalCount = 0
  let skippedNoCalories = 0
  let skippedNoName = 0
  let fetched = 0

  for (let start = 1; start <= MAX_RECORDS; start += PAGE_SIZE) {
    const end = start + PAGE_SIZE - 1
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchPage(apiKey, start, end)
    if (page.totalCount > 0) totalCount = page.totalCount
    if (page.rows.length === 0) break
    fetched += page.rows.length
    process.stdout.write(`\r수집 중... ${fetched}/${totalCount || '?'}건`)

    for (const raw of page.rows) {
      const name = (raw.RCP_NM || '').trim()
      if (!name) {
        skippedNoName += 1
        continue
      }
      const key = normalizeFoodName(name)
      if (!key || byName.has(key)) continue

      const calories = toNumber(raw.INFO_ENG)
      if (calories === null) {
        // 칼로리 없는 레코드는 영양 산출의 기준값으로 쓸 수 없다(buildFoodDB.js와 같은 기준).
        skippedNoCalories += 1
        continue
      }

      byName.set(key, {
        id: raw.RCP_SEQ || key,
        name,
        aliases: aliasMap.get(name) ?? [],
        // RCP_PAT2: 반찬 / 국&찌개 / 일품 / 후식 등. mealPortions.js의 role과는 다른 분류 체계라
        // 그대로 보존만 하고, role 매핑은 조회 측이 필요할 때 한다.
        category: (raw.RCP_PAT2 || '').trim() || null,
        // INFO_WGT는 대부분 비어 있다 — 있을 때만 담고 없으면 null(모른다는 사실을 그대로 남긴다).
        servingGram: toNumber(raw.INFO_WGT),
        // 1인분 전체 기준. fiber는 COOKRCP01에 아예 없는 항목이라 항상 null이다
        // (호출부의 fillMissingNutrients가 AI 추정치로 메운다).
        nutrientsPerServing: {
          calories,
          protein: toNumber(raw.INFO_PRO),
          carbs: toNumber(raw.INFO_CAR),
          fat: toNumber(raw.INFO_FAT),
          fiber: null,
          sodium: toNumber(raw.INFO_NA),
        },
      })
    }

    if (totalCount > 0 && fetched >= totalCount) break
    if (page.rows.length < PAGE_SIZE) break
  }

  process.stdout.write('\n')

  const items = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  const servingGramKnownCount = items.filter((i) => i.servingGram > 0).length

  const output = {
    version: 1,
    generatedAt: new Date().toISOString().slice(0, 10),
    source: '식품의약품안전처 조리식품의 레시피 DB(COOKRCP01) — openapi.foodsafetykorea.go.kr',
    // 이 두 값이 이 스냅샷의 한계를 그대로 드러낸다: 영양값은 1인분 전체 기준이고,
    // 그 1인분이 몇 g인지는 대부분 모른다(servingGramKnownCount / itemCount).
    unit: 'per-serving',
    itemCount: items.length,
    servingGramKnownCount,
    items,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n')

  console.log(`\n총 ${items.length}종 저장 → ${path.relative(process.cwd(), OUTPUT_PATH)}`)
  console.log(`1인분 중량(INFO_WGT) 아는 항목: ${servingGramKnownCount}/${items.length}건 (${((servingGramKnownCount / items.length) * 100).toFixed(1)}%)`)
  if (skippedNoCalories > 0) console.log(`(칼로리 없어 제외: ${skippedNoCalories}건)`)
  if (skippedNoName > 0) console.log(`(이름 없어 제외: ${skippedNoName}건)`)

  const categoryBreakdown = {}
  for (const item of items) categoryBreakdown[item.category ?? '미분류'] = (categoryBreakdown[item.category ?? '미분류'] || 0) + 1
  console.log('카테고리 분포:', categoryBreakdown)
}

main().catch((err) => {
  console.error('buildRecipeDB 실패:', err)
  process.exit(1)
})
