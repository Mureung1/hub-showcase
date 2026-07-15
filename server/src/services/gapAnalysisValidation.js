import { EDUCATION_RANK } from './gapAnalysisService.js'

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
  if (!(spec.education in EDUCATION_RANK)) {
    throw invalid(`spec.education 값이 올바르지 않습니다: ${spec.education}`)
  }
  if (typeof spec.major !== 'string' || spec.major.trim() === '') {
    throw invalid('spec.major는 비어있지 않은 문자열이어야 합니다.')
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
  if (spec.foreign_lang_test !== undefined && typeof spec.foreign_lang_test !== 'string') {
    throw invalid('spec.foreign_lang_test는 문자열이어야 합니다.')
  }
  if (spec.foreign_lang_score !== undefined && !isNonNegativeNumber(spec.foreign_lang_score)) {
    throw invalid('spec.foreign_lang_score는 0 이상의 숫자여야 합니다.')
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
