import { BIZINFO_API_KEY } from './env.js'

const BIZINFO_API_URL = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do'

/**
 * bizinfo.go.kr 지원사업정보 API 응답 항목 (실제 호출로 확인한 필드, 2026-07-22).
 * 문서화된 스펙과 실제 필드명이 달라서 curl 테스트로 재확인한 값을 기준으로 정의한다.
 */
export interface BizinfoAnnouncement {
  pblancId: string
  pblancNm: string
  jrsdInsttNm: string
  excInsttNm: string
  reqstBeginEndDe: string
  bsnsSumryCn: string
  trgetNm: string
  refrncNm: string
  reqstMthPapersCn: string
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

export interface FetchAnnouncementsParams {
  pageIndex: number
  pageUnit: number
}

/** GET bizinfoApi.do — 페이지 단위로 지원사업 공고를 조회한다 */
export async function fetchAnnouncements({
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
    throw new Error(`bizinfo API 호출 실패: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as BizinfoApiResponse
  return data.jsonArray
}
