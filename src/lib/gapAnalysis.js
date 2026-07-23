// 판정 로직(evaluateJob/runGapAnalysis) 자체는 server/src/services/gapAnalysisService.js가 실행하고
// POST /api/gap-analysis 응답으로 { job, checks, overallMatch } 형태의 jobList를 그대로 내려준다.
// 여기 있는 함수들은 그 응답을 화면에 그릴 수 있는 형태(한글 라벨/문장)로 바꾸는 FE 전용 표시 로직이다 —
// 백엔드는 저장/판정에만 쓰이는 boolean만 있으면 되므로 이 레이어를 가질 필요가 없다.

const CATEGORIES = ['education', 'career', 'certificates', 'major', 'foreignLanguage']

export const CATEGORY_LABELS = {
  education: '학력',
  career: '경력',
  certificates: '자격증/면허',
  major: '전공',
  foreignLanguage: '외국어 성적',
}

const MAJOR_ANY_VALUES = new Set(['전공무관', '관련 전공(공고별 상이)', '해당 교과 전공'])

// 미충족 항목 중 우선순위가 가장 높은 것 하나로 종합 상태를 정한다 (여러 항목이 동시에 미충족이어도 라벨은 하나만).
export function pickPrimaryStatus(checks) {
  const failed = CATEGORIES.find((category) => checks[category] === false)
  if (!failed) return { key: 'match', label: '지원 가능' }
  return { key: `missing_${failed}`, label: `${CATEGORY_LABELS[failed]} 미충족` }
}

// 항목별 "요구 vs 보유"를 사람이 읽는 문장으로 변환 — 상세 모달에서 무엇이 부족한지 보여주는 용도.
export function describeRequirement(category, job, spec) {
  if (category === 'education') {
    if (job.education === '학력무관') return '학력 무관 (조건 없음)'
    return `요구: ${job.education} 이상 · 보유: ${spec.education}`
  }
  if (category === 'career') {
    if (job.career_min_months === 0) return '경력 무관 (신입 지원 가능)'
    return `요구: 경력 ${job.career_min_months}개월 이상 · 보유: ${spec.career_months ?? 0}개월`
  }
  if (category === 'certificates') {
    if (!job.certificates) return '필요 자격증/면허 없음'
    const required = job.certificates.split(',')
    const held = spec.certificates ?? []
    const missing = required.filter((c) => !held.includes(c))
    const heldText = held.length ? held.join(', ') : '없음'
    const missingText = missing.length ? ` (미보유: ${missing.join(', ')})` : ''
    return `요구: ${required.join(', ')} · 보유: ${heldText}${missingText}`
  }
  if (category === 'major') {
    if (MAJOR_ANY_VALUES.has(job.major)) return '전공 무관 (조건 없음)'
    return `요구: ${job.major} · 보유: ${spec.major}`
  }
  if (category === 'foreignLanguage') {
    if (!job.foreign_lang_test) return '외국어 성적 불필요'
    if (!spec.foreign_lang_test) return `요구: ${job.foreign_lang_test} ${job.foreign_lang_score}점 이상 · 보유: 미입력`
    if (spec.foreign_lang_test !== job.foreign_lang_test) {
      return `요구: ${job.foreign_lang_test} ${job.foreign_lang_score}점 이상 · 보유: ${spec.foreign_lang_test} 성적만 있음 (${job.foreign_lang_test} 성적 없음)`
    }
    return `요구: ${job.foreign_lang_test} ${job.foreign_lang_score}점 이상 · 보유: ${spec.foreign_lang_score ?? 0}점`
  }
  return ''
}

// 컴퓨터활용능력은 판정에 반영되지 않는 참고 항목이라 별도 라벨만 변환한다 (#23).
export function describeComputerSkill(hasComputerSkill) {
  return hasComputerSkill ? '보유' : '미보유'
}

// POST /api/gap-analysis 응답의 jobList 원소({job, checks, overallMatch})를 결과 화면이 바로 그릴 수 있는 형태로 변환한다.
export function buildJobDisplay({ job, checks, overallMatch }, spec) {
  const status = pickPrimaryStatus(checks)
  return {
    job_id: job.job_id,
    title: job.title,
    company: job.company,
    job_category: job.job_category,
    is_intern: job.is_intern,
    has_computer_skill: spec.has_computer_skill,
    overallMatch,
    status: status.key,
    statusLabel: status.label,
    checklist: CATEGORIES.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      ok: checks[category],
      detail: describeRequirement(category, job, spec),
    })),
  }
}
