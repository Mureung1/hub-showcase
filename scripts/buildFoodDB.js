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

// 수집 순서 — **이제 이 순서는 "대표값(하위 호환 필드)을 어느 출처로 채울지"만 정한다.**
// 어떤 출처도 버리지 않고 item.variants[]에 전부 보존하며, 실제 선택은 조회 시점에
// server/nutrition/foodLookup.js의 ORIGIN_PREFERENCE가 맥락(식당/급식)에 따라 한다.
//
// 이력: 처음엔 "실험실 실측(분석함량) > 재료량 산출" 순이었는데, 6주차 §1 정확도 테스트에서
// 진짜 문제가 영양성분 값이 아니라 foodSize(1회 제공량)임을 확인하고(외식 출처는 "연포탕 1000g"처럼
// 급식 트레이 1인분보다 훨씬 크게 잡혀 있었다) 급식 출처를 최우선으로 뒤집었다. 그런데 그 순간
// **dedup이 외식 레코드를 통째로 버리고 있었기 때문에**, 제공량 문제를 고치려다 영양밀도까지 급식
// 기준으로 갈아치우는 부작용이 생겼다(김치찌개 19kcal/100g, 돼지갈비구이 132 vs 외식 294).
// 지금은 둘을 분리한다 — 제공량은 servingWeight.js가 역할별 절대 범위로 거르고, 영양밀도는
// 맥락에 맞는 출처를 고른다.
const ORIGIN_PRIORITY = ['6', '5', '7', '3', '1', '4', '2']
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

// nutConSrtrQua(영양성분 함량 기준량)의 **숫자값**. 예전엔 이 필드에서 'ml' 여부만 보고 수치는
// 무조건 100g당이라고 가정했는데, 원격 경로(server/proxy.js의 parseBaseQuantity)는 이 값을 파싱해
// 100 기준으로 환산하고 있었다 — 로컬 스냅샷만 검증이 없어서, 기준량이 100이 아닌 레코드가 섞이면
// 그만큼 그대로 틀린 값이 박힌다. 여기서 파싱해 100 기준으로 정규화한다.
function parseBaseQuantityValue(nutConSrtrQua) {
  if (typeof nutConSrtrQua !== 'string') return null
  const match = nutConSrtrQua.trim().match(/([\d.]+)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
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
  // normalizeFoodName(name) -> item. 같은 이름의 **출처별 변형을 전부 보존**한다(item.variants).
  // 예전엔 여기서 먼저 온 출처 하나만 남기고 나머지를 버렸는데, ORIGIN_PRIORITY가 급식 우선이라
  // 한국인이 가장 많이 먹는 메뉴의 외식 수치가 통째로 사라졌다 — "돼지갈비 73kcal"의 원인 중 하나다.
  const byName = new Map()
  const originCounts = {}
  let skippedNoCalories = 0
  let skippedNoBaseQuantity = 0
  let variantCount = 0

  for (const originCd of ORIGIN_PRIORITY) {
    const rawItems = await fetchOrigin(apiKey, originCd)
    originCounts[originCd] = rawItems.length
    console.log(`origin ${originCd}(${ORIGIN_NAMES[originCd]}): ${rawItems.length}건 수집`)

    for (const raw of rawItems) {
      const name = (raw.foodNm || '').trim()
      if (!name) continue
      const key = normalizeFoodName(name)
      if (!key) continue

      // 기준량이 100이 아닌 레코드는 그대로 두면 그 배수만큼 틀린다 — 100 기준으로 환산한다.
      const baseQuantity = parseBaseQuantityValue(raw.nutConSrtrQua)
      if (baseQuantity === null) {
        skippedNoBaseQuantity += 1
        continue
      }
      const toPer100 = (v) => {
        const n = toNumber(v)
        return n === null ? null : Math.round((n * 100) / baseQuantity * 100) / 100
      }

      const nutrients = {
        calories: toPer100(raw.enerc),
        protein: toPer100(raw.prot),
        carbs: toPer100(raw.chocdf),
        fat: toPer100(raw.fatce),
        fiber: toPer100(raw.fibtg),
        sodium: toPer100(raw.nat),
      }
      if (nutrients.calories === null) {
        skippedNoCalories += 1
        continue // 칼로리 없는 레코드는 정밀 엔진의 기준값으로 못 씀
      }

      const variant = {
        originCode: originCd,
        servingGram: parseServingGram(raw.foodSize),
        nutrientsPer100: nutrients,
      }

      const existing = byName.get(key)
      if (existing) {
        // 같은 출처가 여러 건이면 첫 건만(같은 출처 안의 중복은 예전과 동일하게 무시).
        if (existing.variants.some((v) => v.originCode === originCd)) continue
        existing.variants.push(variant)
        variantCount += 1
        continue
      }

      // 첫 등장(= ORIGIN_PRIORITY상 가장 앞선 출처)이 대표값이 된다 — 기존 필드 모양 그대로라
      // variants를 모르는 소비자도 예전과 똑같이 동작한다(하위 호환).
      byName.set(key, {
        id: raw.foodCd || key,
        name,
        aliases: aliasMap.get(name) ?? [],
        category: classifyMenuRole(name).role,
        // matched=false면 category는 DEFAULT_ROLE('side')일 뿐 실제로 근거가 없다 — 소비처가
        // "역할을 안다"와 "몰라서 기본값을 채웠다"를 구분할 수 있도록 별도로 보존한다(리뷰에서 발견:
        // 이 구분이 없어 급식 중량 계산이 미분류 음식을 전부 반찬 50g으로 오판했다).
        categoryMatched: classifyMenuRole(name).matched,
        servingGram: variant.servingGram,
        baseUnit: parseBaseUnit(raw.nutConSrtrQua),
        nutrientsPer100: nutrients,
        origin: { code: originCd, name: ORIGIN_NAMES[originCd] },
        variants: [variant],
      })
      variantCount += 1
    }
  }

  const items = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const output = {
    version: 2, // v2 = 출처별 variants[] 보존
    generatedAt: new Date().toISOString().slice(0, 10),
    source: '식약처 전국통합식품영양성분정보(음식) OpenAPI — api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api',
    originCounts,
    itemCount: items.length,
    variantCount,
    items,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n')
  console.log(`\n총 ${items.length}종 / 출처변형 ${variantCount}건 저장 → ${path.relative(process.cwd(), OUTPUT_PATH)}`)
  console.log(`(칼로리 없어 제외: ${skippedNoCalories}건, 기준량 파싱 실패로 제외: ${skippedNoBaseQuantity}건)`)

  const multi = items.filter((i) => i.variants.length > 1).length
  console.log(`출처가 2개 이상인 음식: ${multi}종 — 이만큼이 예전 빌드에서 통째로 버려지던 데이터다`)

  const categoryBreakdown = {}
  for (const item of items) categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + 1
  console.log('카테고리 분포:', categoryBreakdown)
}

main().catch((err) => {
  console.error('buildFoodDB 실패:', err)
  process.exit(1)
})
