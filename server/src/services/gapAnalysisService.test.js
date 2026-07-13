import { describe, it, expect } from 'vitest'
import { evaluateJob } from './gapAnalysisService.js'

const baseJob = {
  job_id: 1,
  education: '학사',
  career_min_months: 12,
  career_max_months: 36,
  certificates: '정보처리기사,SQLD',
  major: '컴퓨터공학과',
  foreign_lang_test: 'TOEIC',
  foreign_lang_score: 700,
}

const baseSpec = {
  education: '학사',
  career_months: 12,
  certificates: ['정보처리기사', 'SQLD'],
  major: '컴퓨터공학과',
  foreign_lang_test: 'TOEIC',
  foreign_lang_score: 700,
}

describe('evaluateJob', () => {
  it('모든 항목을 충족하면 overallMatch가 true', () => {
    const result = evaluateJob(baseJob, baseSpec)
    expect(result.checks).toEqual({
      education: true,
      career: true,
      certificates: true,
      major: true,
      foreignLanguage: true,
    })
    expect(result.overallMatch).toBe(true)
  })

  describe('학력', () => {
    it('보유 학력이 요구보다 높으면 통과', () => {
      const job = { ...baseJob, education: '전문학사' }
      expect(evaluateJob(job, { ...baseSpec, education: '학사' }).checks.education).toBe(true)
    })

    it('보유 학력이 요구보다 낮으면 미충족', () => {
      const job = { ...baseJob, education: '학사' }
      expect(evaluateJob(job, { ...baseSpec, education: '고졸' }).checks.education).toBe(false)
    })

    it('요구 학력이 학력무관이면 보유 학력과 무관하게 통과', () => {
      const job = { ...baseJob, education: '학력무관' }
      expect(evaluateJob(job, { ...baseSpec, education: '고졸' }).checks.education).toBe(true)
    })
  })

  describe('경력', () => {
    it('보유 개월수가 요구 최소 개월수 이상이면 통과', () => {
      expect(evaluateJob(baseJob, { ...baseSpec, career_months: 12 }).checks.career).toBe(true)
    })

    it('보유 개월수가 요구 최소 개월수 미만이면 미충족', () => {
      expect(evaluateJob(baseJob, { ...baseSpec, career_months: 6 }).checks.career).toBe(false)
    })

    it('요구 최소 경력이 0(신입 가능)이면 항상 통과', () => {
      const job = { ...baseJob, career_min_months: 0 }
      expect(evaluateJob(job, { ...baseSpec, career_months: 0 }).checks.career).toBe(true)
    })

    it('career_max_months는 판정에 쓰이지 않는다', () => {
      const job = { ...baseJob, career_min_months: 12, career_max_months: 24 }
      expect(evaluateJob(job, { ...baseSpec, career_months: 999 }).checks.career).toBe(true)
    })
  })

  describe('자격증', () => {
    it('요구 자격증이 없으면 항상 통과', () => {
      const job = { ...baseJob, certificates: null }
      expect(evaluateJob(job, { ...baseSpec, certificates: [] }).checks.certificates).toBe(true)
    })

    it('요구 자격증을 전부 보유하면 통과', () => {
      const job = { ...baseJob, certificates: '간호사,물리치료사' }
      expect(evaluateJob(job, { ...baseSpec, certificates: ['간호사', '물리치료사', 'SQLD'] }).checks.certificates).toBe(true)
    })

    it('요구 자격증 중 하나라도 없으면 미충족', () => {
      const job = { ...baseJob, certificates: '간호사,물리치료사' }
      expect(evaluateJob(job, { ...baseSpec, certificates: ['간호사'] }).checks.certificates).toBe(false)
    })
  })

  describe('전공', () => {
    it('정확히 일치하면 통과', () => {
      expect(evaluateJob({ ...baseJob, major: '간호학과' }, { ...baseSpec, major: '간호학과' }).checks.major).toBe(true)
    })

    it('일치하지 않으면 미충족', () => {
      expect(evaluateJob({ ...baseJob, major: '간호학과' }, { ...baseSpec, major: '경영학과' }).checks.major).toBe(false)
    })

    it.each(['전공무관', '관련 전공(공고별 상이)', '해당 교과 전공'])(
      '전공 placeholder "%s"는 보유 전공과 무관하게 통과',
      (placeholder) => {
        const job = { ...baseJob, major: placeholder }
        expect(evaluateJob(job, { ...baseSpec, major: '경영학과' }).checks.major).toBe(true)
      },
    )
  })

  describe('외국어', () => {
    it('요구 외국어 성적이 없으면 항상 통과', () => {
      const job = { ...baseJob, foreign_lang_test: null, foreign_lang_score: null }
      expect(evaluateJob(job, { ...baseSpec, foreign_lang_test: undefined, foreign_lang_score: undefined }).checks.foreignLanguage).toBe(true)
    })

    it('시험 종류가 다르면 미충족', () => {
      const job = { ...baseJob, foreign_lang_test: 'TOEIC', foreign_lang_score: 700 }
      expect(evaluateJob(job, { ...baseSpec, foreign_lang_test: 'OPIc', foreign_lang_score: 900 }).checks.foreignLanguage).toBe(false)
    })

    it('외국어 성적을 입력하지 않으면 미충족', () => {
      const job = { ...baseJob, foreign_lang_test: 'TOEIC', foreign_lang_score: 700 }
      expect(evaluateJob(job, { ...baseSpec, foreign_lang_test: undefined, foreign_lang_score: undefined }).checks.foreignLanguage).toBe(false)
    })

    it('같은 시험이고 점수가 미달이면 미충족', () => {
      const job = { ...baseJob, foreign_lang_test: 'TOEIC', foreign_lang_score: 700 }
      expect(evaluateJob(job, { ...baseSpec, foreign_lang_test: 'TOEIC', foreign_lang_score: 650 }).checks.foreignLanguage).toBe(false)
    })

    it('같은 시험이고 점수가 기준 이상이면 통과', () => {
      const job = { ...baseJob, foreign_lang_test: 'TOEIC', foreign_lang_score: 700 }
      expect(evaluateJob(job, { ...baseSpec, foreign_lang_test: 'TOEIC', foreign_lang_score: 700 }).checks.foreignLanguage).toBe(true)
    })
  })

  it('컴퓨터활용능력(computer_skill)은 job/spec에 있어도 판정에 영향을 주지 않는다', () => {
    const job = { ...baseJob, computer_skill: '필요' }
    const spec = { ...baseSpec, computer_skill: '무관' }
    expect(evaluateJob(job, spec).overallMatch).toBe(true)
  })

  it('한 항목이라도 미충족이면 overallMatch는 false', () => {
    const spec = { ...baseSpec, major: '전혀다른전공' }
    expect(evaluateJob(baseJob, spec).overallMatch).toBe(false)
  })
})
