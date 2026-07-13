// jobs_data.csv 컬럼 이름(snake_case)을 그대로 job 객체 필드로 사용한다 — DB 조회 결과(better-sqlite3)와 1:1로 맞추기 위함.
// spec(사용자 입력)도 같은 컬럼 이름을 그대로 따르되, certificates만 배열, career_months만 job 쪽과 이름이 다르다(요구값은 career_min_months, 보유값은 career_months).

const EDUCATION_RANK = {
  학력무관: 0,
  고졸: 1,
  전문학사: 2,
  학사: 3,
  석사: 4,
  박사: 5,
}

// checklist_2.md 확정 사항: 전공 placeholder 3종은 전공무관과 동일하게 항상 통과 처리
const MAJOR_ANY_VALUES = new Set(['전공무관', '관련 전공(공고별 상이)', '해당 교과 전공'])

function compareEducation(job, spec) {
  if (job.education === '학력무관') return true
  return EDUCATION_RANK[spec.education] >= EDUCATION_RANK[job.education]
}

function compareCareer(job, spec) {
  return (spec.career_months ?? 0) >= job.career_min_months
}

function compareCertificates(job, spec) {
  if (!job.certificates) return true
  const required = job.certificates.split(',')
  const held = spec.certificates ?? []
  return required.every((cert) => held.includes(cert))
}

function compareMajor(job, spec) {
  if (MAJOR_ANY_VALUES.has(job.major)) return true
  return spec.major === job.major
}

function compareForeignLanguage(job, spec) {
  if (!job.foreign_lang_test) return true
  if (spec.foreign_lang_test !== job.foreign_lang_test) return false
  return (spec.foreign_lang_score ?? 0) >= job.foreign_lang_score
}

// 5항목 AND 판정. computer_skill(컴퓨터활용능력)은 참고용 우대 항목이라 여기서 절대 비교하지 않는다.
export function evaluateJob(job, spec) {
  const checks = {
    education: compareEducation(job, spec),
    career: compareCareer(job, spec),
    certificates: compareCertificates(job, spec),
    major: compareMajor(job, spec),
    foreignLanguage: compareForeignLanguage(job, spec),
  }
  const overallMatch = Object.values(checks).every(Boolean)
  return { job, checks, overallMatch }
}

const CATEGORIES = ['education', 'career', 'certificates', 'major', 'foreignLanguage']

// 직종/고용형태 필터. 값이 없으면(undefined/null) 해당 조건은 적용하지 않는다 — 이번 주는 FE에서 항상 필터 없이 호출.
function applyFilters(jobs, filters = {}) {
  return jobs.filter((job) => {
    if (filters.job_category && job.job_category !== filters.job_category) return false
    if (filters.is_intern !== undefined && filters.is_intern !== null && Boolean(job.is_intern) !== Boolean(filters.is_intern)) {
      return false
    }
    return true
  })
}

// checklist_2.md 확정 사항: 항목 1개만 보완하면 통과하는 시나리오만 카운트. 2개 이상 동시 미충족인 공고는 어느 항목에도 카운트하지 않는다.
function countSingleGapImprovements(evaluated) {
  const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]))
  for (const { checks } of evaluated) {
    const failed = CATEGORIES.filter((category) => !checks[category])
    if (failed.length === 1) {
      counts[failed[0]] += 1
    }
  }
  return counts
}

function buildImprovementRanking(counts) {
  return CATEGORIES.map((category) => ({ category, count: counts[category] })).sort((a, b) => b.count - a.count)
}

// 필터 적용 → 대상 공고 전체에 evaluateJob 반복 → 통계 + 보완 우선순위 계산.
// 가중치 없는 단순 개수 기반 점수화(checklist_2.md 확정 사항).
export function runGapAnalysis(jobs, filters, spec) {
  const targetJobs = applyFilters(jobs, filters)
  const jobList = targetJobs.map((job) => evaluateJob(job, spec))

  const total = jobList.length
  const matched = jobList.filter((entry) => entry.overallMatch).length
  const ratio = total === 0 ? 0 : matched / total
  const improvementRanking = buildImprovementRanking(countSingleGapImprovements(jobList))

  return {
    stats: { total, matched, ratio, improvementRanking },
    jobList,
  }
}
