import { describe, it, expect } from 'vitest'
import { validateGapAnalysisRequest } from './gapAnalysisValidation.js'

const validSpec = {
  education: '학사',
  career_months: 12,
  certificates: ['정보처리기사'],
  major: '컴퓨터공학과',
  foreign_lang_test: 'TOEIC',
  foreign_lang_score: 700,
  has_computer_skill: true,
}

describe('validateGapAnalysisRequest', () => {
  it('유효한 spec만 있으면 통과한다', () => {
    expect(() => validateGapAnalysisRequest({ filters: undefined, spec: validSpec })).not.toThrow()
  })

  it('유효한 spec + filters면 통과한다', () => {
    const filters = { job_category: 'IT전산', is_intern: true }
    expect(() => validateGapAnalysisRequest({ filters, spec: validSpec })).not.toThrow()
  })

  it('선택 항목(career_months 등)이 없어도 통과한다', () => {
    const minimalSpec = { education: '학사', major: '전공무관' }
    expect(() => validateGapAnalysisRequest({ filters: undefined, spec: minimalSpec })).not.toThrow()
  })

  it('spec이 없으면 400 에러를 던진다', () => {
    expect(() => validateGapAnalysisRequest({ filters: undefined, spec: undefined })).toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })

  it('education이 EDUCATION_RANK에 없는 값이면 던진다', () => {
    expect(() =>
      validateGapAnalysisRequest({ filters: undefined, spec: { ...validSpec, education: '초졸' } }),
    ).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('major가 빈 문자열이면 던진다', () => {
    expect(() =>
      validateGapAnalysisRequest({ filters: undefined, spec: { ...validSpec, major: '' } }),
    ).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('career_months가 음수면 던진다', () => {
    expect(() =>
      validateGapAnalysisRequest({ filters: undefined, spec: { ...validSpec, career_months: -1 } }),
    ).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('certificates가 배열이 아니면 던진다', () => {
    expect(() =>
      validateGapAnalysisRequest({ filters: undefined, spec: { ...validSpec, certificates: '정보처리기사' } }),
    ).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('foreign_lang_score가 숫자가 아니면 던진다', () => {
    expect(() =>
      validateGapAnalysisRequest({
        filters: undefined,
        spec: { ...validSpec, foreign_lang_score: '700' },
      }),
    ).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('filters.job_category가 문자열이 아니면 던진다', () => {
    expect(() =>
      validateGapAnalysisRequest({ filters: { job_category: 123 }, spec: validSpec }),
    ).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('filters.is_intern이 boolean이 아니면 던진다', () => {
    expect(() =>
      validateGapAnalysisRequest({ filters: { is_intern: 'true' }, spec: validSpec }),
    ).toThrow(expect.objectContaining({ status: 400 }))
  })
})
