// 6주차 §0 — 공용 식품 DB 구축.
//
//   node scripts/buildFoodDB.js
//
// 원안(가이드 문서)은 공공데이터포털에서 CSV를 손으로 받아오는 절차였지만, 이 서버는 이미
// 식약처 "전국통합식품영양성분정보" 오픈API 키(FOODSAFETY_API_KEY)를 갖고 있고 /api/fooddb로
// 실시간 조회에 쓰고 있다(server/proxy.js) — 같은 키로 페이지네이션 수집하면 CSV 다운로드·인코딩
// 추정 없이 항상 최신 데이터로 로컬 스냅샷을 만들 수 있다. 그래서 이 스크립트는 CSV 파싱이 아니라
// 그 API를 pageNo/numOfRows로 훑어 결과를 server/data/foodDB.json에 저장한다.
//
// foodOriginCd(공급처 구분)별 레코드 수를 실측한 결과:
//   1=가정식(분석함량) 482 · 2=외식(프랜차이즈 등) 15,225 · 3=외식(분석함량) 648 ·
//   4=외식(재료량 산출) 1,008 · 5=초등학교급식(재료량 산출) 725 · 6=중고등학교급식(재료량 산출) 618 ·
//   7=산업체급식(재료량 산출) 789
// 2번(프랜차이즈)은 "치킨플러스 마늘스태미나 치킨"처럼 브랜드별로 세분화된 상품명이 대부분이라
// 처음엔 부피만 키운다고 보고 제외했으나, matchRate.js로 실측한 결과 "던킨도넛"·"베스킨라빈스" 같은
// 급식판에 실제로 오르는 브랜드 간식류가 정확히 이 출처에만 있어 우선순위 최하위(가장 나중, 다른
// 출처에 이미 있는 이름은 덮어쓰지 않음)로 포함한다.
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyMenuRole } from '../src/lib/mealPortions.js'
import { FOOD_DATA } from '../src/lib/foodData.js'
import { normalizeFoodName } from '../server/nutrition/textNormalize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = path.join(__dirname, '..', 'server', 'data', 'foodDB.json')

const FOOD_API_URL = 'https://api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api'
const PAGE_SIZE = 1000

// 우선순위(중복 이름 발견 시 먼저 오는 출처의 레코드를 채택): 실험실 실측(분석함량) 출처를 재료량
// 산출 출처보다 우선하고, 그다음은 우리 도메인(학교·기관 급식)에 가까운 출처를 우선한다.
const ORIGIN_PRIORITY = ['3', '1', '6', '5', '7', '4', '2']
const ORIGIN_NAMES = {
  1: '가정식(분석함량)',
  2: '외식(프랜차이즈 등 업체 제공 영양정보)',
  3: '외식(분석함량)',
  4: '외식(재료량 기반 산출함량)',
  5: '초등학교급식(재료량 기반 산출함량)',
  6: '중고등학교급식(재료량 기반 산출함량)',
  7: '산업체급식(재료량 기반 산출함량)',
}

function toNumber(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// "400g" -> 400, "200ml" -> 200, 파싱 불가 -> null(호출부가 mealPortions role 기반 중량으로 대체)
function parseServingGram(foodSize) {
  if (typeof foodSize !== 'string') return null
  const match = foodSize.trim().match(/^([\d.]+)\s*(g|ml)/i)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

function parseBaseUnit(nutConSrtrQua) {
  return typeof nutConSrtrQua === 'string' && /ml/i.test(nutConSrtrQua) ? 'ml' : 'g'
}

async function fetchOrigin(apiKey, originCd) {
  const results = []
  let pageNo = 1
  for (;;) {
    const url = `${FOOD_API_URL}?${new URLSearchParams({
      serviceKey: apiKey,
      pageNo: String(pageNo),
      numOfRows: String(PAGE_SIZE),
      type: 'json',
      foodOriginCd: originCd,
    })}`
    const res = await fetch(url)
    const raw = await res.text()
    let data = null
    try {
      data = JSON.parse(raw)
    } catch {
      throw new Error(`foodOriginCd=${originCd} pageNo=${pageNo}: JSON 파싱 실패 — ${raw.slice(0, 300)}`)
    }
    const resultCode = data?.response?.header?.resultCode
    if (resultCode === '03') break // NODATA — 이 출처엔 더 이상 결과 없음(정상)
    if (resultCode !== '00') {
      throw new Error(`foodOriginCd=${originCd} pageNo=${pageNo}: ${resultCode} ${data?.response?.header?.resultMsg}`)
    }
    const items = data?.response?.body?.items
    if (!Array.isArray(items) || items.length === 0) break
    results.push(...items)
    const totalCount = Number(data?.response?.body?.totalCount) || 0
    if (results.length >= totalCount || items.length < PAGE_SIZE) break
    pageNo += 1
  }
  return results
}

// src/lib/foodData.js의 canonical/keywords 테이블에서, canonical과 다른 진짜 이형 표기(예:
// 돈까스/돈가스)만 별칭으로 뽑는다. "수식어가 붙은 긴 이름"(예: 돼지김치찌개)은 여기 넣지 않는다 —
// foodLookup.js의 부분포함(suffix 우선) 단계가 어떤 dish 이름에든 동적으로 적용되므로, 30여 개뿐인
// 이 표에 없는 나머지 2천여 개 항목도 똑같이 커버된다. 정적으로 조합을 나열하면 이 표에 있는
// 음식만 혜택을 보고 나머지는 그대로 놓친다.
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

async function main() {
  const apiKey = process.env.FOODSAFETY_API_KEY
  if (!apiKey) {
    console.error('FOODSAFETY_API_KEY가 .env에 없습니다.')
    process.exit(1)
  }

  const aliasMap = buildAliasMap()
  const byName = new Map() // normalizeFoodName(name) -> item (먼저 채택된 출처 우선순위 유지, 이후 출처는 건너뜀)
  const originCounts = {}
  let skippedNoCalories = 0

  for (const originCd of ORIGIN_PRIORITY) {
    const rawItems = await fetchOrigin(apiKey, originCd)
    originCounts[originCd] = rawItems.length
    console.log(`origin ${originCd}(${ORIGIN_NAMES[originCd]}): ${rawItems.length}건 수집`)

    for (const raw of rawItems) {
      const name = (raw.foodNm || '').trim()
      if (!name) continue
      const key = normalizeFoodName(name)
      if (!key || byName.has(key)) continue // 이미 더 높은 우선순위 출처에서 채택됨

      const nutrients = {
        calories: toNumber(raw.enerc),
        protein: toNumber(raw.prot),
        carbs: toNumber(raw.chocdf),
        fat: toNumber(raw.fatce),
        fiber: toNumber(raw.fibtg),
        sodium: toNumber(raw.nat),
      }
      if (nutrients.calories === null) {
        skippedNoCalories += 1
        continue // 칼로리 없는 레코드는 정밀 엔진의 기준값으로 못 씀
      }

      byName.set(key, {
        id: raw.foodCd || key,
        name,
        aliases: aliasMap.get(name) ?? [],
        category: classifyMenuRole(name).role,
        servingGram: parseServingGram(raw.foodSize),
        baseUnit: parseBaseUnit(raw.nutConSrtrQua),
        nutrientsPer100: nutrients,
        origin: { code: originCd, name: ORIGIN_NAMES[originCd] },
      })
    }
  }

  const items = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const output = {
    version: 1,
    generatedAt: new Date().toISOString().slice(0, 10),
    source: '식약처 전국통합식품영양성분정보(음식) OpenAPI — api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api',
    originCounts,
    itemCount: items.length,
    items,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n')
  console.log(`\n총 ${items.length}종 저장 → ${path.relative(process.cwd(), OUTPUT_PATH)}`)
  console.log(`(칼로리 없어 제외: ${skippedNoCalories}건)`)

  const categoryBreakdown = {}
  for (const item of items) categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + 1
  console.log('카테고리 분포:', categoryBreakdown)
}

main().catch((err) => {
  console.error('buildFoodDB 실패:', err)
  process.exit(1)
})
