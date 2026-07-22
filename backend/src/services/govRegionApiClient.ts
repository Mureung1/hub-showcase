import type { GovRegionApiClient, GovRegionRow } from '../types/govRegionApi'

// 행정안전부_생활쓰레기배출정보 조회서비스 (data.go.kr 15155080)
// SGG_NM(구/군명)으로 검색해 관리구역별 배출 정보를 조회한다. 시/도 필터가 없어 동명 구/군이 여러 시/도에
// 걸쳐 섞여 반환됨 (실측: "북구"만으로 검색 시 대구/부산/울산/서울/광주 5개 시 46건이 섞여 반환됨,
// "성북구"/"강북구"도 "북구"를 포함해 함께 매칭됨) — 호출자가 반드시 CTPV_NM으로 재필터링해야 한다.
const BASE_URL = 'https://apis.data.go.kr/1741000/household_waste_info/info'
const NUM_OF_ROWS = 100
const SUCCESS_RESULT_CODE = '0'

interface GovRegionApiResponse {
  response: {
    header: { resultCode: string; resultMsg: string }
    body: {
      items: { item: GovRegionRow[] } | ''
      pageNo: number
      numOfRows: number
      totalCount: number
    }
  }
}

async function fetchRowsBySgg(sggNm: string): Promise<GovRegionRow[]> {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY
  if (!serviceKey) {
    throw new Error('PUBLIC_DATA_SERVICE_KEY가 설정되어 있지 않습니다')
  }

  const allRows: GovRegionRow[] = []
  let pageNo = 1

  while (true) {
    const url = new URL(BASE_URL)
    url.searchParams.set('serviceKey', serviceKey)
    url.searchParams.set('pageNo', String(pageNo))
    url.searchParams.set('numOfRows', String(NUM_OF_ROWS))
    url.searchParams.set('cond[SGG_NM::LIKE]', sggNm)

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`공공데이터 API 요청 실패: HTTP ${res.status}`)
    }

    const data = (await res.json()) as GovRegionApiResponse
    const { resultCode, resultMsg } = data.response.header
    if (resultCode !== SUCCESS_RESULT_CODE) {
      throw new Error(`공공데이터 API 오류(${resultCode}): ${resultMsg}`)
    }

    const { items, totalCount } = data.response.body
    if (items === '') break
    allRows.push(...items.item)

    if (allRows.length >= totalCount) break
    pageNo += 1
  }

  return allRows
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 전국 전체 데이터를 순회 — scripts/syncRegionDistricts.ts 전용. sggNm 필터 없이 호출하면 전체(실측 10,167건,
// 102페이지)가 반환됨. 페이지 사이에 지연을 두는 이유: 지연 없이 연속 요청하면 API가 일시적으로 두 서비스
// 키 모두에 대해 401 Unauthorized를 반환하며 잠기는 현상을 실측으로 확인함(레이트리밋으로 추정).
async function fetchAllRowsNationwide(
  onPage?: (rows: GovRegionRow[], pageNo: number, totalCount: number) => void,
): Promise<GovRegionRow[]> {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY
  if (!serviceKey) {
    throw new Error('PUBLIC_DATA_SERVICE_KEY가 설정되어 있지 않습니다')
  }

  const allRows: GovRegionRow[] = []
  let pageNo = 1

  while (true) {
    const url = new URL(BASE_URL)
    url.searchParams.set('serviceKey', serviceKey)
    url.searchParams.set('pageNo', String(pageNo))
    url.searchParams.set('numOfRows', String(NUM_OF_ROWS))

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`공공데이터 API 요청 실패: HTTP ${res.status}`)
    }

    const data = (await res.json()) as GovRegionApiResponse
    const { resultCode, resultMsg } = data.response.header
    if (resultCode !== SUCCESS_RESULT_CODE) {
      throw new Error(`공공데이터 API 오류(${resultCode}): ${resultMsg}`)
    }

    const { items, totalCount } = data.response.body
    const rows = items === '' ? [] : items.item
    allRows.push(...rows)
    onPage?.(rows, pageNo, totalCount)

    if (rows.length === 0 || allRows.length >= totalCount) break
    pageNo += 1
    await delay(300)
  }

  return allRows
}

export const govRegionApiClient: GovRegionApiClient = { fetchRowsBySgg }
export { fetchAllRowsNationwide }
