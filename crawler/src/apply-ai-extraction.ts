import type { Subsidy } from '@hub/shared'
import type { ExtractedFields } from './gemini-extract.js'
import { FALLBACK_AMOUNT } from './mapper.js'

/**
 * `document_extractions` 캐시에서 읽은 AI 추출 결과를 Subsidy에 반영한다 (이슈 #67 묶음 3).
 *
 * 채택 기준(묶음 1 스파이크에서 확정):
 * - amount: 정규식이 우선 — 정규식이 fallback('공고문 참조')일 때만 AI 값으로 보완한다.
 *   AI 단독 성공률(46.7%)이 정규식(76.9%)보다 낮다고 실측됐기 때문(AI가 우선이면 오히려 후퇴).
 * - qualifications/documents: AI 결과가 비어있지 않으면 그대로 대체한다 — `trgetNm` dump/
 *   첨부파일명 나열보다 항상 더 상세하다고 판단(15건 표본에서 각각 100%/80% 채워짐).
 * - employees/revenue/businessYears(+숫자 필드): AI 결과를 그대로 채운다. 정규식으로 뽑던
 *   필드가 아니라 비교 대상 자체가 없다.
 */
export function applyAiExtraction(subsidy: Subsidy, extracted: ExtractedFields | null): Subsidy {
  if (!extracted) return subsidy

  const amount = subsidy.amount === FALLBACK_AMOUNT && extracted.amount ? extracted.amount : subsidy.amount
  const qualifications =
    extracted.qualifications && extracted.qualifications.length > 0 ? extracted.qualifications : subsidy.qualifications
  const documents =
    extracted.documents && extracted.documents.length > 0 ? extracted.documents : subsidy.documents

  return {
    ...subsidy,
    amount,
    qualifications,
    documents,
    employees: extracted.employees ?? undefined,
    employeesMaxCount: extracted.employeesMaxCount ?? undefined,
    revenue: extracted.revenue ?? undefined,
    revenueMaxKrw: extracted.revenueMaxKrw ?? undefined,
    businessYears: extracted.businessYears ?? undefined,
    businessYearsMax: extracted.businessYearsMax ?? undefined,
  }
}
