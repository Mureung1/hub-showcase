import { describe, expect, it } from 'vitest'
import type { Subsidy } from '@hub/shared'
import { applyAiExtraction } from './apply-ai-extraction.js'
import type { ExtractedFields } from './gemini-extract.js'
import { FALLBACK_AMOUNT } from './mapper.js'

const baseSubsidy: Subsidy = {
  id: '1',
  name: '테스트 지원금',
  org: '테스트기관',
  amount: FALLBACK_AMOUNT,
  dday: 10,
  match: 50,
  deadline: '2026. 8. 1',
  method: '온라인',
  qualifications: ['소상공인'],
  documents: ['첨부: 공고문.pdf'],
  how: '온라인 접수',
  where: '테스트기관',
  contact: '000-0000',
  region: [],
  industry: [],
}

const EMPTY_FIELDS: ExtractedFields = {
  employees: null,
  employeesMaxCount: null,
  revenue: null,
  revenueMaxKrw: null,
  businessYears: null,
  businessYearsMax: null,
  amount: null,
  qualifications: null,
  documents: null,
}

describe('applyAiExtraction', () => {
  it('캐시된 추출 결과가 없으면(null) 원본 subsidy를 그대로 반환한다', () => {
    expect(applyAiExtraction(baseSubsidy, null)).toEqual(baseSubsidy)
  })

  it('정규식 amount가 fallback이면 AI 값으로 보완한다', () => {
    const result = applyAiExtraction(baseSubsidy, { ...EMPTY_FIELDS, amount: '최대 1천만원' })
    expect(result.amount).toBe('최대 1천만원')
  })

  it('정규식 amount가 이미 fallback이 아니면 AI 값이 있어도 정규식 결과를 유지한다', () => {
    const subsidy = { ...baseSubsidy, amount: '최대 500만원' }
    const result = applyAiExtraction(subsidy, { ...EMPTY_FIELDS, amount: '최대 1천만원' })
    expect(result.amount).toBe('최대 500만원')
  })

  it('AI qualifications/documents가 비어있지 않으면 정규식 결과를 대체한다', () => {
    const result = applyAiExtraction(baseSubsidy, {
      ...EMPTY_FIELDS,
      qualifications: ['상세 조건 1', '상세 조건 2'],
      documents: ['제출서류 1'],
    })
    expect(result.qualifications).toEqual(['상세 조건 1', '상세 조건 2'])
    expect(result.documents).toEqual(['제출서류 1'])
  })

  it('AI qualifications/documents가 빈 배열이면 정규식 결과를 그대로 유지한다', () => {
    const result = applyAiExtraction(baseSubsidy, { ...EMPTY_FIELDS, qualifications: [], documents: [] })
    expect(result.qualifications).toEqual(baseSubsidy.qualifications)
    expect(result.documents).toEqual(baseSubsidy.documents)
  })

  it('employees/revenue/businessYears(+숫자 필드)는 AI 결과를 그대로 채운다', () => {
    const result = applyAiExtraction(baseSubsidy, {
      ...EMPTY_FIELDS,
      employees: '상시근로자 50인 미만',
      employeesMaxCount: 50,
      revenue: '연매출 1억 4백만원 미만',
      revenueMaxKrw: 104_000_000,
      businessYears: '업력 7년 미만',
      businessYearsMax: 7,
    })
    expect(result.employees).toBe('상시근로자 50인 미만')
    expect(result.employeesMaxCount).toBe(50)
    expect(result.revenue).toBe('연매출 1억 4백만원 미만')
    expect(result.revenueMaxKrw).toBe(104_000_000)
    expect(result.businessYears).toBe('업력 7년 미만')
    expect(result.businessYearsMax).toBe(7)
  })

  it('AI 필드가 null이면 undefined로 정리한다("정보 없음" 중립 표현)', () => {
    const result = applyAiExtraction(baseSubsidy, EMPTY_FIELDS)
    expect(result.employees).toBeUndefined()
    expect(result.employeesMaxCount).toBeUndefined()
  })
})
