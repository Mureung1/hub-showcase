import { BIZINFO_API_KEY } from './env.js'
import { NonRetryableError, withRetry } from './retry.js'

const BIZINFO_API_URL = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do'

/**
 * bizinfo.go.kr 지원사업정보 API 응답 항목 (실제 호출로 확인한 필드, 2026-07-22).
 * 문서화된 스펙과 실제 필드명이 달라서 curl 테스트로 재확인한 값을 기준으로 정의한다.
 */
export interface BizinfoAnnouncement {
  pblancId: string
  pblancNm: string
  jrsdInsttNm: string
  excInsttNm?: string
  reqstBeginEndDe: string
  bsnsSumryCn: string
  trgetNm?: string
  refrncNm?: string
  reqstMthPapersCn?: string
  pblancUrl: string
  pldirSportRealmLclasCodeNm: string
  pldirSportRealmMlsfcCodeNm?: string
  hashtags?: string
  totCnt: number
  printFileNm?: string
  printFlpthNm?: string
  fileNm?: string
  flpthNm?: string
  creatPnttm: string
  updtPnttm: string
  inqireCo: number
}

interface BizinfoApiResponse {
  jsonArray: BizinfoAnnouncement[]
}

/**
 * bizinfo API는 인증키 오류 등도 HTTP 200으로 응답하고, 에러를 바디 안 `reqErr` 필드에 담는다
 * (실제 호출로 확인, 2026-07-27 — 예: 잘못된 crtfcKey → `{"reqErr":"존재하지 않는 인증키 입니다."}`).
 * 그래서 HTTP status만으로는 이 에러를 못 잡고, 응답 바디를 파싱해서 따로 걸러야 한다.
 */
interface BizinfoErrorResponse {
  reqErr: string
}

export interface FetchAnnouncementsParams {
  pageIndex: number
  pageUnit: number
}

/**
 * GET bizinfoApi.do — 페이지 단위로 지원사업 공고를 조회한다.
 * 네트워크 에러(fetch 자체가 throw)나 5xx 응답은 지수 백오프로 재시도(이슈 #74) — 2026-07-26
 * 크론 실행이 커넥트 타임아웃으로 실패한 사례 대응. 4xx 응답이나 bizinfo의 `reqErr` 바디는
 * 재시도해도 절대 성공할 수 없어(잘못된 인증키 등) 즉시 실패 처리한다.
 */
export async function fetchAnnouncements(params: FetchAnnouncementsParams): Promise<BizinfoAnnouncement[]> {
  return withRetry(() => fetchAnnouncementsOnce(params))
}

async function fetchAnnouncementsOnce({
  pageIndex,
  pageUnit,
}: FetchAnnouncementsParams): Promise<BizinfoAnnouncement[]> {
  const url = new URL(BIZINFO_API_URL)
  url.searchParams.set('crtfcKey', BIZINFO_API_KEY)
  url.searchParams.set('dataType', 'json')
  url.searchParams.set('pageIndex', String(pageIndex))
  url.searchParams.set('pageUnit', String(pageUnit))

  const res = await fetch(url)
  if (!res.ok) {
    const message = `bizinfo API 호출 실패: ${res.status} ${res.statusText}`
    if (res.status >= 400 && res.status < 500) {
      throw new NonRetryableError(message)
    }
    throw new Error(message)
  }

  const data = (await res.json()) as BizinfoApiResponse | BizinfoErrorResponse
  if ('reqErr' in data) {
    throw new NonRetryableError(`bizinfo API 에러: ${data.reqErr}`)
  }

  return data.jsonArray
}
