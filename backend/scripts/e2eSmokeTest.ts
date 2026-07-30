import 'dotenv/config'

// 실제 Supabase DB + Gemini API + 공공데이터포털 API를 그대로 사용하는 opt-in e2e 스모크 테스트다.
// `npm test`(vitest)에는 포함되지 않는다 — 외부 API 쿼터를 소비하고 실행 시간도 길기 때문에, 필요할 때
// 수동으로만 돌린다: 1) `npm run dev -w backend`로 서버를 띄운 뒤 2) `npm run test:e2e -w backend` 실행.
// 사진 인식(/recognize)까지 검증하려면 `E2E_PHOTO_PATH=./어떤사진.jpg npm run test:e2e -w backend`처럼
// 실제 이미지 경로를 넘긴다 (없으면 해당 단계는 건너뛴다).

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4000/api'

let passCount = 0
let failCount = 0

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`✅ ${name}`)
    passCount += 1
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(`   ${error instanceof Error ? error.message : String(error)}`)
    failCount += 1
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`)
  const body = await res.json()
  return { status: res.status, body }
}

async function main() {
  console.log(`e2e smoke test 시작 — BASE_URL=${BASE_URL}`)
  console.log('(백엔드 dev 서버가 떠 있어야 하고, 실제 Gemini/공공데이터 API 쿼터를 사용합니다)\n')

  await step('GET /health', async () => {
    const { status, body } = await getJson('/health')
    assert(status === 200, `status ${status}`)
    assert(body.status === 'ok', `unexpected body ${JSON.stringify(body)}`)
  })

  let itemId: string | undefined

  await step('GET /items/search — 실제 카탈로그에서 "페트병" 검색', async () => {
    const { status, body } = await getJson('/items/search?q=페트병')
    assert(status === 200, `status ${status}`)
    assert(Array.isArray(body.items) && body.items.length > 0, '검색 결과가 비어 있음 — 카탈로그 동기화(sync:catalog) 여부 확인')
    itemId = body.items[0].id
  })

  await step('GET /items/:id/disposal-rule — 공식 데이터 + LLM 설명 생성', async () => {
    assert(itemId, '이전 단계에서 itemId를 얻지 못함')
    const { status, body } = await getJson(`/items/${itemId}/disposal-rule`)
    assert(status === 200, `status ${status}`)
    assert(typeof body.disposalRule?.method === 'string' && body.disposalRule.method.length > 0, '공식 배출방법(method)이 비어 있음')
    assert(Array.isArray(body.disposalRule?.steps) && body.disposalRule.steps.length > 0, 'LLM이 생성한 단계별 안내(steps)가 비어 있음')
  })

  let provinceName: string | undefined
  let districtName: string | undefined

  await step('GET /regions/provinces — 실제 시/도 목록', async () => {
    const { status, body } = await getJson('/regions/provinces')
    assert(status === 200, `status ${status}`)
    assert(Array.isArray(body.provinces) && body.provinces.length > 0, '시/도 목록이 비어 있음 — 지역 동기화(sync:districts) 여부 확인')
    provinceName = body.provinces[0].name
  })

  await step('GET /regions/districts — 실제 구/군 목록', async () => {
    assert(provinceName, '이전 단계에서 provinceName을 얻지 못함')
    const { status, body } = await getJson(`/regions/districts?ctpvNm=${encodeURIComponent(provinceName!)}`)
    assert(status === 200, `status ${status}`)
    assert(Array.isArray(body.districts) && body.districts.length > 0, '구/군 목록이 비어 있음')
    districtName = body.districts[0].name
  })

  await step('GET /regions/zones — 커버리지/동 옵션 확인', async () => {
    assert(provinceName && districtName, '이전 단계에서 지역명을 얻지 못함')
    const { status, body } = await getJson(
      `/regions/zones?ctpvNm=${encodeURIComponent(provinceName!)}&sggNm=${encodeURIComponent(districtName!)}`,
    )
    assert(status === 200, `status ${status}`)
    assert(typeof body.covered === 'boolean', 'covered 필드 누락')
  })

  await step('GET /bulky-waste/items — 대형폐기물 품목 목록', async () => {
    assert(provinceName && districtName, '이전 단계에서 지역명을 얻지 못함')
    const { status, body } = await getJson(
      `/bulky-waste/items?ctpvNm=${encodeURIComponent(provinceName!)}&sggNm=${encodeURIComponent(districtName!)}`,
    )
    assert(status === 200, `status ${status}`)
    assert(Array.isArray(body.items), 'items가 배열이 아님')
  })

  await step('GET /collection-points — 건전지 수거함 목록', async () => {
    assert(provinceName && districtName, '이전 단계에서 지역명을 얻지 못함')
    const { status, body } = await getJson(
      `/collection-points?category=건전지&ctpvNm=${encodeURIComponent(provinceName!)}&sggNm=${encodeURIComponent(districtName!)}`,
    )
    assert(status === 200, `status ${status}`)
    assert(Array.isArray(body.points), 'points가 배열이 아님')
  })

  const photoPath = process.env.E2E_PHOTO_PATH
  if (photoPath) {
    await step(`POST /recognize — 실제 사진(${photoPath})으로 Vision AI 인식`, async () => {
      const fs = await import('node:fs/promises')
      const fileBuffer = await fs.readFile(photoPath)
      const form = new FormData()
      form.append('photo', new Blob([fileBuffer]), 'e2e-photo.jpg')

      const res = await fetch(`${BASE_URL}/recognize`, { method: 'POST', body: form })
      const body = await res.json()
      assert(res.status === 200, `status ${res.status} — ${JSON.stringify(body)}`)
      assert(typeof body.item?.name === 'string', '인식된 품목명(item.name)이 없음')
    })
  } else {
    console.log('⏭️  POST /recognize — E2E_PHOTO_PATH가 없어 건너뜀')
  }

  console.log(`\n결과: ${passCount}개 성공, ${failCount}개 실패`)
  if (failCount > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('e2e smoke test 실행 중 예기치 못한 오류:', error)
  process.exitCode = 1
})
