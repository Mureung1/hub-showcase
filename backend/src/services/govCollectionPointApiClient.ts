// 수거함 관련 3개 표준데이터(폐형광등·폐건전지 / 폐의약품 / 의류)는 응답 래퍼 구조(response.header/body.items,
// totalCount 등 숫자도 문자열로 내려옴)가 tn_pubr_public_lar_was_fee_api(대형폐기물 수수료)와 동일해
// govBulkyWasteApiClient.ts의 재시도·페이지네이션 로직을 그대로 재사용한다.
const NUM_OF_ROWS = 1000
const SUCCESS_RESULT_CODE = '00'
const MAX_PAGE_RETRIES = 3

interface GovApiResponse<T> {
  response: {
    header: { resultCode: string; resultMsg: string }
    body?: {
      items: T[]
      pageNo: string
      numOfRows: string
      totalCount: string
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPage<T>(
  baseUrl: string,
  serviceKey: string,
  pageNo: number,
): Promise<{ rows: T[]; totalCount: number }> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_PAGE_RETRIES; attempt++) {
    try {
      const url = new URL(baseUrl)
      url.searchParams.set('serviceKey', serviceKey)
      url.searchParams.set('pageNo', String(pageNo))
      url.searchParams.set('numOfRows', String(NUM_OF_ROWS))
      url.searchParams.set('type', 'json')

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`공공데이터 API 요청 실패: HTTP ${res.status}`)
      }

      const data = (await res.json()) as GovApiResponse<T>
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

async function fetchAllRowsNationwide<T>(
  baseUrl: string,
  onPage?: (rows: T[], pageNo: number, totalCount: number) => void,
): Promise<T[]> {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY
  if (!serviceKey) {
    throw new Error('PUBLIC_DATA_SERVICE_KEY가 설정되어 있지 않습니다')
  }

  const allRows: T[] = []
  let pageNo = 1

  while (true) {
    const { rows, totalCount } = await fetchPage<T>(baseUrl, serviceKey, pageNo)
    allRows.push(...rows)
    onPage?.(rows, pageNo, totalCount)

    if (rows.length === 0 || allRows.length >= totalCount) break
    pageNo += 1
    await delay(300)
  }

  return allRows
}

const LAMP_BATTERY_URL = 'https://api.data.go.kr/openapi/tn_pubr_public_waste_lamp_battery_collection_box_api'
const MEDICINE_URL = 'https://api.data.go.kr/openapi/tn_pubr_public_lung_medicine_api'
const CLOTHING_URL = 'https://api.data.go.kr/openapi/tn_pubr_public_clothing_collect_bins_api'
const RECYCLING_CENTER_URL = 'https://api.data.go.kr/openapi/tn_pubr_public_ruse_cnter_api'

export { fetchAllRowsNationwide, LAMP_BATTERY_URL, MEDICINE_URL, CLOTHING_URL, RECYCLING_CENTER_URL }
