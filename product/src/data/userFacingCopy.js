const TERM_REPLACEMENTS = Object.freeze([
  ['직무 베이스라인의 편차', '직무 공통 기대치와의 차이'],
  ['직무 기준선', '직무 공통 기대치'],
  ['기업군 편차', '기업군별 추가 요구'],
  ['베이스라인', '직무 공통 기대치'],
  ['기준선', '직무 공통 기대치'],
  ['편차', '추가 요구'],
])

function replaceTerms(text) {
  return TERM_REPLACEMENTS.reduce(
    (copy, [before, after]) => copy.replaceAll(before, after),
    text,
  )
}

// 저장 계약과 내부 키는 유지하고, API payload 안에서 화면에 출력되는 문자열만 바꾼다.
export function normalizeUserFacingCopy(value) {
  if (typeof value === 'string') return replaceTerms(value)
  if (Array.isArray(value)) return value.map(normalizeUserFacingCopy)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeUserFacingCopy(item)]),
    )
  }
  return value
}
