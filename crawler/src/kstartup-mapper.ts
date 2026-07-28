import { NO_DEADLINE_DDAY, REGIONS, type Subsidy } from '@hub/shared'
import type { KstartupAnnouncement } from './kstartup-client.js'
import { kstToday } from './kst.js'
import { extractAmount, FALLBACK_AMOUNT } from './mapper.js'

const FALLBACK_QUALIFICATION = '공고문 원문에서 확인해주세요'
const FALLBACK_DOCUMENT = '공고문 원문에서 확인해주세요'
const FALLBACK_HOW = '공고문 원문에서 확인해주세요'
const FALLBACK_CONTACT = '공고문 원문 참조'
/** mapper.ts의 NEUTRAL_MATCH와 동일한 이유(조건 기반 매칭 알고리즘 도입 전 중립값) */
const NEUTRAL_MATCH = 50

/** 접수기간이 "YYYYMMDD" 형식(구분자 없음) — bizinfo의 "YYYY-MM-DD ~ YYYY-MM-DD"와 다른 포맷이라 별도 파서가 필요하다 */
const DATE_PATTERN = /^(\d{4})(\d{2})(\d{2})$/

interface ParsedDeadline {
  deadline: string
  dday: number
}

/** "20260724"~"20260812" → 종료일 기준 deadline 텍스트 + dday. 형식이 아니면 원문 그대로 둔다 */
export function parseKstartupDeadline(pbancRcptEndDt: string, now: Date): ParsedDeadline {
  const match = pbancRcptEndDt.match(DATE_PATTERN)
  if (!match) {
    return { deadline: pbancRcptEndDt, dday: NO_DEADLINE_DDAY }
  }

  const [, year, month, day] = match
  const endDate = new Date(Number(year), Number(month) - 1, Number(day))
  const today = kstToday(now)
  const dday = Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    deadline: `${Number(year)}. ${Number(month)}. ${Number(day)}`,
    dday,
  }
}

const REGION_SET: ReadonlySet<string> = new Set(REGIONS)

/**
 * `supt_regin`(단일 문자열)을 region 배열로 변환한다. bizinfo(`extractRegions`)는 hashtags를
 * 콤마로 쪼개 여러 지역을 매칭하지만, K-Startup은 필드 자체가 단일 값이라 파싱 방식이 다르다.
 * "전국"이면 REGIONS 전체(광역 공고 규칙은 bizinfo와 동일하게 유지), 목록에 없는 값(예: 미확인
 * 표기)이면 "지역 정보 없음"으로 간주해 빈 배열.
 */
export function mapKstartupRegion(suptRegin: string | undefined): string[] {
  if (!suptRegin) return []
  if (suptRegin === '전국') return [...REGIONS]
  return REGION_SET.has(suptRegin) ? [suptRegin] : []
}

/** biz_enyy 토큰 → 연차 상한(년). "예비창업자"는 창업 전이라 0년 취급 */
const BUSINESS_YEARS_TOKEN_MAX: Record<string, number> = {
  '예비창업자': 0,
  '1년미만': 1,
  '2년미만': 2,
  '3년미만': 3,
  '5년미만': 5,
  '7년미만': 7,
  '10년미만': 10,
}

/**
 * `biz_enyy`(예: "예비창업자,1년미만,...,10년미만")를 businessYears/businessYearsMax로 변환.
 * bizinfo의 businessYears는 AI가 문서에서 뽑은 자유 텍스트지만, K-Startup은 플랫폼이 이미
 * 구조화해서 제공하는 값이라 콤마로 나열된 토큰 중 최댓값을 상한으로 채택한다.
 */
export function parseBizEnyy(bizEnyy: string | undefined): {
  businessYears?: string
  businessYearsMax?: number
} {
  if (!bizEnyy) return {}

  const values = bizEnyy
    .split(',')
    .map((token) => token.trim())
    .map((token) => BUSINESS_YEARS_TOKEN_MAX[token])
    .filter((value): value is number => value !== undefined)

  if (values.length === 0) return { businessYears: bizEnyy }
  return { businessYears: bizEnyy, businessYearsMax: Math.max(...values) }
}

/**
 * 신청방법 필드 중 어느 것이 채워져 있는지로 방식을 판단한다(이슈 #94). bizinfo `inferMethod`는
 * 자유텍스트 정규식이지만, K-Startup은 접수방식별 필드가 이미 나뉘어 있어 존재 여부만 보면 된다
 * — 신뢰도가 더 높다.
 */
export function inferKstartupMethod(item: KstartupAnnouncement): string {
  const online = Boolean(item.aply_mthd_onli_rcpt_istc) || Boolean(item.aply_mthd_eml_rcpt_istc)
  const visit = Boolean(item.aply_mthd_vst_rcpt_istc)

  if (online && visit) return '온라인+방문'
  if (visit) return '방문'
  if (online) return '온라인'
  return '기타'
}

/**
 * `supt_biz_clsfc`(K-Startup 자체 사업분류)를 bizinfo `supportRealm`의 8개 고정 카테고리로
 * 옮기는 추측 매핑(사용자 확정, 2026-07-28) — 공식 대응표가 아니라 가장 가까운 값으로 수동
 * 대응시킨 것이므로 실제 운영 데이터로 지켜보며 조정될 수 있다. 상세 근거:
 * docs/week4/issue-94-kstartup-crawler-plan.md
 */
const SUPPORT_REALM_MAP: Record<string, string> = {
  '사업화': '경영',
  '시설ㆍ공간ㆍ보육': '창업',
  '멘토링ㆍ컨설팅ㆍ교육': '창업',
  '행사ㆍ네트워크': '기타',
  '창업교육': '창업',
  '판로ㆍ해외진출': '수출',
  '글로벌': '수출',
  '정책자금': '금융',
}

export function mapKstartupSupportRealm(suptBizClsfc: string | undefined): string {
  if (!suptBizClsfc) return '기타'
  return SUPPORT_REALM_MAP[suptBizClsfc] ?? '기타'
}

/**
 * K-Startup 공고 1건을 Subsidy로 정규화한다(이슈 #94). bizinfo와 id 네임스페이스를 분리하기
 * 위해 `KS_` 접두사를 쓴다 — bizinfo id(`PBLN_...`)와 형식이 달라 원래도 충돌하지 않지만,
 * 소스를 한눈에 구분할 수 있게 명시적으로 접두사를 붙였다.
 */
export function mapKstartupAnnouncementToSubsidy(
  item: KstartupAnnouncement,
  now: Date = new Date(),
): Subsidy {
  const { deadline, dday } = parseKstartupDeadline(item.pbanc_rcpt_end_dt, now)
  const { businessYears, businessYearsMax } = parseBizEnyy(item.biz_enyy)

  return {
    id: `KS_${item.pbanc_sn}`,
    name: item.biz_pbanc_nm,
    org: item.pbanc_ntrp_nm,
    amount: extractAmount(item.pbanc_ctnt) ?? FALLBACK_AMOUNT,
    dday,
    match: NEUTRAL_MATCH,
    deadline,
    method: inferKstartupMethod(item),
    qualifications: item.aply_trgt_ctnt ? [item.aply_trgt_ctnt] : [FALLBACK_QUALIFICATION],
    documents: [FALLBACK_DOCUMENT],
    how: FALLBACK_HOW,
    where: item.pbanc_ntrp_nm,
    whereUrl: item.detl_pg_url,
    contact: item.prch_cnpl_no || FALLBACK_CONTACT,
    region: mapKstartupRegion(item.supt_regin),
    industry: [],
    supportRealm: mapKstartupSupportRealm(item.supt_biz_clsfc),
    businessYears,
    businessYearsMax,
  }
}
