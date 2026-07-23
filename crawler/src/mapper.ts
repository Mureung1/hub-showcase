import type { Subsidy } from '@hub/shared'
import type { BizinfoAnnouncement } from './bizinfo-client.js'

/**
 * API가 신청기간 대신 자유 텍스트("예산 소진시까지" 등)를 주는 경우의 dday.
 * 정렬(deadline 오름차순) 시 날짜가 명확한 공고보다 뒤로 밀리도록 큰 값을 쓴다.
 */
const NO_DEADLINE_DDAY = 9999

const FALLBACK_QUALIFICATION = '공고문 원문에서 확인해주세요'
const FALLBACK_DOCUMENT = '공고문 원문에서 확인해주세요'
const FALLBACK_AMOUNT = '공고문 참조'
const FALLBACK_HOW = '공고문 원문에서 확인해주세요'
const FALLBACK_CONTACT = '공고문 원문 참조'
/** 조건 기반 매칭 알고리즘 도입 전까지의 중립값 (3주차 범위). 0은 "안 맞음"으로 오인되어 제외 */
const NEUTRAL_MATCH = 50

const DATE_RANGE_PATTERN = /(\d{4})-(\d{2})-(\d{2})\s*~\s*(\d{4})-(\d{2})-(\d{2})/

interface ParsedDeadline {
  deadline: string
  dday: number
}

/** "2026-07-20 ~ 2026-08-14" → 종료일 기준 deadline 텍스트 + dday. 날짜 형식이 아니면 원문 그대로 둔다 */
export function parseDeadline(reqstBeginEndDe: string, now: Date): ParsedDeadline {
  const match = reqstBeginEndDe.match(DATE_RANGE_PATTERN)
  if (!match) {
    return { deadline: reqstBeginEndDe, dday: NO_DEADLINE_DDAY }
  }

  const [, , , , endYear, endMonth, endDay] = match
  const endDate = new Date(Number(endYear), Number(endMonth) - 1, Number(endDay))
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dday = Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    deadline: `${endYear}. ${Number(endMonth)}. ${Number(endDay)}`,
    dday,
  }
}

/** 접수방법 원문에서 짧은 신청 방식 라벨을 유추한다 (샘플 데이터의 '온라인'/'온라인+방문' 규칙과 통일) */
export function inferMethod(reqstMthPapersCn: string | undefined): string {
  if (!reqstMthPapersCn) return '기타'

  const hasOnline = /온라인|이메일|시스템/.test(reqstMthPapersCn)
  const hasVisit = /방문/.test(reqstMthPapersCn)

  if (hasOnline && hasVisit) return '온라인+방문'
  if (hasVisit) return '방문'
  if (hasOnline) return '온라인'
  return '기타'
}

/** 여러 줄 접수방법 안내를 상세화면 한 줄 표시에 맞게 정리한다. 원문이 없으면 안내 문구로 대체 */
function normalizeWhitespace(text: string | undefined): string {
  if (!text) return FALLBACK_HOW
  return text.replace(/\s+/g, ' ').trim()
}

/** bizinfo API 응답 1건을 Subsidy 타입으로 정규화한다 (#28 매핑안 기준, fallback 값은 week3_plan.md 참고) */
export function mapAnnouncementToSubsidy(
  item: BizinfoAnnouncement,
  now: Date = new Date(),
): Subsidy {
  const { deadline, dday } = parseDeadline(item.reqstBeginEndDe, now)
  const applyOrg = item.excInsttNm || item.jrsdInsttNm

  return {
    id: item.pblancId,
    name: item.pblancNm,
    org: item.jrsdInsttNm,
    amount: FALLBACK_AMOUNT,
    dday,
    match: NEUTRAL_MATCH,
    deadline,
    method: inferMethod(item.reqstMthPapersCn),
    qualifications: item.trgetNm ? [item.trgetNm] : [FALLBACK_QUALIFICATION],
    documents: item.printFileNm ? [`첨부: ${item.printFileNm}`] : [FALLBACK_DOCUMENT],
    how: normalizeWhitespace(item.reqstMthPapersCn),
    where: applyOrg,
    whereUrl: item.pblancUrl,
    contact: item.refrncNm || FALLBACK_CONTACT,
  }
}
