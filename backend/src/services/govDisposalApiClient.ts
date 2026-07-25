import type { DisposalApiClient, GovDisposalItem } from '../types/govDisposalApi'

// 기후에너지환경부_분리배출 정보조회 서비스 (data.go.kr 15156866)
// 품목명(itemNm)으로 검색해 대표 배출방법(dschgMthd)을 조회한다. 데이터의 공간범위는 서울시.
const BASE_URL = 'https://apis.data.go.kr/1482000/WasteRecyclingService/getItem'

interface GovDisposalApiResponse {
  response: {
    header: {
      resultCode: string
      resultMsg: string
    }
    body: {
      items: { item: GovDisposalItem[] } | ''
      pageNo: number
      numOfRows: number
      totalCount: number
    }
  }
}

// resultCode가 "03"이면 조회 결과 없음(NODATA) — 정상 처리로 간주하고 빈 배열 반환
const NODATA_RESULT_CODE = '03'
const SUCCESS_RESULT_CODE = '00'

async function fetchDisposalMethod(itemNm: string): Promise<GovDisposalItem[]> {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY
  if (!serviceKey) {
    throw new Error('PUBLIC_DATA_SERVICE_KEY가 설정되어 있지 않습니다')
  }

  const url = new URL(BASE_URL)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', '20')
  url.searchParams.set('itemNm', itemNm)

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`공공데이터 API 요청 실패: HTTP ${res.status}`)
  }

  const data = (await res.json()) as GovDisposalApiResponse
  const { resultCode, resultMsg } = data.response.header

  if (resultCode === NODATA_RESULT_CODE) {
    return []
  }
  if (resultCode !== SUCCESS_RESULT_CODE) {
    throw new Error(`공공데이터 API 오류(${resultCode}): ${resultMsg}`)
  }

  const { items } = data.response.body
  return items === '' ? [] : items.item
}

// 전체 품목사전 동기화용 — itemNm 없이 호출하면 전체 카탈로그를 페이지네이션으로 반환한다 (실측 totalCount=730, 2026-07-19).
async function fetchAllDisposalItems(): Promise<GovDisposalItem[]> {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY
  if (!serviceKey) {
    throw new Error('PUBLIC_DATA_SERVICE_KEY가 설정되어 있지 않습니다')
  }

  const numOfRows = 1000
  const allItems: GovDisposalItem[] = []
  let pageNo = 1

  while (true) {
    const url = new URL(BASE_URL)
    url.searchParams.set('serviceKey', serviceKey)
    url.searchParams.set('pageNo', String(pageNo))
    url.searchParams.set('numOfRows', String(numOfRows))

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`공공데이터 API 요청 실패: HTTP ${res.status}`)
    }

    const data = (await res.json()) as GovDisposalApiResponse
    const { resultCode, resultMsg } = data.response.header
    if (resultCode === NODATA_RESULT_CODE) break
    if (resultCode !== SUCCESS_RESULT_CODE) {
      throw new Error(`공공데이터 API 오류(${resultCode}): ${resultMsg}`)
    }

    const { items, totalCount } = data.response.body
    if (items === '') break
    allItems.push(...items.item)

    if (allItems.length >= totalCount) break
    pageNo += 1
  }

  return allItems
}

export const govDisposalApiClient: DisposalApiClient = { fetchDisposalMethod }
export { fetchAllDisposalItems }
