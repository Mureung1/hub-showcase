import type { GovBulkyWasteRow } from '../types/govBulkyWasteApi'

// 환경부_전국대형폐기물수거수수료정보표준데이터 (data.go.kr 15114146, tn_pubr_public_lar_was_fee_api)
// household_waste_info API와 달리 items가 { item: [...] }이 아니라 배열 그대로 내려오고,
// totalCount/numOfRows/pageNo도 문자열로 내려온다 — 실제 호출로 확인 후 반영.
const BASE_URL = 'https://api.data.go.kr/openapi/tn_pubr_public_lar_was_fee_api'
const NUM_OF_ROWS = 100
const SUCCESS_RESULT_CODE = '00'

interface GovBulkyWasteApiResponse {
  response: {
    header: { resultCode: string; resultMsg: string }
    body?: {
      items: GovBulkyWasteRow[]
      pageNo: string
      numOfRows: string
      totalCount: string
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const MAX_PAGE_RETRIES = 3

// 페이지 하나를 가져온다 — 실측 중 필터 없이 호출 시 "SERVICE KEY IS NOT REGISTERED ERROR"가 일시적으로
// 뜨고 바로 재시도하면 정상 응답하는 플레이키(flaky)한 현상을 확인해, 실패 시 짧게 재시도한다.
// 229페이지짜리 전체 동기화 중간에 한 번 실패했다고 처음부터 다시 돌리지 않기 위함.
async function fetchPage(
  serviceKey: string,
  pageNo: number,
): Promise<{ rows: GovBulkyWasteRow[]; totalCount: number }> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_PAGE_RETRIES; attempt++) {
    try {
      const url = new URL(BASE_URL)
      url.searchParams.set('serviceKey', serviceKey)
      url.searchParams.set('pageNo', String(pageNo))
      url.searchParams.set('numOfRows', String(NUM_OF_ROWS))
      url.searchParams.set('type', 'json')

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`공공데이터 API 요청 실패: HTTP ${res.status}`)
      }

      const data = (await res.json()) as GovBulkyWasteApiResponse
      const { resultCode, resultMsg } = data.response.header
      if (resultCode !== SUCCESS_RESULT_CODE) {
        throw new Error(`공공데이터 API 오류(${resultCode}): ${resultMsg}`)
      }

      const body = data.response.body
      return { rows: body?.items ?? [], totalCount: Number(body?.totalCount ?? 0) }
    } catch (error) {
      lastError = error
      if (attempt < MAX_PAGE_RETRIES) {
        await delay(1000 * attempt)
      }
    }
  }

  throw lastError
}

// 전국 전체(실측 약 22,831건, 229페이지)를 순회 — scripts/syncBulkyWasteFees.ts 전용.
// 페이지 사이에 지연을 두는 이유는 syncRegionDistricts.ts와 동일(레이트리밋으로 인한 서비스 키 잠금 방지).
async function fetchAllRowsNationwide(
  onPage?: (rows: GovBulkyWasteRow[], pageNo: number, totalCount: number) => void,
): Promise<GovBulkyWasteRow[]> {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY
  if (!serviceKey) {
    throw new Error('PUBLIC_DATA_SERVICE_KEY가 설정되어 있지 않습니다')
  }

  const allRows: GovBulkyWasteRow[] = []
  let pageNo = 1

  while (true) {
    const { rows, totalCount } = await fetchPage(serviceKey, pageNo)
    allRows.push(...rows)
    onPage?.(rows, pageNo, totalCount)

    if (rows.length === 0 || allRows.length >= totalCount) break
    pageNo += 1
    await delay(300)
  }

  return allRows
}

export { fetchAllRowsNationwide }
