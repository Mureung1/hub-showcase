import { describe, it, expect } from 'vitest'
import { evaluateJob, runGapAnalysis } from './gapAnalysisService.js'

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

describe('runGapAnalysis', () => {
  const makeJob = (id, job_category, is_intern, overrides = {}) => ({
    ...baseJob,
    job_id: id,
    job_category,
    is_intern,
    ...overrides,
  })

  // job1만 5항목 전부 통과. job2~6은 정확히 1개 항목만 미충족(보완 우선순위 대상).
  // job7은 2개 항목 미충족(랭킹 제외 대상), job8은 5개 전부 미충족.
  const jobs = [
    makeJob(1, 'IT전산', 0), // 전부 통과
    makeJob(2, 'IT전산', 0, { education: '석사' }), // 학력만 미충족
    makeJob(3, 'IT전산', 1, { career_min_months: 24 }), // 경력만 미충족
    makeJob(4, '사무행정', 0, { career_min_months: 36 }), // 경력만 미충족
    makeJob(5, '사무행정', 0, { certificates: '간호사' }), // 자격증만 미충족
    makeJob(6, '기타', 1, { foreign_lang_test: 'OPIc' }), // 외국어만 미충족
    makeJob(7, '기타', 0, { major: '전혀다른전공', career_min_months: 24 }), // 2개 미충족 → 랭킹 제외
    makeJob(8, 'IT전산', 0, {
      education: '박사',
      career_min_months: 24,
      certificates: '간호사',
      major: '전혀다른전공',
      foreign_lang_test: 'OPIc',
    }), // 전부 미충족
  ]

  it('필터 없이 실행하면 전체 공고를 대상으로 통계를 계산한다', () => {
    const { stats } = runGapAnalysis(jobs, undefined, baseSpec)
    expect(stats.total).toBe(8)
    expect(stats.matched).toBe(1)
    expect(stats.ratio).toBe(1 / 8)
  })

  it('job_category 필터를 적용하면 대상 건수가 줄어든다', () => {
    const { stats, jobList } = runGapAnalysis(jobs, { job_category: 'IT전산' }, baseSpec)
    expect(stats.total).toBe(4) // job1,2,3,8
    expect(jobList.map((entry) => entry.job.job_id)).toEqual([1, 2, 3, 8])
  })

  it('is_intern 필터를 적용하면 대상 건수가 줄어든다', () => {
    const { stats, jobList } = runGapAnalysis(jobs, { is_intern: true }, baseSpec)
    expect(stats.total).toBe(2) // job3,6
    expect(jobList.map((entry) => entry.job.job_id)).toEqual([3, 6])
  })

  it('job_category와 is_intern 필터를 동시에 적용할 수 있다', () => {
    const { stats } = runGapAnalysis(jobs, { job_category: 'IT전산', is_intern: true }, baseSpec)
    expect(stats.total).toBe(1) // job3
  })

  it('필터 결과가 0건이어도 에러 없이 0으로 계산된다', () => {
    const { stats } = runGapAnalysis(jobs, { job_category: '존재하지않음' }, baseSpec)
    expect(stats).toEqual({
      total: 0,
      matched: 0,
      ratio: 0,
      improvementRanking: [
        { category: 'education', count: 0 },
        { category: 'career', count: 0 },
        { category: 'certificates', count: 0 },
        { category: 'major', count: 0 },
        { category: 'foreignLanguage', count: 0 },
      ],
    })
  })

  it('항목 1개만 미충족인 공고만 보완 우선순위에 카운트하고, 개수 내림차순으로 정렬한다', () => {
    const { stats } = runGapAnalysis(jobs, undefined, baseSpec)
    // career는 job3,job4 두 건(count 2)이라 1위. 나머지 1건짜리는 CATEGORIES 원래 순서를 유지(안정 정렬).
    expect(stats.improvementRanking).toEqual([
      { category: 'career', count: 2 },
      { category: 'education', count: 1 },
      { category: 'certificates', count: 1 },
      { category: 'foreignLanguage', count: 1 },
      { category: 'major', count: 0 },
    ])
  })

  it('2개 이상 미충족이거나 전부 미충족인 공고는 보완 우선순위 어느 항목에도 카운트되지 않는다', () => {
    const onlyGapJobs = [jobs[6], jobs[7]] // job7(2개 미충족), job8(전부 미충족)
    const { stats } = runGapAnalysis(onlyGapJobs, undefined, baseSpec)
    expect(stats.improvementRanking.every((entry) => entry.count === 0)).toBe(true)
  })
})
