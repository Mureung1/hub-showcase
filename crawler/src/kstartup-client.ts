import { NonRetryableError, withRetry } from './retry.js'

const KSTARTUP_API_URL =
  'https://nidview.k-startup.go.kr/view/public/call/kisedKstartupService/announcementInformation'

/**
 * K-Startup(창업진흥원) 공고 정보 응답 항목 (실제 호출로 확인한 필드, 2026-07-28).
 * 인증키 없이 응답하는 프리뷰 엔드포인트 — 이슈 #80/#94 조사 결과, 정식 data.go.kr 키 발급
 * 절차는 별도 확인 필요(우선은 이 엔드포인트로 진행).
 */
export interface KstartupAnnouncement {
  pbanc_sn: number
  biz_pbanc_nm: string
  pbanc_ntrp_nm: string
  pbanc_ctnt: string
  pbanc_rcpt_bgng_dt: string
  pbanc_rcpt_end_dt: string
  aply_trgt?: string
  aply_trgt_ctnt?: string
  aply_excl_trgt_ctnt?: string
  biz_enyy?: string
  supt_regin?: string
  supt_biz_clsfc?: string
  detl_pg_url?: string
  prch_cnpl_no?: string
  aply_mthd_onli_rcpt_istc?: string | null
  aply_mthd_vst_rcpt_istc?: string | null
  aply_mthd_fax_rcpt_istc?: string | null
  aply_mthd_eml_rcpt_istc?: string | null
  aply_mthd_pssr_rcpt_istc?: string | null
  aply_mthd_etc_istc?: string | null
  rcrt_prgs_yn: string
}

interface KstartupApiResponse {
  data: KstartupAnnouncement[]
  currentCount: number
  matchCount: number
  page: number
  perPage: number
}

export interface FetchKstartupAnnouncementsParams {
  page: number
  perPage: number
}

/**
 * GET K-Startup 공고 정보 — 페이지 단위로 조회 후 진행중(rcrt_prgs_yn === 'Y')인 것만 반환한다.
 * `rcrt_prgs_yn` 쿼리 파라미터는 서버가 실제로 필터링하지 않는다(2026-07-28 실측 — 응답에
 * Y/N이 섞여 나옴, k-skill 프로젝트가 `supt_regin`에 대해 문서화한 것과 동일한 유형의 상위
 * API 신뢰 불가 사례) — 그래서 클라이언트 사이드로 반드시 재필터링해야 한다.
 */
export async function fetchKstartupAnnouncements(
  params: FetchKstartupAnnouncementsParams,
): Promise<KstartupAnnouncement[]> {
  const items = await withRetry(() => fetchKstartupAnnouncementsOnce(params))
  return items.filter((item) => item.rcrt_prgs_yn === 'Y')
}

/** connect 이후 응답이 멈춰도(fetch 기본 동작은 무한 대기) withRetry가 재시도할 수 있도록 상한을 둔다 */
const REQUEST_TIMEOUT_MS = 15_000

async function fetchKstartupAnnouncementsOnce({
  page,
  perPage,
}: FetchKstartupAnnouncementsParams): Promise<KstartupAnnouncement[]> {
  const url = new URL(KSTARTUP_API_URL)
  url.searchParams.set('page', String(page))
  url.searchParams.set('perPage', String(perPage))
  url.searchParams.set('rcrt_prgs_yn', 'Y')

  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!res.ok) {
    const message = `K-Startup API 호출 실패: ${res.status} ${res.statusText}`
    if (res.status >= 400 && res.status < 500) {
      throw new NonRetryableError(message)
    }
    throw new Error(message)
  }

  const data = (await res.json()) as KstartupApiResponse
  return data.data
}
