import { EDUCATION_RANK, OPIC_RANK } from './gapAnalysisService.js'

function invalid(message) {
  const err = new Error(message)
  err.status = 400
  return err
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

// POST /api/gap-analysis 요청 본문을 검증한다. 실패 시 status=400짜리 Error를 던진다 —
// Express 5는 동기 핸들러 안의 throw를 자동으로 errorHandler(400/에러 메시지 응답)로 넘겨준다.
export function validateGapAnalysisRequest({ filters, spec }) {
  if (!isPlainObject(spec)) {
    throw invalid('spec은 필수이며 객체여야 합니다.')
  }
  if (!Object.hasOwn(EDUCATION_RANK, spec.education)) {
    throw invalid(`spec.education 값이 올바르지 않습니다: ${spec.education}`)
  }
  if (typeof spec.major !== 'string' || spec.major.trim() === '') {
    throw invalid('spec.major는 비어있지 않은 문자열이어야 합니다.')
  }
  // 부전공은 선택 항목 — 없으면 빈 문자열('없음')로 보낼 수 있으므로 major와 달리 비어있음을 허용한다.
  if (spec.minor_major !== undefined && typeof spec.minor_major !== 'string') {
    throw invalid('spec.minor_major는 문자열이어야 합니다.')
  }
  if (spec.career_months !== undefined && !isNonNegativeNumber(spec.career_months)) {
    throw invalid('spec.career_months는 0 이상의 숫자여야 합니다.')
  }
  if (
    spec.certificates !== undefined &&
    (!Array.isArray(spec.certificates) || !spec.certificates.every((c) => typeof c === 'string'))
  ) {
    throw invalid('spec.certificates는 문자열 배열이어야 합니다.')
  }
  // 여러 시험 성적을 동시에 보유할 수 있어 배열이다 — 항목별로 { test, score } 형태를 검증한다.
  // OPIc은 숫자 점수가 아니라 등급(NL~AL)이라 다른 시험과 검증 규칙이 다르다.
  if (spec.foreign_languages !== undefined) {
    if (!Array.isArray(spec.foreign_languages)) {
      throw invalid('spec.foreign_languages는 배열이어야 합니다.')
    }
    for (const item of spec.foreign_languages) {
      if (!isPlainObject(item) || typeof item.test !== 'string' || item.test.trim() === '') {
        throw invalid('spec.foreign_languages의 각 항목은 test(문자열)를 포함해야 합니다.')
      }
      if (item.test === 'OPIc') {
        if (!Object.hasOwn(OPIC_RANK, item.score)) {
          throw invalid(`spec.foreign_languages의 OPIc 등급 값이 올바르지 않습니다: ${item.score}`)
        }
      } else if (!isNonNegativeNumber(item.score)) {
        throw invalid(`spec.foreign_languages(${item.test})의 score는 0 이상의 숫자여야 합니다.`)
      }
    }
  }
  if (spec.has_computer_skill !== undefined && typeof spec.has_computer_skill !== 'boolean') {
    throw invalid('spec.has_computer_skill은 boolean이어야 합니다.')
  }

  if (filters === undefined || filters === null) return
  if (!isPlainObject(filters)) {
    throw invalid('filters는 객체여야 합니다.')
  }
  if (filters.job_category !== undefined && typeof filters.job_category !== 'string') {
    throw invalid('filters.job_category는 문자열이어야 합니다.')
  }
  if (filters.is_intern !== undefined && typeof filters.is_intern !== 'boolean') {
    throw invalid('filters.is_intern은 boolean이어야 합니다.')
  }
}
